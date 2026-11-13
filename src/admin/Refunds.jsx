import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { apiPatch } from '../lib/api.js'
import { useStore, inr, shortDate } from '../store/StoreContext.jsx'
import { Badge, Button, Card, Input, PageHeader, Pagination, Select, Stat, Table, Td, Tr } from './ui.jsx'

const STATUSES = ['Pending', 'Processed', 'Rejected']

export default function Refunds() {
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('All')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    setPage(1)
  }, [q, status])

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return state.refunds
      .filter((r) => (status === 'All' || r.status === status) && (!t || r.orderId.toLowerCase().includes(t)))
      .sort((a, b) => b.at - a.at)
  }, [state.refunds, q, status])

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * 12
    return rows.slice(start, start + 12)
  }, [rows, page])

  const processed = state.refunds.filter((r) => r.status === 'Processed')
  const pending = state.refunds.filter((r) => r.status === 'Pending')

  const setRefundStatus = async (r, next) => {
    if (busyId) return
    setBusyId(r.id)
    try {
      const json = await apiPatch(`/refunds/${r.id}`, { status: next }, { auth: true })
      dispatch({ type: 'refund/upsert', refund: json.data.refund })
      notify(json.message || 'Refund updated successfully.')
    } catch (err) {
      notify(err.message || 'Unable to update refund.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[20px] font-bold tracking-tight text-ink">Refunds</h1>
        <p className="text-[12px] text-muted">Approve or reject refund requests raised against orders.</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600">Refunded</p>
          <p className="mt-1 text-[17px] font-bold text-red-600 leading-tight">{inr(processed.reduce((n, r) => n + r.amount, 0))}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Awaiting action</p>
          <p className="mt-1 text-[17px] font-bold text-amber-600 leading-tight">{pending.length}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Processed</p>
          <p className="mt-1 text-[17px] font-bold text-emerald-600 leading-tight">{processed.length}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-graphite">Rejected</p>
          <p className="mt-1 text-[17px] font-bold text-ink leading-tight">{state.refunds.filter((r) => r.status === 'Rejected').length}</p>
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
                  placeholder="Search by order ID…"
                  className="w-full h-[38px] rounded-lg border border-line bg-white pl-9 pr-3 text-[12.5px] text-ink outline-none placeholder:text-muted focus:border-[#4849E8]"
                />
              </div>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-[38px] rounded-lg border border-line bg-white px-3 text-[12.5px] font-medium text-ink outline-none focus:border-[#4849E8]"
              >
                <option value="All">All Status</option>
                {STATUSES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <span className="text-[11.5px] font-medium text-muted self-end sm:self-auto">
              Showing <strong className="text-ink">{paginatedRows.length}</strong> of <strong className="text-ink">{rows.length}</strong> refunds
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-line bg-chalk/40 text-[10.5px] font-bold uppercase tracking-wider text-graphite">
                <th className="py-2.5 pl-4 px-3">Refund</th>
                <th className="py-2.5 px-3">Order</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3">Raised</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 pr-4 pl-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted">
                    No refunds match your criteria.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F9F9FE] transition-colors">
                    <td className="py-3 pl-4 px-3 font-mono text-[11px] text-ink">{r.id}</td>
                    <td className="py-3 px-3">
                      <Link to={`/admin/orders/${r.orderId}`} className="font-bold text-ink hover:text-[#4849E8] transition-colors">
                        {r.orderId}
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-graphite">{r.reason}</td>
                    <td className="py-3 px-3 text-graphite">{shortDate(r.at)}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${
                          r.status === 'Processed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : r.status === 'Rejected'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-ink">{inr(r.amount)}</td>
                    <td className="py-3 pr-4 pl-3 text-right">
                      {r.status === 'Pending' ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => setRefundStatus(r, 'Processed')}
                            className="inline-flex h-7 items-center rounded-md bg-emerald-600 px-2.5 text-[11px] font-semibold text-white shadow-2xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => setRefundStatus(r, 'Rejected')}
                            className="inline-flex h-7 items-center rounded-md border border-red-200 bg-red-50 px-2 text-[11px] font-semibold text-red-600 hover:bg-red-100 active:scale-95 transition-all cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted">—</span>
                      )}
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
