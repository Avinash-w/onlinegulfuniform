<?php
return [
    'db_host' => 'srv1836.hstgr.io',
    'db_port' => '3306',
    'db_name' => 'u290025640_uniform',
    'db_user' => 'u290025640_OnlinUniform',
    'db_pass' => 'admin7091',
    'db_charset' => 'utf8mb4',
    'api_base_url' => 'https://deorajcontracting.com/api',
    'cors_origins' => 'https://deorajcontracting.com/api',
    // Admin token lifetime in seconds (7 days)
    'token_ttl' => 604800,

    // Storefront public URL (used for email invoice & tracking links)
    'storefront_url' => 'https://deorajcontracting.com/api',

    // ==========================================
    // Email / Gmail SMTP Settings
    // ==========================================
    // Set smtp_enabled to true to send emails via Gmail SMTP.
    // For Gmail: Generate an "App Password" at https://myaccount.google.com/apppasswords
    'smtp_enabled' => true,
    'smtp_host' => 'smtp.gmail.com',
    'smtp_port' => 587,
    'smtp_encryption' => 'tls',
    'smtp_user' => 'evaranestcandles@gmail.com',
    'smtp_pass' => 'ekwj lvqt njfx khys',
    'mail_from_email' => 'evaranestcandles@gmail.com',
    'mail_from_name' => 'EvaraNest Lifestyle',
    'smtp_timeout' => 15,

    // ==========================================
    // Razorpay API Credentials
    // ==========================================
    'razorpay_key_id' => 'rzp_test_SYaRfW9FWD0rjc',
    'razorpay_key_secret' => '',
];

