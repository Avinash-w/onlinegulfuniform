import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  onSearch,
  placeholder = 'Search uniforms, pants, shirts, PE, safety…',
  resultCount,
  className = '',
}) {
  const navigate = useNavigate()
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

  const handleSubmit = (e) => {
    e?.preventDefault?.()
    setFocused(false)
    if (typeof onSearch === 'function') {
      onSearch(q)
      return
    }
    if (!controlled && q.trim()) {
      navigate(`/collections/all-products?q=${encodeURIComponent(q.trim())}`)
    }
  }

  return (
    <div ref={box} className={`relative w-full ${className}`}>
      <form
        onSubmit={handleSubmit}
        role="search"
        className="flex w-full items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 transition-colors focus-within:border-[#1D4ED8] focus-within:ring-1 focus-within:ring-[#1D4ED8] sm:gap-2.5 sm:px-4 sm:py-2"
      >
        <button
          type="submit"
          aria-label="Search"
          className="shrink-0 text-muted transition-colors hover:text-[#1D4ED8] focus:outline-none"
        >
          <Search className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
        </button>

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
            type="button"
            onClick={() => setQ('')}
            aria-label="Clear search"
            className="shrink-0 text-muted transition-colors hover:text-ink"
          >
            <Close className="h-4 w-4" />
          </button>
        )}

        <button
          type="submit"
          className="shrink-0 rounded-md bg-[#1D4ED8] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#1E40AF] active:scale-95"
        >
          Search
        </button>
      </form>

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
