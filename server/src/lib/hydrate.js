/**
 * Relation hydration helpers.
 *
 * These replace MySQL 8's JSON_ARRAYAGG/JSON_OBJECT aggregation so the API also
 * runs on MySQL 5.7 and MariaDB 10.x (which do not provide JSON_ARRAYAGG).
 * Child rows are fetched with a single extra query per relation and attached
 * in JavaScript — same response shape, no version-specific SQL.
 */
import { query } from "../db.js";

const ids = (rows, key = "id") => [...new Set(rows.map((r) => Number(r[key])).filter(Boolean))];
const placeholders = (n) => Array(n).fill("?").join(",");

/** Attach `images` and `listings` arrays to a list of product rows. */
export async function attachProductRelations(rows) {
  if (!rows.length) return rows;
  const productIds = ids(rows);
  if (!productIds.length) return rows;

  const imageRows = await query(
    `SELECT product_id, image_url AS url, alt_text AS alt, is_primary AS isPrimary
       FROM product_images WHERE product_id IN (${placeholders(productIds.length)})
      ORDER BY is_primary DESC, sort_order, id`,
    productIds,
  );

  const listingRows = await query(
    `SELECT l.product_id, l.id, l.seller_id AS sellerId, ls.business_name AS sellerName,
            l.price, l.mrp, l.stock_quantity AS stockQuantity, l.condition_type AS \`condition\`,
            l.lead_time_days AS leadTimeDays, l.warranty_months AS warrantyMonths,
            l.is_genuine AS isGenuine, l.min_order_qty AS minOrderQty
       FROM seller_listings l
       JOIN sellers ls ON ls.id = l.seller_id
      WHERE l.product_id IN (${placeholders(productIds.length)})
        AND l.approval_status = 'APPROVED' AND l.is_active = 1 AND l.deleted_at IS NULL
        AND ls.approval_status = 'APPROVED'
      ORDER BY l.price ASC`,
    productIds,
  );

  const imagesBy = new Map();
  for (const r of imageRows) {
    const { product_id: pid, ...rest } = r;
    if (!imagesBy.has(pid)) imagesBy.set(pid, []);
    imagesBy.get(pid).push({ ...rest, isPrimary: Boolean(rest.isPrimary) });
  }
  const listingsBy = new Map();
  for (const r of listingRows) {
    const { product_id: pid, ...rest } = r;
    if (!listingsBy.has(pid)) listingsBy.set(pid, []);
    listingsBy.get(pid).push({ ...rest, isGenuine: Boolean(rest.isGenuine) });
  }

  for (const row of rows) {
    row.images = imagesBy.get(Number(row.id)) ?? [];
    row.listings = listingsBy.get(Number(row.id)) ?? [];
  }
  return rows;
}

/** Attach an `items` array (order lines) to a list of order rows. */
export async function attachOrderItems(orderRows, sellerId = null) {
  if (!orderRows.length) return orderRows;
  const orderIds = ids(orderRows);
  if (!orderIds.length) return orderRows;
  const params = [...orderIds];
  let sellerFilter = "";
  if (sellerId) {
    sellerFilter = " AND seller_id = ?";
    params.push(sellerId);
  }
  const rows = await query(
    `SELECT order_id, id, product_name_snapshot AS name, part_number_snapshot AS partNumber,
            quantity, unit_price AS unitPrice, subtotal, item_status AS status,
            commission_rate AS commissionRate, commission_amount AS commissionAmount,
            seller_amount AS sellerAmount, seller_id AS sellerId,
            seller_name_snapshot AS sellerName, listing_id AS listingId, product_id AS productId
       FROM order_items WHERE order_id IN (${placeholders(orderIds.length)})${sellerFilter}
      ORDER BY id`,
    params,
  );
  const by = new Map();
  for (const r of rows) {
    const { order_id: oid, ...rest } = r;
    if (!by.has(oid)) by.set(oid, []);
    by.get(oid).push(rest);
  }
  for (const o of orderRows) o.items = by.get(Number(o.id)) ?? [];
  return orderRows;
}
