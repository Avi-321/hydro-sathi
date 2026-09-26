import { Router } from "express";
import { z } from "zod";
import { one, pool, query, transaction } from "../db.js";
import { audit, notify } from "../lib/audit.js";
import { attachOrderItems } from "../lib/hydrate.js";
import { asyncHandler, badRequest, notFound, paginate, parse } from "../lib/http.js";
import { generateSettlementsForOrder } from "../lib/settlements.js";
import { sendProductReviewEmail, sendSellerStatusEmail, sendSupportReplyEmail } from "../lib/mailer.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { fileUrl, imageUpload } from "../lib/uploads.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("ADMIN"));

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 170);

/* -------------------------------- Dashboard ------------------------------- */

adminRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [users] = await query(
      `SELECT SUM(role='BUYER') AS buyers, SUM(role='SELLER') AS sellers, SUM(role='ADMIN') AS admins FROM users WHERE deleted_at IS NULL`,
    );
    const [sellers] = await query(`SELECT COUNT(*) AS total, SUM(approval_status='PENDING') AS pending FROM sellers WHERE deleted_at IS NULL`);
    const [products] = await query(`SELECT COUNT(*) AS total, SUM(status='PENDING_REVIEW') AS pending FROM products WHERE deleted_at IS NULL`);
    const [listings] = await query(`SELECT SUM(approval_status='PENDING_REVIEW') AS pending FROM seller_listings WHERE deleted_at IS NULL`);
    const [orders] = await query(
      `SELECT COUNT(*) AS total, SUM(order_status NOT IN ('COMPLETED','CANCELLED','DELIVERED')) AS open,
              COALESCE(SUM(total_amount),0) AS revenue, COALESCE(SUM(commission_amount),0) AS commission
         FROM orders`,
    );
    const [payouts] = await query(`SELECT COALESCE(SUM(net_amount),0) AS pending_settlements FROM settlements WHERE status <> 'PAID'`);
    const [refunds] = await query(`SELECT COUNT(*) AS open_refunds FROM refunds WHERE status = 'REQUESTED'`);
    const monthly = await query(
      `SELECT DATE_FORMAT(created_at,'%Y-%m') AS month, SUM(total_amount) AS revenue, SUM(commission_amount) AS commission
         FROM orders GROUP BY month ORDER BY month DESC LIMIT 12`,
    );
    res.json({ ...users, sellers, products, listings, orders, ...payouts, ...refunds, monthly });
  }),
);

adminRouter.get(
  "/notifications",
  asyncHandler(async (_req, res) => {
    res.json({ data: await query(`SELECT * FROM notifications WHERE audience IN ('ADMIN','ALL') ORDER BY created_at DESC LIMIT 100`) });
  }),
);

/* ---------------------------- Seller verification -------------------------- */

