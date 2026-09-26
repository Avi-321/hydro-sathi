/**
 * Commission resolution + snapshotting.
 * Resolution order at order time: SELLER > CATEGORY > GLOBAL (latest effective row).
 * The resolved rate is FROZEN onto order_items and commission_records and is
 * never recomputed if settings change later.
 */
const DEFAULT_RATE = 8.0;

async function scopedRate(conn, scopeType, scopeId) {
  const [rows] = await conn.execute(
    `SELECT rate FROM commission_settings
      WHERE scope_type = ?
        AND (scope_id <=> ?)
        AND effective_from <= NOW()
        AND (effective_to IS NULL OR effective_to > NOW())
      ORDER BY effective_from DESC, id DESC
      LIMIT 1`,
    [scopeType, scopeId],
  );
  return rows[0] ? Number(rows[0].rate) : null;
}

/**
 * @returns {Promise<{rate:number, source:'SELLER_OVERRIDE'|'SELLER'|'CATEGORY'|'GLOBAL'|'DEFAULT'}>}
 */
export async function resolveCommissionRate(conn, { sellerId, categoryId, sellerOverrideRate = null }) {
  if (sellerOverrideRate !== null && sellerOverrideRate !== undefined) {
    return { rate: Number(sellerOverrideRate), source: "SELLER_OVERRIDE" };
  }
  const seller = await scopedRate(conn, "SELLER", sellerId);
  if (seller !== null) return { rate: seller, source: "SELLER" };
  const category = categoryId != null ? await scopedRate(conn, "CATEGORY", categoryId) : null;
  if (category !== null) return { rate: category, source: "CATEGORY" };
  const global = await scopedRate(conn, "GLOBAL", null);
  if (global !== null) return { rate: global, source: "GLOBAL" };
  return { rate: DEFAULT_RATE, source: "DEFAULT" };
}

export const money = (n) => Math.round(Number(n) * 100) / 100;

export function splitCommission(gross, rate) {
  const commissionAmount = money((gross * rate) / 100);
  return { commissionAmount, sellerAmount: money(gross - commissionAmount) };
}
