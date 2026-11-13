import { useState } from 'react'
import { apiPost } from '../lib/api.js'
import { useStore } from '../store/StoreContext.jsx'
import { storefrontContent } from '../store/selectors.js'
import Img from './Img'
import Marquee from './Marquee'

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

/** Full-bleed brand banner with custom product enquiry form + "Handmade with care" kicker line. */
export default function AboutBanner() {
  const { state } = useStore()
  const content = storefrontContent(state)
  const aboutBanner = content.aboutBanner
  const whatsappLink = content.site?.whatsapp || 'https://api.whatsapp.com/send/?phone=7046735536'

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    occasion: OCCASION_OPTIONS[0],
    customOccasion: '',
    quantity: QUANTITY_OPTIONS[1],
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  if (!aboutBanner?.image) return null

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

    // Call API backend to save and send email notification
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
    <section className="bg-cream">
      {/* Banner Image with Custom Product Enquiry Form Overlay */}
      <div className="relative min-h-[500px] lg:min-h-[540px] flex items-center justify-center py-8 sm:py-12 px-2 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Image */}
        <Img
          src={aboutBanner.image}
          alt="EvaraNest — handmade with care"
          width={1800}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        {/* Ambient Dark Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/85 to-ink/70 backdrop-blur-[1.5px]" />

        {/* Inner Content Container */}
        <div className="w-full relative z-10 mx-auto max-w-6xl px-2.5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column: Heading & Highlights with generous spacing */}
            <div className="lg:col-span-6 text-white pr-0 lg:pr-4 flex flex-col justify-center">
              <div>
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold tracking-wider uppercase bg-brand/40 border border-brand/60 text-lime mb-5 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-lime animate-pulse" />
                  Custom Orders &amp; Bulk Gifting
                </span>
              </div>

              <h2 className="font-display whitespace-nowrap text-2xl min-[420px]:text-3xl sm:text-4xl md:text-5xl lg:text-[34px] xl:text-[44px] uppercase  text-white mb-4">
                Handcrafted Just For You
              </h2>

              <p className="text-[15px] sm:text-[17px] leading-relaxed text-gray-200 mb-7 max-w-xl">
                Looking for bespoke scents, personalised wedding favours, customized candle hampers, or bulk corporate gifting? Tell us your vision and we will pour it to perfection.
              </p>

              <div className="space-y-2 border-t border-white/20 pt-3.5">
                <div className="flex items-center gap-2.5 text-sm sm:text-base text-gray-100">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime/20 text-lime text-[11px] font-bold ring-1 ring-lime/40">
                    ✓
                  </span>
                  <span>100% Pure Soy &amp; Beeswax blends</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm sm:text-base text-gray-100">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime/20 text-lime text-[11px] font-bold ring-1 ring-lime/40">
                    ✓
                  </span>
                  <span>Custom labels, packaging &amp; note cards</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm sm:text-base text-gray-100">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime/20 text-lime text-[11px] font-bold ring-1 ring-lime/40">
                    ✓
                  </span>
                  <span>Attractive bulk discounts &amp; fast delivery</span>
                </div>
              </div>
            </div>

            {/* Right Column: Custom Product Enquiry Form Card */}
            <div className="lg:col-span-6 w-full max-w-xl mx-auto lg:max-w-none">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 md:p-6 shadow-2xl border border-white/50 text-ink w-full">
                {!submitted ? (
                  <>
                    <div className="border-b border-gray-200 pb-2.5 mb-3.5">
                      <h3 className=" font-bold text-lg sm:text-xl uppercase text-brand  text-ink">
                        Custom Product Enquiry
                      </h3>
                      <p className="text-[11px] sm:text-xs text-muted mt-0.5">
                        Share your requirements below. We will revert with custom pricing and details.
                      </p>
                    </div>

                    {error && (
                      <div className="mb-3 rounded-lg bg-sale/10 border border-sale/30 p-2 text-xs text-sale">
                        {error}
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Name */}
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
                            className={`w-full rounded-lg border bg-white px-3 py-1.5 sm:py-2 text-xs sm:text-[13px] text-ink outline-none transition shadow-sm ${
                              fieldErrors.name
                                ? 'border-red-500 ring-1 ring-red-500/30'
                                : 'border-gray-300 hover:border-gray-400 focus:border-brand focus:ring-1 focus:ring-brand'
                            }`}
                          />
                        </div>

                        {/* Phone / WhatsApp */}
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
                            className={`w-full rounded-lg border bg-white px-3 py-1.5 sm:py-2 text-xs sm:text-[13px] text-ink outline-none transition shadow-sm ${
                              fieldErrors.phone
                                ? 'border-red-500 ring-1 ring-red-500/30'
                                : 'border-gray-300 hover:border-gray-400 focus:border-brand focus:ring-1 focus:ring-brand'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Email */}
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
                            className="w-full rounded-lg border border-gray-300 hover:border-gray-400 bg-white px-3 py-1.5 sm:py-2 text-xs sm:text-[13px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand shadow-sm"
                          />
                        </div>

                        {/* Occasion / Event */}
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-graphite mb-1">
                            Occasion / Event
                          </label>
                          <select
                            name="occasion"
                            value={form.occasion}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 hover:border-gray-400 bg-white px-3 py-1.5 sm:py-2 text-xs sm:text-[13px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand shadow-sm cursor-pointer"
                          >
                            {OCCASION_OPTIONS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* If "Other / Custom Occasion" is chosen, show text input to type custom occasion */}
                      {form.occasion === 'Other / Custom Occasion...' && (
                        <div className="animate-fadeIn">
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-graphite mb-1">
                            Enter Custom Occasion / Event Name <span className="text-sale">*</span>
                          </label>
                          <input
                            type="text"
                            name="customOccasion"
                            required
                            placeholder="e.g. Housewarming Party, Brand Launch, Pooja..."
                            value={form.customOccasion}
                            onChange={handleChange}
                            className={`w-full rounded-lg border bg-white px-3 py-1.5 sm:py-2 text-xs sm:text-[13px] text-ink outline-none transition shadow-sm ${
                              fieldErrors.customOccasion
                                ? 'border-red-500 ring-1 ring-red-500/30'
                                : 'border-gray-300 hover:border-gray-400 focus:border-brand focus:ring-1 focus:ring-brand'
                            }`}
                            autoFocus
                          />
                        </div>
                      )}

                      {/* Quantity */}
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-graphite mb-1">
                          Estimated Quantity
                        </label>
                        <select
                          name="quantity"
                          value={form.quantity}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-gray-300 hover:border-gray-400 bg-white px-3 py-1.5 sm:py-2 text-xs sm:text-[13px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand shadow-sm cursor-pointer"
                        >
                          {QUANTITY_OPTIONS.map((q) => (
                            <option key={q} value={q}>
                              {q}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Message / Specifications */}
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-graphite mb-1">
                          Custom Details / Message
                        </label>
                        <textarea
                          name="message"
                          rows={2}
                          placeholder="Describe fragrance preference, jar style, event date, personalized text, etc."
                          value={form.message}
                          onChange={handleChange}
                          className="w-full resize-none rounded-lg border border-gray-300 hover:border-gray-400 bg-white px-3 py-1.5 sm:py-2 text-xs sm:text-[13px] text-ink outline-none transition focus:border-brand focus:ring-1 focus:ring-brand shadow-sm"
                        />
                      </div>

                      {/* Submit Actions */}
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
                          <svg
                            className="h-4 w-4 fill-current"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z" />
                          </svg>
                          WhatsApp Direct
                        </a>
                      </div>
                    </form>
                  </>
                ) : (
                  <div className="py-4 text-center">
                    <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-save/15 text-save">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>

                    <h3 className="font-display text-lg sm:text-xl uppercase tracking-tight text-ink">
                      Enquiry Received!
                    </h3>
                    <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
                      Thank you, <strong className="text-ink">{form.name}</strong>! We have received your custom order request for <strong className="text-ink">{getEffectiveOccasion()}</strong> ({form.quantity}). Our team will connect with you shortly.
                    </p>

                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                      <a
                        href={generateWhatsAppUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ink w-full sm:w-auto px-5 py-2 bg-save hover:bg-save/90 text-white text-xs"
                      >
                        Chat on WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="btn-outline w-full sm:w-auto px-5 py-2 text-xs"
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
      </div>

      {/* "Handmade with care" Kicker Banner */}
      <div className="py-8 text-center md:py-10">
        <p className="font-display text-[28px] uppercase leading-none md:text-[44px]">
          {aboutBanner.kicker}
        </p>
      </div>

      {/* Continuous Marquee */}
      <Marquee repeat={14} speed="animate-marquee-slow" />
    </section>
  )
}

