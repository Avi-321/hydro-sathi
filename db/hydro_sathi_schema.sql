-- ============================================================================
--  Hydro Sathi — MySQL 8 database schema
--  Hydropower spare-parts marketplace (B2B / B2C)
--  Engine: InnoDB · Charset: utf8mb4 · Collation: utf8mb4_0900_ai_ci
--  Import:  mysql -u root -p < hydro_sathi_schema.sql
-- ============================================================================

DROP DATABASE IF EXISTS hydro_sathi;
CREATE DATABASE hydro_sathi
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
USE hydro_sathi;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 1. USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name         VARCHAR(120)    NOT NULL,
  email             VARCHAR(190)    NOT NULL,
  phone             VARCHAR(20)     NULL,
  password_hash     VARCHAR(255)    NOT NULL,           -- bcrypt / argon2id
  role              ENUM('BUYER','SELLER','ADMIN') NOT NULL DEFAULT 'BUYER',
  status            ENUM('ACTIVE','SUSPENDED','DELETED') NOT NULL DEFAULT 'ACTIVE',
  email_verified_at DATETIME        NULL,
  last_login_at     DATETIME        NULL,
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone),
  KEY idx_users_role_status (role, status)
) ENGINE=InnoDB;

CREATE TABLE user_addresses (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  label         VARCHAR(60)     NOT NULL DEFAULT 'Default',
  contact_name  VARCHAR(120)    NOT NULL,
  contact_phone VARCHAR(20)     NOT NULL,
  province      VARCHAR(60)     NOT NULL,
  district      VARCHAR(60)     NOT NULL,
  city          VARCHAR(80)     NOT NULL,
  street        VARCHAR(190)    NOT NULL,
  landmark      VARCHAR(190)    NULL,
  postal_code   VARCHAR(20)     NULL,
  is_default    TINYINT(1)      NOT NULL DEFAULT 0,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_addresses_user (user_id, is_default),
  CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE password_resets (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64)        NOT NULL,
  expires_at DATETIME        NOT NULL,
  used_at    DATETIME        NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reset_token (token_hash),
  KEY idx_reset_user (user_id),
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 2. SELLERS
-- ============================================================================

CREATE TABLE sellers (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id             BIGINT UNSIGNED NOT NULL,
  business_name       VARCHAR(160)    NOT NULL,
  slug                VARCHAR(180)    NOT NULL,
  registration_number VARCHAR(60)     NOT NULL,
  pan_number          VARCHAR(30)     NOT NULL,
  contact_person      VARCHAR(120)    NOT NULL,
  contact_phone       VARCHAR(20)     NOT NULL,
  contact_email       VARCHAR(190)    NOT NULL,
  province            VARCHAR(60)     NOT NULL,
  district            VARCHAR(60)     NOT NULL,
  city                VARCHAR(80)     NOT NULL,
  address_line        VARCHAR(190)    NOT NULL,
  description         TEXT            NULL,
  logo_url            VARCHAR(255)    NULL,
  bank_name           VARCHAR(120)    NULL,
  bank_account_name   VARCHAR(120)    NULL,
  bank_account_number VARCHAR(40)     NULL,
  bank_branch         VARCHAR(120)    NULL,
  commission_rate     DECIMAL(5,2)    NULL,             -- NULL → fall back to global/category rate
  approval_status     ENUM('PENDING','APPROVED','REJECTED','SUSPENDED') NOT NULL DEFAULT 'PENDING',
  rejection_reason    VARCHAR(255)    NULL,
  approved_by         BIGINT UNSIGNED NULL,
  approved_at         DATETIME        NULL,
  rating              DECIMAL(3,2)    NOT NULL DEFAULT 0.00,
  total_orders        INT UNSIGNED    NOT NULL DEFAULT 0,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at          DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sellers_user (user_id),
  UNIQUE KEY uq_sellers_slug (slug),
  UNIQUE KEY uq_sellers_pan (pan_number),
  KEY idx_sellers_status (approval_status),
  CONSTRAINT fk_sellers_user     FOREIGN KEY (user_id)     REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_sellers_approver FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_sellers_rate CHECK (commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 50))
) ENGINE=InnoDB;

