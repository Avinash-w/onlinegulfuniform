import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import { adminSearch } from '../store/selectors.js'
import { Close, Search } from '../components/icons'

const SECTIONS = [
  { key: 'orders', label: 'Orders' },
  { key: 'products', label: 'Products' },
  { key: 'customers', label: 'Customers' },
  { key: 'categories', label: 'Categories' },
]

export default function AdminSearch() {
  const { state } = useStore()
  const navigate = useNavigate()
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const results = useMemo(() => adminSearch(state, q), [state, q])
  const flat = useMemo(
    () => SECTIONS.flatMap((s) => results[s.key] ?? []),
    [results]
  )
  const hasQuery = q.trim().length > 0
  const hasHits = flat.length > 0

  useEffect(() => {
    setActive(0)
  }, [q])

  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (item) => {
    if (!item) return
    setQ('')
    setOpen(false)
    navigate(item.to)
  }

  const onKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) setOpen(true)
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (!hasHits) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % flat.length)
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + flat.length) % flat.length)
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      go(flat[active])
    }
  }

  let flatIndex = -1

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1 max-w-xl">
      <label className="relative block">
        <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-graphite">
          <Search className="h-3.5 w-3.5" />
        </span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search orders, products, customers, categories…"
          className="w-full h-[34px] rounded-lg border border-[#CBC8C1] bg-white py-1 pl-8 pr-16 text-[12px] font-medium text-ink outline-none transition-colors placeholder:text-[#A5A2B2] placeholder:font-normal hover:border-[#ADA9A0] focus:border-forest focus:bg-white shadow-xs"
          aria-label="Admin search"
          aria-expanded={open && hasQuery}
          aria-controls="admin-search-results"
          autoComplete="off"
        />
        <span className="pointer-events-none absolute inset-y-0 right-2 hidden items-center sm:flex">
          {q ? null : (
            <kbd className="rounded border border-line bg-white px-1.5 py-0.5 text-[9px] font-semibold text-graphite">
              Ctrl K
            </kbd>
          )}
        </span>
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ('')
              inputRef.current?.focus()
            }}
            className="absolute inset-y-0 right-1.5 my-auto grid h-6 w-6 place-items-center rounded text-graphite hover:bg-chalk hover:text-ink"
            aria-label="Clear search"
          >
            <Close className="h-3.5 w-3.5" />
          </button>
        )}
      </label>

      {open && hasQuery && (
        <div
          id="admin-search-results"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border border-line bg-white shadow-pop"
        >
          {!hasHits ? (
            <p className="px-4 py-8 text-center text-[12px] text-muted">
              No matches for “{q.trim()}”
            </p>
          ) : (
            SECTIONS.map((section) => {
              const items = results[section.key]
              if (!items?.length) return null
              return (
                <div key={section.key} className="border-b border-line last:border-b-0">
                  <p className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider2 text-muted">
                    {section.label}
                  </p>
                  <ul>
                    {items.map((item) => {
                      flatIndex += 1
                      const idx = flatIndex
                      const isActive = idx === active
                      return (
                        <li key={`${item.type}-${item.id}`}>
                          <Link
                            to={item.to}
                            onClick={() => {
                              setQ('')
                              setOpen(false)
                            }}
                            onMouseEnter={() => setActive(idx)}
                            className={`block px-3 py-2 transition-colors ${
                              isActive ? 'bg-chalk' : 'hover:bg-chalk/70'
                            }`}
                          >
                            <span className="block truncate text-[12px] font-medium text-ink">
                              {item.title}
                            </span>
                            <span className="block truncate text-[11px] text-muted">{item.sub}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
