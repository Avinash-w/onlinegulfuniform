// ---------------------------------------------------------------------------
// DEV-ONLY demo seed builders (used by `npm run seed:export`, never imported at runtime).
//
// The catalogue in src/data/products.js is the source of truth for the shop.
// Here it's expanded into the shapes an e-commerce back office needs:
// variants (size × colour with their own SKU + stock), customers, orders,
// payments, refunds and shipments.
// ---------------------------------------------------------------------------

import { products } from '../data/products.js'
import { nav as siteNav } from '../data/site.js'
import { buildStorefrontContent } from './demoContent.js'

const DAY = 86_400_000

export const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Packed',
  'Shipped',
  'Delivered',
  'Cancelled',
  'Returned',
  'Refunded',
]

export const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded', 'Partially refunded', 'Refund Pending']
export const PAYMENT_METHODS = ['UPI', 'Credit Card', 'Debit Card', 'Card', 'Net Banking', 'COD', 'Wallet']
export const CARRIERS = ['Delhivery', 'Bluedart', 'Ekart', 'Shadowfax', 'XpressBees']
export const ROLES = ['Customer', 'Staff', 'Manager', 'Admin']
export const ADMIN_ROLES = ['Staff', 'Manager', 'Admin']
export const DEMO_ADMIN_PASSWORD = 'evaranest'

/** Deterministic PRNG so the demo data is identical on every seed. */
function rng(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}
const rand = rng(20260811)
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1))

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24)

// ------------------------------------------------------------------ variants
/**
 * One row per sellable unit. Products with a size list or custom variants
 * explode across it; everything else is one-size and gets a single variant.
 */
export function buildVariants() {
  const out = []
  for (const p of products) {
    if (Array.isArray(p.variants) && p.variants.length > 0) {
      for (const v of p.variants) {
        out.push({
          id: v.id || `${p.handle}::${slug(v.size || v.name || 'default')}`,
          productHandle: p.handle,
          size: v.size || v.name || 'One size',
          color: v.color ?? p.color ?? '—',
          sku: v.sku || `${(p.sku ?? p.handle.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}-${slug(v.size || v.name || 'def').toUpperCase()}`,
          price: v.price ?? p.price,
          compareAt: v.compareAt ?? p.compareAt,
          stock: p.soldOut ? 0 : (v.stock ?? int(10, 60)),
          lowStockAt: v.lowStockAt ?? 8,
        })
      }
      continue
    }
    const sizes = p.sizes && p.sizes.length ? p.sizes : ['One size']
    for (const size of sizes) {
      out.push({
        id: `${p.handle}::${slug(size)}`,
        productHandle: p.handle,
        size,
        color: p.color ?? '—',
        sku: `${(p.sku ?? p.handle.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}-${slug(size).toUpperCase()}`,
        price: p.price,
        compareAt: p.compareAt,
        stock: p.soldOut ? 0 : int(0, 60),
        lowStockAt: 8,
      })
    }
  }
  return out
}

// ----------------------------------------------------------------- customers
const FIRST = ['Aarav', 'Diya', 'Neha', 'Rohan', 'Ishita', 'Kabir', 'Ananya', 'Vivaan',
  'Meera', 'Arjun', 'Sara', 'Dev', 'Tara', 'Kian', 'Riya', 'Nikhil', 'Pooja', 'Aditya']
const LAST = ['Sharma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Gupta', 'Singh', 'Bose',
  'Kapoor', 'Menon', 'Joshi', 'Desai', 'Rao', 'Chopra']
const CITIES = [
  ['Mumbai', 'Maharashtra', '400001'], ['Bengaluru', 'Karnataka', '560001'],
  ['Delhi', 'Delhi', '110001'], ['Ahmedabad', 'Gujarat', '380001'],
  ['Pune', 'Maharashtra', '411001'], ['Hyderabad', 'Telangana', '500001'],
  ['Chennai', 'Tamil Nadu', '600001'], ['Kolkata', 'West Bengal', '700001'],
]

