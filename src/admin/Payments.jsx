import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { apiPatch } from '../lib/api.js'
import { useStore, inr, shortDate } from '../store/StoreContext.jsx'
import { PAYMENT_METHODS, PAYMENT_STATUSES } from '../store/seed.js'
import { Badge, Card, Input, PageHeader, Pagination, Select, Stat, Table, Td, Tr } from './ui.jsx'

export default function Payments() {
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('All')
  const [method, setMethod] = useState('All')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    setPage(1)
  }, [q, status, method])

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return state.payments
      .filter(
        (p) =>
          (status === 'All' || p.status === status) &&
          (method === 'All' || p.method === method) &&
          (!t || p.orderId.toLowerCase().includes(t) || p.transactionId.toLowerCase().includes(t))
      )
      .sort((a, b) => b.at - a.at)
  }, [state.payments, q, status, method])

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * 12
    return rows.slice(start, start + 12)
  }, [rows, page])

  const captured = state.payments.filter((p) => p.status === 'Paid').reduce((n, p) => n + p.amount, 0)
  const failed = state.payments.filter((p) => p.status === 'Failed').length
  const byMethod = useMemo(() => {
    const m = {}
    for (const p of state.payments) if (p.status === 'Paid') m[p.method] = (m[p.method] ?? 0) + p.amount
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [state.payments])

  const updateStatus = async (p, next) => {
    if (busyId) return
    setBusyId(p.id)
    try {
      const json = await apiPatch(`/payments/${p.id}`, { status: next }, { auth: true })
      dispatch({ type: 'payment/upsert', payment: json.data.payment })
      notify(json.message || 'Payment updated successfully.')
    } catch (err) {
      notify(err.message || 'Unable to update payment.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[20px] font-bold tracking-tight text-ink">Payments</h1>
        <p className="text-[12px] text-muted">Every transaction recorded against an order.</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Captured Revenue</p>
          <p className="mt-1 text-[17px] font-bold text-emerald-600 leading-tight">{inr(captured)}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-graphite">Transactions</p>
          <p className="mt-1 text-[17px] font-bold text-ink leading-tight">{state.payments.length}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600">Failed</p>
          <p className="mt-1 text-[17px] font-bold text-red-600 leading-tight">{failed}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-graphite">Top method</p>
          <p className="mt-1 text-[17px] font-bold text-ink leading-tight">{byMethod[0]?.[0] ?? '—'}</p>
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
                  placeholder="Search order or txn ID…"
                  className="w-full h-[38px] rounded-lg border border-line bg-white pl-9 pr-3 text-[12.5px] text-ink outline-none placeholder:text-muted focus:border-[#4849E8]"
                />
              </div>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-[38px] rounded-lg border border-line bg-white px-3 text-[12.5px] font-medium text-ink outline-none focus:border-[#4849E8]"
              >
                <option value="All">All Statuses</option>
                {PAYMENT_STATUSES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>

              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="h-[38px] rounded-lg border border-line bg-white px-3 text-[12.5px] font-medium text-ink outline-none focus:border-[#4849E8]"
              >
                <option value="All">All Methods</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <span className="text-[11.5px] font-medium text-muted self-end sm:self-auto">
              Showing <strong className="text-ink">{paginatedRows.length}</strong> of <strong className="text-ink">{rows.length}</strong> payments
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-line bg-chalk/40 text-[10.5px] font-bold uppercase tracking-wider text-graphite">
                <th className="py-2.5 pl-4 px-3">Transaction</th>
                <th className="py-2.5 px-3">Order</th>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 pr-4 pl-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    No payments match your criteria.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F9F9FE] transition-colors">
                    <td className="py-3 pl-4 px-3 font-mono text-[11px] font-semibold text-ink">{p.transactionId}</td>
                    <td className="py-3 px-3">
                      <Link to={`/admin/orders/${p.orderId}`} className="font-bold text-ink hover:text-[#4849E8] transition-colors">
                        {p.orderId}
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-graphite">{p.method}</td>
                    <td className="py-3 px-3 text-graphite">{shortDate(p.at)}</td>
                    <td className="py-3 px-3">
                      <select
                        value={p.status}
                        disabled={busyId === p.id}
                        onChange={(e) => updateStatus(p, e.target.value)}
                        className={`rounded-lg border border-line bg-white px-2 py-1 text-[11px] font-semibold outline-none focus:border-[#4849E8] cursor-pointer ${
                          p.status === 'Paid'
                            ? 'text-emerald-700 bg-emerald-50/50'
                            : p.status === 'Failed'
                            ? 'text-red-600 bg-red-50/50'
                            : 'text-amber-700 bg-amber-50/50'
                        }`}
                      >
                        {PAYMENT_STATUSES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 pr-4 pl-3 text-right font-bold text-ink">{inr(p.amount)}</td>
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
