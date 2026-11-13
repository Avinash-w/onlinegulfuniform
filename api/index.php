<?php

declare(strict_types=1);

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/lib/Response.php';
require_once __DIR__ . '/lib/Auth.php';
require_once __DIR__ . '/lib/Validator.php';
require_once __DIR__ . '/lib/Router.php';
require_once __DIR__ . '/lib/ProductMapper.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/ProductController.php';
require_once __DIR__ . '/controllers/CategoryController.php';
require_once __DIR__ . '/controllers/VariantController.php';
require_once __DIR__ . '/controllers/ContentController.php';
require_once __DIR__ . '/controllers/UploadController.php';
require_once __DIR__ . '/controllers/CustomerAuthController.php';
require_once __DIR__ . '/controllers/OrderController.php';
require_once __DIR__ . '/controllers/CouponController.php';
require_once __DIR__ . '/controllers/PaymentController.php';
require_once __DIR__ . '/controllers/EnquiryController.php';
require_once __DIR__ . '/controllers/ReviewController.php';
require_once __DIR__ . '/lib/OrderMapper.php';

apply_cors();

// Serve uploaded files directly if rewritten here
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($uri, PHP_URL_PATH) ?: '/';

// Normalize: /juneberry/api/... → /...
$baseCandidates = ['/juneberry/api', '/api'];
foreach ($baseCandidates as $base) {
    if (str_starts_with($path, $base)) {
        $path = substr($path, strlen($base)) ?: '/';
        break;
    }
}
$path = '/' . trim($path, '/');
if ($path !== '/') {
    $path = rtrim($path, '/');
}

// Static uploads
if (str_starts_with($path, '/uploads/')) {
    $file = __DIR__ . $path;
    if (is_file($file)) {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        header('Content-Type: ' . $finfo->file($file));
        header('Cache-Control: public, max-age=86400');
        readfile($file);
        exit;
    }
    Response::error('File not found.', 404);
}

$method = request_method();
$router = new Router();

$router->get('/', function () {
    Response::ok([
        'name' => 'EvaraNest API',
        'version' => '1.0',
        'status' => 'ok',
    ]);
});

$router->get('/bootstrap', function () {
    $_GET['limit'] = '200';
    $_GET['include_deleted'] = '1';

    // Reuse controllers by composing responses without exit — fetch via PDO.
    require_once __DIR__ . '/controllers/CategoryController.php';

    $prodRows = db()->query(
        'SELECT * FROM products ORDER BY created_at DESC, featured DESC, title ASC'
    )->fetchAll();
    $products = [];
    $variants = [];
    $deletedHandles = [];
    $imgStmt = db()->prepare(
        'SELECT url FROM product_images WHERE product_handle = ? ORDER BY sort_order ASC, id ASC'
    );
    $varStmt = db()->prepare(
        'SELECT * FROM variants WHERE product_handle = ? AND deleted_at IS NULL ORDER BY id ASC'
    );
    foreach ($prodRows as $row) {
        $imgStmt->execute([$row['handle']]);
        $images = array_map(fn($r) => ['url' => $r['url']], $imgStmt->fetchAll());
        $varStmt->execute([$row['handle']]);
        $vrows = $varStmt->fetchAll();
        $product = ProductMapper::rowToProduct($row, $images, $vrows);
        if (!empty($product['_variants'])) {
            foreach ($product['_variants'] as $v) {
                $variants[] = $v;
            }
            unset($product['_variants']);
        }
        if (!empty($row['deleted_at'])) {
            $deletedHandles[] = $row['handle'];
        } else {
            $products[] = $product;
        }
    }

    require_once __DIR__ . '/controllers/ContentController.php';
    $content = ContentController::getStorefront();

    $couponRows = [];
    try {
        $couponRows = db()->query('SELECT * FROM coupons WHERE deleted_at IS NULL ORDER BY code ASC')->fetchAll();
    } catch (Throwable $e) {
        $couponRows = [];
    }

    Response::ok([
        'products' => $products,
        'variants' => $variants,
        'deletedProducts' => $deletedHandles,
        'categories' => CategoryController::tree(),
        'content' => $content,
        'coupons' => array_map([OrderMapper::class, 'coupon'], $couponRows),
    ]);
});