adminRouter.get(
  "/sellers",
  asyncHandler(async (req, res) => {
    const { page, pageSize, offset } = paginate(req.query);
    const status = req.query.status ? String(req.query.status) : null;
    const where = status ? `WHERE s.approval_status = ?` : ``;
    const params = status ? [status] : [];
    const rows = await query(
      `SELECT s.*, u.email, u.phone,
              (SELECT COUNT(*) FROM seller_listings sl WHERE sl.seller_id = s.id AND sl.deleted_at IS NULL) AS listing_count,
              (SELECT COUNT(*) FROM seller_documents d WHERE d.seller_id = s.id) AS document_count
         FROM sellers s JOIN users u ON u.id = s.user_id
         ${where} ORDER BY s.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );
    const [{ total }] = await query(`SELECT COUNT(*) AS total FROM sellers s ${where}`, params);
    res.json({ data: rows, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  }),
);

adminRouter.get(
  "/sellers/:id",
  asyncHandler(async (req, res) => {
    const seller = await one(`SELECT s.*, u.email, u.phone FROM sellers s JOIN users u ON u.id=s.user_id WHERE s.id = ?`, [req.params.id]);
    if (!seller) throw notFound("Seller not found");
    seller.documents = await query(`SELECT * FROM seller_documents WHERE seller_id = ? ORDER BY created_at DESC`, [req.params.id]);
    res.json({ data: seller });
  }),
);

// PATCH /admin/sellers/:id/approval
adminRouter.patch(
  "/sellers/:id/approval",
  asyncHandler(async (req, res) => {
    const body = parse(
      z.object({ status: z.enum(["APPROVED", "REJECTED", "SUSPENDED", "PENDING"]), reason: z.string().max(500).optional() }),
      req.body,
    );
    const emailed = await transaction(async (conn) => {
      const [rows] = await conn.execute(`SELECT * FROM sellers WHERE id = ?`, [req.params.id]);
      const seller = rows[0];
      if (!seller) throw notFound("Seller not found");
      await conn.execute(
        `UPDATE sellers SET approval_status = ?, rejection_reason = ?, approved_at = IF(? = 'APPROVED', NOW(), approved_at), approved_by = ? WHERE id = ?`,
        [body.status, body.reason ?? null, body.status, req.user.id, seller.id],
      );
      if (body.status === "SUSPENDED" || body.status === "REJECTED") {
        await conn.execute(`UPDATE seller_listings SET is_active = 0 WHERE seller_id = ?`, [seller.id]);
      }
      await notify(
        { userId: seller.user_id, audience: "SELLER", type: "SELLER_STATUS", title: `Seller account ${body.status.toLowerCase()}`,
          message: body.reason ?? `Your seller account is now ${body.status}.`, linkUrl: "/seller/profile" },
        conn,
      );
      await audit({ actorId: req.user.id, actorRole: "ADMIN", action: "SELLER_APPROVAL_CHANGED", entityType: "sellers", entityId: seller.id, oldValues: { status: seller.approval_status }, newValues: body, req }, conn);
      const [users] = await conn.execute(`SELECT * FROM users WHERE id = ?`, [seller.user_id]);
      return users[0];
    });
    if (emailed) {
      try {
        await sendSellerStatusEmail(emailed, body.status, body.reason);
      } catch (err) {
        console.error("Seller status email failed:", err.message);
      }
    }
    res.json({ ok: true });
  }),
);

adminRouter.patch(
  "/seller-documents/:id",
  asyncHandler(async (req, res) => {
    const body = parse(z.object({ status: z.enum(["VERIFIED", "REJECTED", "PENDING"]), reason: z.string().max(255).optional() }), req.body);
    const doc = await one(`SELECT * FROM seller_documents WHERE id = ?`, [req.params.id]);
    if (!doc) throw notFound("Document not found");
    await pool.execute(`UPDATE seller_documents SET status=?, review_note=?, reviewed_by=?, reviewed_at=NOW() WHERE id = ?`, [
      body.status, body.reason ?? null, req.user.id, doc.id,
    ]);
    await audit({ actorId: req.user.id, actorRole: "ADMIN", action: "SELLER_DOCUMENT_REVIEWED", entityType: "seller_documents", entityId: doc.id, newValues: body, req });
    res.json({ ok: true });
  }),
);

/* ------------------------------ Master products ---------------------------- */

const productSchema = z.object({
  name: z.string().min(3).max(200),
  partNumber: z.string().min(1).max(80),
  oemNumber: z.string().max(80).optional(),
  categoryId: z.coerce.number().int().positive(),
  brandId: z.coerce.number().int().positive().optional(),
  manufacturer: z.string().max(120).optional(),
  shortDescription: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
  specifications: z.record(z.string(), z.any()).optional(),
  compatibility: z.array(z.string().max(120)).optional(),
  unit: z.string().max(20).default("pcs"),
  weightKg: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().positive().optional()),
  hsCode: z.string().max(20).optional(),
  isFeatured: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  // Uploaded file URLs returned by POST /uploads/images (never hand-typed URLs).
  images: z.array(z.object({ url: z.string().url().max(500), alt: z.string().max(190).optional(), isPrimary: z.boolean().optional() })).optional(),
});

adminRouter.get(
  "/products",
  asyncHandler(async (req, res) => {
    const { page, pageSize, offset } = paginate(req.query);
    const status = req.query.status ? String(req.query.status) : null;
    const where = status ? `WHERE p.status = ? AND p.deleted_at IS NULL` : `WHERE p.deleted_at IS NULL`;
    const params = status ? [status] : [];
    const rows = await query(
      `SELECT p.*, c.name AS category_name, b.name AS brand_name, s.business_name AS submitted_by_seller,
              (SELECT COUNT(*) FROM seller_listings sl WHERE sl.product_id=p.id AND sl.deleted_at IS NULL) AS listing_count
         FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN brands b ON b.id=p.brand_id
              LEFT JOIN sellers s ON s.id = p.created_by_seller_id
         ${where} ORDER BY p.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );
    const [{ total }] = await query(`SELECT COUNT(*) AS total FROM products p ${where}`, params);
    res.json({ data: rows, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  }),
);

adminRouter.post(
  "/products",
  asyncHandler(async (req, res) => {
    const body = parse(productSchema, req.body);
    const id = await transaction(async (conn) => {
      const [r] = await conn.execute(
        `INSERT INTO products (name,slug,part_number,oem_number,category_id,brand_id,manufacturer,short_description,
            description,specifications,compatibility,unit,weight_kg,hs_code,is_featured,is_new_arrival,status,created_by,approved_by,approved_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'ACTIVE', ?, ?, NOW())`,
        [body.name, `${slugify(body.name)}-${Date.now().toString(36)}`, body.partNumber, body.oemNumber ?? null,
         body.categoryId, body.brandId ?? null, body.manufacturer ?? null, body.shortDescription ?? null,
         body.description ?? null, body.specifications ? JSON.stringify(body.specifications) : null,
         body.compatibility ? JSON.stringify(body.compatibility) : null, body.unit, body.weightKg ?? null,
         body.hsCode ?? null, body.isFeatured ? 1 : 0, body.isNewArrival ? 1 : 0, req.user.id, req.user.id],
      );
      for (const [i, img] of (body.images ?? []).entries()) {
        await conn.execute(
          `INSERT INTO product_images (product_id,image_url,alt_text,is_primary,sort_order) VALUES (?,?,?,?,?)`,
          [r.insertId, img.url, img.alt ?? body.name, img.isPrimary ? 1 : i === 0 ? 1 : 0, i],
        );
      }
      await audit({ actorId: req.user.id, actorRole: "ADMIN", action: "PRODUCT_CREATED", entityType: "products", entityId: r.insertId, newValues: body, req }, conn);
      return r.insertId;
    });
    res.status(201).json({ id });
  }),
);

adminRouter.patch(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const body = parse(productSchema.partial().extend({ status: z.enum(["DRAFT", "PENDING_REVIEW", "ACTIVE", "ARCHIVED"]).optional() }), req.body);
    const product = await one(`SELECT * FROM products WHERE id = ?`, [req.params.id]);
    if (!product) throw notFound("Product not found");
    const map = { name: "name", partNumber: "part_number", oemNumber: "oem_number", categoryId: "category_id", brandId: "brand_id", manufacturer: "manufacturer", shortDescription: "short_description", description: "description", unit: "unit", weightKg: "weight_kg", hsCode: "hs_code", status: "status", isFeatured: "is_featured", isNewArrival: "is_new_arrival" };
    const sets = [], params = [];
    for (const [k, v] of Object.entries(body)) {
      if (v === undefined || !(k in map)) continue;
      sets.push(`${map[k]} = ?`); params.push(typeof v === "boolean" ? (v ? 1 : 0) : v);
    }
    if (body.specifications !== undefined) { sets.push(`specifications = ?`); params.push(JSON.stringify(body.specifications)); }
    if (body.compatibility !== undefined) { sets.push(`compatibility = ?`); params.push(JSON.stringify(body.compatibility)); }
    if (!sets.length) throw badRequest("Nothing to update");
    params.push(product.id);
    await pool.execute(`UPDATE products SET ${sets.join(", ")} WHERE id = ?`, params);
    await audit({ actorId: req.user.id, actorRole: "ADMIN", action: "PRODUCT_UPDATED", entityType: "products", entityId: product.id, oldValues: product, newValues: body, req });
    res.json({ ok: true });
  }),
);

