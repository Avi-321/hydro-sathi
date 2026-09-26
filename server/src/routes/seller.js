import { Router } from "express";
import { z } from "zod";
import { one, pool, query, transaction } from "../db.js";
import { attachOrderItems } from "../lib/hydrate.js";
import { documentUpload, fileUrl, imageUpload } from "../lib/uploads.js";
import { audit, notify } from "../lib/audit.js";
import { asyncHandler, badRequest, conflict, forbidden, notFound, parse } from "../lib/http.js";
import { generateSettlementsForOrder } from "../lib/settlements.js";
import { attachSeller, requireApprovedSeller, requireAuth, requireRole } from "../middleware/auth.js";

export const sellerRouter = Router();
sellerRouter.use(requireAuth);

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 170);

/* --------------------------- Seller registration -------------------------- */

// POST /seller/register — any authenticated user applies; status starts PENDING.
sellerRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = parse(
      z.object({
        businessName: z.string().min(2).max(160),
        registrationNumber: z.string().min(2).max(60),
        panNumber: z.string().min(2).max(30),
        contactPerson: z.string().min(2).max(120),
        contactPhone: z.string().min(7).max(20),
        contactEmail: z.string().email().max(190),
        province: z.string().max(60),
        district: z.string().max(60),
        city: z.string().max(80),
        addressLine: z.string().max(190),
        description: z.string().max(2000).optional(),
        bankName: z.string().max(120).optional(),
        bankAccountName: z.string().max(120).optional(),
        bankAccountNumber: z.string().max(40).optional(),
        bankBranch: z.string().max(120).optional(),
      }),
      req.body,
    );
    const existing = await one(`SELECT id FROM sellers WHERE user_id = ?`, [req.user.id]);
    if (existing) throw conflict("A seller profile already exists for this account");

    const sellerId = await transaction(async (conn) => {
      const [r] = await conn.execute(
        `INSERT INTO sellers (user_id,business_name,slug,registration_number,pan_number,contact_person,contact_phone,
            contact_email,province,district,city,address_line,description,bank_name,bank_account_name,bank_account_number,bank_branch)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [req.user.id, body.businessName, `${slugify(body.businessName)}-${Date.now().toString(36)}`, body.registrationNumber,
         body.panNumber, body.contactPerson, body.contactPhone, body.contactEmail, body.province, body.district,
         body.city, body.addressLine, body.description ?? null, body.bankName ?? null, body.bankAccountName ?? null,
         body.bankAccountNumber ?? null, body.bankBranch ?? null],
      );
      await conn.execute(`UPDATE users SET role = 'SELLER' WHERE id = ? AND role = 'BUYER'`, [req.user.id]);
      await notify({ audience: "ADMIN", type: "SELLER_APPLICATION", title: "New seller application", message: body.businessName, linkUrl: "/admin/sellers" }, conn);
      await audit({ actorId: req.user.id, actorRole: "SELLER", action: "SELLER_REGISTERED", entityType: "sellers", entityId: r.insertId, req }, conn);
      return r.insertId;
    });

    res.status(201).json({ id: sellerId, approvalStatus: "PENDING" });
  }),
);

// POST /seller/documents — multipart verification documents
sellerRouter.post(
  "/documents",
  attachSeller,
  documentUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.seller) throw forbidden("Register as a seller first");
    if (!req.file) throw badRequest("A file is required (field name: file)");
    const documentType = String(req.body.documentType ?? "OTHER").toUpperCase();
    const allowed = ["BUSINESS_REGISTRATION", "PAN", "VAT", "IDENTITY", "BANK_DOCUMENT", "OTHER"];
    if (!allowed.includes(documentType)) throw badRequest(`documentType must be one of ${allowed.join(", ")}`);

    const url = fileUrl(req.file);
    const [r] = await pool.execute(
      `INSERT INTO seller_documents (seller_id,document_type,file_url,file_name,mime_type,file_size) VALUES (?,?,?,?,?,?)`,
      [req.seller.id, documentType, url, req.file.originalname.slice(0, 190), req.file.mimetype, req.file.size],
    );
    res.status(201).json({ id: r.insertId, fileUrl: url, status: "PENDING" });
  }),
);

sellerRouter.get(
  "/profile",
  attachSeller,
  asyncHandler(async (req, res) => {
    if (!req.seller) throw notFound("No seller profile");
    const documents = await query(`SELECT * FROM seller_documents WHERE seller_id = ? ORDER BY created_at DESC`, [req.seller.id]);
    res.json({ seller: req.seller, documents });
  }),
);

sellerRouter.patch(
  "/profile",
  attachSeller,
  asyncHandler(async (req, res) => {
    if (!req.seller) throw notFound("No seller profile");
    const body = parse(
      z.object({
        description: z.string().max(2000).optional(),
        contactPerson: z.string().max(120).optional(),
        contactPhone: z.string().max(20).optional(),
        contactEmail: z.string().email().max(190).optional(),
        addressLine: z.string().max(190).optional(),
        bankName: z.string().max(120).optional(),
        bankAccountName: z.string().max(120).optional(),
        bankAccountNumber: z.string().max(40).optional(),
        bankBranch: z.string().max(120).optional(),
      }),
      req.body,
    );
    const map = { description: "description", contactPerson: "contact_person", contactPhone: "contact_phone", contactEmail: "contact_email", addressLine: "address_line", bankName: "bank_name", bankAccountName: "bank_account_name", bankAccountNumber: "bank_account_number", bankBranch: "bank_branch" };
    const sets = [], params = [];
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined) { sets.push(`${map[k]} = ?`); params.push(v); }
    }
    if (!sets.length) throw badRequest("Nothing to update");
    params.push(req.seller.id);
    await pool.execute(`UPDATE sellers SET ${sets.join(", ")} WHERE id = ?`, params);
    await audit({ actorId: req.user.id, actorRole: "SELLER", action: "SELLER_PROFILE_UPDATED", entityType: "sellers", entityId: req.seller.id, newValues: body, req });
    res.json({ ok: true });
  }),
);

/* ------------------------------- Inventory -------------------------------- */

sellerRouter.get(
  "/listings",
  requireApprovedSeller,
  asyncHandler(async (req, res) => {
    res.json({
      data: await query(
        `SELECT sl.*, p.name AS product_name, p.slug AS product_slug, p.part_number, p.oem_number,
                (SELECT image_url FROM product_images pi WHERE pi.product_id=p.id ORDER BY pi.is_primary DESC LIMIT 1) AS image_url
           FROM seller_listings sl JOIN products p ON p.id = sl.product_id
          WHERE sl.seller_id = ? AND sl.deleted_at IS NULL ORDER BY sl.updated_at DESC`,
        [req.seller.id],
      ),
    });
  }),
);

const listingSchema = z.object({
  productId: z.coerce.number().int().positive(),
  sku: z.string().max(80).optional(),
  price: z.coerce.number().positive(),
  mrp: z.coerce.number().positive().optional(),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  minOrderQty: z.coerce.number().int().positive().default(1),
  leadTimeDays: z.coerce.number().int().min(0).default(3),
  warrantyMonths: z.coerce.number().int().min(0).default(0),
  conditionType: z.enum(["NEW", "REFURBISHED"]).default("NEW"),
  isGenuine: z.boolean().default(true),
});

// POST /seller/listings → PENDING_REVIEW until an admin approves
sellerRouter.post(
  "/listings",
  requireApprovedSeller,
  asyncHandler(async (req, res) => {
    const body = parse(listingSchema, req.body);
    const product = await one(`SELECT id FROM products WHERE id = ? AND deleted_at IS NULL`, [body.productId]);
    if (!product) throw notFound("Master product not found");
    try {
      const [r] = await pool.execute(
        `INSERT INTO seller_listings (seller_id,product_id,sku,price,mrp,stock_quantity,min_order_qty,lead_time_days,warranty_months,condition_type,is_genuine)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [req.seller.id, body.productId, body.sku ?? null, body.price, body.mrp ?? null, body.stockQuantity,
         body.minOrderQty, body.leadTimeDays, body.warrantyMonths, body.conditionType, body.isGenuine ? 1 : 0],
      );
      await notify({ audience: "ADMIN", type: "LISTING_SUBMITTED", title: "Listing awaiting review", message: `${req.seller.business_name} submitted a new listing.`, linkUrl: "/admin/products" });
      await audit({ actorId: req.user.id, actorRole: "SELLER", action: "LISTING_CREATED", entityType: "seller_listings", entityId: r.insertId, newValues: body, req });
      res.status(201).json({ id: r.insertId, approvalStatus: "PENDING_REVIEW" });
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") throw conflict("You already have a listing for this product");
      throw err;
    }
  }),
);

