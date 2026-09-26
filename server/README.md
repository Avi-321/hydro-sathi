# Hydro Sathi API (Node.js + Express + MySQL 8)

Local REST backend for the Hydro Sathi marketplace. Talks to your local
MySQL (XAMPP / phpMyAdmin) database `hydro_sathi`.

## 1. Database

Run these in phpMyAdmin (SQL tab) if you have not already:

1. `db/hydro_sathi_schema.sql` — full schema + seed rows
2. `db/002_refresh_tokens.sql` — refresh-token rotation table

Your imported DB must contain: `users, user_addresses, password_resets,
sellers, seller_documents, categories, brands, products, product_images,
seller_listings, cart_items, wishlist_items, orders, order_items,
order_status_history, payment_transactions, refunds, commission_settings,
commission_records, settlements, product_reviews, notifications, audit_logs,
refresh_tokens`.

## 2. Run

```bash
cd server
cp .env.example .env      # edit DB_USER / DB_PASSWORD if needed
npm install
npm run dev               # http://localhost:4000/api/v1
npm run seed:admin -- admin@hydrosathi.com "Admin@12345" "Site Admin"
```

Health check: `GET http://localhost:4000/api/v1/health` → `{ ok: true, db: "up" }`.

## 3. API surface (`/api/v1`)

**Auth** — `POST /auth/register|login|refresh|logout|logout-all`,
`GET /auth/me`, `PATCH /auth/password`, `POST /auth/forgot-password|reset-password`,
`GET|POST /auth/addresses`.
Access token (JWT, 15m) + rotating refresh token (30d) with family reuse
detection: a replayed refresh token revokes the whole family.

**Catalogue (public)** — `GET /categories`, `/brands`, `/manufacturers`,
`/products` (search by part number, OEM number, machine type, category,
brand, price, stock; sorting + pagination), `/products/:slug`, `/sellers`,
`/sellers/:slug`.

**Cart / wishlist (buyer)** — `GET|POST|PATCH|DELETE /cart`, `/cart/wishlist`.

**Orders (buyer)** — `POST /orders` (server-authoritative pricing, tax,
delivery, stock reservation and commission snapshotting), `GET /orders`,
`GET /orders/:number`, `POST /orders/:number/cancel`.

**Payments** — `POST /payments/esewa/initiate` (signed v2 form payload),
`POST /payments/khalti/initiate`, `GET /payments/esewa/callback`,
`POST /payments/khalti/callback`, plus `POST /webhooks/esewa|khalti`.
Every callback re-verifies with the gateway status API server-side before
marking a payment PAID — client params are never trusted.

**Seller (role SELLER, approved)** — profile, document upload
(`multipart/form-data`), listings CRUD + stock/price, order items and
fulfilment (`PACKED → SHIPPED → DELIVERED` with tracking), revenue and
settlement reports.

**Admin (role ADMIN)** — dashboard metrics, seller verification
(approve / reject / suspend with document review), master-product and listing
approval, category tree CRUD, commission settings (GLOBAL / CATEGORY / SELLER
scopes with effective dating), orders oversight, payments and refunds,
settlement generation and payout marking, audit-log browsing.

## 4. Commission & settlements

Rate resolution at order time: seller override → SELLER → CATEGORY → GLOBAL →
default 8%. The resolved rate and amounts are **frozen** onto `order_items`
and `commission_records`; later settings changes never alter historical
orders. Settlements aggregate delivered items per seller for a period,
subtracting commission and refunds, and move `PENDING → PROCESSING → PAID`.

## 5. Connecting the frontend

Set `VITE_API_BASE_URL=http://localhost:4000/api/v1` and switch the mock
adapter calls in `src/lib/api.ts` to the `http<T>()` helper.
