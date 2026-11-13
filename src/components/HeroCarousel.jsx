import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import { storefrontContent } from '../store/selectors.js'
import { ChevronLeft, ChevronRight } from './icons'
import Img from './Img'

/**
 * Hero slider — designed banners sit inset in the container with rounded
 * corners; every slide shows the FULL artwork (no crop).
 */
export default function HeroCarousel() {
  const { state } = useStore()
  const content = storefrontContent(state)
  const heroSlides = content.heroSlides ?? []
  const heroTrustLine = content.heroTrustLine ?? []
  const heroQuickLinks = content.heroQuickLinks ?? []

  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const touch = useRef(null)
  const n = heroSlides.length

  const go = useCallback((d) => setI((v) => (n ? (v + d + n) % n : 0)), [n])

  useEffect(() => {
    setI(0)
  }, [n])

  useEffect(() => {
    if (paused || n <= 1) return
    // Video slides get extra dwell time before auto-advancing.
    const dwell = heroSlides[i]?.video ? 9000 : 5500
    const id = setTimeout(() => go(1), dwell)
    return () => clearTimeout(id)
  }, [go, paused, n, i, heroSlides])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const onTouchStart = (e) => {
    setPaused(true)
    touch.current = e.touches[0].clientX
  }
  const onTouchEnd = (e) => {
    setPaused(false)
    if (touch.current == null) return
    const dx = e.changedTouches[0].clientX - touch.current
    if (Math.abs(dx) > 30) go(dx < 0 ? 1 : -1)
    touch.current = null
  }
  const onTouchCancel = () => {
    setPaused(false)
    touch.current = null
  }

  if (!n) return null

  return (
    <section className="pt-3 md:pt-5">
      <div className="container">
        <div
          data-butterfly="hero"
          className="group relative overflow-hidden rounded-2xl bg-chalk md:rounded-[20px]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchCancel}
        >
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${i * 100}%)` }}
          >
            {heroSlides.map((s, idx) => (
              <Link
                key={s.id || s.href}
                to={s.href}
                className="relative aspect-[16/9] min-h-[190px] w-full shrink-0 bg-chalk sm:min-h-0 sm:aspect-[2.8/1] md:aspect-[3.2/1]"
              >
                {/* Only the active slide runs its video; others show the poster. */}
                {s.video && idx === i ? (
                  <>
                    <video
                      src={s.video}
                      poster={s.image}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      aria-label={s.alt}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                    />
                    {/* readability scrim over moving footage */}
                    <div
                      className={`absolute inset-0 ${
                        s.align === 'right'
                          ? 'bg-gradient-to-l from-black/40 via-black/10 to-transparent'
                          : 'bg-gradient-to-r from-black/40 via-black/10 to-transparent'
                      }`}
                      aria-hidden
                    />
                  </>
                ) : (
                  <Img
                    src={s.image}
                    alt={s.alt}
                    width={1800}
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />
                )}

                {!s.banner && (
                  <div
                    className={`absolute inset-0 flex flex-col justify-center gap-1 px-4 py-3 sm:gap-1.5 sm:p-8 md:gap-2 md:p-12 lg:p-16 ${
                      s.align === 'right'
                        ? 'items-end text-right'
                        : s.align === 'center'
                          ? 'items-center text-center'
                          : 'items-start text-left'
                    }`}
                  >
                    {s.kicker && (
                      <span className="font-display text-[11px] uppercase leading-none tracking-wide text-lime sm:text-[16px] md:text-[22px] lg:text-[26px]">
                        {s.kicker}
                      </span>
                    )}
                    {s.title && (
                      <h2 className="whitespace-pre-line font-display text-[21px] uppercase leading-[0.95] text-white sm:text-[34px] md:text-[50px] lg:text-[62px]">
                        {s.title}
                      </h2>
                    )}
                    {s.subtitle && (
                      <p className="font-display text-[16px] uppercase leading-none text-lime sm:text-[26px] md:text-[38px] lg:text-[46px]">
                        {s.subtitle}
                      </p>
                    )}
                    {s.cta && (
                      <span className="mt-1.5 inline-block rounded-full bg-lime px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider2 font-bold text-ink transition-colors duration-200 hover:bg-forest hover:text-lime sm:mt-3 sm:px-7 sm:py-3 sm:text-[12px]">
                        {s.cta}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>

          {n > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous slide"
                className="hidden lg:grid absolute left-4 top-1/2 h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-card transition-opacity opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next slide"
                className="hidden lg:grid absolute right-4 top-1/2 h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-card transition-opacity opacity-0 group-hover:opacity-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        <div className="mt-3 flex justify-center gap-1.5">
          {heroSlides.map((_, d) => (
            <button
              key={d}
              type="button"
              onClick={() => setI(d)}
              aria-label={`Go to slide ${d + 1}`}
              aria-current={d === i}
              className={`h-1 rounded-full transition-all ${
                d === i ? 'w-7 bg-ink' : 'w-2.5 bg-ink/25 hover:bg-ink/50'
              }`}
            />
          ))}
        </div>


     
      </div>
    </section>
  )
}