// Product photos are uploaded as real image files (field name: files).
adminRouter.post(
  "/products/:id/images",
  imageUpload.array("files", 6),
  asyncHandler(async (req, res) => {
    if (!req.files?.length) throw badRequest("Attach at least one image file (field name: files)");
    const product = await one(`SELECT id, name FROM products WHERE id = ?`, [req.params.id]);
    if (!product) throw notFound("Product not found");
    const [{ existing }] = await query(`SELECT COUNT(*) AS existing FROM product_images WHERE product_id = ?`, [product.id]);
    const created = [];
    for (const [i, file] of req.files.entries()) {
      const isPrimary = Number(existing) === 0 && i === 0 ? 1 : 0;
      const [r] = await pool.execute(
        `INSERT INTO product_images (product_id,image_url,alt_text,is_primary,sort_order) VALUES (?,?,?,?,?)`,
        [product.id, fileUrl(file), product.name, isPrimary, Number(existing) + i],
      );
      created.push({ id: r.insertId, url: fileUrl(file), isPrimary: Boolean(isPrimary) });
    }
    res.status(201).json({ data: created });
  }),
);

// Approve / reject a master product (seller submissions become buyer-visible).
adminRouter.patch(
  "/products/:id/approval",
  asyncHandler(async (req, res) => {
    const body = parse(z.object({ status: z.enum(["APPROVED", "REJECTED"]), reason: z.string().max(255).optional() }), req.body);
    const product = await one(
      `SELECT p.*, s.user_id AS seller_user_id FROM products p LEFT JOIN sellers s ON s.id = p.created_by_seller_id WHERE p.id = ?`,
      [req.params.id],
    );
    if (!product) throw notFound("Product not found");
    const approved = body.status === "APPROVED";

    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE products SET status = ?, rejection_reason = ?, approved_by = ?, approved_at = ? WHERE id = ?`,
        [approved ? "ACTIVE" : "ARCHIVED", body.reason ?? null, req.user.id, approved ? new Date() : null, product.id],
      );
      // The submitting shop's own listing goes live with the product.
      if (product.created_by_seller_id) {
        await conn.execute(
          `UPDATE seller_listings SET approval_status = ?, is_active = ?, rejection_reason = ?
            WHERE product_id = ? AND seller_id = ?`,
          [approved ? "APPROVED" : "REJECTED", approved ? 1 : 0, body.reason ?? null, product.id, product.created_by_seller_id],
        );
      }
      await audit({ actorId: req.user.id, actorRole: "ADMIN", action: "PRODUCT_REVIEWED", entityType: "products", entityId: product.id, newValues: body, req }, conn);
    });

    if (product.seller_user_id) {
      await notify({
        userId: product.seller_user_id, audience: "SELLER", type: "PRODUCT_REVIEWED",
        title: `Product ${body.status.toLowerCase()}`, message: `${product.name} was ${body.status.toLowerCase()}.`,
        linkUrl: "/seller/products",
      });
      const sellerUser = await one(`SELECT email FROM users WHERE id = ?`, [product.seller_user_id]);
      if (sellerUser) await sendProductReviewEmail(sellerUser, product.name, body.status, body.reason);
    }
    res.json({ ok: true });
  }),
);

// Assign a master product to a seller — creates (or revives) an approved listing.
adminRouter.post(
  "/products/:id/assign",
  asyncHandler(async (req, res) => {
    const body = parse(
      z.object({
        sellerId: z.coerce.number().int().positive(),
        price: z.coerce.number().positive(),
        mrp: z.coerce.number().positive().optional(),
        stockQuantity: z.coerce.number().int().min(0).default(0),
        minOrderQty: z.coerce.number().int().positive().default(1),
        leadTimeDays: z.coerce.number().int().min(0).default(3),
        conditionType: z.enum(["NEW", "REFURBISHED"]).default("NEW"),
      }),
      req.body,
    );
    const product = await one(`SELECT * FROM products WHERE id = ? AND deleted_at IS NULL`, [req.params.id]);
    if (!product) throw notFound("Product not found");
    const seller = await one(`SELECT * FROM sellers WHERE id = ? AND deleted_at IS NULL`, [body.sellerId]);
    if (!seller) throw notFound("Seller not found");
    if (seller.approval_status !== "APPROVED") throw badRequest("Seller is not approved yet");

    const existing = await one(`SELECT id FROM seller_listings WHERE seller_id = ? AND product_id = ?`, [seller.id, product.id]);
    let listingId;
    if (existing) {
      await pool.execute(
        `UPDATE seller_listings SET price=?, mrp=?, stock_quantity=?, min_order_qty=?, lead_time_days=?, condition_type=?,
              approval_status='APPROVED', is_active=1, deleted_at=NULL WHERE id=?`,
        [body.price, body.mrp ?? null, body.stockQuantity, body.minOrderQty, body.leadTimeDays, body.conditionType, existing.id],
      );
      listingId = existing.id;
    } else {
      const [r] = await pool.execute(
        `INSERT INTO seller_listings (seller_id,product_id,price,mrp,stock_quantity,min_order_qty,lead_time_days,condition_type,approval_status,is_active)
         VALUES (?,?,?,?,?,?,?,?, 'APPROVED', 1)`,
        [seller.id, product.id, body.price, body.mrp ?? null, body.stockQuantity, body.minOrderQty, body.leadTimeDays, body.conditionType],
      );
      listingId = r.insertId;
    }
    await notify({
      userId: seller.user_id, audience: "SELLER", type: "PRODUCT_ASSIGNED",
      title: "Product assigned to your shop", message: `${product.name} is now listed under your shop.`, linkUrl: "/seller/products",
    });
    await audit({ actorId: req.user.id, actorRole: "ADMIN", action: "PRODUCT_ASSIGNED", entityType: "seller_listings", entityId: listingId, newValues: body, req });
    res.status(201).json({ id: listingId });
  }),
);

// Soft-delete a master product (kept for order history integrity).
adminRouter.delete(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const product = await one(`SELECT * FROM products WHERE id = ? AND deleted_at IS NULL`, [req.params.id]);
    if (!product) throw notFound("Product not found");
    await transaction(async (conn) => {
      await conn.execute(`UPDATE products SET status='ARCHIVED', deleted_at = NOW() WHERE id = ?`, [product.id]);
      await conn.execute(`UPDATE seller_listings SET is_active = 0 WHERE product_id = ?`, [product.id]);
      await conn.execute(`DELETE FROM cart_items WHERE listing_id IN (SELECT id FROM seller_listings WHERE product_id = ?)`, [product.id]);
      await audit({ actorId: req.user.id, actorRole: "ADMIN", action: "PRODUCT_DELETED", entityType: "products", entityId: product.id, oldValues: product, req }, conn);
    });
    res.json({ ok: true });
  }),
);

adminRouter.delete(
  "/product-images/:id",
  asyncHandler(async (req, res) => {
    await pool.execute(`DELETE FROM product_images WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  }),
);

