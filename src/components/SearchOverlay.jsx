import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { inr } from '../context/CartContext'
import { useStore } from '../store/StoreContext.jsx'
import { allProducts } from '../store/selectors.js'
import { Close, Search } from './icons'
import Img from './Img'

export default function SearchOverlay({ open, onClose }) {
  const { state } = useStore()
  const catalogue = allProducts(state)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!open) setQ('')
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const results = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return []
    return catalogue.filter((p) => p.title.toLowerCase().includes(t)).slice(0, 8)
  }, [q, catalogue])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 animate-fadeIn overflow-y-auto bg-white">
      <div className="container pt-6">
        <div className="flex items-center gap-3 border-b border-ink pb-3">
          <Search className="h-5 w-5 text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search vanilla, rose, soy wax, gifts…"
            className="flex-1 bg-transparent py-2 text-base outline-none placeholder:text-muted"
          />
          <button onClick={onClose} aria-label="Close search" className="p-1.5">
            <Close className="h-5 w-5" />
          </button>
        </div>

        {q && (
          <p className="label-caps py-5 text-muted">
            {results.length} result{results.length === 1 ? '' : 's'} for “{q}”
          </p>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-8 pb-16 md:grid-cols-4">
          {results.map((p) => (
            <Link key={p.handle} to={`/products/${p.handle}`} onClick={onClose}>
              <div className="aspect-[3/4] overflow-hidden bg-chalk">
                <Img src={p.images[0]} alt={p.title} width={500} className="h-full w-full object-cover" />
              </div>
              <p className="mt-2 line-clamp-2 text-[12px]">{p.title}</p>
              <p className="mt-1 text-[12px] font-semibold">{inr(p.price)}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
