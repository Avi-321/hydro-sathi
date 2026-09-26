import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { pool } from "../db.js";

export function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user.id), role: user.role, email: user.email, sellerId: user.seller_id ?? null },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessTtl, issuer: "hydro-sathi" },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret, { issuer: "hydro-sathi" });
}

const hashRefresh = (raw) =>
  crypto.createHmac("sha256", config.jwt.refreshPepper).update(raw).digest("hex");

/**
 * Issue a refresh token. Pass an existing `familyId` when rotating so reuse
 * detection can revoke the whole lineage.
 */
export async function issueRefreshToken(userId, { familyId = crypto.randomUUID(), req = null, conn = pool } = {}) {
  const raw = crypto.randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + config.jwt.refreshDays * 86400_000);
  const [result] = await conn.execute(
    `INSERT INTO refresh_tokens (user_id, family_id, token_hash, user_agent, ip_address, expires_at)
     VALUES (?,?,?,?,?,?)`,
    [userId, familyId, hashRefresh(raw), req?.get?.("user-agent")?.slice(0, 255) ?? null, req?.ip?.slice(0, 45) ?? null, expiresAt],
  );
  return { refreshToken: raw, familyId, id: result.insertId, expiresAt };
}

/**
 * Rotate a refresh token.
 * - unknown token          → null
 * - already rotated/revoked → whole family revoked (reuse detection) → null
 */
export async function rotateRefreshToken(rawToken, req) {
  const tokenHash = hashRefresh(rawToken);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      `SELECT * FROM refresh_tokens WHERE token_hash = ? FOR UPDATE`,
      [tokenHash],
    );
    const row = rows[0];
    if (!row) {
      await conn.commit();
      return null;
    }
    if (row.revoked_at || row.rotated_at) {
      // Token replay → revoke every token in the family.
      await conn.execute(
        `UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = ? AND revoked_at IS NULL`,
        [row.family_id],
      );
      await conn.commit();
      return null;
    }
    if (new Date(row.expires_at) < new Date()) {
      await conn.execute(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?`, [row.id]);
      await conn.commit();
      return null;
    }

    const next = await issueRefreshToken(row.user_id, { familyId: row.family_id, req, conn });
    await conn.execute(`UPDATE refresh_tokens SET rotated_at = NOW(), replaced_by = ? WHERE id = ?`, [next.id, row.id]);

    const [users] = await conn.execute(
      `SELECT u.id, u.email, u.role, u.status, u.full_name, s.id AS seller_id
         FROM users u LEFT JOIN sellers s ON s.user_id = u.id
        WHERE u.id = ? AND u.deleted_at IS NULL`,
      [row.user_id],
    );
    await conn.commit();
    const user = users[0];
    if (!user || user.status !== "ACTIVE") return null;
    return { user, refreshToken: next.refreshToken };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function revokeRefreshToken(rawToken) {
  await pool.execute(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL`,
    [hashRefresh(rawToken)],
  );
}

export async function revokeAllForUser(userId) {
  await pool.execute(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL`, [userId]);
}
