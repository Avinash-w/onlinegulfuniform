import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=400&q=80'

function ProductTile({ p, meta }) {
  const hasDiscount = p.compareAt && p.compareAt > p.price
  return (
    <Link to={`/products/${p.handle}`} className="group block">
      <div className="aspect-[4/5] overflow-hidden rounded-xl bg-[#EFF4FF]">
        <img
          src={p.images?.[0] || FALLBACK_IMG}
          alt={p.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
      <p className="mt-2 truncate text-[13px] font-medium text-[#0B2545]">{p.title}</p>
      {meta ? (
        <p className="text-xs font-semibold text-[#1D4ED8]">{meta}</p>
      ) : (
        <p className="text-xs text-[#0B2545]/70">
          <span className="font-semibold text-[#0B2545]">AED {p.price}</span>
          {hasDiscount && (
            <span className="ml-1.5 text-[#0B2545]/40 line-through">AED {p.compareAt}</span>
          )}
        </p>
      )}
    </Link>
  )
}

function ShelfCard({ title, products, meta, linkTo, linkLabel, className = '' }) {
  return (
    <section className={`flex flex-col rounded-3xl border border-[#0B2545]/10 bg-white p-5 sm:p-6 ${className}`}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-serif text-xl font-semibold leading-snug text-[#0B2545] sm:text-2xl">
          {title}
        </h3>
        <Link
          to={linkTo}
          className="shrink-0 text-xs font-semibold text-[#1D4ED8] underline-offset-4 hover:underline"
        >
          {linkLabel} →
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {products.map((p, i) => (
          <ProductTile key={p.handle + i} p={p} meta={meta} />
        ))}
      </div>
    </section>
  )
}

export default function AmazonHomeHero({ catalogue = [] }) {
  const { t } = useLanguage()
  const [slide, setSlide] = useState(0)
  const [paused, setPaused] = useState(false)

  const slides = [
    {
      title: t('heroTitle1'),
      subtitle: t('heroSub1'),
      image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1400&q=80',
      link: '/collections/boys',
      badge: 'New School Session 2026',
    },
    {
      title: t('heroTitle2'),
      subtitle: t('heroSub2'),
      image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1400&q=80',
      link: '/collections/industrial-uniforms',
      badge: 'Certified Workwear',
    },
    {
      title: t('heroTitle3'),
      subtitle: t('heroSub3'),
      image: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?auto=format&fit=crop&w=1400&q=80',
      link: '/collections/girls',
      badge: 'PE & Sports Kits',
    },
  ]

  useEffect(() => {
    if (paused) return
    const timer = setInterval(() => setSlide((s) => (s + 1) % slides.length), 6000)
    return () => clearInterval(timer)
  }, [slides.length, paused])

  const go = (n) => setSlide((n + slides.length) % slides.length)

  const boysProducts = catalogue.filter((p) => p.category === 'Boys').slice(0, 4)
  const girlsProducts = catalogue.filter((p) => p.category === 'Girls').slice(0, 4)
  const industrialProducts = catalogue.filter((p) => p.category === 'Industrial Uniforms').slice(0, 4)
  const allUniforms = catalogue.slice(0, 4)

  return (
    <div className="bg-[#FFFFFF]">
      {/* ───────── Hero ───────── */}
      <section
        className="container px-4 pb-6 pt-6 sm:px-6 sm:pt-10 lg:px-8"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        aria-roledescription="carousel"
      >
        <div className="grid items-stretch gap-6 lg:grid-cols-12 lg:gap-10">
          {/* Copy column */}
          <div className="order-2 flex flex-col justify-between lg:order-1 lg:col-span-5">
            <div className="grid">
              {slides.map((s, idx) => (
                <div
                  key={s.title + idx}
                  aria-hidden={slide !== idx}
                  className={`col-start-1 row-start-1 transition-all duration-700 ${
                    slide === idx
                      ? 'translate-y-0 opacity-100'
                      : 'pointer-events-none translate-y-3 opacity-0'
                  }`}
                >
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#1D4ED8]/50 bg-[#1D4ED8]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1D4ED8]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1D4ED8]" />
                    {s.badge}
                  </span>
                  <h1 className="mt-5 font-serif text-3xl sm:text-4xl xl:text-5xl font-semibold leading-[1.08] tracking-tight text-[#0B2545]">
                    {s.title}
                  </h1>
                  <p className="mt-4 max-w-md text-sm sm:text-base leading-relaxed text-[#0B2545]/70">
                    {s.subtitle}
                  </p>
                  <Link
                    to={s.link}
                    tabIndex={slide === idx ? 0 : -1}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1D4ED8] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#1E40AF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
                  >
                    {t('shopNow')} <span aria-hidden>→</span>
                  </Link>
                </div>
              ))}
            </div>

            {/* Slide controls */}
            <div className="mt-8 flex items-center gap-4 lg:mt-0">
              <div className="flex flex-1 gap-2">
                {slides.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => go(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    className="group relative h-6 flex-1"
                  >
                    <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded bg-[#0B2545]/15" />
                    <span
                      key={slide === idx ? `on-${slide}-${paused}` : 'off'}
                      className={`absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded bg-[#1D4ED8] ${
                        slide === idx ? (paused ? 'w-full' : 'hero-progress') : 'w-0'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => go(slide - 1)}
                  aria-label="Previous slide"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#0B2545]/20 text-[#0B2545] transition hover:bg-[#0B2545] hover:text-[#FFFFFF]"
                >
                  ‹
                </button>
                <button
                  onClick={() => go(slide + 1)}
                  aria-label="Next slide"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#0B2545]/20 text-[#0B2545] transition hover:bg-[#0B2545] hover:text-[#FFFFFF]"
                >
                  ›
                </button>
              </div>
            </div>
          </div>

          {/* Image column */}
          <div className="order-1 lg:order-2 lg:col-span-7">
            <div className="relative h-[280px] overflow-hidden rounded-3xl sm:h-[380px] lg:h-[500px]">
              {slides.map((s, idx) => (
                <img
                  key={s.image}
                  src={s.image}
                  alt={s.title}
                  className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 ${
                    slide === idx ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
                  }`}
                />
              ))}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B2545]/40 via-transparent to-transparent" />
              <span className="absolute bottom-4 right-5 font-serif text-sm tracking-widest text-white/90">
                0{slide + 1} / 0{slides.length}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Shelves ───────── */}
      <section className="container px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-12">
          {/* Boys Uniforms Shelf */}
          <ShelfCard
            className="lg:col-span-8"
            title="Boys School Uniforms — Pants, Shirts & PE"
            products={boysProducts.length ? boysProducts : allUniforms}
            linkTo="/collections/boys"
            linkLabel="View all Boys Uniforms"
          />

          {/* B2B Quote Card */}
          <aside className="flex flex-col justify-between overflow-hidden rounded-3xl bg-[#0B2545] p-6 text-[#FFFFFF] lg:col-span-4">
            <div>
              <h3 className="font-serif text-2xl font-semibold leading-snug">
                {t('bulkCorporate')}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#FFFFFF]/70">{t('bulkSub')}</p>
              <div className="mt-5 aspect-[16/9] overflow-hidden rounded-2xl">
                <img
                  src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=700&q=80"
                  alt="Industrial workwear"
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#93C5FD]">
                Corporate Invoicing &amp; Custom Embroidery
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <a
                href="#b2b-quote"
                className="rounded-full bg-white py-3 text-center text-sm font-semibold text-[#0B2545] transition hover:bg-[#EFF4FF]"
              >
                {t('requestQuote')}
              </a>
              <Link
                to="/policies/contact-information"
                className="py-1 text-center text-xs font-semibold text-[#FFFFFF]/80 underline-offset-4 hover:underline"
              >
                {t('contactUs')}
              </Link>
            </div>
          </aside>

          {/* Girls Uniforms Shelf */}
          <ShelfCard
            className="lg:col-span-6"
            title="Girls School Uniforms — Skirts, Pinafores & Shirts"
            products={girlsProducts.length ? girlsProducts : allUniforms}
            linkTo="/collections/girls"
            linkLabel="View all Girls Uniforms"
          />

          {/* Industrial Uniforms Shelf */}
          <ShelfCard
            className="lg:col-span-6"
            title="Industrial & Safety Workwear — Coveralls, Polos & Suits"
            products={industrialProducts.length ? industrialProducts : allUniforms}
            linkTo="/collections/industrial-uniforms"
            linkLabel="View all Industrial Uniforms"
          />
        </div>
      </section>

      {/* Progress-bar animation (scoped) */}
      <style>{`
        @keyframes heroProgress { from { width: 0 } to { width: 100% } }
        .hero-progress { animation: heroProgress 6s linear forwards }
        @media (prefers-reduced-motion: reduce) { .hero-progress { animation: none; width: 100% } }
      `}</style>
    </div>
  )
}