sellerRouter.patch(
  "/listings/:id",
  requireApprovedSeller,
  asyncHandler(async (req, res) => {
    const body = parse(listingSchema.partial().omit({ productId: true }), req.body);
    const listing = await one(`SELECT * FROM seller_listings WHERE id = ? AND seller_id = ?`, [req.params.id, req.seller.id]);
    if (!listing) throw notFound("Listing not found");
    const map = { sku: "sku", price: "price", mrp: "mrp", stockQuantity: "stock_quantity", minOrderQty: "min_order_qty", leadTimeDays: "lead_time_days", warrantyMonths: "warranty_months", conditionType: "condition_type", isGenuine: "is_genuine" };
    const sets = [], params = [];
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined) { sets.push(`${map[k]} = ?`); params.push(typeof v === "boolean" ? (v ? 1 : 0) : v); }
    }
    if (!sets.length) throw badRequest("Nothing to update");
    // Price changes require re-approval.
    if (body.price !== undefined && Number(body.price) !== Number(listing.price)) sets.push(`approval_status = 'PENDING_REVIEW'`);
    params.push(req.params.id);
    await pool.execute(`UPDATE seller_listings SET ${sets.join(", ")} WHERE id = ?`, params);
    await audit({ actorId: req.user.id, actorRole: "SELLER", action: "LISTING_UPDATED", entityType: "seller_listings", entityId: Number(req.params.id), oldValues: listing, newValues: body, req });
    res.json({ ok: true });
  }),
);

