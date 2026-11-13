import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import { siteSettings, storefrontNav, userById } from '../store/selectors.js'
import { ChevronDown, Close, User, Whatsapp } from './icons'
import Logo from './Logo'

export default function MobileMenu({ open, onClose }) {
  const { state } = useStore()
  const nav = storefrontNav(state)
  const site = siteSettings(state)
  const currentUser = userById(state, state.currentUserId)
  const isCustomer = currentUser && currentUser.role === 'Customer'
  const [expanded, setExpanded] = useState(null)

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-ink/45 backdrop-blur-sm transition-all duration-300 lg:hidden ${
          open ? 'opacity-100 pointer-events-auto' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[86%] max-w-[340px] flex-col bg-white transition-transform duration-300 lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-line px-4">
          <Logo />
          <button onClick={onClose} aria-label="Close menu" className="p-1.5 text-slate-700">
            <Close className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {nav.map((item) =>
            item.children ? (
              <div key={item.label} className="border-b border-line/70">
                <div className="flex w-full items-center justify-between px-4 py-3">
                  <Link
                    to={item.href}
                    onClick={onClose}
                    className="label-caps font-bold text-ink hover:text-[#1D4ED8]"
                  >
                    {item.label}
                  </Link>
                  <button
                    type="button"
                    className="p-1 text-graphite hover:text-[#1D4ED8]"
                    onClick={() => setExpanded((e) => (e === item.label ? null : item.label))}
                    aria-label={`Toggle ${item.label}`}
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        expanded === item.label ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>
                {expanded === item.label && (
                  <div className="bg-slate-50 border-t border-slate-100 py-1">
                    {item.children.map((c) => (
                      <Link
                        key={c.label}
                        to={c.href}
                        onClick={onClose}
                        className="block px-6 py-2 text-[12px] text-slate-700 hover:text-[#1D4ED8] hover:bg-white"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.label}
                to={item.href}
                onClick={onClose}
                className="label-caps block border-b border-line/70 px-4 py-3.5 font-bold hover:text-[#1D4ED8]"
              >
                {item.label}
              </Link>
            )
          )}

          <div className="mt-2 space-y-1 px-4 py-4 text-[12px]">
            <Link
              to={isCustomer ? '/account' : '/login'}
              onClick={onClose}
              className="flex w-full items-center gap-2.5 py-2 font-medium"
            >
              {currentUser?.avatar ? (
                <span className="h-6 w-6 min-w-[24px] min-h-[24px] shrink-0 aspect-square rounded-full overflow-hidden ring-1 ring-gray-200 bg-white p-0.5 flex items-center justify-center">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name || 'Account'}
                    className="h-full w-full rounded-full object-cover"
                  />
                </span>
              ) : (
                <User className="h-4 w-4 shrink-0" />
              )}
              <span>{isCustomer ? 'MY ACCOUNT' : 'LOG IN'}</span>
            </Link>
            <a
              href={site.whatsapp || 'https://api.whatsapp.com/send/?phone=971501234567'}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 py-2"
            >
              <Whatsapp className="h-4 w-4 text-[#25D366]" /> WHATSAPP QUOTATION
            </a>
            <Link to="/track" onClick={onClose} className="block py-2">
              TRACK ORDER
            </Link>
            <Link to="/policies/contact-information" onClick={onClose} className="block py-2">
              CONTACT US
            </Link>
          </div>
        </nav>
      </aside>
    </>
  )
}
