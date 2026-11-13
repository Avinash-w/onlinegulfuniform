-- Phase 2 commerce tables (run after schema.sql)
USE evaranest;

CREATE TABLE IF NOT EXISTS customer_addresses (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  label VARCHAR(80) NOT NULL DEFAULT 'Home',
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  line1 VARCHAR(255) NOT NULL,
  city VARCHAR(120) NOT NULL,
  state VARCHAR(120) NOT NULL,
  pin VARCHAR(20) NOT NULL,
  country VARCHAR(80) NOT NULL DEFAULT 'India',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_addr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_addr_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS otp_challenges (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  mode ENUM('login','signup') NOT NULL,
  code CHAR(6) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coupons (
  code VARCHAR(40) PRIMARY KEY,
  type ENUM('percent','flat') NOT NULL,
  value INT NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  min_cart INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wishlists (
  user_id VARCHAR(64) NOT NULL,
  product_handle VARCHAR(160) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, product_handle),
  CONSTRAINT fk_wish_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  customer_name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  subtotal INT NOT NULL DEFAULT 0,
  shipping INT NOT NULL DEFAULT 0,
  discount INT NOT NULL DEFAULT 0,
  coupon VARCHAR(40) NULL,
  total INT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'Pending',
  address_json JSON NOT NULL,
  timeline_json JSON NOT NULL,
  placed_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_orders_user (user_id),
  INDEX idx_orders_status (status),
  INDEX idx_orders_placed (placed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_lines (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(32) NOT NULL,
  variant_id VARCHAR(160) NOT NULL,
  product_handle VARCHAR(160) NOT NULL,
  title VARCHAR(255) NOT NULL,
  image TEXT NULL,
  size VARCHAR(80) NOT NULL,
  color VARCHAR(80) NOT NULL DEFAULT '—',
  sku VARCHAR(120) NOT NULL,
  price INT NOT NULL,
  qty INT NOT NULL,
  custom_note TEXT NULL,
  CONSTRAINT fk_lines_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_lines_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(48) PRIMARY KEY,
  order_id VARCHAR(32) NOT NULL,
  amount INT NOT NULL,
  method VARCHAR(40) NOT NULL,
  status VARCHAR(40) NOT NULL,
  transaction_id VARCHAR(120) NULL,
  razorpay_order_id VARCHAR(120) NULL,
  paid_at DATETIME NOT NULL,
  CONSTRAINT fk_pay_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_pay_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refunds (
  id VARCHAR(48) PRIMARY KEY,
  order_id VARCHAR(32) NOT NULL,
  amount INT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Pending',
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_ref_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_ref_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shipments (
  id VARCHAR(48) PRIMARY KEY,
  order_id VARCHAR(32) NOT NULL UNIQUE,
  carrier VARCHAR(80) NOT NULL,
  awb VARCHAR(120) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'In transit',
  shipped_at DATETIME NOT NULL,
  delivered_at DATETIME NULL,
  checkpoints_json JSON NOT NULL,
  CONSTRAINT fk_ship_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
