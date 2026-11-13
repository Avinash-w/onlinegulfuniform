import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { apiGet, apiPost, setAdminToken } from '../lib/api.js'
import { useStore } from '../store/StoreContext.jsx'
import { adminUser, metrics } from '../store/selectors.js'
import { ChevronDown, Close, Logout, Menu, Power } from '../components/icons'
import Logo from '../components/Logo'
import AdminSearch from './AdminSearch.jsx'

/**
 * Admin sidebar structure.
 *
 * Dashboard
 * Orders · Catalog · Finance · Customers
 * Storefront
 *   · Announcements
 *   · Hero banners
 *   · Homepage
 *   · Collections
 *   · Filters
 *   · Site settings
 *   · Pages
 */
const NAV = [
  { id: 'dashboard', label: 'Dashboard', to: '/admin', end: true },
  {
    id: 'orders',
    label: 'Orders',
    children: [
      { to: '/admin/orders', label: 'All orders', match: '/admin/orders' },
      { to: '/admin/enquiries', label: 'Custom Enquiries', match: '/admin/enquiries' },
      { to: '/admin/shipments', label: 'Shipments' },
      { to: '/admin/refunds', label: 'Refunds', countKey: 'openRefunds' },
    ],
  },
  {
    id: 'catalog',
    label: 'Catalog',
    children: [
      { to: '/admin/products', label: 'Products', match: '/admin/products' },
      { to: '/admin/categories', label: 'Categories' },
      { to: '/admin/reviews', label: 'Reviews' },
      { to: '/admin/stock', label: 'Stock', countKey: 'lowStock' },
    ],
  },
  {
    id: 'storefront',
    label: 'Storefront',
    children: [
      { to: '/admin/announcements', label: 'Announcements' },
      { to: '/admin/hero', label: 'Hero banners' },
      { to: '/admin/home-sections', label: 'Home sections' },
      { to: '/admin/homepage', label: 'Homepage' },
      { to: '/admin/collections', label: 'Collections' },
      { to: '/admin/filters', label: 'Filters' },
      { to: '/admin/site', label: 'Site settings' },
      { to: '/admin/pages', label: 'Pages' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    children: [
      { to: '/admin/payments', label: 'Payments' },
      { to: '/admin/coupons', label: 'Coupons' },
      { to: '/admin/invoice-settings', label: 'Invoice Settings' },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    children: [
      { to: '/admin/customers', label: 'All customers', match: '/admin/customers' },
    ],
  },
  { id: 'settings', label: 'Settings', to: '/admin/profile', end: true },
]

function groupForPath(pathname) {
  if (pathname === '/admin') return 'dashboard'
  if (pathname === '/admin/profile' || pathname === '/admin/account') return 'settings'
  for (const item of NAV) {
    if (!item.children) continue
    const hit = item.children.some((c) => {
      const base = c.match ?? c.to
      return pathname === base || pathname.startsWith(`${base}/`)
    })
    if (hit) return item.id
  }
  return null
}

function countFor(key, m) {
  if (key === 'openRefunds') return m.openRefunds || null
  if (key === 'lowStock') return m.lowStock || null
  if (key === 'pending') return m.pending || null
  return null
}

function groupBadge(item, m) {
  if (!item.children) return null
  if (item.id === 'orders') return m.pending || null
  if (item.id === 'catalog') return m.lowStock || null
  return null
}

export default function AdminLayout({ children }) {
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const m = metrics(state)
  const session = adminUser(state)
  const { pathname } = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const activeGroup = useMemo(() => groupForPath(pathname), [pathname])
  const [expanded, setExpanded] = useState(activeGroup)

  const initials = (session?.name ?? 'AD')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const logout = async () => {
    try {
      await apiPost('/auth/logout', {}, { auth: true })
    } catch {
      /* ignore network errors on logout */
    }
    setAdminToken(null)
    dispatch({ type: 'admin/logout' })
    navigate('/admin/login', { replace: true })
  }

  // Hydrate admin commerce data (orders, customers, payments, etc.)
  useEffect(() => {
    if (!session) return
    let cancelled = false
    ;(async () => {
      try {
        const [ordersJson, customersJson] = await Promise.all([
          apiGet('/orders', { auth: true }),
          apiGet('/customers', { auth: true }),
        ])
        if (cancelled) return
        dispatch({
          type: 'commerce/hydrate',
          orders: ordersJson.data?.orders ?? [],
          payments: ordersJson.data?.payments ?? [],
          shipments: ordersJson.data?.shipments ?? [],
          refunds: ordersJson.data?.refunds ?? [],
          users: customersJson.data?.users ?? undefined,
        })
      } catch (err) {
        console.error('AdminLayout hydrate error:', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session?.id])

  // Keep only the route's active group open; collapse the rest.
  useEffect(() => {
    setExpanded(activeGroup)
  }, [activeGroup])

  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!drawerOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [drawerOpen])

  const closeDrawer = () => setDrawerOpen(false)

  const Nav = (
    <nav className="hide-scrollbar flex-1 space-y-1 overflow-y-auto overscroll-contain">
      {NAV.map((item) => {
        if (!item.children) {
          return (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.end}
              onClick={closeDrawer}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${
                  isActive ? 'bg-lime font-semibold text-[#181A4E]' : 'text-white/90 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          )
        }

        const isOpen = expanded === item.id
        const badge = groupBadge(item, m)
        const groupActive = activeGroup === item.id

        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : item.id)}
              aria-expanded={isOpen}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                groupActive ? 'bg-white/15 font-semibold text-white' : 'text-white/90 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                {item.label}
                {badge != null && (
                  <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {badge}
                  </span>
                )}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 text-white/70 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <div
              className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">
                <ul className="mb-1 ml-2 space-y-0.5 border-l border-white/20 pl-2 pt-0.5">
                  {item.children.map((child) => {
                    const n = countFor(child.countKey, m)
                    return (
                      <li key={child.to}>
                        <NavLink
                          to={child.to}
                          end={!child.match}
                          onClick={closeDrawer}
                          className={({ isActive }) =>
                            `flex items-center justify-between rounded-md px-2.5 py-2 text-[12px] font-medium transition-colors ${
                              isActive
                                ? 'bg-lime font-semibold text-[#181A4E]'
                                : 'text-white/80 hover:bg-white/10 hover:text-white'
                            }`
                          }
                        >
                          {child.label}
                          {n != null && (
                            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              {n}
                            </span>
                          )}
                        </NavLink>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </div>
        )
      })}
    </nav>
  )

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-ink">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(100%,260px)] flex-col bg-[#181A4E] p-4 transition-transform duration-200 lg:w-[232px] lg:translate-x-0 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-2 px-2.5">
          <Logo to="/admin" heightClass="h-9" className="min-w-0" />
          <button type="button" className="rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white lg:hidden" onClick={closeDrawer} aria-label="Close menu">
            <Close className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-wider2 text-white/60">Back office</p>
        {Nav}

        <div className="mt-4 shrink-0 border-t border-white/15 pt-4">
          <Link
            to="/"
            className="block rounded-lg border border-white/25 px-3 py-2.5 text-center text-[12px] font-medium text-white transition-colors hover:bg-white/15"
          >
            View storefront
          </Link>
        </div>
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[1px] lg:hidden" onClick={closeDrawer} />
      )}

      <div className="min-w-0 lg:pl-[232px]">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-white px-3 sm:gap-3 sm:px-4 lg:px-7">
          <button
            type="button"
            className="shrink-0 rounded-lg p-1.5 hover:bg-chalk lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <p className="hidden shrink-0 text-[11px] font-medium text-graphite sm:block sm:text-[12px]">
            <span className="md:hidden">{m.orderCount} orders</span>
            <span className="hidden md:inline">
              {m.orderCount} orders · {m.customerCount} customers · {state.variants.length} variants
            </span>
          </p>

          <AdminSearch />

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            {/* Notification Bell */}
            <button
              type="button"
              title="Notifications"
              aria-label="Notifications"
              className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-graphite hover:bg-chalk hover:text-ink transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            {m.lowStock > 0 && (
              <span className="hidden rounded-full bg-[#FFF4E0] px-2.5 py-1 text-[10px] font-semibold text-[#B26A00] md:inline">
                {m.lowStock} low stock
              </span>
            )}

            {/* Profile Avatar (click opens Settings / Profile page) */}
            <Link
              to="/admin/profile"
              title={`Settings — ${session?.name || 'Admin'}`}
              aria-label="Account and Profile Settings"
              className="group flex items-center gap-1.5 rounded-full p-0.5 hover:bg-chalk transition-all"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-bold shadow-xs ${
                  session?.avatar ? 'bg-white p-0.5 border border-line' : 'bg-[#7C66E7] text-white'
                }`}
              >
                {session?.avatar ? (
                  <img
                    src={session.avatar}
                    alt={session?.name || 'Admin'}
                    className="h-full w-full rounded-full object-contain"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <ChevronDown className="h-3 w-3 text-graphite transition-transform duration-150 group-hover:text-ink" />
            </Link>

            {/* Red Log Off Icon Button */}
            <button
              type="button"
              onClick={logout}
              title="Log Off"
              aria-label="Log Off"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FDE8E8] text-[#E02438] transition-all hover:bg-[#FCD2D2] hover:scale-105 shadow-xs"
            >
              <Power className="h-4 w-4 stroke-[2.2]" />
            </button>
          </div>
        </header>

        <main className="min-w-0 overflow-x-hidden p-3 sm:p-4 lg:p-7">{children}</main>
      </div>
    </div>
  )
}
