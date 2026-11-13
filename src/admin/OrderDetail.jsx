import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Img from '../components/Img'
import { useCart } from '../context/CartContext.jsx'
import { apiGet, apiPatch, apiPost } from '../lib/api.js'
import { useStore, inr, longDate } from '../store/StoreContext.jsx'
import {
  orderById, paymentOfOrder, refundableAmount, refundsOfOrder, refundedTotal, shipmentOfOrder,
} from '../store/selectors.js'
import { CARRIERS, ORDER_STATUSES, PAYMENT_STATUSES } from '../store/seed.js'
import { EditOrderModal } from './Orders.jsx'
import {
  Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Table, Td, Textarea, Tr,
} from './ui.jsx'

export default function OrderDetail() {
  const { id } = useParams()
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const order = orderById(state, id)
  const [loading, setLoading] = useState(!order)
  const [refunding, setRefunding] = useState(false)
  const [editingModal, setEditingModal] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(null)
  const [deliveryDateInput, setDeliveryDateInput] = useState(order?.deliveryDate || '')

  useEffect(() => {
    if (order?.deliveryDate) {
      setDeliveryDateInput(order.deliveryDate)
    }
  }, [order?.deliveryDate])

  const applyFull = (json) => {
    const full = json.data?.order
    if (full) {
      const { _payment, _shipment, _refunds, ...ord } = full
      dispatch({
        type: 'order/upsert',
        order: ord,
        payment: _payment || json.data?.payment,
        shipment: _shipment || json.data?.shipment,
      })
      if (_refunds?.length) {
        for (const r of _refunds) dispatch({ type: 'refund/upsert', refund: r })
      }
    }
  }

  useEffect(() => {
    if (!order && id) {
      setLoading(true)
      apiGet(`/orders/${encodeURIComponent(id)}`, { auth: true })
        .then((json) => {
          applyFull(json)
        })
        .catch((err) => {
          console.error('Failed to load order', err)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [id, order])

  const updateDeliveryDate = async (newDate) => {
    if (busy || !order) return
    setBusy('deliveryDate')
    try {
      const json = await apiPatch(`/orders/${order.id}/delivery-date`, { deliveryDate: newDate ? newDate : null }, { auth: true })
      applyFull(json)
      notify(json.message || 'Delivery date updated successfully.')
    } catch (err) {
      notify(err.message || 'Unable to update delivery date.')
    } finally {
      setBusy(null)
    }
  }

  const setDeliveryPreset = (days) => {
    const base = order?.placedAt ? new Date(order.placedAt) : new Date()
    const target = new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
    const yyyy = target.getFullYear()
    const mm = String(target.getMonth() + 1).padStart(2, '0')
    const dd = String(target.getDate()).padStart(2, '0')
    const dateStr = `${yyyy}-${mm}-${dd}`
    setDeliveryDateInput(dateStr)
    updateDeliveryDate(dateStr)
  }

  if (loading && !order) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-16 gap-2.5">
          <div className="h-6 w-6 border-2 border-[#4849E8] border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] font-medium text-graphite">Loading order details...</p>
        </div>
      </Card>
    )
  }

  if (!order) {
    return (
      <Card>
        <p className="py-10 text-center text-muted">
          No order “{id}”. <Link to="/admin/orders" className="underline">Back to orders</Link>
        </p>
      </Card>
    )
  }

  const pay = paymentOfOrder(state, order.id)
  const ship = shipmentOfOrder(state, order.id)
  const refunds = refundsOfOrder(state, order.id)
  const refunded = refundedTotal(state, order.id)
  const canRefund = refundableAmount(state, order.id)

  const setStatus = async (status, extra = {}) => {
    if (busy) return
    setBusy('status')
    try {
      const json = await apiPatch(`/orders/${order.id}/status`, { status, ...extra }, { auth: true })
      applyFull(json)
      notify(json.message || 'Order status updated successfully.')
    } catch (err) {
      notify(err.message || 'Unable to update order status.')
    } finally {
      setBusy(null)
    }
  }

  const addNote = async () => {
    if (busy || !note.trim()) return
    setBusy('note')
    try {
      const json = await apiPost(`/orders/${order.id}/notes`, { note: note.trim() }, { auth: true })
      applyFull(json)
      setNote('')
      notify(json.message || 'Note added.')
    } catch (err) {
      notify(err.message || 'Unable to add note.')
    } finally {
      setBusy(null)
    }
  }

  const updatePayment = async (status) => {
    if (!pay || busy) return
    setBusy('pay')
    try {
      const json = await apiPatch(`/payments/${pay.id}`, { status }, { auth: true })
      if (json.data?.order) {
        applyFull(json)
      } else if (json.data?.payment) {
        dispatch({ type: 'payment/upsert', payment: json.data.payment })
      }
      notify(json.message || 'Payment updated successfully.')
    } catch (err) {
      notify(err.message || 'Unable to update payment.')
    } finally {
      setBusy(null)
    }
  }

  const createRefund = async (amount, reason) => {
    if (busy) return
    setBusy('refund')
    try {
      const json = await apiPost('/refunds', { orderId: order.id, amount, reason }, { auth: true })
      dispatch({ type: 'refund/upsert', refund: json.data.refund })
      setRefunding(false)
      notify(json.message || 'Refund created successfully.')
    } catch (err) {
      notify(err.message || 'Unable to create refund.')
    } finally {
      setBusy(null)
    }
  }

  const setRefundStatus = async (refundId, status) => {
    if (busy) return
    setBusy(`refund-${refundId}`)
    try {
      const json = await apiPatch(`/refunds/${refundId}`, { status }, { auth: true })
      if (json.data?.order) {
        applyFull(json)
      } else {
        if (json.data?.refund) dispatch({ type: 'refund/upsert', refund: json.data.refund })
        if (json.data?.payment) dispatch({ type: 'payment/upsert', payment: json.data.payment })
      }
      notify(json.message || 'Refund updated successfully.')
    } catch (err) {
      notify(err.message || 'Unable to update refund.')
    } finally {
      setBusy(null)
    }
  }

  const hasCustom = order.lines.some((l) => Boolean(l.customNote))

  return (
    <>
      <PageHeader
        title={
          <div className="flex flex-wrap items-center gap-2.5">
            <span>Order {order.id}</span>
            {hasCustom && (
              <span className="rounded-full bg-lime px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-forest">
                ★ Custom Order
              </span>
            )}
          </div>
        }
        sub={`Placed ${longDate(order.placedAt)} · ${order.customerName}`}
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap items-center">
            {/* Edit Order Button */}
            <Button
              variant="ghost"
              disabled={!!busy}
              onClick={() => setEditingModal(true)}
              className="inline-flex items-center gap-1.5 !px-3.5 !py-2 !text-[12px] font-semibold w-full sm:w-auto justify-center hover:border-[#4849E8] hover:text-[#4849E8]"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Edit Order</span>
            </Button>

            <Link
              to={`/invoice/${order.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#D5D1C8] bg-white hover:bg-gray-50 text-[12px] font-semibold text-gray-800 transition-colors shadow-xs w-full sm:w-auto justify-center"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#4849E8]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" x2="8" y1="13" y2="13" />
                <line x1="16" x2="8" y1="17" y2="17" />
              </svg>
              <span>Tax Invoice ↗</span>
            </Link>
            <Select
              value={order.status}
              disabled={!!busy}
              onChange={(e) => setStatus(e.target.value)}
              options={ORDER_STATUSES}
              className="w-full sm:!w-[170px]"
            />
            <Button
              variant="danger"
              disabled={canRefund <= 0 || !!busy}
              onClick={() => setRefunding(true)}
              className="w-full sm:w-auto"
            >
              Refund {canRefund > 0 ? inr(canRefund) : '—'}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Items">
            <Table head={['Product', 'SKU', 'Qty', { label: 'Total', align: 'right' }]}>
              {order.lines.map((l) => (
                <Tr key={l.variantId || `${l.productHandle}-${l.size}`}>
                  <Td>
                    <div className="flex items-start gap-3">
                      <div className="h-14 w-11 shrink-0 overflow-hidden rounded bg-chalk">
                        <Img src={l.image} alt="" width={80} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="line-clamp-1 font-medium">{l.title}</span>
                        <span className="block text-[11px] text-muted">{l.size} · {l.color}</span>
                        {l.customNote && (
                          <div className="mt-2 rounded-lg border border-forest/25 bg-[#F5F9F6] p-2.5 text-[12px]">
                            <div className="flex items-center gap-1.5 font-semibold text-forest">
                              <span className="text-[12px]">✍️</span>
                              <span className="text-[10px] uppercase tracking-wider">Customization Request:</span>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap font-medium leading-relaxed text-ink">
                              &ldquo;{l.customNote}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td className="font-mono text-[11px]">{l.sku}</Td>
                  <Td>{l.qty}</Td>
                  <Td align="right" className="font-semibold">{inr(l.price * l.qty)}</Td>
                </Tr>
              ))}
            </Table>

            <div className="mt-4 border-t border-line pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Payment Information Card */}
                <div className="rounded-xl border border-line bg-chalk/60 p-3.5 space-y-2 text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-[11px] text-ink">Payment Details</span>
                    {pay ? <Badge tone={pay.status}>{pay.status}</Badge> : null}
                  </div>

                  {pay ? (
                    <div className="space-y-1.5 pt-1 text-[12px]">
                      <div className="flex justify-between">
                        <span className="text-muted">Method:</span>
                        <span className="font-semibold text-ink uppercase">{pay.method}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Txn ID:</span>
                        <span className="font-mono text-[11px] text-graphite">{pay.transactionId || '—'}</span>
                      </div>
                      <div className="pt-2 border-t border-line/60">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[10.5px] font-bold uppercase tracking-wider text-muted">
                            Update Payment Status
                          </label>
                          {busy === 'pay' && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#4849E8]">
                              <span className="h-3 w-3 border-2 border-[#4849E8] border-t-transparent rounded-full animate-spin" />
                              <span>Updating...</span>
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <Select
                            value={pay.status}
                            disabled={!!busy}
                            onChange={(e) => updatePayment(e.target.value)}
                            options={PAYMENT_STATUSES}
                            className={`!h-8 !text-[12px] bg-white transition-opacity ${busy === 'pay' ? 'opacity-60 pr-8' : ''}`}
                          />
                          {busy === 'pay' && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                              <div className="h-3.5 w-3.5 border-2 border-[#4849E8] border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[12px] text-muted py-1">No payment record found.</p>
                  )}
                </div>

                {/* Totals & Price Breakdown */}
                <dl className="space-y-1.5 text-[12px]">
                  <Row label="Subtotal" value={inr(order.subtotal)} />
                  <Row label="Shipping" value={order.shipping ? inr(order.shipping) : 'Free'} />
                  {order.discount > 0 && <Row label="Discount" value={`− ${inr(order.discount)}`} />}
                  <Row label="Total" value={inr(order.total)} strong />
                  {refunded > 0 && <Row label="Refunded" value={`− ${inr(refunded)}`} tone="text-sale" />}
                  {refunded > 0 && <Row label="Net" value={inr(order.total - refunded)} strong />}
                </dl>
              </div>
            </div>
          </Card>

          <Card
            title="Timeline"
            action={
              <div className="flex gap-2">
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add an internal note…"
                  className="!w-56 !py-1.5 !text-[12px]"
                  disabled={!!busy}
                />
                <Button
                  className="!px-3 !py-1.5"
                  disabled={!note.trim()}
                  loading={busy === 'note'}
                  loadingText="Saving..."
                  onClick={addNote}
                >
                  Add
                </Button>
              </div>
            }
          >
            <ol className="space-y-3">
              {[...order.timeline].reverse().map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-forest" />
                  <div>
                    <p className="text-[12px] font-medium">{t.label}</p>
                    {t.note && <p className="text-[11px] text-muted">{t.note}</p>}
                    <p className="text-[10px] text-muted">{longDate(t.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Customer">
            <p className="text-[13px] font-medium">{order.customerName}</p>
            <p className="text-[12px] text-muted">{order.email}</p>
            <p className="text-[12px] text-muted">{order.phone}</p>
            <Link
              to={`/admin/customers/${order.userId}`}
              className="mt-3 inline-block text-[11px] underline underline-offset-2"
            >
              View customer
            </Link>
            {order.address && (
              <address className="mt-4 border-t border-line pt-3 text-[12px] not-italic leading-relaxed text-graphite">
                {order.address.line1}<br />
                {order.address.city}, {order.address.state}<br />
                {order.address.pin}, {order.address.country}
              </address>
            )}
          </Card>

          <Card title="Estimated Delivery Date">
            <div className="space-y-3 text-[12px]">
              <div className="flex items-center justify-between">
                <span className="text-muted">Current Target:</span>
                {order.deliveryDate ? (
                  <Badge tone="success">
                    {new Date(order.deliveryDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Badge>
                ) : (
                  <Badge tone="warning">Auto (3-4 Days)</Badge>
                )}
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-semibold text-gray-700">Set / Change Delivery Date:</label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={deliveryDateInput}
                    onChange={(e) => setDeliveryDateInput(e.target.value)}
                    disabled={!!busy}
                    className="!py-1.5 !text-[12px] flex-1"
                  />
                  <Button
                    className="!px-3 !py-1.5"
                    disabled={!deliveryDateInput || deliveryDateInput === order.deliveryDate || !!busy}
                    loading={busy === 'deliveryDate'}
                    loadingText="Saving..."
                    onClick={() => updateDeliveryDate(deliveryDateInput)}
                  >
                    Save
                  </Button>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="pt-1 border-t border-line">
                <span className="block text-[10.5px] text-muted mb-1.5 font-medium">Quick Presets (from order date):</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDeliveryPreset(2)}
                    disabled={!!busy}
                    className="px-2 py-1 text-[10.5px] font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors cursor-pointer"
                  >
                    +2 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryPreset(3)}
                    disabled={!!busy}
                    className="px-2 py-1 text-[10.5px] font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors cursor-pointer"
                  >
                    +3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryPreset(5)}
                    disabled={!!busy}
                    className="px-2 py-1 text-[10.5px] font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors cursor-pointer"
                  >
                    +5 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryPreset(7)}
                    disabled={!!busy}
                    className="px-2 py-1 text-[10.5px] font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors cursor-pointer"
                  >
                    +7 Days
                  </button>
                  {order.deliveryDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryDateInput('')
                        updateDeliveryDate(null)
                      }}
                      disabled={!!busy}
                      className="px-2 py-1 text-[10.5px] font-semibold rounded-lg bg-red-50 hover:bg-red-100 text-red-700 transition-colors cursor-pointer"
                    >
                      Clear / Auto
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Shipment">
            {ship ? (
              <dl className="space-y-2 text-[12px]">
                <Row label="Status" value={<Badge tone={ship.status}>{ship.status}</Badge>} />
                <Row label="Carrier" value={ship.carrier} />
                <Row label="AWB" value={<span className="font-mono text-[11px]">{ship.awb}</span>} />
                <Link to={`/track/${order.id}`} className="mt-2 inline-block text-[11px] underline underline-offset-2">
                  Customer tracking view
                </Link>
              </dl>
            ) : (
              <>
                <p className="text-[12px] text-muted">Not shipped yet.</p>
                <ShipForm busy={busy === 'status'} onShip={(carrier, awb) => setStatus('Shipped', { carrier, awb })} />
              </>
            )}
          </Card>

          {refunds.length > 0 && (
            <Card title="Refunds">
              <ul className="space-y-3">
                {refunds.map((r) => (
                  <li key={r.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold">{inr(r.amount)}</span>
                      <Badge tone={r.status}>{r.status}</Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted">{r.reason}</p>
                    {r.status === 'Pending' && (
                      <div className="mt-2 flex gap-1.5">
                        <Button
                          className="!px-3 !py-1.5"
                          loading={busy === `refund-${r.id}`}
                          loadingText="Updating..."
                          onClick={() => setRefundStatus(r.id, 'Processed')}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="ghost"
                          className="!px-3 !py-1.5"
                          disabled={!!busy}
                          onClick={() => setRefundStatus(r.id, 'Rejected')}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {refunding && (
        <RefundModal
          max={canRefund}
          busy={busy === 'refund'}
          onClose={() => !busy && setRefunding(false)}
          onSubmit={createRefund}
        />
      )}
      {/* Edit Order Modal */}
      {editingModal && (
        <EditOrderModal
          order={order}
          open={editingModal}
          onClose={() => setEditingModal(false)}
          onUpdated={(updated) => {
            setEditingModal(false)
          }}
        />
      )}
    </>
  )
}

const Row = ({ label, value, strong, tone = '' }) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="text-muted">{label}</dt>
    <dd className={`${strong ? 'font-semibold' : ''} ${tone}`}>{value}</dd>
  </div>
)

function ShipForm({ onShip, busy }) {
  const [carrier, setCarrier] = useState(CARRIERS[0])
  const [awb, setAwb] = useState('')
  return (
    <div className="mt-3 space-y-2.5">
      <Select value={carrier} onChange={(e) => setCarrier(e.target.value)} options={CARRIERS} disabled={busy} />
      <Input value={awb} onChange={(e) => setAwb(e.target.value)} placeholder="AWB number (optional)" disabled={busy} />
      <Button
        className="w-full"
        loading={busy}
        loadingText="Updating..."
        onClick={() => onShip(carrier, awb || undefined)}
      >
        Mark shipped
      </Button>
    </div>
  )
}

function RefundModal({ max, onClose, onSubmit, busy }) {
  const [amount, setAmount] = useState(max)
  const [reason, setReason] = useState('Damaged in transit')

  return (
    <Modal open onClose={onClose} title="Issue refund">
      <div className="space-y-4">
        <Field label="Amount (₹)" hint={`Maximum refundable: ${inr(max)}`}>
          <Input
            type="number"
            value={amount}
            max={max}
            disabled={busy}
            onChange={(e) => setAmount(Math.min(max, Math.max(0, Number(e.target.value))))}
          />
        </Field>
        <div className="flex gap-2">
          <Button variant="ghost" className="!px-3 !py-1.5" disabled={busy} onClick={() => setAmount(max)}>Full</Button>
          <Button variant="ghost" className="!px-3 !py-1.5" disabled={busy} onClick={() => setAmount(Math.round(max / 2))}>Half</Button>
        </div>
        <Field label="Reason">
          <Select
            value={reason}
            disabled={busy}
            onChange={(e) => setReason(e.target.value)}
            options={['Damaged in transit', 'Jar broken on arrival', 'Fragrance not as expected', 'Changed mind', 'Wrong item sent', 'Late delivery', 'Other']}
          />
        </Field>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button
          variant="danger"
          disabled={amount <= 0}
          loading={busy}
          loadingText="Creating..."
          onClick={() => onSubmit(Number(amount), reason)}
        >
          Refund {inr(amount)}
        </Button>
      </div>
    </Modal>
  )
}
