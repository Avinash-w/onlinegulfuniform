import { useState } from 'react'
import { apiPost } from '../lib/api.js'

/* Palette: white #FFFFFF · navy #0B2545 · royal blue #1D4ED8 · deep blue #1E40AF · tint #EFF4FF */

const SECTORS = [
  { id: 'Corporate', label: 'Corporate & Executive Suits' },
  { id: 'Hospitality', label: 'Hospitality & Chef Uniforms' },
  { id: 'Healthcare', label: 'Healthcare & Medical Scrubs' },
  { id: 'Industrial', label: 'Industrial & Safety Coveralls' },
  { id: 'School', label: 'School Uniforms & Blazers' },
  { id: 'Fabrics', label: 'Textiles & Custom Fabric Rolls' },
  { id: 'Promotional', label: 'Promotional Giveaways & Bags' },
  { id: 'Stock', label: 'Stock Items (Polos, Cargo, Shirts)' },
]

const CUSTOMIZATION_TYPES = [
  'Japanese Barudan Embroidery',
  'Screen Printing (Multi-Color)',
  'Dye Sublimation Printing',
  'Direct-to-Film (DTF) Heat Press',
  'Plain Unbranded Garments',
]

const VOLUMES = [
  '10 – 50 pcs (Sample / Small Batch)',
  '51 – 200 pcs (Standard Corporate)',
  '201 – 1,000 pcs (Enterprise Bulk)',
  '1,000+ pcs (Large Tender / Chain)',
]

const REGIONS = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'GCC / Export', 'Other']

const EMPTY_FORM = {
  companyName: '',
  name: '',
  phone: '',
  email: '',
  sector: SECTORS[0].id,
  customization: CUSTOMIZATION_TYPES[0],
  quantity: VOLUMES[1],
  city: 'Dubai',
  message: '',
}

// Shared styles
const fieldBase =
  'mt-1.5 w-full rounded-xl border border-[#0B2545]/15 bg-white px-4 py-3 text-base text-[#0B2545] placeholder-[#0B2545]/35 transition focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/25 sm:text-sm'
const labelBase = 'block text-sm font-semibold text-[#0B2545]'
const stepLabel = 'flex items-center gap-2 text-sm font-semibold text-[#0B2545]'

function Step({ n, children }) {
  return (
    <span className={stepLabel}>
      <span className="grid h-6 w-6 place-items-center rounded-full bg-[#1D4ED8] text-xs font-bold text-white">
        {n}
      </span>
      {children}
    </span>
  )
}

