import { useEffect, useMemo, useState } from 'react'
import { useCart } from '../context/CartContext.jsx'
import { apiDelete, apiPatch, apiPost } from '../lib/api.js'
import { useStore, inr } from '../store/StoreContext.jsx'
import { Badge, Button, Card, ConfirmModal, Field, Input, Modal, PageHeader, Pagination, Select, Table, Td, Tr } from './ui.jsx'

export default function Coupons() {
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const [busyCode, setBusyCode] = useState(null)
  const [deletingCoupon, setDeletingCoupon] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [q])

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return state.coupons.filter((c) => !t || c.code.toLowerCase().includes(t))
  }, [state.coupons, q])

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * 12
    return rows.slice(start, start + 12)
  }, [rows, page])

  const toggle = async (c) => {
    if (busyCode) return
    setBusyCode(c.code)
    try {
      const json = await apiPatch(`/coupons/${encodeURIComponent(c.code)}`, { active: !c.active }, { auth: true })
      dispatch({ type: 'coupon/upsert', coupon: json.data.coupon })
      notify(json.message || 'Coupon updated successfully.')
    } catch (err) {
      notify(err.message || 'Unable to update coupon.')
    } finally {
      setBusyCode(null)
    }
  }

  const confirmDelete = async () => {
    if (!deletingCoupon || busyCode) return
    const c = deletingCoupon
    setBusyCode(c.code)
    try {
      const json = await apiDelete(`/coupons/${encodeURIComponent(c.code)}`, { auth: true })
      dispatch({ type: 'coupon/remove', code: c.code })
      notify(json.message || 'Coupon deleted successfully.')
      setDeletingCoupon(null)
    } catch (err) {
      notify(err.message || 'Unable to delete coupon.')
    } finally {
      setBusyCode(null)
    }
  }

  const create = async (coupon) => {
    if (saving) return
    setSaving(true)
    try {
      const json = await apiPost('/coupons', { coupon }, { auth: true })
      dispatch({ type: 'coupon/upsert', coupon: json.data.coupon })
      notify(json.message || 'Coupon created successfully.')
      setAdding(false)
    } catch (err) {
      notify(err.message || 'Unable to create coupon.')
    } finally {
      setSaving(false)
    }
  }

  const activeCount = state.coupons.filter((c) => c.active).length

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-ink">Coupons</h1>
          <p className="text-[12px] text-muted">Discount codes applied at checkout.</p>
        </div>

        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#4849E8] px-3 text-[12px] font-semibold text-white shadow-xs transition-all hover:bg-[#3839D6] active:scale-95 self-start sm:self-auto cursor-pointer"
        >
          <span className="text-[14px] leading-none">+</span>
          <span>New Coupon</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-graphite">Total Coupons</p>
          <p className="mt-1 text-[17px] font-bold text-ink leading-tight">{state.coupons.length}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Active Coupons</p>
          <p className="mt-1 text-[17px] font-bold text-emerald-600 leading-tight">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs col-span-2 sm:col-span-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Inactive</p>
          <p className="mt-1 text-[17px] font-bold text-amber-600 leading-tight">{state.coupons.length - activeCount}</p>
        </div>
      </div>

      <Card className="!p-0">
        <div className="p-3.5 sm:p-4 border-b border-line space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 sm:max-w-xs">
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
                placeholder="Search coupon code…"
                className="w-full h-[38px] rounded-lg border border-line bg-white pl-9 pr-3 text-[12.5px] text-ink outline-none placeholder:text-muted focus:border-[#4849E8]"
              />
            </div>

            <span className="text-[11.5px] font-medium text-muted self-end sm:self-auto">
              Showing <strong className="text-ink">{paginatedRows.length}</strong> of <strong className="text-ink">{rows.length}</strong> coupons
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-line bg-chalk/40 text-[10.5px] font-bold uppercase tracking-wider text-graphite">
                <th className="py-2.5 pl-4 px-3">Code</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Value</th>
                <th className="py-2.5 px-3">Min Cart</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 pr-4 pl-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    No coupons match your criteria.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((c) => (
                  <tr key={c.code} className="hover:bg-[#F9F9FE] transition-colors">
                    <td className="py-3 pl-4 px-3 font-mono text-[12px] font-bold text-ink">{c.code}</td>
                    <td className="py-3 px-3 text-graphite">{c.type === 'percent' ? 'Percentage' : 'Flat'}</td>
                    <td className="py-3 px-3 font-semibold text-ink">{c.type === 'percent' ? `${c.value}%` : inr(c.value)}</td>
                    <td className="py-3 px-3 text-graphite">{c.minCart ? inr(c.minCart) : '—'}</td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        disabled={!!busyCode}
                        onClick={() => toggle(c)}
                        className="transition-transform active:scale-95 cursor-pointer"
                        title="Click to toggle active status"
                      >
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${
                            c.active
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-600 hover:bg-red-100'
                          }`}
                        >
                          {c.active ? 'Active' : 'Inactive'}
                        </span>
                      </button>
                    </td>
                    <td className="py-3 pr-4 pl-3 text-right">
                      <button
                        type="button"
                        disabled={busyCode === c.code}
                        onClick={() => setDeletingCoupon(c)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 bg-red-50/70 text-[#E02438] hover:bg-red-100 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                        title="Delete coupon"
                      >
                        {busyCode === c.code ? (
                          <span className="h-3 w-3 animate-spin rounded-full border border-red-500 border-t-transparent" />
                        ) : (
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        )}
                      </button>
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

      {adding && (
        <NewCoupon
          saving={saving}
          onClose={() => !saving && setAdding(false)}
          onAdd={create}
        />
      )}

      <ConfirmModal
        open={Boolean(deletingCoupon)}
        onClose={() => !busyCode && setDeletingCoupon(null)}
        onConfirm={confirmDelete}
        loading={Boolean(busyCode)}
        loadingText="Archiving coupon..."
        title={`Archive coupon “${deletingCoupon?.code}”?`}
        message={`Are you sure you want to archive coupon “${deletingCoupon?.code}”? Customers will no longer be able to use this discount code at checkout.`}
        confirmText="Archive coupon"
        tone="danger"
      />
    </div>
  )
}

function NewCoupon({ onClose, onAdd, saving }) {
  const [f, setF] = useState({ code: '', type: 'percent', value: 10, minCart: 999 })
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  return (
    <Modal open onClose={onClose} title="New coupon">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code"><Input value={f.code} onChange={set('code')} placeholder="SUMMER20" disabled={saving} /></Field>
        <Field label="Type">
          <Select
            value={f.type}
            onChange={set('type')}
            disabled={saving}
            options={[{ value: 'percent', label: 'Percentage off' }, { value: 'flat', label: 'Flat amount off' }]}
          />
        </Field>
        <Field label={f.type === 'percent' ? 'Percent (%)' : 'Amount (₹)'}>
          <Input type="number" value={f.value} onChange={set('value')} disabled={saving} />
        </Field>
        <Field label="Minimum cart (₹)"><Input type="number" value={f.minCart} onChange={set('minCart')} disabled={saving} /></Field>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          disabled={!f.code.trim()}
          loading={saving}
          loadingText="Creating..."
          onClick={() =>
            onAdd({
              code: f.code.trim().toUpperCase(),
              type: f.type,
              value: Number(f.value),
              minCart: Number(f.minCart) || 0,
              active: true,
            })
          }
        >
          Create coupon
        </Button>
      </div>
    </Modal>
  )
}
