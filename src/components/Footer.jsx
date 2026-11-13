import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useStore } from '../store/StoreContext.jsx'
import { siteSettings, storefrontContent } from '../store/selectors.js'
import { Instagram } from './icons'

function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    setDone(true)
  }

  if (done) {
    return (
      <div className="inline-flex items-center gap-2 rounded bg-emerald-50 px-4 py-2 text-emerald-800 border border-emerald-200">
        <span className="text-xs font-bold">✓</span>
        <p className="text-xs font-medium">Subscribed! Check your inbox for exclusive deals.</p>
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="flex w-full max-w-md items-center overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email for Amazon deals..."
        aria-label="Email address for newsletter"
        className="min-w-0 flex-1 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none"
      />
      <button
        type="submit"
        className="shrink-0 bg-[#1D4ED8] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1E40AF]"
      >
        Subscribe
      </button>
    </form>
  )
}

export default function Footer({ onOpenCatalogue }) {
  const { pathname } = useLocation()
  const isHiddenOnMobile =
    pathname === '/checkout' ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/track')
  const { t } = useLanguage()
  const { state } = useStore()
  const site = siteSettings(state)

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className={`bg-white font-sans ${isHiddenOnMobile ? 'hidden md:block' : ''}`}>
      {/* 1. Back to Top Strip (Amazon style #133E87) */}
      <button
        onClick={scrollToTop}
        className="w-full bg-[#133E87] py-3 text-center text-xs font-bold text-white transition-colors hover:bg-[#1E40AF]"
      >
        ▲ Back to top
      </button>

      {/* 2. Royal Blue Footer Navigation Grid (#0B2545) */}
      <div className="bg-[#0B2545] text-white">
        <div className="container grid grid-cols-2 gap-8 px-4 py-10 sm:grid-cols-4 sm:px-6">
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-white">Get to Know Us</h4>
            <ul className="mt-3 space-y-2 text-xs text-slate-300">
              <li><Link to="/pages/about-us" className="hover:underline">About Online Gulf Uniform</Link></li>
              <li><Link to="/collections/boys" className="hover:underline">Boys School Uniforms</Link></li>
              <li><Link to="/collections/girls" className="hover:underline">Girls School Uniforms</Link></li>
              <li><Link to="/collections/industrial-uniforms" className="hover:underline">Industrial Safety Workwear</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-white">Connect with Us</h4>
            <ul className="mt-3 space-y-2 text-xs text-slate-300">
              <li><a href={site.instagram || '#'} target="_blank" rel="noreferrer" className="hover:underline">Instagram</a></li>
              <li><a href="https://wa.me/918546063989" target="_blank" rel="noreferrer" className="hover:underline">WhatsApp Direct</a></li>
              <li><Link to="/policies/contact-information" className="hover:underline">Contact Support</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-white">Make Money with Us</h4>
            <ul className="mt-3 space-y-2 text-xs text-slate-300">
              <li><Link to="/#b2b-quote" className="hover:underline text-[#FBBF24]">Bulk & Corporate Supply</Link></li>
              <li><Link to="/pages/work-with-us" className="hover:underline">Wholesale Partnerships</Link></li>
              <li><Link to="/admin/login" className="hover:underline">Seller / Admin Portal</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-white">Let Us Help You</h4>
            <ul className="mt-3 space-y-2 text-xs text-slate-300">
              <li><Link to="/account" className="hover:underline">Your Account</Link></li>
              <li><Link to="/track" className="hover:underline">Track Your Orders</Link></li>
              <li><Link to="/policies/shipping-policy" className="hover:underline">Shipping Rates & Policies</Link></li>
              <li><Link to="/policies/refund-policy" className="hover:underline">Returns & Replacements</Link></li>
            </ul>
          </div>
        </div>

        {/* Divider with Logo & Language selector */}
        <div className="border-t border-slate-700/60 py-6 text-center">
          <div className="container flex flex-wrap items-center justify-center gap-6">
            <span className="font-sans text-xl font-black text-white">
              onlinegulfuniform<span className="text-[#FBBF24]">.com</span>
            </span>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="rounded border border-slate-600 px-2 py-1">🌐 English · العربية · മലയാളം</span>
              <span className="rounded border border-slate-600 px-2 py-1">🇮🇳 India · 🇦🇪 UAE</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom White Strip */}
      <div className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="container flex flex-col items-center justify-center gap-1 sm:flex-row sm:gap-4">
          <span>{t('footerCopyright')}</span>
          <span className="hidden sm:inline">•</span>
          <span>{t('allRightsReserved')}</span>
        </div>
      </div>
    </footer>
  )
}