// Auth
$router->post('/auth/login', [AuthController::class, 'login']);
$router->post('/auth/logout', [AuthController::class, 'logout'], true);
$router->get('/auth/me', [AuthController::class, 'me'], true);
$router->patch('/auth/profile', [AuthController::class, 'updateProfile'], true);
$router->post('/auth/password', [AuthController::class, 'changePassword'], true);

// Public catalog
$router->get('/products', [ProductController::class, 'index']);
$router->get('/products/{handle}', [ProductController::class, 'show']);
$router->get('/categories', [CategoryController::class, 'index']);
$router->get('/content', [ContentController::class, 'all']);
$router->get('/content/{key}', [ContentController::class, 'get']);
$router->get('/variants', [StockController::class, 'index']);

// Reviews (public list / customer submit / admin moderation)
$router->get('/products/{handle}/reviews', [ReviewController::class, 'forProduct']);
$router->post('/products/{handle}/reviews', [ReviewController::class, 'create']);
$router->get('/reviews', [ReviewController::class, 'adminIndex'], true);
$router->patch('/reviews/{id}', [ReviewController::class, 'updateStatus'], true);
$router->delete('/reviews/{id}', [ReviewController::class, 'delete'], true);

// Admin products
$router->post('/products',[ProductController::class, 'create'], true);
$router->put('/products/{handle}', [ProductController::class, 'update'], true);
$router->patch('/products/{handle}', [ProductController::class, 'update'], true);
$router->delete('/products/{handle}', [ProductController::class, 'delete'], true);
$router->post('/products/{handle}/restore', [ProductController::class, 'restore'], true);

// Variants + stock
$router->post('/variants', [VariantController::class, 'create'], true);
$router->put('/variants/{id}', [VariantController::class, 'update'], true);
$router->patch('/variants/{id}', [VariantController::class, 'update'], true);
$router->delete('/variants/{id}', [VariantController::class, 'delete'], true);
$router->post('/variants/{id}/restore', [VariantController::class, 'restore'], true);
$router->post('/stock/adjust', [StockController::class, 'adjust'], true);
$router->post('/stock/set', [StockController::class, 'set'], true);

// Categories
$router->post('/categories', [CategoryController::class, 'create'], true);
$router->put('/categories/{id}', [CategoryController::class, 'update'], true);
$router->patch('/categories/{id}', [CategoryController::class, 'update'], true);
$router->delete('/categories/{id}', [CategoryController::class, 'delete'], true);
$router->post('/categories/{id}/restore', [CategoryController::class, 'restore'], true);
$router->post('/categories/{id}/move', [CategoryController::class, 'move'], true);
$router->post('/subcategories', [CategoryController::class, 'createSub'], true);
$router->put('/subcategories/{id}', [CategoryController::class, 'updateSub'], true);
$router->patch('/subcategories/{id}', [CategoryController::class, 'updateSub'], true);
$router->delete('/subcategories/{id}', [CategoryController::class, 'deleteSub'], true);
$router->post('/subcategories/{id}/restore', [CategoryController::class, 'restoreSub'], true);
$router->post('/subcategories/{id}/move', [CategoryController::class, 'moveSub'], true);

// Content
$router->put('/content', [ContentController::class, 'setStorefront'], true);
$router->patch('/content', [ContentController::class, 'patchSection'], true);
$router->post('/content', [ContentController::class, 'setStorefront'], true);

// Uploads
$router->post('/uploads', [UploadController::class, 'upload']);
$router->post('/upload', [UploadController::class, 'upload']);

