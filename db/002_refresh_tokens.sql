-- ============================================================================
--  Hydro Sathi — migration 002: refresh-token rotation store
--  Run after hydro_sathi_schema.sql:
--    mysql -u root -p hydro_sathi < db/002_refresh_tokens.sql
-- ============================================================================
USE hydro_sathi;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  family_id     CHAR(36)        NOT NULL,          -- rotation family; revoked entirely on reuse
  token_hash    CHAR(64)        NOT NULL,          -- sha256 of the opaque refresh token
  user_agent    VARCHAR(255)    NULL,
  ip_address    VARCHAR(45)     NULL,
  expires_at    DATETIME        NOT NULL,
  rotated_at    DATETIME        NULL,              -- set when this token is exchanged
  revoked_at    DATETIME        NULL,
  replaced_by   BIGINT UNSIGNED NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_hash (token_hash),
  KEY idx_refresh_user (user_id, revoked_at),
  KEY idx_refresh_family (family_id),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;
