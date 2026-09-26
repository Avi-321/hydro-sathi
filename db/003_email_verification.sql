-- Hydro Sathi — migration 003
-- Email verification tokens + safety columns. Safe to re-run on MySQL 8.

CREATE TABLE IF NOT EXISTS email_verifications (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64)        NOT NULL,
  expires_at DATETIME        NOT NULL,
  used_at    DATETIME        NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_email_verify_token (token_hash),
  KEY idx_email_verify_user (user_id),
  CONSTRAINT fk_email_verify_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Existing accounts created before verification existed stay usable.
UPDATE users SET email_verified_at = NOW() WHERE email_verified_at IS NULL AND role = 'ADMIN';
