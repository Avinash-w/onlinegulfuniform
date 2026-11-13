<?php
declare(strict_types=1);

require_once __DIR__ . '/config/database.php';

$pdo = db();

echo "Starting Uniforms Seeding...\n";

// 1. Clear candle-related data
$pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
$pdo->exec("TRUNCATE TABLE order_lines;");
$pdo->exec("TRUNCATE TABLE reviews;");
$pdo->exec("TRUNCATE TABLE product_images;");
$pdo->exec("TRUNCATE TABLE variants;");
$pdo->exec("TRUNCATE TABLE products;");
$pdo->exec("TRUNCATE TABLE subcategories;");
$pdo->exec("TRUNCATE TABLE categories;");
$pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

echo "Cleared existing products, variants, images, categories, and subcategories.\n";

// 2. Insert main categories
$categories = [
    ['id' => 'cat-home', 'name' => 'Home', 'slug' => 'home', 'sort_order' => 1],
    ['id' => 'cat-about-us', 'name' => 'About Us', 'slug' => 'about-us', 'sort_order' => 2],
    ['id' => 'cat-boys', 'name' => 'Boys', 'slug' => 'boys', 'sort_order' => 3],
    ['id' => 'cat-girls', 'name' => 'Girls', 'slug' => 'girls', 'sort_order' => 4],
    ['id' => 'cat-industrial-uniforms', 'name' => 'Industrial Uniforms', 'slug' => 'industrial-uniforms', 'sort_order' => 5],
    ['id' => 'cat-track-order', 'name' => 'Track Order', 'slug' => 'track-order', 'sort_order' => 6],
    ['id' => 'cat-contact-us', 'name' => 'Contact Us', 'slug' => 'contact-us', 'sort_order' => 7],
];

$catStmt = $pdo->prepare("INSERT INTO categories (id, name, slug, active, sort_order) VALUES (?, ?, ?, 1, ?)");
foreach ($categories as $cat) {
    $catStmt->execute([$cat['id'], $cat['name'], $cat['slug'], $cat['sort_order']]);
}
echo "Inserted " . count($categories) . " categories.\n";

// 3. Insert subcategories
$subcategories = [
    // Boys
    ['id' => 'sub-boys-pants', 'cat_id' => 'cat-boys', 'name' => 'Pants', 'slug' => 'boys-pants', 'sort_order' => 1],
    ['id' => 'sub-boys-dress-shirts-short-sleeve', 'cat_id' => 'cat-boys', 'name' => 'Dress Shirts Short Sleeve', 'slug' => 'boys-dress-shirts-short-sleeve', 'sort_order' => 2],
    ['id' => 'sub-boys-dress-shirt-long-sleeve', 'cat_id' => 'cat-boys', 'name' => 'Dress shirt Long Sleeve', 'slug' => 'boys-dress-shirt-long-sleeve', 'sort_order' => 3],
    ['id' => 'sub-boys-pe-trousers', 'cat_id' => 'cat-boys', 'name' => 'PE trousers', 'slug' => 'boys-pe-trousers', 'sort_order' => 4],
    ['id' => 'sub-boys-pe-polo-shirts', 'cat_id' => 'cat-boys', 'name' => 'PE polo shirts', 'slug' => 'boys-pe-polo-shirts', 'sort_order' => 5],
    ['id' => 'sub-boys-pe-round-neck-t-shirts', 'cat_id' => 'cat-boys', 'name' => 'PE Round Neck T Shirts', 'slug' => 'boys-pe-round-neck-t-shirts', 'sort_order' => 6],
    ['id' => 'sub-boys-shorts', 'cat_id' => 'cat-boys', 'name' => 'Shorts', 'slug' => 'boys-shorts', 'sort_order' => 7],
    ['id' => 'sub-boys-jackets', 'cat_id' => 'cat-boys', 'name' => 'Jackets', 'slug' => 'boys-jackets', 'sort_order' => 8],

    // Girls
    ['id' => 'sub-girls-pants', 'cat_id' => 'cat-girls', 'name' => 'Pants', 'slug' => 'girls-pants', 'sort_order' => 1],
    ['id' => 'sub-girls-skirts', 'cat_id' => 'cat-girls', 'name' => 'Skirts', 'slug' => 'girls-skirts', 'sort_order' => 2],
    ['id' => 'sub-girls-skorts', 'cat_id' => 'cat-girls', 'name' => 'Skorts', 'slug' => 'girls-skorts', 'sort_order' => 3],
    ['id' => 'sub-girls-pinafore', 'cat_id' => 'cat-girls', 'name' => 'Pinafore', 'slug' => 'girls-pinafore', 'sort_order' => 4],
    ['id' => 'sub-girls-dress-shirts-short-sleeve', 'cat_id' => 'cat-girls', 'name' => 'Dress Shirts Short Sleeve', 'slug' => 'girls-dress-shirts-short-sleeve', 'sort_order' => 5],
    ['id' => 'sub-girls-dress-shirt-long-sleeve', 'cat_id' => 'cat-girls', 'name' => 'Dress shirt Long Sleeve', 'slug' => 'girls-dress-shirt-long-sleeve', 'sort_order' => 6],
    ['id' => 'sub-girls-pe-trousers', 'cat_id' => 'cat-girls', 'name' => 'PE trousers', 'slug' => 'girls-pe-trousers', 'sort_order' => 7],
    ['id' => 'sub-girls-pe-polo-shirts', 'cat_id' => 'cat-girls', 'name' => 'PE polo shirts', 'slug' => 'girls-pe-polo-shirts', 'sort_order' => 8],
    ['id' => 'sub-girls-pe-round-neck-t-shirts', 'cat_id' => 'cat-girls', 'name' => 'PE Round Neck T Shirts', 'slug' => 'girls-pe-round-neck-t-shirts', 'sort_order' => 9],
    ['id' => 'sub-girls-jackets', 'cat_id' => 'cat-girls', 'name' => 'Jackets', 'slug' => 'girls-jackets', 'sort_order' => 10],

    // Industrial Uniforms
    ['id' => 'sub-industrial-polo-shirts', 'cat_id' => 'cat-industrial-uniforms', 'name' => 'Polo Shirts', 'slug' => 'industrial-polo-shirts', 'sort_order' => 1],
    ['id' => 'sub-corporate-uniform', 'cat_id' => 'cat-industrial-uniforms', 'name' => 'Corporate Uniform', 'slug' => 'corporate-uniform', 'sort_order' => 2],
    ['id' => 'sub-restaurant-uniforms', 'cat_id' => 'cat-industrial-uniforms', 'name' => 'Restaurant Uniforms', 'slug' => 'restaurant-uniforms', 'sort_order' => 3],
    ['id' => 'sub-engineering-uniforms', 'cat_id' => 'cat-industrial-uniforms', 'name' => 'Engineering Uniforms', 'slug' => 'engineering-uniforms', 'sort_order' => 4],
    ['id' => 'sub-oil-and-gas-uniforms', 'cat_id' => 'cat-industrial-uniforms', 'name' => 'Oil and Gas Uniforms', 'slug' => 'oil-and-gas-uniforms', 'sort_order' => 5],
];

