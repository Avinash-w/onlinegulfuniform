-- EvaraNest: minimum order amount + "Shop for ₹999 & get free shipping" messaging.
-- Run once on the server database (phpMyAdmin → SQL). Products are NOT touched.
-- Back up first:  CREATE TABLE content_blocks_backup AS SELECT * FROM content_blocks;

SET NAMES utf8mb4;

-- 1) Site settings: free shipping above ₹999, minimum order ₹500
--    (both are also editable in Admin → Site settings)
UPDATE content_blocks
SET `value` = JSON_SET(`value`,
      '$.site.freeShippingAt', 999,
      '$.site.minOrderAmount', 500)
WHERE `key` = 'storefront';

-- 2) Storefront wording → "Shop for ₹999 & get free shipping"
--    (REPLACE handles both ₹ stored as-is and as ₹)
UPDATE content_blocks
SET `value` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`value`,
      'FREE SHIPPING ON ORDERS ABOVE ₹999',       'SHOP FOR ₹999 & GET FREE SHIPPING'),
      'FREE SHIPPING ON ORDERS ABOVE \\u20b9999', 'SHOP FOR \\u20b9999 & GET FREE SHIPPING'),
      'On orders above ₹999',                     'Shop for ₹999 & get free shipping'),
      'On orders above \\u20b9999',               'Shop for \\u20b9999 & get free shipping'),
      'Free shipping on orders above ₹999',       'Shop for ₹999 & get free shipping'),
      'Free shipping on orders above \\u20b9999', 'Shop for \\u20b9999 & get free shipping'),
      'Free shipping above ₹999',                 'Shop for ₹999 & get free shipping'),
      'Free shipping above \\u20b9999',           'Shop for \\u20b9999 & get free shipping')
WHERE `key` = 'storefront';

-- 3) Check
SELECT JSON_EXTRACT(`value`, '$.site.freeShippingAt') AS free_shipping_at,
       JSON_EXTRACT(`value`, '$.site.minOrderAmount') AS min_order_amount,
       JSON_EXTRACT(`value`, '$.announcements')       AS announcements
FROM content_blocks WHERE `key` = 'storefront';
