import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const targetDir = join(root, 'hostinger-ready')
const targetZip = join(root, 'hostinger-ready.zip')
const LIVE_URL = 'https://evaranest.braintechtools.xyz'

console.log('Generating dynamic sitemap.xml and robots.txt for SEO...')
execSync('node scripts/generate-sitemap.mjs', { cwd: root, stdio: 'inherit' })

console.log('Building Vite frontend bundle for ' + LIVE_URL + ' ...')
execSync('npm run build', { cwd: root, stdio: 'inherit' })

console.log('Generating complete standalone SQL dump...')
execSync('node scripts/export-sql.mjs', { cwd: root, stdio: 'inherit' })

console.log('Preparing clean hostinger-ready directory...')
if (existsSync(targetDir)) {
  rmSync(targetDir, { recursive: true, force: true })
}
mkdirSync(targetDir, { recursive: true })

// 1. Copy dist contents to hostinger-ready/
const distDir = join(root, 'dist')
cpSync(distDir, targetDir, { recursive: true })

// 2. Copy api to hostinger-ready/api
const apiTarget = join(targetDir, 'api')
mkdirSync(apiTarget, { recursive: true })

const apiDirs = ['config', 'controllers', 'data', 'lib', 'sql', 'uploads']
for (const d of apiDirs) {
  const srcD = join(root, 'api', d)
  const dstD = join(apiTarget, d)
  if (existsSync(srcD)) {
    cpSync(srcD, dstD, { recursive: true })
  } else {
    mkdirSync(dstD, { recursive: true })
  }
}

// Ensure uploads directory exists with .gitkeep
const uploadsDir = join(apiTarget, 'uploads')
mkdirSync(uploadsDir, { recursive: true })
writeFileSync(join(uploadsDir, '.gitkeep'), '')

// Copy API root files
const apiFiles = ['index.php', 'install.php', 'README.md']
for (const f of apiFiles) {
  const srcF = join(root, 'api', f)
  if (existsSync(srcF)) {
    cpSync(srcF, join(apiTarget, f))
  }
}

// 3. Write Root .htaccess (React SPA + API Bypass + Security + Gzip + 404 Fallback)
const rootHtaccess = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Pass Authorization header to PHP
  RewriteCond %{HTTP:Authorization} .
  RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

  # 1. Do NOT rewrite API calls (Handled by api/.htaccess & PHP)
  RewriteCond %{REQUEST_URI} ^/api(/.*)?$ [NC]
  RewriteRule ^ - [L]

  # 2. Do NOT rewrite sitemap.xml or robots.txt
  RewriteCond %{REQUEST_URI} ^/(sitemap\.xml|robots\.txt)$ [NC]
  RewriteRule ^ - [L]

  # 3. Serve static files/folders directly if they exist
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 4. Fallback all frontend deep-link routes to React index.html
  RewriteRule ^ index.html [QSA,L]
</IfModule>

# Fallback 404 handler for direct deep links and browser refresh
ErrorDocument 404 /index.html

# Disable Directory Browsing
Options -Indexes

# Gzip Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json application/xml application/rss+xml image/svg+xml
</IfModule>

# Browser Caching for Performance
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>

# Security Headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
`
writeFileSync(join(targetDir, '.htaccess'), rootHtaccess)

// 4. Write API .htaccess
const apiHtaccess = `<IfModule mod_rewrite.c>
  RewriteEngine On

  # Pass Authorization header through to PHP (Apache/Hostinger strips it by default)
  RewriteCond %{HTTP:Authorization} .
  RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

  # Serve uploaded files / static assets directly if they exist
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Route all API endpoints to index.php
  RewriteRule ^ index.php [QSA,L]
</IfModule>

# Disable Directory Browsing
Options -Indexes
`
writeFileSync(join(apiTarget, '.htaccess'), apiHtaccess)

// 5. Write Hostinger-ready api/config/env.php configured specifically for evaranest.braintechtools.xyz
const hostingerEnv = `<?php
/**
 * Hostinger Production Configuration for ${LIVE_URL}
 * 
 * Step 1: Create a MySQL Database in Hostinger hPanel -> Databases -> MySQL Databases.
 * Step 2: Put your database credentials below.
 */
return [
    // Hostinger Database Connection
    'db_host' => 'localhost', // Usually 'localhost' or '127.0.0.1' on Hostinger
    'db_port' => '3306',
    'db_name' => 'YOUR_HOSTINGER_DB_NAME',     // e.g. u123456789_evaranest
    'db_user' => 'YOUR_HOSTINGER_DB_USER',     // e.g. u123456789_admin
    'db_pass' => 'YOUR_HOSTINGER_DB_PASSWORD', // Hostinger DB user password
    'db_charset' => 'utf8mb4',

    // API Base URL
    'api_base_url' => '${LIVE_URL}/api',

    // Allowed CORS Origins
    'cors_origins' => '${LIVE_URL},http://evaranest.braintechtools.xyz,http://localhost:5173,http://localhost',

    // Admin/Customer Token TTL (7 days in seconds)
    'token_ttl' => 604800,

    // Storefront public URL (used for email invoice & tracking links)
    'storefront_url' => '${LIVE_URL}',

    // ==========================================
    // Email / Gmail SMTP Settings
    // ==========================================
    'smtp_enabled' => true,
    'smtp_host' => 'smtp.gmail.com',
    'smtp_port' => 587,
    'smtp_encryption' => 'tls',
    'smtp_user' => 'rehanshi.in@gmail.com',
    'smtp_pass' => 'vlvt jgku xfzn mxeh',
    'mail_from_email' => 'rehanshi.in@gmail.com',
    'mail_from_name' => 'EvaraNest Lifestyle',
    'smtp_timeout' => 15,
];
`
writeFileSync(join(apiTarget, 'config', 'env.php'), hostingerEnv)
writeFileSync(join(apiTarget, 'config', 'env.example.php'), hostingerEnv)

// 6. Copy standalone SQL dump to root for 1-click phpMyAdmin import
const sqlDumpSrc = join(root, 'api', 'sql', 'database_hostinger_complete.sql')
if (existsSync(sqlDumpSrc)) {
  cpSync(sqlDumpSrc, join(targetDir, 'database_import.sql'))
}

// 7. Write Comprehensive Deployment Guide for evaranest.braintechtools.xyz
const guide = `# Hostinger Deployment Guide for https://evaranest.braintechtools.xyz/

