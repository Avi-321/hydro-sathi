/**
 * Settlement generation.
 * One settlement row per (seller, order), created when the order reaches a
 * revenue-recognised state (DELIVERED / COMPLETED). Amounts come from the
 * frozen order_items snapshots, minus any processed refunds for that seller.
 */
import { money } from "./commission.js";

export async function generateSettlementsForOrder(conn, orderId) {
  const [rows] = await conn.execute(
    `SELECT oi.seller_id,
            SUM(oi.subtotal)                                AS gross_amount,
            SUM(oi.commission_amount)                       AS commission_amount,
            SUM(oi.seller_amount)                           AS seller_amount,
            COALESCE((SELECT SUM(r.amount) FROM refunds r
                       JOIN order_items ri ON ri.id = r.order_item_id
                      WHERE r.order_id = oi.order_id
                        AND ri.seller_id = oi.seller_id
                        AND r.status = 'PROCESSED'), 0)     AS refund_amount
       FROM order_items oi
      WHERE oi.order_id = ?
        AND oi.seller_id IS NOT NULL
        AND oi.item_status NOT IN ('CANCELLED','UNAVAILABLE')
      GROUP BY oi.seller_id, oi.order_id`,
    [orderId],
  );

  for (const row of rows) {
    const gross = money(row.gross_amount);
    const commission = money(row.commission_amount);
    const refund = money(row.refund_amount);
    const net = money(gross - commission - refund);
    await conn.execute(
      `INSERT INTO settlements (seller_id, order_id, gross_amount, commission_amount, refund_amount, net_amount, status)
       VALUES (?,?,?,?,?,?, 'PENDING')
       ON DUPLICATE KEY UPDATE gross_amount = VALUES(gross_amount),
                               commission_amount = VALUES(commission_amount),
                               refund_amount = VALUES(refund_amount),
                               net_amount = VALUES(net_amount)`,
      [row.seller_id, orderId, gross, commission, refund, net],
    );
  }

  await conn.execute(
    `UPDATE commission_records SET status = 'SETTLED' WHERE order_id = ? AND status = 'ACCRUED'`,
    [orderId],
  );
  return rows.length;
}