sellerRouter.delete(
  "/listings/:id",
  requireApprovedSeller,
  asyncHandler(async (req, res) => {
    await pool.execute(`UPDATE seller_listings SET deleted_at = NOW(), is_active = 0 WHERE id = ? AND seller_id = ?`, [req.params.id, req.seller.id]);
    res.json({ ok: true });
  }),
);

/* --------------------- Seller-submitted master products -------------------- */

/**
 * POST /seller/products (multipart)
 * The shop creates the product itself. It is stored as PENDING_REVIEW together
 * with the seller's own listing — buyers only see it after an admin approves.
 * Images are real uploaded files (field name: images).
 */
sellerRouter.post(
  "/products",
  requireApprovedSeller,
  imageUpload.array("images", 6),
  asyncHandler(async (req, res) => {
    const body = parse(
      z.object({
        name: z.string().trim().min(3).max(190),
        partNumber: z.string().trim().min(1).max(80),
        oemNumber: z.string().trim().max(80).optional(),
        categoryId: z.coerce.number().int().positive(),
        manufacturer: z.string().trim().max(120).optional(),
        shortDescription: z.string().trim().max(500).optional(),
        description: z.string().trim().max(5000).optional(),
        specifications: z.string().max(2000).optional(),
        compatibility: z.string().max(2000).optional(),
        price: z.coerce.number().positive(),
        mrp: z.coerce.number().positive().optional(),
        stockQuantity: z.coerce.number().int().min(0).default(0),
        minOrderQty: z.coerce.number().int().positive().default(1),
        leadTimeDays: z.coerce.number().int().min(0).default(3),
        warrantyMonths: z.coerce.number().int().min(0).default(0),
        conditionType: z.enum(["NEW", "REFURBISHED"]).default("NEW"),
      }),
      req.body,
    );

    if (await one(`SELECT id FROM products WHERE part_number = ? AND deleted_at IS NULL`, [body.partNumber])) {
      throw conflict("A master product with that part number already exists — create a listing against it instead");
    }

    // "key: value" per line → object;  one machine type per line → array
    const specs = {};
    for (const line of (body.specifications ?? "").split("\n")) {
      const [k, ...rest] = line.split(":");
      if (k?.trim() && rest.length) specs[k.trim()] = rest.join(":").trim();
    }
    const compat = (body.compatibility ?? "").split("\n").map((s) => s.trim()).filter(Boolean);

    const result = await transaction(async (conn) => {
      const [p] = await conn.execute(
        `INSERT INTO products (name,slug,part_number,oem_number,category_id,manufacturer,short_description,description,
            specifications,compatibility,status,created_by,created_by_seller_id)
         VALUES (?,?,?,?,?,?,?,?,?,?, 'PENDING_REVIEW', ?, ?)`,
        [body.name, `${slugify(body.name)}-${Date.now().toString(36)}`, body.partNumber, body.oemNumber ?? null,
         body.categoryId, body.manufacturer ?? null, body.shortDescription ?? null, body.description ?? null,
         Object.keys(specs).length ? JSON.stringify(specs) : null, compat.length ? JSON.stringify(compat) : null,
         req.user.id, req.seller.id],
      );
      for (const [i, file] of (req.files ?? []).entries()) {
        await conn.execute(
          `INSERT INTO product_images (product_id,image_url,alt_text,is_primary,sort_order) VALUES (?,?,?,?,?)`,
          [p.insertId, fileUrl(file), body.name, i === 0 ? 1 : 0, i],
        );
      }
      const [l] = await conn.execute(
        `INSERT INTO seller_listings (seller_id,product_id,price,mrp,stock_quantity,min_order_qty,lead_time_days,
            warranty_months,condition_type,approval_status,is_active)
         VALUES (?,?,?,?,?,?,?,?,?, 'PENDING_REVIEW', 0)`,
        [req.seller.id, p.insertId, body.price, body.mrp ?? null, body.stockQuantity, body.minOrderQty,
         body.leadTimeDays, body.warrantyMonths, body.conditionType],
      );
      await notify({ audience: "ADMIN", type: "PRODUCT_SUBMITTED", title: "Product awaiting approval",
        message: `${req.seller.business_name} submitted “${body.name}”.`, linkUrl: "/admin/products" }, conn);
      await audit({ actorId: req.user.id, actorRole: "SELLER", action: "PRODUCT_SUBMITTED", entityType: "products", entityId: p.insertId, newValues: { name: body.name }, req }, conn);
      return { productId: p.insertId, listingId: l.insertId };
    });

    res.status(201).json({ ...result, status: "PENDING_REVIEW" });
  }),
);

