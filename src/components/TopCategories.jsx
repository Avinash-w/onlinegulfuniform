import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import { storefrontContent } from '../store/selectors.js'
import Img from './Img'
import { ChevronLeft, ChevronRight } from './icons'

export default function TopCategories() {
  const { state } = useStore()
  // Everything (labels, links, images) comes from the API content.
  const topCategories = storefrontContent(state).topCategories ?? []
  const track = useRef(null)

  const scrollBy = (dir) => {
    const el = track.current
    if (!el) return
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: 'smooth' })
  }

  if (!topCategories.length) return null

  return (
    <section className="py-10 md:py-14">
      <div className="container">
        <div className="relative mb-6 flex items-center justify-center md:mb-8">
          <h2 className="section-title">Top Categories</h2>

          {topCategories.length > 5 && (
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
          )}
        </div>

        <div
          ref={track}
          className="hide-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 md:gap-5"
        >
          {topCategories.map((c) => (
            <Link
              key={c.id || c.label}
              to={c.href}
              className="group block w-[calc((100%-0.75rem)/2)] shrink-0 snap-start sm:w-[calc((100%-2.25rem)/4)] md:w-[calc((100%-5rem)/5)]"
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-line/60 bg-chalk shadow-xs">
                <Img
                  src={c.image}
                  alt={c.label}
                  width={700}
                  className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent p-3.5 pt-12 md:p-4">
                  <span className="label-caps font-bold tracking-wider text-white drop-shadow-sm">{c.label}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