/* ------------------------------ Listing review ----------------------------- */

adminRouter.get(
  "/listings",
  asyncHandler(async (req, res) => {
    const status = String(req.query.status ?? "PENDING_REVIEW");
    res.json({
      data: await query(
        `SELECT sl.*, p.name AS product_name, p.part_number, s.business_name
           FROM seller_listings sl JOIN products p ON p.id=sl.product_id JOIN sellers s ON s.id=sl.seller_id
          WHERE sl.approval_status = ? AND sl.deleted_at IS NULL ORDER BY sl.created_at DESC`,
        [status],
      ),
    });
  }),
);

adminRouter.patch(
  "/listings/:id/approval",
  asyncHandler(async (req, res) => {
    const body = parse(z.object({ status: z.enum(["APPROVED", "REJECTED", "PENDING_REVIEW"]), reason: z.string().max(255).optional() }), req.body);
    const listing = await one(`SELECT sl.*, s.user_id FROM seller_listings sl JOIN sellers s ON s.id=sl.seller_id WHERE sl.id = ?`, [req.params.id]);
    if (!listing) throw notFound("Listing not found");
    await pool.execute(`UPDATE seller_listings SET approval_status=?, rejection_reason=?, is_active = IF(?='APPROVED',1,0) WHERE id=?`, [
      body.status, body.reason ?? null, body.status, listing.id,
    ]);
    await notify({ userId: listing.user_id, audience: "SELLER", type: "LISTING_REVIEWED", title: `Listing ${body.status.toLowerCase()}`, message: body.reason ?? "Your listing was reviewed.", linkUrl: "/seller/products" });
    await audit({ actorId: req.user.id, actorRole: "ADMIN", action: "LISTING_APPROVAL_CHANGED", entityType: "seller_listings", entityId: listing.id, newValues: body, req });
    res.json({ ok: true });
  }),
);

