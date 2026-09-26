import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { one, pool, transaction } from "../db.js";
import { audit, notify } from "../lib/audit.js";
import { asyncHandler, badRequest, notFound, parse } from "../lib/http.js";
import { buildEsewaPayload, initiateKhalti, verifyEsewa, verifyKhalti } from "../lib/payments.js";
import { requireAuth } from "../middleware/auth.js";

export const paymentRouter = Router();

/**
 * Marks an order paid exactly once, idempotently.
 * Called only from server-side verification paths (verify endpoint + webhook).
 */
async function markOrderPaid(orderId, { provider, providerTxnId, amount, raw }) {
  return transaction(async (conn) => {
    const [rows] = await conn.execute(`SELECT * FROM orders WHERE id = ? FOR UPDATE`, [orderId]);
    const order = rows[0];
    if (!order) throw notFound("Order not found");

    if (order.payment_status === "PAID") return { alreadyPaid: true, order };

    if (amount != null && Math.abs(Number(amount) - Number(order.total_amount)) > 0.5) {
      await conn.execute(
        `UPDATE payment_transactions SET status='FAILED', failure_reason='Amount mismatch', raw_payload=?
          WHERE order_id = ? AND provider = ? AND status IN ('INITIATED','PENDING')`,
        [JSON.stringify(raw ?? {}), orderId, provider],
      );
      throw badRequest("Paid amount does not match the order total");
    }

    await conn.execute(
      `INSERT INTO payment_transactions (order_id, provider, transaction_type, amount, provider_txn_id, status, verified_server_side, raw_payload, completed_at)
       VALUES (?,?, 'PAYMENT', ?, ?, 'SUCCESS', 1, ?, NOW())
       ON DUPLICATE KEY UPDATE status='SUCCESS', verified_server_side=1, raw_payload=VALUES(raw_payload), completed_at=NOW(), amount=VALUES(amount)`,
      [orderId, provider, amount ?? order.total_amount, providerTxnId, JSON.stringify(raw ?? {})],
    );
    await conn.execute(
      `UPDATE orders SET payment_status='PAID', order_status = IF(order_status='PLACED','PAYMENT_CONFIRMED',order_status) WHERE id = ?`,
      [orderId],
    );
    await conn.execute(`INSERT INTO order_status_history (order_id,status,note) VALUES (?,?,?)`, [
      orderId, "PAYMENT_CONFIRMED", `${provider} payment verified server-side (${providerTxnId ?? "n/a"})`,
    ]);
    await notify({ userId: order.user_id, audience: "USER", type: "PAYMENT_CONFIRMED", title: "Payment confirmed", message: `Payment for ${order.order_number} was received.`, linkUrl: "/orders" }, conn);
    await notify({ audience: "ADMIN", type: "PAYMENT_CONFIRMED", title: "Payment received", message: `Order ${order.order_number} paid via ${provider}.`, linkUrl: "/admin/payments" }, conn);
    await audit({ actorRole: "SYSTEM", action: "PAYMENT_VERIFIED", entityType: "orders", entityId: orderId, newValues: { provider, providerTxnId } }, conn);
    return { alreadyPaid: false, order };
  });
}

/* --------------------------- Payment initiation --------------------------- */

// POST /payments/initiate { orderNumber, provider }
paymentRouter.post(
  "/initiate",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = parse(
      z.object({ orderNumber: z.string().min(4), provider: z.enum(["ESEWA", "KHALTI", "BANK_TRANSFER", "COD"]) }),
      req.body,
    );
    const order = await one(`SELECT * FROM orders WHERE order_number = ? AND user_id = ?`, [body.orderNumber, req.user.id]);
    if (!order) throw notFound("Order not found");
    if (order.payment_status === "PAID") throw badRequest("Order is already paid");

    const transactionUuid = `${order.order_number}-${Date.now()}`;

    if (body.provider === "ESEWA") {
      await pool.execute(
        `INSERT INTO payment_transactions (order_id, provider, amount, provider_txn_id, status) VALUES (?,?,?,?, 'INITIATED')`,
        [order.id, "ESEWA", order.total_amount, transactionUuid],
      );
      const payload = buildEsewaPayload({
        amount: order.total_amount,
        transactionUuid,
        successUrl: `${config.uploads.publicBaseUrl}/api/v1/payments/esewa/return?order=${order.order_number}&uuid=${transactionUuid}`,
        failureUrl: `${config.redirects.failure}?order=${order.order_number}&status=failed`,
      });
      return res.json({ provider: "ESEWA", method: "FORM_POST", transactionUuid, ...payload });
    }

    if (body.provider === "KHALTI") {
      const init = await initiateKhalti({
        amountNpr: order.total_amount,
        orderNumber: order.order_number,
        returnUrl: `${config.uploads.publicBaseUrl}/api/v1/payments/khalti/return?order=${order.order_number}`,
        websiteUrl: config.redirects.success,
        customer: { name: order.buyer_name, email: order.buyer_email, phone: order.buyer_phone },
      });
      await pool.execute(
        `INSERT INTO payment_transactions (order_id, provider, amount, provider_txn_id, status, raw_payload) VALUES (?,?,?,?, 'PENDING', ?)`,
        [order.id, "KHALTI", order.total_amount, init.pidx, JSON.stringify(init.raw)],
      );
      return res.json({ provider: "KHALTI", method: "REDIRECT", paymentUrl: init.paymentUrl, pidx: init.pidx });
    }

    // Offline providers stay PENDING until an admin verifies the receipt.
    await pool.execute(
      `INSERT INTO payment_transactions (order_id, provider, amount, provider_txn_id, status) VALUES (?,?,?,?, 'PENDING')`,
      [order.id, body.provider, order.total_amount, transactionUuid],
    );
    res.json({ provider: body.provider, method: "MANUAL", message: "Awaiting admin verification" });
  }),
);

