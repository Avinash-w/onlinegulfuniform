// ---------------------------------------------------------------------------
// App state shape + shared enums. No demo data: everything is loaded from the API.
// ---------------------------------------------------------------------------

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

/**
 * Initial app state. Nothing here is catalogue / CMS / customer data: all of
 * that is loaded from the PHP API (/bootstrap, /auth/me, /orders, …) at runtime.
 * (The build* helpers above only feed `npm run export:seed`, the DB seeding tool.)
 */
export function buildSeed() {
  return {
    version: 13,
    catalogue: [],
    productOverrides: {},
    customProducts: [],
    deletedProducts: [],
    categories: [],
    content: {},
    variants: [],
    users: [],
    orders: [],
    payments: [],
    refunds: [],
    shipments: [],
    wishlist: [],
    coupons: [],
    currentUserId: null,    // storefront session (null = logged out)
    adminUserId: null,      // staff session for /admin (null = logged out)
  }
}