/* ------------------------------- Categories -------------------------------- */

adminRouter.post(
  "/categories",
  asyncHandler(async (req, res) => {
    const body = parse(
      z.object({ name: z.string().min(2).max(120), parentId: z.coerce.number().int().positive().nullable().optional(), description: z.string().max(1000).optional(), icon: z.string().max(60).optional(), sortOrder: z.coerce.number().int().default(0) }),
      req.body,
    );
    const [r] = await pool.execute(
      `INSERT INTO categories (name,slug,parent_id,description,icon,sort_order) VALUES (?,?,?,?,?,?)`,
      [body.name, slugify(body.name), body.parentId ?? null, body.description ?? null, body.icon ?? null, body.sortOrder],
    );
    await audit({ actorId: req.user.id, actorRole: "ADMIN", action: "CATEGORY_CREATED", entityType: "categories", entityId: r.insertId, newValues: body, req });
    res.status(201).json({ id: r.insertId });
  }),
);

adminRouter.patch(
  "/categories/:id",
  asyncHandler(async (req, res) => {
    const body = parse(z.object({ name: z.string().min(2).max(120).optional(), description: z.string().max(1000).optional(), sortOrder: z.coerce.number().int().optional(), isActive: z.boolean().optional() }), req.body);
    const map = { name: "name", description: "description", sortOrder: "sort_order", isActive: "is_active" };
    const sets = [], params = [];
    for (const [k, v] of Object.entries(body)) if (v !== undefined) { sets.push(`${map[k]} = ?`); params.push(typeof v === "boolean" ? (v ? 1 : 0) : v); }
    if (!sets.length) throw badRequest("Nothing to update");
    params.push(req.params.id);
    await pool.execute(`UPDATE categories SET ${sets.join(", ")} WHERE id = ?`, params);
    res.json({ ok: true });
  }),
);

