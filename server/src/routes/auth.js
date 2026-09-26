import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { config } from "../config.js";
import { one, pool, query, transaction } from "../db.js";
import { audit, notify } from "../lib/audit.js";
import { asyncHandler, badRequest, conflict, forbidden, parse, unauthorized } from "../lib/http.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/mailer.js";
import {
  issueRefreshToken,
  revokeAllForUser,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from "../lib/tokens.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { signSellerUploadToken } from "./uploads.js";

export const authRouter = Router();

const publicUser = (u) => ({
  id: u.id,
  fullName: u.full_name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  status: u.status,
  emailVerified: Boolean(u.email_verified_at),
  sellerId: u.seller_id ?? null,
  sellerStatus: u.seller_status ?? null,
  createdAt: u.created_at,
});

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 170);

async function createVerification(userId) {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  await pool.execute(
    `INSERT INTO email_verifications (user_id, token_hash, expires_at) VALUES (?,?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
    [userId, hash],
  );
  return raw;
}

async function sessionFor(user, req) {
  const full = await one(
    `SELECT u.*, s.id AS seller_id, s.approval_status AS seller_status
       FROM users u LEFT JOIN sellers s ON s.user_id = u.id AND s.deleted_at IS NULL
      WHERE u.id = ?`,
    [user.id],
  );
  const { refreshToken } = await issueRefreshToken(full.id, { req });
  return { user: publicUser(full), accessToken: signAccessToken(full), refreshToken };
}

/* --------------------------------- Register -------------------------------- */

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(190),
  phone: z.string().trim().min(7).max(20).optional(),
  password: z.string().min(8).max(128),
  accountType: z.enum(["BUYER", "SELLER"]).default("BUYER"),
  // Seller-only fields
  businessName: z.string().trim().min(2).max(160).optional(),
  registrationNumber: z.string().trim().min(2).max(60).optional(),
  panNumber: z.string().trim().min(2).max(30).optional(),
  province: z.string().trim().max(60).optional(),
  district: z.string().trim().max(60).optional(),
  city: z.string().trim().max(80).optional(),
  addressLine: z.string().trim().max(190).optional(),
  description: z.string().trim().max(2000).optional(),
  bankName: z.string().trim().max(120).optional(),
  bankAccountNumber: z.string().trim().max(40).optional(),
});

// POST /api/v1/auth/register — role is derived server-side, never trusted beyond BUYER/SELLER.
authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = parse(registerSchema, req.body);
    const email = body.email.toLowerCase();
    if (email === config.admin.email) throw conflict("That email is reserved");
    if (await one(`SELECT id FROM users WHERE email = ?`, [email])) {
      throw conflict("An account with that email already exists");
    }

    const isSeller = body.accountType === "SELLER";
    if (isSeller) {
      // City is optional on the form — fall back to the district.
      body.city = body.city || body.district;
      const labels = { businessName: "business name", registrationNumber: "registration number", panNumber: "PAN / VAT number", province: "province", district: "district", addressLine: "address" };
      for (const [f, label] of Object.entries(labels)) {
        if (!body[f]) throw badRequest(`Seller registration requires ${label}`);
      }
      if (await one(`SELECT id FROM sellers WHERE pan_number = ?`, [body.panNumber])) {
        throw conflict("A seller with that PAN / VAT number is already registered");
      }
    }

    const hash = await bcrypt.hash(body.password, 12);
    // User + seller rows are created atomically so a failed seller insert never leaves an orphan account.
    const { userId, newSellerId } = await transaction(async (conn) => {
      const [result] = await conn.execute(
        `INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?,?,?,?,?)`,
        [body.fullName, email, body.phone ?? null, hash, isSeller ? "SELLER" : "BUYER"],
      );
      const uid = result.insertId;
      let sid = null;
      if (isSeller) {
        let slug = slugify(body.businessName) || `seller-${uid}`;
        const [dupe] = await conn.execute(`SELECT id FROM sellers WHERE slug = ?`, [slug]);
        if (dupe.length) slug = `${slug}-${uid}`;
        const [sellerResult] = await conn.execute(
          `INSERT INTO sellers
             (user_id, business_name, slug, registration_number, pan_number, contact_person, contact_phone,
              contact_email, province, district, city, address_line, description, bank_name, bank_account_number,
              approval_status)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'PENDING')`,
          [uid, body.businessName, slug, body.registrationNumber, body.panNumber, body.fullName, body.phone ?? "",
           email, body.province, body.district, body.city, body.addressLine, body.description ?? null,
           body.bankName ?? null, body.bankAccountNumber ?? null],
        );
        sid = sellerResult.insertId;
      }
      return { userId: uid, newSellerId: sid };
    }).catch((err) => {
      if (err.code === "ER_DUP_ENTRY") throw conflict("An account with these details already exists");
      throw err;
    });

    if (isSeller) {
      await notify({
        audience: "ADMIN",
        type: "SELLER_REGISTERED",
        title: "New seller application",
        message: `${body.businessName} applied for a seller account.`,
        linkUrl: "/admin/sellers",
      });
    }

    const user = await one(`SELECT * FROM users WHERE id = ?`, [userId]);
    const token = await createVerification(userId);
    const mail = await sendVerificationEmail(user, token);
    await audit({
      actorId: userId,
      actorRole: user.role,
      action: "USER_REGISTERED",
      entityType: "users",
      entityId: userId,
      req,
    });

    res.status(201).json({
      ok: true,
      requiresVerification: true,
      emailSent: mail.sent,
      role: user.role,
      message: "Account created. Check your inbox for the verification link.",
      ...(newSellerId ? { sellerId: newSellerId, uploadToken: signSellerUploadToken(newSellerId) } : {}),
      ...(config.env !== "production" ? { devVerifyToken: token } : {}),
    });
  }),
);

/* ------------------------------ Verification ------------------------------- */

authRouter.post(
  "/verify-email",
  asyncHandler(async (req, res) => {
    const { token } = parse(z.object({ token: z.string().min(10) }), req.body);
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const row = await one(
      `SELECT * FROM email_verifications WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()`,
      [hash],
    );
    if (!row) throw badRequest("Verification link is invalid or expired");
    await pool.execute(`UPDATE email_verifications SET used_at = NOW() WHERE id = ?`, [row.id]);
    await pool.execute(`UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW()) WHERE id = ?`, [
      row.user_id,
    ]);
    const user = await one(`SELECT * FROM users WHERE id = ?`, [row.user_id]);
    await audit({ actorId: user.id, actorRole: user.role, action: "EMAIL_VERIFIED", entityType: "users", entityId: user.id, req });
    res.json(await sessionFor(user, req));
  }),
);

authRouter.post(
  "/resend-verification",
  asyncHandler(async (req, res) => {
    const { email } = parse(z.object({ email: z.string().trim().email() }), req.body);
    const user = await one(`SELECT * FROM users WHERE email = ? AND deleted_at IS NULL`, [email.toLowerCase()]);
    if (user && !user.email_verified_at) {
      const token = await createVerification(user.id);
      await sendVerificationEmail(user, token);
    }
    res.json({ ok: true });
  }),
);

/* --------------------------------- Login ----------------------------------- */

const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1) });
const DUMMY_HASH = "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu";

async function authenticate(body, expectAdmin) {
  const user = await one(
    `SELECT u.*, s.id AS seller_id, s.approval_status AS seller_status
       FROM users u LEFT JOIN sellers s ON s.user_id = u.id AND s.deleted_at IS NULL
      WHERE u.email = ? AND u.deleted_at IS NULL`,
    [body.email.toLowerCase()],
  );
  const ok = user ? await bcrypt.compare(body.password, user.password_hash) : await bcrypt.compare(body.password, DUMMY_HASH);
  if (!user || !ok) throw unauthorized("Invalid email or password");
  if (expectAdmin && user.role !== "ADMIN") throw unauthorized("Invalid email or password");
  if (!expectAdmin && user.role === "ADMIN") throw forbidden("Administrators must sign in from the admin portal");
  if (user.status !== "ACTIVE") throw unauthorized(`Account is ${user.status}`);
  if (!user.email_verified_at && user.role !== "ADMIN") {
    throw forbidden("Please verify your email address first — check your inbox for the verification link.");
  }
  return user;
}

// POST /auth/login — buyers and sellers. The role comes from the database.
authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const user = await authenticate(parse(loginSchema, req.body), false);
    await pool.execute(`UPDATE users SET last_login_at = NOW() WHERE id = ?`, [user.id]);
    await audit({ actorId: user.id, actorRole: user.role, action: "USER_LOGIN", entityType: "users", entityId: user.id, req });
    res.json(await sessionFor(user, req));
  }),
);

// POST /auth/admin/login — separate portal, ADMIN role only.
authRouter.post(
  "/admin/login",
  asyncHandler(async (req, res) => {
    const user = await authenticate(parse(loginSchema, req.body), true);
    await pool.execute(`UPDATE users SET last_login_at = NOW() WHERE id = ?`, [user.id]);
    await audit({ actorId: user.id, actorRole: "ADMIN", action: "ADMIN_LOGIN", entityType: "users", entityId: user.id, req });
    res.json(await sessionFor(user, req));
  }),
);

// PATCH /auth/admin/credentials — only an authenticated admin can change them.
authRouter.patch(
  "/admin/credentials",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const body = parse(
      z.object({
        currentPassword: z.string().min(1),
        email: z.string().trim().email().max(190).optional(),
        newPassword: z.string().min(8).max(128).optional(),
        fullName: z.string().trim().min(2).max(120).optional(),
      }),
      req.body,
    );
    const admin = await one(`SELECT * FROM users WHERE id = ?`, [req.user.id]);
    if (!(await bcrypt.compare(body.currentPassword, admin.password_hash))) {
      throw badRequest("Current password is incorrect");
    }
    if (body.email && body.email.toLowerCase() !== admin.email) {
      const taken = await one(`SELECT id FROM users WHERE email = ? AND id <> ?`, [body.email.toLowerCase(), admin.id]);
      if (taken) throw conflict("That email is already in use");
    }
    await pool.execute(
      `UPDATE users SET email = ?, full_name = ?, password_hash = ?, email_verified_at = NOW() WHERE id = ?`,
      [
        body.email ? body.email.toLowerCase() : admin.email,
        body.fullName ?? admin.full_name,
        body.newPassword ? await bcrypt.hash(body.newPassword, 12) : admin.password_hash,
        admin.id,
      ],
    );
    await audit({ actorId: admin.id, actorRole: "ADMIN", action: "ADMIN_CREDENTIALS_UPDATED", entityType: "users", entityId: admin.id, req });
    if (body.newPassword) await revokeAllForUser(admin.id);
    res.json({ ok: true, passwordChanged: Boolean(body.newPassword) });
  }),
);

/* ------------------------------ Session mgmt -------------------------------- */

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const body = parse(z.object({ refreshToken: z.string().min(20) }), req.body);
    const rotated = await rotateRefreshToken(body.refreshToken, req);
    if (!rotated) throw unauthorized("Refresh token invalid, expired or reused");
    const full = await one(
      `SELECT u.*, s.id AS seller_id, s.approval_status AS seller_status
         FROM users u LEFT JOIN sellers s ON s.user_id = u.id AND s.deleted_at IS NULL WHERE u.id = ?`,
      [rotated.user.id],
    );
    res.json({ user: publicUser(full), accessToken: signAccessToken(full), refreshToken: rotated.refreshToken });
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = req.body?.refreshToken;
    if (token) await revokeRefreshToken(token);
    res.json({ ok: true });
  }),
);

authRouter.post(
  "/logout-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    await revokeAllForUser(req.user.id);
    res.json({ ok: true });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await one(
      `SELECT u.*, s.id AS seller_id, s.approval_status AS seller_status, s.business_name
         FROM users u LEFT JOIN sellers s ON s.user_id = u.id AND s.deleted_at IS NULL WHERE u.id = ?`,
      [req.user.id],
    );
    if (!user) throw unauthorized();
    res.json({
      user: publicUser(user),
      seller: user.seller_id
        ? { id: user.seller_id, businessName: user.business_name, approvalStatus: user.seller_status }
        : null,
    });
  }),
);

authRouter.patch(
  "/password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = parse(
      z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(128) }),
      req.body,
    );
    const user = await one(`SELECT * FROM users WHERE id = ?`, [req.user.id]);
    if (!(await bcrypt.compare(body.currentPassword, user.password_hash))) throw badRequest("Current password is incorrect");
    await pool.execute(`UPDATE users SET password_hash = ? WHERE id = ?`, [await bcrypt.hash(body.newPassword, 12), user.id]);
    await revokeAllForUser(user.id);
    await audit({ actorId: user.id, actorRole: user.role, action: "PASSWORD_CHANGED", entityType: "users", entityId: user.id, req });
    res.json({ ok: true });
  }),
);

/* ----------------------------- Password reset -------------------------------- */

// Always 200 — never reveals whether an account exists.
authRouter.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const body = parse(
      z.object({ email: z.string().trim().email(), portal: z.enum(["user", "admin"]).default("user") }),
      req.body,
    );
    const user = await one(`SELECT * FROM users WHERE email = ? AND deleted_at IS NULL`, [body.email.toLowerCase()]);
    let devToken;
    if (user && (body.portal === "admin" ? user.role === "ADMIN" : user.role !== "ADMIN")) {
      const raw = crypto.randomBytes(32).toString("hex");
      const hash = crypto.createHash("sha256").update(raw).digest("hex");
      await pool.execute(
        `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?,?, DATE_ADD(NOW(), INTERVAL 60 MINUTE))`,
        [user.id, hash],
      );
      await sendPasswordResetEmail(user, raw, body.portal);
      devToken = raw;
    }
    res.json({ ok: true, ...(config.env !== "production" && devToken ? { devToken } : {}) });
  }),
);

authRouter.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const body = parse(z.object({ token: z.string().min(10), newPassword: z.string().min(8).max(128) }), req.body);
    const hash = crypto.createHash("sha256").update(body.token).digest("hex");
    const row = await one(
      `SELECT * FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()`,
      [hash],
    );
    if (!row) throw badRequest("Reset token is invalid or expired");
    await pool.execute(`UPDATE users SET password_hash = ? WHERE id = ?`, [
      await bcrypt.hash(body.newPassword, 12),
      row.user_id,
    ]);
    await pool.execute(`UPDATE password_resets SET used_at = NOW() WHERE id = ?`, [row.id]);
    await revokeAllForUser(row.user_id);
    await audit({ actorId: row.user_id, action: "PASSWORD_RESET", entityType: "users", entityId: row.user_id, req });
    res.json({ ok: true });
  }),
);

/* -------------------------------- Addresses ---------------------------------- */

authRouter.get(
  "/addresses",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({
      data: await query(`SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC`, [req.user.id]),
    });
  }),
);

authRouter.post(
  "/addresses",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = parse(
      z.object({
        label: z.string().max(60).default("Default"),
        contactName: z.string().min(2).max(120),
        contactPhone: z.string().min(7).max(20),
        province: z.string().max(60),
        district: z.string().max(60),
        city: z.string().max(80),
        street: z.string().max(190),
        landmark: z.string().max(190).optional(),
        postalCode: z.string().max(20).optional(),
        isDefault: z.boolean().default(false),
      }),
      req.body,
    );
    if (body.isDefault) await pool.execute(`UPDATE user_addresses SET is_default = 0 WHERE user_id = ?`, [req.user.id]);
    const [r] = await pool.execute(
      `INSERT INTO user_addresses (user_id, label, contact_name, contact_phone, province, district, city, street, landmark, postal_code, is_default)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        req.user.id,
        body.label,
        body.contactName,
        body.contactPhone,
        body.province,
        body.district,
        body.city,
        body.street,
        body.landmark ?? null,
        body.postalCode ?? null,
        body.isDefault ? 1 : 0,
      ],
    );
    res.status(201).json({ id: r.insertId });
  }),
);
