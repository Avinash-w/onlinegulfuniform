import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'

/* Palette: white #FFFFFF · navy #0B2545 · royal blue #1D4ED8 · deep blue #1E40AF · tint #EFF4FF */

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=600&q=80'

export default function AmazonDealsRail({
  title,
  subtitle,
  items = [],
  link = '/collections/all-products',
}) {
  const scrollRef = useRef(null)
  const { add } = useCart()
  const { t } = useLanguage()
  const [justAdded, setJustAdded] = useState(null)
  // Position of the thin progress line that replaces the native scrollbar
  const [bar, setBar] = useState({ width: 100, left: 0 })

  const updateBar = () => {
    const el = scrollRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    const width = Math.min(100, (el.clientWidth / el.scrollWidth) * 100)
    const left = max > 0 ? (el.scrollLeft / max) * (100 - width) : 0
    setBar({ width, left })
  }

  useEffect(() => {
    updateBar()
    window.addEventListener('resize', updateBar)
    return () => window.removeEventListener('resize', updateBar)
  }, [items.length])

  const scroll = (direction) => {
    const el = scrollRef.current
    if (!el) return
    const amount = el.clientWidth * 0.8 * (direction === 'left' ? -1 : 1)
    el.scrollTo({ left: el.scrollLeft + amount, behavior: 'smooth' })
  }

  const handleAdd = (product) => {
    add({
      handle: product.handle,
      title: product.title,
      image: product.images?.[0],
      price: product.price,
      compareAt: product.compareAt,
      size: 'Standard',
    })
    setJustAdded(product.handle)
    setTimeout(() => setJustAdded((h) => (h === product.handle ? null : h)), 1500)
  }

  if (!items.length) return null

  return (
    <section className="bg-white py-6" id="amazon-deals">
      <div className="container px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1D4ED8] via-[#1E40AF] to-[#0B2545] p-5 sm:p-8">
          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#BFDBFE]">
                {t('dealOfDay')}
              </p>
              <h2 className="mt-1 font-serif text-2xl font-semibold leading-tight text-white sm:text-4xl">
                {title || t('todaysDeals')}
              </h2>
              {subtitle && <p className="mt-1 text-sm text-white/70">{subtitle}</p>}
            </div>

            <div className="flex items-center gap-3">
              <Link
                to={link}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#1D4ED8] transition hover:bg-[#EFF4FF]"
              >
                {t('seeAllDeals')} →
              </Link>
              <div className="hidden gap-2 sm:flex">
                <button
                  onClick={() => scroll('left')}
                  aria-label="Scroll left"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 text-lg text-white transition hover:bg-white hover:text-[#1D4ED8]"
                >
                  ‹
                </button>
                <button
                  onClick={() => scroll('right')}
                  aria-label="Scroll right"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 text-lg text-white transition hover:bg-white hover:text-[#1D4ED8]"
                >
                  ›
                </button>
              </div>
            </div>
          </div>

          {/* Scroller (native scrollbar hidden) */}
          <div
            ref={scrollRef}
            onScroll={updateBar}
            className="deals-scroll -mx-1 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-1"
          >
            {items.map((product) => {
              const hasDiscount = product.compareAt && product.compareAt > product.price
              const discountPct = hasDiscount
                ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
                : 0
              const added = justAdded === product.handle

              return (
                <article
                  key={product.handle}
                  className="group flex w-[190px] shrink-0 snap-start flex-col rounded-2xl bg-white p-3 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#0B2545]/30 sm:w-[230px]"
                >
                  <Link
                    to={`/products/${product.handle}`}
                    className="relative block aspect-[4/5] overflow-hidden rounded-xl bg-[#EFF4FF]"
                  >
                    <img
                      src={product.images?.[0] || FALLBACK_IMG}
                      alt={product.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    {hasDiscount && (
                      <span className="absolute left-2 top-2 rounded-full bg-[#1D4ED8] px-2.5 py-1 text-[11px] font-bold text-white">
                        −{discountPct}%
                      </span>
                    )}
                    {product.featured && (
                      <span className="absolute right-2 top-2 rounded-full bg-[#0B2545]/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#93C5FD] backdrop-blur-sm">
                        {t('bestSellers')}
                      </span>
                    )}
                  </Link>

                  <div className="mt-3 flex flex-1 flex-col">
                    <Link
                      to={`/products/${product.handle}`}
                      className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug text-[#0B2545] hover:text-[#1D4ED8]"
                    >
                      {product.title}
                    </Link>

                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-serif text-xl font-semibold text-[#0B2545]">
                        ₹{product.price}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-[#0B2545]/45 line-through">
                          ₹{product.compareAt}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-[11px] text-[#0B2545]/60">
                      {t('freeDeliveryTomorrow')}
                    </p>

                    <button
                      onClick={() => handleAdd(product)}
                      className={`mt-3 w-full rounded-full py-2.5 text-xs font-semibold uppercase tracking-wider transition active:scale-95 ${
                        added
                          ? 'bg-[#0B2545] text-white'
                          : 'bg-[#1D4ED8] text-white hover:bg-[#1E40AF]'
                      }`}
                    >
                      {added ? '✓' : t('addToCart')}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>

          {/* Progress line instead of a scrollbar */}
          {bar.width < 100 && (
            <div className="mt-5 h-[3px] w-full rounded-full bg-white/20" aria-hidden="true">
              <div
                className="h-full rounded-full bg-white transition-[left] duration-150"
                style={{ width: `${bar.width}%`, marginLeft: `${bar.left}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Hide the native scrollbar in every browser (no Tailwind plugin needed) */}
      <style>{`
        .deals-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .deals-scroll::-webkit-scrollbar { display: none; width: 0; height: 0; }
      `}</style>
    </section>
  )
}