---

## English Quick Steps

### Step 1: Create MySQL Database on Hostinger
1. Log in to your **Hostinger hPanel**.
2. Go to **Databases** -> **MySQL Databases**.
3. Create a new Database and User:
   - Database Name: (e.g., \`u123456789_evaranest\`)
   - Username: (e.g., \`u123456789_admin\`)
   - Password: (e.g., \`YourStrongPassword123!\`)
   *(Save these details!)*

### Step 2: Upload Files to Hostinger
1. Go to **hPanel** -> **File Manager**.
2. Open your subdomain directory:
   - Go to \`public_html/evaranest\` (or the folder created by Hostinger for \`evaranest.braintechtools.xyz\`).
3. Upload \`hostinger-ready.zip\` and click **Extract** (or upload all contents of the \`hostinger-ready\` folder).
4. Ensure \`.htaccess\` is uploaded (enable "Show Hidden Files" in File Manager settings if needed).

### Step 3: Configure Database Credentials
1. In File Manager, open \`api/config/env.php\`.
2. Fill in your Hostinger MySQL details from Step 1:
   \`\`\`php
   'db_name' => 'u123456789_evaranest',
   'db_user' => 'u123456789_admin',
   'db_pass' => 'YourStrongPassword123!',
   \`\`\`
3. Click **Save**.

### Step 4: Import Database (Choose Option A or Option B)

- **Option A (One-Click Browser Setup - Recommended):**
  Open this URL in your browser:
  \`https://evaranest.braintechtools.xyz/api/install.php?key=evaranest-install\`
  You will see: \`Install complete.\`

- **Option B (phpMyAdmin Direct Import):**
  1. In Hostinger hPanel -> **Databases** -> click **Enter phpMyAdmin** next to your database.
  2. Click **Import** tab at the top.
  3. Choose the file \`database_import.sql\` (included in the root folder) and click **Go / Import**.

### Step 5: Test Your Website
1. Open \`https://evaranest.braintechtools.xyz/\`
2. Frontend and Backend are now fully connected and working!
3. Admin Login URL: \`https://evaranest.braintechtools.xyz/admin/login\`
   - **Admin Email:** \`devdeeptripathi7@gmail.com\` | **Password:** \`evaranest\`
   - **Manager Email:** \`priya@evaranest.in\` | **Password:** \`evaranest\`

---

## हिंदी में आसान स्टेप्स (Hindi Guide)

### स्टेप 1: Hostinger में Database बनाएं
1. **Hostinger hPanel** खोलें।
2. **Databases** -> **MySQL Databases** पर जाएं।
3. नया Database और User बनाएं (Database Name, Username और Password नोट कर लें)।

### स्टेप 2: फाइलें अपलोड करें
1. Hostinger के **File Manager** में जाएं।
2. Subdomain वाले फोल्डर (जैसे \`public_html/evaranest\` ya jo bhi Hostinger ne \`evaranest.braintechtools.xyz\` ke liye banaya hai) में जाएं।
3. \`hostinger-ready.zip\` फाइल अपलोड करें और **Extract** (Unzip) कर दें।
4. ध्यान दें कि \`.htaccess\` फाइल भी मौजूद हो।

### स्टेप 3: Database Password सेट करें
1. File Manager में \`api/config/env.php\` को Edit करें।
2. अपना Database Name, User Name और Password डालकर Save कर दें:
   \`\`\`php
   'db_name' => 'u123456789_evaranest',
   'db_user' => 'u123456789_admin',
   'db_pass' => 'YourStrongPassword123!',
   \`\`\`

### स्टेप 4: Database Install करें
ब्राउज़र में यह लिंक खोलें:
👉 \`https://evaranest.braintechtools.xyz/api/install.php?key=evaranest-install\`
(स्क्रीन पर "Install complete" लिखा आ जाएगा)

### स्टेप 5: वेबसाइट चेक करें
- वेबसाइट खोलें: \`https://evaranest.braintechtools.xyz/\`
- Admin Login पेज: \`https://evaranest.braintechtools.xyz/admin/login\`
  - **Admin Email:** \`devdeeptripathi7@gmail.com\` | **Password:** \`evaranest\`
  - **Manager Email:** \`priya@evaranest.in\` | **Password:** \`evaranest\`

---
All Done! 🎉
`
writeFileSync(join(targetDir, 'HOW_TO_DEPLOY.md'), guide)

console.log('Successfully created hostinger-ready package at:', targetDir)

// 8. Create ZIP archive for effortless upload
console.log('Creating hostinger-ready.zip archive...')
if (existsSync(targetZip)) {
  rmSync(targetZip, { force: true })
}
try {
  execSync(`powershell -Command "Compress-Archive -Path '${targetDir}\\*' -DestinationPath '${targetZip}' -Force"`, { cwd: root, stdio: 'inherit' })
  console.log('Successfully created zip archive at:', targetZip)
} catch (e) {
  console.log('Note: ZIP archive generation skipped or failed:', e.message)
}
