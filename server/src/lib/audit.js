/** Append-only audit trail. `conn` may be a pool connection inside a transaction. */
import { pool } from "../db.js";

export async function audit(
  { actorId = null, actorRole = "SYSTEM", action, entityType, entityId = null, oldValues = null, newValues = null, req = null },
  conn = pool,
) {
  await conn.execute(
    `INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      actorId,
      actorRole,
      action,
      entityType,
      entityId,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      req?.ip?.slice(0, 45) ?? null,
      req?.get?.("user-agent")?.slice(0, 255) ?? null,
    ],
  );
}

export async function notify({ userId = null, audience = "USER", type, title, message, linkUrl = null }, conn = pool) {
  await conn.execute(
    `INSERT INTO notifications (user_id, audience, type, title, message, link_url) VALUES (?,?,?,?,?,?)`,
    [userId, audience, type, title, message, linkUrl],
  );
}
