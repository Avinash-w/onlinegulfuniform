/**
 * Export frontend seed data to api/data/seed.json for PHP installer.
 * Run: node scripts/export-seed.mjs
 */
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

async function load(rel) {
  return import(pathToFileURL(join(root, rel)).href)
}

const { products } = await load('src/data/products.js')
const { buildVariants, buildCategories, buildUsers, DEMO_ADMIN_PASSWORD } = await load('src/store/demoSeed.js')
const { buildStorefrontContent } = await load('src/store/demoContent.js')

const allUsers = buildUsers()
const staff = allUsers
  .filter((u) => ['Admin', 'Manager', 'Staff'].includes(u.role))
  .map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    password: u.password || DEMO_ADMIN_PASSWORD,
    status: u.status,
    notes: u.notes || '',
    createdAt: u.createdAt,
  }))

const customers = allUsers
  .filter((u) => u.role === 'Customer')
  .slice(0, 12)
  .map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    status: u.status,
    notes: u.notes || '',
    createdAt: u.createdAt,
  }))

const addresses = []
for (const u of allUsers.filter((x) => x.role === 'Customer').slice(0, 12)) {
  for (const a of u.addresses ?? []) {
    addresses.push({ ...a, userId: u.id })
  }
}

const seed = {
  products,
  variants: buildVariants(),
  categories: buildCategories(),
  content: buildStorefrontContent(),
  users: [...staff, ...customers],
  addresses,
  coupons: [
    { code: 'GLOW10', type: 'percent', value: 10, active: true, minCart: 999 },
    { code: 'FLAT200', type: 'flat', value: 200, active: true, minCart: 1499 },
    { code: 'WELCOME5', type: 'percent', value: 5, active: false, minCart: 0 },
  ],
}

const outDir = join(root, 'api', 'data')
mkdirSync(outDir, { recursive: true })
const outFile = join(outDir, 'seed.json')
writeFileSync(outFile, JSON.stringify(seed, null, 2))
console.log('Wrote', outFile)
console.log({
  products: seed.products.length,
  variants: seed.variants.length,
  categories: seed.categories.length,
  users: seed.users.length,
  addresses: seed.addresses.length,
  coupons: seed.coupons.length,
})
