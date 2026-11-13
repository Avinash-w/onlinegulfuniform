// ---------------------------------------------------------------------------
// Derived reads. Kept separate from the reducer so both the admin screens and
// the storefront ask the same questions of the same state.
// ---------------------------------------------------------------------------

import { DEMO_ADMIN_PASSWORD } from './seed.js'

/** Catalogue merged with admin edits, additions and deletions. */
export function allProducts(state) {
  const base = (state.catalogue ?? [])
    .filter((p) => !state.deletedProducts.includes(p.handle))
    .map((p) => ({ ...p, ...(state.productOverrides[p.handle] ?? {}) }))
  return [...(state.customProducts ?? []), ...base]
}

export const productByHandle = (state, handle) =>
  allProducts(state).find((p) => p.handle === handle)

export function isCustomProduct(p) {
  if (!p) return false
  if (p.customizable) return true
  if (p.productType === 'custom-orders') return true
  if (p.category === 'Custom Orders') return true
  return false
}

export const variantsOf = (state, handle) =>
  state.variants.filter((v) => v.productHandle === handle)

/** Total sellable units for a product across all its variants. */
export const stockOf = (state, handle) =>
  variantsOf(state, handle).reduce((n, v) => n + v.stock, 0)

export const lowStockVariants = (state) =>
  state.variants.filter((v) => v.stock > 0 && v.stock <= v.lowStockAt)

export const outOfStockVariants = (state) => state.variants.filter((v) => v.stock === 0)

// ---------------------------------------------------------------- customers
export const customers = (state) => state.users.filter((u) => u.role === 'Customer')
export const staff = (state) => state.users.filter((u) => u.role !== 'Customer')
export const userById = (state, id) => state.users.find((u) => u.id === id)

/** Saved shipping addresses for a customer (legacy `address` is folded in). */
export function userAddresses(user) {
  if (!user) return []
  if (user.addresses?.length) {
    return user.addresses.map((a) => ({
      name: a.name || user.name || '',
      phone: a.phone || user.phone || '',
      email: a.email || user.email || '',
      ...a,
    }))
  }
  if (user.address) {
    return [
      {
        id: `addr-${user.id}-home`,
        label: 'Home',
        isDefault: true,
        name: user.address.name || user.name || '',
        phone: user.address.phone || user.phone || '',
        email: user.address.email || user.email || '',
        ...user.address,
      },
    ]
  }
  return []
}

export function adminUser(state) {
  const user = userById(state, state.adminUserId)
  if (!user) return null
  if (user.status === 'Blocked') return null
  if (!['Staff', 'Manager', 'Admin'].includes(user.role)) return null
  return user
}

/** Look up a staff account by email + password for the admin login screen. */
export function authenticateAdmin(state, email, password) {
  const needle = email.trim().toLowerCase()
  const user = state.users.find(
    (u) =>
      u.email.toLowerCase() === needle &&
      ['Staff', 'Manager', 'Admin'].includes(u.role) &&
      u.status !== 'Blocked'
  )
  if (!user) return { ok: false, error: 'No staff account found for that email.' }
  const expected = user.password || DEMO_ADMIN_PASSWORD
  if (password !== expected) return { ok: false, error: 'Incorrect password.' }
  return { ok: true, user }
}

export const ordersOfUser = (state, userId) =>
  state.orders.filter((o) => o.userId === userId).sort((a, b) => b.placedAt - a.placedAt)

/** Lifetime value — cancelled, returned and refunded orders don't count. */
export function lifetimeValue(state, userId) {
  return ordersOfUser(state, userId)
    .filter((o) => !['Cancelled', 'Returned', 'Refunded'].includes(o.status))
    .reduce((n, o) => n + o.total, 0)
}

// ------------------------------------------------------------------- orders
export const orderById = (state, id) => state.orders.find((o) => o.id === id)
export const paymentOfOrder = (state, id) => state.payments.find((p) => p.orderId === id)
export const shipmentOfOrder = (state, id) => state.shipments.find((s) => s.orderId === id)
export const refundsOfOrder = (state, id) => state.refunds.filter((r) => r.orderId === id)

