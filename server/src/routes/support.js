/**
 * Help & support desk.
 * - Guests submit a query form without an account.
 * - Signed-in buyers and sellers submit pre-filled requests and see their history.
 * Every ticket is emailed to the admin team and stored in `support_tickets`.
 */
import { Router } from "express";
import { z } from "zod";
import { one, pool, query } from "../db.js";
import { notify } from "../lib/audit.js";
import { asyncHandler, parse } from "../lib/http.js";
import { sendSupportTicketEmail } from "../lib/mailer.js";
import { verifyAccessToken } from "../lib/tokens.js";
import { requireAuth } from "../middleware/auth.js";

export const supportRouter = Router();

const ticketSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(190),
  phone: z.string().trim().max(20).optional(),
  category: z.enum(["GENERAL", "ORDER", "PAYMENT", "PRODUCT", "SELLER_ACCOUNT", "TECHNICAL"]).default("GENERAL"),
  subject: z.string().trim().min(4).max(190),
  message: z.string().trim().min(10).max(4000),
  orderNumber: z.string().trim().max(40).optional(),
});

/** Read the session user when a token is present, but never require one. */
async function optionalUser(req) {
  const header = req.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const claims = verifyAccessToken(header.slice(7));
    return await one(`SELECT * FROM users WHERE id = ? AND deleted_at IS NULL`, [claims.sub]);
  } catch {
    return null;
  }
}

// POST /support — guests, buyers and sellers
supportRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = parse(ticketSchema, req.body);
    const user = await optionalUser(req);
    const role = user ? (user.role === "SELLER" ? "SELLER" : "BUYER") : "GUEST";
    const ticketNumber = `HS-SUP-${Date.now().toString(36).toUpperCase()}`;

    const [r] = await pool.execute(
      `INSERT INTO support_tickets (ticket_number,user_id,role,name,email,phone,category,subject,message,order_number)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [ticketNumber, user?.id ?? null, role, body.name, body.email.toLowerCase(), body.phone ?? null,
       body.category, body.subject, body.message, body.orderNumber ?? null],
    );

    const admins = await query(`SELECT email FROM users WHERE role='ADMIN' AND deleted_at IS NULL`);
    const mail = await sendSupportTicketEmail(
      { ...body, ticketNumber, role, id: r.insertId },
      admins.map((a) => a.email),
    );
    await notify({
      audience: "ADMIN",
      type: "SUPPORT_TICKET",
      title: `Support request ${ticketNumber}`,
      message: `${body.name}: ${body.subject}`,
      linkUrl: "/admin/support",
    });

    res.status(201).json({ ok: true, ticketNumber, emailSent: mail.sent });
  }),
);

// GET /support/mine — the signed-in user's own tickets
supportRouter.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({
      data: await query(`SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`, [req.user.id]),
    });
  }),
);
