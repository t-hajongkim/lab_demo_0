-- 프로토타입용 최소 스키마 + 샘플 데이터
CREATE DATABASE IF NOT EXISTS asset_mgmt
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE asset_mgmt;

CREATE TABLE IF NOT EXISTS customers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id BIGINT UNSIGNED NOT NULL,
  account_number VARCHAR(30) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'KRW',
  -- 금액은 반드시 DECIMAL. FLOAT/DOUBLE 은 반올림 오차가 생깁니다.
  balance DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  status ENUM('ACTIVE', 'DORMANT', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_accounts_account_number (account_number),
  KEY idx_accounts_customer_id (customer_id),
  CONSTRAINT fk_accounts_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
) ENGINE=InnoDB;

INSERT INTO customers (id, name) VALUES (1, '김하준'), (2, '이서연')
  ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO accounts (customer_id, account_number, currency, balance, status) VALUES
  (1, '110-234-567890', 'KRW', 15250000.00, 'ACTIVE'),
  (2, '110-234-567891', 'USD', 42000.75, 'ACTIVE')
  ON DUPLICATE KEY UPDATE balance = VALUES(balance);
