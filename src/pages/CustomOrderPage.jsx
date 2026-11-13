import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Breadcrumbs from '../components/Breadcrumbs'
import Img from '../components/Img'
import Seo from '../components/Seo'
import { apiPost } from '../lib/api.js'
import { useStore } from '../store/StoreContext.jsx'
import { storefrontContent } from '../store/selectors.js'

const OCCASION_OPTIONS = [
  'Wedding / Reception Favours',
  'Birthday / Anniversary',
  'Corporate Gifting & Hampers',
  'Festive & Diwali Hampers',
  'Baby Shower / Return Gifts',
  'Personalised Home & Gifting',
  'Custom Fragrance & Jar',
  'Other / Custom Occasion...',
]

const QUANTITY_OPTIONS = [
  '1 – 10 pcs',
  '11 – 50 pcs',
  '51 – 100 pcs',
  '101 – 250 pcs',
  '250+ pcs (Bulk)',
]

export default function CustomOrderPage({ initialType }) {
  const { state } = useStore()
  const content = storefrontContent(state)
  const site = content.site || {}
  const whatsappLink = site.whatsapp || 'https://api.whatsapp.com/send/?phone=7046735536'
  const location = useLocation()

  const defaultOccasion = () => {
    if (initialType) return initialType
    const path = location.pathname.toLowerCase()
    if (path.includes('hamper')) return 'Corporate Gifting & Hampers'
    if (path.includes('bulk') || path.includes('return')) return 'Wedding / Reception Favours'
    if (path.includes('customised')) return 'Personalised Home & Gifting'
    return OCCASION_OPTIONS[0]
  }

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    occasion: defaultOccasion(),
    customOccasion: '',
    quantity: QUANTITY_OPTIONS[1],
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    setForm((prev) => ({ ...prev, occasion: defaultOccasion() }))
  }, [location.pathname, initialType])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (error) setError('')
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: false }))
  }

  const getEffectiveOccasion = () => {
    if (form.occasion === 'Other / Custom Occasion...') {
      return form.customOccasion.trim() || 'Custom Occasion'
    }
    return form.occasion
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) {
      errs.name = true
      setError('Please enter your name.')
      setFieldErrors(errs)
      return
    }
    if (!form.phone.trim()) {
      errs.phone = true
      setError('Please enter your phone / WhatsApp number.')
      setFieldErrors(errs)
      return
    }
    const cleanPhone = form.phone.replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      errs.phone = true
      setError('Please enter a valid 10-digit mobile / WhatsApp number.')
      setFieldErrors(errs)
      return
    }
    if (form.occasion === 'Other / Custom Occasion...' && !form.customOccasion.trim()) {
      errs.customOccasion = true
      setError('Please type your custom occasion / event name.')
      setFieldErrors(errs)
      return
    }

    setFieldErrors({})
    setSubmitting(true)
    setError('')

    const effectiveOccasion = getEffectiveOccasion()
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      occasion: effectiveOccasion,
      quantity: form.quantity,
      message: form.message.trim(),
    }

    // Send to backend API
    try {
      await apiPost('/enquiries', payload)
      setSubmitting(false)
      setSubmitted(true)
    } catch (err) {
      setSubmitting(false)
      setError(err?.message || 'Failed to submit enquiry. Please try again or chat with us on WhatsApp.')
    }
  }

  const generateWhatsAppUrl = () => {
    const effectiveOccasion = getEffectiveOccasion()
    const msg =
      `*Custom Product Enquiry — EvaraNest*\n\n` +
      `*Name:* ${form.name}\n` +
      `*Phone:* ${form.phone}\n` +
      (form.email ? `*Email:* ${form.email}\n` : '') +
      `*Occasion / Event:* ${effectiveOccasion}\n` +
      `*Quantity:* ${form.quantity}\n` +
      (form.message ? `*Notes:* ${form.message}\n` : '')

    const phoneMatch = whatsappLink.match(/phone=([0-9]+)/)
    const phoneNum = phoneMatch ? phoneMatch[1] : '7046735536'
    return `https://api.whatsapp.com/send?phone=${phoneNum}&text=${encodeURIComponent(msg)}`
  }

  const handleReset = () => {
    setForm({
      name: '',
      phone: '',
      email: '',
      occasion: OCCASION_OPTIONS[0],
      customOccasion: '',
      quantity: QUANTITY_OPTIONS[1],
      message: '',
    })
    setSubmitted(false)
  }

  return (
    <div className="bg-cream min-h-screen pb-16">
      <Seo
        title="Custom Candle Orders & Bulk Gifting Hampers"
        description="Order bespoke scented candles, personalised wedding favours, Diwali gift hampers, and corporate bulk gifting from EvaraNest. Custom labels, jars, and fragrances."
        keywords="custom candles India, personalised candle gifts, wedding return gifts candles, corporate gift hampers, bulk candle orders, bespoke scented candles"
        canonical="/custom-orders"
      />
      

      {/* Main Full-Width Hero & Form Section */}
      <section className="relative w-full overflow-hidden border-y border-line shadow-sm">
        {/* Background Image */}
        <Img
          src="https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=2000&q=80"
          alt="EvaraNest Custom Orders"
          width={2000}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        {/* Ambient Dark Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/85 to-ink/75 backdrop-blur-[1.5px]" />

        {/* Inner Content Grid */}
        <div className="w-full relative z-10 mx-auto max-w-6xl px-2.5 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            
            {/* Left Column: Heading & Value Proposition with generous spacing */}
            <div className="lg:col-span-6 text-white flex flex-col justify-center pr-0 lg:pr-4">
              <div>
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-brand/40 border border-brand/60 text-lime mb-5 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-lime animate-pulse" />
                  Bespoke &amp; Bulk Orders
                </span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] leading-snug tracking-wide uppercase text-white mb-5">
                Custom Orders &amp; Gifting Atelier
              </h1>

              <p className="text-sm sm:text-[15px] leading-relaxed text-gray-200 mb-7 max-w-xl">
                Have a specific candle idea in mind? Whether it is custom-scented wedding favours, personalized name jar candles, festive gift hampers, or corporate brand gifting — we craft bespoke creations made exactly to your requirements.
              </p>

              <div className="space-y-3 border-t border-white/20 pt-5">
                <div className="flex items-center gap-3 text-xs sm:text-[13.5px] text-gray-100">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime/20 text-lime text-[11px] font-bold ring-1 ring-lime/40">
                    ✓
                  </span>
                  <span>100% Pure Soy &amp; Beeswax with custom scent profiles</span>
                </div>
                <div className="flex items-center gap-3 text-xs sm:text-[13.5px] text-gray-100">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime/20 text-lime text-[11px] font-bold ring-1 ring-lime/40">
                    ✓
                  </span>
                  <span>Personalized custom foil labels, monograms &amp; packaging</span>
                </div>
                <div className="flex items-center gap-3 text-xs sm:text-[13.5px] text-gray-100">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime/20 text-lime text-[11px] font-bold ring-1 ring-lime/40">
                    ✓
                  </span>
                  <span>Tiered bulk pricing &amp; insured pan-India doorstep delivery</span>
                </div>
              </div>
            </div>

            {/* Right Column: Custom Product Enquiry Form */}
            <div className="lg:col-span-6 w-full max-w-xl mx-auto lg:max-w-none">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 md:p-6 shadow-2xl border border-white/50 text-ink w-full">
                {!submitted ? (
                  <>
                    <div className="border-b border-gray-200 pb-3 mb-4">
                      <h2 className="font-display text-xl sm:text-2xl leading-snug tracking-wide uppercase text-ink">
                        Submit Your Custom Order Enquiry
                      </h2>
                      <p className="text-xs text-muted mt-1">
                        Fill in your details below. We will revert with custom mockups and pricing.
                      </p>
                    </div>

                    {error && (
                      <div className="mb-3 rounded-lg bg-sale/10 border border-sale/30 p-2 text-xs text-sale">
                        {error}
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-graphite mb-1">
                            Your Name <span className="text-sale">*</span>
                          </label>
                          <input
                            type="text"
                            name="name"
                            required
                            placeholder="e.g. Priya Sharma"
                            value={form.name}
                            onChange={handleChange}
                            className={`w-full rounded-lg border bg-white px-3 py-2 text-xs sm:text-[13px] text-ink outline-none transition shadow-sm ${
                              fieldErrors.name
                                ? 'border-red-500 ring-1 ring-red-500/30'
                                : 'border-gray-300 hover:border-gray-400 focus:border-brand focus:ring-1 focus:ring-brand'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-graphite mb-1">
                            WhatsApp / Phone <span className="text-sale">*</span>
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            required
                            maxLength={10}
                            placeholder="e.g. 9876543210"
                            value={form.phone}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                              setForm((prev) => ({ ...prev, phone: digits }))
                              if (error) setError('')
                              if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: false }))
                            }}
                            className={`w-full rounded-lg border bg-white px-3 py-2 text-xs sm:text-[13px] text-ink outline-none transition shadow-sm ${
                              fieldErrors.phone
                                ? 'border-red-500 ring-1 ring-red-500/30'
                                : 'border-gray-300 hover:border-gray-400 focus:border-brand focus:ring-1 focus:ring-brand'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-graphite mb-1">
                            Email Address <span className="text-muted font-normal">(Optional)</span>
                          </label>
                          <input
                            type="email"
                            name="email"
                            placeholder="e.g. priya@example.com"
                            value={form.email}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 hover:border-gray-400 bg-white px-3 py-2 text-xs sm:text-[13px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand shadow-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-graphite mb-1">
                            Occasion / Event
                          </label>
                          <select
                            name="occasion"
                            value={form.occasion}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 hover:border-gray-400 bg-white px-3 py-2 text-xs sm:text-[13px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand shadow-sm cursor-pointer"
                          >
                            {OCCASION_OPTIONS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {form.occasion === 'Other / Custom Occasion...' && (
                        <div className="animate-fadeIn">
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-graphite mb-1">
                            Custom Occasion Name <span className="text-sale">*</span>
                          </label>
                          <input
                            type="text"
                            name="customOccasion"
                            required
                            placeholder="e.g. Brand Launch, Housewarming..."
                            value={form.customOccasion}
                            onChange={handleChange}
                            className={`w-full rounded-lg border bg-white px-3 py-2 text-xs sm:text-[13px] text-ink outline-none transition shadow-sm ${
                              fieldErrors.customOccasion
                                ? 'border-red-500 ring-1 ring-red-500/30'
                                : 'border-gray-300 hover:border-gray-400 focus:border-brand focus:ring-1 focus:ring-brand'
                            }`}
                            autoFocus
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-graphite mb-1">
                          Estimated Quantity
                        </label>
                        <select
                          name="quantity"
                          value={form.quantity}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-gray-300 hover:border-gray-400 bg-white px-3 py-2 text-xs sm:text-[13px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand shadow-sm cursor-pointer"
                        >
                          {QUANTITY_OPTIONS.map((q) => (
                            <option key={q} value={q}>
                              {q}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-graphite mb-1">
                          Specifications &amp; Message
                        </label>
                        <textarea
                          name="message"
                          rows={3}
                          placeholder="Tell us about your fragrance preference, custom message on jar, delivery deadline, etc."
                          value={form.message}
                          onChange={handleChange}
                          className="w-full resize-none rounded-lg border border-gray-300 hover:border-gray-400 bg-white px-3 py-2 text-xs sm:text-[13px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand shadow-sm"
                        />
                      </div>

                      <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="btn-ink flex-1 justify-center py-2.5 text-xs tracking-wider"
                        >
                          {submitting ? 'Submitting...' : 'Submit Custom Enquiry'}
                        </button>

                        <a
                          href={generateWhatsAppUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-save/50 bg-save/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-save hover:bg-save hover:text-white transition-colors"
                        >
                          <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z" />
                          </svg>
                          WhatsApp Direct
                        </a>
                      </div>
                    </form>
                  </>
                ) : (
                  <div className="py-6 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-save/15 text-save">
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>

                    <h3 className="font-display text-2xl tracking-wide uppercase text-ink">
                      Enquiry Received!
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-muted max-w-sm mx-auto">
                      Thank you, <strong className="text-ink">{form.name}</strong>! We have received your custom order request for <strong className="text-ink">{getEffectiveOccasion()}</strong> ({form.quantity}). Our atelier team will connect with you shortly.
                    </p>

                    <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                      <a
                        href={generateWhatsAppUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ink w-full sm:w-auto px-6 py-2.5 bg-save hover:bg-save/90 text-white"
                      >
                        Chat on WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="btn-outline w-full sm:w-auto px-6 py-2.5"
                      >
                        Submit Another Enquiry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      

      {/* Explore Ready-To-Ship Collections CTA */}
      <div className="container max-w-6xl mt-12 sm:mt-14">
        <div className="rounded-xl bg-chalk border border-line p-8 sm:p-10 text-center">
          <h3 className="font-display text-2xl sm:text-3xl leading-snug tracking-wide uppercase text-ink mb-3">
            Looking for Ready-To-Ship Candles?
          </h3>
          <p className="text-xs sm:text-sm text-muted max-w-lg mx-auto mb-6 leading-relaxed">
            Explore our curated catalog of handcrafted scented jar candles, luxury pillar candles, and reed diffusers available for immediate dispatch.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <Link to="/collections/all-candles" className="btn-ink px-6 py-3">
              Shop All Candles
            </Link>
            <Link to="/collections/all-products" className="btn-outline px-6 py-3">
              View Entire Catalogue
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
