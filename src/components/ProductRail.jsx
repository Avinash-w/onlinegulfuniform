import { useRef } from 'react'
import { Link } from 'react-router-dom'
import ProductCard from './ProductCard'
import { ChevronLeft, ChevronRight } from './icons'

/**
 * Horizontally scrolling product carousel with snap points — used for
 * "NEW ARRIVALS", "OUR BESTSELLERS" and "Similar Products".
 *
 * Track stays inside `.container` so cards align with the rest of the page
 * gutters (not flush to the viewport edges).
 */
export default function ProductRail({ title, items, cta }) {
  const track = useRef(null)

  const scrollBy = (dir) => {
    const el = track.current
    if (!el) return
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: 'smooth' })
  }

  if (!items?.length) return null

  return (
    <section className="py-8 md:py-10">
      <div className="container">
        <div className="relative mb-4 flex items-center justify-center md:mb-5">
          <h2 className="section-title">{title}</h2>

          <div className="absolute right-0 hidden gap-2 md:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Previous"
              className="grid h-9 w-9 place-items-center border border-line transition-colors hover:border-ink"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Next"
              className="grid h-9 w-9 place-items-center border border-line transition-colors hover:border-ink"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={track}
          className="hide-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 md:gap-4 lg:gap-5"
        >
          {items.map((p) => (
            <ProductCard
              key={p.handle}
              product={p}
              imageRatio="aspect-[4/5]"
              className="w-[calc((100%-0.75rem)/2)] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/3)] md:w-[calc((100%-3rem)/4)] lg:w-[calc((100%-3.75rem)/4)] xl:w-[calc((100%-5rem)/5)]"
            />
          ))}
        </div>

        {cta && (
          <div className="mt-6 flex justify-center md:mt-7">
            <Link to={cta.href} className="btn-ink">
              {cta.label}
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
