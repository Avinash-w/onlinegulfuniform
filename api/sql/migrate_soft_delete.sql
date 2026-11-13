-- Soft Delete Migration for EvaraNest (Juneberry)
USE evaranest;

-- Categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;

-- Subcategories
ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;

-- Users (Customers)
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;

-- Orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;

-- Coupons
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;

-- Custom Enquiries
ALTER TABLE custom_enquiries ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;

-- Variants
ALTER TABLE variants ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;