// GET /seller/products — master products this shop submitted, with review state
sellerRouter.get(
  "/products",
  requireApprovedSeller,
  asyncHandler(async (req, res) => {
    res.json({
      data: await query(
        `SELECT p.*, c.name AS category_name,
                (SELECT image_url FROM product_images pi WHERE pi.product_id=p.id ORDER BY pi.is_primary DESC, pi.sort_order LIMIT 1) AS image_url,
                sl.id AS listing_id, sl.price, sl.mrp, sl.stock_quantity, sl.min_order_qty, sl.lead_time_days,
                sl.warranty_months, sl.condition_type, sl.approval_status AS listing_status
           FROM products p
           LEFT JOIN categories c ON c.id = p.category_id
           LEFT JOIN seller_listings sl ON sl.product_id = p.id AND sl.seller_id = ?
          WHERE p.created_by_seller_id = ? AND p.deleted_at IS NULL
          ORDER BY p.created_at DESC`,
        [req.seller.id, req.seller.id],
      ),
    });
  }),
);

const parseSpecs = (text) => {
  const specs = {};
  for (const line of (text ?? "").split("\n")) {
    const [k, ...rest] = line.split(":");
    if (k?.trim() && rest.length) specs[k.trim()] = rest.join(":").trim();
  }
  return specs;
};
const parseList = (text) => (text ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
const blankToUndef = (v) => (v === "" ? undefined : v);

/**
 * PATCH /seller/products/:id (multipart, images optional)
 * A shop edits a product it submitted. Any change sends the product and the
 * shop's listing back to PENDING_REVIEW so the admin re-approves it.
 */
sellerRouter.patch(
  "/products/:id",
  requireApprovedSeller,
  imageUpload.array("images", 6),
  asyncHandler(async (req, res) => {
    const product = await one(
      `SELECT * FROM products WHERE id = ? AND created_by_seller_id = ? AND deleted_at IS NULL`,
      [req.params.id, req.seller.id],
    );
    if (!product) throw notFound("Product not found or not owned by your shop");
    const opt = (schema) => z.preprocess(blankToUndef, schema.optional());
    const body = parse(
      z.object({
        name: opt(z.string().trim().min(3).max(190)),
        partNumber: opt(z.string().trim().min(1).max(80)),
        oemNumber: z.string().trim().max(80).optional(),
        categoryId: opt(z.coerce.number().int().positive()),
        manufacturer: z.string().trim().max(120).optional(),
        shortDescription: z.string().trim().max(500).optional(),
        description: z.string().trim().max(5000).optional(),
        specifications: z.string().max(2000).optional(),
        compatibility: z.string().max(2000).optional(),
        price: opt(z.coerce.number().positive()),
        mrp: opt(z.coerce.number().positive()),
        stockQuantity: opt(z.coerce.number().int().min(0)),
        minOrderQty: opt(z.coerce.number().int().positive()),
        leadTimeDays: opt(z.coerce.number().int().min(0)),
        warrantyMonths: opt(z.coerce.number().int().min(0)),
        conditionType: opt(z.enum(["NEW", "REFURBISHED"])),
      }),
      req.body,
    );
    if (body.partNumber && body.partNumber !== product.part_number) {
      if (await one(`SELECT id FROM products WHERE part_number = ? AND id <> ? AND deleted_at IS NULL`, [body.partNumber, product.id])) {
        throw conflict("Another product already uses that part number");
      }
    }

    const pMap = { name: "name", partNumber: "part_number", oemNumber: "oem_number", categoryId: "category_id", manufacturer: "manufacturer", shortDescription: "short_description", description: "description" };
    const lMap = { price: "price", mrp: "mrp", stockQuantity: "stock_quantity", minOrderQty: "min_order_qty", leadTimeDays: "lead_time_days", warrantyMonths: "warranty_months", conditionType: "condition_type" };
    const pSets = [], pParams = [], lSets = [], lParams = [];
    for (const [k, v] of Object.entries(body)) {
      if (v === undefined) continue;
      if (k in pMap) { pSets.push(`${pMap[k]} = ?`); pParams.push(v === "" ? null : v); }
      if (k in lMap) { lSets.push(`${lMap[k]} = ?`); lParams.push(v); }
    }
    if (body.specifications !== undefined) {
      const sp = parseSpecs(body.specifications);
      pSets.push("specifications = ?"); pParams.push(Object.keys(sp).length ? JSON.stringify(sp) : null);
    }
    if (body.compatibility !== undefined) {
      const cp = parseList(body.compatibility);
      pSets.push("compatibility = ?"); pParams.push(cp.length ? JSON.stringify(cp) : null);
    }
    if (!pSets.length && !lSets.length && !req.files?.length) throw badRequest("Nothing to update");

    await transaction(async (conn) => {
      pSets.push(`status = 'PENDING_REVIEW'`, `rejection_reason = NULL`, `approved_by = NULL`, `approved_at = NULL`);
      await conn.execute(`UPDATE products SET ${pSets.join(", ")} WHERE id = ?`, [...pParams, product.id]);
      lSets.push(`approval_status = 'PENDING_REVIEW'`, `rejection_reason = NULL`, `is_active = 0`);
      await conn.execute(
        `UPDATE seller_listings SET ${lSets.join(", ")} WHERE product_id = ? AND seller_id = ? AND deleted_at IS NULL`,
        [...lParams, product.id, req.seller.id],
      );
      const [[{ existing }]] = await conn.query(`SELECT COUNT(*) AS existing FROM product_images WHERE product_id = ?`, [product.id]);
      for (const [i, file] of (req.files ?? []).entries()) {
        await conn.execute(
          `INSERT INTO product_images (product_id,image_url,alt_text,is_primary,sort_order) VALUES (?,?,?,?,?)`,
          [product.id, fileUrl(file), body.name ?? product.name, Number(existing) === 0 && i === 0 ? 1 : 0, Number(existing) + i],
        );
      }
      await notify({ audience: "ADMIN", type: "PRODUCT_SUBMITTED", title: "Edited product awaiting approval",
        message: `${req.seller.business_name} edited “${body.name ?? product.name}”.`, linkUrl: "/admin/products" }, conn);
      await audit({ actorId: req.user.id, actorRole: "SELLER", action: "PRODUCT_UPDATED", entityType: "products", entityId: product.id, oldValues: product, newValues: body, req }, conn);
    });
    res.json({ ok: true, status: "PENDING_REVIEW" });
  }),
);

// DELETE /seller/products/:id — soft-deletes the shop's own product and listing.
sellerRouter.delete(
  "/products/:id",
  requireApprovedSeller,
  asyncHandler(async (req, res) => {
    const product = await one(
      `SELECT * FROM products WHERE id = ? AND created_by_seller_id = ? AND deleted_at IS NULL`,
      [req.params.id, req.seller.id],
    );
    if (!product) throw notFound("Product not found or not owned by your shop");
    await transaction(async (conn) => {
      await conn.execute(`UPDATE seller_listings SET deleted_at = NOW(), is_active = 0 WHERE product_id = ? AND seller_id = ?`, [product.id, req.seller.id]);
      // Only remove the master product when no other shop still sells it.
      const [[{ others }]] = await conn.query(
        `SELECT COUNT(*) AS others FROM seller_listings WHERE product_id = ? AND seller_id <> ? AND deleted_at IS NULL`,
        [product.id, req.seller.id],
      );
      if (Number(others) === 0) {
        await conn.execute(`UPDATE products SET status = 'ARCHIVED', deleted_at = NOW() WHERE id = ?`, [product.id]);
      }
      await audit({ actorId: req.user.id, actorRole: "SELLER", action: "PRODUCT_DELETED", entityType: "products", entityId: product.id, oldValues: product, req }, conn);
    });
    res.json({ ok: true });
  }),
);

/* ----------------------------- Order fulfilment --------------------------- */

sellerRouter.get(
  "/orders",
  requireApprovedSeller,
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT o.id, o.order_number, o.buyer_name, o.shipping_city, o.shipping_district, o.order_status,
              o.payment_status, o.created_at, o.tracking_number, o.courier_name,
              SUM(oi.subtotal) AS seller_gross, SUM(oi.seller_amount) AS seller_net
         FROM orders o JOIN order_items oi ON oi.order_id = o.id
        WHERE oi.seller_id = ?
        GROUP BY o.id, o.order_number, o.buyer_name, o.shipping_city, o.shipping_district, o.order_status,
                 o.payment_status, o.created_at, o.tracking_number, o.courier_name
        ORDER BY o.created_at DESC`,
      [req.seller.id],
    );
    await attachOrderItems(rows, req.seller.id);
    res.json({ data: rows });
  }),
);

// PATCH /seller/order-items/:id — confirm availability / mark shipped / unavailable
sellerRouter.patch(
  "/order-items/:id",
  requireApprovedSeller,
  asyncHandler(async (req, res) => {
    const { status } = parse(z.object({ status: z.enum(["CONFIRMED", "UNAVAILABLE", "SHIPPED", "DELIVERED"]) }), req.body);
    await transaction(async (conn) => {
      const [rows] = await conn.execute(`SELECT * FROM order_items WHERE id = ? AND seller_id = ? FOR UPDATE`, [req.params.id, req.seller.id]);
      const item = rows[0];
      if (!item) throw notFound("Order item not found");

      await conn.execute(`UPDATE order_items SET item_status = ? WHERE id = ?`, [status, item.id]);

      if (status === "UNAVAILABLE") {
        if (item.listing_id) await conn.execute(`UPDATE seller_listings SET stock_quantity = stock_quantity + ? WHERE id = ?`, [item.quantity, item.listing_id]);
        await conn.execute(`UPDATE commission_records SET status='REVERSED' WHERE order_item_id = ?`, [item.id]);
      }

      // Roll the parent order forward when every line agrees.
      const [[agg]] = await conn.query(
        `SELECT COUNT(*) AS total,
                SUM(item_status IN ('CONFIRMED','SHIPPED','DELIVERED')) AS confirmed,
                SUM(item_status = 'SHIPPED') AS shipped,
                SUM(item_status = 'DELIVERED') AS delivered,
                SUM(item_status IN ('CANCELLED','UNAVAILABLE')) AS dropped
           FROM order_items WHERE order_id = ?`,
        [item.order_id],
      );
      let next = null;
      if (Number(agg.delivered) + Number(agg.dropped) === Number(agg.total)) next = "DELIVERED";
      else if (Number(agg.shipped) + Number(agg.delivered) + Number(agg.dropped) === Number(agg.total)) next = "SHIPPED";
      else if (Number(agg.confirmed) + Number(agg.dropped) === Number(agg.total)) next = "SELLER_CONFIRMED";

      if (next) {
        await conn.execute(`UPDATE orders SET order_status = ?, delivered_at = IF(? = 'DELIVERED', NOW(), delivered_at) WHERE id = ?`, [next, next, item.order_id]);
        await conn.execute(`INSERT INTO order_status_history (order_id,status,note,changed_by) VALUES (?,?,?,?)`, [item.order_id, next, `Seller ${req.seller.business_name}`, req.user.id]);
        if (next === "DELIVERED") await generateSettlementsForOrder(conn, item.order_id);
      }
      await audit({ actorId: req.user.id, actorRole: "SELLER", action: "ORDER_ITEM_STATUS_CHANGED", entityType: "order_items", entityId: item.id, oldValues: { status: item.item_status }, newValues: { status }, req }, conn);
    });
    res.json({ ok: true });
  }),
);

/* ----------------------------- Revenue reports ---------------------------- */

sellerRouter.get(
  "/settlements",
  requireApprovedSeller,
  asyncHandler(async (req, res) => {
    res.json({
      data: await query(
        `SELECT st.*, o.order_number FROM settlements st JOIN orders o ON o.id = st.order_id
          WHERE st.seller_id = ? ORDER BY st.created_at DESC`,
        [req.seller.id],
      ),
    });
  }),
);

sellerRouter.get(
  "/stats",
  requireApprovedSeller,
  asyncHandler(async (req, res) => {
    const [stats] = await query(
      `SELECT COUNT(DISTINCT oi.order_id) AS orders_count,
              COALESCE(SUM(oi.subtotal),0) AS gross_revenue,
              COALESCE(SUM(oi.commission_amount),0) AS commission_paid,
              COALESCE(SUM(oi.seller_amount),0) AS net_revenue,
              COALESCE(SUM(oi.item_status = 'PENDING'),0) AS pending_items
         FROM order_items oi WHERE oi.seller_id = ? AND oi.item_status NOT IN ('CANCELLED','UNAVAILABLE')`,
      [req.seller.id],
    );
    const [payouts] = await query(
      `SELECT COALESCE(SUM(net_amount),0) AS pending_payout FROM settlements WHERE seller_id = ? AND status <> 'PAID'`,
      [req.seller.id],
    );
    const monthly = await query(
      `SELECT DATE_FORMAT(o.created_at,'%Y-%m') AS month, SUM(oi.subtotal) AS gross, SUM(oi.seller_amount) AS net
         FROM order_items oi JOIN orders o ON o.id = oi.order_id
        WHERE oi.seller_id = ? GROUP BY month ORDER BY month DESC LIMIT 12`,
      [req.seller.id],
    );
    const [inventory] = await query(
      `SELECT COUNT(*) AS listings, COALESCE(SUM(stock_quantity = 0),0) AS out_of_stock,
              COALESCE(SUM(approval_status='PENDING_REVIEW'),0) AS pending_approval
         FROM seller_listings WHERE seller_id = ? AND deleted_at IS NULL`,
      [req.seller.id],
    );
    res.json({ ...stats, ...payouts, ...inventory, monthly });
  }),
);

sellerRouter.get(
  "/notifications",
  requireRole("SELLER", "ADMIN"),
  asyncHandler(async (req, res) => {
    res.json({ data: await query(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`, [req.user.id]) });
  }),
);
