-- ============================================================================
-- Hydro Sathi — migration 004
-- * featured / new-arrival flags on master products
-- * seller-submitted master products (admin approval required before buyers
--   can see them)
-- * help & support tickets (buyers, sellers and guests)
-- Target: MariaDB 10.4+ / MySQL 5.7+ (run after 001-003)
-- ============================================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_featured    TINYINT(1) NOT NULL DEFAULT 0 AFTER status,
  ADD COLUMN IF NOT EXISTS is_new_arrival TINYINT(1) NOT NULL DEFAULT 0 AFTER is_featured,
  ADD COLUMN IF NOT EXISTS created_by_seller_id BIGINT UNSIGNED NULL AFTER created_by,
  ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(255) NULL AFTER approved_at;

-- Index used by the storefront "featured" / "new arrivals" rails.
CREATE INDEX IF NOT EXISTS idx_products_featured ON products (is_featured, status);
CREATE INDEX IF NOT EXISTS idx_products_new ON products (is_new_arrival, status);

-- Help & support requests. `user_id` is NULL for guest (non-registered) queries.
CREATE TABLE IF NOT EXISTS support_tickets (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_number VARCHAR(30)     NOT NULL,
  user_id       BIGINT UNSIGNED NULL,
  role          ENUM('GUEST','BUYER','SELLER') NOT NULL DEFAULT 'GUEST',
  name          VARCHAR(120)    NOT NULL,
  email         VARCHAR(190)    NOT NULL,
  phone         VARCHAR(20)     NULL,
  category      VARCHAR(60)     NOT NULL DEFAULT 'GENERAL',
  subject       VARCHAR(190)    NOT NULL,
  message       TEXT            NOT NULL,
  order_number  VARCHAR(40)     NULL,
  status        ENUM('OPEN','IN_PROGRESS','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
  admin_reply   TEXT            NULL,
  replied_by    BIGINT UNSIGNED NULL,
  replied_at    DATETIME        NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_support_ticket_number (ticket_number),
  KEY idx_support_status (status, created_at),
  KEY idx_support_user (user_id)
) ENGINE=InnoDB;
