import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { one, pool, query, transaction } from "../db.js";
import { audit, notify } from "../lib/audit.js";
import { money, resolveCommissionRate, splitCommission } from "../lib/commission.js";
import { asyncHandler, badRequest, conflict, notFound, parse } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";

export const orderRouter = Router();
orderRouter.use(requireAuth);

const addressSchema = z.object({
  buyerName: z.string().min(2).max(120),
  buyerPhone: z.string().min(7).max(20),
  buyerEmail: z.string().email().max(190),
  province: z.string().max(60),
  district: z.string().max(60),
  city: z.string().max(80),
  street: z.string().max(190),
  landmark: z.string().max(190).optional(),
  notes: z.string().max(500).optional(),
});

const orderNumber = () =>
  `HS-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;

/**
 * POST /orders — creates the order, snapshots pricing + commission, reserves
 * stock, and records the accrual. Everything happens in ONE MySQL transaction.
 */
orderRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = parse(addressSchema, req.body);

    const result = await transaction(async (conn) => {
      const [cart] = await conn.execute(
        `SELECT ci.listing_id, ci.quantity, sl.price, sl.stock_quantity, sl.seller_id,
                p.id AS product_id, p.name AS product_name, p.part_number, p.category_id,
                s.business_name, s.commission_rate AS seller_override,
                (SELECT image_url FROM product_images pi WHERE pi.product_id=p.id ORDER BY pi.is_primary DESC LIMIT 1) AS image_url
           FROM cart_items ci
           JOIN seller_listings sl ON sl.id = ci.listing_id
           JOIN products p ON p.id = sl.product_id
           JOIN sellers s ON s.id = sl.seller_id
          WHERE ci.user_id = ?
          FOR UPDATE`,
        [req.user.id],
      );
      if (cart.length === 0) throw badRequest("Cart is empty");

      for (const line of cart) {
        if (line.quantity > line.stock_quantity) {
          throw conflict(`${line.product_name}: only ${line.stock_quantity} left in stock`);
        }
      }

      const subtotal = money(cart.reduce((s, l) => s + Number(l.price) * l.quantity, 0));
      const deliveryCharge = subtotal > config.deliveryHeavyThreshold ? config.deliveryHeavy : config.deliveryBase;
      const taxAmount = money(subtotal * config.taxRate);
      const totalAmount = money(subtotal + deliveryCharge + taxAmount);

      // Commission snapshot per line.
      const lines = [];
      let commissionTotal = 0;
      for (const line of cart) {
        const gross = money(Number(line.price) * line.quantity);
        const { rate } = await resolveCommissionRate(conn, {
          sellerId: line.seller_id,
          categoryId: line.category_id,
          sellerOverrideRate: line.seller_override,
        });
        const { commissionAmount, sellerAmount } = splitCommission(gross, rate);
        commissionTotal = money(commissionTotal + commissionAmount);
        lines.push({ ...line, gross, rate, commissionAmount, sellerAmount });
      }
      const sellerPayable = money(subtotal - commissionTotal);

      let number = orderNumber();
      const [existing] = await conn.execute(`SELECT id FROM orders WHERE order_number = ?`, [number]);
      if (existing.length) number = orderNumber();

      const [ins] = await conn.execute(
        `INSERT INTO orders (order_number,user_id,buyer_name,buyer_phone,buyer_email,
            shipping_province,shipping_district,shipping_city,shipping_street,shipping_landmark,
            subtotal,tax_amount,delivery_charge,discount_amount,total_amount,commission_amount,seller_payable,notes)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?)`,
        [number, req.user.id, body.buyerName, body.buyerPhone, body.buyerEmail, body.province, body.district,
         body.city, body.street, body.landmark ?? null, subtotal, taxAmount, deliveryCharge, totalAmount,
         commissionTotal, sellerPayable, body.notes ?? null],
      );
      const orderId = ins.insertId;

      for (const l of lines) {
        const [itemIns] = await conn.execute(
          `INSERT INTO order_items (order_id,listing_id,product_id,seller_id,product_name_snapshot,part_number_snapshot,
              seller_name_snapshot,image_url_snapshot,unit_price,quantity,subtotal,commission_rate,commission_amount,seller_amount)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [orderId, l.listing_id, l.product_id, l.seller_id, l.product_name, l.part_number, l.business_name,
           l.image_url, l.price, l.quantity, l.gross, l.rate, l.commissionAmount, l.sellerAmount],
        );
        await conn.execute(
          `INSERT INTO commission_records (order_id,order_item_id,seller_id,gross_amount,commission_rate,commission_amount,seller_amount)
           VALUES (?,?,?,?,?,?,?)`,
          [orderId, itemIns.insertId, l.seller_id, l.gross, l.rate, l.commissionAmount, l.sellerAmount],
        );
        // Reserve stock immediately; released on cancellation.
        const [upd] = await conn.execute(
          `UPDATE seller_listings SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?`,
          [l.quantity, l.listing_id, l.quantity],
        );
        if (upd.affectedRows === 0) throw conflict(`${l.product_name} went out of stock`);
      }

      await conn.execute(`INSERT INTO order_status_history (order_id,status,note,changed_by) VALUES (?,?,?,?)`, [
        orderId, "PLACED", "Order created", req.user.id,
      ]);
      await conn.execute(`DELETE FROM cart_items WHERE user_id = ?`, [req.user.id]);

      for (const sellerId of [...new Set(lines.map((l) => l.seller_id))]) {
        const [su] = await conn.execute(`SELECT user_id FROM sellers WHERE id = ?`, [sellerId]);
        if (su[0]) {
          await notify(
            { userId: su[0].user_id, audience: "SELLER", type: "NEW_ORDER", title: "New order received",
              message: `Order ${number} contains your items.`, linkUrl: `/seller/orders` },
            conn,
          );
        }
      }
      await audit({ actorId: req.user.id, actorRole: req.user.role, action: "ORDER_CREATED", entityType: "orders", entityId: orderId, newValues: { number, totalAmount }, req }, conn);

      return { orderId, orderNumber: number, totalAmount };
    });

    res.status(201).json(result);
  }),
);

