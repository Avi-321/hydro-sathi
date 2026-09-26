# Hydro Sathi — Setup & Operations Guide

Full-stack marketplace for hydropower spare parts.

- **Frontend:** TanStack Start (React 19) + Tailwind, runs on `http://localhost:8080`
- **Backend:** Node.js + Express + MySQL 8, runs on `http://localhost:4000/api/v1`
- **Database:** local MySQL `hydro_sathi` (XAMPP / phpMyAdmin)
- **Email:** Gmail / Google Workspace SMTP via Nodemailer

---

## 1. Database

Import these files in phpMyAdmin (SQL tab), in order:

1. `db/hydro_sathi_schema.sql` — full schema + seed catalogue data
2. `db/002_refresh_tokens.sql` — refresh-token rotation table
3. `db/003_email_verification.sql` — email verification tokens
4. `db/004_uploads_featured_support.sql` — featured / new-arrival flags,
   seller-submitted products and the support desk (**new**)

If you already imported the earlier files, you only need the ones you have not
run yet (file 4 is new in this update).

Tables the app requires: `users, user_addresses, password_resets,
email_verifications, refresh_tokens, sellers, seller_documents, categories,
brands, products, product_images, seller_listings, cart_items, wishlist_items,
orders, order_items, order_status_history, payment_transactions, refunds,
commission_settings, commission_records, settlements, product_reviews,
notifications, audit_logs, support_tickets`.

---

## 2. Backend

```bash
cd server
cp .env.example .env
npm install
npm run dev            # http://localhost:4000/api/v1
```

Health check: `GET http://localhost:4000/api/v1/health` → `{ ok: true, db: "up" }`

### Key `.env` values

| Variable | Purpose |
| --- | --- |
| `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` | Local MySQL connection (XAMPP default: user `root`, empty password) |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_PEPPER` | Change these to long random strings |
| `APP_URL` | Frontend URL used in email links (`http://localhost:8080`) |
| `CORS_ORIGIN` | Frontend origin allowed to call the API |
| `SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS` | Gmail SMTP (`smtp.gmail.com`, port `465`) |
| `MAIL_FROM_NAME`, `MAIL_FROM_EMAIL` | Sender identity on outgoing mail |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Fixed admin account used by the seeder |
| `ESEWA_*`, `KHALTI_*` | Payment gateway test credentials |
| `UPLOAD_DIR`, `PUBLIC_BASE_URL` | Where seller documents are stored and served from |

### Gmail SMTP

Google blocks normal passwords for SMTP. Use an **App Password**:

1. Enable 2-Step Verification on the Google account.
2. Google Account → Security → App passwords → create one for "Mail".
3. Put the 16-character value in `SMTP_PASS` and the Gmail address in
   `SMTP_USER` / `MAIL_FROM_EMAIL`.

If SMTP is not configured, the server does not crash — verification and reset
links are printed to the backend console so you can still test locally.

### Create the admin account

```bash
cd server
npm run seed:admin                      # uses ADMIN_EMAIL / ADMIN_PASSWORD from .env
npm run seed:admin -- admin@hydrosathi.com "Admin@12345" "Site Admin"
```

Re-running the seeder resets the admin password — this is your recovery path
if the admin password is ever lost.

---

## 3. Frontend

```bash
npm install
npm run dev            # http://localhost:8080
```

Point the app at the API with an `.env` file at the project root:

