import { one } from "../db.js";
import { forbidden, unauthorized } from "../lib/http.js";
import { verifyAccessToken } from "../lib/tokens.js";

/** Attach req.user from the bearer token. Throws 401 when absent/invalid. */
export function requireAuth(req, _res, next) {
  const header = req.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next(unauthorized("Missing bearer token"));
  try {
    const claims = verifyAccessToken(token);
    req.user = {
      id: Number(claims.sub),
      role: claims.role,
      email: claims.email,
      sellerId: claims.sellerId ? Number(claims.sellerId) : null,
    };
    next();
  } catch {
    next(unauthorized("Invalid or expired access token"));
  }
}

/** Optional auth — populates req.user when a valid token is present. */
export function optionalAuth(req, _res, next) {
  const header = req.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return next();
  try {
    const claims = verifyAccessToken(header.slice(7));
    req.user = { id: Number(claims.sub), role: claims.role, email: claims.email, sellerId: claims.sellerId ?? null };
  } catch {
    /* ignore */
  }
  next();
}

/** Role guard. Usage: requireRole("ADMIN") or requireRole("SELLER", "ADMIN"). */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden(`Requires role: ${roles.join(" or ")}`));
    next();
  };
}

/**
 * Resolves the authenticated seller and enforces APPROVED status.
 * Puts the seller row on req.seller.
 */
export async function requireApprovedSeller(req, _res, next) {
  try {
    if (!req.user) return next(unauthorized());
    if (req.user.role !== "SELLER") return next(forbidden("Seller account required"));
    const seller = await one(`SELECT * FROM sellers WHERE user_id = ? AND deleted_at IS NULL`, [req.user.id]);
    if (!seller) return next(forbidden("No seller profile — complete seller registration first"));
    if (seller.approval_status !== "APPROVED") return next(forbidden(`Seller account is ${seller.approval_status}`));
    req.seller = seller;
    next();
  } catch (err) {
    next(err);
  }
}

/** Same as above but allows PENDING sellers (profile/document endpoints). */
export async function attachSeller(req, _res, next) {
  try {
    if (!req.user) return next(unauthorized());
    const seller = await one(`SELECT * FROM sellers WHERE user_id = ? AND deleted_at IS NULL`, [req.user.id]);
    req.seller = seller;
    next();
  } catch (err) {
    next(err);
  }
}
