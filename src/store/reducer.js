// ---------------------------------------------------------------------------
// Every mutation in the platform, in one place.
//
// Pure functions of (state, action) -> state, so the whole back office can be
// exercised headlessly in tests without mounting React.
// ---------------------------------------------------------------------------

import { buildSeed } from './seed.js'
import { mergeContentDefaults } from './contentSeed.js'

const now = () => Date.now()

const touch = (order, label, note) => ({
  ...order,
  updatedAt: now(),
  timeline: [...order.timeline, { at: now(), label, note }],
})

export function reducer(state, action) {
  switch (action.type) {
    // ---------------------------------------------------- API catalog hydrate
    case 'catalog/hydrate': {
      const {
        products = [],
        variants = state.variants,
        categories = state.categories,
        content = state.content,
        deletedProducts = [],
      } = action
      return {
        ...state,
        catalogue: products,
        variants,
        categories,
        content: mergeContentDefaults(content ?? state.content),
        deletedProducts,
        productOverrides: {},
        customProducts: [],
        catalogReady: true,
      }
    }

    case 'catalog/markReady':
      return { ...state, catalogReady: true }

    case 'catalog/setCategories':
      return { ...state, categories: action.categories }

    case 'catalog/setContent':
      return { ...state, content: mergeContentDefaults(action.content) }

    case 'catalog/setVariant': {
      const v = action.variant
      const exists = state.variants.some((x) => x.id === v.id)
      return {
        ...state,
        variants: exists
          ? state.variants.map((x) => (x.id === v.id ? v : x))
          : [...state.variants, v],
      }
    }

    case 'catalog/removeVariant':
      return { ...state, variants: state.variants.filter((v) => v.id !== action.id) }

    // ------------------------------------------------------------- products
    case 'product/create': {
      const p = action.product
      // Prefer catalogue (API-backed). customProducts kept for legacy local creates.
      if (action.fromApi) {
        return {
          ...state,
          catalogue: [...(state.catalogue ?? []).filter((x) => x.handle !== p.handle), p],
          deletedProducts: state.deletedProducts.filter((h) => h !== p.handle),
        }
      }
      return { ...state, customProducts: [...state.customProducts, p] }
    }

    case 'product/update': {
      const { handle, patch } = action
      const inCatalogue = (state.catalogue ?? []).some((p) => p.handle === handle)
      if (inCatalogue || action.fromApi) {
        return {
          ...state,
          catalogue: (state.catalogue ?? []).map((p) =>
            p.handle === handle ? { ...p, ...patch } : p
          ),
          productOverrides: Object.fromEntries(
            Object.entries(state.productOverrides).filter(([h]) => h !== handle)
          ),
        }
      }
      const isCustom = state.customProducts.some((p) => p.handle === handle)
      if (isCustom) {
        return {
          ...state,
          customProducts: state.customProducts.map((p) =>
            p.handle === handle ? { ...p, ...patch } : p
          ),
        }
      }
      return {
        ...state,
        productOverrides: {
          ...state.productOverrides,
          [handle]: { ...(state.productOverrides[handle] ?? {}), ...patch },
        },
      }
    }

    case 'product/delete':
      return {
        ...state,
        catalogue: (state.catalogue ?? []).filter((p) => p.handle !== action.handle),
        customProducts: state.customProducts.filter((p) => p.handle !== action.handle),
        deletedProducts: [...new Set([...state.deletedProducts, action.handle])],
        variants: action.keepVariants
          ? state.variants
          : state.variants.filter((v) => v.productHandle !== action.handle),
      }

    case 'product/restore': {
      const restored = action.product
      return {
        ...state,
        deletedProducts: state.deletedProducts.filter((h) => h !== action.handle),
        catalogue: restored
          ? [
              ...(state.catalogue ?? []).filter((p) => p.handle !== restored.handle),
              restored,
            ]
          : state.catalogue,
      }
    }

    // ------------------------------------------------------------- variants
    case 'variant/create':
      return { ...state, variants: [...state.variants, action.variant] }

    case 'variant/update':
      return {
        ...state,
        variants: state.variants.map((v) =>
          v.id === action.id ? { ...v, ...action.patch } : v
        ),
      }

    case 'variant/delete':
      return { ...state, variants: state.variants.filter((v) => v.id !== action.id) }

    // ---------------------------------------------------------------- stock
    case 'stock/adjust': {
      // delta may be negative; stock can never go below zero.
      return {
        ...state,
        variants: state.variants.map((v) =>
          v.id === action.id ? { ...v, stock: Math.max(0, v.stock + action.delta) } : v
        ),
      }
    }

    case 'stock/set':
      return {
        ...state,
        variants: state.variants.map((v) =>
          v.id === action.id ? { ...v, stock: Math.max(0, action.value) } : v
        ),
      }

    // ---------------------------------------------------------------- users
    case 'user/update':
      return {
        ...state,
        users: state.users.map((u) => (u.id === action.id ? { ...u, ...action.patch } : u)),
      }

    case 'user/create':
      return { ...state, users: [...state.users, action.user] }

    case 'user/ensure': {
      const u = action.user
      const exists = state.users.some((x) => x.id === u.id)
      if (exists) {
        return {
          ...state,
          users: state.users.map((x) =>
            x.id === u.id
              ? {
                  ...x,
                  name: u.name ?? x.name,
                  email: u.email ?? x.email,
                  phone: u.phone ?? x.phone,
                  avatar: u.avatar !== undefined ? u.avatar : x.avatar,
                  role: u.role ?? x.role,
                  status: u.status ?? x.status,
                  notes: u.notes !== undefined ? u.notes : x.notes,
                }
              : x
          ),
        }
      }
      return {
        ...state,
        users: [
          ...state.users,
          {
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone ?? '',
            avatar: u.avatar ?? '',
            role: u.role,
            status: u.status ?? 'Active',
            password: '',
            createdAt: u.createdAt ?? Date.now(),
            address: null,
            addresses: [],
            notes: u.notes ?? '',
          },
        ],
      }
    }

    case 'user/delete':
      return { ...state, users: state.users.filter((u) => u.id !== action.id) }

    case 'user/restore': {
      const u = action.user
      const exists = state.users.some((x) => x.id === u.id)
      return {
        ...state,
        users: exists ? state.users.map((x) => (x.id === u.id ? u : x)) : [u, ...state.users],
      }
    }

    case 'user/address/add': {
      const addr = action.address
      return {
        ...state,
        users: state.users.map((u) => {
          if (u.id !== action.userId) return u
          const list = [...(u.addresses ?? [])]
          const next = addr.isDefault
            ? list.map((a) => ({ ...a, isDefault: false }))
            : list
          return {
            ...u,
            addresses: [...next, addr],
            address: addr.isDefault || list.length === 0 ? addr : u.address,
          }
        }),
      }
    }

    case 'user/address/update':
      return {
        ...state,
        users: state.users.map((u) => {
          if (u.id !== action.userId) return u
          let list = (u.addresses ?? []).map((a) =>
            a.id === action.id ? { ...a, ...action.patch } : a
          )
          if (action.patch?.isDefault) {
            list = list.map((a) => ({ ...a, isDefault: a.id === action.id }))
          }
          const def = list.find((a) => a.isDefault) ?? list[0] ?? null
          return { ...u, addresses: list, address: def }
        }),
      }

    case 'user/address/delete':
      return {
        ...state,
        users: state.users.map((u) => {
          if (u.id !== action.userId) return u
          const list = (u.addresses ?? []).filter((a) => a.id !== action.id)
          if (list.length && !list.some((a) => a.isDefault)) {
            list[0] = { ...list[0], isDefault: true }
          }
          const def = list.find((a) => a.isDefault) ?? list[0] ?? null
          return { ...u, addresses: list, address: def }
        }),
      }

    // --------------------------------------------------------------- orders
    case 'order/create': {
      const order = action.order
      // Placing an order decrements stock for each line.
      const variants = state.variants.map((v) => {
        const line = order.lines.find((l) => l.variantId === v.id)
        return line ? { ...v, stock: Math.max(0, v.stock - line.qty) } : v
      })
      return {
        ...state,
        variants,
        orders: [order, ...state.orders],
        payments: [action.payment, ...state.payments],
      }
    }

    case 'order/cancelSuccess': {
      const { order, payment, refunds } = action
      let nextOrders = state.orders.map((o) => (o.id === order.id ? order : o))
      if (!state.orders.some((o) => o.id === order.id)) {
        nextOrders = [order, ...state.orders]
      }
      let nextPayments = state.payments
      if (payment) {
        nextPayments = state.payments.map((p) => (p.id === payment.id ? payment : p))
        if (!state.payments.some((p) => p.id === payment.id)) {
          nextPayments = [payment, ...state.payments]
        }
      }
      let nextRefunds = state.refunds ?? []
      if (Array.isArray(refunds) && refunds.length) {
        for (const r of refunds) {
          if (!nextRefunds.some((x) => x.id === r.id)) {
            nextRefunds = [r, ...nextRefunds]
          } else {
            nextRefunds = nextRefunds.map((x) => (x.id === r.id ? r : x))
          }
        }
      }
      return {
        ...state,
        orders: nextOrders,
        payments: nextPayments,
        refunds: nextRefunds,
      }
    }

    case 'order/status': {
      const { id, status, note } = action
      let state2 = {
        ...state,
        orders: state.orders.map((o) =>
          o.id === id ? touch({ ...o, status }, `Status → ${status}`, note) : o
        ),
      }

      // Cancelling, returning or refunding puts the stock back.
      if (status === 'Cancelled' || status === 'Returned' || status === 'Refunded') {
        const order = state.orders.find((o) => o.id === id)
        if (order && order.status !== 'Cancelled' && order.status !== 'Returned' && order.status !== 'Refunded') {
          state2 = {
            ...state2,
            variants: state2.variants.map((v) => {
              const line = order.lines.find((l) => l.variantId === v.id)
              return line ? { ...v, stock: v.stock + line.qty } : v
            }),
          }
        }
      }

      // Moving to Shipped creates a shipment if one doesn't exist yet.
      if (status === 'Shipped' && !state2.shipments.some((s) => s.orderId === id)) {
        const order = state.orders.find((o) => o.id === id)
        state2 = {
          ...state2,
          shipments: [
            {
              id: `SHP-${id}`,
              orderId: id,
              carrier: action.carrier ?? 'Delhivery',
              awb: action.awb ?? `AWB${Math.floor(Math.random() * 9e8 + 1e8)}`,
              status: 'In transit',
              shippedAt: now(),
              deliveredAt: null,
              checkpoints: [
                { at: order?.placedAt ?? now(), label: 'Order placed', city: '—' },
                { at: now(), label: 'Shipped', city: 'Ahmedabad' },
              ],
            },
            ...state2.shipments,
          ],
        }
      }

      // Delivered closes out the shipment too.
      if (status === 'Delivered') {
        state2 = {
          ...state2,
          shipments: state2.shipments.map((s) =>
            s.orderId === id
              ? {
                  ...s,
                  status: 'Delivered',
                  deliveredAt: now(),
                  checkpoints: [...s.checkpoints, { at: now(), label: 'Delivered', city: '—' }],
                }
              : s
          ),
        }
      }

      return state2
    }

    case 'order/note':
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.id ? touch(o, 'Note added', action.note) : o
        ),
      }

    case 'order/delete':
      return {
        ...state,
        orders: state.orders.filter((o) => o.id !== action.id),
      }

    case 'order/restore': {
      const o = action.order
      const exists = state.orders.some((x) => x.id === o.id)
      return {
        ...state,
        orders: exists ? state.orders.map((x) => (x.id === o.id ? o : x)) : [o, ...state.orders],
      }
    }

    // ------------------------------------------------------------- payments
    case 'payment/update':
      return {
        ...state,
        payments: state.payments.map((p) =>
          p.id === action.id ? { ...p, ...action.patch } : p
        ),
      }

    // -------------------------------------------------------------- refunds
    case 'refund/create': {
      const { orderId, amount, reason } = action
      const payment = state.payments.find((p) => p.orderId === orderId)
      const alreadyRefunded = state.refunds
        .filter((r) => r.orderId === orderId && r.status !== 'Rejected')
        .reduce((n, r) => n + r.amount, 0)
      const order = state.orders.find((o) => o.id === orderId)
      const cap = (order?.total ?? 0) - alreadyRefunded
      const safe = Math.max(0, Math.min(amount, cap))
      if (safe <= 0) return state

      const total = alreadyRefunded + safe
      const fully = order && total >= order.total - 0.01

      return {
        ...state,
        refunds: [
          {
            id: `RF-${orderId}-${state.refunds.length + 1}`,
            orderId,
            amount: safe,
            reason,
            status: 'Pending',
            at: now(),
          },
          ...state.refunds,
        ],
        payments: payment
          ? state.payments.map((p) =>
              p.id === payment.id
                ? { ...p, status: fully ? 'Refunded' : 'Partially refunded' }
                : p
            )
          : state.payments,
        orders: state.orders.map((o) =>
          o.id === orderId
            ? touch(o, fully ? 'Full refund raised' : 'Partial refund raised', `₹${safe} — ${reason}`)
            : o
        ),
      }
    }

    case 'refund/status':
      return {
        ...state,
        refunds: state.refunds.map((r) =>
          r.id === action.id ? { ...r, status: action.status } : r
        ),
      }

    // ------------------------------------------------------------- wishlist
    case 'wishlist/toggle': {
      const has = state.wishlist.includes(action.handle)
      return {
        ...state,
        wishlist: has
          ? state.wishlist.filter((h) => h !== action.handle)
          : [...state.wishlist, action.handle],
      }
    }

    case 'wishlist/set':
      return { ...state, wishlist: action.handles ?? [] }

    case 'wishlist/clear':
      return { ...state, wishlist: [] }

    case 'commerce/hydrate':
      return {
        ...state,
        orders: action.orders ?? state.orders,
        payments: action.payments ?? state.payments,
        refunds: action.refunds ?? state.refunds,
        shipments: action.shipments ?? state.shipments,
        coupons: action.coupons ?? state.coupons,
        users: action.users ?? state.users,
      }

    case 'coupons/set':
      return { ...state, coupons: action.coupons ?? [] }

    case 'coupon/upsert': {
      const c = action.coupon
      const exists = state.coupons.some((x) => x.code === c.code)
      return {
        ...state,
        coupons: exists
          ? state.coupons.map((x) => (x.code === c.code ? c : x))
          : [...state.coupons, c],
      }
    }

    case 'coupon/remove':
      return { ...state, coupons: state.coupons.filter((c) => c.code !== action.code) }

    case 'order/upsert': {
      const o = action.order
      const exists = state.orders.some((x) => x.id === o.id)
      let next = {
        ...state,
        orders: exists
          ? state.orders.map((x) => (x.id === o.id ? o : x))
          : [o, ...state.orders],
      }
      if (action.payment) {
        const p = action.payment
        const pExists = next.payments.some((x) => x.id === p.id)
        next = {
          ...next,
          payments: pExists
            ? next.payments.map((x) => (x.id === p.id ? p : x))
            : [...next.payments, p],
        }
      }
      if (action.shipment) {
        const s = action.shipment
        const sExists = next.shipments.some((x) => x.id === s.id)
        next = {
          ...next,
          shipments: sExists
            ? next.shipments.map((x) => (x.id === s.id ? s : x))
            : [...next.shipments, s],
        }
      }
      if (action.refund) {
        const r = action.refund
        const rExists = next.refunds.some((x) => x.id === r.id)
        next = {
          ...next,
          refunds: rExists
            ? next.refunds.map((x) => (x.id === r.id ? r : x))
            : [...next.refunds, r],
        }
      }
      return next
    }

    case 'payment/upsert': {
      const p = action.payment
      const exists = state.payments.some((x) => x.id === p.id)
      return {
        ...state,
        payments: exists
          ? state.payments.map((x) => (x.id === p.id ? p : x))
          : [...state.payments, p],
      }
    }

    case 'refund/upsert': {
      const r = action.refund
      const exists = state.refunds.some((x) => x.id === r.id)
      return {
        ...state,
        refunds: exists
          ? state.refunds.map((x) => (x.id === r.id ? r : x))
          : [...state.refunds, r],
      }
    }

    // -------------------------------------------------------------- coupons
    case 'coupon/create':
      return { ...state, coupons: [...state.coupons, action.coupon] }

    case 'coupon/update':
      return {
        ...state,
        coupons: state.coupons.map((c) =>
          c.code === action.code ? { ...c, ...action.patch } : c
        ),
      }

    case 'coupon/delete':
      return { ...state, coupons: state.coupons.filter((c) => c.code !== action.code) }

    // ----------------------------------------------------------- categories
    case 'category/create':
      return { ...state, categories: [...(state.categories ?? []), action.category] }

    case 'category/update':
      return {
        ...state,
        categories: (state.categories ?? []).map((c) =>
          c.id === action.id ? { ...c, ...action.patch } : c
        ),
      }

    case 'category/delete':
      return {
        ...state,
        categories: (state.categories ?? []).filter((c) => c.id !== action.id),
      }

    case 'category/move': {
      const list = [...(state.categories ?? [])]
      const from = list.findIndex((c) => c.id === action.id)
      if (from < 0) return state
      const to = from + action.delta
      if (to < 0 || to >= list.length) return state
      const [row] = list.splice(from, 1)
      list.splice(to, 0, row)
      return { ...state, categories: list }
    }

    case 'subcategory/create':
      return {
        ...state,
        categories: (state.categories ?? []).map((c) =>
          c.id === action.categoryId
            ? { ...c, children: [...(c.children ?? []), action.subcategory] }
            : c
        ),
      }

    case 'subcategory/update':
      return {
        ...state,
        categories: (state.categories ?? []).map((c) =>
          c.id === action.categoryId
            ? {
                ...c,
                children: (c.children ?? []).map((s) =>
                  s.id === action.id ? { ...s, ...action.patch } : s
                ),
              }
            : c
        ),
      }

    case 'subcategory/delete':
      return {
        ...state,
        categories: (state.categories ?? []).map((c) =>
          c.id === action.categoryId
            ? { ...c, children: (c.children ?? []).filter((s) => s.id !== action.id) }
            : c
        ),
      }

    case 'subcategory/move': {
      return {
        ...state,
        categories: (state.categories ?? []).map((c) => {
          if (c.id !== action.categoryId) return c
          const list = [...(c.children ?? [])]
          const from = list.findIndex((s) => s.id === action.id)
          if (from < 0) return c
          const to = from + action.delta
          if (to < 0 || to >= list.length) return c
          const [row] = list.splice(from, 1)
          list.splice(to, 0, row)
          return { ...c, children: list }
        }),
      }
    }

    // --------------------------------------------------------------- content
    case 'content/set':
      return {
        ...state,
        content: { ...(state.content ?? {}), ...action.patch },
      }

    case 'content/hero/set':
      return {
        ...state,
        content: { ...state.content, heroSlides: action.slides },
      }

    case 'content/announcements/set':
      return {
        ...state,
        content: { ...state.content, announcements: action.items },
      }

    case 'content/filters/set':
      return {
        ...state,
        content: {
          ...state.content,
          filterGroups: action.groups ?? state.content.filterGroups,
          colorSwatches: action.swatches ?? state.content.colorSwatches,
          sortOptions: action.sortOptions ?? state.content.sortOptions,
        },
      }

    case 'content/collections/set':
      return {
        ...state,
        content: { ...state.content, collectionMeta: action.meta },
      }

    case 'content/homepage/set':
      return {
        ...state,
        content: {
          ...state.content,
          topCategories: action.topCategories ?? state.content.topCategories,
          aboutBanner: action.aboutBanner ?? state.content.aboutBanner,
          merch: action.merch ?? state.content.merch,
          heroQuickLinks: action.heroQuickLinks ?? state.content.heroQuickLinks,
          heroTrustLine: action.heroTrustLine ?? state.content.heroTrustLine,
          offers: action.offers ?? state.content.offers,
          whyChoose: action.whyChoose ?? state.content.whyChoose,
          homeRails: action.homeRails ?? state.content.homeRails,
          trustMarkers: action.trustMarkers ?? state.content.trustMarkers,
          reviewSummary: action.reviewSummary ?? state.content.reviewSummary,
        },
      }

    case 'content/site/set':
      return {
        ...state,
        content: {
          ...state.content,
          site: { ...(state.content.site ?? {}), ...(action.site ?? {}) },
          footer: action.footer ?? state.content.footer,
          pdp: action.pdp ?? state.content.pdp,
        },
      }

    case 'content/pages/set':
      return {
        ...state,
        content: { ...state.content, pages: action.pages },
      }

    // --------------------------------------------------------------- user & auth
    case 'user/ensure':
    case 'users/upsert': {
      const u = action.user || action.payload
      if (!u || !u.id) return state
      const exists = (state.users || []).some((x) => x.id === u.id)
      return {
        ...state,
        users: exists
          ? state.users.map((x) => (x.id === u.id ? { ...x, ...u } : x))
          : [...(state.users || []), u],
      }
    }

    case 'user/update': {
      const { id, patch } = action
      if (!id || !patch) return state
      return {
        ...state,
        users: (state.users || []).map((x) => (x.id === id ? { ...x, ...patch } : x)),
      }
    }

    // --------------------------------------------------------------- system
    case 'system/switchUser':
      return { ...state, currentUserId: action.id }

    case 'auth/login':
      return { ...state, currentUserId: action.id }

    case 'auth/logout':
      return { ...state, currentUserId: null }

    case 'admin/login':
      return { ...state, adminUserId: action.id }

    case 'admin/logout':
      return { ...state, adminUserId: null }

    case 'system/reset':
      return buildSeed()

    default:
      return state
  }
}
