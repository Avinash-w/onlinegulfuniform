import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const schema1 = readFileSync(join(root, 'api', 'sql', 'schema.sql'), 'utf-8')
const schema2 = readFileSync(join(root, 'api', 'sql', 'schema_phase2.sql'), 'utf-8')
const seed = JSON.parse(readFileSync(join(root, 'api', 'data', 'seed.json'), 'utf-8'))

let out = `-- =======================================================\n`
out += `-- EvaraNest Complete Database Export for Hostinger\n`
out += `-- Domain: https://evaranest.braintechtools.xyz/\n`
out += `-- For direct import in Hostinger phpMyAdmin\n`
out += `-- =======================================================\n\n`
out += `SET NAMES utf8mb4;\n`
out += `SET FOREIGN_KEY_CHECKS = 0;\n\n`

const cleanSchema1 = schema1
  .split(';\n')
  .filter((stmt) => {
    const s = stmt.trim()
    return !s.startsWith('CREATE DATABASE') && !s.startsWith('USE ') && !s.startsWith('--')
  })
  .join(';\n')

out += cleanSchema1 + '\n\n'

const cleanSchema2 = schema2
  .split(';\n')
  .filter((stmt) => {
    const s = stmt.trim()
    return !s.startsWith('USE ') && !s.startsWith('--')
  })
  .join(';\n')

out += cleanSchema2 + '\n\n'

function esc(val) {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return String(val)
  if (typeof val === 'boolean') return val ? '1' : '0'
  const str = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
  return `'${str}'`
}

out += `-- Seed Data: Users\n`
for (const u of seed.users || []) {
  const passHash = '$2y$10$wK1q7O2gA.hXp8u3G9L0he5V0K8YQeW6qWvYy5p7v6U8h4Y5y5k3W'
  out += `INSERT INTO users (id, name, email, phone, role, password_hash, status, notes, created_at) VALUES (${esc(u.id)}, ${esc(u.name)}, ${esc(u.email)}, ${esc(u.phone || null)}, ${esc(u.role)}, ${esc(passHash)}, ${esc(u.status || 'Active')}, ${esc(u.notes || '')}, NOW());\n`
}
out += '\n'

out += `-- Seed Data: Categories & Subcategories\n`
for (let i = 0; i < (seed.categories || []).length; i++) {
  const c = seed.categories[i]
  out += `INSERT INTO categories (id, name, slug, active, sort_order) VALUES (${esc(c.id)}, ${esc(c.name)}, ${esc(c.slug)}, ${c.active ? 1 : 0}, ${i});\n`
  for (let j = 0; j < (c.children || []).length; j++) {
    const s = c.children[j]
    out += `INSERT INTO subcategories (id, category_id, name, slug, active, sort_order) VALUES (${esc(s.id)}, ${esc(c.id)}, ${esc(s.name)}, ${esc(s.slug)}, ${s.active ? 1 : 0}, ${j});\n`
  }
}
out += '\n'

out += `-- Seed Data: Products & Images & Variants\n`
for (const p of seed.products || []) {
  const payload = JSON.stringify(p)
  out += `INSERT INTO products (handle, title, short_description, description, price, compare_at, rating, reviews, brand, status, product_type, kind, category, sku, featured, sold_out, payload) VALUES (${esc(p.handle)}, ${esc(p.title)}, ${esc(p.shortDescription || null)}, ${esc(p.description || null)}, ${p.price || 0}, ${p.compareAt || 'NULL'}, ${p.rating || 0}, ${p.reviews || 0}, ${esc(p.brand || 'EvaraNest')}, ${esc(p.status || 'active')}, ${esc(p.productType || 'candle')}, ${esc(p.kind || 'lifestyle')}, ${esc(p.category || null)}, ${esc(p.sku || null)}, ${p.featured ? 1 : 0}, ${p.soldOut ? 1 : 0}, ${esc(payload)});\n`
  for (let i = 0; i < (p.images || []).length; i++) {
    out += `INSERT INTO product_images (product_handle, url, sort_order) VALUES (${esc(p.handle)}, ${esc(p.images[i])}, ${i});\n`
  }
}
out += '\n'

for (const v of seed.variants || []) {
  out += `INSERT INTO variants (id, product_handle, size, color, sku, price, compare_at, stock, low_stock_at) VALUES (${esc(v.id)}, ${esc(v.productHandle)}, ${esc(v.size)}, ${esc(v.color || '—')}, ${esc(v.sku)}, ${v.price || 0}, ${v.compareAt || 'NULL'}, ${v.stock || 0}, ${v.lowStockAt || 8});\n`
}
out += '\n'

out += `-- Seed Data: Coupons\n`
for (const c of seed.coupons || []) {
  out += `INSERT INTO coupons (code, type, value, active, min_cart) VALUES (${esc(c.code.toUpperCase())}, ${esc(c.type)}, ${c.value || 0}, ${c.active ? 1 : 0}, ${c.minCart || 0});\n`
}
out += '\n'

out += `-- Seed Data: Storefront Content\n`
out += `INSERT INTO content_blocks (\`key\`, \`value\`) VALUES ('storefront', ${esc(JSON.stringify(seed.content || {}))});\n\n`
out += `SET FOREIGN_KEY_CHECKS = 1;\n`

const targetFile = join(root, 'api', 'sql', 'database_hostinger_complete.sql')
writeFileSync(targetFile, out)
console.log('Complete Hostinger SQL generated successfully at:', targetFile)
