/**
 * Creates (or resets) the fixed ADMIN account for the admin portal.
 *
 *   npm run seed:admin                       # uses ADMIN_EMAIL / ADMIN_PASSWORD from .env
 *   npm run seed:admin -- a@b.com "Pass123!" "Site Admin"
 *
 * After the first login the admin can change email/password from
 * Admin → Settings (PATCH /auth/admin/credentials). Re-running this script
 * resets them back to the .env values.
 */
import bcrypt from "bcryptjs";
import { config } from "../config.js";
import { one, pool } from "../db.js";

const [email = config.admin.email, password = config.admin.password, fullName = config.admin.name] =
  process.argv.slice(2);

const run = async () => {
  const hash = await bcrypt.hash(password, 12);
  const existing = await one(`SELECT id FROM users WHERE email = ?`, [email.toLowerCase()]);
  if (existing) {
    await pool.execute(
      `UPDATE users SET password_hash = ?, role='ADMIN', status='ACTIVE', full_name = ?, email_verified_at = NOW() WHERE id = ?`,
      [hash, fullName, existing.id],
    );
    console.log(`✔ Updated existing admin #${existing.id} (${email})`);
  } else {
    const [r] = await pool.execute(
      `INSERT INTO users (full_name, email, password_hash, role, status, email_verified_at)
       VALUES (?,?,?, 'ADMIN', 'ACTIVE', NOW())`,
      [fullName, email.toLowerCase(), hash],
    );
    console.log(`✔ Created admin #${r.insertId} (${email})`);
  }
  console.log(`   password: ${password}`);
  console.log(`   sign in at ${config.appUrl}/admin/login`);
  await pool.end();
};

run().catch(async (err) => {
  console.error("✖ Seeding failed:", err.message);
  await pool.end();
  process.exit(1);
});
