import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import Img from '../components/Img'
import { apiGet } from '../lib/api.js'
import { useStore, inr, longDate } from '../store/StoreContext.jsx'
import { orderById, paymentOfOrder, userById } from '../store/selectors.js'

export default function OrderConfirmed() {
  const { id } = useParams()
  const location = useLocation()
  const { state } = useStore()
  const user = userById(state, state.currentUserId)

  const [order, setOrder] = useState(() => {
    if (location.state?.order) return location.state.order
    if (id) return orderById(state, id) ?? null
    return null
  })
  const [payment, setPayment] = useState(() => {
    if (location.state?.payment) return location.state.payment
    if (id) return paymentOfOrder(state, id) ?? null
    return null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (order) return
    if (!id) return

    let cancelled = false
    setLoading(true)
    setError('')

    ;(async () => {
      try {
        const json = await apiGet(`/orders/track?q=${encodeURIComponent(id)}`)
        if (cancelled) return
        if (json.data?.order) {
          setOrder(json.data.order)
          setPayment(json.data.payment ?? null)
        } else {
          setError('Order details could not be found.')
        }
      } catch (err) {
        if (!cancelled) {
          const localOrd = orderById(state, id)
          if (localOrd) {
            setOrder(localOrd)
            setPayment(paymentOfOrder(state, id) ?? null)
          } else {
            setError(err.message || 'Order not found.')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id, order, state])

  const copyId = async () => {
    if (!order) return
    try {
      await navigator.clipboard.writeText(order.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-[#F8F9FC] py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-3 border-[#5851DB] border-t-transparent" />
          <p className="mt-4 text-[13px] text-gray-500 font-medium">Loading your order confirmation...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-[60vh] bg-[#F8F9FC] py-16">
        <div className="max-w-md mx-auto text-center px-4">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="mt-3 text-[18px] font-bold text-gray-900">Order Not Found</h1>
          <p className="mt-1.5 text-[12.5px] text-gray-500">
            {error || 'We could not locate this order. Please verify your order number.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <Link to="/account" className="rounded-xl bg-[#5851DB] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#483fc9]">
              My Orders
            </Link>
            <Link to="/track" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-[12px] font-semibold text-gray-800 hover:bg-gray-50">
              Track Order
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const lines = order.lines ?? []
  const addr = order.address ?? {}
  const isCod = payment?.method === 'COD' || order.paymentMethod === 'COD'
  const payStatus = payment?.status ?? (isCod ? 'Pending' : 'Paid')

  return (
    <div className="min-h-[80vh] bg-[#F8F9FC] py-3 sm:py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Breadcrumb (Desktop / Tablet) */}
        <div className="hidden sm:flex items-center gap-1.5 text-[12px] text-gray-500 mb-4">
          <Link to="/" className="hover:text-gray-900 transition-colors">Home</Link>
          <span className="text-gray-400">›</span>
          <Link to="/checkout" className="hover:text-gray-900 transition-colors">Checkout</Link>
          <span className="text-gray-400">›</span>
          <span className="font-semibold text-gray-900">Order Confirmed</span>
        </div>

        {/* ========================================================================= */}
        {/* MOBILE VIEW (matches exact reference screenshot media_1788942855541.jpg) */}
        {/* ========================================================================= */}
        <div className="block sm:hidden space-y-3.5 pb-8">
          
          {/* 1. Header Celebration Card */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 text-center shadow-xs">
            {/* Green Checkmark Circle with Confetti Rays */}
            <div className="relative inline-flex items-center justify-center mb-3">
              {/* Confetti rays */}
              <div className="absolute -top-2 left-0 h-2 w-0.5 bg-amber-400 rounded-full rotate-[-30deg]" />
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 h-2.5 w-0.5 bg-indigo-400 rounded-full" />
              <div className="absolute -top-2 right-0 h-2 w-0.5 bg-indigo-500 rounded-full rotate-[30deg]" />
              <div className="absolute top-1/2 -left-3 -translate-y-1/2 h-2 w-0.5 bg-indigo-400 rounded-full rotate-[-80deg]" />
              <div className="absolute top-1/2 -right-3 -translate-y-1/2 h-2 w-0.5 bg-amber-400 rounded-full rotate-[80deg]" />

              <div className="h-16 w-16 rounded-full bg-[#D1FADF]/70 flex items-center justify-center">
                <div className="h-11 w-11 rounded-full bg-[#12B76A] flex items-center justify-center text-white shadow-xs">
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
            </div>

            <h1 className="text-[20px] font-black text-[#0B1527] tracking-tight">
              Thank you for your order!
            </h1>
            <p className="mt-1 text-[12.5px] text-[#475467] font-medium leading-snug">
              Order <strong className="text-[#101828] font-bold">{order.id}</strong> is confirmed and being prepared with care.
            </p>
          </div>

          {/* 2. "We'll notify you at every step!" Banner */}
          <div className="rounded-2xl bg-[#ECEBFF]/70 p-3.5 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#5249EC] text-white flex items-center justify-center shrink-0 shadow-2xs">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" stroke="none">
                  <path d="M1 3h14v11H1z" />
                  <path d="M15 7h4l3 3.5V14h-7V7z" />
                  <circle cx="5.5" cy="16.5" r="2.5" />
                  <circle cx="17.5" cy="16.5" r="2.5" />
                </svg>
              </div>
              <div className="text-left">
                <h4 className="text-[12.5px] font-bold text-[#101828]">We’ll notify you at every step!</h4>
                <p className="text-[11px] text-[#667085] leading-tight mt-0.5">
                  Updates will be sent to<br />
                  {order.email || user?.email || 'roshan.office75@gmail.com'}
                </p>
              </div>
            </div>
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#5249EC] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>

          {/* 3. 4-Item Vertical Info List Card (Compact sizes) */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-3 shadow-xs divide-y divide-gray-100">
            {/* Row 1: ORDER ID */}
            <div className="flex items-center justify-between py-2 first:pt-0.5">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-[#F4F0FF] text-[#5851DB] flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-gray-400 leading-tight">Order ID</span>
                  <span className="font-bold text-[12.5px] text-gray-900 leading-tight">{order.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={copyId}
                className="rounded-xl bg-[#F0EBFA] hover:bg-[#E9D7FE] px-3 py-0.5 text-[11px] font-bold text-[#5851DB] transition-colors cursor-pointer"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Row 2: ORDER DATE */}
            <div className="flex items-center gap-2.5 py-2">
              <div className="h-8 w-8 rounded-xl bg-[#F4F0FF] text-[#5851DB] flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
              </div>
              <div>
                <span className="block text-[10px] font-semibold text-gray-400 leading-tight">Order Date</span>
                <span className="font-bold text-[12.5px] text-gray-900 leading-tight">{longDate(order.placedAt || Date.now())}</span>
              </div>
            </div>

            {/* Row 3: PAYMENT METHOD */}
            <div className="flex items-center gap-2.5 py-2">
              <div className="h-8 w-8 rounded-xl bg-[#F4F0FF] text-[#5851DB] flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <line x1="2" x2="22" y1="10" y2="10" />
                </svg>
              </div>
              <div>
                <span className="block text-[10px] font-semibold text-gray-400 leading-tight">Payment Method</span>
                <span className="font-bold text-[12.5px] text-gray-900 leading-tight">{isCod ? 'Cash on Delivery' : payment?.method || 'Prepaid'}</span>
              </div>
            </div>

            {/* Row 4: TOTAL AMOUNT */}
            <div className="flex items-center gap-2.5 py-2 last:pb-0.5">
              <div className="h-8 w-8 rounded-xl bg-[#F4F0FF] text-[#5851DB] flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
                </svg>
              </div>
              <div>
                <span className="block text-[10px] font-semibold text-gray-400 leading-tight">Total Amount</span>
                <span className="font-extrabold text-[13.5px] text-gray-900 leading-tight">{inr(order.total)}</span>
              </div>
            </div>
          </div>

          {/* 4. Action Buttons (Compact height) */}
          <div className="space-y-2 pt-0.5">
            <Link
              to={`/track/${order.id}`}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-[12.5px] font-bold text-white transition-all shadow-xs active:scale-[0.99]"
            >
              <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', minWidth: '16px' }} fill="currentColor">
                <path d="M1 4h13v10H1z" />
                <path d="M14 7h4l3 3.5V14h-7V7z" />
                <circle cx="5" cy="17" r="2.5" />
                <circle cx="17" cy="17" r="2.5" />
              </svg>
              <span>Track Order →</span>
            </Link>

            <div className="grid grid-cols-2 gap-2">
              <Link
                to={`/invoice/${order.id}?download=true`}
                target="_blank"
                rel="noreferrer"
                className="w-full h-10 flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[12px] font-bold text-gray-700 transition-all shadow-2xs active:scale-[0.99]"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#4F46E5]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" x2="8" y1="13" y2="13" />
                  <line x1="16" x2="8" y1="17" y2="17" />
                </svg>
                <span>Tax Invoice</span>
              </Link>

              <Link
                to="/collections/new-arrivals"
                className="w-full h-10 flex items-center justify-center gap-1.5 rounded-xl border border-[#4F46E5]/30 bg-white hover:bg-[#F9F8FE] text-[12px] font-bold text-[#4F46E5] transition-all shadow-2xs active:scale-[0.99]"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#4F46E5]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                <span>Shop More</span>
              </Link>
            </div>
          </div>

          {/* 5. Bottom Brand Atmosphere Banner Card (Exact 1:1 image from reference) */}
          <div className="relative rounded-2xl shadow-xs overflow-hidden">
            <img
              src="/images/mobile-bottom-banner-exact.png"
              alt="More than candles, we deliver moments."
              className="w-full h-auto object-cover rounded-2xl"
            />
          </div>

        </div>

        {/* ========================================================================= */}
        {/* DESKTOP VIEW */}
        {/* ========================================================================= */}
        <div className="hidden sm:block">
          
          {/* Hero Celebration Banner */}
          <div className="relative rounded-2xl border border-gray-200/80 bg-gradient-to-r from-white via-white via-60% to-[#ECEBFF]/50 p-4.5 sm:p-5 md:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
              
              {/* Left Section: Checkmark + Order Info */}
              <div className="flex items-start sm:items-center gap-4.5 max-w-xl">
                {/* Green Circle Checkmark with concentric outer pale green ring */}
                <div className="relative flex items-center justify-center shrink-0">
                  <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-[#D1FADF]/60 flex items-center justify-center">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-[#12B76A] flex items-center justify-center text-white shadow-xs">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  {/* Order Confirmed Badge */}
                  <span className="inline-flex items-center rounded-full bg-[#ECFDF3] px-2.5 py-0.5 text-[11px] font-semibold text-[#027A48]">
                    Order Confirmed
                  </span>

                  <h1 className="mt-1 text-[22px] sm:text-[25px] font-extrabold text-[#0B1527] tracking-tight leading-tight">
                    Thank you for your order!
                  </h1>
                  <p className="mt-0.5 text-[12.5px] sm:text-[13px] text-[#475467] font-medium">
                    Order <strong className="text-[#101828] font-bold">{order.id}</strong> is confirmed and being prepared with care.
                  </p>
                </div>
              </div>

              {/* Middle Center: Atmospheric Candle Graphic */}
              <div className="hidden md:flex items-center justify-center shrink-0 pointer-events-none self-stretch my-auto">
                <img
                  src="/images/order-confirmed-center.png"
                  alt="Candles - Good Scents Brighter Days"
                  className="h-24 sm:h-28 object-contain"
                />
              </div>

              {/* Right Section: Quote + Action Buttons */}
              <div className="flex flex-col items-start lg:items-end justify-center gap-3 shrink-0">
                <div className="text-left lg:text-right">
                  <p className="text-[12px] sm:text-[12.5px] text-[#475467] font-serif font-normal">
                    “More than candles,
                    <br className="hidden lg:inline" /> we deliver moments.”
                  </p>
                  <div className="w-10 h-[2px] bg-[#5851DB]/40 mt-1 hidden lg:block ml-auto rounded-full"></div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Link
                    to={`/invoice/${order.id}?download=true`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-250 bg-white hover:bg-gray-50 px-3.5 py-2 text-[12px] sm:text-[12.5px] font-bold text-gray-700 transition-colors shadow-2xs"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#5851DB]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" x2="8" y1="13" y2="13" />
                      <line x1="16" x2="8" y1="17" y2="17" />
                    </svg>
                    Tax Invoice ↗
                  </Link>

                  <Link
                    to={`/track/${order.id}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#5851DB] hover:bg-[#483fc9] px-4 py-2 text-[12px] sm:text-[12.5px] font-bold text-white transition-colors shadow-xs"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" stroke="none">
                      <path d="M1 3h14v11H1z" />
                      <path d="M15 7h4l3 3.5V14h-7V7z" />
                      <circle cx="5.5" cy="16.5" r="2.5" />
                      <circle cx="17.5" cy="16.5" r="2.5" />
                    </svg>
                    Track Order →
                  </Link>

                  <Link
                    to="/collections/new-arrivals"
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2 text-[12px] sm:text-[12.5px] font-bold text-[#344054] transition-colors shadow-2xs"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#5851DB]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                      <path d="M3 6h18" />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                    Continue Shopping
                  </Link>
                </div>
              </div>

            </div>
          </div>

          {/* Four Horizontal Info Tiles Row */}
          <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            
            {/* Tile 1: ORDER ID */}
            <div className="flex items-center gap-3.5 pt-2 md:pt-0 md:pl-2 first:pt-0 first:pl-0">
              <div className="h-10 w-10 rounded-xl bg-[#F4F0FF] text-[#5851DB] flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div>
                <span className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400">ORDER ID</span>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-extrabold text-[14px] text-gray-900">{order.id}</span>
                  <button
                    type="button"
                    onClick={copyId}
                    className="rounded-full bg-[#F0EBFA] hover:bg-[#E9D7FE] px-2.5 py-0.5 text-[11px] font-semibold text-[#5851DB] transition-colors cursor-pointer"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Tile 2: ORDER DATE */}
            <div className="flex items-center gap-3.5 pt-2 md:pt-0 md:pl-4">
              <div className="h-10 w-10 rounded-xl bg-[#F4F0FF] text-[#5851DB] flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
              </div>
              <div>
                <span className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400">ORDER DATE</span>
                <p className="mt-0.5 text-[13px] font-bold text-gray-900">
                  {longDate(order.placedAt || Date.now())}
                </p>
              </div>
            </div>

            {/* Tile 3: PAYMENT METHOD */}
            <div className="flex items-center gap-3.5 pt-2 md:pt-0 md:pl-4">
              <div className="h-10 w-10 rounded-xl bg-[#F4F0FF] text-[#5851DB] flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <line x1="2" x2="22" y1="10" y2="10" />
                </svg>
              </div>
              <div>
                <span className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400">PAYMENT METHOD</span>
                <p className="mt-0.5 text-[13px] font-bold text-gray-900">
                  {isCod ? 'Cash on Delivery' : payment?.method || 'Prepaid (Online)'}
                </p>
              </div>
            </div>

            {/* Tile 4: TOTAL AMOUNT */}
            <div className="flex items-center gap-3.5 pt-2 md:pt-0 md:pl-4">
              <div className="h-10 w-10 rounded-xl bg-[#F4F0FF] text-[#5851DB] flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
                </svg>
              </div>
              <div>
                <span className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400">TOTAL AMOUNT</span>
                <p className="mt-0.5 text-[18px] font-extrabold text-[#5851DB]">
                  {inr(order.total)}
                </p>
              </div>
            </div>

          </div>

          {/* 2-Column Desktop Grid */}
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr] items-start">
            
            {/* Left Column: Items Ordered */}
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
                <h2 className="text-[14.5px] font-bold text-gray-900">
                  Items Ordered ({lines.length})
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0EBFA] px-3 py-1 text-[11px] font-semibold text-[#5851DB]">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V17a1 1 0 0 1-2 0v-.07A7.003 7.003 0 0 1 5.07 11H5a1 1 0 0 1 0-2h.07A7.003 7.003 0 0 1 11 3.07V3a1 1 0 0 1 2 0v.07A7.003 7.003 0 0 1 18.93 9H19a1 1 0 0 1 0 2h-.07A7.003 7.003 0 0 1 13 16.93z" />
                  </svg>
                  Small batch pours
                </span>
              </div>
              
              <ul className="divide-y divide-gray-100">
                {lines.map((l, idx) => (
                  <li key={l.variantId || l.handle || idx} className="flex items-center justify-between gap-4 py-4 first:pt-4 last:pb-1">
                    <div className="flex items-center gap-3.5">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-50 border border-gray-100">
                        <Img src={l.image} alt={l.title} width={100} className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <h3 className="text-[13.5px] font-bold text-gray-900">{l.title}</h3>
                        <p className="text-[11.5px] text-gray-500 mt-0.5 font-medium">
                          Size: {l.size || 'Bubblegum'} &nbsp;•&nbsp; Color: {l.color || 'Pastel'} &nbsp;•&nbsp; Qty: {l.qty}
                        </p>
                      </div>
                    </div>
                    <p className="text-[14.5px] font-bold text-gray-900 shrink-0">{inr(l.price * l.qty)}</p>
                  </li>
                ))}
              </ul>
            </section>

            {/* Right Column: Payment Summary */}
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-[#5851DB]">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" x2="8" y1="13" y2="13" />
                  <line x1="16" x2="8" y1="17" y2="17" />
                </svg>
                <h2 className="text-[14.5px] font-bold text-gray-900">
                  Payment Summary
                </h2>
              </div>

              <div className="mt-4 space-y-2.5 text-[13px]">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-gray-900">{inr(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className="font-bold text-gray-900">
                    {order.shipping ? inr(order.shipping) : <span className="text-emerald-600 font-bold">Free</span>}
                  </span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount {order.coupon ? `(${order.coupon})` : ''}</span>
                    <span>−{inr(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-gray-100 pt-3 text-[14.5px] font-bold text-gray-900">
                  <span>Total Amount</span>
                  <span className="text-[19px] font-extrabold text-[#5851DB]">{inr(order.total)}</span>
                </div>
              </div>

              {/* Payment Method Callout */}
              <div className={`mt-4 rounded-xl p-3.5 flex items-center justify-between border ${
                payStatus === 'Paid'
                  ? 'bg-emerald-50/70 border-emerald-200/80'
                  : 'bg-[#FFF9F2] border-[#FEEAD1]'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                    payStatus === 'Paid'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-[#FEF0C7] text-[#B54708]'
                  }`}>
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="12" x="2" y="6" rx="2" />
                      <circle cx="12" cy="12" r="2" />
                      <path d="M6 12h.01M18 12h.01" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[12.5px] font-bold text-gray-900">{isCod ? 'Cash on Delivery' : payment?.method || 'Prepaid'}</p>
                    <p className={`text-[11px] ${payStatus === 'Paid' ? 'text-emerald-700 font-medium' : 'text-gray-500'}`}>
                      {isCod ? 'Pay when your order arrives' : 'Paid online successfully'}
                    </p>
                  </div>
                </div>
                <span className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold border ${
                  payStatus === 'Paid'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-[#FEF6EE] border-[#FECDCA] text-[#B54708]'
                }`}>
                  {payStatus}
                </span>
              </div>
            </section>

          </div>

          {/* Bottom Two-Column Row (Shipping Address & Need Help?) */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Shipping Address */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-[#F4F0FF] text-[#5851DB] flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-bold text-gray-900">Shipping Address</h3>
                  <Link
                    to="/account"
                    className="rounded-lg bg-[#F8F9FC] border border-gray-200 text-[#5851DB] hover:bg-[#F0EBFA] text-[11px] px-2.5 py-0.5 font-semibold transition-colors"
                  >
                    Change
                  </Link>
                </div>
                <p className="text-[12.5px] font-bold text-gray-900 mt-1">
                  {order.customerName || addr.name || user?.name || 'Customer'}
                </p>
                <p className="text-[11.5px] text-gray-500 leading-relaxed mt-0.5">
                  {[addr.line1, addr.line2, `${addr.city || ''}, ${addr.state || ''} - ${addr.pin || ''}, ${addr.country || 'India'}`].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>

            {/* Need Help? */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3.5">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-[#F4F0FF] text-[#5851DB] flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-gray-900">Need Help?</h3>
                  <p className="text-[11.5px] text-gray-500 leading-snug mt-0.5 max-w-xs">
                    We’re here for you. If you have any questions about your order, feel free to reach out.
                  </p>
                </div>
              </div>

              <a
                href="https://wa.me/918565895895"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-[#5851DB] bg-white text-[#5851DB] hover:bg-[#F0EBFA] text-[11.5px] px-3.5 py-1.5 font-bold cursor-pointer transition-colors shadow-2xs shrink-0 whitespace-nowrap"
              >
                Contact Support
              </a>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