export default function B2BQuoteBuilder() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Please provide your contact name.')
      return
    }
    if (!form.phone.trim()) {
      setError('Please enter your phone / WhatsApp number.')
      return
    }

    setSubmitting(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      occasion: `[B2B Quote] ${form.companyName ? form.companyName + ' - ' : ''}${form.sector} (${form.customization})`,
      quantity: form.quantity,
      message: `Company: ${form.companyName || 'N/A'}\nLocation: ${form.city}\nSector: ${form.sector}\nCustomization: ${form.customization}\nVolume: ${form.quantity}\nNotes: ${form.message}`,
    }

    try {
      const res = await apiPost('/enquiries', payload)
      if (res && res.success !== false) {
        setSubmitted(true)
      } else {
        setError(res?.message || 'Could not submit your quote request. Please try again.')
      }
    } catch (err) {
      setError(err?.message || 'Network error while submitting. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="bg-[#EFF4FF] py-14 md:py-20" id="b2b-quote">
      <div className="container px-4 lg:px-8">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-[#0B2545]/10 bg-white shadow-xl shadow-[#0B2545]/5">
          {/* Header band */}
          <div className="bg-gradient-to-br from-[#1D4ED8] via-[#1E40AF] to-[#0B2545] px-6 py-8 text-center text-white sm:px-10 sm:py-10">
            <span className="inline-block rounded-full border border-white/30 bg-white/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#BFDBFE]">
              Get an Immediate Factory Quote
            </span>
            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
              Request Your Custom Uniform Quote
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/75">
              Receive a comprehensive quotation, fabric swatch recommendation, and complimentary
              digital mockup within 4 business hours.
            </p>
          </div>

          <div className="p-6 sm:p-10">
            {submitted ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-3xl text-emerald-600">
                  ✓
                </div>
                <h3 className="mt-4 font-serif text-2xl font-semibold text-[#0B2545]">
                  Quote Request Received!
                </h3>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-[#0B2545]/70">
                  Thank you, <span className="font-semibold text-[#0B2545]">{form.name}</span>. Our
                  UAE sales and technical team will review your specifications and contact you
                  shortly with direct factory pricing.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <a
                    href={`https://wa.me/971501234567?text=${encodeURIComponent(
                      `Hello Legend Uniforms, I just submitted an inquiry for ${form.sector} uniforms for ${form.companyName || form.name}.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    💬 Fast-Track on WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false)
                      setForm(EMPTY_FORM)
                    }}
                    className="rounded-full border border-[#0B2545]/20 bg-white px-6 py-3 text-sm font-semibold text-[#0B2545] transition hover:bg-[#EFF4FF]"
                  >
                    Submit Another RFQ
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700"
                  >
                    {error}
                  </div>
                )}

                {/* 1. Sector */}
                <div>
                  <Step n={1}>Select Industry / Garment Sector</Step>
                  <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {SECTORS.map((s) => {
                      const active = form.sector === s.id
                      return (
                        <button
                          type="button"
                          key={s.id}
                          aria-pressed={active}
                          onClick={() => setForm((p) => ({ ...p, sector: s.id }))}
                          className={`rounded-xl border p-3 text-left text-[13px] font-semibold leading-snug transition ${
                            active
                              ? 'border-[#1D4ED8] bg-[#EFF4FF] text-[#1D4ED8] ring-2 ring-[#1D4ED8]/30'
                              : 'border-[#0B2545]/15 bg-white text-[#0B2545]/75 hover:border-[#1D4ED8]/50 hover:bg-[#EFF4FF]/60'
                          }`}
                        >
                          {s.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 2 & 3. Customization & Volume */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="customization">
                      <Step n={2}>Customization Technique</Step>
                    </label>
                    <select
                      id="customization"
                      name="customization"
                      value={form.customization}
                      onChange={handleChange}
                      className={fieldBase}
                    >
                      {CUSTOMIZATION_TYPES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="quantity">
                      <Step n={3}>Estimated Order Quantity</Step>
                    </label>
                    <select
                      id="quantity"
                      name="quantity"
                      value={form.quantity}
                      onChange={handleChange}
                      className={fieldBase}
                    >
                      {VOLUMES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4. Contact details */}
                <div>
                  <Step n={4}>Company &amp; Contact Details</Step>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="companyName" className={labelBase}>
                        Company Name
                      </label>
                      <input
                        id="companyName"
                        type="text"
                        name="companyName"
                        placeholder="e.g. Al Habtoor Group / Emirates Clinic"
                        value={form.companyName}
                        onChange={handleChange}
                        className={fieldBase}
                      />
                    </div>

                    <div>
                      <label htmlFor="name" className={labelBase}>
                        Contact Person Name <span className="text-[#1D4ED8]">*</span>
                      </label>
                      <input
                        id="name"
                        type="text"
                        name="name"
                        required
                        placeholder="Your Full Name"
                        value={form.name}
                        onChange={handleChange}
                        className={fieldBase}
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className={labelBase}>
                        Phone / WhatsApp Number <span className="text-[#1D4ED8]">*</span>
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        name="phone"
                        required
                        placeholder="+971 50 123 4567"
                        value={form.phone}
                        onChange={handleChange}
                        className={fieldBase}
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className={labelBase}>
                        Corporate Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        name="email"
                        placeholder="procurement@company.com"
                        value={form.email}
                        onChange={handleChange}
                        className={fieldBase}
                      />
                    </div>
                  </div>
                </div>

                {/* Region */}
                <div>
                  <span className={labelBase}>Delivery Region / Emirate</span>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {REGIONS.map((loc) => {
                      const active = form.city === loc
                      return (
                        <button
                          type="button"
                          key={loc}
                          aria-pressed={active}
                          onClick={() => setForm((p) => ({ ...p, city: loc }))}
                          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                            active
                              ? 'border-[#1D4ED8] bg-[#1D4ED8] text-white'
                              : 'border-[#0B2545]/15 bg-white text-[#0B2545]/75 hover:border-[#1D4ED8]/50 hover:bg-[#EFF4FF]'
                          }`}
                        >
                          {loc}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="message" className={labelBase}>
                    Project Details / Fabric Preference / Specifications
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    placeholder="Tell us about color codes, logo placements, required delivery deadline, or any special textile requirements..."
                    value={form.message}
                    onChange={handleChange}
                    className={fieldBase}
                  />
                </div>

                {/* Submit */}
                <div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-full bg-[#1D4ED8] py-4 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-[#1D4ED8]/25 transition hover:bg-[#1E40AF] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting
                      ? 'Submitting Quotation Request...'
                      : 'Submit Request for Factory Quote →'}
                  </button>
                  <p className="mt-3 text-center text-xs text-[#0B2545]/55">
                    🔒 Strictly Confidential B2B Pricing. We never share your company information.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}