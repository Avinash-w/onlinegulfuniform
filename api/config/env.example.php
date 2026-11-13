<?php
/**
 * Copy to env.php and adjust for your XAMPP MySQL.
 */
return [
    'db_host' => '127.0.0.1',
    'db_port' => '3306',
    'db_name' => 'evaranest',
    'db_user' => 'root',
    'db_pass' => '',
    'db_charset' => 'utf8mb4',

    // Public base URL of this API (no trailing slash)
    'api_base_url' => 'http://localhost/juneberry/api',

    // Comma-separated origins allowed for CORS (Vite + Apache)
    'cors_origins' => 'http://localhost:5173,http://127.0.0.1:5173,http://localhost,http://127.0.0.1',

    // Admin token lifetime in seconds (7 days)
    'token_ttl' => 604800,

    // Storefront public URL (used for email invoice & tracking links)
    'storefront_url' => 'http://localhost:5173',

    // ==========================================
    // Email / Gmail SMTP Settings
    // ==========================================
    // Set smtp_enabled to true to send emails via Gmail SMTP.
    // For Gmail: Generate an "App Password" at https://myaccount.google.com/apppasswords
    'smtp_enabled' => true,
    'smtp_host' => 'smtp.gmail.com',
    'smtp_port' => 587,
    'smtp_encryption' => 'tls', // 'tls' (port 587) or 'ssl' (port 465)
    'smtp_user' => 'your-email@gmail.com', // Enter your Gmail address
    'smtp_pass' => 'xxxx xxxx xxxx xxxx',  // Enter your 16-character Gmail App Password
    'mail_from_email' => 'support@evaranest.com',
    'mail_from_name' => 'EvaraNest Lifestyle',
    'smtp_timeout' => 15,
];