```
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

(That is also the built-in default, so it works without the file.)

---

## 4. Accounts, roles and login

There is **no role selector** anywhere in the UI. The role is stored in MySQL
and returned inside the signed JWT.

| Who | Where they sign in | How the role is decided |
| --- | --- | --- |
| Buyer | `/signin` | Registered at `/signup` → role `BUYER` |
| Seller | `/signin` (same form) | Registered at `/seller/register` → role `SELLER` |
| Admin | `/admin/login` (separate portal) | Seeded account only; buyers/sellers are rejected here |

- Buyers and sellers must **verify their email** before they can sign in. The
  link goes to `/verify-email?token=…`.
- Sellers additionally need **admin approval** after uploading documents from
  Seller portal → Profile.
- Forgot password works for all three: `/forgot-password` for buyers/sellers,
  and the "Forgot admin password?" link on the admin portal. Both land on
  `/reset-password?token=…`.
- The admin can change their own email, name and password from the API
  (`PATCH /auth/admin/credentials`, requires the current password). No one else
  can change admin credentials.

---

## 5. What each portal does

**Buyer site** — catalogue with part-number / OEM / machine-type search,
product pages with competing seller listings, server-persisted cart and
wishlist, checkout that creates the order in one MySQL transaction and then
redirects to eSewa or Khalti, plus order history and cancellation.

**Seller portal** (`/seller/*`, role `SELLER`) — dashboard KPIs, listings CRUD
with stock and price control, order-item fulfilment (`CONFIRMED → SHIPPED →
DELIVERED`), revenue and settlement reports, profile and document uploads.

**Admin panel** (`/admin/*`, role `ADMIN`) — dashboard metrics, seller
verification with document review, master-product and listing approval,
category tree, commission settings (GLOBAL / CATEGORY / SELLER), orders
oversight, payments and refunds, settlement generation, and audit logs.

Portals are guarded on both sides: the UI redirects the wrong role to the right
login, and every API route re-checks the JWT role server-side.

---

## 6. Payments

`POST /payments/initiate` returns either a signed eSewa v2 form payload or a
Khalti payment URL; the checkout page submits/redirects automatically. Every
callback and webhook **re-verifies the transaction with the gateway status API
server-side** before a payment is marked `PAID` — parameters coming back from
the browser are never trusted. Test credentials in `.env.example` point at the
eSewa RC and Khalti sandbox environments.

---

## 7. Commission & settlements

Rate resolution at order time: seller override → SELLER scope → CATEGORY scope
→ GLOBAL scope → default 8%. The resolved rate is **frozen** onto `order_items`
and `commission_records`, so later changes never rewrite historical orders.
Settlements aggregate delivered items per seller for a period, subtract
commission and refunds, and move `PENDING → PROCESSING → PAID`.

---

## 8. Common problems

| Symptom | Fix |
| --- | --- |
| `db: "down"` on health check | MySQL not running in XAMPP, or wrong `DB_USER` / `DB_PASSWORD` |
| Blank data everywhere | Backend not running, or `VITE_API_BASE_URL` points elsewhere |
| CORS error in the browser console | Set `CORS_ORIGIN=http://localhost:8080` in `server/.env` and restart |
| No verification email arrives | SMTP not configured — check the backend console for the printed link |
| `Invalid login: 535` from Gmail | You used the account password; create an App Password instead |
| Admin login says "not an admin account" | Run `npm run seed:admin` to create/reset the fixed admin |
| Seller sees "account is PENDING" | Upload documents, then approve the seller from the admin panel |
| `Table doesn't exist` errors | Import the three SQL files in section 1 |

---

## 9. What changed in this update

### Database (`db/004_uploads_featured_support.sql`)

| Change | Purpose |
| --- | --- |
| `products.is_featured`, `products.is_new_arrival` | Admin controls which parts appear as featured / new arrivals |
| `products.created_by_seller_id` | Marks a master product as seller-submitted |
| `products.rejection_reason` | Reason shown to the seller when a submission is rejected |
| `support_tickets` table | Help requests from buyers, sellers and non-registered visitors |

### Real file uploads (no more image URLs)

- `server/src/lib/uploads.js` — one shared Multer disk store. Images (JPG, PNG,
  WebP, GIF) up to 5 MB; documents also allow PDF. Files land in `UPLOAD_DIR`
  and are served from `PUBLIC_BASE_URL/uploads/<file>`.
- `server/src/routes/uploads.js` —
  `POST /uploads/images` (signed-in admin/seller product photos) and
  `POST /uploads/seller-documents`, which accepts a short-lived upload token so
  a brand-new seller can attach documents during registration, before sign-in.
- `POST /admin/products/:id/images` now takes real files (field `files`).
- Admin product form and seller product form use file pickers; the seller
  registration form uploads the four verification documents immediately after
  the application is submitted.

### Seller-created products

- `POST /seller/products` (multipart) creates the master product **and** the
  seller's listing as `PENDING_REVIEW`, so buyers cannot see it yet.
- `GET /seller/products` lists submissions with their review state and the
  admin's rejection note. Shown on the seller Products page.

### Admin product controls

- `PATCH /admin/products/:id/approval` approves or rejects a submission,
  activates the seller's listing on approval and emails the seller.
- `POST /admin/products/:id/assign` assigns any master product to an approved
  seller with price, stock and condition — creating or reviving the listing.
- Featured / new-arrival toggles on every row (`isFeatured`, `isNewArrival`).
- Catalogue API accepts `?featured=true` and `?newArrivals=true`.

### Help & support

- Public page `/support`: guests fill the query form; signed-in buyers and
  sellers get a prefilled form plus their request history.
- `POST /support` stores the ticket, emails all admins and raises an admin
  notification. `GET /support/mine` returns the user's own history.
- Admin page `/admin/support` lists every request, filters by status and sends
  replies by email (`GET|PATCH /admin/support-tickets`).
- As always, if SMTP is not configured the message body is printed to the
  backend console instead of being emailed.

### Seller product editing, registration fix and complete admin form

- Sellers can now edit products they submitted from **Seller portal → Products**. Changes and newly added images send the product back to `PENDING_REVIEW`; buyers cannot see it until an admin approves it again.
- Sellers can delete their submitted products. This soft-deletes their listing and archives the master product when no other seller is using it.
- Seller registration now sends and saves **City / municipality**, and buyer/user plus seller records are created in one database transaction. A failed seller insert rolls back the user insert instead of leaving a partial account.
- Duplicate PAN/VAT registrations now return a clear validation message.
- The admin product form now includes full description, specifications, compatibility, unit, weight, HS code, featured status, new-arrival status, and product image files in addition to the existing identity/category fields.
- Admin product creation now persists featured and new-arrival values immediately, and editing can clear specifications or compatibility values.