// GET /orders — buyer scope enforced server-side
orderRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({
      data: await query(
        `SELECT o.*, (SELECT COUNT(*) FROM order_items i WHERE i.order_id=o.id) AS item_count
           FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC`,
        [req.user.id],
      ),
    });
  }),
);

orderRouter.get(
  "/:orderNumber",
  asyncHandler(async (req, res) => {
    const order = await one(`SELECT * FROM orders WHERE order_number = ?`, [req.params.orderNumber]);
    if (!order) throw notFound("Order not found");
    if (order.user_id !== req.user.id && req.user.role !== "ADMIN") throw notFound("Order not found");
    order.items = await query(`SELECT * FROM order_items WHERE order_id = ?`, [order.id]);
    order.history = await query(`SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at`, [order.id]);
    order.payments = await query(
      `SELECT id, provider, amount, status, provider_txn_id, verified_server_side, completed_at
         FROM payment_transactions WHERE order_id = ?`,
      [order.id],
    );
    res.json({ data: order });
  }),
);

// POST /orders/:orderNumber/cancel — buyer cancel before shipment
orderRouter.post(
  "/:orderNumber/cancel",
  asyncHandler(async (req, res) => {
    await transaction(async (conn) => {
      const [rows] = await conn.execute(`SELECT * FROM orders WHERE order_number = ? FOR UPDATE`, [req.params.orderNumber]);
      const order = rows[0];
      if (!order || (order.user_id !== req.user.id && req.user.role !== "ADMIN")) throw notFound("Order not found");
      if (!["PLACED", "PAYMENT_CONFIRMED", "SELLER_CONFIRMED"].includes(order.order_status)) {
        throw badRequest(`Cannot cancel an order that is ${order.order_status}`);
      }
      const [items] = await conn.execute(`SELECT listing_id, quantity FROM order_items WHERE order_id = ?`, [order.id]);
      for (const it of items) {
        if (it.listing_id) {
          await conn.execute(`UPDATE seller_listings SET stock_quantity = stock_quantity + ? WHERE id = ?`, [it.quantity, it.listing_id]);
        }
      }
      await conn.execute(`UPDATE order_items SET item_status = 'CANCELLED' WHERE order_id = ?`, [order.id]);
      await conn.execute(`UPDATE commission_records SET status='REVERSED' WHERE order_id = ?`, [order.id]);
      await conn.execute(`UPDATE orders SET order_status = 'CANCELLED' WHERE id = ?`, [order.id]);
      await conn.execute(`INSERT INTO order_status_history (order_id,status,note,changed_by) VALUES (?,?,?,?)`, [
        order.id, "CANCELLED", req.body?.reason?.slice(0, 255) ?? "Cancelled by buyer", req.user.id,
      ]);
      await audit({ actorId: req.user.id, actorRole: req.user.role, action: "ORDER_CANCELLED", entityType: "orders", entityId: order.id, req }, conn);
    });
    res.json({ ok: true });
  }),
);

// POST /orders/:orderNumber/refund-request
orderRouter.post(
  "/:orderNumber/refund-request",
  asyncHandler(async (req, res) => {
    const body = parse(z.object({ orderItemId: z.coerce.number().int().positive().optional(), amount: z.coerce.number().positive(), reason: z.string().min(4).max(255) }), req.body);
    const order = await one(`SELECT * FROM orders WHERE order_number = ? AND user_id = ?`, [req.params.orderNumber, req.user.id]);
    if (!order) throw notFound("Order not found");
    await pool.execute(
      `INSERT INTO refunds (order_id, order_item_id, amount, reason, requested_by) VALUES (?,?,?,?,?)`,
      [order.id, body.orderItemId ?? null, body.amount, body.reason, req.user.id],
    );
    await notify({ audience: "ADMIN", type: "REFUND_REQUESTED", title: "Refund requested", message: `Order ${order.order_number}: ${body.reason}`, linkUrl: "/admin/payments" });
    res.status(201).json({ ok: true });
  }),
);
