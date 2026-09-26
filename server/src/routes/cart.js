import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { one, pool, query } from "../db.js";
import { asyncHandler, badRequest, notFound, parse } from "../lib/http.js";
import { money } from "../lib/commission.js";
import { requireAuth } from "../middleware/auth.js";

export const cartRouter = Router();
cartRouter.use(requireAuth);

const CART_SQL = `
  SELECT ci.id, ci.listing_id, ci.quantity,
         sl.price AS unit_price, sl.stock_quantity, sl.min_order_qty, sl.condition_type,
         p.id AS product_id, p.name AS product_name, p.slug AS product_slug, p.part_number,
         s.id AS seller_id, s.business_name AS seller_name,
         (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.sort_order LIMIT 1) AS image_url
    FROM cart_items ci
    JOIN seller_listings sl ON sl.id = ci.listing_id
    JOIN products p ON p.id = sl.product_id
    JOIN sellers s ON s.id = sl.seller_id
   WHERE ci.user_id = ?
   ORDER BY ci.id`;

/** Preview totals — the backend recomputes these authoritatively at checkout. */
export function computeTotals(items) {
  const subtotal = money(items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0));
  const deliveryCharge = subtotal === 0 ? 0 : subtotal > config.deliveryHeavyThreshold ? config.deliveryHeavy : config.deliveryBase;
  const taxAmount = money(subtotal * config.taxRate);
  const discountAmount = 0;
  return { subtotal, deliveryCharge, taxAmount, discountAmount, grandTotal: money(subtotal + deliveryCharge + taxAmount - discountAmount) };
}

cartRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await query(CART_SQL, [req.user.id]);
    res.json({ items, totals: computeTotals(items) });
  }),
);

cartRouter.post(
  "/items",
  asyncHandler(async (req, res) => {
    const body = parse(z.object({ listingId: z.coerce.number().int().positive(), quantity: z.coerce.number().int().positive().max(9999).default(1) }), req.body);
    const listing = await one(
      `SELECT sl.*, s.approval_status FROM seller_listings sl JOIN sellers s ON s.id = sl.seller_id
        WHERE sl.id = ? AND sl.is_active = 1 AND sl.approval_status='APPROVED' AND sl.deleted_at IS NULL`,
      [body.listingId],
    );
    if (!listing || listing.approval_status !== "APPROVED") throw notFound("Listing unavailable");
    if (body.quantity > listing.stock_quantity) throw badRequest(`Only ${listing.stock_quantity} in stock`);

    await pool.execute(
      `INSERT INTO cart_items (user_id, listing_id, quantity) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE quantity = LEAST(quantity + VALUES(quantity), ?)`,
      [req.user.id, body.listingId, body.quantity, listing.stock_quantity],
    );
    const items = await query(CART_SQL, [req.user.id]);
    res.status(201).json({ items, totals: computeTotals(items) });
  }),
);

cartRouter.patch(
  "/items/:listingId",
  asyncHandler(async (req, res) => {
    const { quantity } = parse(z.object({ quantity: z.coerce.number().int().positive().max(9999) }), req.body);
    const listing = await one(`SELECT stock_quantity FROM seller_listings WHERE id = ?`, [req.params.listingId]);
    if (!listing) throw notFound("Listing not found");
    await pool.execute(`UPDATE cart_items SET quantity = ? WHERE user_id = ? AND listing_id = ?`, [
      Math.min(quantity, listing.stock_quantity),
      req.user.id,
      req.params.listingId,
    ]);
    const items = await query(CART_SQL, [req.user.id]);
    res.json({ items, totals: computeTotals(items) });
  }),
);

cartRouter.delete(
  "/items/:listingId",
  asyncHandler(async (req, res) => {
    await pool.execute(`DELETE FROM cart_items WHERE user_id = ? AND listing_id = ?`, [req.user.id, req.params.listingId]);
    const items = await query(CART_SQL, [req.user.id]);
    res.json({ items, totals: computeTotals(items) });
  }),
);

cartRouter.delete(
  "/",
  asyncHandler(async (req, res) => {
    await pool.execute(`DELETE FROM cart_items WHERE user_id = ?`, [req.user.id]);
    res.json({ items: [], totals: computeTotals([]) });
  }),
);

/* ------------------------------- Wishlist -------------------------------- */

export const wishlistRouter = Router();
wishlistRouter.use(requireAuth);

wishlistRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({
      data: await query(
        `SELECT w.product_id, p.name, p.slug, p.part_number,
                (SELECT MIN(price) FROM seller_listings l WHERE l.product_id=p.id AND l.approval_status='APPROVED' AND l.is_active=1) AS best_price,
                (SELECT image_url FROM product_images pi WHERE pi.product_id=p.id ORDER BY pi.is_primary DESC LIMIT 1) AS image_url
           FROM wishlist_items w JOIN products p ON p.id = w.product_id
          WHERE w.user_id = ? ORDER BY w.created_at DESC`,
        [req.user.id],
      ),
    });
  }),
);

wishlistRouter.post(
  "/:productId",
  asyncHandler(async (req, res) => {
    await pool.execute(`INSERT IGNORE INTO wishlist_items (user_id, product_id) VALUES (?,?)`, [req.user.id, req.params.productId]);
    res.status(201).json({ ok: true });
  }),
);

wishlistRouter.delete(
  "/:productId",
  asyncHandler(async (req, res) => {
    await pool.execute(`DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?`, [req.user.id, req.params.productId]);
    res.json({ ok: true });
  }),
);
