import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { applyQuery } from '../lib/filters'
import { inr } from '../context/CartContext'
import { useStore } from '../store/StoreContext.jsx'
import { allProducts } from '../store/selectors.js'
import { Close, Search } from './icons'
import Img from './Img'

/**
 * Full-width product search.
 *
 * Two modes:
 *  - `onQueryChange` supplied → controlled; live-filters the page's own grid
 *    (collection pages), no dropdown.
 *  - otherwise → standalone; shows a suggestion dropdown that links to PDPs
 *    (product detail pages).
 */
export default function SearchBar({
  value,
  onQueryChange,
  placeholder = 'Search vanilla, rose, soy wax, gifts…',
  resultCount,
  className = '',
}) {
  const { state } = useStore()
  const catalogue = allProducts(state)
  const controlled = typeof onQueryChange === 'function'
  const [inner, setInner] = useState('')
  const q = controlled ? value ?? '' : inner
  const setQ = controlled ? onQueryChange : setInner

  const [focused, setFocused] = useState(false)
  const box = useRef(null)

  const suggestions = useMemo(
    () => (controlled || !q.trim() ? [] : applyQuery(catalogue, q).slice(0, 6)),
    [q, controlled, catalogue]
  )

  useEffect(() => {
    const onDown = (e) => {
      if (box.current && !box.current.contains(e.target)) setFocused(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div ref={box} className={`relative w-full ${className}`}>
      <div className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-white px-3 py-2 transition-colors focus-within:border-brand sm:gap-3 sm:px-4 sm:py-2.5 md:px-5 md:py-3">
        <Search className="h-4 w-4 shrink-0 text-muted sm:h-[18px] sm:w-[18px]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => e.key === 'Escape' && setQ('')}
          placeholder={placeholder}
          aria-label="Search products"
          className="w-full bg-transparent text-[12px] outline-none placeholder:text-muted sm:text-[13px] md:text-sm"
        />
        {q && (
          <button
            onClick={() => setQ('')}
            aria-label="Clear search"
            className="shrink-0 text-muted transition-colors hover:text-ink"
          >
            <Close className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* inline result count for the controlled/grid mode */}
      {controlled && q.trim() && (
        <p className="mt-2 text-[11px] text-muted">
          {resultCount} result{resultCount === 1 ? '' : 's'} for “{q.trim()}”
        </p>
      )}

      {/* suggestion dropdown for the standalone mode */}
      {!controlled && focused && q.trim() && (
        <div className="absolute inset-x-0 top-full z-40 mt-2 animate-slideUp border border-line bg-white py-1.5 shadow-pop">
          {suggestions.length === 0 ? (
            <p className="px-4 py-4 text-[12px] text-muted">No products match “{q.trim()}”.</p>
          ) : (
            suggestions.map((p) => (
              <Link
                key={p.handle}
                to={`/products/${p.handle}`}
                onClick={() => {
                  setQ('')
                  setFocused(false)
                }}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-chalk"
              >
                <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-chalk">
                  <Img src={p.images[0]} alt="" width={120} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[12px] leading-snug">{p.title}</p>
                  <p className="mt-0.5 text-[12px] font-semibold">{inr(p.price)}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}