/* ---------------------------- Verification -------------------------------- */

// POST /payments/verify  — called by the SPA after returning from the gateway
paymentRouter.post(
  "/verify",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = parse(
      z.object({ orderNumber: z.string(), provider: z.enum(["ESEWA", "KHALTI"]), transactionUuid: z.string().optional(), pidx: z.string().optional() }),
      req.body,
    );
    const order = await one(`SELECT * FROM orders WHERE order_number = ? AND user_id = ?`, [body.orderNumber, req.user.id]);
    if (!order) throw notFound("Order not found");

    const result =
      body.provider === "ESEWA"
        ? await verifyEsewa({ transactionUuid: body.transactionUuid, totalAmount: order.total_amount })
        : await verifyKhalti({ pidx: body.pidx });

    if (!result.ok) {
      await pool.execute(
        `UPDATE payment_transactions SET status='FAILED', failure_reason=?, raw_payload=? WHERE order_id=? AND provider=? AND status IN ('INITIATED','PENDING')`,
        [String(result.status).slice(0, 255), JSON.stringify(result.raw), order.id, body.provider],
      );
      return res.status(402).json({ ok: false, status: result.status });
    }

    await markOrderPaid(order.id, { provider: body.provider, providerTxnId: result.providerTxnId, amount: result.amount, raw: result.raw });
    res.json({ ok: true, orderNumber: order.order_number });
  }),
);

// GET /payments/esewa/return — gateway browser redirect; verifies then bounces to the SPA
paymentRouter.get(
  "/esewa/return",
  asyncHandler(async (req, res) => {
    const orderNumber = String(req.query.order ?? "");
    const uuid = String(req.query.uuid ?? "");
    const order = await one(`SELECT * FROM orders WHERE order_number = ?`, [orderNumber]);
    if (!order) return res.redirect(`${config.redirects.failure}?status=unknown-order`);
    const result = await verifyEsewa({ transactionUuid: uuid, totalAmount: order.total_amount });
    if (!result.ok) return res.redirect(`${config.redirects.failure}?order=${orderNumber}&status=${result.status}`);
    await markOrderPaid(order.id, { provider: "ESEWA", providerTxnId: result.providerTxnId, amount: result.amount, raw: result.raw });
    res.redirect(`${config.redirects.success}?order=${orderNumber}&status=paid`);
  }),
);

// GET /payments/khalti/return
paymentRouter.get(
  "/khalti/return",
  asyncHandler(async (req, res) => {
    const orderNumber = String(req.query.order ?? "");
    const pidx = String(req.query.pidx ?? "");
    const order = await one(`SELECT * FROM orders WHERE order_number = ?`, [orderNumber]);
    if (!order) return res.redirect(`${config.redirects.failure}?status=unknown-order`);
    const result = await verifyKhalti({ pidx });
    if (!result.ok) return res.redirect(`${config.redirects.failure}?order=${orderNumber}&status=${result.status}`);
    await markOrderPaid(order.id, { provider: "KHALTI", providerTxnId: result.providerTxnId, amount: result.amount, raw: result.raw });
    res.redirect(`${config.redirects.success}?order=${orderNumber}&status=paid`);
  }),
);

/* ------------------------------- Webhooks --------------------------------- */
/**
 * Gateway → server callbacks. The payload is treated as a hint only: the
 * server always re-verifies against the provider status/lookup API before
 * touching the order.
 */
export const webhookRouter = Router();

webhookRouter.post(
  "/esewa",
  asyncHandler(async (req, res) => {
    const uuid = req.body?.transaction_uuid ?? req.query.transaction_uuid;
    if (!uuid) throw badRequest("transaction_uuid required");
    const txn = await one(`SELECT * FROM payment_transactions WHERE provider='ESEWA' AND provider_txn_id = ?`, [String(uuid)]);
    if (!txn) throw notFound("Unknown transaction");
    const order = await one(`SELECT * FROM orders WHERE id = ?`, [txn.order_id]);
    const result = await verifyEsewa({ transactionUuid: String(uuid), totalAmount: order.total_amount });
    if (!result.ok) return res.status(202).json({ ok: false, status: result.status });
    await markOrderPaid(order.id, { provider: "ESEWA", providerTxnId: result.providerTxnId, amount: result.amount, raw: result.raw });
    res.json({ ok: true });
  }),
);

webhookRouter.post(
  "/khalti",
  asyncHandler(async (req, res) => {
    const pidx = req.body?.pidx ?? req.query.pidx;
    if (!pidx) throw badRequest("pidx required");
    const txn = await one(`SELECT * FROM payment_transactions WHERE provider='KHALTI' AND provider_txn_id = ?`, [String(pidx)]);
    if (!txn) throw notFound("Unknown transaction");
    const result = await verifyKhalti({ pidx: String(pidx) });
    if (!result.ok) return res.status(202).json({ ok: false, status: result.status });
    await markOrderPaid(txn.order_id, { provider: "KHALTI", providerTxnId: result.providerTxnId, amount: result.amount, raw: result.raw });
    res.json({ ok: true });
  }),
);