export function orderByQuery(state, query) {
  if (!query) return null
  const q = String(query).trim().toUpperCase().replace(/^#/, '')
  if (!q) return null

  // 1. Direct or uppercase ID match
  let found = state.orders.find((o) => o.id && o.id.toUpperCase() === q)
  if (found) return found

  // 2. Numeric suffix match e.g. 10001 matches EN10001
  const digits = q.replace(/\D/g, '')
  if (digits && digits.length >= 3) {
    found = state.orders.find((o) => o.id && o.id.replace(/\D/g, '') === digits)
    if (found) return found
  }

  // 3. Match via shipment AWB or shipment ID
  const ship = state.shipments.find(
    (s) =>
      (s.awb && s.awb.toUpperCase() === q) ||
      (s.id && s.id.toUpperCase() === q)
  )
  if (ship) {
    found = state.orders.find((o) => o.id === ship.orderId)
    if (found) return found
  }

  return null
}

export const refundedTotal = (state, orderId) =>
  refundsOfOrder(state, orderId)
    .filter((r) => r.status !== 'Rejected')
    .reduce((n, r) => n + r.amount, 0)

/** What can still be refunded on this order. */
export const refundableAmount = (state, orderId) => {
  const o = orderById(state, orderId)
  if (!o) return 0
  return Math.max(0, o.total - refundedTotal(state, orderId))
}

// ---------------------------------------------------------------- dashboard
const isRevenue = (o) => !['Cancelled', 'Returned', 'Refunded', 'Pending'].includes(o.status)

export function metrics(state) {
  const paid = state.orders.filter(isRevenue)
  const revenue = paid.reduce((n, o) => n + o.total, 0)
  const refunded = state.refunds
    .filter((r) => r.status === 'Processed')
    .reduce((n, r) => n + r.amount, 0)

  return {
    revenue,
    netRevenue: revenue - refunded,
    refunded,
    orderCount: state.orders.length,
    paidCount: paid.length,
    aov: paid.length ? Math.round(revenue / paid.length) : 0,
    customerCount: customers(state).length,
    lowStock: lowStockVariants(state).length,
    outOfStock: outOfStockVariants(state).length,
    pending: state.orders.filter((o) => o.status === 'Pending').length,
    toShip: state.orders.filter((o) => ['Confirmed', 'Packed'].includes(o.status)).length,
    openRefunds: state.refunds.filter((r) => r.status === 'Pending').length,
  }
}

/** Revenue bucketed by day for the dashboard chart. */
export function revenueSeries(state, days = 30) {
  const DAY = 86_400_000
  const start = Date.now() - days * DAY
  const buckets = Array.from({ length: days }, (_, i) => ({
    at: start + i * DAY,
    total: 0,
    orders: 0,
  }))

  for (const o of state.orders) {
    if (!isRevenue(o) || o.placedAt < start) continue
    const idx = Math.min(days - 1, Math.floor((o.placedAt - start) / DAY))
    buckets[idx].total += o.total
    buckets[idx].orders += 1
  }
  return buckets
}

export function statusBreakdown(state) {
  const map = {}
  for (const o of state.orders) map[o.status] = (map[o.status] ?? 0) + 1
  return map
}

/** Best sellers by units shipped. */
export function topProducts(state, limit = 5) {
  const map = new Map()
  for (const o of state.orders) {
    if (!isRevenue(o)) continue
    for (const l of o.lines) {
      const cur = map.get(l.productHandle) ?? { handle: l.productHandle, title: l.title, units: 0, revenue: 0 }
      cur.units += l.qty
      cur.revenue += l.qty * l.price
      map.set(l.productHandle, cur)
    }
  }
  return [...map.values()].sort((a, b) => b.units - a.units).slice(0, limit)
}

// -------------------------------------------------------------- categories
export const allCategories = (state) => state.categories ?? []

export const categoryById = (state, id) => allCategories(state).find((c) => c.id === id)

/** Active categories shaped for Header / MobileMenu (label, href, children). */
export function storefrontNav(state) {
  const customNav = state.content?.nav
  if (Array.isArray(customNav) && customNav.length > 0) {
    return customNav
  }

  return allCategories(state)
    .filter((c) => c.active !== false)
    .map((c) => {
      let href = c.href
      if (!href) {
        const norm = (c.slug || c.name || '').toLowerCase()
        if (norm === 'home') href = '/'
        else if (norm === 'about-us' || norm === 'about us') href = '/pages/about-us'
        else if (norm === 'track-order' || norm === 'track order') href = '/track'
        else if (norm === 'contact-us' || norm === 'contact us') href = '/policies/contact-information'
        else href = `/collections/${c.slug}`
      }
      const children = (c.children ?? [])
        .filter((s) => s.active !== false)
        .map((s) => ({
          label: s.name,
          href: s.href || `/collections/${s.slug}`,
        }))
      return {
        label: c.name,
        href,
        ...(children.length ? { children } : {}),
      }
    })
}

export const categoryNames = (state) =>
  allCategories(state)
    .filter((c) => c.active !== false)
    .map((c) => c.name)

/** Editable storefront CMS blob (hero, filters, homepage, …). */
export function storefrontContent(state) {
  return state.content ?? {}
}

export function siteSettings(state) {
  return storefrontContent(state).site ?? {}
}

export function invoiceSettings(state) {
  return storefrontContent(state).invoice ?? {}
}

export function freeShippingAt(state) {
  return siteSettings(state).freeShippingAt ?? 500
}

/** Smallest cart subtotal allowed to check out. 0 = no minimum. */
export function minOrderAmount(state) {
  return Math.max(0, Number(siteSettings(state).minOrderAmount ?? 50) || 0)
}

export function shippingFlat(state) {
  return siteSettings(state).shippingFlat ?? 20
}

export function pageByPath(state, pathname) {
  const pages = storefrontContent(state).pages ?? []
  const clean = (pathname || '').replace(/\/$/, '') || '/'
  return pages.find((p) => (p.path || '').replace(/\/$/, '') === clean) ?? null
}

export function collectionMetaOf(state, slug) {
  return storefrontContent(state).collectionMeta?.[slug] ?? null
}

export function filterGroupsOf(state) {
  return storefrontContent(state).filterGroups ?? []
}

export function colorSwatchesOf(state) {
  return storefrontContent(state).colorSwatches ?? {}
}

export function subcategoriesOf(state, categoryNameOrId) {
  const cat =
    allCategories(state).find((c) => c.id === categoryNameOrId) ||
    allCategories(state).find((c) => c.name === categoryNameOrId)
  return (cat?.children ?? []).filter((s) => s.active !== false)
}

/** How many live products sit under a category name or subcategory slug. */
export function productsInCategory(state, { name, slug } = {}) {
  const list = allProducts(state)
  if (name && slug) {
    return list.filter(
      (p) => p.category === name || (p.collections ?? []).includes(slug)
    ).length
  }
  if (slug) return list.filter((p) => (p.collections ?? []).includes(slug)).length
  if (name) return list.filter((p) => p.category === name).length
  return 0
}

/** Global admin header search across orders, products, customers and categories. */
export function adminSearch(state, query, { limit = 6 } = {}) {
  const q = query.trim().toLowerCase()
  if (q.length < 1) {
    return { orders: [], products: [], customers: [], categories: [] }
  }

  const orders = state.orders
    .filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q)
    )
    .slice(0, limit)
    .map((o) => ({
      type: 'order',
      id: o.id,
      title: o.id,
      sub: `${o.customerName} · ${o.status}`,
      to: `/admin/orders/${o.id}`,
    }))

  const products = allProducts(state)
    .filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.handle.toLowerCase().includes(q) ||
        (p.category ?? '').toLowerCase().includes(q) ||
        (p.collections ?? []).some((c) => c.toLowerCase().includes(q))
    )
    .slice(0, limit)
    .map((p) => ({
      type: 'product',
      id: p.handle,
      title: p.title,
      sub: p.category || p.handle,
      to: `/admin/products/${p.handle}`,
    }))

  const customers = state.users
    .filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone ?? '').toLowerCase().includes(q)
    )
    .slice(0, limit)
    .map((u) => ({
      type: 'customer',
      id: u.id,
      title: u.name,
      sub: `${u.email} · ${u.role}`,
      to: `/admin/customers/${u.id}`,
    }))

  const categories = []
  for (const c of allCategories(state)) {
    if (c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)) {
      categories.push({
        type: 'category',
        id: c.id,
        title: c.name,
        sub: `Category · /${c.slug}`,
        to: '/admin/categories',
      })
    }
    for (const s of c.children ?? []) {
      if (s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q)) {
        categories.push({
          type: 'category',
          id: s.id,
          title: s.name,
          sub: `Subcategory of ${c.name}`,
          to: '/admin/categories',
        })
      }
    }
  }

  return {
    orders,
    products,
    customers,
    categories: categories.slice(0, limit),
  }
}

export const wishlistProducts = (state) =>
  allProducts(state).filter((p) => (state.wishlist ?? []).includes(p.handle))