adminRouter.delete(
  "/categories/:id",
  asyncHandler(async (req, res) => {
    const [{ count }] = await query(`SELECT COUNT(*) AS count FROM products WHERE category_id = ? AND deleted_at IS NULL`, [req.params.id]);
    if (count > 0) throw badRequest(`Category still has ${count} products`);
    await pool.execute(`UPDATE categories SET is_active = 0 WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  }),
);

/* --------------------------------- Orders ---------------------------------- */

adminRouter.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const { page, pageSize, offset } = paginate(req.query);
    const status = req.query.status ? String(req.query.status) : null;
    const where = status ? `WHERE o.order_status = ?` : ``;
    const params = status ? [status] : [];
    const rows = await query(
      `SELECT o.*, (SELECT COUNT(*) FROM order_items i WHERE i.order_id=o.id) AS item_count
         FROM orders o ${where} ORDER BY o.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );
    await attachOrderItems(rows);
    if (rows.length) {
      const history = await query(
        `SELECT order_id, status, note, created_at FROM order_status_history
          WHERE order_id IN (${rows.map(() => "?").join(",")}) ORDER BY id`,
        rows.map((r) => r.id),
      );
      for (const o of rows) o.history = history.filter((h) => Number(h.order_id) === Number(o.id));
    }
    const [{ total }] = await query(`SELECT COUNT(*) AS total FROM orders o ${where}`, params);
    res.json({ data: rows, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  }),
);

adminRouter.patch(
  "/orders/:orderNumber/status",
  asyncHandler(async (req, res) => {
    const body = parse(
      z.object({
        status: z.enum(["PLACED", "PAYMENT_CONFIRMED", "SELLER_CONFIRMED", "ADMIN_APPROVED", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED", "ON_HOLD"]),
        trackingNumber: z.string().max(80).optional(),
        courierName: z.string().max(120).optional(),
        note: z.string().max(255).optional(),
      }),
      req.body,
    );
    await transaction(async (conn) => {
      const [rows] = await conn.execute(`SELECT * FROM orders WHERE order_number = ? FOR UPDATE`, [req.params.orderNumber]);
      const order = rows[0];
      if (!order) throw notFound("Order not found");
      // Admin gives the FINAL approval only after the seller confirmed the lines.
      if (body.status === "ADMIN_APPROVED") {
        const [[lines]] = await conn.query(
          `SELECT COUNT(*) AS total,
                  SUM(item_status IN ('CONFIRMED','SHIPPED','DELIVERED')) AS confirmed,
                  SUM(item_status IN ('CANCELLED','UNAVAILABLE')) AS dropped
             FROM order_items WHERE order_id = ?`,
          [order.id],
        );
        if (Number(lines.confirmed) + Number(lines.dropped) < Number(lines.total)) {
          throw badRequest("Sellers have not confirmed every line of this order yet");
        }
        const [[pay]] = await conn.query(
          `SELECT SUM(provider='COD') AS cod FROM payment_transactions WHERE order_id = ?`,
          [order.id],
        );
        if (order.payment_status !== "PAID" && !Number(pay?.cod ?? 0)) {
          throw badRequest("Verify the payment before approving this order");
        }
      }
      await conn.execute(
        `UPDATE orders SET order_status=?, tracking_number=COALESCE(?,tracking_number), courier_name=COALESCE(?,courier_name),
            delivered_at = IF(?='DELIVERED', NOW(), delivered_at) WHERE id = ?`,
        [body.status, body.trackingNumber ?? null, body.courierName ?? null, body.status, order.id],
      );
      await conn.execute(`INSERT INTO order_status_history (order_id,status,note,changed_by) VALUES (?,?,?,?)`, [
        order.id, body.status, body.note ?? "Updated by admin", req.user.id,
      ]);
      if (body.status === "DELIVERED" || body.status === "COMPLETED") await generateSettlementsForOrder(conn, order.id);
      if (body.status === "CANCELLED") {
        const [items] = await conn.execute(`SELECT listing_id, quantity FROM order_items WHERE order_id = ?`, [order.id]);
        for (const it of items) if (it.listing_id) await conn.execute(`UPDATE seller_listings SET stock_quantity = stock_quantity + ? WHERE id = ?`, [it.quantity, it.listing_id]);
        await conn.execute(`UPDATE commission_records SET status='REVERSED' WHERE order_id = ?`, [order.id]);
      }
      await notify({ userId: order.user_id, audience: "USER", type: "ORDER_STATUS", title: `Order ${order.order_number} ${body.status.toLowerCase()}`, message: body.note ?? "", linkUrl: "/orders" }, conn);
      await audit({ actorId: req.user.id, actorRole: "ADMIN", action: "ORDER_STATUS_CHANGED", entityType: "orders", entityId: order.id, oldValues: { status: order.order_status }, newValues: body, req }, conn);
    });
    res.json({ ok: true });
  }),
);

/* --------------------------- Payments & refunds ---------------------------- */

adminRouter.get(
  "/payments",
  asyncHandler(async (_req, res) => {
    res.json({
      data: await query(
        `SELECT pt.*, o.order_number, o.buyer_name FROM payment_transactions pt JOIN orders o ON o.id=pt.order_id
          ORDER BY pt.created_at DESC LIMIT 200`,
      ),
    });
  }),
);

// Manual verification for BANK_TRANSFER / COD only — gateway payments are
// verified server-side against the provider and cannot be forced here.
adminRouter.patch(
  "/payments/:id/verify",
  asyncHandler(async (req, res) => {
    const txn = await one(`SELECT * FROM payment_transactions WHERE id = ?`, [req.params.id]);
    if (!txn) throw notFound("Transaction not found");
    if (!["BANK_TRANSFER", "COD"].includes(txn.provider)) throw badRequest("Gateway payments are verified automatically against the provider");
    await transaction(async (conn) => {
      await conn.execute(`UPDATE payment_transactions SET status='SUCCESS', completed_at=NOW(), verified_server_side=1 WHERE id = ?`, [txn.id]);
      await conn.execute(`UPDATE orders SET payment_status='PAID', order_status=IF(order_status='PLACED','PAYMENT_CONFIRMED',order_status) WHERE id = ?`, [txn.order_id]);
      await conn.execute(`INSERT INTO order_status_history (order_id,status,note,changed_by) VALUES (?,?,?,?)`, [txn.order_id, "PAYMENT_CONFIRMED", `${txn.provider} verified by admin`, req.user.id]);
      await audit({ actorId: req.user.id, actorRole: "ADMIN", action: "PAYMENT_MANUALLY_VERIFIED", entityType: "payment_transactions", entityId: txn.id, req }, conn);
    });
    res.json({ ok: true });
  }),
);

adminRouter.get(
  "/refunds",
  asyncHandler(async (_req, res) => {
    res.json({ data: await query(`SELECT r.*, o.order_number FROM refunds r JOIN orders o ON o.id=r.order_id ORDER BY r.created_at DESC`) });
  }),
);

adminRouter.patch(
  "/refunds/:id",
  asyncHandler(async (req, res) => {
    const body = parse(z.object({ status: z.enum(["APPROVED", "REJECTED", "PROCESSED"]) }), req.body);
    const refund = await one(`SELECT * FROM refunds WHERE id = ?`, [req.params.id]);
    if (!refund) throw notFound("Refund not found");
    await transaction(async (conn) => {
      await conn.execute(`UPDATE refunds SET status=?, processed_by=?, processed_at=IF(?='PROCESSED',NOW(),processed_at) WHERE id=?`, [
        body.status, req.user.id, body.status, refund.id,
      ]);
      if (body.status === "PROCESSED") {
        await conn.execute(`UPDATE orders SET payment_status='REFUNDED' WHERE id = ?`, [refund.order_id]);
        await generateSettlementsForOrder(conn, refund.order_id);
      }
      await audit({ actorId: req.user.id, actorRole: "ADMIN", action: "REFUND_REVIEWED", entityType: "refunds", entityId: refund.id, newValues: body, req }, conn);
    });
    res.json({ ok: true });
  }),
);

/* ------------------------------ Settlements -------------------------------- */

adminRouter.get(
  "/settlements",
  asyncHandler(async (req, res) => {
    const status = req.query.status ? String(req.query.status) : null;
    res.json({
      data: await query(
        `SELECT st.*, s.business_name, s.bank_name, s.bank_account_number, o.order_number
           FROM settlements st JOIN sellers s ON s.id=st.seller_id JOIN orders o ON o.id=st.order_id
          ${status ? "WHERE st.status = ?" : ""} ORDER BY st.created_at DESC`,
        status ? [status] : [],
      ),
    });
  }),
);

adminRouter.patch(
  "/settlements/:id",
  asyncHandler(async (req, res) => {
    const body = parse(z.object({ status: z.enum(["PENDING", "PROCESSING", "PAID", "ON_HOLD"]), payoutReference: z.string().max(120).optional() }), req.body);
    const settlement = await one(`SELECT st.*, s.user_id FROM settlements st JOIN sellers s ON s.id=st.seller_id WHERE st.id = ?`, [req.params.id]);
    if (!settlement) throw notFound("Settlement not found");
    await pool.execute(`UPDATE settlements SET status=?, payout_reference=?, paid_at=IF(?='PAID',NOW(),paid_at) WHERE id=?`, [
      body.status, body.payoutReference ?? null, body.status, settlement.id,
    ]);
    if (body.status === "PAID") {
      await notify({ userId: settlement.user_id, audience: "SELLER", type: "SETTLEMENT_PAID", title: "Payout released", message: `NPR ${settlement.net_amount} has been settled.`, linkUrl: "/seller/revenue" });
    }
    await audit({ actorId: req.user.id, actorRole: "ADMIN", action: "SETTLEMENT_UPDATED", entityType: "settlements", entityId: settlement.id, newValues: body, req });
    res.json({ ok: true });
  }),
);

/* --------------------------- Commission settings --------------------------- */

adminRouter.get(
  "/commission-settings",
  asyncHandler(async (_req, res) => {
    res.json({
      data: await query(
        `SELECT cs.*, s.business_name, c.name AS category_name
           FROM commission_settings cs
           LEFT JOIN sellers s ON cs.scope_type='SELLER' AND s.id=cs.scope_id
           LEFT JOIN categories c ON cs.scope_type='CATEGORY' AND c.id=cs.scope_id
          ORDER BY cs.scope_type, cs.effective_from DESC`,
      ),
    });
  }),
);

adminRouter.post(
  "/commission-settings",
  asyncHandler(async (req, res) => {
    const body = parse(
      z.object({
        scopeType: z.enum(["GLOBAL", "CATEGORY", "SELLER"]),
        scopeId: z.coerce.number().int().positive().nullable().optional(),
        rate: z.coerce.number().min(0).max(50),
        effectiveFrom: z.string().datetime().optional(),
      }),
      req.body,
    );
    if (body.scopeType !== "GLOBAL" && !body.scopeId) throw badRequest("scopeId is required for CATEGORY and SELLER scopes");
    const id = await transaction(async (conn) => {
      // Close the currently effective row for this scope; snapshots already
      // taken on existing orders are untouched.
      await conn.execute(
        `UPDATE commission_settings SET effective_to = NOW()
          WHERE scope_type = ? AND (scope_id <=> ?) AND effective_to IS NULL`,
        [body.scopeType, body.scopeType === "GLOBAL" ? null : body.scopeId],
      );
      const [r] = await conn.execute(
        `INSERT INTO commission_settings (scope_type, scope_id, rate, effective_from, created_by)
         VALUES (?,?,?,COALESCE(?,NOW()),?)`,
        [body.scopeType, body.scopeType === "GLOBAL" ? null : body.scopeId, body.rate,
         body.effectiveFrom ? new Date(body.effectiveFrom) : null, req.user.id],
      );
      await audit({ actorId: req.user.id, actorRole: "ADMIN", action: "COMMISSION_SETTING_CREATED", entityType: "commission_settings", entityId: r.insertId, newValues: body, req }, conn);
      return r.insertId;
    });
    res.status(201).json({ id });
  }),
);

adminRouter.get(
  "/commission-records",
  asyncHandler(async (req, res) => {
    const { page, pageSize, offset } = paginate(req.query);
    res.json({
      data: await query(
        `SELECT cr.*, o.order_number, s.business_name, oi.product_name_snapshot
           FROM commission_records cr JOIN orders o ON o.id=cr.order_id
           JOIN sellers s ON s.id=cr.seller_id LEFT JOIN order_items oi ON oi.id=cr.order_item_id
          ORDER BY cr.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
      ),
      page,
      pageSize,
    });
  }),
);

/* -------------------------------- Audit logs ------------------------------- */

adminRouter.get(
  "/audit-logs",
  asyncHandler(async (req, res) => {
    const { page, pageSize, offset } = paginate(req.query);
    const filters = [], params = [];
    if (req.query.entityType) { filters.push("entity_type = ?"); params.push(String(req.query.entityType)); }
    if (req.query.action) { filters.push("action = ?"); params.push(String(req.query.action)); }
    if (req.query.actorId) { filters.push("actor_id = ?"); params.push(Number(req.query.actorId)); }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const rows = await query(
      `SELECT a.*, u.email AS actor_email FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id
       ${where} ORDER BY a.created_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );
    const [{ total }] = await query(`SELECT COUNT(*) AS total FROM audit_logs a ${where}`, params);
    res.json({ data: rows, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  }),
);

/* ---------------------------------- Users ---------------------------------- */

adminRouter.get(
  "/users",
  asyncHandler(async (req, res) => {
    const { page, pageSize, offset } = paginate(req.query);
    const rows = await query(
      `SELECT id, uuid, role, first_name, last_name, email, phone, status, created_at
         FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`,
    );
    res.json({ data: rows, page, pageSize });
  }),
);

adminRouter.patch(
  "/users/:id/status",
  asyncHandler(async (req, res) => {
    const body = parse(z.object({ status: z.enum(["ACTIVE", "SUSPENDED", "INACTIVE"]) }), req.body);
    if (Number(req.params.id) === req.user.id) throw badRequest("You cannot change your own status");
    await pool.execute(`UPDATE users SET status = ? WHERE id = ?`, [body.status, req.params.id]);
    await audit({ actorId: req.user.id, actorRole: "ADMIN", action: "USER_STATUS_CHANGED", entityType: "users", entityId: Number(req.params.id), newValues: body, req });
    res.json({ ok: true });
  }),
);

/* ------------------------------ Support desk ------------------------------- */

adminRouter.get(
  "/support-tickets",
  asyncHandler(async (req, res) => {
    const status = req.query.status ? String(req.query.status) : null;
    res.json({
      data: await query(
        `SELECT * FROM support_tickets ${status ? "WHERE status = ?" : ""} ORDER BY created_at DESC LIMIT 200`,
        status ? [status] : [],
      ),
    });
  }),
);

// Reply to / close a support request. A reply is emailed to the sender.
adminRouter.patch(
  "/support-tickets/:id",
  asyncHandler(async (req, res) => {
    const body = parse(
      z.object({
        status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
        reply: z.string().trim().min(2).max(4000).optional(),
      }),
      req.body,
    );
    const ticket = await one(`SELECT * FROM support_tickets WHERE id = ?`, [req.params.id]);
    if (!ticket) throw notFound("Ticket not found");
    if (!body.status && !body.reply) throw badRequest("Nothing to update");

    let emailSent = false;
    if (body.reply) {
      const mail = await sendSupportReplyEmail(ticket, body.reply);
      emailSent = mail.sent;
      await pool.execute(`UPDATE support_tickets SET admin_reply=?, replied_by=?, replied_at=NOW() WHERE id=?`, [
        body.reply, req.user.id, ticket.id,
      ]);
      if (ticket.user_id) {
        await notify({
          userId: ticket.user_id, audience: ticket.role === "SELLER" ? "SELLER" : "BUYER", type: "SUPPORT_REPLY",
          title: `Support reply — ${ticket.ticket_number}`, message: body.reply.slice(0, 190), linkUrl: "/support",
        });
      }
    }
    const status = body.status ?? (body.reply ? "IN_PROGRESS" : ticket.status);
    await pool.execute(`UPDATE support_tickets SET status = ? WHERE id = ?`, [status, ticket.id]);
    await audit({ actorId: req.user.id, actorRole: "ADMIN", action: "SUPPORT_TICKET_UPDATED", entityType: "support_tickets", entityId: ticket.id, newValues: { status, replied: Boolean(body.reply) }, req });
    res.json({ ok: true, emailSent });
  }),
);
