import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function B2BHeroShowcase({ onOpenCatalogue }) {
  const [activeSlide, setActiveSlide] = useState(0)

  const slides = [
    {
      sector: 'Corporate & Hospitality',
      title: 'Precision Tailored Uniforms for Leading Brands Across the Middle East',
      subtitle:
        'Custom suits, luxury chef jackets, front-desk blazers, and staff apparel designed for durability, comfort, and immaculate brand presentation.',
      image:
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1600&q=80',
      badge: 'Hospitality & Executive Suites',
    },
    {
      sector: 'Healthcare & Clinical',
      title: 'Anti-Microbial Medical Scrubs & Certified Laboratory Wear',
      subtitle:
        'Engineered with high-grade breathable fabrics, fluid-resistant barriers, and bespoke department embroidery for hospitals and clinics.',
      image:
        'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1600&q=80',
      badge: 'Healthcare & Dental Facilities',
    },
    {
      sector: 'Industrial & High-Visibility',
      title: 'Heavy-Duty Workwear & EN-Standard Protective Safety Apparel',
      subtitle:
        'Flame-retardant coveralls, reflective safety vests, and rugged cargo work trousers engineered to withstand harsh desert and industrial conditions.',
      image:
        'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1600&q=80',
      badge: 'Aviation, Oil & Gas, Construction',
    },
  ]

  const current = slides[activeSlide]

  return (
    <section className="relative overflow-hidden bg-[#0A192F] py-12 text-white md:py-20 lg:py-24">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-[130px]" />

      <div className="container relative z-10 px-4 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Value Proposition & CTAs */}
          <div className="lg:col-span-7">
            {/* Top pill badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-amber-300">
              <span className="flex h-2 w-2 rounded-full bg-amber-400" />
              <span>LEGEND UNIFORMS • UAE & GCC MANUFACTURING</span>
            </div>

            {/* Main title */}
            <h1 className="mt-4 font-display text-3xl uppercase tracking-tight sm:text-4xl md:text-5xl lg:text-[56px] lg:leading-[1.08]">
              {current.title}
            </h1>

            {/* Subtitle */}
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              {current.subtitle}
            </p>

            {/* In-House Technology Highlights */}
            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-300">
              <span className="rounded-md bg-slate-800/80 px-2.5 py-1 text-slate-200 ring-1 ring-slate-700">
                ⚡ Japanese Barudan Multi-Head Embroidery
              </span>
              <span className="rounded-md bg-slate-800/80 px-2.5 py-1 text-slate-200 ring-1 ring-slate-700">
                🪡 King Fisher High-Tensile Thread
              </span>
              <span className="rounded-md bg-slate-800/80 px-2.5 py-1 text-slate-200 ring-1 ring-slate-700">
                🎨 Screen & Sublimation Printing
              </span>
            </div>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#b2b-quote"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] hover:shadow-amber-500/30 active:scale-95"
              >
                <span>Request Bulk Quote</span>
                <span className="text-base">→</span>
              </a>

              <button
                type="button"
                onClick={onOpenCatalogue}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-6 py-3.5 text-sm font-semibold tracking-wide text-white backdrop-blur transition-all hover:border-slate-500 hover:bg-slate-750 active:scale-95"
              >
                <span>📥 Download Catalogue (PDF)</span>
              </button>

              <Link
                to="/collections/all-products"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-400 underline-offset-4 hover:underline"
              >
                <span>Explore Products</span>
                <span>↗</span>
              </Link>
            </div>

            {/* Slide Navigation Dots */}
            <div className="mt-10 flex items-center gap-3">
              <span className="text-xs uppercase tracking-wider text-slate-400">Featured Industry:</span>
              <div className="flex gap-2">
                {slides.map((s, idx) => (
                  <button
                    key={s.sector}
                    onClick={() => setActiveSlide(idx)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                      activeSlide === idx
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {s.sector.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Visual Showcase Card */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Outer decorative ring */}
              <div className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-b from-slate-800/60 to-slate-900/90 p-3 shadow-2xl backdrop-blur-xl">
                <div className="relative aspect-[4/4.8] w-full overflow-hidden rounded-2xl">
                  <img
                    src={current.image}
                    alt={current.title}
                    className="h-full w-full object-cover transition-all duration-700 hover:scale-105"
                  />
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

                  {/* Floating badge */}
                  <div className="absolute left-4 top-4 rounded-xl border border-white/20 bg-slate-950/70 px-3.5 py-1.5 backdrop-blur-md">
                    <span className="text-xs font-semibold text-amber-300">
                      ★ {current.badge}
                    </span>
                  </div>

                  {/* Bottom details card */}
                  <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-slate-900/80 p-4 backdrop-blur-md">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold uppercase tracking-wider text-slate-300">
                        Made in Dubai, UAE
                      </span>
                      <span className="font-bold text-emerald-400">● In Stock & Custom</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Custom sizes XS–6XL · 100+ GSM options · Sample swatches available
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating review/trust card */}
              <div className="absolute -bottom-6 -left-6 hidden rounded-2xl border border-slate-700 bg-slate-900/95 p-4 shadow-xl backdrop-blur-lg sm:flex sm:items-center sm:gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/20 text-amber-400">
                  🏆
                </div>
                <div>
                  <div className="text-xs font-bold text-white">MENA Quality Certified</div>
                  <div className="text-[11px] text-slate-400">Trusted by 500+ UAE Corporations</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust Metrics Bar */}
        <div className="mt-16 grid grid-cols-2 gap-4 border-t border-slate-800 pt-8 sm:grid-cols-4 lg:gap-8">
          <div className="flex flex-col">
            <span className="font-display text-3xl font-bold text-amber-400 lg:text-4xl">15+</span>
            <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Years in UAE & MENA
            </span>
            <span className="text-[11px] text-slate-500">Established factory infrastructure</span>
          </div>

          <div className="flex flex-col">
            <span className="font-display text-3xl font-bold text-amber-400 lg:text-4xl">500+</span>
            <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Corporate & Hotel Clients
            </span>
            <span className="text-[11px] text-slate-500">Across Dubai, Abu Dhabi, GCC</span>
          </div>

          <div className="flex flex-col">
            <span className="font-display text-3xl font-bold text-amber-400 lg:text-4xl">100%</span>
            <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              In-House Production
            </span>
            <span className="text-[11px] text-slate-500">Japanese Barudan Embroidery</span>
          </div>

          <div className="flex flex-col">
            <span className="font-display text-3xl font-bold text-amber-400 lg:text-4xl">48 Hrs</span>
            <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Rapid Sample Dispatch
            </span>
            <span className="text-[11px] text-slate-500">Immediate stock lines available</span>
          </div>
        </div>
      </div>
    </section>
  )
}
