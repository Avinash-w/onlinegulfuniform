import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore, inr } from '../store/StoreContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { metrics } from '../store/selectors.js'
import { apiPost } from '../lib/api.js'
import { Badge, Button, Card, Input, PageHeader, Pagination, Select, Stat, Table, Td, Tr } from './ui.jsx'

const FILTERS = ['All', 'Low stock', 'Out of stock', 'Healthy']

export default function Stock() {
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const m = metrics(state)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState(null)
  const [setBusy, setSetBusy] = useState(null)

  useEffect(() => {
    setPage(1)
  }, [q, filter])

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return state.variants.filter((v) => {
      if (t && !v.sku.toLowerCase().includes(t) && !v.productHandle.includes(t)) return false
      if (filter === 'Low stock') return v.stock > 0 && v.stock <= v.lowStockAt
      if (filter === 'Out of stock') return v.stock === 0
      if (filter === 'Healthy') return v.stock > v.lowStockAt
      return true
    })
  }, [state.variants, q, filter])

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * 12
    return rows.slice(start, start + 12)
  }, [rows, page])

  const totalUnits = state.variants.reduce((n, v) => n + v.stock, 0)
  const stockValue = state.variants.reduce((n, v) => n + v.stock * v.price, 0)

  const adjust = async (v, delta) => {
    if (busyId || setBusy) return
    setBusyId(v.id)
    try {
      const json = await apiPost('/stock/adjust', { id: v.id, delta }, { auth: true })
      dispatch({ type: 'catalog/setVariant', variant: json.data.variant })
      notify(json.message || 'Stock updated.')
    } catch (err) {
      notify(err.message || 'Unable to adjust stock.')
    } finally {
      setBusyId(null)
    }
  }

  const setStock = async (v) => {
    if (busyId || setBusy) return
    const v2 = prompt(`Set stock for ${v.sku}`, String(v.stock))
    if (v2 == null || Number.isNaN(Number(v2))) return
    setSetBusy(v.id)
    try {
      const json = await apiPost('/stock/set', { id: v.id, stock: Number(v2) }, { auth: true })
      dispatch({ type: 'catalog/setVariant', variant: json.data.variant })
      notify(json.message || 'Stock updated.')
    } catch (err) {
      notify(err.message || 'Unable to set stock.')
    } finally {
      setSetBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[20px] font-bold tracking-tight text-ink">Stock</h1>
        <p className="text-[12px] text-muted">Inventory across every variant. Adjustments apply immediately.</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-graphite">Units on hand</p>
          <p className="mt-1 text-[17px] font-bold text-ink leading-tight">{totalUnits}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-graphite">Stock value</p>
          <p className="mt-1 text-[17px] font-bold text-ink leading-tight">{inr(stockValue)}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Low stock</p>
          <p className="mt-1 text-[17px] font-bold text-amber-600 leading-tight">{m.lowStock}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600">Out of stock</p>
          <p className="mt-1 text-[17px] font-bold text-red-600 leading-tight">{m.outOfStock}</p>
        </div>
      </div>

      <Card className="!p-0">
        <div className="p-3.5 sm:p-4 border-b border-line space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-graphite">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search SKU or product…"
                  className="w-full h-[38px] rounded-lg border border-line bg-white pl-9 pr-3 text-[12.5px] text-ink outline-none placeholder:text-muted focus:border-[#4849E8]"
                />
              </div>

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-[38px] rounded-lg border border-line bg-white px-3 text-[12.5px] font-medium text-ink outline-none focus:border-[#4849E8]"
              >
                {FILTERS.map((f) => (
                  <option key={f} value={f}>{f === 'All' ? 'All Stock' : f}</option>
                ))}
              </select>
            </div>

            <span className="text-[11.5px] font-medium text-muted self-end sm:self-auto">
              Showing <strong className="text-ink">{paginatedRows.length}</strong> of <strong className="text-ink">{rows.length}</strong> variants
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-line bg-chalk/40 text-[10.5px] font-bold uppercase tracking-wider text-graphite">
                <th className="py-2.5 pl-4 px-3">SKU</th>
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3">Variant</th>
                <th className="py-2.5 px-3 text-right">On hand</th>
                <th className="py-2.5 pr-4 pl-3 text-right">Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted">
                    No variants match your criteria.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((v) => {
                  const rowBusy = busyId === v.id || setBusy === v.id
                  return (
                    <tr key={v.id} className="hover:bg-[#F9F9FE] transition-colors">
                      <td className="py-3 pl-4 px-3 font-mono text-[11px] font-semibold text-ink">{v.sku}</td>
                      <td className="py-3 px-3 max-w-[240px]">
                        <Link to={`/admin/products/${v.productHandle}`} className="line-clamp-1 font-semibold text-ink hover:text-[#4849E8] transition-colors">
                          {v.productHandle}
                        </Link>
                      </td>
                      <td className="py-3 px-3 text-graphite">{v.size} · {v.color}</td>
                      <td className="py-3 px-3 text-right">
                        {v.stock === 0 ? (
                          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                            Out of stock
                          </span>
                        ) : v.stock <= v.lowStockAt ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            {v.stock} left
                          </span>
                        ) : (
                          <span className="font-bold text-ink">{v.stock}</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 pl-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {[-10, -1, +1, +10].map((d) => (
                            <button
                              key={d}
                              type="button"
                              disabled={Boolean(busyId) || Boolean(setBusy)}
                              onClick={() => adjust(v, d)}
                              className="h-7 min-w-[30px] rounded-md border border-line bg-white px-1.5 text-[11px] font-bold text-ink hover:bg-chalk active:scale-95 transition-all disabled:opacity-40 cursor-pointer shadow-2xs"
                            >
                              {rowBusy && busyId === v.id ? '…' : d > 0 ? `+${d}` : d}
                            </button>
                          ))}
                          <button
                            type="button"
                            disabled={Boolean(busyId) || Boolean(setBusy)}
                            onClick={() => setStock(v)}
                            className="h-7 rounded-md border border-line bg-white px-2 text-[11px] font-bold text-[#4849E8] hover:bg-[#4849E8]/5 active:scale-95 transition-all disabled:opacity-40 cursor-pointer shadow-2xs"
                          >
                            {setBusy === v.id ? '...' : 'Set'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-line px-4 py-3">
          <Pagination
            page={page}
            total={rows.length}
            pageSize={12}
            onChange={setPage}
          />
        </div>
      </Card>
    </div>
  )
}