// Customer auth (OTP), Profile, Password & Addresses
$router->post('/customer/otp/request', [CustomerAuthController::class, 'requestOtp']);
$router->post('/customer/otp/verify', [CustomerAuthController::class, 'verifyOtp']);
$router->get('/customer/me', [CustomerAuthController::class, 'me']);
$router->patch('/customer/profile', [CustomerAuthController::class, 'updateProfile']);
$router->post('/customer/password', [CustomerAuthController::class, 'changePassword']);
$router->post('/customer/logout', [CustomerAuthController::class, 'logout']);
$router->get('/customer/addresses', [CustomerAuthController::class, 'getAddresses']);
$router->post('/customer/addresses', [CustomerAuthController::class, 'addAddress']);
$router->put('/customer/addresses/{id}', [CustomerAuthController::class, 'updateAddress']);
$router->patch('/customer/addresses/{id}', [CustomerAuthController::class, 'updateAddress']);
$router->delete('/customer/addresses/{id}', [CustomerAuthController::class, 'deleteAddress']);
$router->patch('/customer/addresses/{id}/default', [CustomerAuthController::class, 'setDefaultAddress']);

// Coupons
$router->get('/coupons', [CouponController::class, 'index']);
$router->post('/coupons/validate', [CouponController::class, 'validate']);
$router->post('/coupons', [CouponController::class, 'create'], true);
$router->put('/coupons/{code}', [CouponController::class, 'update'], true);
$router->patch('/coupons/{code}', [CouponController::class, 'update'], true);
$router->delete('/coupons/{code}', [CouponController::class, 'delete'], true);
$router->post('/coupons/{code}/restore', [CouponController::class, 'restore'], true);

// Wishlist
$router->get('/wishlist', [WishlistController::class, 'index']);
$router->post('/wishlist/toggle', [WishlistController::class, 'toggle']);
$router->post('/wishlist/clear', [WishlistController::class, 'clear']);

// Orders
$router->get('/orders', [OrderController::class, 'index']);
$router->get('/orders/track', [OrderController::class, 'track']);
$router->get('/orders/track/{query}', [OrderController::class, 'track']);
$router->post('/orders/otp/request', [OrderController::class, 'requestOtp']);
$router->post('/orders/otp/verify', [OrderController::class, 'verifyOtp']);
$router->get('/orders/{id}', [OrderController::class, 'show']);
$router->post('/orders', [OrderController::class, 'create']);
$router->post('/orders/{id}/cancel', [OrderController::class, 'cancel']);
$router->put('/orders/{id}', [OrderController::class, 'updateOrder'], true);
$router->patch('/orders/{id}', [OrderController::class, 'updateOrder'], true);
$router->patch('/orders/{id}/status', [OrderController::class, 'updateStatus'], true);
$router->patch('/orders/{id}/delivery-date', [OrderController::class, 'updateDeliveryDate'], true);
$router->delete('/orders/{id}', [OrderController::class, 'delete'], true);
$router->post('/orders/{id}/restore', [OrderController::class, 'restore'], true);
$router->post('/orders/{id}/notes', [OrderController::class, 'addNote'], true);

// Payments / refunds
$router->patch('/payments/{id}', [PaymentController::class, 'update'], true);
$router->post('/refunds', [RefundController::class, 'create'], true);
$router->patch('/refunds/{id}', [RefundController::class, 'updateStatus'], true);

// Customers (admin)
$router->get('/customers', [CustomerController::class, 'index'], true);
$router->post('/customers', [CustomerController::class, 'create'], true);
$router->patch('/customers/{id}', [CustomerController::class, 'update'], true);
$router->delete('/customers/{id}', [CustomerController::class, 'delete'], true);
$router->post('/customers/{id}/restore', [CustomerController::class, 'restore'], true);

// Custom Enquiries
$router->post('/enquiries', [EnquiryController::class, 'create']);
$router->get('/enquiries', [EnquiryController::class, 'index'], true);
$router->patch('/enquiries/{id}', [EnquiryController::class, 'update'], true);
$router->delete('/enquiries/{id}', [EnquiryController::class, 'delete'], true);
$router->post('/enquiries/{id}/restore', [EnquiryController::class, 'restore'], true);

try {
    $router->dispatch($method, $path === '' ? '/' : $path);
} catch (Throwable $e) {
    error_log('[evaranest-api] ' . $e->getMessage() . "\n" . $e->getTraceAsString());
    Response::error('Something went wrong. Please try again.', 500);
}
