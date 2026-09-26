import { Router } from "express";
import { one, query } from "../db.js";
import { asyncHandler, notFound, paginate } from "../lib/http.js";
import { attachProductRelations } from "../lib/hydrate.js";

export const catalogueRouter = Router();

/* ------------------------------ Taxonomy -------------------------------- */

// GET /categories — hierarchical tree
catalogueRouter.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const rows = await query(`SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order, name`);
    const byId = new Map(rows.map((c) => [c.id, { ...c, children: [] }]));
    const tree = [];
    for (const c of byId.values()) {
      if (c.parent_id && byId.has(c.parent_id)) byId.get(c.parent_id).children.push(c);
      else tree.push(c);
    }
    res.json({ data: tree });
  }),
);

catalogueRouter.get(
  "/brands",
  asyncHandler(async (_req, res) => res.json({ data: await query(`SELECT * FROM brands ORDER BY name`) })),
);

catalogueRouter.get(
  "/manufacturers",
  asyncHandler(async (_req, res) =>
    res.json({
      data: await query(
        `SELECT DISTINCT manufacturer AS name FROM products WHERE manufacturer IS NOT NULL AND status='ACTIVE' ORDER BY manufacturer`,
      ),
    }),
  ),
);

catalogueRouter.get(
  "/sellers",
  asyncHandler(async (_req, res) =>
    res.json({
      data: await query(
        `SELECT id, business_name, slug, city, district, province, description, logo_url, rating, total_orders
           FROM sellers WHERE approval_status = 'APPROVED' AND deleted_at IS NULL ORDER BY business_name`,
      ),
    }),
  ),
);

catalogueRouter.get(
  "/sellers/:slug",
  asyncHandler(async (req, res) => {
    const seller = await one(
      `SELECT id, business_name, slug, city, district, province, description, logo_url, rating, total_orders, created_at
         FROM sellers WHERE slug = ? AND approval_status = 'APPROVED' AND deleted_at IS NULL`,
      [req.params.slug],
    );
    if (!seller) throw notFound("Seller not found");
    const listings = await query(
      `SELECT sl.*, p.name, p.slug, p.part_number FROM seller_listings sl
         JOIN products p ON p.id = sl.product_id
        WHERE sl.seller_id = ? AND sl.approval_status='APPROVED' AND sl.is_active=1 AND sl.deleted_at IS NULL`,
      [seller.id],
    );
    res.json({ seller, listings });
  }),
);

/* ------------------------------ Products -------------------------------- */

/* Images and listings are hydrated in JavaScript (see lib/hydrate.js) so the
   API works on MySQL 5.7 / MariaDB 10.x, which have no JSON_ARRAYAGG. */

// GET /products — industrial search: part number, OEM, machine type, name
catalogueRouter.get(
  "/products",
  asyncHandler(async (req, res) => {
    const { page, pageSize, offset } = paginate(req.query);
    const where = [`p.status = 'ACTIVE'`, `p.deleted_at IS NULL`];
    const params = [];

    if (req.query.q) {
      const term = `%${String(req.query.q).trim()}%`;
      where.push(
        `(p.name LIKE ? OR p.part_number LIKE ? OR p.oem_number LIKE ? OR p.manufacturer LIKE ?
          OR p.short_description LIKE ? OR p.compatibility LIKE ?)`,
      );
      params.push(term, term, term, term, term, term);
    }
    if (req.query.categorySlug) {
      where.push(`(c.slug = ? OR parent.slug = ?)`);
      params.push(req.query.categorySlug, req.query.categorySlug);
    }
    if (req.query.brandId) {
      where.push(`p.brand_id = ?`);
      params.push(Number(req.query.brandId));
    }
    if (req.query.manufacturer) {
      where.push(`p.manufacturer = ?`);
      params.push(req.query.manufacturer);
    }
    if (req.query.sellerId) {
      where.push(
        `EXISTS (SELECT 1 FROM seller_listings x WHERE x.product_id=p.id AND x.seller_id=? AND x.approval_status='APPROVED' AND x.is_active=1)`,
      );
      params.push(Number(req.query.sellerId));
    }
    if (req.query.condition) {
      where.push(
        `EXISTS (SELECT 1 FROM seller_listings x WHERE x.product_id=p.id AND x.condition_type=? AND x.approval_status='APPROVED' AND x.is_active=1)`,
      );
      params.push(req.query.condition);
    }
    if (req.query.featured === "true") where.push(`p.is_featured = 1`);
    if (req.query.newArrivals === "true") where.push(`p.is_new_arrival = 1`);
    if (req.query.inStockOnly === "true") where.push(`best.stock_quantity > 0`);
    if (req.query.minPrice) {
      where.push(`best.price >= ?`);
      params.push(Number(req.query.minPrice));
    }
    if (req.query.maxPrice) {
      where.push(`best.price <= ?`);
      params.push(Number(req.query.maxPrice));
    }

    const sort =
      { price_asc: `best.price ASC`, price_desc: `best.price DESC`, newest: `p.created_at DESC` }[req.query.sort] ??
      `p.name ASC`;

    const base = `
      FROM products p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN categories parent ON parent.id = c.parent_id
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN (
        SELECT l1.* FROM seller_listings l1
        JOIN (SELECT product_id, MIN(price) AS price FROM seller_listings
               WHERE approval_status='APPROVED' AND is_active=1 AND deleted_at IS NULL GROUP BY product_id) m
          ON m.product_id = l1.product_id AND m.price = l1.price
        WHERE l1.approval_status='APPROVED' AND l1.is_active=1 AND l1.deleted_at IS NULL
        GROUP BY l1.product_id
      ) best ON best.product_id = p.id
      WHERE ${where.join(" AND ")}`;

    const [{ total }] = await query(`SELECT COUNT(DISTINCT p.id) AS total ${base}`, params);
    const rows = await query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug, b.name AS brand_name,
              best.price AS best_price, best.stock_quantity AS best_stock, best.seller_id AS best_seller_id
       ${base}
       GROUP BY p.id
       ORDER BY ${sort}
       LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    await attachProductRelations(rows);

    res.json({
      data: rows,
      page,
      pageSize,
      total: Number(total),
      totalPages: Math.max(1, Math.ceil(Number(total) / pageSize)),
    });
  }),
);

// GET /products/:slug
catalogueRouter.get(
  "/products/:slug",
  asyncHandler(async (req, res) => {
    const product = await one(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug, b.name AS brand_name
         FROM products p
         JOIN categories c ON c.id = p.category_id
         LEFT JOIN brands b ON b.id = p.brand_id
        WHERE p.slug = ? AND p.status = 'ACTIVE' AND p.deleted_at IS NULL`,
      [req.params.slug],
    );
    if (!product) throw notFound("Product not found");
    await attachProductRelations([product]);
    product.reviews = await query(
      `SELECT r.rating, r.title, r.body, r.created_at, u.full_name
         FROM product_reviews r JOIN users u ON u.id = r.user_id
        WHERE r.product_id = ? AND r.status = 'PUBLISHED' ORDER BY r.created_at DESC LIMIT 20`,
      [product.id],
    );
    res.json({ data: product });
  }),
);
