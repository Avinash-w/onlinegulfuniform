import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

/* Palette: white #FFFFFF · navy #0B2545 · royal blue #1D4ED8 · deep blue #1E40AF · tint #EFF4FF */

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&q=80'

/* ---------- Product card (portrait, clothing-store style) ---------- */
function ProductCard({ p }) {
  const { t } = useLanguage()
  const hasDiscount = p.compareAt && p.compareAt > p.price
  const pct = hasDiscount ? Math.round(((p.compareAt - p.price) / p.compareAt) * 100) : 0
  return (
    <Link to={`/products/${p.handle}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-[#EFF4FF]">
        <img
          src={p.images?.[0] || FALLBACK_IMG}
          alt={p.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        {hasDiscount && (
          <span className="absolute left-2 top-2 rounded-md bg-[#1D4ED8] px-2 py-0.5 text-[11px] font-bold text-white">
            −{pct}%
          </span>
        )}
        {/* Hover label only on devices that can hover */}
        <span className="pointer-events-none absolute inset-x-2 bottom-2 hidden translate-y-2 rounded-lg bg-white/95 py-2 text-center text-xs font-semibold text-[#0B2545] opacity-0 shadow transition group-hover:translate-y-0 group-hover:opacity-100 md:block">
          {t('viewDetails')}
        </span>
      </div>
      <p className="mt-2.5 line-clamp-2 min-h-[2.5rem] text-[13px] font-medium leading-snug text-[#0B2545] sm:text-sm">
        {p.title}
      </p>
      <p className="mt-0.5 text-sm">
        <span className="font-semibold text-[#0B2545]">AED {p.price}</span>
        {hasDiscount && (
          <span className="ml-2 text-xs text-[#0B2545]/40 line-through">AED {p.compareAt}</span>
        )}
      </p>
    </Link>
  )
}

/* ---------- Section with heading + product grid ---------- */
function ProductRow({ title, products, linkTo, linkLabel }) {
  const { t } = useLanguage()
  if (!products.length) return null
  return (
    <section className="py-6 md:py-8">
      <div className="mb-4 flex items-end justify-between gap-3 md:mb-5">
        <h2 className="font-serif text-xl font-semibold leading-tight text-[#0B2545] sm:text-2xl md:text-3xl">
          {title}
        </h2>
        <Link
          to={linkTo}
          className="shrink-0 whitespace-nowrap text-sm font-semibold text-[#1D4ED8] underline-offset-4 hover:underline"
        >
          <span className="sm:hidden">{t('viewAll')}</span>
          <span className="hidden sm:inline">{linkLabel} →</span>
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 sm:gap-y-8 md:grid-cols-4">
        {products.map((p, i) => (
          <ProductCard key={p.handle + i} p={p} />
        ))}
      </div>
    </section>
  )
}

export default function AmazonHomeHero({ catalogue = [] }) {
  const { t } = useLanguage()
  const [slide, setSlide] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchX = useRef(null)

  const slides = [
    {
      title: t('heroTitle1'),
      subtitle: t('heroSub1'),
      image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1920&q=80',
      link: '/collections/boys',
      badge: 'New School Session 2026',
    },
    {
      title: t('heroTitle2'),
      subtitle: t('heroSub2'),
      image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1920&q=80',
      link: '/collections/industrial-uniforms',
      badge: 'Certified Workwear',
    },
    {
      title: t('heroTitle3'),
      subtitle: t('heroSub3'),
      image: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?auto=format&fit=crop&w=1920&q=80',
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

  // Swipe left / right on touch screens
  const onTouchStart = (e) => {
    touchX.current = e.touches[0].clientX
    setPaused(true)
  }
  const onTouchEnd = (e) => {
    if (touchX.current != null) {
      const dx = e.changedTouches[0].clientX - touchX.current
      if (Math.abs(dx) > 50) go(slide + (dx < 0 ? 1 : -1))
    }
    touchX.current = null
    setPaused(false)
  }

  const boysProducts = catalogue.filter((p) => p.category === 'Boys').slice(0, 4)
  const girlsProducts = catalogue.filter((p) => p.category === 'Girls').slice(0, 4)
  const industrialProducts = catalogue.filter((p) => p.category === 'Industrial Uniforms').slice(0, 4)
  const allUniforms = catalogue.slice(0, 4)

  const categories = [
    { label: t('boysUniforms'), sub: t('boysSub'), to: '/collections/boys', image: slides[0].image },
    { label: t('girlsUniforms'), sub: t('girlsSub'), to: '/collections/girls', image: slides[2].image },
    { label: t('industrialWorkwear'), sub: t('industrialSub'), to: '/collections/industrial-uniforms', image: slides[1].image },
  ]

  return (
    <div className="bg-white">
      {/* ───────── Hero banner ─────────
          Phone: photo on top, navy text panel below (nothing overlaps the photo)
          Tablet / desktop: text overlays the photo                             */}
      <section
        className="container px-3 pt-3 sm:px-6 sm:pt-6 lg:px-8"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        aria-roledescription="carousel"
        aria-label="Featured collections"
      >
        <div className="overflow-hidden rounded-2xl bg-[#0B2545] sm:rounded-3xl md:relative md:h-[460px] lg:h-[560px]">
          {/* Photo layer */}
          <div className="relative h-[230px] sm:h-[320px] md:absolute md:inset-0 md:h-auto">
            {slides.map((s, idx) => (
              <img
                key={s.image}
                src={s.image}
                alt=""
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
                  slide === idx ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
            {/* Text-zone fade (tablet+ only) */}
            <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-[#0B2545]/95 via-[#0B2545]/60 to-[#0B2545]/0 md:block lg:via-[#0B2545]/45" />
            {/* Slide counter on phone */}
            <span className="absolute bottom-3 right-3 rounded-full bg-[#0B2545]/70 px-2.5 py-1 text-[11px] font-semibold text-white md:hidden">
              {slide + 1} / {slides.length}
            </span>
          </div>

          {/* Copy + controls */}
          <div className="relative z-10 px-5 pb-5 pt-5 sm:px-8 sm:pb-6 sm:pt-6 md:flex md:h-full md:flex-col md:justify-center md:p-0 md:pl-10 lg:pl-16">
            <div className="grid max-w-xl">
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
                  <span className="inline-block rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1D4ED8] sm:text-[11px]">
                    {s.badge}
                  </span>
                  <h1 className="mt-3 font-serif text-[1.65rem] font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl md:mt-4 md:text-4xl lg:text-6xl lg:leading-[1.05]">
                    {s.title}
                  </h1>
                  <p className="mt-2.5 max-w-md text-sm leading-relaxed text-white/80 sm:text-base md:mt-4">
                    {s.subtitle}
                  </p>
                  <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap md:mt-7 md:gap-3">
                    <Link
                      to={s.link}
                      tabIndex={slide === idx ? 0 : -1}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#0B2545] transition hover:bg-[#EFF4FF] active:scale-[0.98]"
                    >
                      {t('shopNow')} <span aria-hidden>→</span>
                    </Link>
                    <a
                      href="#b2b-quote"
                      tabIndex={slide === idx ? 0 : -1}
                      className="inline-flex items-center justify-center rounded-full border border-white/60 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-[0.98]"
                    >
                      {t('requestQuote')}
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Dots (+ arrows from tablet up) */}
            <div className="mt-5 flex items-center justify-between md:absolute md:inset-x-10 md:bottom-5 md:mt-0 lg:inset-x-16">
              <div className="flex items-center gap-2">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => go(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    aria-current={slide === idx}
                    className="flex h-6 items-center"
                  >
                    <span
                      className={`block h-2 rounded-full transition-all ${
                        slide === idx ? 'w-8 bg-white' : 'w-2 bg-white/40'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <div className="hidden gap-2 md:flex">
                <button
                  onClick={() => go(slide - 1)}
                  aria-label="Previous slide"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#0B2545] transition hover:bg-white"
                >
                  ‹
                </button>
                <button
                  onClick={() => go(slide + 1)}
                  aria-label="Next slide"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#0B2545] transition hover:bg-white"
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Shop by category ─────────
          Phone: swipeable row · Tablet+: 3 columns                    */}
      <section className="container px-4 pt-8 sm:px-6 md:pt-10 lg:px-8">
        <h2 className="font-serif text-xl font-semibold text-[#0B2545] sm:text-2xl md:text-3xl">
          {t('shopByCategory')}
        </h2>
        <div className="home-swipe -mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 md:mt-5">
          {categories.map((c) => (
            <Link
              key={c.label}
              to={c.to}
              className="group relative block aspect-[4/5] w-[68%] shrink-0 snap-start overflow-hidden rounded-2xl bg-[#EFF4FF] sm:aspect-[3/4] sm:w-auto"
            >
              <img
                src={c.image}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B2545]/85 via-[#0B2545]/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4 md:p-5">
                <div className="min-w-0">
                  <p className="font-serif text-lg font-semibold leading-tight text-white md:text-xl lg:text-2xl">
                    {c.label}
                  </p>
                  <p className="mt-0.5 text-xs text-white/75 md:text-sm">{c.sub}</p>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#0B2545] transition group-hover:bg-[#1D4ED8] group-hover:text-white md:h-10 md:w-10">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ───────── Product rows ───────── */}
      <div className="container px-4 sm:px-6 lg:px-8">
        <ProductRow
          title={t('boysSection')}
          products={boysProducts.length ? boysProducts : allUniforms}
          linkTo="/collections/boys"
          linkLabel={t('viewAllBoys')}
        />
        <ProductRow
          title={t('girlsSection')}
          products={girlsProducts.length ? girlsProducts : allUniforms}
          linkTo="/collections/girls"
          linkLabel={t('viewAllGirls')}
        />

        {/* Bulk / B2B banner */}
        <section className="my-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1D4ED8] to-[#0B2545] sm:rounded-3xl md:my-8">
          <div className="grid items-center gap-5 p-5 sm:p-8 md:grid-cols-[1fr_auto] md:gap-8 md:p-10">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#BFDBFE] sm:text-[11px]">
                Corporate Invoicing &amp; Custom Embroidery
              </p>
              <h3 className="mt-2 font-serif text-xl font-semibold leading-tight text-white sm:text-2xl md:text-3xl">
                {t('bulkCorporate')}
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">{t('bulkSub')}</p>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row md:flex-col lg:flex-row">
              <a
                href="#b2b-quote"
                className="rounded-full bg-white px-7 py-3.5 text-center text-sm font-semibold text-[#0B2545] transition hover:bg-[#EFF4FF] active:scale-[0.98]"
              >
                {t('requestQuote')}
              </a>
              <Link
                to="/policies/contact-information"
                className="rounded-full border border-white/60 px-7 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-white/10 active:scale-[0.98]"
              >
                {t('contactUs')}
              </Link>
            </div>
          </div>
        </section>

        <ProductRow
          title="Industrial & Safety Workwear"
          products={industrialProducts.length ? industrialProducts : allUniforms}
          linkTo="/collections/industrial-uniforms"
          linkLabel={t('viewAllIndustrial')}
        />
        <div className="pb-8 md:pb-10" />
      </div>

      <style>{`
        .home-swipe { scrollbar-width: none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch; }
        .home-swipe::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