CREATE TABLE seller_documents (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  seller_id     BIGINT UNSIGNED NOT NULL,
  document_type ENUM('BUSINESS_REGISTRATION','PAN','VAT','IDENTITY','BANK_DOCUMENT','OTHER') NOT NULL,
  file_url      VARCHAR(255)    NOT NULL,
  file_name     VARCHAR(190)    NOT NULL,
  mime_type     VARCHAR(80)     NOT NULL,
  file_size     INT UNSIGNED    NOT NULL,
  status        ENUM('PENDING','VERIFIED','REJECTED') NOT NULL DEFAULT 'PENDING',
  review_note   VARCHAR(255)    NULL,
  reviewed_by   BIGINT UNSIGNED NULL,
  reviewed_at   DATETIME        NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_seller_docs (seller_id, document_type),
  CONSTRAINT fk_docs_seller   FOREIGN KEY (seller_id)   REFERENCES sellers (id) ON DELETE CASCADE,
  CONSTRAINT fk_docs_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id)   ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================================
-- 3. CATALOGUE — categories, brands, master products, images
-- ============================================================================

CREATE TABLE categories (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id   BIGINT UNSIGNED NULL,                     -- self-referencing hierarchy
  name        VARCHAR(120)    NOT NULL,
  slug        VARCHAR(140)    NOT NULL,
  description VARCHAR(500)    NULL,
  icon        VARCHAR(60)     NULL,
  image_url   VARCHAR(255)    NULL,
  sort_order  INT             NOT NULL DEFAULT 0,
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug),
  KEY idx_categories_parent (parent_id, is_active),
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE brands (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(120)    NOT NULL,
  slug       VARCHAR(140)    NOT NULL,
  logo_url   VARCHAR(255)    NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_brands_slug (slug)
) ENGINE=InnoDB;

-- Master product = one canonical part; many sellers can list against it.
CREATE TABLE products (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id       BIGINT UNSIGNED NOT NULL,
  brand_id          BIGINT UNSIGNED NULL,
  name              VARCHAR(190)    NOT NULL,
  slug              VARCHAR(210)    NOT NULL,
  part_number       VARCHAR(80)     NOT NULL,
  oem_number        VARCHAR(80)     NULL,
  manufacturer      VARCHAR(120)    NULL,
  short_description VARCHAR(500)    NULL,
  description       TEXT            NULL,
  specifications    JSON            NULL,   -- {"material":"SS316","bore":"120 mm", ...}
  compatibility     JSON            NULL,   -- ["Francis 5 MW","Pelton 2 MW", ...]
  unit              VARCHAR(20)     NOT NULL DEFAULT 'pcs',
  weight_kg         DECIMAL(10,3)   NULL,
  hs_code           VARCHAR(20)     NULL,
  status            ENUM('DRAFT','PENDING_REVIEW','ACTIVE','ARCHIVED') NOT NULL DEFAULT 'PENDING_REVIEW',
  created_by        BIGINT UNSIGNED NULL,
  approved_by       BIGINT UNSIGNED NULL,
  approved_at       DATETIME        NULL,
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_slug (slug),
  UNIQUE KEY uq_products_part_number (part_number),
  KEY idx_products_category (category_id, status),
  KEY idx_products_brand (brand_id),
  KEY idx_products_oem (oem_number),
  FULLTEXT KEY ft_products_search (name, part_number, oem_number, manufacturer, short_description),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id),
  CONSTRAINT fk_products_brand    FOREIGN KEY (brand_id)    REFERENCES brands (id)  ON DELETE SET NULL,
  CONSTRAINT fk_products_creator  FOREIGN KEY (created_by)  REFERENCES users (id)   ON DELETE SET NULL,
  CONSTRAINT fk_products_approver FOREIGN KEY (approved_by) REFERENCES users (id)   ON DELETE SET NULL
) ENGINE=InnoDB;

