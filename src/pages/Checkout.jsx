import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Img from '../components/Img'
import Seo from '../components/Seo'
import { Modal } from '../admin/ui.jsx'
import { inr, useCart } from '../context/CartContext'
import { apiDelete, apiGet, apiPatch, apiPost, apiPut, getCustomerToken } from '../lib/api.js'
import { getRazorpayKey, openRazorpayCheckout } from '../lib/razorpay.js'
import { useStore } from '../store/StoreContext.jsx'
import { userAddresses, userById, freeShippingAt, minOrderAmount, shippingFlat } from '../store/selectors.js'

const blankAddress = {
  label: 'Home',
  name: '',
  phone: '',
  email: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pin: '',
  country: 'India',
  isDefault: false,
}

function formatAddress(a) {
  const line2Part = a.line2 ? `${a.line2}, ` : ''
  return `${a.line1}, ${line2Part}${a.city}, ${a.state} - ${a.pin}, ${a.country || 'India'}`
}

export default function Checkout() {
  const navigate = useNavigate()
  const { lines, subtotal, clear, closeCart, notify, appliedCoupon, couponDiscount, removeCoupon: removeCartCoupon } = useCart()
  const { state, dispatch } = useStore()
  const user = userById(state, state.currentUserId)
  const addresses = userAddresses(user)
  const hasRazorpayKey = Boolean(getRazorpayKey())

  const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0]

  const [selectedId, setSelectedId] = useState(
    () => defaultAddr?.id ?? null
  )

  const [contact, setContact] = useState(() => ({
    name: defaultAddr?.name || user?.name || '',
    email: defaultAddr?.email || user?.email || '',
    phone: defaultAddr?.phone || user?.phone || '',
  }))

  const [adding, setAdding] = useState(false)
  const [editingAddrId, setEditingAddrId] = useState(null)
  const [openMenuAddrId, setOpenMenuAddrId] = useState(null)
  const [newAddr, setNewAddr] = useState(blankAddress)
  const [pincodeLoading, setPincodeLoading] = useState(false)
  const [pincodeCity, setPincodeCity] = useState('')
  const [modalError, setModalError] = useState('')
  const [addrErrors, setAddrErrors] = useState({})
  const [couponInput, setCouponInput] = useState('')
  const [applied, setApplied] = useState(() =>
    appliedCoupon
      ? { code: appliedCoupon.code, discount: couponDiscount || appliedCoupon.discount || 0 }
      : null
  )
  const [couponError, setCouponError] = useState('')
  const [payMode, setPayMode] = useState('online') // online | cod
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [paymentProcessing, setPaymentProcessing] = useState(null) // null | { step: 'verifying' | 'success', mode: 'online' | 'cod', txnId?: string }

  const shipping = subtotal >= freeShippingAt(state) ? 0 : shippingFlat(state)
  const discount = applied?.discount ?? 0
  const total = Math.max(0, subtotal + shipping - discount)
  const selected = addresses.find((a) => a.id === selectedId) ?? defaultAddr ?? null

  // Live Database Sync: Fetch customer profile, latest addresses & active coupons directly from MySQL API
  useEffect(() => {
    let active = true
    const syncDbData = async () => {
      try {
        const token = getCustomerToken()
        if (token) {
          const [custRes, addrRes, coupRes] = await Promise.all([
            apiGet('/customer/me', { auth: 'customer' }).catch(() => null),
            apiGet('/customer/addresses', { auth: 'customer' }).catch(() => null),
            apiGet('/coupons').catch(() => null),
          ])

          if (!active) return

          const dbUser = custRes?.data?.user
          const dbAddresses = addrRes?.data?.addresses || dbUser?.addresses || []

          if (dbUser?.id) {
            dispatch({ type: 'user/ensure', user: dbUser })
            if (Array.isArray(dbAddresses)) {
              dispatch({
                type: 'user/update',
                id: dbUser.id,
                patch: {
                  name: dbUser.name,
                  email: dbUser.email,
                  phone: dbUser.phone,
                  addresses: dbAddresses,
                  address: dbAddresses.find((a) => a.isDefault) || dbAddresses[0] || dbUser.address,
                },
              })

              if (dbAddresses.length > 0) {
                const def = dbAddresses.find((a) => a.isDefault) || dbAddresses[0]
                setSelectedId((prev) => prev || def.id)
              }
            }
          }

          if (coupRes?.data?.coupons && Array.isArray(coupRes.data.coupons)) {
            dispatch({ type: 'coupons/set', coupons: coupRes.data.coupons })
          }
        }
      } catch (err) {
        console.error('Checkout database sync error:', err)
      }
    }

    syncDbData()
    return () => {
      active = false
    }
  }, [dispatch])

  // Ensure selectedId is set if addresses arrive late
  useEffect(() => {
    if (!selectedId && addresses.length > 0) {
      const def = addresses.find((a) => a.isDefault) || addresses[0]
      setSelectedId(def.id)
    }
  }, [addresses.length, selectedId])

  // Sync user profile updates
  useEffect(() => {
    if (!user) return
    setContact((prev) => ({
      name: prev.name || user.name || '',
      email: prev.email || user.email || '',
      phone: prev.phone || user.phone || '',
    }))
  }, [user?.id, user?.phone, user?.name, user?.email])

  // Sync contact fields to the currently selected address recipient details
  useEffect(() => {
    if (!selected) return
    setContact({
      name: selected.name || user?.name || contact.name || '',
      phone: selected.phone || user?.phone || contact.phone || '',
      email: selected.email || user?.email || contact.email || '',
    })
  }, [selectedId])

  // If user has 0 saved addresses on initial load, open Add Address form
  useEffect(() => {
    if (user && addresses.length === 0) {
      setAdding(true)
    }
  }, [user?.id])

  // Close 3-dots dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.address-menu-container')) {
        setOpenMenuAddrId(null)
      }
    }
    document.addEventListener('click', handleOutsideClick)
    return () => document.removeEventListener('click', handleOutsideClick)
  }, [])

  const openAddModal = () => {
    setEditingAddrId(null)
    setNewAddr({
      label: 'Home',
      name: contact.name || user?.name || '',
      phone: contact.phone || user?.phone || '',
      email: contact.email || user?.email || '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      pin: '',
      country: 'India',
      isDefault: addresses.length === 0,
    })
    setPincodeCity('')
    setModalError('')
    setAddrErrors({})
    setOpenMenuAddrId(null)
    setAdding(true)
  }

  const openEditModal = (addr) => {
    setEditingAddrId(addr.id)
    setNewAddr({
      label: addr.label || 'Home',
      name: addr.name || addr.recipientName || '',
      phone: addr.phone || addr.recipientPhone || '',
      email: addr.email || '',
      line1: addr.line1 || '',
      line2: addr.line2 || '',
      city: addr.city || '',
      state: addr.state || '',
      pin: addr.pin || '',
      country: addr.country || 'India',
      isDefault: Boolean(addr.isDefault),
    })
    setPincodeCity(addr.city || '')
    setModalError('')
    setAddrErrors({})
    setOpenMenuAddrId(null)
    setAdding(true)
  }

  const closeAddModal = () => {
    setAdding(false)
    setEditingAddrId(null)
    setNewAddr(blankAddress)
    setPincodeCity('')
    setModalError('')
    setAddrErrors({})
  }

  const handleDeleteAddress = async (addrId) => {
    setOpenMenuAddrId(null)
    if (!window.confirm('Are you sure you want to delete this delivery address?')) return
    try {
      await apiDelete(`/customer/addresses/${addrId}`, { auth: 'customer' })
      const updatedList = addresses.filter((a) => a.id !== addrId)
      const newDef = updatedList.find((a) => a.isDefault) || updatedList[0] || null
      dispatch({
        type: 'user/update',
        id: user?.id,
        patch: {
          addresses: updatedList,
          address: newDef,
        },
      })
      if (selectedId === addrId) {
        setSelectedId(newDef ? newDef.id : null)
      }
      notify('Address deleted successfully.')
    } catch (err) {
      notify(err.message || 'Unable to delete address.')
    }
  }

  const handlePincodeChange = async (val) => {
    const rawPin = val.replace(/\D/g, '').slice(0, 6)
    setNewAddr((prev) => ({ ...prev, pin: rawPin }))
    setAddrErrors((prev) => ({ ...prev, pin: false }))
    setModalError('')
    setPincodeCity('')

    if (rawPin.length === 6) {
      setPincodeLoading(true)
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${rawPin}`)
        const data = await res.json()
        if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice?.length > 0) {
          const po = data[0].PostOffice[0]
          const areaName = po.Name || ''
          const city = po.District || po.Division || po.Block || ''
          const stateName = po.State || ''
          const countryName = po.Country || 'India'

          setNewAddr((prev) => ({
            ...prev,
            line2: prev.line2 || areaName,
            city: city || prev.city,
            state: stateName || prev.state,
            country: countryName,
          }))
          setAddrErrors((prev) => ({ ...prev, city: false, state: false }))
          setPincodeCity(city)
        }
      } catch (err) {
        console.error('Pincode lookup error:', err)
      } finally {
        setPincodeLoading(false)
      }
    }
  }

  const setC = (k) => (e) => {
    const val = e.target.value
    setContact((s) => ({ ...s, [k]: val }))
    if (user?.id) {
      dispatch({ type: 'user/update', id: user.id, patch: { [k]: val } })
    }
  }

  const setN = (k) => (e) => {
    setNewAddr((s) => ({ ...s, [k]: e.target.value }))
    setAddrErrors((prev) => ({ ...prev, [k]: false }))
    setModalError('')
  }

  const handleSetDefaultAddress = async (addrId) => {
    try {
      const json = await apiPost(`/customer/addresses/${addrId}/default`, {}, { auth: 'customer' })
      const list = json.data?.addresses ?? []
      dispatch({ type: 'user/update', id: user?.id, patch: { addresses: list, address: list[0] ?? null } })
      setSelectedId(addrId)
      notify('Default address updated.')
    } catch {
      const updated = addresses.map((a) => ({ ...a, isDefault: a.id === addrId }))
      dispatch({ type: 'user/update', id: user?.id, patch: { addresses: updated, address: updated.find((a) => a.isDefault) } })
      setSelectedId(addrId)
    }
  }

  const tryCoupon = async () => {
    setCouponError('')
    try {
      const json = await apiPost('/coupons/validate', { code: couponInput, subtotal })
      setApplied({ code: json.data.coupon.code, discount: json.data.discount })
      notify(json.message || 'Coupon applied successfully.')
    } catch (err) {
      setApplied(null)
      setCouponError(err.message || 'Invalid coupon code.')
    }
  }

  const handleRemoveCoupon = () => {
    setApplied(null)
    setCouponInput('')
    setCouponError('')
    if (typeof removeCartCoupon === 'function') {
      removeCartCoupon()
    }
    notify('Coupon removed.')
  }

  const saveAddress = async () => {
    const errors = {}
    if (!newAddr.name.trim()) errors.name = true
    const cleanPhone = newAddr.phone.replace(/\D/g, '')
    if (cleanPhone.length !== 10) errors.phone = true
    if (!newAddr.line1.trim()) errors.line1 = true
    if (!newAddr.city.trim()) errors.city = true
    if (!newAddr.state.trim()) errors.state = true
    if (!newAddr.pin.trim() || newAddr.pin.length !== 6) errors.pin = true

    if (Object.keys(errors).length > 0) {
      setAddrErrors(errors)
      if (errors.phone && Object.keys(errors).length === 1) {
        setModalError('Please enter a valid 10-digit mobile phone number.')
      } else {
        setModalError('Please complete all required fields marked with *.')
      }
      return
    }

    if (!user) {
      setModalError('No customer account available.')
      return
    }
    setBusy(true)
    setModalError('')
    setAddrErrors({})
    try {
      const payload = {
        label: newAddr.label.trim() || 'Home',
        name: newAddr.name.trim(),
        recipientName: newAddr.name.trim(),
        phone: newAddr.phone.trim(),
        recipientPhone: newAddr.phone.trim(),
        email: newAddr.email.trim(),
        line1: newAddr.line1.trim(),
        line2: newAddr.line2.trim(),
        city: newAddr.city.trim(),
        state: newAddr.state.trim(),
        pin: newAddr.pin.trim(),
        country: newAddr.country.trim() || 'India',
        isDefault: newAddr.isDefault || (editingAddrId ? false : addresses.length === 0),
      }

      let json
      if (editingAddrId) {
        json = await apiPut(`/customer/addresses/${editingAddrId}`, payload, { auth: 'customer' })
      } else {
        json = await apiPost('/customer/addresses', payload, { auth: 'customer' })
      }

      const rawList = json.data?.addresses ?? []
      let list = rawList
      if (!list.length) {
        if (editingAddrId) {
          list = addresses.map((a) => (a.id === editingAddrId ? { ...a, ...payload, id: editingAddrId } : a))
        } else {
          list = [...addresses, { ...payload, id: `addr-${Date.now()}` }]
        }
      }

      dispatch({
        type: 'user/update',
        id: user.id,
        patch: {
          phone: user.phone || newAddr.phone.trim(),
          name: user.name || newAddr.name.trim(),
          addresses: list,
          address: list.find((a) => a.isDefault) || list[0] || null,
        },
      })

      if (editingAddrId) {
        if (selectedId === editingAddrId) {
          setContact({
            name: newAddr.name.trim(),
            phone: newAddr.phone.trim(),
            email: newAddr.email.trim(),
          })
        }
      } else {
        const newest = list[list.length - 1]
        if (newest) {
          setSelectedId(newest.id)
          setContact({
            name: newest.name || contact.name,
            phone: newest.phone || contact.phone,
            email: newest.email || contact.email,
          })
        }
      }

      setAdding(false)
      setEditingAddrId(null)
      setNewAddr(blankAddress)
      setPincodeCity('')
      notify(json.message || (editingAddrId ? 'Address updated successfully.' : 'Address saved successfully.'))
    } catch (err) {
      setModalError(err.message || 'Unable to save address.')
    } finally {
      setBusy(false)
    }
  }

  const resolveAddress = () => {
    if (!selected) {
      return { error: 'Please choose or add a shipping address.' }
    }
    const recipientName = (selected.name || selected.recipientName || user?.name || '').trim()
    const recipientPhone = (selected.phone || selected.recipientPhone || user?.phone || savedPhone || '').trim()
    const recipientEmail = (selected.email || user?.email || '').trim()

    if (!recipientName) {
      return { error: 'Recipient name is missing on the selected address. Please add or edit your address.' }
    }
    if (!recipientPhone) {
      return { error: 'Recipient phone number is missing on the selected address. Please add or edit your address.' }
    }

    return {
      contact: {
        name: recipientName,
        email: recipientEmail,
        phone: recipientPhone,
      },
      address: {
        line1: selected.line1,
        line2: selected.line2 || '',
        city: selected.city,
        state: selected.state,
        pin: selected.pin,
        country: selected.country ?? 'India',
        label: selected.label,
      },
    }
  }

  const placeOrderApi = async ({ contact: c, address, method, payStatus, orderStatus, transactionId, note, isOnline = false }) => {
    setPaymentProcessing({ step: 'verifying', mode: isOnline ? 'online' : 'cod', txnId: transactionId })
    try {
      const orderLines = lines.map((l) => ({
        handle: l.handle,
        productHandle: l.handle,
        title: l.title,
        image: l.image,
        size: l.size,
        price: l.price,
        qty: l.qty,
        customNote: l.customNote,
      }))
      const json = await apiPost(
        '/orders',
        {
          lines: orderLines,
          contact: c,
          address,
          method,
          payStatus,
          orderStatus,
          transactionId,
          note,
          coupon: applied?.code ?? null,
        },
        { auth: 'customer' }
      )
      dispatch({ type: 'order/upsert', order: json.data.order, payment: json.data.payment })
      clear()
      closeCart()
      notify(json.message || 'Order placed successfully.')
      setPaymentProcessing({
        step: 'success',
        mode: isOnline ? 'online' : 'cod',
        txnId: transactionId,
        orderId: json.data.order.id,
      })

      // Fast animation transition so user gets immediate response
      setTimeout(() => {
        navigate(`/order-confirmed/${json.data.order.id}`, {
          state: { order: json.data.order, payment: json.data.payment, justPlaced: true },
        })
      }, 250)
    } catch (err) {
      setPaymentProcessing(null)
      throw err
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (busy || paymentProcessing) return
    setFormError('')
    const minOrder = minOrderAmount(state)
    if (minOrder > 0 && subtotal - (applied?.discount ?? 0) < minOrder) {
      setFormError(`Minimum order amount is ${inr(minOrder)}. Please add more items to your cart.`)
      return
    }
    const resolved = resolveAddress()
    if (resolved.error) {
      setFormError(resolved.error)
      return
    }

    if (payMode === 'cod') {
      setBusy(true)
      try {
        await placeOrderApi({
          ...resolved,
          method: 'COD',
          payStatus: 'Pending',
          orderStatus: 'Pending',
          transactionId: '—',
          note: 'Cash on delivery',
          isOnline: false,
        })
      } catch (err) {
        setFormError(err.message || 'Unable to place the order.')
      } finally {
        setBusy(false)
      }
      return
    }

    if (!hasRazorpayKey) {
      setFormError(
        'Add your Razorpay Key ID in .env as VITE_RAZORPAY_KEY_ID, then restart the dev server.'
      )
      return
    }

    setBusy(true)
    try {
      const rzp = await openRazorpayCheckout({
        amountInr: total,
        name: resolved.contact.name,
        email: resolved.contact.email,
        phone: resolved.contact.phone,
        description: 'EvaraNest order',
        orderId: 'EN-pending',
      })
      await placeOrderApi({
        ...resolved,
        method: 'Online',
        payStatus: 'Paid',
        orderStatus: 'Confirmed',
        transactionId: rzp.razorpay_payment_id || `TXN${Math.floor(Math.random() * 9e8 + 1e8)}`,
        note: `Paid online via Razorpay (${rzp.razorpay_payment_id || 'success'})`,
        isOnline: true,
      })
    } catch (err) {
      setPaymentProcessing(null)
      if (err?.message !== 'Payment cancelled') {
        setFormError(err?.message || 'Payment failed. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  const summaryRows = useMemo(
    () => [
      { label: 'Subtotal', value: inr(subtotal) },
      { label: 'Shipping', value: shipping === 0 ? 'Free' : inr(shipping) },
      ...(discount > 0 ? [{ label: `Discount (${applied.code})`, value: `−${inr(discount)}`, save: true }] : []),
    ],
    [subtotal, shipping, discount, applied]
  )

  if (!lines.length) {
    return <Navigate to="/" replace />
  }

  if (!user) {
    if (getCustomerToken()) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#4849E8] border-t-transparent" />
          <p className="text-[12.5px] font-medium text-gray-500">Preparing checkout…</p>
        </div>
      )
    }
    return <Navigate to="/login" replace state={{ from: { pathname: '/checkout' } }} />
  }

  return (
    <div className="bg-chalk/40">
      <Seo
        title="Secure Checkout — EvaraNest Luxury Candles"
        description="Secure checkout for your EvaraNest handmade candle order with Razorpay, UPI, cards, and COD."
        canonical="/checkout"
        noindex={true}
      />
      <div className="container py-4 sm:py-8 md:py-12 px-3 sm:px-4">
        <p className="text-[10.5px] sm:text-[11px] uppercase tracking-wider2 text-muted">
          <Link to="/" className="hover:text-ink">
            Home
          </Link>
          <span className="mx-1.5">/</span>
          Bag
          <span className="mx-1.5">/</span>
          <span className="text-ink">Checkout</span>
        </p>
        <h1 className="mt-1 font-display text-[24px] sm:text-[32px] md:text-[40px] uppercase leading-none">Checkout</h1>
        <p className="mt-1 text-[12px] sm:text-[13px] text-muted">
          Choose address and pay with Razorpay, or place a COD order.
        </p>

        <form onSubmit={onSubmit} className="mt-4 sm:mt-7 grid gap-4 sm:gap-6 lg:grid-cols-[3fr_2fr] xl:grid-cols-[60%_1fr]">
          <div className="space-y-4 sm:space-y-5 w-full">
            
            {/* Delivery Address Section (borderless on mobile, card on desktop) */}
            <section className="rounded-none sm:rounded-2xl border-0 sm:border sm:border-line bg-transparent sm:bg-white p-0 sm:p-5 sm:shadow-xs">
              <div className="flex items-center justify-between gap-2 pb-2 sm:border-b sm:border-line sm:pb-3">
                <div>
                  <h2 className="text-[12.5px] sm:text-[14px] font-bold uppercase tracking-wider text-ink">Delivery address</h2>
                  <p className="mt-0.5 text-[10.5px] sm:text-[11.5px] text-muted">Select an address or add a new delivery location</p>
                </div>
                <button
                  type="button"
                  onClick={openAddModal}
                  className="rounded-xl border border-forest/30 bg-forest/5 px-3 py-1.5 text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider text-forest transition-colors hover:bg-forest hover:text-lime cursor-pointer shrink-0 shadow-2xs"
                >
                  + Add new address
                </button>
              </div>

              {addresses.length === 0 ? (
                <div className="mt-3 sm:mt-4 rounded-2xl border border-dashed border-line bg-white sm:bg-chalk/50 p-6 text-center shadow-xs sm:shadow-none">
                  <p className="text-[12.5px] sm:text-[13px] text-muted font-medium">No saved addresses yet.</p>
                  <button
                    type="button"
                    onClick={openAddModal}
                    className="mt-3 inline-flex items-center gap-1 rounded-xl bg-forest px-4 py-2 text-[11.5px] font-bold uppercase tracking-wider text-lime hover:bg-forest/90 cursor-pointer shadow-xs"
                  >
                    + Add an address
                  </button>
                </div>
              ) : (
                <div className={`mt-3 sm:mt-4 space-y-2 sm:space-y-3 ${
                  addresses.length > 3
                    ? 'max-h-[380px] sm:max-h-none overflow-y-auto pr-1 sm:pr-0 overscroll-contain'
                    : ''
                }`}>
                  {addresses.map((a) => {
                    const isSelected = selectedId === a.id
                    const recipientName = a.name || a.recipientName || user?.name || 'Customer'
                    const recipientPhone = a.phone || a.recipientPhone || user?.phone || savedPhone || ''
                    const recipientEmail = a.email || user?.email || ''

                    return (
                      <div
                        key={a.id}
                        onClick={() => setSelectedId(a.id)}
                        className={`group relative flex cursor-pointer gap-2 sm:gap-3.5 rounded-xl sm:rounded-2xl border p-2.5 sm:p-4 bg-white transition-all shadow-xs ${
                          isSelected
                            ? 'border-forest bg-forest/[0.03] ring-1 ring-forest/25'
                            : 'border-line hover:border-ink/40'
                        }`}
                      >
                        <div className="pt-0.5 shrink-0">
                          <input
                            type="radio"
                            name="ship-address"
                            checked={isSelected}
                            onChange={() => setSelectedId(a.id)}
                            className="h-3.5 w-3.5 sm:h-4 sm:w-4 accent-forest cursor-pointer"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          {/* Label, Badges & 3-dots Menu */}
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <span className="text-[11.5px] sm:text-[13.5px] font-bold text-ink">{a.label || 'Home'}</span>
                              {a.isDefault ? (
                                <span className="rounded-full bg-forest/15 px-1.5 py-0.2 sm:px-2 sm:py-0.5 text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider text-forest">
                                  Default
                                </span>
                              ) : null}
                            </div>

                            {/* 3 Dots Menu */}
                            <div className="relative address-menu-container">
                              <button
                                type="button"
                                aria-label="Address options"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenMenuAddrId((cur) => (cur === a.id ? null : a.id))
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-graphite hover:bg-black/5 hover:text-ink focus:outline-none transition-colors"
                              >
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                </svg>
                              </button>

                              {openMenuAddrId === a.id && (
                                <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg ring-1 ring-black/5 animate-in fade-in">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setOpenMenuAddrId(null)
                                      openEditModal(a)
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] font-medium text-graphite hover:bg-chalk hover:text-ink transition-colors"
                                  >
                                    <svg className="h-3.5 w-3.5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    Edit
                                  </button>

                                  {!a.isDefault && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setOpenMenuAddrId(null)
                                        handleSetDefaultAddress(a.id)
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] font-medium text-graphite hover:bg-chalk hover:text-ink transition-colors"
                                    >
                                      <svg className="h-3.5 w-3.5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                      Set as default
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setOpenMenuAddrId(null)
                                      handleDeleteAddress(a.id)
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] font-medium text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    <svg className="h-3.5 w-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6" />
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Recipient Details for this address */}
                          <div className="mt-0.5 sm:mt-1.5 flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-0.5 text-[10.5px] sm:text-[12.5px]">
                            <span className="font-semibold text-ink">
                              👤 {recipientName}
                            </span>
                            {recipientPhone ? (
                              <span className="font-medium text-graphite">
                                📞 {recipientPhone}
                              </span>
                            ) : null}
                            {recipientEmail ? (
                              <span className="text-muted text-[10px] sm:text-[11.5px]">
                                ✉️ {recipientEmail}
                              </span>
                            ) : null}
                          </div>

                          {/* Address details */}
                          <p className="mt-0.5 sm:mt-1 text-[10.5px] sm:text-[12.5px] leading-snug sm:leading-relaxed text-graphite">
                            {formatAddress(a)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-line bg-white p-3.5 sm:p-5 shadow-xs">
              <h2 className="label-caps">Order summary</h2>
              <ul className="mt-4 space-y-3 sm:max-h-56 sm:overflow-y-auto">
                {lines.map((l) => (
                  <li key={l.key} className="flex gap-3">
                    <div className="h-16 w-12 shrink-0 overflow-hidden bg-chalk">
                      <Img src={l.image} alt="" width={96} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[12px] leading-snug">{l.title}</p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {l.size} · Qty {l.qty}
                      </p>
                      {l.customNote && (
                        <p className="mt-1 line-clamp-2 rounded bg-forest/5 px-1.5 py-0.5 text-[10px] text-forest">
                          <span className="font-semibold">Note:</span> {l.customNote}
                        </p>
                      )}
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <span className="text-[11px] text-muted font-normal">
                          {inr(l.price)} × {l.qty}
                        </span>
                        <p className="text-[12px] font-semibold text-ink">
                          {inr(l.price * l.qty)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-4 border-t border-line pt-4">
                {applied ? (
                  <div className="flex items-center justify-between gap-2.5 rounded-xl border border-forest/30 bg-forest/5 px-3 py-1.5 sm:px-3.5 sm:py-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[11.5px] sm:text-[12px] uppercase tracking-wider text-forest">
                          {applied.code}
                        </span>
                        <span className="text-[10px] sm:text-[11px] font-medium text-save">
                          applied
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10.5px] sm:text-[11px] text-muted">
                        You save <span className="font-semibold text-save">{inr(applied.discount)}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="shrink-0 rounded-lg border border-red-500/40 bg-white px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider text-red-600 hover:border-red-600 hover:bg-red-50 transition-colors cursor-pointer shadow-2xs"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value)
                          setCouponError('')
                        }}
                        placeholder="Coupon code"
                        className={`min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-[12px] outline-none transition-colors ${
                          couponError ? 'border-red-500 ring-1 ring-red-500/30' : 'border-line focus:border-forest'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={tryCoupon}
                        className="shrink-0 rounded-lg border border-ink px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider2 hover:bg-ink hover:text-white cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                    {couponError && <p className="mt-1.5 text-[11px] text-sale">{couponError}</p>}
                    <p className="mt-1.5 text-[10.5px] text-muted">Try GLOW10 or FLAT200</p>
                  </div>
                )}
              </div>

              <dl className="mt-4 space-y-2 text-[12px]">
                {summaryRows.map((r) => (
                  <div key={r.label} className="flex justify-between gap-3">
                    <dt className="text-muted">{r.label}</dt>
                    <dd className={r.save ? 'font-semibold text-save' : ''}>{r.value}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-3 border-t border-line pt-2 text-[14px] font-semibold">
                  <dt>Total payable</dt>
                  <dd>{inr(total)}</dd>
                </div>
              </dl>

              {selected && (
                <p className="mt-3 rounded-lg bg-chalk px-3 py-2 text-[11px] text-muted">
                  Deliver to <span className="font-semibold text-ink">{selected.label}</span> •{' '}
                  {selected.city}
                </p>
              )}

              {formError && (
                <p className="mt-3 rounded-lg bg-[#FDE8E8] px-3 py-2 text-[12px] text-sale" role="alert">
                  {formError}
                </p>
              )}

              <div className="mt-4 border-t border-line pt-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="label-caps">Payment method</h3>
                  <p className="text-[14px] font-semibold leading-none">{inr(total)}</p>
                </div>
                <div className="mt-3 grid gap-2">
                  <label
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-3 text-[12px] font-medium transition-colors ${
                      payMode === 'online' ? 'border-forest bg-forest/5' : 'border-line hover:border-ink/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pay-mode"
                      checked={payMode === 'online'}
                      onChange={() => setPayMode('online')}
                      className="accent-forest"
                    />
                    Pay online (Razorpay)
                  </label>
                  <label
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-3 text-[12px] font-medium transition-colors ${
                      payMode === 'cod' ? 'border-forest bg-forest/5' : 'border-line hover:border-ink/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pay-mode"
                      checked={payMode === 'cod'}
                      onChange={() => setPayMode('cod')}
                      className="accent-forest"
                    />
                    Cash on delivery
                  </label>
                </div>
                {payMode === 'cod' && (
                  <p className="mt-2 text-[11px] text-muted">
                    Pay with cash or UPI when your order arrives.
                  </p>
                )}
                {payMode === 'online' && !hasRazorpayKey && (
                  <p className="mt-2 rounded-lg bg-[#FFF4E0] px-3 py-2 text-[11px] text-[#B26A00]">
                    Set <code className="font-mono">VITE_RAZORPAY_KEY_ID</code> in{' '}
                    <code className="font-mono">.env</code> and restart Vite.
                  </p>
                )}
              </div>

              <button type="submit" disabled={busy} className="btn-ink mt-3 w-full disabled:opacity-50">
                {busy
                  ? payMode === 'cod'
                    ? 'Placing order...'
                    : 'Opening Razorpay...'
                  : payMode === 'cod'
                    ? `Place COD order • ${inr(total)}`
                    : `Pay now • ${inr(total)}`}
              </button>
            </div>
          </aside>
        </form>
      </div>

      <Modal
        open={adding}
        onClose={closeAddModal}
        title={editingAddrId ? 'Edit delivery address' : addresses.length === 0 ? 'Add your delivery address' : 'Add new address'}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          
          {/* Address Label Dropdown */}
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider text-muted">
              Address Label
            </span>
            <select
              value={newAddr.label}
              onChange={setN('label')}
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[13px] font-medium text-ink outline-none focus:border-forest"
            >
              <option value="Home">Home</option>
              <option value="Work / Office">Work / Office</option>
              <option value="Studio">Studio</option>
              <option value="Other">Other</option>
            </select>
          </label>

          {/* Recipient Full Name */}
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider text-muted">
              Recipient full name <span className="text-red-500">*</span>
            </span>
            <input
              required
              value={newAddr.name}
              onChange={setN('name')}
              placeholder="e.g. Roshan Kumar"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-[13px] outline-none transition-colors ${
                addrErrors.name ? 'border-red-500 ring-1 ring-red-500/30' : 'border-line focus:border-forest'
              }`}
            />
          </label>

          {/* Mobile Phone Number */}
          <label className="block">
            <span className="mb-1 block text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider text-muted">
              Mobile phone number <span className="text-red-500">*</span>
            </span>
            <input
              required
              type="tel"
              maxLength={10}
              value={newAddr.phone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                setNewAddr((s) => ({ ...s, phone: digits }))
                setAddrErrors((prev) => ({ ...prev, phone: false }))
                setModalError('')
              }}
              placeholder="10-digit mobile number"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-[13px] outline-none transition-colors ${
                addrErrors.phone ? 'border-red-500 ring-1 ring-red-500/30' : 'border-line focus:border-forest'
              }`}
            />
          </label>

          {/* Email Address */}
          <label className="block">
            <span className="mb-1 block text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider text-muted">
              Email address (optional)
            </span>
            <input
              type="email"
              value={newAddr.email}
              onChange={setN('email')}
              placeholder="Email address for tracking"
              className="w-full rounded-xl border border-line px-3.5 py-2.5 text-[13px] outline-none focus:border-forest"
            />
          </label>

          {/* Pincode with Auto-lookup */}
          <label className="block">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider text-muted">
                PIN Code <span className="text-red-500">*</span>
                {pincodeCity && (
                  <span className="ml-1.5 font-semibold text-emerald-600 normal-case tracking-normal">
                    ({pincodeCity})
                  </span>
                )}
              </span>
              {pincodeLoading && (
                <span className="text-[11px] font-semibold text-forest flex items-center gap-1">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v2.5A5.5 5.5 0 006.5 12H4z" />
                  </svg>
                  Fetching...
                </span>
              )}
            </div>
            <input
              required
              maxLength={6}
              value={newAddr.pin}
              onChange={(e) => handlePincodeChange(e.target.value)}
              placeholder="6-digit PIN code"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold outline-none transition-colors ${
                addrErrors.pin ? 'border-red-500 ring-1 ring-red-500/30' : 'border-line focus:border-forest'
              }`}
            />
          </label>

          {/* Country */}
          <label className="block">
            <span className="mb-1 block text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider text-muted">
              Country
            </span>
            <input
              value={newAddr.country}
              onChange={setN('country')}
              placeholder="India"
              className="w-full rounded-xl border border-line px-3.5 py-2.5 text-[13px] outline-none focus:border-forest"
            />
          </label>

          {/* Address Line 1 */}
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider text-muted">
              Address Line 1 (Flat, House no., Building, Apartment) <span className="text-red-500">*</span>
            </span>
            <input
              required
              value={newAddr.line1}
              onChange={setN('line1')}
              placeholder="House/Flat no., Building name, Street"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-[13px] outline-none transition-colors ${
                addrErrors.line1 ? 'border-red-500 ring-1 ring-red-500/30' : 'border-line focus:border-forest'
              }`}
            />
          </label>

          {/* Address Line 2 */}
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider text-muted">
              Address Line 2 (Area, Colony, Landmark - Optional)
            </span>
            <input
              value={newAddr.line2}
              onChange={setN('line2')}
              placeholder="Area, Colony, Sector, Landmark"
              className="w-full rounded-xl border border-line px-3.5 py-2.5 text-[13px] outline-none focus:border-forest"
            />
          </label>

          {/* City */}
          <label className="block">
            <span className="mb-1 block text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider text-muted">
              City / District <span className="text-red-500">*</span>
            </span>
            <input
              required
              value={newAddr.city}
              onChange={setN('city')}
              placeholder="City"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-[13px] outline-none transition-colors ${
                addrErrors.city ? 'border-red-500 ring-1 ring-red-500/30' : 'border-line focus:border-forest'
              }`}
            />
          </label>

          {/* State */}
          <label className="block">
            <span className="mb-1 block text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider text-muted">
              State <span className="text-red-500">*</span>
            </span>
            <input
              required
              value={newAddr.state}
              onChange={setN('state')}
              placeholder="State"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-[13px] outline-none transition-colors ${
                addrErrors.state ? 'border-red-500 ring-1 ring-red-500/30' : 'border-line focus:border-forest'
              }`}
            />
          </label>

          {/* Make Default Checkbox */}
          <div className="sm:col-span-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-[12.5px] font-medium text-ink">
              <input
                type="checkbox"
                checked={newAddr.isDefault}
                onChange={(e) => setNewAddr((prev) => ({ ...prev, isDefault: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-forest focus:ring-forest accent-forest cursor-pointer"
              />
              <span>Set as default delivery address</span>
            </label>
          </div>

        </div>

        {modalError && (
          <p className="mt-3 rounded-lg bg-[#FDE8E8] px-3 py-2 text-[12px] text-sale" role="alert">
            {modalError}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-line/70 pt-3">
          <button
            type="button"
            onClick={closeAddModal}
            className="rounded-xl border border-line px-4 py-2 text-[12.5px] font-semibold text-graphite hover:border-ink hover:text-ink cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveAddress}
            disabled={busy}
            className="rounded-xl bg-forest px-5 py-2 text-[12.5px] font-semibold text-white hover:bg-ink cursor-pointer transition-colors disabled:opacity-50"
          >
            {busy ? 'Saving...' : editingAddrId ? 'Update address' : 'Save address'}
          </button>
        </div>
      </Modal>

      {/* Full-Screen Payment Processing Overlay Modal */}
      {paymentProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 sm:p-7 text-center shadow-2xl border border-line animate-in zoom-in-95 duration-200">
            {paymentProcessing.step === 'verifying' ? (
              <div className="space-y-4">
                {/* Animated Spinner with Pulsing Shield Badge */}
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-forest/20 border-t-forest animate-spin" />
                  <div className="h-12 w-12 rounded-full bg-forest/10 flex items-center justify-center text-forest animate-pulse">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                </div>

                <div>
                  <h3 className="text-[17px] sm:text-[18px] font-extrabold text-ink tracking-tight">
                    {paymentProcessing.mode === 'cod' ? 'Placing your order...' : 'Verifying payment...'}
                  </h3>
                  <p className="mt-1.5 text-[12px] sm:text-[12.5px] text-graphite leading-snug">
                    {paymentProcessing.mode === 'cod'
                      ? 'Please wait while we confirm your Cash on Delivery order.'
                      : 'Payment completed! Confirming your transaction with our server.'}
                  </p>
                </div>

                {/* Progress Verification Steps */}
                <div className="rounded-2xl bg-[#F8F9FC] border border-line/80 p-3 text-left space-y-2 text-[11.5px]">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                    <svg className="h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{paymentProcessing.mode === 'cod' ? 'Order validated' : 'Payment authorized'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-forest font-semibold">
                    <div className="h-3.5 w-3.5 shrink-0 border-2 border-forest border-t-transparent rounded-full animate-spin" />
                    <span>Verifying transaction details...</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted font-medium">
                    <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-line bg-chalk" />
                    <span>Generating invoice & confirmation</span>
                  </div>
                </div>

                <p className="text-[10.5px] text-muted font-medium">
                  🔒 256-bit SSL Encrypted • Please do not close or refresh this tab.
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-in zoom-in-95 duration-200">
                {/* Success Checkmark */}
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100/80 text-emerald-600 shadow-inner">
                  <div className="h-14 w-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md animate-bounce">
                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </div>

                <div>
                  <h3 className="text-[18px] sm:text-[19px] font-extrabold text-ink tracking-tight">
                    {paymentProcessing.mode === 'cod' ? 'Order Placed!' : 'Payment Verified!'}
                  </h3>
                  <p className="mt-1 text-[12.5px] text-graphite">
                    Redirecting to your order confirmation page...
                  </p>
                </div>

                <div className="mx-auto h-1.5 w-32 overflow-hidden rounded-full bg-line">
                  <div className="h-full bg-emerald-500 animate-[pulse_1s_infinite] w-full" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
