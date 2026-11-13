import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { useStore } from '../store/StoreContext.jsx'
import { userById } from '../store/selectors.js'
import { Menu, Search } from './icons'

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

export default function AmazonHeader({ onOpenAllMenu }) {
  const { count, openCart } = useCart()
  const { lang, setLang, currentLang, languages, t } = useLanguage()
  const { state } = useStore()
  const currentUser = userById(state, state.currentUserId)
  const isCustomer = currentUser && currentUser.role === 'Customer'
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [deliveryPincode, setDeliveryPincode] = useState('Dubai / GCC')
  const [pincodeModal, setPincodeModal] = useState(false)
  const [newPincode, setNewPincode] = useState('')

  // Flyout menu active hover state
  const [activeDropdown, setActiveDropdown] = useState(null)

  const handleSearch = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      if (category !== 'All') {
        navigate(`/collections/${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`)
      }
      return
    }
    const catParam = category !== 'All' ? `&category=${encodeURIComponent(category)}` : ''
    navigate(`/collections/all-products?q=${encodeURIComponent(searchQuery.trim())}${catParam}`)
  }

  const handleUpdatePincode = (e) => {
    e.preventDefault()
    if (newPincode.trim().length >= 3) {
      setDeliveryPincode(newPincode.trim())
      setPincodeModal(false)
      setNewPincode('')
    }
  }

  return (
    <>
      {/* 1. Main Amazon Royal Blue Header Bar (#0B2545) */}
      <header className="sticky top-0 z-40 bg-[#0B2545] text-white shadow-md">
        <div className="flex h-[64px] items-center gap-2 px-2 sm:px-4 lg:gap-4 lg:px-6">
          {/* Mobile Menu Button */}
          <button
            onClick={onOpenAllMenu}
            className="flex items-center gap-1 rounded p-1 text-white hover:ring-1 hover:ring-white md:hidden"
            aria-label="Open mobile menu"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Official Online Gulf Uniform Logo */}
          <Link
            to="/"
            className="flex shrink-0 items-center rounded-md bg-white px-2.5 py-1 shadow-sm transition-all hover:ring-2 hover:ring-[#FBBF24]"
            aria-label="Online Gulf Uniform — Home"
          >
            <img
              src="/logo/online-gulf-uniform-logo.jpg"
              alt="Online Gulf Uniform"
              className="h-8 sm:h-9 md:h-10 w-auto object-contain"
              width={180}
              height={40}
            />
          </Link>

          {/* Deliver to Location selector (Desktop) */}
          <button
            type="button"
            onClick={() => setPincodeModal(true)}
            className="hidden items-center gap-1.5 rounded px-2.5 py-1 text-left transition-all hover:ring-1 hover:ring-white lg:flex"
          >
            <span className="text-lg text-white">📍</span>
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] text-slate-300">{t('deliverTo')}</span>
              <span className="text-xs font-bold text-white">{deliveryPincode}</span>
            </div>
          </button>

          {/* Wide Amazon Search Bar with Royal Blue search button */}
          <form
            onSubmit={handleSearch}
            className="flex h-10 flex-1 items-center overflow-hidden rounded-md bg-white shadow-inner focus-within:ring-2 focus-within:ring-[#3B82F6]"
          >
            {/* Category Dropdown */}
            <div className="relative hidden bg-[#F1F5F9] text-xs text-slate-800 hover:bg-[#E2E8F0] sm:block border-r border-slate-300">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 cursor-pointer appearance-none bg-transparent pl-3 pr-7 text-xs font-medium text-slate-800 focus:outline-none"
              >
                <option value="All">{t('allCategories')}</option>
                <option value="Boys">Boys Uniforms</option>
                <option value="Girls">Girls Uniforms</option>
                <option value="Industrial Uniforms">Industrial Uniforms</option>
                <option value="School">School Uniforms</option>
                <option value="Corporate">Corporate Uniforms</option>
                <option value="Safety">Safety & Oil/Gas</option>
              </select>
              <span className="pointer-events-none absolute right-2.5 top-3.5 text-[9px] text-slate-600">
                ▼
              </span>
            </div>

            {/* Input box */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="h-full min-w-0 flex-1 px-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
            />

            {/* Royal Blue Search Button */}
            <button
              type="submit"
              className="flex h-full w-12 shrink-0 items-center justify-center bg-[#1D4ED8] transition-colors hover:bg-[#1E40AF] active:bg-[#1E3A8A]"
              aria-label="Submit Search"
            >
              <Search className="h-5 w-5 text-white stroke-[2.4]" />
            </button>
          </form>

          {/* 3-Language Selector Dropdown (English, Arabic, Malayalam) */}
          <div
            className="relative"
            onMouseEnter={() => setLangMenuOpen(true)}
            onMouseLeave={() => setLangMenuOpen(false)}
          >
            <button
              type="button"
              className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-bold transition-all hover:ring-1 hover:ring-white"
            >
              <span className="text-base">{currentLang.flag}</span>
              <span className="uppercase text-white">{currentLang.code}</span>
              <span className="text-[9px] text-slate-300">▼</span>
            </button>

            {/* Dropdown Menu */}
            {langMenuOpen && (
              <div className="absolute right-0 top-full z-50 w-52 animate-fadeIn rounded-md border border-slate-200 bg-white p-3 text-slate-900 shadow-2xl">
                <div className="border-b border-slate-100 pb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Language Settings
                </div>
                <div className="mt-2 space-y-1">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLang(l.code)
                        setLangMenuOpen(false)
                      }}
                      className={`flex w-full items-center justify-between rounded px-2.5 py-2 text-xs font-medium transition-colors ${
                        lang === l.code
                          ? 'bg-[#1D4ED8] text-white font-bold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{l.flag}</span>
                        <span>{l.native}</span>
                      </span>
                      <span className="text-[11px] opacity-75">{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Hello, Sign in / Account & Lists */}
          <div
            className="relative"
            onMouseEnter={() => setAccountMenuOpen(true)}
            onMouseLeave={() => setAccountMenuOpen(false)}
          >
            <Link
              to={isCustomer ? '/account' : '/login'}
              className="flex flex-col rounded px-2 py-1 leading-tight transition-all hover:ring-1 hover:ring-white"
            >
              <span className="text-[11px] text-slate-300">
                {currentUser?.name ? `Hello, ${currentUser.name.split(' ')[0]}` : t('helloSignIn')}
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-white">
                <span>{t('accountAndLists')}</span>
                <span className="text-[9px]">▼</span>
              </span>
            </Link>

            {accountMenuOpen && (
              <div className="absolute right-0 top-full z-50 w-64 animate-fadeIn rounded-md border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl">
                {!currentUser && (
                  <div className="border-b border-slate-200 pb-3 text-center">
                    <Link
                      to="/login"
                      className="block w-full rounded-md bg-[#1D4ED8] py-2 text-xs font-bold text-white shadow-sm hover:bg-[#1E40AF]"
                    >
                      {t('signIn')}
                    </Link>
                    <p className="mt-1.5 text-[11px] text-slate-600">
                      {t('newCustomer')}{' '}
                      <Link to="/login" className="text-[#1D4ED8] font-semibold hover:underline">
                        {t('startHere')}
                      </Link>
                    </p>
                  </div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900">{t('yourLists')}</h4>
                    <ul className="mt-1.5 space-y-1.5 text-slate-600">
                      <li><Link to="/wishlist" className="hover:text-[#1D4ED8]">{t('wishList')}</Link></li>
                      <li><Link to="/collections/all-products" className="hover:text-[#1D4ED8]">Uniform Catalog</Link></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{t('yourAccount')}</h4>
                    <ul className="mt-1.5 space-y-1.5 text-slate-600">
                      <li><Link to="/account" className="hover:text-[#1D4ED8]">{t('yourAccount')}</Link></li>
                      <li><Link to="/track" className="hover:text-[#1D4ED8]">{t('returnsAndOrders')}</Link></li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Returns & Orders */}
          <Link
            to="/track"
            className="hidden flex-col rounded px-2.5 py-1 leading-tight transition-all hover:ring-1 hover:ring-white sm:flex"
          >
            <span className="text-[11px] text-slate-300">Returns</span>
            <span className="text-xs font-bold text-white">& Orders</span>
          </Link>

          {/* Amazon Cart */}
          <button
            onClick={openCart}
            className="flex items-center gap-1.5 rounded px-2.5 py-1 transition-all hover:ring-1 hover:ring-white"
            aria-label="Cart"
          >
            <div className="relative flex items-center">
              <svg viewBox="0 0 24 24" className="h-8 w-8 fill-none stroke-white stroke-[1.8]">
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                <circle cx="9" cy="20" r="1.5" className="fill-white" />
                <circle cx="18" cy="20" r="1.5" className="fill-white" />
              </svg>
              <span className="absolute left-[13px] top-[1px] text-xs font-black text-[#FBBF24]">
                {count}
              </span>
            </div>
            <span className="hidden text-xs font-bold text-white sm:inline">{t('cart')}</span>
          </button>
        </div>

        {/* 2. Amazon Sub-Navigation Strip (Royal Navy #133E87) */}
        {/* EXACT USER MENU: Home, About Us, Boys, Girls, Industrial uniforms, Track Order, Contact Us */}
        <div className="relative flex h-10 items-center justify-between overflow-x-visible bg-[#133E87] px-2 text-xs font-medium text-white sm:px-4">
          <div className="flex items-center gap-1 sm:gap-2">
            {/* All Drawer Button */}
            <button
              onClick={onOpenAllMenu}
              className="flex items-center gap-1.5 rounded px-2.5 py-1 font-bold transition-all hover:bg-white/10"
            >
              <Menu className="h-4 w-4" />
              <span>{t('all')}</span>
            </button>

            {/* 1. Home */}
            <Link
              to="/"
              className="rounded px-2.5 py-1 hover:bg-white/10 hover:text-[#FBBF24] transition-colors font-semibold"
            >
              {t('home')}
            </Link>

            {/* 2. About Us */}
            <Link
              to="/pages/about-us"
              className="rounded px-2.5 py-1 hover:bg-white/10 hover:text-[#FBBF24] transition-colors"
            >
              {t('aboutUs')}
            </Link>

            {/* 3. Boys (with Dropdown) */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('boys')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <Link
                to="/collections/boys"
                className={`flex items-center gap-1 rounded px-2.5 py-1 transition-colors ${
                  activeDropdown === 'boys' ? 'bg-white text-[#0B2545] font-bold' : 'hover:bg-white/10 hover:text-[#FBBF24]'
                }`}
              >
                <span>{t('boys')}</span>
                <span className="text-[9px] opacity-70">▼</span>
              </Link>

              {activeDropdown === 'boys' && (
                <div className="absolute left-0 top-full z-50 w-64 animate-fadeIn rounded-b-md border-t-2 border-[#1D4ED8] bg-white p-2 text-slate-900 shadow-2xl">
                  <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Boys Uniform Subcategories
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {BOYS_SUBS.map((s) => (
                      <Link
                        key={s.slug}
                        to={`/collections/${s.slug}`}
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center justify-between rounded px-3 py-1.5 text-xs text-slate-700 hover:bg-[#EFF6FF] hover:text-[#1D4ED8] transition-colors"
                      >
                        <span>{s.label}</span>
                        <span className="text-[10px] text-slate-400">›</span>
                      </Link>
                    ))}
                  </div>
                  <div className="mt-2 border-t border-slate-100 pt-1.5 px-3">
                    <Link
                      to="/collections/boys"
                      onClick={() => setActiveDropdown(null)}
                      className="text-xs font-bold text-[#1D4ED8] hover:underline"
                    >
                      View All Boys Uniforms →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Girls (with Dropdown) */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('girls')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <Link
                to="/collections/girls"
                className={`flex items-center gap-1 rounded px-2.5 py-1 transition-colors ${
                  activeDropdown === 'girls' ? 'bg-white text-[#0B2545] font-bold' : 'hover:bg-white/10 hover:text-[#FBBF24]'
                }`}
              >
                <span>{t('girls')}</span>
                <span className="text-[9px] opacity-70">▼</span>
              </Link>

              {activeDropdown === 'girls' && (
                <div className="absolute left-0 top-full z-50 w-64 animate-fadeIn rounded-b-md border-t-2 border-[#1D4ED8] bg-white p-2 text-slate-900 shadow-2xl">
                  <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Girls Uniform Subcategories
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {GIRLS_SUBS.map((s) => (
                      <Link
                        key={s.slug}
                        to={`/collections/${s.slug}`}
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center justify-between rounded px-3 py-1.5 text-xs text-slate-700 hover:bg-[#EFF6FF] hover:text-[#1D4ED8] transition-colors"
                      >
                        <span>{s.label}</span>
                        <span className="text-[10px] text-slate-400">›</span>
                      </Link>
                    ))}
                  </div>
                  <div className="mt-2 border-t border-slate-100 pt-1.5 px-3">
                    <Link
                      to="/collections/girls"
                      onClick={() => setActiveDropdown(null)}
                      className="text-xs font-bold text-[#1D4ED8] hover:underline"
                    >
                      View All Girls Uniforms →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Industrial uniforms (with Dropdown) */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('industrial')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <Link
                to="/collections/industrial-uniforms"
                className={`flex items-center gap-1 rounded px-2.5 py-1 transition-colors ${
                  activeDropdown === 'industrial' ? 'bg-white text-[#0B2545] font-bold' : 'hover:bg-white/10 hover:text-[#FBBF24]'
                }`}
              >
                <span>{t('industrialUniforms')}</span>
                <span className="text-[9px] opacity-70">▼</span>
              </Link>

              {activeDropdown === 'industrial' && (
                <div className="absolute left-0 top-full z-50 w-64 animate-fadeIn rounded-b-md border-t-2 border-[#1D4ED8] bg-white p-2 text-slate-900 shadow-2xl">
                  <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Industrial & Workwear Categories
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {INDUSTRIAL_SUBS.map((s) => (
                      <Link
                        key={s.slug}
                        to={`/collections/${s.slug}`}
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center justify-between rounded px-3 py-1.5 text-xs text-slate-700 hover:bg-[#EFF6FF] hover:text-[#1D4ED8] transition-colors"
                      >
                        <span>{s.label}</span>
                        <span className="text-[10px] text-slate-400">›</span>
                      </Link>
                    ))}
                  </div>
                  <div className="mt-2 border-t border-slate-100 pt-1.5 px-3">
                    <Link
                      to="/collections/industrial-uniforms"
                      onClick={() => setActiveDropdown(null)}
                      className="text-xs font-bold text-[#1D4ED8] hover:underline"
                    >
                      View All Industrial Uniforms →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 6. Track Order */}
            <Link
              to="/track"
              className="rounded px-2.5 py-1 hover:bg-white/10 hover:text-[#FBBF24] transition-colors"
            >
              {t('trackOrder')}
            </Link>

            {/* 7. Contact Us */}
            <Link
              to="/policies/contact-information"
              className="rounded px-2.5 py-1 hover:bg-white/10 hover:text-[#FBBF24] transition-colors"
            >
              {t('contactUs')}
            </Link>
          </div>

          <div className="hidden items-center gap-2 pr-2 text-xs font-semibold text-[#FBBF24] xl:flex">
            <span>{t('primeFastDelivery')}</span>
          </div>
        </div>
      </header>

      {/* Delivery location selector modal */}
      {pincodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 text-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-bold text-base">{t('changeLocation')}</h4>
              <button onClick={() => setPincodeModal(false)} className="text-lg">✕</button>
            </div>
            <form onSubmit={handleUpdatePincode} className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="City, Country or Pincode (e.g. Dubai, Abu Dhabi, Delhi)"
                value={newPincode}
                onChange={(e) => setNewPincode(e.target.value)}
                className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-[#1D4ED8]"
              />
              <button
                type="submit"
                className="rounded bg-[#1D4ED8] px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-[#1E40AF]"
              >
                {t('apply')}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
