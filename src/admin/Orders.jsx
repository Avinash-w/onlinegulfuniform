import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { apiDelete, apiGet, apiPatch } from '../lib/api.js'
import { useStore, inr, shortDate } from '../store/StoreContext.jsx'
import { paymentOfOrder, allProducts, variantsOf, userById, userAddresses, freeShippingAt, shippingFlat } from '../store/selectors.js'
import { ORDER_STATUSES } from '../store/seed.js'
import { Badge, Button, Card, ConfirmModal, Field, Input, Modal, PageHeader, Pagination, Select, Table, Td, Tr } from './ui.jsx'

export function EditOrderModal({ order, open, onClose, onUpdated }) {
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const products = useMemo(() => allProducts(state), [state])
  const customerUser = useMemo(() => (order?.userId ? userById(state, order.userId) : null), [state, order])
  const savedAddresses = useMemo(() => userAddresses(customerUser), [customerUser])

  const [lines, setLines] = useState([])
  const [couponCode, setCouponCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)

  const [address, setAddress] = useState({
    name: '',
    phone: '',
    email: '',
    line1: '',
    city: '',
    state: '',
    pin: '',
    country: 'India',
  })

  const [selectedProductHandle, setSelectedProductHandle] = useState('')
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [addQty, setAddQty] = useState(1)
  const [saving, setSaving] = useState(false)

  const availableVariants = useMemo(() => {
    if (!selectedProductHandle) return []
    return variantsOf(state, selectedProductHandle)
  }, [state, selectedProductHandle])

  useEffect(() => {
    if (availableVariants.length > 0 && !selectedVariantId) {
      setSelectedVariantId(availableVariants[0].id)
    }
  }, [availableVariants, selectedVariantId])

  useEffect(() => {
    if (order && open) {
      setLines(
        (order.lines || []).map((l) => ({
          variantId: l.variantId,
          productHandle: l.productHandle || l.handle,
          title: l.title,
          image: l.image,
          size: l.size,
          color: l.color,
          sku: l.sku,
          price: l.price,
          qty: l.qty,
          customNote: l.customNote || '',
        }))
      )
      setCouponCode(order.coupon || '')
      setDiscountAmount(order.discount || 0)
      setAddress({
        name: order.address?.name || order.customerName || '',
        phone: order.address?.phone || order.phone || '',
        email: order.address?.email || order.email || '',
        line1: order.address?.line1 || '',
        city: order.address?.city || '',
        state: order.address?.state || '',
        pin: order.address?.pin || '',
        country: order.address?.country || 'India',
      })
      setSelectedProductHandle('')
      setSelectedVariantId('')
      setAddQty(1)
      setCouponError('')
    }
  }, [order, open])

  const subtotal = useMemo(() => {
    return lines.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0)
  }, [lines])

  const shipping = useMemo(() => {
    return subtotal >= freeShippingAt(state) || subtotal === 0 ? 0 : shippingFlat(state)
  }, [subtotal, state])

  const handleApplyCoupon = async (codeToTest) => {
    const code = (codeToTest || couponCode).trim().toUpperCase()
    if (!code) {
      setCouponCode('')
      setDiscountAmount(0)
      setCouponError('')
      return
    }
    setCouponLoading(true)
    setCouponError('')
    try {
      const res = await apiGet('/coupons')
      const allCoupons = res.data?.coupons || res.data || []
      const found = allCoupons.find((c) => c.code === code && (c.active === 1 || c.active === true))
      if (!found) {
        setCouponError('Invalid or inactive coupon code.')
        setDiscountAmount(0)
        return
      }
      if (subtotal < (found.min_cart || found.minCart || 0)) {
        setCouponError(`Min cart value of ₹${found.min_cart || found.minCart} required.`)
        setDiscountAmount(0)
        return
      }
      const disc =
        found.type === 'percent'
          ? Math.round((subtotal * found.value) / 100)
          : Math.min(subtotal, found.value)
      setDiscountAmount(disc)
      setCouponCode(code)
      notify(`Coupon ${code} applied! ₹${disc} discount.`)
    } catch {
      setCouponError('Unable to validate coupon.')
    } finally {
      setCouponLoading(false)
    }
  }

  useEffect(() => {
    if (couponCode) {
      handleApplyCoupon(couponCode)
    } else {
      setDiscountAmount(0)
    }
  }, [subtotal])

  const total = useMemo(() => {
    return Math.max(0, subtotal + shipping - discountAmount)
  }, [subtotal, shipping, discountAmount])

  const updateQty = (idx, newQty) => {
    if (newQty <= 0) {
      removeItem(idx)
      return
    }
    setLines((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, qty: newQty } : item))
    )
  }

  const removeItem = (idx) => {
    setLines((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleAddItem = () => {
    if (!selectedProductHandle || !selectedVariantId) return
    const prod = products.find((p) => p.handle === selectedProductHandle)
    const variant = availableVariants.find((v) => v.id === selectedVariantId)
    if (!prod || !variant) return

    const existingIdx = lines.findIndex((l) => l.variantId === variant.id)
    if (existingIdx >= 0) {
      updateQty(existingIdx, lines[existingIdx].qty + addQty)
    } else {
      const newLine = {
        variantId: variant.id,
        productHandle: prod.handle,
        title: prod.title,
        image: prod.images?.[0] || prod.media?.[0]?.url || '',
        size: variant.size,
        color: variant.color,
        sku: variant.sku,
        price: variant.price,
        qty: addQty,
        customNote: '',
      }
      setLines((prev) => [...prev, newLine])
    }

    setSelectedProductHandle('')
    setSelectedVariantId('')
    setAddQty(1)
  }

  const handleSelectSavedAddress = (e) => {
    const idx = parseInt(e.target.value, 10)
    if (!isNaN(idx) && savedAddresses[idx]) {
      const a = savedAddresses[idx]
      setAddress({
        name: a.name || address.name,
        phone: a.phone || address.phone,
        email: a.email || address.email,
        line1: a.line1 || a.street || '',
        city: a.city || '',
        state: a.state || '',
        pin: a.pin || a.postalCode || '',
        country: a.country || 'India',
      })
    }
  }

  const handleSave = async () => {
    if (!order) return
    if (lines.length === 0) {
      alert('Order must have at least 1 item.')
      return
    }
    if (!address.name || !address.phone || !address.line1 || !address.city || !address.state || !address.pin) {
      alert('Please fill in all required shipping address fields.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        lines,
        coupon: couponCode || null,
        address,
        customerName: address.name,
        email: address.email,
        phone: address.phone,
      }

      const res = await apiPatch(`/orders/${order.id}`, payload, { auth: true })
      if (res.data?.order) {
        dispatch({
          type: 'order/upsert',
          order: res.data.order,
          payment: res.data.payment,
          shipment: res.data.shipment,
        })
      }
      notify(res?.message || `Order ${order.id} updated successfully!`)
      if (onUpdated) onUpdated(res.data?.order)
      onClose()
    } catch (err) {
      notify(err?.message || 'Failed to update order.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Edit Order — ${order?.id || ''}`} wide>
      <div className="space-y-4 text-ink max-h-[78vh] overflow-y-auto pr-1">
        {/* Order Items Table & Management */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11.5px] font-bold uppercase tracking-wider text-ink">
              Order Items ({lines.reduce((n, l) => n + l.qty, 0)})
            </h4>
            <span className="text-[10.5px] text-muted font-medium">Stock automatically re-adjusted on save</span>
          </div>

          <div className="rounded-xl border border-line overflow-hidden bg-white">
            <div className="divide-y divide-line/60">
              {lines.map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3 bg-white hover:bg-chalk/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-12 w-10 shrink-0 overflow-hidden rounded bg-chalk border border-line/60">
                      {item.image ? (
                        <img src={item.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[10px] text-muted">🕯️</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[13px] text-ink truncate">{item.title}</p>
                      <p className="text-[11px] text-muted">
                        {item.size} · {item.color} {item.sku ? `(SKU: ${item.sku})` : ''}
                      </p>
                      <span className="text-[12px] font-bold text-forest sm:hidden">{inr(item.price)} each</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0">
                    <div className="hidden sm:block text-right">
                      <span className="text-[12px] font-bold text-ink">{inr(item.price)}</span>
                      <span className="block text-[10px] text-muted">each</span>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center rounded-lg border border-line bg-chalk/50 p-0.5">
                      <button
                        type="button"
                        onClick={() => updateQty(idx, item.qty - 1)}
                        className="h-6 w-6 rounded flex items-center justify-center hover:bg-white text-ink font-bold text-xs cursor-pointer"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-[12px] font-bold text-ink">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(idx, item.qty + 1)}
                        className="h-6 w-6 rounded flex items-center justify-center hover:bg-white text-ink font-bold text-xs cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <span className="w-16 text-right text-[13px] font-bold text-ink">
                      {inr(item.price * item.qty)}
                    </span>

                    {/* Remove Item with Compact Red Trash Bin Icon (No border / No bg) */}
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      title="Remove Item"
                      aria-label="Remove Item"
                      className="inline-flex h-7 w-7 items-center justify-center text-[#E02438] transition-colors hover:text-red-700 active:scale-90 cursor-pointer p-0.5"
                    >
                      <svg className="h-3.5 w-3.5 stroke-[2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="10" y1="11" x2="10" y2="17" strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="14" y1="11" x2="14" y2="17" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {lines.length === 0 && (
                <div className="p-6 text-center text-muted text-[12px]">
                  No items in this order. Add at least one item below.
                </div>
              )}
            </div>

            {/* Add New Item Box */}
            <div className="border-t border-line/80 bg-chalk/40 p-3.5">
              <span className="block text-[10.5px] font-bold uppercase tracking-wider text-graphite mb-2">
                ➕ Add Item to Order
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                <div className="sm:col-span-5">
                  <Select
                    value={selectedProductHandle}
                    onChange={(e) => {
                      setSelectedProductHandle(e.target.value)
                      setSelectedVariantId('')
                    }}
                    options={[
                      { value: '', label: 'Select Product...' },
                      ...products.map((p) => ({ value: p.handle, label: p.title })),
                    ]}
                    className="!h-8 !text-[12px]"
                  />
                </div>

                <div className="sm:col-span-4">
                  <Select
                    disabled={!selectedProductHandle}
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    options={[
                      { value: '', label: 'Select Variant / Size...' },
                      ...availableVariants.map((v) => ({
                        value: v.id,
                        label: `${v.size} · ${v.color} (₹${v.price}, Stock: ${v.stock})`,
                      })),
                    ]}
                    className="!h-8 !text-[12px]"
                  />
                </div>

                <div className="sm:col-span-1">
                  <Input
                    type="number"
                    min="1"
                    value={addQty}
                    onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    disabled={!selectedProductHandle}
                    className="!h-8 !text-[12px] !py-1 text-center"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Button
                    type="button"
                    disabled={!selectedProductHandle || !selectedVariantId}
                    onClick={handleAddItem}
                    className="w-full !h-8 !py-1 !text-[11.5px]"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coupon Code & Price Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Coupon Box */}
          <div className="rounded-xl border border-line bg-chalk/30 p-3.5 space-y-2.5">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-ink">
              Apply or Change Coupon
            </span>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. FESTIVE20"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="!h-8 !text-[12px] uppercase font-mono"
              />
              <Button
                type="button"
                variant="ghost"
                loading={couponLoading}
                onClick={() => handleApplyCoupon(couponCode)}
                className="!h-8 !px-3 !text-[11.5px] shrink-0"
              >
                Apply
              </Button>
              {couponCode && (
                <button
                  type="button"
                  onClick={() => {
                    setCouponCode('')
                    setDiscountAmount(0)
                    setCouponError('')
                  }}
                  className="px-2 text-xs font-semibold text-red-500 hover:underline cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>
            {couponError && <p className="text-[11px] font-medium text-sale">{couponError}</p>}
            {discountAmount > 0 && (
              <p className="text-[11.5px] font-bold text-save">✓ Coupon Applied: − {inr(discountAmount)}</p>
            )}
          </div>

          {/* Recalculated Order Totals */}
          <div className="rounded-xl border border-line bg-[#FBFBFA] p-3.5 text-[12px] space-y-2">
            <div className="flex justify-between text-muted">
              <span>Subtotal:</span>
              <span className="font-semibold text-ink">{inr(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Shipping:</span>
              <span className="font-semibold text-forest">{shipping ? inr(shipping) : 'Free'}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sale font-medium">
                <span>Coupon Discount:</span>
                <span>− {inr(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-line/80 pt-2 text-[13.5px] font-bold text-ink">
              <span>Recalculated Total:</span>
              <span className="text-forest">{inr(total)}</span>
            </div>
          </div>
        </div>

        {/* Shipping & Delivery Address Management */}
        <div className="rounded-xl border border-line bg-chalk/30 p-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-[11.5px] font-bold uppercase tracking-wider text-ink">
              Delivery Address & Customer Info
            </h4>

            {savedAddresses.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10.5px] text-muted font-medium">Use saved address:</span>
                <select
                  onChange={handleSelectSavedAddress}
                  className="h-7 text-[11px] rounded-lg border border-line bg-white px-2 text-ink outline-none"
                >
                  <option value="">Choose saved address...</option>
                  {savedAddresses.map((a, i) => (
                    <option key={i} value={i}>
                      {a.name || 'Address'} — {a.city}, {a.pin}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Customer Name *">
              <Input
                value={address.name}
                onChange={(e) => setAddress({ ...address, name: e.target.value })}
                placeholder="Full Name"
                className="!h-8 !text-[12px]"
              />
            </Field>

            <Field label="Phone / WhatsApp *">
              <Input
                value={address.phone}
                onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                placeholder="10-digit mobile"
                className="!h-8 !text-[12px]"
              />
            </Field>

            <Field label="Email Address">
              <Input
                value={address.email}
                onChange={(e) => setAddress({ ...address, email: e.target.value })}
                placeholder="customer@example.com"
                className="!h-8 !text-[12px]"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <Field label="Street / Flat / House Address *">
                <Input
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                  placeholder="Flat 4B, Sunrise Heights..."
                  className="!h-8 !text-[12px]"
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="City *">
                <Input
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  placeholder="City"
                  className="!h-8 !text-[12px]"
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="State *">
                <Input
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  placeholder="State"
                  className="!h-8 !text-[12px]"
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Pincode *">
                <Input
                  value={address.pin}
                  onChange={(e) => setAddress({ ...address, pin: e.target.value })}
                  placeholder="6-digit PIN"
                  className="!h-8 !text-[12px]"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-line pt-3.5">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} loadingText="Saving Changes..." onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function Orders() {
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('All')
  const [sort, setSort] = useState('Newest')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [datePreset, setDatePreset] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(6)
  const [deletingId, setDeletingId] = useState(null)
  const [deletingOrder, setDeletingOrder] = useState(null)
  const [editingOrder, setEditingOrder] = useState(null)
  const [selectedOrderIds, setSelectedOrderIds] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(!state.orders || state.orders.length === 0)

  const fetchOrders = async (showNotification = false) => {
    try {
      setLoadingOrders(true)
      const [ordersJson, customersJson] = await Promise.all([
        apiGet('/orders', { auth: true }),
        apiGet('/customers', { auth: true }),
      ])
      dispatch({
        type: 'commerce/hydrate',
        orders: ordersJson.data?.orders ?? [],
        payments: ordersJson.data?.payments ?? [],
        shipments: ordersJson.data?.shipments ?? [],
        refunds: ordersJson.data?.refunds ?? [],
        users: customersJson.data?.users ?? undefined,
      })
      if (showNotification) {
        notify('Orders refreshed successfully.')
      }
    } catch (err) {
      console.error('Error fetching orders:', err)
      if (showNotification) {
        notify(err?.message || 'Failed to refresh orders.')
      }
    } finally {
      setLoadingOrders(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [q, status, sort, startDate, endDate, pageSize])

  // Metrics Calculations
  const stats = useMemo(() => {
    const all = state.orders || []
    const totalRevenue = all.reduce((sum, o) => {
      const pay = paymentOfOrder(state, o.id)
      return pay?.status === 'Paid' ? sum + (o.total || 0) : sum
    }, 0)
    const pendingCount = all.filter((o) => o.status === 'Pending').length
    const shippedCount = all.filter((o) => o.status === 'Shipped').length
    const deliveredCount = all.filter((o) => o.status === 'Delivered').length
    const totalCount = all.length

    return {
      totalRevenue,
      pendingCount,
      pendingPct: totalCount ? Math.round((pendingCount / totalCount) * 100) : 0,
      shippedCount,
      shippedPct: totalCount ? Math.round((shippedCount / totalCount) * 100) : 0,
      deliveredCount,
      deliveredPct: totalCount ? Math.round((deliveredCount / totalCount) * 100) : 0,
    }
  }, [state])

  const applyPreset = (preset) => {
    setDatePreset(preset)
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const todayStr = `${yyyy}-${mm}-${dd}`

    if (preset === 'all') {
      setStartDate('')
      setEndDate('')
      return
    }
    if (preset === 'today') {
      setStartDate(todayStr)
      setEndDate(todayStr)
      return
    }
    if (preset === 'yesterday') {
      const yest = new Date(now.getTime() - 86400000)
      const yStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`
      setStartDate(yStr)
      setEndDate(yStr)
      return
    }
    if (preset === '7days') {
      const past7 = new Date(now.getTime() - 7 * 86400000)
      const pStr = `${past7.getFullYear()}-${String(past7.getMonth() + 1).padStart(2, '0')}-${String(past7.getDate()).padStart(2, '0')}`
      setStartDate(pStr)
      setEndDate(todayStr)
      return
    }
    if (preset === '30days') {
      const past30 = new Date(now.getTime() - 30 * 86400000)
      const pStr = `${past30.getFullYear()}-${String(past30.getMonth() + 1).padStart(2, '0')}-${String(past30.getDate()).padStart(2, '0')}`
      setStartDate(pStr)
      setEndDate(todayStr)
      return
    }
    if (preset === 'thisMonth') {
      const startMonth = `${yyyy}-${mm}-01`
      setStartDate(startMonth)
      setEndDate(todayStr)
      return
    }
  }

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    let list = state.orders.filter((o) => {
      if (status !== 'All' && o.status !== status) return false

      if (
        t &&
        !o.id.toLowerCase().includes(t) &&
        !o.customerName.toLowerCase().includes(t) &&
        !o.email.toLowerCase().includes(t)
      ) {
        return false
      }

      if (startDate || endDate) {
        const orderTime = typeof o.placedAt === 'number' ? o.placedAt : new Date(o.placedAt).getTime()
        if (startDate) {
          const startMs = new Date(startDate + 'T00:00:00').getTime()
          if (orderTime < startMs) return false
        }
        if (endDate) {
          const endMs = new Date(endDate + 'T23:59:59.999').getTime()
          if (orderTime > endMs) return false
        }
      }

      return true
    })

    if (sort === 'Newest') list = [...list].sort((a, b) => b.placedAt - a.placedAt)
    if (sort === 'Oldest') list = [...list].sort((a, b) => a.placedAt - b.placedAt)
    if (sort === 'Highest value') list = [...list].sort((a, b) => b.total - a.total)
    return list
  }, [state.orders, q, status, sort, startDate, endDate])

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [rows, page, pageSize])

  const allPageIds = useMemo(() => paginatedRows.map((r) => r.id), [paginatedRows])
  const isAllSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedOrderIds.includes(id))

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !allPageIds.includes(id)))
    } else {
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...allPageIds])))
    }
  }

  const toggleSelectOrder = (id) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const confirmDelete = async () => {
    if (!deletingOrder || deletingId) return
    const orderId = deletingOrder.id
    setDeletingId(orderId)
    try {
      const res = await apiDelete(`/orders/${orderId}`, { auth: true })
      dispatch({ type: 'order/delete', id: orderId })
      notify(res?.message || `Order #${orderId} deleted successfully.`)
      setDeletingOrder(null)
    } catch (err) {
      notify(err.message || 'Failed to delete order.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleExportCSV = () => {
    if (rows.length === 0) {
      notify('No orders to export.')
      return
    }
    const headers = ['Order ID', 'Date', 'Customer Name', 'Email', 'Items Qty', 'Payment Status', 'Payment Method', 'Order Status', 'Total (INR)']
    const csvRows = [headers.join(',')]

    rows.forEach((o) => {
      const pay = paymentOfOrder(state, o.id)
      const qty = o.lines?.reduce((n, l) => n + l.qty, 0) || 0
      const rowData = [
        `"${o.id}"`,
        `"${new Date(o.placedAt).toLocaleDateString('en-GB')}"`,
        `"${o.customerName?.replace(/"/g, '""') || ''}"`,
        `"${o.email || ''}"`,
        qty,
        `"${pay?.status || ''}"`,
        `"${pay?.method || ''}"`,
        `"${o.status}"`,
        o.total || 0,
      ]
      csvRows.push(rowData.join(','))
    })

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Orders_Export_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    notify('Exported orders CSV successfully.')
  }

  const totalPages = Math.ceil(rows.length / pageSize) || 1

  return (
    <div className="space-y-4">
      {/* Top Header Row with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-ink">Orders</h1>
          <p className="text-[12px] text-muted">{state.orders.length} orders all time</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchOrders(true)}
            disabled={loadingOrders}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[12px] font-semibold text-ink shadow-2xs transition-all hover:bg-chalk active:scale-95 cursor-pointer disabled:opacity-50"
            title="Refresh Orders"
          >
            <svg
              className={`h-3.5 w-3.5 ${loadingOrders ? 'animate-spin text-[#4849E8]' : 'text-graphite'}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>{loadingOrders ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link
            to="/cart"
            target="_blank"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#4849E8] px-3 text-[12px] font-semibold text-white shadow-xs transition-all hover:bg-[#3839D6] active:scale-95"
          >
            <span className="text-[14px] leading-none">+</span>
            <span>Create Order</span>
          </Link>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[12px] font-semibold text-ink shadow-2xs transition-all hover:bg-chalk active:scale-95 cursor-pointer"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* 5 Stats Cards Row */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {/* Total Orders */}
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <div className="flex items-start justify-between">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#4849E8]">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <span className="inline-flex items-center gap-0.5 text-[9.5px] font-semibold text-emerald-600">
              ↗ 16% <span className="text-gray-400 font-normal">vs last month</span>
            </span>
          </div>
          <p className="mt-1 text-[10.5px] font-medium text-muted">Total Orders</p>
          <p className="text-[17px] font-bold text-ink leading-tight">{state.orders.length}</p>
        </div>

        {/* Total Revenue */}
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <div className="flex items-start justify-between">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 font-bold text-[13px]">
              ₹
            </div>
            <span className="inline-flex items-center gap-0.5 text-[9.5px] font-semibold text-emerald-600">
              ↗ 12% <span className="text-gray-400 font-normal">vs last month</span>
            </span>
          </div>
          <p className="mt-1 text-[10.5px] font-medium text-muted">Total Revenue</p>
          <p className="text-[17px] font-bold text-ink leading-tight">{inr(stats.totalRevenue)}</p>
        </div>

        {/* Pending Orders */}
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <div className="flex items-start justify-between">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
            <span className="text-[9.5px] font-semibold text-amber-600">
              {stats.pendingPct}% <span className="text-gray-400 font-normal">of total</span>
            </span>
          </div>
          <p className="mt-1 text-[10.5px] font-medium text-muted">Pending Orders</p>
          <p className="text-[17px] font-bold text-ink leading-tight">{stats.pendingCount}</p>
        </div>

        {/* Shipped Orders */}
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <div className="flex items-start justify-between">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="21 8 21 21 3 21 3 8" />
                <rect x="1" y="3" width="22" height="5" />
                <line x1="10" y1="12" x2="14" y2="12" />
              </svg>
            </div>
            <span className="text-[9.5px] font-semibold text-indigo-600">
              {stats.shippedPct}% <span className="text-gray-400 font-normal">of total</span>
            </span>
          </div>
          <p className="mt-1 text-[10.5px] font-medium text-muted">Shipped Orders</p>
          <p className="text-[17px] font-bold text-ink leading-tight">{stats.shippedCount}</p>
        </div>

        {/* Delivered Orders */}
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-start justify-between">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <span className="text-[9.5px] font-semibold text-emerald-600">
              {stats.deliveredPct}% <span className="text-gray-400 font-normal">of total</span>
            </span>
          </div>
          <p className="mt-1 text-[10.5px] font-medium text-muted">Delivered Orders</p>
          <p className="text-[17px] font-bold text-ink leading-tight">{stats.deliveredCount}</p>
        </div>
      </div>

      {/* Main Card with Filters and Table */}
      <Card className="!p-0">
        {/* Filter Toolbar matching design */}
        <div className="p-3.5 sm:p-4 border-b border-line space-y-3">
          {/* Row 1: Search, Status, Sort, Date Inputs, Clear */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 justify-between">
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
                  placeholder="Search order ID, customer name or email…"
                  className="w-full h-[38px] rounded-lg border border-line bg-white pl-9 pr-3 text-[12.5px] text-ink outline-none placeholder:text-muted focus:border-[#4849E8]"
                />
              </div>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-[38px] rounded-lg border border-line bg-white px-3 text-[12.5px] font-medium text-ink outline-none focus:border-[#4849E8]"
              >
                <option value="All">All Orders</option>
                {ORDER_STATUSES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-[38px] rounded-lg border border-line bg-white px-3 text-[12.5px] font-medium text-ink outline-none focus:border-[#4849E8]"
              >
                <option value="Newest">Newest First</option>
                <option value="Oldest">Oldest First</option>
                <option value="Highest value">Highest Value</option>
              </select>
            </div>

            {/* Date Picker Inputs */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 h-[38px] rounded-lg border border-line bg-white px-2.5 text-[12px]">
                <span className="text-gray-400 text-[11.5px]">📅 From</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setDatePreset('custom')
                  }}
                  className="bg-transparent text-ink outline-none text-[12px] cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-1.5 h-[38px] rounded-lg border border-line bg-white px-2.5 text-[12px]">
                <span className="text-gray-400 text-[11.5px]">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setDatePreset('custom')
                  }}
                  className="bg-transparent text-ink outline-none text-[12px] cursor-pointer"
                />
              </div>

              {(startDate || endDate || q || status !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    applyPreset('all')
                    setQ('')
                    setStatus('All')
                    setSort('Newest')
                  }}
                  title="Clear All Filters"
                  className="flex items-center gap-1 h-[38px] rounded-lg px-2 text-[11px] font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <span>✕</span>
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Quick Filters Presets & Count */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[12px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-ink mr-1">Quick Filters:</span>
              {[
                { id: 'all', label: 'All' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '7days', label: '7 Days' },
                { id: '30days', label: '30 Days' },
                { id: 'thisMonth', label: 'This Month' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className={`rounded-full px-3 py-0.5 text-[11px] font-semibold transition-all cursor-pointer ${
                    datePreset === p.id && !startDate && !endDate && p.id === 'all'
                      ? 'bg-[#4849E8] text-white shadow-2xs'
                      : datePreset === p.id && (startDate || endDate)
                      ? 'bg-[#4849E8] text-white shadow-2xs'
                      : 'bg-chalk text-graphite hover:bg-line/70'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <span className="text-[11.5px] font-medium text-muted self-end sm:self-auto">
              Showing <strong className="text-ink">{rows.length}</strong> of <strong className="text-ink">{state.orders.length}</strong> orders
            </span>
          </div>
        </div>

        {/* Clean Table View matching requested UI */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-line bg-chalk/40 text-[10.5px] font-bold uppercase tracking-wider text-graphite">
                <th className="py-2.5 pl-4 pr-2 w-8">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-line text-[#4849E8] focus:ring-[#4849E8] cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-3">
                  <div className="flex items-center gap-1">
                    <span>Order</span>
                    <span className="text-gray-400 text-[10px]">⇅</span>
                  </div>
                </th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Items</th>
                <th className="py-2.5 px-3">Delivery Date</th>
                <th className="py-2.5 px-3">Payment</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Total</th>
                <th className="py-2.5 pr-4 pl-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {loadingOrders ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <div className="h-6 w-6 border-2 border-[#4849E8] border-t-transparent rounded-full animate-spin" />
                      <span className="text-[12.5px] font-medium text-graphite">Loading orders from database...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((o) => {
                  const pay = paymentOfOrder(state, o.id)
                  const isFullyPaid = pay?.status === 'Paid'
                  const isSelected = selectedOrderIds.includes(o.id)
                  const totalQty = (o.lines || []).reduce((n, l) => n + l.qty, 0)
                  const lineImages = (o.lines || []).slice(0, 2)
                  const extraCount = Math.max(0, (o.lines?.length || 0) - 2)

                  // Status Icon and styling helper
                  const getStatusPill = (st) => {
                    if (st === 'Delivered') {
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Delivered</span>
                        </span>
                      )
                    }
                    if (st === 'Shipped') {
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="1" y="3" width="15" height="13" />
                            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                          </svg>
                          <span>Shipped</span>
                        </span>
                      )
                    }
                    if (st === 'Packed') {
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                          </svg>
                          <span>Packed</span>
                        </span>
                      )
                    }
                    if (st === 'Cancelled') {
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600">
                          <span>✕</span>
                          <span>Cancelled</span>
                        </span>
                      )
                    }
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>{st}</span>
                      </span>
                    )
                  }

                  const getPayPill = (p) => {
                    if (!p) return <span className="text-gray-400">—</span>
                    const isPaid = p.status === 'Paid'
                    const isRefunded = p.status === 'Refunded'
                    return (
                      <div>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700'
                              : isRefunded
                              ? 'bg-red-50 text-red-600'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {p.status}
                        </span>
                        <span className="block text-[10px] text-muted mt-0.5">{p.method || 'COD'}</span>
                      </div>
                    )
                  }

                  return (
                    <tr key={o.id} className="hover:bg-[#F9F9FE] transition-colors">
                      <td className="py-3 pl-4 pr-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOrder(o.id)}
                          className="h-3.5 w-3.5 rounded border-line text-[#4849E8] focus:ring-[#4849E8] cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-3">
                        <Link to={`/admin/orders/${o.id}`} className="font-bold text-ink hover:text-[#4849E8] transition-colors">
                          {o.id}
                        </Link>
                        <span className="block text-[11px] text-muted">
                          {new Date(o.placedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date(o.placedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-semibold text-ink block">{o.customerName}</span>
                        <span className="text-[11px] text-muted block">{o.email}</span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1.5 items-center">
                            {lineImages.map((l, i) => (
                              <img
                                key={i}
                                src={l.image || 'https://placehold.co/40x40?text=Item'}
                                alt={l.title}
                                className="h-7 w-7 rounded-md object-cover border border-line bg-white shadow-2xs"
                              />
                            ))}
                          </div>
                          {extraCount > 0 && (
                            <span className="text-[11px] font-semibold text-muted bg-chalk px-1 py-0.5 rounded">
                              +{extraCount}
                            </span>
                          )}
                          <span className="text-[12px] font-bold text-ink ml-1">{totalQty}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {o.deliveryDate ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            <span>📅</span>
                            <span>{new Date(o.deliveryDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">
                            📅 Auto (+3d)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">{getPayPill(pay)}</td>

                      <td className="py-3 px-3">{getStatusPill(o.status)}</td>

                      <td className="py-3 px-3 font-bold text-ink">{inr(o.total)}</td>

                      <td className="py-3 pr-4 pl-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Button */}
                          <Link
                            to={`/admin/orders/${o.id}`}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-line bg-white px-2 text-[11px] font-semibold text-ink shadow-2xs hover:bg-chalk active:scale-95 transition-all"
                          >
                            <svg className="h-3 w-3 text-graphite" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            <span>View</span>
                          </Link>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => setEditingOrder(o)}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-line bg-white px-2 text-[11px] font-semibold text-ink shadow-2xs hover:bg-chalk active:scale-95 transition-all cursor-pointer"
                          >
                            <svg className="h-3 w-3 text-graphite" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            <span>Edit</span>
                          </button>

                          {/* Invoice Button if paid */}
                          {isFullyPaid && (
                            <Link
                              to={`/invoice/${o.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-7 items-center gap-1 rounded-md border border-line bg-white px-2 text-[11px] font-bold text-[#4849E8] shadow-2xs hover:bg-[#4849E8]/5 active:scale-95 transition-all"
                            >
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                              </svg>
                              <span>Invoice</span>
                            </Link>
                          )}

                          {/* Red Bin Delete Button */}
                          <button
                            type="button"
                            disabled={deletingId === o.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeletingOrder(o)
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 bg-red-50/70 text-[#E02438] hover:bg-red-100 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {deletingId === o.id ? (
                              <span className="h-3 w-3 animate-spin rounded-full border border-red-500 border-t-transparent" />
                            ) : (
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                            )}
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

        {/* Bottom Pagination matching design */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-line px-4 py-3 text-[12px] text-muted">
          <span>
            Showing <strong className="text-ink">{paginatedRows.length}</strong> of <strong className="text-ink">{rows.length}</strong> orders
          </span>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Prev / Page numbers / Next */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-chalk disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ‹
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`inline-flex h-7 min-w-[28px] items-center justify-center rounded-md text-[11.5px] font-bold ${
                    page === p
                      ? 'bg-[#4849E8] text-white shadow-2xs'
                      : 'border border-line bg-white text-ink hover:bg-chalk'
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line bg-white text-ink hover:bg-chalk disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ›
              </button>
            </div>

            {/* Page Size Dropdown */}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-7 rounded-md border border-line bg-white px-2 text-[11px] font-medium text-ink outline-none"
            >
              <option value={6}>6 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Edit Order Modal */}
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          open={Boolean(editingOrder)}
          onClose={() => setEditingOrder(null)}
          onUpdated={() => setEditingOrder(null)}
        />
      )}

      <ConfirmModal
        open={Boolean(deletingOrder)}
        onClose={() => !deletingId && setDeletingOrder(null)}
        onConfirm={confirmDelete}
        loading={Boolean(deletingId)}
        loadingText="Archiving order..."
        title={`Archive Order #${deletingOrder?.id || ''}?`}
        message={`Are you sure you want to archive order #${deletingOrder?.id}? It will be hidden from active lists while keeping all customer, payment, and shipment records safely preserved.`}
        confirmText="Archive order"
        tone="danger"
      />
    </div>
  )
}
