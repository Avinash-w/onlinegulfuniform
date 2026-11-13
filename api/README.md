# EvaraNest API setup (XAMPP)

## 1. Configure MySQL

Copy `api/config/env.example.php` → `api/config/env.php` (defaults work for XAMPP root with empty password).

## 2. Seed the database

```bash
npm run seed:export
npm run seed:install
# or: php api/install.php
# browser: http://localhost/juneberry/api/install.php?key=evaranest-install
```

## 3. Verify

- http://localhost/juneberry/api/
- http://localhost/juneberry/api/bootstrap

## 4. Frontend

```bash
npm install
npm run dev
```

Set `VITE_API_BASE=http://localhost/juneberry/api` in `.env`.

Admin: `/admin/login` — `devdeeptripathi7@gmail.com` / `evaranest`
