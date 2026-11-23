import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { useStore } from '../store/StoreContext.jsx'
import { userById } from '../store/selectors.js'
import { Menu, Search } from './icons'

/* Palette: white #FFFFFF · navy #0B2545 · royal blue #1D4ED8 · deep blue #1E40AF · tint #EFF4FF */

const BOYS_SUBS = [
  { label: 'Pants', slug: 'boys-pants' },
  { label: 'Dress Shirts Short Sleeve', slug: 'boys-dress-shirts-short-sleeve' },
  { label: 'Dress shirt Long Sleeve', slug: 'boys-dress-shirt-long-sleeve' },
  { label: 'PE trousers', slug: 'boys-pe-trousers' },
  { label: 'PE polo shirts', slug: 'boys-pe-polo-shirts' },
  { label: 'PE Round Neck T Shirts', slug: 'boys-pe-round-neck-t-shirts' },
  { label: 'Shorts', slug: 'boys-shorts' },
  { label: 'Jackets', slug: 'boys-jackets' },
]

const GIRLS_SUBS = [
  { label: 'Pants', slug: 'girls-pants' },
  { label: 'Skirts', slug: 'girls-skirts' },
  { label: 'Skorts', slug: 'girls-skorts' },
  { label: 'Pinafore', slug: 'girls-pinafore' },
  { label: 'Dress Shirts Short Sleeve', slug: 'girls-dress-shirts-short-sleeve' },
  { label: 'Dress shirt Long Sleeve', slug: 'girls-dress-shirt-long-sleeve' },
  { label: 'PE trousers', slug: 'girls-pe-trousers' },
  { label: 'PE polo shirts', slug: 'girls-pe-polo-shirts' },
  { label: 'PE Round Neck T Shirts', slug: 'girls-pe-round-neck-t-shirts' },
  { label: 'Jackets', slug: 'girls-jackets' },
]

const INDUSTRIAL_SUBS = [
  { label: 'Polo Shirts', slug: 'industrial-polo-shirts' },
  { label: 'Corporate Uniform', slug: 'corporate-uniform' },
  { label: 'Restaurant Uniforms', slug: 'restaurant-uniforms' },
  { label: 'Engineering Uniforms', slug: 'engineering-uniforms' },
  { label: 'Oil and Gas Uniforms', slug: 'oil-and-gas-uniforms' },
]

/* ───────── Small helpers ───────── */

function Chevron({ open, className = '' }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 4.5 6 8l3.5-3.5" />
    </svg>
  )
}

function PinIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

