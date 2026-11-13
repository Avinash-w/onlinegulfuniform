import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useStore } from '../store/StoreContext.jsx'
import { storefrontNav, userById } from '../store/selectors.js'
import { Bag, ChevronDown, Heart, Menu, User } from './icons'
import Logo from './Logo'
import MobileMenu from './MobileMenu'

export default function Header({ onOpenCatalogue }) {
  const { count, openCart } = useCart()
  const { state } = useStore()
  const nav = storefrontNav(state)
  const currentUser = userById(state, state.currentUserId)
  const isCustomer = currentUser && currentUser.role === 'Customer'
  const [openMenu, setOpenMenu] = useState(null)
  const [drawer, setDrawer] = useState(false)

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b border-slate-800 bg-[#0A192F] text-white shadow-md transition-colors"
        onMouseLeave={() => setOpenMenu(null)}
      >
        <div className="container flex h-14 items-center gap-2 px-2 sm:h-16 sm:gap-3 sm:px-4 md:h-[72px] md:gap-4 lg:px-8">
          <button
            className="-ml-1 p-1 text-white transition-colors hover:text-amber-400 lg:hidden"
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Logo heightClass="h-7 sm:h-9 md:h-10" className="transition-transform hover:scale-[1.02]" />

          {/* Desktop Nav */}
          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-3 px-2 lg:flex xl:gap-5">
            {/* Core B2B Navigation Anchors */}
            <a
              href="/#products"
              className="whitespace-nowrap text-[12.5px] font-semibold uppercase tracking-wider text-slate-200 transition-colors hover:text-amber-300 xl:text-[13px]"
            >
              Uniforms & Workwear
            </a>

            <a
              href="/#products"
              className="whitespace-nowrap text-[12.5px] font-semibold uppercase tracking-wider text-slate-200 transition-colors hover:text-amber-300 xl:text-[13px]"
            >
              Custom Fabrics
            </a>

            <a
              href="/#services"
              className="whitespace-nowrap text-[12.5px] font-semibold uppercase tracking-wider text-slate-200 transition-colors hover:text-amber-300 xl:text-[13px]"
            >
              Embroidery & Printing
            </a>

            {/* Existing dynamic catalogue items */}
            {nav.slice(0, 3).map((item) => (
              <div
                key={item.label}
                className="relative shrink-0"
                onMouseEnter={() => setOpenMenu(item.children ? item.label : null)}
              >
                <NavLink
                  to={item.href}
                  end={item.href === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-1 whitespace-nowrap py-6 text-[12.5px] font-semibold uppercase leading-none tracking-wider transition-colors hover:text-amber-300 xl:text-[13px] ${
                      isActive ? 'text-amber-400 font-bold' : 'text-slate-300'
                    }`
                  }
                >
                  {item.label}
                  {item.children && (
                    <ChevronDown
                      className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                        openMenu === item.label ? 'rotate-180 text-amber-400' : ''
                      }`}
                    />
                  )}
                </NavLink>

                {item.children && openMenu === item.label && (
                  <div className="absolute left-0 top-full z-50 min-w-[240px] animate-slideUp rounded-2xl border border-slate-700 bg-slate-900 p-2 text-white shadow-2xl ring-1 ring-black/20">
                    <div className="space-y-0.5">
                      {item.children.map((c) => (
                        <Link
                          key={c.label}
                          to={c.href}
                          onClick={() => setOpenMenu(null)}
                          className="group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-[13px] font-medium text-slate-200 transition-all duration-150 hover:bg-slate-800 hover:text-amber-300"
                        >
                          <span className="transition-transform duration-150 group-hover:translate-x-1">
                            {c.label}
                          </span>
                          <span className="translate-x-1 text-[13px] font-bold text-amber-400 opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100">
                            →
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <a
              href="/#b2b-quote"
              className="whitespace-nowrap text-[12.5px] font-semibold uppercase tracking-wider text-amber-300 transition-colors hover:text-amber-200 xl:text-[13px]"
            >
              Get Quote
            </a>
          </nav>

          {/* Action icons & CTA Button */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 md:gap-3 lg:ml-0">
            <a
              href="/#b2b-quote"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-md hover:brightness-110 active:scale-95"
            >
              <span>Request Quote</span>
              <span>→</span>
            </a>

            <Link
              to="/wishlist"
              className="relative p-1.5 text-slate-300 transition-colors hover:text-amber-400"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
              {state.wishlist.length > 0 && (
                <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-amber-400 px-1 text-[9.5px] font-bold text-slate-950 shadow-xs">
                  {state.wishlist.length}
                </span>
              )}
            </Link>

            <Link
              to={isCustomer ? '/account' : '/login'}
              className="p-1.5 text-slate-300 transition-colors hover:text-amber-400 flex items-center justify-center"
              aria-label={isCustomer ? 'My account' : 'Log in'}
            >
              {currentUser?.avatar ? (
                <span className="h-6 w-6 rounded-full overflow-hidden ring-1.5 ring-amber-400/80 bg-white p-0.5 shrink-0 block">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name || 'Account'}
                    className="h-full w-full rounded-full object-contain"
                  />
                </span>
              ) : (
                <User className="h-5 w-5" />
              )}
            </Link>

            <button
              className="relative p-1.5 text-slate-300 transition-colors hover:text-amber-400"
              aria-label="Open cart"
              onClick={openCart}
            >
              <Bag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-amber-400 px-1 text-[9.5px] font-bold text-slate-950 shadow-xs">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <MobileMenu open={drawer} onClose={() => setDrawer(false)} />
    </>
  )
}
