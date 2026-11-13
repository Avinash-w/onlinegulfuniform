import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore, shortDate } from '../store/StoreContext.jsx'
import { CARRIERS } from '../store/seed.js'
import { Badge, Card, Input, PageHeader, Pagination, Select, Stat, Table, Td, Tr } from './ui.jsx'

export default function Shipments() {
  const { state } = useStore()
  const [q, setQ] = useState('')
  const [carrier, setCarrier] = useState('All')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [q, carrier])

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return state.shipments
      .filter(
        (s) =>
          (carrier === 'All' || s.carrier === carrier) &&
          (!t || s.orderId.toLowerCase().includes(t) || s.awb.toLowerCase().includes(t))
      )
      .sort((a, b) => b.shippedAt - a.shippedAt)
  }, [state.shipments, q, carrier])

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * 12
    return rows.slice(start, start + 12)
  }, [rows, page])

  const inTransit = state.shipments.filter((s) => s.status === 'In transit').length
  const delivered = state.shipments.filter((s) => s.status === 'Delivered').length

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[20px] font-bold tracking-tight text-ink">Shipments</h1>
        <p className="text-[12px] text-muted">Consignments and their tracking status.</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-graphite">Total shipments</p>
          <p className="mt-1 text-[17px] font-bold text-ink leading-tight">{state.shipments.length}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">In transit</p>
          <p className="mt-1 text-[17px] font-bold text-amber-600 leading-tight">{inTransit}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Delivered</p>
          <p className="mt-1 text-[17px] font-bold text-emerald-600 leading-tight">{delivered}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-graphite">Carriers</p>
          <p className="mt-1 text-[17px] font-bold text-ink leading-tight">{new Set(state.shipments.map((s) => s.carrier)).size}</p>
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
                  placeholder="Search order or AWB…"
                  className="w-full h-[38px] rounded-lg border border-line bg-white pl-9 pr-3 text-[12.5px] text-ink outline-none placeholder:text-muted focus:border-[#4849E8]"
                />
              </div>

              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="h-[38px] rounded-lg border border-line bg-white px-3 text-[12.5px] font-medium text-ink outline-none focus:border-[#4849E8]"
              >
                <option value="All">All Carriers</option>
                {CARRIERS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <span className="text-[11.5px] font-medium text-muted self-end sm:self-auto">
              Showing <strong className="text-ink">{paginatedRows.length}</strong> of <strong className="text-ink">{rows.length}</strong> shipments
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-line bg-chalk/40 text-[10.5px] font-bold uppercase tracking-wider text-graphite">
                <th className="py-2.5 pl-4 px-3">AWB</th>
                <th className="py-2.5 px-3">Order</th>
                <th className="py-2.5 px-3">Carrier</th>
                <th className="py-2.5 px-3">Shipped</th>
                <th className="py-2.5 px-3">Delivered</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 pr-4 pl-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted">
                    No shipments match your criteria.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F9F9FE] transition-colors">
                    <td className="py-3 pl-4 px-3 font-mono text-[11px] font-semibold text-ink">{s.awb}</td>
                    <td className="py-3 px-3">
                      <Link to={`/admin/orders/${s.orderId}`} className="font-bold text-ink hover:text-[#4849E8] transition-colors">
                        {s.orderId}
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-graphite">{s.carrier}</td>
                    <td className="py-3 px-3 text-graphite">{shortDate(s.shippedAt)}</td>
                    <td className="py-3 px-3 text-graphite">{s.deliveredAt ? shortDate(s.deliveredAt) : '—'}</td>
                    <td className="py-3 px-3">
                      {s.status === 'Delivered' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-700">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Delivered</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10.5px] font-bold text-blue-700">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="1" y="3" width="15" height="13" />
                            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                          </svg>
                          <span>{s.status}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 pl-3 text-right">
                      <Link
                        to={`/track/${s.orderId}`}
                        target="_blank"
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-line bg-white px-2.5 text-[11px] font-semibold text-ink shadow-2xs hover:bg-chalk active:scale-95 transition-all"
                      >
                        <svg className="h-3 w-3 text-graphite" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span>Track</span>
                      </Link>
                    </td>
                  </tr>
                ))
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