function UserIcon({ className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function BagIcon({ className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8h12l1 12H5L6 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  )
}

/**
 * Dropdown that works with mouse hover AND touch / keyboard (click toggles).
 * Closes on outside tap or Escape.
 */
function Dropdown({ trigger, children, align = 'left', panelClass = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <div
      ref={ref}
      className="relative"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
    >
      {trigger({ open, toggle: () => setOpen((o) => !o), close })}
      {open && (
        <div
          className={`absolute top-full z-50 pt-2 ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          <div
            className={`animate-fadeIn rounded-2xl border border-[#0B2545]/10 bg-white p-3 text-[#0B2545] shadow-2xl ${panelClass}`}
          >
            {children({ close })}
          </div>
        </div>
      )}
    </div>
  )
}

function CategoryMenu({ label, to, heading, subs, viewAll }) {
  return (
    <Dropdown
      panelClass="w-72"
      trigger={({ open, toggle }) => (
        <div
          className={`flex items-center rounded-full transition-colors ${
            open ? 'bg-white text-[#0B2545]' : 'hover:bg-white/10'
          }`}
        >
          <Link to={to} className="py-1.5 pl-3.5 pr-1 text-sm font-semibold">
            {label}
          </Link>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-label={`${label} sub-categories`}
            className="flex h-8 w-8 items-center justify-center rounded-full"
          >
            <Chevron open={open} />
          </button>
        </div>
      )}
    >
      {({ close }) => (
        <>
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-[#0B2545]/45">
            {heading}
          </p>
          <div className="max-h-[60vh] space-y-0.5 overflow-y-auto">
            {subs.map((s) => (
              <Link
                key={s.slug}
                to={`/collections/${s.slug}`}
                onClick={close}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-[#0B2545]/80 transition-colors hover:bg-[#EFF4FF] hover:text-[#1D4ED8]"
              >
                {s.label}
                <span className="text-[#0B2545]/30">›</span>
              </Link>
            ))}
          </div>
          <Link
            to={to}
            onClick={close}
            className="mt-2 block rounded-lg bg-[#EFF4FF] px-3 py-2.5 text-center text-sm font-semibold text-[#1D4ED8] hover:bg-[#DBE7FF]"
          >
            {viewAll} →
          </Link>
        </>
      )}
    </Dropdown>
  )
}

/* ───────── Header ───────── */

export default function AmazonHeader({ onOpenAllMenu }) {
  const { count, openCart } = useCart()
  const { lang, setLang, currentLang, languages, t } = useLanguage()
  const { state } = useStore()
  const currentUser = userById(state, state.currentUserId)
  const isCustomer = currentUser && currentUser.role === 'Customer'
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [deliveryPincode, setDeliveryPincode] = useState('Dubai / GCC')
  const [pincodeModal, setPincodeModal] = useState(false)
  const [newPincode, setNewPincode] = useState('')

  // Sync search input and category with URL query parameters
  useEffect(() => {
    const q = searchParams.get('q')
    if (q !== null) {
      setSearchQuery(q)
    }
    const cat = searchParams.get('category')
    if (cat) {
      setCategory(cat)
    }
  }, [searchParams])

  useEffect(() => {
    if (!pincodeModal) return
    const onKey = (e) => e.key === 'Escape' && setPincodeModal(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [pincodeModal])

  const handleSearch = (e) => {
    e?.preventDefault?.()
    const trimmed = searchQuery.trim()
    const catParam = category !== 'All' ? `&category=${encodeURIComponent(category)}` : ''
    if (!trimmed) {
      if (category !== 'All') {
        const catSlug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        navigate(`/collections/${catSlug}`)
      } else {
        navigate('/collections/all-products')
      }
      return
    }
    navigate(`/collections/all-products?q=${encodeURIComponent(trimmed)}${catParam}`)
  }

  const handleUpdatePincode = (e) => {
    e.preventDefault()
    if (newPincode.trim().length >= 3) {
      setDeliveryPincode(newPincode.trim())
      setPincodeModal(false)
      setNewPincode('')
    }
  }

  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : null

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0B2545] text-white shadow-md">
        {/* ── Main bar ──
            Mobile: [menu] [logo] ········ [lang] [account] [cart]
                    [ ───────── search ───────── ]
            Tablet/Desktop: single row with search in the middle            */}
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2.5 px-3 py-2.5 sm:px-4 md:flex-nowrap md:gap-x-3 lg:gap-x-4 lg:px-6">
          {/* Menu (mobile only) */}
          <button
            onClick={onOpenAllMenu}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/10 max-[380px]:h-9 max-[380px]:w-8 md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Logo */}
          <Link
            to="/"
            className="flex shrink-0 items-center rounded-lg bg-white px-2.5 py-1 shadow-sm transition hover:ring-2 hover:ring-[#93C5FD] max-[380px]:px-1.5"
            aria-label="Online Gulf Uniform — Home"
          >
            <img
              src="/logo/online-gulf-uniform-logo.jpg"
              alt="Online Gulf Uniform"
              className="h-8 w-auto object-contain sm:h-9 lg:h-10 max-[380px]:max-w-[88px]"
              width={180}
              height={40}
            />
          </Link>

          {/* Deliver to (desktop) */}
          <button
            type="button"
            onClick={() => setPincodeModal(true)}
            className="hidden shrink-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition hover:bg-white/10 lg:flex"
          >
            <PinIcon className="h-5 w-5 text-[#93C5FD]" />
            <span className="flex flex-col leading-tight">
              <span className="text-[11px] text-white/60">{t('deliverTo')}</span>
              <span className="max-w-[110px] truncate text-xs font-bold">{deliveryPincode}</span>
            </span>
          </button>

          {/* Spacer pushes icons right on mobile */}
          <div className="min-w-0 flex-1 md:hidden" />

          {/* Search — full-width 2nd row on mobile, inline from md up */}
          <form
            onSubmit={handleSearch}
            role="search"
            className="order-last flex h-11 w-full min-w-0 items-center overflow-hidden rounded-full bg-white shadow-inner focus-within:ring-2 focus-within:ring-[#93C5FD] md:order-none md:w-auto md:flex-1"
          >
            <div className="relative hidden h-full shrink-0 border-r border-[#0B2545]/10 bg-[#EFF4FF] sm:block md:hidden lg:block">
              <label htmlFor="header-category" className="sr-only">
                {t('allCategories')}
              </label>
              <select
                id="header-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-full max-w-[150px] cursor-pointer appearance-none bg-transparent pl-4 pr-8 text-xs font-semibold text-[#0B2545] focus:outline-none"
              >
                <option value="All">{t('allCategories')}</option>
                <option value="Boys">{t('boys')}</option>
                <option value="Girls">{t('girls')}</option>
                <option value="Industrial Uniforms">{t('industrialUniforms')}</option>
                <option value="School">{t('schoolUniforms')}</option>
                <option value="Corporate">{t('corporateUniforms')}</option>
                <option value="Safety">Safety & Oil/Gas</option>
              </select>
              <Chevron open={false} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#0B2545]/60" />
            </div>

            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchPlaceholder')}
              className="h-full min-w-0 flex-1 bg-transparent px-4 text-base text-[#0B2545] placeholder:text-[#0B2545]/45 focus:outline-none sm:text-sm"
            />

            <button
              type="submit"
              onClick={handleSearch}
              className="m-1 flex h-9 w-11 shrink-0 items-center justify-center rounded-full bg-[#1D4ED8] text-white transition hover:bg-[#1E40AF] active:scale-95"
              aria-label="Submit Search"
            >
              <Search className="h-5 w-5 stroke-[2.4]" />
            </button>
          </form>

          {/* Language */}
          <Dropdown
            align="right"
            panelClass="w-56"
            trigger={({ open, toggle }) => (
              <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                aria-label="Change language"
                className="flex h-10 items-center gap-1 rounded-full px-2.5 text-xs font-bold transition hover:bg-white/10 max-[380px]:h-9 max-[380px]:px-1"
              >
                <span className="text-base leading-none">{currentLang.flag}</span>
                <span className="hidden uppercase sm:inline">{currentLang.code}</span>
                <Chevron open={open} className="hidden text-white/60 sm:block" />
              </button>
            )}
          >
            {({ close }) => (
              <>
                <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-[#0B2545]/45">
                  {t('selectLanguage')}
                </p>
                <div className="space-y-1">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLang(l.code)
                        close()
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        lang === l.code
                          ? 'bg-[#1D4ED8] font-bold text-white'
                          : 'text-[#0B2545]/80 hover:bg-[#EFF4FF]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{l.flag}</span>
                        <span>{l.native}</span>
                      </span>
                      <span className="text-xs opacity-70">{l.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </Dropdown>

          {/* Account */}
          <Dropdown
            align="right"
            panelClass="w-72"
            trigger={({ open, toggle }) => (
              <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                aria-label={t('accountAndLists')}
                className="flex h-10 items-center gap-2 rounded-full px-2.5 transition hover:bg-white/10 max-[380px]:h-9 max-[380px]:gap-1 max-[380px]:px-1"
              >
                <UserIcon className="h-6 w-6 max-[380px]:h-5 max-[380px]:w-5" />
                <span className="hidden flex-col text-left leading-tight lg:flex">
                  <span className="text-[11px] text-white/60">
                    {firstName ? `Hello, ${firstName}` : t('helloSignIn')}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold">
                    {t('accountAndLists')}
                    <Chevron open={open} />
                  </span>
                </span>
              </button>
            )}
          >
            {({ close }) => (
              <>
                {!currentUser && (
                  <div className="border-b border-[#0B2545]/10 pb-3 text-center">
                    <Link
                      to="/login"
                      onClick={close}
                      className="block w-full rounded-full bg-[#1D4ED8] py-2.5 text-sm font-semibold text-white hover:bg-[#1E40AF]"
                    >
                      {t('signIn')}
                    </Link>
                    <p className="mt-2 text-xs text-[#0B2545]/60">
                      {t('newCustomer')}{' '}
                      <Link to="/login" onClick={close} className="font-semibold text-[#1D4ED8] hover:underline">
                        {t('startHere')}
                      </Link>
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 pt-3 text-sm">
                  <div>
                    <h4 className="font-bold">{t('yourLists')}</h4>
                    <ul className="mt-2 space-y-2 text-[#0B2545]/70">
                      <li><Link onClick={close} to="/wishlist" className="hover:text-[#1D4ED8]">{t('wishList')}</Link></li>
                      <li><Link onClick={close} to="/collections/all-products" className="hover:text-[#1D4ED8]">{t('uniformCatalog')}</Link></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold">{t('yourAccount')}</h4>
                    <ul className="mt-2 space-y-2 text-[#0B2545]/70">
                      <li><Link onClick={close} to={isCustomer ? '/account' : '/login'} className="hover:text-[#1D4ED8]">{t('yourAccount')}</Link></li>
                      <li><Link onClick={close} to="/track" className="hover:text-[#1D4ED8]">{t('returnsAndOrders')}</Link></li>
                    </ul>
                  </div>
                </div>
              </>
            )}
          </Dropdown>

          {/* Returns & Orders (large screens only) */}
          <Link
            to="/track"
            className="hidden flex-col rounded-lg px-2.5 py-1 leading-tight transition hover:bg-white/10 xl:flex"
          >
            <span className="text-[11px] text-white/60">{t('returns')}</span>
            <span className="text-xs font-bold">{t('andOrders')}</span>
          </Link>

          {/* Cart */}
          <button
            onClick={openCart}
            className="flex h-10 items-center gap-2 rounded-full px-2.5 transition hover:bg-white/10 max-[380px]:h-9 max-[380px]:gap-1 max-[380px]:px-1"
            aria-label={`Cart, ${count} items`}
          >
            <span className="relative">
              <BagIcon className="h-6 w-6 sm:h-7 sm:w-7" />
              {count > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-[#1D4ED8]">
                  {count}
                </span>
              )}
            </span>
            <span className="hidden text-sm font-semibold lg:inline">{t('cart')}</span>
          </button>
        </div>

        {/* ── Category nav (tablet + desktop) ── */}
        <nav
          aria-label="Main"
          className="hidden items-center justify-between border-t border-white/10 bg-[#133E87] px-3 py-1.5 text-white md:flex lg:px-6"
        >
          <div className="flex items-center gap-0.5 lg:gap-1">
            <button
              onClick={onOpenAllMenu}
              className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold transition hover:bg-white/10"
            >
              <Menu className="h-4 w-4" />
              {t('all')}
            </button>

            <Link to="/" className="rounded-full px-3.5 py-1.5 text-sm font-semibold transition hover:bg-white/10">
              {t('home')}
            </Link>
            <Link to="/pages/about-us" className="rounded-full px-3.5 py-1.5 text-sm font-semibold transition hover:bg-white/10">
              {t('aboutUs')}
            </Link>

            <CategoryMenu
              label={t('boys')}
              to="/collections/boys"
              heading={t('boysSubcatHeading')}
              subs={BOYS_SUBS}
              viewAll={t('viewAllBoys')}
            />
            <CategoryMenu
              label={t('girls')}
              to="/collections/girls"
              heading={t('girlsSubcatHeading')}
              subs={GIRLS_SUBS}
              viewAll={t('viewAllGirls')}
            />
            <CategoryMenu
              label={t('industrialUniforms')}
              to="/collections/industrial-uniforms"
              heading={t('industrialSubcatHeading')}
              subs={INDUSTRIAL_SUBS}
              viewAll={t('viewAllIndustrial')}
            />

            <Link to="/track" className="rounded-full px-3.5 py-1.5 text-sm font-semibold transition hover:bg-white/10">
              {t('trackOrder')}
            </Link>
            <Link to="/policies/contact-information" className="rounded-full px-3.5 py-1.5 text-sm font-semibold transition hover:bg-white/10">
              {t('contactUs')}
            </Link>
          </div>

          <span className="hidden pr-2 text-xs font-semibold text-[#BFDBFE] xl:block">
            {t('primeFastDelivery')}
          </span>
        </nav>
      </header>

      {/* ── Mobile quick strip (scrolls away, not sticky) ── */}
      <div className="bg-[#133E87] text-white md:hidden">
        <button
          type="button"
          onClick={() => setPincodeModal(true)}
          className="flex w-full items-center gap-2 border-b border-white/10 px-4 py-2.5 text-left text-xs"
        >
          <PinIcon className="h-4 w-4 shrink-0 text-[#93C5FD]" />
          <span className="text-white/70">{t('deliverTo')}</span>
          <span className="truncate font-bold">{deliveryPincode}</span>
          <Chevron open={false} className="ml-auto shrink-0 text-white/60" />
        </button>
        <div className="header-chips flex gap-2 overflow-x-auto px-4 py-2.5">
          {[
            { to: '/collections/boys', label: t('boys') },
            { to: '/collections/girls', label: t('girls') },
            { to: '/collections/industrial-uniforms', label: t('industrialUniforms') },
            { to: '/track', label: t('trackOrder') },
            { to: '/policies/contact-information', label: t('contactUs') },
          ].map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="shrink-0 rounded-full border border-white/25 px-4 py-1.5 text-sm font-semibold transition active:bg-white active:text-[#0B2545]"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Delivery location modal (bottom sheet on mobile) ── */}
      {pincodeModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B2545]/60 sm:items-center sm:p-4"
          onClick={() => setPincodeModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('changeLocation')}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl bg-white p-5 text-[#0B2545] shadow-2xl sm:rounded-3xl sm:p-6"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-serif text-xl font-semibold">{t('changeLocation')}</h4>
              <button
                onClick={() => setPincodeModal(false)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full text-lg hover:bg-[#EFF4FF]"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdatePincode} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                autoFocus
                type="text"
                placeholder={t('locationPlaceholder')}
                value={newPincode}
                onChange={(e) => setNewPincode(e.target.value)}
                className="min-w-0 flex-1 rounded-full border border-[#0B2545]/20 px-4 py-3 text-base outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/25 sm:text-sm"
              />
              <button
                type="submit"
                className="rounded-full bg-[#1D4ED8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1E40AF]"
              >
                {t('apply')}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .header-chips { scrollbar-width: none; -ms-overflow-style: none; }
        .header-chips::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  )
}