$subStmt = $pdo->prepare("INSERT INTO subcategories (id, category_id, name, slug, active, sort_order) VALUES (?, ?, ?, ?, 1, ?)");
foreach ($subcategories as $sub) {
    $subStmt->execute([$sub['id'], $sub['cat_id'], $sub['name'], $sub['slug'], $sub['sort_order']]);
}
echo "Inserted " . count($subcategories) . " subcategories.\n";

// 4. Products for Boys, Girls, and Industrial Uniforms
$products = [
    // --- BOYS ---
    [
        'handle' => 'boys-classic-school-pants',
        'title' => 'Boys Classic Fit School Uniform Pants',
        'category' => 'Boys',
        'subcategory' => 'boys-pants',
        'price' => 65,
        'compare_at' => 85,
        'sku' => 'OGU-BP-001',
        'color' => 'Navy Blue',
        'sizes' => ['24', '26', '28', '30', '32', '34', '36'],
        'short_description' => 'Durable poly-viscose school uniform trousers with reinforced knees and adjustable waistband.',
        'description' => 'Tailored for everyday school wear, these boys school pants feature a stain-resistant finish, reinforced stitching, deep twin side pockets, and an adjustable elastic waistband for maximum comfort throughout the academic day.',
        'material' => '65% Polyester, 35% Viscose Twill',
        'fit' => 'Regular School Fit',
        'gender' => 'Boys',
        'care' => 'Machine wash warm, tumble dry gentle, warm iron.',
        'images' => [
            'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80',
        ]
    ],
    [
        'handle' => 'boys-dress-shirt-short-sleeve',
        'title' => 'Boys Short Sleeve Classic Oxford Dress Shirt',
        'category' => 'Boys',
        'subcategory' => 'boys-dress-shirts-short-sleeve',
        'price' => 45,
        'compare_at' => 60,
        'sku' => 'OGU-BSS-002',
        'color' => 'Pure White',
        'sizes' => ['24', '26', '28', '30', '32', '34', '36'],
        'short_description' => 'Crisp short sleeve oxford dress shirt with button-down collar and chest pocket.',
        'description' => 'Designed to stay sharp from the first bell to home time. Crafted from high-grade cotton-rich blend with non-iron technology and easy-care fabric that resists wrinkles and staining.',
        'material' => '60% Cotton, 40% Polyester Oxford Weave',
        'fit' => 'Tailored School Fit',
        'gender' => 'Boys',
        'care' => 'Machine wash cold, easy iron.',
        'images' => [
            'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=80',
        ]
    ],
    [
        'handle' => 'boys-dress-shirt-long-sleeve',
        'title' => 'Boys Long Sleeve Formal School Dress Shirt',
        'category' => 'Boys',
        'subcategory' => 'boys-dress-shirt-long-sleeve',
        'price' => 55,
        'compare_at' => 70,
        'sku' => 'OGU-BLS-003',
        'color' => 'Light Blue',
        'sizes' => ['24', '26', '28', '30', '32', '34', '36'],
        'short_description' => 'Classic long sleeve uniform shirt with reinforced barrel cuffs and structured collar.',
        'description' => 'Perfect for winter uniform requirements and official school assemblies. Features smooth cotton-blend touch, double-stitched durability, and clean pearl-finish buttons.',
        'material' => '65% Cotton, 35% Polyester',
        'fit' => 'Classic Fit',
        'gender' => 'Boys',
        'care' => 'Machine washable, low heat iron.',
        'images' => [
            'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80',
        ]
    ],
    [
        'handle' => 'boys-pe-track-trousers',
        'title' => 'Boys Athletic PE Track Trousers with Drawstring',
        'category' => 'Boys',
        'subcategory' => 'boys-pe-trousers',
        'price' => 50,
        'compare_at' => 65,
        'sku' => 'OGU-BPT-004',
        'color' => 'Navy Blue',
        'sizes' => ['24', '26', '28', '30', '32', '34', '36'],
        'short_description' => 'Breathable sport track trousers with zipped side pockets and elasticated cuffs.',
        'description' => 'Engineered for school sports and physical training. High-flex fabric allows full freedom of movement while moisture-wicking technology keeps pupils cool and dry.',
        'material' => '100% Micro-Poly Tricot Sports Mesh',
        'fit' => 'Athletic Fit',
        'gender' => 'Boys',
        'care' => 'Quick wash, do not bleach.',
        'images' => [
            'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=800&q=80',
        ]
    ],
    [
        'handle' => 'boys-pe-polo-shirt',
        'title' => 'Boys Breathable Pique Cotton PE Polo Shirt',
        'category' => 'Boys',
        'subcategory' => 'boys-pe-polo-shirts',
        'price' => 40,
        'compare_at' => 50,
        'sku' => 'OGU-BPP-005',
        'color' => 'Royal Blue',
        'sizes' => ['24', '26', '28', '30', '32', '34', '36'],
        'short_description' => 'Active pique knit PE polo shirt with ribbed collar and 3-button placket.',
        'description' => 'Soft, durable, and fade-resistant. Built with premium combed cotton-poly honeycomb knit that holds color and structure through countless high-temperature laundry cycles.',
        'material' => '65% Combed Cotton, 35% Polyester Pique',
        'fit' => 'Sport Comfort Fit',
        'gender' => 'Boys',
        'care' => 'Machine wash warm with like colors.',
        'images' => [
            'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=800&q=80',
        ]
    ],
    [
        'handle' => 'boys-pe-round-neck-tshirt',
        'title' => 'Boys Moisture-Wicking PE Round Neck T-Shirt',
        'category' => 'Boys',
        'subcategory' => 'boys-pe-round-neck-t-shirts',
        'price' => 30,
        'compare_at' => 40,
        'sku' => 'OGU-BRN-006',
        'color' => 'Sky Blue',
        'sizes' => ['24', '26', '28', '30', '32', '34', '36'],
        'short_description' => 'Lightweight gym and house sports round neck t-shirt with anti-odor protection.',
        'description' => 'Essential PE kit item. Ultra-soft performance microfiber with flatlock seams to prevent chafing during active sports, soccer, and sports day events.',
        'material' => '100% Performance Dry-Fit Polyester',
        'fit' => 'Athletic Regular',
        'gender' => 'Boys',
        'care' => 'Quick dry wash, hang dry.',
        'images' => [
            'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80',
        ]
    ],
    [
        'handle' => 'boys-school-bermuda-shorts',
        'title' => 'Boys Tailored School Uniform Bermudas & Shorts',
        'category' => 'Boys',
        'subcategory' => 'boys-shorts',
        'price' => 45,
        'compare_at' => 55,
        'sku' => 'OGU-BSH-007',
        'color' => 'Khaki',
        'sizes' => ['24', '26', '28', '30', '32', '34', '36'],
        'short_description' => 'Knee-length smart tailored school shorts with front pleats and belt loops.',
        'description' => 'Designed for summer terms and warm climates. Stain-repellent twill cloth keeps students comfortable and neat with room for active play.',
        'material' => '65% Polyester, 35% Cotton Twill',
        'fit' => 'Tailored Bermuda Fit',
        'gender' => 'Boys',
        'care' => 'Machine washable, warm iron.',
        'images' => [
            'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80',
        ]
    ],
    [
        'handle' => 'boys-school-uniform-blazer-jacket',
        'title' => 'Boys Formal School Blazer & Uniform Jacket',
        'category' => 'Boys',
        'subcategory' => 'boys-jackets',
        'price' => 125,
        'compare_at' => 160,
        'sku' => 'OGU-BJK-008',
        'color' => 'Navy Blue',
        'sizes' => ['26', '28', '30', '32', '34', '36', '38'],
        'short_description' => 'Fully lined bespoke school blazer with crest embroidery pocket and brass buttons.',
        'description' => 'Premium formal blazer crafted from anti-pill wool-touch fabric. Features tailored lapels, internal pockets, and elegant structured shoulder pads for a distinguished uniform look.',
        'material' => 'Polyester Wool Blend with Satin Lining',
        'fit' => 'Tailored Formal Cut',
        'gender' => 'Boys',
        'care' => 'Dry clean recommended.',
        'images' => [
            'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80',
        ]
    ],

    // --- GIRLS ---
    [
        'handle' => 'girls-straight-cut-school-pants',
        'title' => 'Girls Straight-Cut School Uniform Trousers',
        'category' => 'Girls',
        'subcategory' => 'girls-pants',
        'price' => 65,
        'compare_at' => 85,
        'sku' => 'OGU-GP-101',
        'color' => 'Navy Blue',
        'sizes' => ['24', '26', '28', '30', '32', '34', '36'],
        'short_description' => 'Modern straight-leg school uniform trousers with stretch comfort waistband.',
        'description' => 'Smart and comfortable girls school trousers made with a slight mechanical stretch for all-day ease. Features front zip fly, secure hook and bar fastening, and deep pockets.',
        'material' => '63% Polyester, 33% Viscose, 4% Elastane',
        'fit' => 'Straight Leg',
        'gender' => 'Girls',
        'care' => 'Machine wash warm, drip dry.',
        'images' => [
            'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
        ]
    ],
    [
        'handle' => 'girls-knife-pleated-uniform-skirt',
        'title' => 'Girls Knife-Pleated School Uniform Skirt',
        'category' => 'Girls',
        'subcategory' => 'girls-skirts',
        'price' => 55,
        'compare_at' => 75,
        'sku' => 'OGU-GSK-102',
        'color' => 'Grey Tartan',
        'sizes' => ['24', '26', '28', '30', '32', '34', '36'],
        'short_description' => 'All-around permanent knife-pleated school skirt with concealed side zipper.',
        'description' => 'Classic school uniform skirt featuring razor-sharp permanent pleats that hold their shape through frequent laundering. Complete with adjustable internal waistband buttons.',
        'material' => '65% Polyester, 35% Viscose Woven',
        'fit' => 'A-Line Pleated',
        'gender' => 'Girls',
        'care' => 'Machine washable, pleat-press with light steam.',
        'images' => [
            'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80',
        ]
    ],
    [
        'handle' => 'girls-active-uniform-skort',
        'title' => 'Girls Active School Uniform Skort with Inner Shorts',
        'category' => 'Girls',
        'subcategory' => 'girls-skorts',
        'price' => 50,
        'compare_at' => 65,
        'sku' => 'OGU-GSKT-103',
        'color' => 'Navy Blue',
        'sizes' => ['24', '26', '28', '30', '32', '34', '36'],
        'short_description' => 'Clever 2-in-1 uniform skort featuring outer skirt panel and built-in stretch modesty shorts.',
        'description' => 'Provides confidence, comfort, and modest coverage for girls during recess and classroom activities. Crafted with soft touch anti-static fabric.',
        'material' => 'Polyester Cotton Twill outer, Spandex Jersey inner shorts',
        'fit' => 'Regular Fit Skort',
        'gender' => 'Girls',
        'care' => 'Machine wash cold.',
        'images' => [
            'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=800&q=80',
        ]
    ],
    [
        'handle' => 'girls-box-pleated-pinafore-dress',
        'title' => 'Girls Box-Pleated Classic School Pinafore Dress',
        'category' => 'Girls',
        'subcategory' => 'girls-pinafore',
        'price' => 70,
        'compare_at' => 90,
        'sku' => 'OGU-GPIN-104',
        'color' => 'Navy Blue',
        'sizes' => ['24', '26', '28', '30', '32', '34', '36'],
        'short_description' => 'Traditional bib pinafore dress with box pleats and decorative front buttons.',
        'description' => 'Staple uniform pinafore for junior school girls. Designed to layer smoothly over short or long sleeve blouses. Teflon stain-resistant coating keeps it looking brand new.',
        'material' => '65% Polyester, 35% Viscose with Teflon Shield',
        'fit' => 'Classic Pinafore Cut',
        'gender' => 'Girls',
        'care' => 'Machine washable, warm iron.',
        'images' => [
            'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=800&q=80',
        ]
    ],
    [
        'handle' => 'girls-short-sleeve-dress-shirt',
        'title' => 'Girls Peter Pan Collar Short Sleeve School Blouse',
        'category' => 'Girls',
        'subcategory' => 'girls-dress-shirts-short-sleeve',
        'price' => 45,
        'compare_at' => 60,
        'sku' => 'OGU-GSS-105',
        'color' => 'Pure White',
        'sizes' => ['24', '26', '28', '30', '32', '34', '36'],
        'short_description' => 'Graceful short sleeve school uniform blouse with curved Peter Pan collar.',
        'description' => 'Soft, breathable school blouse tailored specifically for girls. Styled with clean darting, delicate chest pocket, and non-yellowing white cotton rich cloth.',
        'material' => '65% Cotton, 35% Polyester Poplin',
        'fit' => 'Tailored Blouse Fit',
        'gender' => 'Girls',
        'care' => 'Machine wash warm, easy iron.',
        'images' => [
            'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80',
        ]
    ],
    [
        'handle' => 'girls-long-sleeve-dress-shirt',
        'title' => 'Girls Long Sleeve Tailored School Dress Shirt',
        'category' => 'Girls',
        'subcategory' => 'girls-dress-shirt-long-sleeve',
        'price' => 55,
        'compare_at' => 70,
        'sku' => 'OGU-GLS-106',
        'color' => 'Pure White',
        'sizes' => ['24', '26', '28', '30', '32', '34', '36'],
        'short_description' => 'Long sleeve school uniform shirt with neat point collar and button cuffs.',
        'description' => 'Formal school shirt designed for winter and official functions. Crafted from durable cotton blend that provides great breathability and easy iron convenience.',
        'material' => '60% Cotton, 40% Polyester',
        'fit' => 'Fitted School Shirt',
        'gender' => 'Girls',
        'care' => 'Warm machine wash.',
        'images' => [
            'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
        ]
    ],
    [
        'handle' => 'girls-pe-sport-trousers',
        'title' => 'Girls Lightweight Sport PE Track Pants',
        'category' => 'Girls',
        'subcategory' => 'girls-pe-trousers',
        'price' => 50,
        'compare_at' => 65,
        'sku' => 'OGU-GPT-107',
        'color' => 'Navy Blue',
        'sizes' => ['24', '26', '28', '30', '32', '34', '36'],
        'short_description' => 'Comfort fit sports track pants with elastic waist and side contrast piping.',
        'description' => 'High performance girls athletic trousers suited for gymnastics, track events, and outdoor physical education. Soft-brushed inside for comfort.',
        'material' => '100% Breathable Micro-Poly',
        'fit' => 'Athletic Relaxed',
        'gender' => 'Girls',
        'care' => 'Machine wash cold.',
        'images' => [
            'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?auto=format&fit=crop&w=800&q=80',
        ]
    ],
    [
        'handle' => 'girls-pe-sport-polo',
        'title' => 'Girls Quick-Dry Athletic PE Polo Shirt',
        'category' => 'Girls',
        'subcategory' => 'girls-pe-polo-shirts',
        'price' => 40,
        'compare_at' => 50,
        'sku' => 'OGU-GPP-108',
        'color' => 'Royal Blue',
        'sizes' => ['24', '26', '28', '30', '32', '34', '36'],
        'short_description' => 'Tailored girls fit sports polo shirt in breathable waffle pique weave.',
        'description' => 'Combines sportswear functionality with smart uniform standards. Resists color loss under bright sun and withstands intense weekly sports practice.',
        'material' => '65% Cotton, 35% Polyester Pique',
        'fit' => 'Feminine Sport Cut',
        'gender' => 'Girls',
        'care' => 'Machine washable, gentle spin.',
        'images' => [
            'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?auto=format&fit=crop&w=800&q=80',
        ]
    ],
    [
        'handle' => 'girls-pe-round-neck-tshirt',
        'title' => 'Girls Vibrant Performance PE Round Neck Tee',
        'category' => 'Girls',
        'subcategory' => 'girls-pe-round-neck-t-shirts',
        'price' => 30,
        'compare_at' => 40,
        'sku' => 'OGU-GRN-109',
        'color' => 'Sky Blue',
        'sizes' => ['24', '26', '28', '30', '32', '34', '36'],
        'short_description' => 'Featherweight round neck t-shirt with active dry weave and sun protection.',
        'description' => 'Vibrant school house tee engineered with quick drying micro-mesh that actively pulls sweat away from the body during athletics and games.',
        'material' => '100% Quick-Dry Polyester',
        'fit' => 'Active Fit',
        'gender' => 'Girls',
        'care' => 'Cool wash, dry in shade.',
        'images' => [
            'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
        ]
    ],
    [
        'handle' => 'girls-school-uniform-blazer-jacket',
        'title' => 'Girls Premium School Uniform Blazer Jacket',
        'category' => 'Girls',
        'subcategory' => 'girls-jackets',
        'price' => 125,
        'compare_at' => 160,
        'sku' => 'OGU-GJK-110',
        'color' => 'Navy Blue',
        'sizes' => ['26', '28', '30', '32', '34', '36', '38'],
        'short_description' => 'Fitted girls formal school uniform blazer with lapel collar and crest badge pocket.',
        'description' => 'Superbly tailored blazer designed for young ladies. Features elegant princess seams for flattering drape, twin flap pockets, interior stationery pocket, and full satin lining.',
        'material' => 'Poly-Wool Blend with Silky Lining',
        'fit' => 'Princess Seam Tailored Fit',
        'gender' => 'Girls',
        'care' => 'Dry clean only.',
        'images' => [
            'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
        ]
    ],

    // --- INDUSTRIAL UNIFORMS ---
    [
        'handle' => 'industrial-heavy-duty-workwear-polo',
        'title' => 'Heavy-Duty Industrial Workwear Polo Shirt',
        'category' => 'Industrial Uniforms',
        'subcategory' => 'industrial-polo-shirts',
        'price' => 55,
        'compare_at' => 75,
        'sku' => 'OGU-IND-POLO-201',
        'color' => 'Royal Blue',
        'sizes' => ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
        'short_description' => 'Industrial grade heavyweight polo shirt with reinforced collar and twin shoulder pen slots.',
        'description' => 'Engineered for logistics, facilities, warehouse staff, and factory floors. Built from high-durability combed cotton-poly knit with bar-tacked stress points that withstand commercial laundry.',
        'material' => '65% Polyester, 35% Combed Cotton Heavy Pique (220 GSM)',
        'fit' => 'Industrial Comfort Fit',
        'gender' => 'Unisex Adults',
        'care' => 'Industrial wash 60°C.',
        'images' => [
            'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?auto=format&fit=crop&w=800&q=80',
        ]
    ],
    [
        'handle' => 'corporate-executive-formal-uniform-suit',
        'title' => 'Executive Corporate Formal Uniform Suit & Shirt Set',
        'category' => 'Industrial Uniforms',
        'subcategory' => 'corporate-uniform',
        'price' => 280,
        'compare_at' => 350,
        'sku' => 'OGU-IND-CORP-202',
        'color' => 'Charcoal Grey',
        'sizes' => ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
        'short_description' => 'Modern 2-piece corporate business suit with crisp executive button-down dress shirt.',
        'description' => 'Give your front-office, hotel management, and corporate staff a prestigious, unified appearance. Wrinkle-resistant premium stretch fabric ensures pristine presentation all day.',
        'material' => '70% Fine Poly, 28% Rayon, 2% Spandex',
        'fit' => 'Executive Modern Fit',
        'gender' => 'Unisex / Men / Women',
        'care' => 'Dry clean.',
        'images' => [
            'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
        ]
    ],
    [
        'handle' => 'professional-chef-coat-restaurant-uniform',
        'title' => 'Professional Chef Coat & Hospitality Staff Uniform',
        'category' => 'Industrial Uniforms',
        'subcategory' => 'restaurant-uniforms',
        'price' => 85,
        'compare_at' => 110,
        'sku' => 'OGU-IND-REST-203',
        'color' => 'Executive White',
        'sizes' => ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
        'short_description' => 'Double-breasted professional chef jacket with heat-resistant buttons and underarm ventilation.',
        'description' => 'Created for high-tempo commercial kitchens and catering teams. Premium twill offers thermal barrier against hot oil splashes, while breathable mesh panels keep chefs cool at the pass.',
        'material' => '65% Polyester, 35% Cotton Heavy Twill (240 GSM)',
        'fit' => 'Chef Traditional Double Breasted',
        'gender' => 'Unisex Adults',
        'care' => 'Hot machine wash, bleach safe for white.',
        'images' => [
            'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
        ]
    ],
    [
        'handle' => 'technical-engineering-workshop-coverall',
        'title' => 'Multi-Pocket Engineering & Technical Workshop Coverall',
        'category' => 'Industrial Uniforms',
        'subcategory' => 'engineering-uniforms',
        'price' => 120,
        'compare_at' => 150,
        'sku' => 'OGU-IND-ENG-204',
        'color' => 'Royal Blue',
        'sizes' => ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
        'short_description' => 'Action-back engineering coverall with 8 heavy-duty utility pockets and two-way brass zipper.',
        'description' => 'The industry benchmark for mechanics, technicians, maintenance crews, and plant engineers. Features reinforced knee pad pouches, hammer loops, and action-back pleats for overhead working ease.',
        'material' => '100% Pre-Shrunk Heavy Cotton Drill (260 GSM)',
        'fit' => 'Heavy Workwear Fit with Elastic Waist',
        'gender' => 'Unisex Adults',
        'care' => 'Machine wash 60°C, commercial dryer safe.',
        'images' => [
            'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
        ]
    ],
    [
        'handle' => 'flame-resistant-oil-gas-coverall-reflective',
        'title' => 'Flame Resistant (FR) Oil & Gas Offshore Coverall with High-Vis Reflective Strips',
        'category' => 'Industrial Uniforms',
        'subcategory' => 'oil-and-gas-uniforms',
        'price' => 195,
        'compare_at' => 240,
        'sku' => 'OGU-IND-OG-205',
        'color' => 'Safety Orange',
        'sizes' => ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
        'short_description' => 'EN ISO 11612 & NFPA 2112 certified inherently flame-resistant offshore boiler suit with 3M reflective tape.',
        'description' => 'Engineered for petroleum refineries, drilling rigs, and offshore oil platforms. Provides guaranteed arc flash and flash fire protection, gas monitor loop, spark-proof non-sparking brass zips, and triple-needle seam construction.',
        'material' => 'Nomex / Aramid FR Blend (220 GSM), NFPA 2112 Compliant',
        'fit' => 'Offshore Safety Boiler Suit Cut',
        'gender' => 'Unisex Adults',
        'care' => 'Industrial wash, no fabric softeners or chlorine bleach.',
        'images' => [
            'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
        ]
    ],
];