export function buildUsers() {
  const users = [
    {
      id: 'u-admin',
      name: 'Dev Deep',
      email: 'devdeeptripathi7@gmail.com',
      phone: '+91 90000 00000',
      role: 'Admin',
      password: DEMO_ADMIN_PASSWORD,
      status: 'Active',
      createdAt: Date.now() - 400 * DAY,
      address: null,
      notes: 'Store owner account.',
    },
    {
      id: 'u-staff',
      name: 'Priya Menon',
      email: 'priya@evaranest.in',
      phone: '+91 90000 00001',
      role: 'Manager',
      password: DEMO_ADMIN_PASSWORD,
      status: 'Active',
      createdAt: Date.now() - 300 * DAY,
      address: null,
      notes: 'Handles fulfilment and returns.',
    },
  ]

  for (let i = 0; i < 24; i++) {
    const first = FIRST[i % FIRST.length]
    const last = LAST[(i * 3) % LAST.length]
    const [city, state, pin] = CITIES[i % CITIES.length]
    const homeLine = `${int(1, 99)}, ${last} Residency`
    const addresses = [
      {
        id: `addr-${100 + i}-home`,
        label: 'Home',
        isDefault: true,
        line1: homeLine,
        city,
        state,
        pin,
        country: 'India',
      },
    ]
    if (rand() > 0.7) {
      addresses.push({
        id: `addr-${100 + i}-work`,
        label: 'Work',
        isDefault: false,
        line1: `${int(1, 40)}, Business Park`,
        city,
        state,
        pin,
        country: 'India',
      })
    }
    users.push({
      id: `u-${100 + i}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
      phone: `+91 9${int(100000000, 999999999)}`,
      role: 'Customer',
      status: rand() > 0.92 ? 'Blocked' : 'Active',
      createdAt: Date.now() - int(5, 360) * DAY,
      address: { line1: homeLine, city, state, pin, country: 'India' },
      addresses,
      notes: '',
    })
  }
  return users
}

// -------------------------------------------------------- orders & payments
export function buildOrders(variants, users) {
  const customers = users.filter((u) => u.role === 'Customer')
  const orders = []
  const payments = []
  const refunds = []
  const shipments = []

  for (let i = 0; i < 38; i++) {
    const user = customers[Math.floor(rand() * customers.length)]
    const lineCount = int(1, 3)
    const lines = []

    for (let l = 0; l < lineCount; l++) {
      const v = variants[Math.floor(rand() * variants.length)]
      const p = products.find((x) => x.handle === v.productHandle)
      if (!p || lines.some((x) => x.variantId === v.id)) continue
      const qty = int(1, 2)
      lines.push({
        variantId: v.id,
        productHandle: v.productHandle,
        title: p.title,
        image: p.images[0],
        size: v.size,
        color: v.color,
        sku: v.sku,
        price: v.price,
        qty,
      })
    }
    if (!lines.length) continue

    const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0)
    const shipping = subtotal >= 999 ? 0 : 49
    const total = subtotal + shipping

    const placedAt = Date.now() - int(0, 75) * DAY
    const status = pick(ORDER_STATUSES)
    const id = `EN${11000 + i}`

    // Payment state has to agree with order state, or the dashboard lies.
    let payStatus = 'Paid'
    if (status === 'Pending') payStatus = 'Pending'
    if (status === 'Cancelled') payStatus = rand() > 0.5 ? 'Refunded' : 'Failed'
    if (status === 'Returned') payStatus = 'Refunded'

    const method = pick(PAYMENT_METHODS)
    orders.push({
      id,
      userId: user.id,
      customerName: user.name,
      email: user.email,
      phone: user.phone,
      lines,
      subtotal,
      shipping,
      discount: 0,
      total,
      status,
      placedAt,
      updatedAt: placedAt,
      address: user.address,
      timeline: [{ at: placedAt, label: 'Order placed', note: `Paid via ${method}` }],
    })

    payments.push({
      id: `PAY-${id}`,
      orderId: id,
      amount: total,
      method,
      status: payStatus,
      transactionId: `TXN${int(100000000, 999999999)}`,
      at: placedAt,
    })

    if (payStatus === 'Refunded') {
      refunds.push({
        id: `RF-${id}`,
        orderId: id,
        amount: total,
        reason: pick(['Damaged in transit', 'Jar broken on arrival', 'Fragrance not as expected', 'Wrong item sent']),
        status: 'Processed',
        at: placedAt + 3 * DAY,
      })
    }

    if (['Shipped', 'Delivered'].includes(status)) {
      const shippedAt = placedAt + int(1, 3) * DAY
      shipments.push({
        id: `SHP-${id}`,
        orderId: id,
        carrier: pick(CARRIERS),
        awb: `AWB${int(100000000, 999999999)}`,
        status: status === 'Delivered' ? 'Delivered' : 'In transit',
        shippedAt,
        deliveredAt: status === 'Delivered' ? shippedAt + int(1, 4) * DAY : null,
        checkpoints: [
          { at: placedAt, label: 'Order placed', city: '—' },
          { at: placedAt + DAY, label: 'Packed at warehouse', city: 'Ahmedabad' },
          { at: shippedAt, label: 'Shipped', city: 'Ahmedabad' },
          ...(status === 'Delivered'
            ? [{ at: shippedAt + 2 * DAY, label: 'Delivered', city: user.address?.city ?? '—' }]
            : [{ at: shippedAt + DAY, label: 'In transit', city: 'Nagpur hub' }]),
        ],
      })
    }
  }

  return { orders, payments, refunds, shipments }
}

/** Category tree for storefront nav + product assignment. Seeded from site nav. */
export function buildCategories() {
  return siteNav.map((item, i) => {
    const isHome = item.href === '/' || item.label.toLowerCase() === 'home'
    const slug = isHome ? 'home' : item.href.replace(/^\/collections\//, '')
    return {
      id: `cat-${slug || i}`,
      name: item.label,
      slug,
      active: true,
      children: (item.children ?? []).map((c, j) => {
        const childSlug = c.href.replace(/^\/collections\//, '')
        return {
          id: `sub-${childSlug || `${slug}-${j}`}`,
          name: c.label,
          slug: childSlug,
          active: true,
        }
      }),
    }
  })
}

export function buildSeed() {
  const variants = buildVariants()
  const users = buildUsers()
  const { orders, payments, refunds, shipments } = buildOrders(variants, users)

  return {
    version: 12,
    // Live catalogue (hydrated from Core PHP API; seed is offline fallback)
    catalogue: products.map((p) => ({ ...p })),
    productOverrides: {},   // handle -> partial product (admin edits)
    customProducts: [],     // products created in the admin
    deletedProducts: [],    // handles hidden from the storefront
    categories: buildCategories(),
    content: buildStorefrontContent(),
    variants,
    users,
    orders,
    payments,
    refunds,
    shipments,
    wishlist: [],           // product handles
    coupons: [
      { code: 'GLOW10', type: 'percent', value: 10, active: true, minCart: 999 },
      { code: 'FLAT200', type: 'flat', value: 200, active: true, minCart: 1499 },
      { code: 'WELCOME5', type: 'percent', value: 5, active: false, minCart: 0 },
    ],
    currentUserId: null,    // storefront session (null = logged out)
    adminUserId: null,      // staff session for /admin (null = logged out)
  }
}