-- Multiple images per product (required).
CREATE TABLE product_images (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  image_url  VARCHAR(255)    NOT NULL,
  alt_text   VARCHAR(190)    NULL,
  sort_order INT             NOT NULL DEFAULT 0,
  is_primary TINYINT(1)      NOT NULL DEFAULT 0,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_product_images (product_id, sort_order),
  CONSTRAINT fk_product_images FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 4. SELLER LISTINGS (price + stock per seller per product)
-- ============================================================================

CREATE TABLE seller_listings (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  seller_id         BIGINT UNSIGNED NOT NULL,
  product_id        BIGINT UNSIGNED NOT NULL,
  sku               VARCHAR(80)     NULL,
  price             DECIMAL(12,2)   NOT NULL,
  mrp               DECIMAL(12,2)   NULL,
  currency          CHAR(3)         NOT NULL DEFAULT 'NPR',
  stock_quantity    INT             NOT NULL DEFAULT 0,
  min_order_qty     INT             NOT NULL DEFAULT 1,
  lead_time_days    INT             NOT NULL DEFAULT 3,
  warranty_months   INT             NOT NULL DEFAULT 0,
  condition_type    ENUM('NEW','REFURBISHED') NOT NULL DEFAULT 'NEW',
  is_genuine        TINYINT(1)      NOT NULL DEFAULT 1,
  approval_status   ENUM('PENDING_REVIEW','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING_REVIEW',
  rejection_reason  VARCHAR(255)    NULL,
  is_active         TINYINT(1)      NOT NULL DEFAULT 1,
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_listing_seller_product (seller_id, product_id),
  KEY idx_listing_product_price (product_id, price),
  KEY idx_listing_active (is_active, approval_status),
  CONSTRAINT fk_listing_seller  FOREIGN KEY (seller_id)  REFERENCES sellers (id)  ON DELETE CASCADE,
  CONSTRAINT fk_listing_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT chk_listing_price CHECK (price > 0),
  CONSTRAINT chk_listing_stock CHECK (stock_quantity >= 0)
) ENGINE=InnoDB;

-- ============================================================================
-- 5. CART & WISHLIST
-- ============================================================================

CREATE TABLE cart_items (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  listing_id BIGINT UNSIGNED NOT NULL,
  quantity   INT             NOT NULL DEFAULT 1,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cart_user_listing (user_id, listing_id),
  CONSTRAINT fk_cart_user    FOREIGN KEY (user_id)    REFERENCES users (id)           ON DELETE CASCADE,
  CONSTRAINT fk_cart_listing FOREIGN KEY (listing_id) REFERENCES seller_listings (id) ON DELETE CASCADE,
  CONSTRAINT chk_cart_qty CHECK (quantity > 0)
) ENGINE=InnoDB;

CREATE TABLE wishlist_items (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wishlist (user_id, product_id),
  CONSTRAINT fk_wishlist_user    FOREIGN KEY (user_id)    REFERENCES users (id)    ON DELETE CASCADE,
  CONSTRAINT fk_wishlist_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 6. ORDERS
-- ============================================================================

CREATE TABLE orders (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_number       VARCHAR(32)     NOT NULL,
  user_id            BIGINT UNSIGNED NOT NULL,
  buyer_name         VARCHAR(120)    NOT NULL,
  buyer_phone        VARCHAR(20)     NOT NULL,
  buyer_email        VARCHAR(190)    NOT NULL,
  shipping_province  VARCHAR(60)     NOT NULL,
  shipping_district  VARCHAR(60)     NOT NULL,
  shipping_city      VARCHAR(80)     NOT NULL,
  shipping_street    VARCHAR(190)    NOT NULL,
  shipping_landmark  VARCHAR(190)    NULL,
  subtotal           DECIMAL(12,2)   NOT NULL,
  tax_amount         DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  delivery_charge    DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  discount_amount    DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  total_amount       DECIMAL(12,2)   NOT NULL,
  commission_amount  DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  seller_payable     DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  currency           CHAR(3)         NOT NULL DEFAULT 'NPR',
  payment_status     ENUM('PENDING','PAID','FAILED','REFUNDED','PARTIALLY_REFUNDED') NOT NULL DEFAULT 'PENDING',
  order_status       ENUM('PLACED','PAYMENT_CONFIRMED','SELLER_CONFIRMED','ADMIN_APPROVED',
                          'SHIPPED','DELIVERED','COMPLETED','CANCELLED','ON_HOLD','REFUNDED')
                     NOT NULL DEFAULT 'PLACED',
  tracking_number    VARCHAR(80)     NULL,
  courier_name       VARCHAR(120)    NULL,
  notes              VARCHAR(500)    NULL,
  placed_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivered_at       DATETIME        NULL,
  created_at         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_number (order_number),
  KEY idx_orders_user (user_id, created_at),
  KEY idx_orders_status (order_status, payment_status),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB;

-- Snapshot columns freeze product/seller/commission data at order time.
CREATE TABLE order_items (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id              BIGINT UNSIGNED NOT NULL,
  listing_id            BIGINT UNSIGNED NULL,
  product_id            BIGINT UNSIGNED NULL,
  seller_id             BIGINT UNSIGNED NULL,
  product_name_snapshot VARCHAR(190)    NOT NULL,
  part_number_snapshot  VARCHAR(80)     NOT NULL,
  seller_name_snapshot  VARCHAR(160)    NOT NULL,
  image_url_snapshot    VARCHAR(255)    NULL,
  unit_price            DECIMAL(12,2)   NOT NULL,
  quantity              INT             NOT NULL,
  subtotal              DECIMAL(12,2)   NOT NULL,
  commission_rate       DECIMAL(5,2)    NOT NULL,      -- snapshot; never recomputed later
  commission_amount     DECIMAL(12,2)   NOT NULL,
  seller_amount         DECIMAL(12,2)   NOT NULL,
  item_status           ENUM('PENDING','CONFIRMED','UNAVAILABLE','SHIPPED','DELIVERED','CANCELLED','REFUNDED')
                        NOT NULL DEFAULT 'PENDING',
  created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_order_items_order (order_id),
  KEY idx_order_items_seller (seller_id, item_status),
  CONSTRAINT fk_items_order   FOREIGN KEY (order_id)   REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_items_listing FOREIGN KEY (listing_id) REFERENCES seller_listings (id) ON DELETE SET NULL,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL,
  CONSTRAINT fk_items_seller  FOREIGN KEY (seller_id)  REFERENCES sellers (id)  ON DELETE SET NULL,
  CONSTRAINT chk_item_qty CHECK (quantity > 0)
) ENGINE=InnoDB;

CREATE TABLE order_status_history (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id   BIGINT UNSIGNED NOT NULL,
  status     VARCHAR(40)     NOT NULL,
  note       VARCHAR(255)    NULL,
  changed_by BIGINT UNSIGNED NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_history_order (order_id, created_at),
  CONSTRAINT fk_history_order FOREIGN KEY (order_id)   REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_history_user  FOREIGN KEY (changed_by) REFERENCES users (id)  ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================================
-- 7. PAYMENTS & REFUNDS  (eSewa / Khalti / bank transfer)
-- ============================================================================

CREATE TABLE payment_transactions (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id            BIGINT UNSIGNED NOT NULL,
  provider            ENUM('ESEWA','KHALTI','BANK_TRANSFER','COD') NOT NULL,
  transaction_type    ENUM('PAYMENT','REFUND') NOT NULL DEFAULT 'PAYMENT',
  amount              DECIMAL(12,2)   NOT NULL,
  currency            CHAR(3)         NOT NULL DEFAULT 'NPR',
  provider_txn_id     VARCHAR(120)    NULL,             -- gateway reference
  provider_ref_id     VARCHAR(120)    NULL,
  status              ENUM('INITIATED','PENDING','SUCCESS','FAILED','CANCELLED','REFUNDED') NOT NULL DEFAULT 'INITIATED',
  verified_server_side TINYINT(1)     NOT NULL DEFAULT 0, -- set only after gateway verification API
  raw_payload         JSON            NULL,
  failure_reason      VARCHAR(255)    NULL,
  initiated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at        DATETIME        NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_provider_txn (provider, provider_txn_id),
  KEY idx_payments_order (order_id, status),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE refunds (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id      BIGINT UNSIGNED NOT NULL,
  order_item_id BIGINT UNSIGNED NULL,
  amount        DECIMAL(12,2)   NOT NULL,
  reason        VARCHAR(255)    NOT NULL,
  status        ENUM('REQUESTED','APPROVED','REJECTED','PROCESSED') NOT NULL DEFAULT 'REQUESTED',
  requested_by  BIGINT UNSIGNED NULL,
  processed_by  BIGINT UNSIGNED NULL,
  processed_at  DATETIME        NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_refunds_order (order_id, status),
  CONSTRAINT fk_refunds_order FOREIGN KEY (order_id)      REFERENCES orders (id)      ON DELETE CASCADE,
  CONSTRAINT fk_refunds_item  FOREIGN KEY (order_item_id) REFERENCES order_items (id) ON DELETE SET NULL,
  CONSTRAINT fk_refunds_req   FOREIGN KEY (requested_by)  REFERENCES users (id)       ON DELETE SET NULL,
  CONSTRAINT fk_refunds_proc  FOREIGN KEY (processed_by)  REFERENCES users (id)       ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================================
-- 8. COMMISSION CONFIGURATION & SETTLEMENTS
-- ============================================================================

-- Resolution order at order time: SELLER > CATEGORY > GLOBAL (latest effective row).
CREATE TABLE commission_settings (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  scope_type     ENUM('GLOBAL','CATEGORY','SELLER') NOT NULL,
  scope_id       BIGINT UNSIGNED NULL,                  -- category_id or seller_id; NULL for GLOBAL
  rate           DECIMAL(5,2)    NOT NULL,
  effective_from DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  effective_to   DATETIME        NULL,
  created_by     BIGINT UNSIGNED NULL,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_commission_scope (scope_type, scope_id, effective_from),
  CONSTRAINT fk_commission_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_commission_rate CHECK (rate >= 0 AND rate <= 50)
) ENGINE=InnoDB;

-- One row per (order item) commission earned by the platform.
CREATE TABLE commission_records (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id          BIGINT UNSIGNED NOT NULL,
  order_item_id     BIGINT UNSIGNED NOT NULL,
  seller_id         BIGINT UNSIGNED NOT NULL,
  gross_amount      DECIMAL(12,2)   NOT NULL,
  commission_rate   DECIMAL(5,2)    NOT NULL,
  commission_amount DECIMAL(12,2)   NOT NULL,
  seller_amount     DECIMAL(12,2)   NOT NULL,
  status            ENUM('ACCRUED','REVERSED','SETTLED') NOT NULL DEFAULT 'ACCRUED',
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_commission_item (order_item_id),
  KEY idx_commission_seller (seller_id, status),
  CONSTRAINT fk_comm_order  FOREIGN KEY (order_id)      REFERENCES orders (id)      ON DELETE CASCADE,
  CONSTRAINT fk_comm_item   FOREIGN KEY (order_item_id) REFERENCES order_items (id) ON DELETE CASCADE,
  CONSTRAINT fk_comm_seller FOREIGN KEY (seller_id)     REFERENCES sellers (id)     ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE settlements (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  seller_id         BIGINT UNSIGNED NOT NULL,
  order_id          BIGINT UNSIGNED NOT NULL,
  gross_amount      DECIMAL(12,2)   NOT NULL,
  commission_amount DECIMAL(12,2)   NOT NULL,
  refund_amount     DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
  net_amount        DECIMAL(12,2)   NOT NULL,
  status            ENUM('PENDING','PROCESSING','PAID','ON_HOLD') NOT NULL DEFAULT 'PENDING',
  payout_reference  VARCHAR(120)    NULL,
  paid_at           DATETIME        NULL,
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_settlement_seller_order (seller_id, order_id),
  KEY idx_settlement_status (status, created_at),
  CONSTRAINT fk_settle_seller FOREIGN KEY (seller_id) REFERENCES sellers (id) ON DELETE CASCADE,
  CONSTRAINT fk_settle_order  FOREIGN KEY (order_id)  REFERENCES orders (id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 9. REVIEWS, NOTIFICATIONS, AUDIT LOG
-- ============================================================================

CREATE TABLE product_reviews (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id    BIGINT UNSIGNED NOT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  order_item_id BIGINT UNSIGNED NULL,                   -- verified purchase link
  rating        TINYINT UNSIGNED NOT NULL,
  title         VARCHAR(160)    NULL,
  body          VARCHAR(2000)   NULL,
  status        ENUM('PENDING','PUBLISHED','REJECTED') NOT NULL DEFAULT 'PENDING',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_review_user_item (user_id, order_item_id),
  KEY idx_reviews_product (product_id, status),
  CONSTRAINT fk_review_product FOREIGN KEY (product_id)    REFERENCES products (id)    ON DELETE CASCADE,
  CONSTRAINT fk_review_user    FOREIGN KEY (user_id)       REFERENCES users (id)       ON DELETE CASCADE,
  CONSTRAINT fk_review_item    FOREIGN KEY (order_item_id) REFERENCES order_items (id) ON DELETE SET NULL,
  CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NULL,                     -- NULL = broadcast to admins
  audience    ENUM('USER','SELLER','ADMIN') NOT NULL DEFAULT 'USER',
  type        VARCHAR(60)     NOT NULL,
  title       VARCHAR(160)    NOT NULL,
  message     VARCHAR(500)    NOT NULL,
  link_url    VARCHAR(255)    NULL,
  is_read     TINYINT(1)      NOT NULL DEFAULT 0,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_user (user_id, is_read, created_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id    BIGINT UNSIGNED NULL,
  actor_role  ENUM('BUYER','SELLER','ADMIN','SYSTEM') NOT NULL DEFAULT 'SYSTEM',
  action      VARCHAR(80)     NOT NULL,                 -- e.g. SELLER_APPROVED, ORDER_STATUS_CHANGED
  entity_type VARCHAR(60)     NOT NULL,
  entity_id   BIGINT UNSIGNED NULL,
  old_values  JSON            NULL,
  new_values  JSON            NULL,
  ip_address  VARCHAR(45)     NULL,
  user_agent  VARCHAR(255)    NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_entity (entity_type, entity_id, created_at),
  KEY idx_audit_actor (actor_id, created_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================================
-- 10. VIEWS — reporting helpers
-- ============================================================================

CREATE OR REPLACE VIEW v_seller_revenue AS
SELECT s.id AS seller_id,
       s.business_name,
       COUNT(DISTINCT oi.order_id)        AS orders_count,
       COALESCE(SUM(oi.subtotal), 0)      AS gross_revenue,
       COALESCE(SUM(oi.commission_amount), 0) AS commission_paid,
       COALESCE(SUM(oi.seller_amount), 0) AS net_revenue
FROM sellers s
LEFT JOIN order_items oi ON oi.seller_id = s.id AND oi.item_status NOT IN ('CANCELLED','REFUNDED')
GROUP BY s.id, s.business_name;

CREATE OR REPLACE VIEW v_product_best_offer AS
SELECT p.id AS product_id,
       p.name,
       p.part_number,
       MIN(sl.price)         AS best_price,
       COUNT(sl.id)          AS seller_count,
       SUM(sl.stock_quantity) AS total_stock
FROM products p
JOIN seller_listings sl
  ON sl.product_id = p.id AND sl.is_active = 1 AND sl.approval_status = 'APPROVED'
WHERE p.status = 'ACTIVE'
GROUP BY p.id, p.name, p.part_number;

-- ============================================================================
-- 11. SEED DATA (minimum viable marketplace)
-- ============================================================================

INSERT INTO users (id, full_name, email, phone, password_hash, role, email_verified_at) VALUES
  (1, 'Hydro Sathi Admin', 'admin@hydrosathi.com', '+9779800000001', '$2y$12$REPLACE_WITH_REAL_HASH', 'ADMIN',  NOW()),
  (2, 'Bishnu Adhikari',   'buyer@example.com',    '+9779800000002', '$2y$12$REPLACE_WITH_REAL_HASH', 'BUYER',  NOW()),
  (3, 'Sagar Thapa',       'seller@example.com',   '+9779800000003', '$2y$12$REPLACE_WITH_REAL_HASH', 'SELLER', NOW());

INSERT INTO sellers (id, user_id, business_name, slug, registration_number, pan_number, contact_person,
                     contact_phone, contact_email, province, district, city, address_line,
                     commission_rate, approval_status, approved_by, approved_at) VALUES
  (1, 3, 'Himalaya Hydro Supplies', 'himalaya-hydro-supplies', 'REG-118842', '301882445', 'Sagar Thapa',
   '+9779800000003', 'seller@example.com', 'Bagmati', 'Kathmandu', 'Kathmandu', 'Balaju Industrial Area',
   10.00, 'APPROVED', 1, NOW());

INSERT INTO categories (id, parent_id, name, slug, sort_order) VALUES
  (1, NULL, 'Turbine Components', 'turbine-components', 1),
  (2, NULL, 'Valves & Gates',     'valves-gates',       2),
  (3, NULL, 'Bearings & Seals',   'bearings-seals',     3),
  (4, NULL, 'Pumps',              'pumps',              4),
  (5, NULL, 'Electrical & Control','electrical-control',5),
  (6, 1,    'Pelton Buckets',     'pelton-buckets',     1),
  (7, 2,    'Butterfly Valves',   'butterfly-valves',   1),
  (8, 3,    'Mechanical Seals',   'mechanical-seals',   1);

INSERT INTO brands (id, name, slug) VALUES
  (1, 'Andritz Hydro', 'andritz-hydro'),
  (2, 'Voith',         'voith'),
  (3, 'SKF',           'skf');

INSERT INTO products (id, category_id, brand_id, name, slug, part_number, oem_number, manufacturer,
                      short_description, status, created_by, approved_by, approved_at) VALUES
  (1, 6, 1, 'Pelton Turbine Bucket – 2 MW', 'pelton-turbine-bucket-2mw', 'HS-PLT-2001', 'AH-PB-2001',
   'Andritz Hydro', 'Cast stainless steel Pelton bucket for 2 MW runners.', 'ACTIVE', 1, 1, NOW()),
  (2, 7, 2, 'Butterfly Valve DN600 PN16', 'butterfly-valve-dn600-pn16', 'HS-BFV-0600', 'VO-BF-600',
   'Voith', 'Ductile iron body butterfly valve with EPDM seat.', 'ACTIVE', 1, 1, NOW()),
  (3, 8, 3, 'Mechanical Seal 120 mm SiC', 'mechanical-seal-120mm-sic', 'HS-MSL-0120', 'SKF-MS-120',
   'SKF', 'Silicon carbide mechanical seal for turbine shafts.', 'ACTIVE', 1, 1, NOW());

INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary) VALUES
  (1, '/images/part-turbine.jpg', 'Pelton turbine bucket', 0, 1),
  (1, '/images/part-turbine-2.jpg','Pelton bucket profile', 1, 0),
  (2, '/images/part-valve.jpg',   'Butterfly valve DN600', 0, 1),
  (2, '/images/part-valve-2.jpg', 'Butterfly valve flange', 1, 0),
  (3, '/images/part-seal.jpg',    'Mechanical seal 120 mm', 0, 1);

INSERT INTO seller_listings (seller_id, product_id, sku, price, mrp, stock_quantity, lead_time_days,
                             warranty_months, approval_status) VALUES
  (1, 1, 'HHS-PLT-2001', 182500.00, 195000.00, 12, 7, 12, 'APPROVED'),
  (1, 2, 'HHS-BFV-0600',  96500.00, 104000.00,  8, 5, 18, 'APPROVED'),
  (1, 3, 'HHS-MSL-0120',  18750.00,  21000.00, 45, 3,  6, 'APPROVED');

INSERT INTO commission_settings (scope_type, scope_id, rate, created_by) VALUES
  ('GLOBAL', NULL, 10.00, 1),
  ('CATEGORY', 1,  8.00, 1),
  ('SELLER', 1,   10.00, 1);

-- ============================================================================
-- End of schema
-- ============================================================================