// Statements for products, variants, and images
$prodStmt = $pdo->prepare("
    INSERT INTO products (
        handle, title, short_description, description, price, compare_at,
        rating, reviews, brand, status, product_type, kind, category, sku,
        featured, sold_out, payload, created_at, updated_at
    ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, 'active', 'uniform', 'uniforms', ?, ?,
        1, 0, ?, NOW(), NOW()
    )
");

$imgStmt = $pdo->prepare("INSERT INTO product_images (product_handle, url, sort_order) VALUES (?, ?, ?)");
$varStmt = $pdo->prepare("
    INSERT INTO variants (
        id, product_handle, size, color, sku, price, compare_at, stock, low_stock_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 8)
");

$totalVariants = 0;
$totalImages = 0;

foreach ($products as $p) {
    $catSlug = strtolower(str_replace(' ', '-', $p['category']));
    $collections = [$catSlug, $p['subcategory'], 'all-products', 'best-sellers'];

    $payload = [
        'handle' => $p['handle'],
        'title' => $p['title'],
        'shortDescription' => $p['short_description'],
        'description' => $p['description'],
        'price' => $p['price'],
        'compareAt' => $p['compare_at'],
        'brand' => 'Online Gulf Uniform',
        'category' => $p['category'],
        'subcategory' => $p['subcategory'],
        'collections' => $collections,
        'sku' => $p['sku'],
        'color' => $p['color'],
        'sizes' => $p['sizes'],
        'material' => $p['material'],
        'fit' => $p['fit'],
        'gender' => $p['gender'],
        'careInstructions' => $p['care'],
        'images' => $p['images'],
        'productType' => 'uniform',
        'kind' => 'uniforms',
        'featured' => true,
        'soldOut' => false,
        'discount' => round((1 - $p['price'] / $p['compare_at']) * 100),
    ];

    $prodStmt->execute([
        $p['handle'],
        $p['title'],
        $p['short_description'],
        $p['description'],
        $p['price'],
        $p['compare_at'],
        4.9,
        rand(18, 95),
        'Online Gulf Uniform',
        $p['category'],
        $p['sku'],
        json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
    ]);

    // Insert images
    foreach ($p['images'] as $idx => $imgUrl) {
        $imgStmt->execute([$p['handle'], $imgUrl, $idx + 1]);
        $totalImages++;
    }

    // Insert variants
    foreach ($p['sizes'] as $sIdx => $size) {
        $varId = 'var-' . $p['handle'] . '-' . strtolower(str_replace(' ', '', $size));
        $varSku = $p['sku'] . '-' . strtoupper($size);
        $stock = rand(25, 120);
        $varStmt->execute([
            $varId,
            $p['handle'],
            $size,
            $p['color'],
            $varSku,
            $p['price'],
            $p['compare_at'],
            $stock
        ]);
        $totalVariants++;
    }
}

echo "Inserted " . count($products) . " products, $totalImages images, and $totalVariants variants.\n";

// 5. Update content_blocks for storefront
$storefrontNav = [
    ['label' => 'Home', 'href' => '/'],
    ['label' => 'About Us', 'href' => '/pages/about-us'],
    [
        'label' => 'Boys',
        'href' => '/collections/boys',
        'children' => [
            ['label' => 'Pants', 'href' => '/collections/boys-pants'],
            ['label' => 'Dress Shirts Short Sleeve', 'href' => '/collections/boys-dress-shirts-short-sleeve'],
            ['label' => 'Dress shirt Long Sleeve', 'href' => '/collections/boys-dress-shirt-long-sleeve'],
            ['label' => 'PE trousers', 'href' => '/collections/boys-pe-trousers'],
            ['label' => 'PE polo shirts', 'href' => '/collections/boys-pe-polo-shirts'],
            ['label' => 'PE Round Neck T Shirts', 'href' => '/collections/boys-pe-round-neck-t-shirts'],
            ['label' => 'Shorts', 'href' => '/collections/boys-shorts'],
            ['label' => 'Jackets', 'href' => '/collections/boys-jackets'],
        ]
    ],
    [
        'label' => 'Girls',
        'href' => '/collections/girls',
        'children' => [
            ['label' => 'Pants', 'href' => '/collections/girls-pants'],
            ['label' => 'Skirts', 'href' => '/collections/girls-skirts'],
            ['label' => 'Skorts', 'href' => '/collections/girls-skorts'],
            ['label' => 'Pinafore', 'href' => '/collections/girls-pinafore'],
            ['label' => 'Dress Shirts Short Sleeve', 'href' => '/collections/girls-dress-shirts-short-sleeve'],
            ['label' => 'Dress shirt Long Sleeve', 'href' => '/collections/girls-dress-shirt-long-sleeve'],
            ['label' => 'PE trousers', 'href' => '/collections/girls-pe-trousers'],
            ['label' => 'PE polo shirts', 'href' => '/collections/girls-pe-polo-shirts'],
            ['label' => 'PE Round Neck T Shirts', 'href' => '/collections/girls-pe-round-neck-t-shirts'],
            ['label' => 'Jackets', 'href' => '/collections/girls-jackets'],
        ]
    ],
    [
        'label' => 'Industrial uniforms',
        'href' => '/collections/industrial-uniforms',
        'children' => [
            ['label' => 'Polo Shirts', 'href' => '/collections/industrial-polo-shirts'],
            ['label' => 'Corporate Uniform', 'href' => '/collections/corporate-uniform'],
            ['label' => 'Restaurant Uniforms', 'href' => '/collections/restaurant-uniforms'],
            ['label' => 'Engineering Uniforms', 'href' => '/collections/engineering-uniforms'],
            ['label' => 'Oil and Gas Uniforms', 'href' => '/collections/oil-and-gas-uniforms'],
        ]
    ],
    ['label' => 'Track Order', 'href' => '/track'],
    ['label' => 'Contact Us', 'href' => '/policies/contact-information'],
];

$storefrontData = [
    'site' => [
        'brandName' => 'Online Gulf Uniform',
        'logo' => '/logo/online-gulf-uniform-logo.jpg',
        'freeShippingAt' => 500,
        'minOrderAmount' => 50,
        'shippingFlat' => 20,
        'marqueeText' => 'ONLINE GULF UNIFORM • PREMIUM SCHOOL & INDUSTRIAL UNIFORMS IN UAE, GCC & INDIA',
        'whatsapp' => 'https://api.whatsapp.com/send/?phone=971501234567&text=Hello+Online+Gulf+Uniform',
        'returns' => '/policies/refund-policy',
        'instagram' => 'https://www.instagram.com/onlinegulfuniform/',
    ],
    'nav' => $storefrontNav,
    'announcements' => 'PREMIUM SCHOOL & INDUSTRIAL UNIFORMS • FAST DISPATCH ACROSS GCC & INDIA • BULK EMBROIDERY DISCOUNTS AVAILABLE',
    'heroTrustLine' => 'CERTIFIED SAFETY FABRICS • HIGH DURABILITY • CUSTOM EMBROIDERY',
    'heroSlides' => [
        [
            'eyebrow' => 'NEW ACADEMIC SESSION 2026',
            'title' => 'Complete School Uniforms for Boys & Girls',
            'subtitle' => 'Pants, Oxford Shirts, PE Kits, Skirts, Pinafores & Formal Blazers tailored to perfection.',
            'ctaText' => 'Shop School Uniforms',
            'ctaLink' => '/collections/boys',
            'image' => 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1600&q=80',
        ],
        [
            'eyebrow' => 'HEAVY-DUTY INDUSTRIAL WORKWEAR',
            'title' => 'Certified Industrial & Corporate Uniforms',
            'subtitle' => 'Oil & Gas FR Coveralls, Engineering Boiler Suits, Hospitality Chef Coats & Corporate Uniforms.',
            'ctaText' => 'Explore Industrial Uniforms',
            'ctaLink' => '/collections/industrial-uniforms',
            'image' => 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1600&q=80',
        ],
    ],
    'topCategories' => [
        ['label' => 'Boys Uniforms', 'slug' => 'boys', 'image' => 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&q=80'],
        ['label' => 'Girls Uniforms', 'slug' => 'girls', 'image' => 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=600&q=80'],
        ['label' => 'Industrial Uniforms', 'slug' => 'industrial-uniforms', 'image' => 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'],
    ],
    'footer' => [
        'columns' => [
            [
                'title' => 'School Uniforms',
                'links' => [
                    ['label' => 'Boys Pants & Shirts', 'href' => '/collections/boys-pants'],
                    ['label' => 'Girls Skirts & Pinafores', 'href' => '/collections/girls-skirts'],
                    ['label' => 'PE Track Trousers & Polos', 'href' => '/collections/boys-pe-trousers'],
                    ['label' => 'School Blazers & Jackets', 'href' => '/collections/boys-jackets'],
                ]
            ],
            [
                'title' => 'Industrial & Corporate',
                'links' => [
                    ['label' => 'Oil & Gas FR Coveralls', 'href' => '/collections/oil-and-gas-uniforms'],
                    ['label' => 'Engineering Workwear', 'href' => '/collections/engineering-uniforms'],
                    ['label' => 'Restaurant & Chef Coats', 'href' => '/collections/restaurant-uniforms'],
                    ['label' => 'Corporate Uniform Suits', 'href' => '/collections/corporate-uniform'],
                ]
            ],
            [
                'title' => 'Customer Care',
                'links' => [
                    ['label' => 'Track Your Order', 'href' => '/track'],
                    ['label' => 'About Online Gulf Uniform', 'href' => '/pages/about-us'],
                    ['label' => 'Contact Us', 'href' => '/policies/contact-information'],
                    ['label' => 'Size Guide & Measurement', 'href' => '/pages/about-us'],
                ]
            ]
        ],
        'copyright' => 'Copyright © 2026 Online Gulf Uniform. All rights reserved.',
        'blurb' => 'Leading supplier of school uniforms, corporate clothing, and high-performance industrial workwear across the Gulf and India.',
    ]
];

$blockStmt = $pdo->prepare("
    INSERT INTO content_blocks (`key`, `value`, `updated_at`)
    VALUES ('storefront', ?, NOW())
    ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), `updated_at` = NOW()
");
$blockStmt->execute([json_encode($storefrontData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);

echo "Updated content_blocks 'storefront' successfully.\n";
echo "Uniforms Seeding Completed Successfully!\n";
