import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Breadcrumbs from '../components/Breadcrumbs'
import Img from '../components/Img'
import Seo from '../components/Seo'
import { apiGet, apiPost } from '../lib/api.js'
import { useStore, inr, shortDate } from '../store/StoreContext.jsx'
import { orderByQuery, paymentOfOrder, shipmentOfOrder, ordersOfUser, siteSettings, userById, adminUser } from '../store/selectors.js'

function StageIcon({ type, className = 'w-3.5 h-3.5' }) {
  if (type === 'bag') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    )
  }
  if (type === 'check') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  }
  if (type === 'box') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      </svg>
    )
  }
  if (type === 'truck') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    )
  }
  if (type === 'van') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
        <path d="M15 18H9" />
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.24-4.05a1 1 0 0 0-.78-.38H14v8h1" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

export default function Track() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state } = useStore()
  const site = siteSettings(state)
  const isLoggedIn = Boolean(state.currentUserId)
  const currentUser = userById(state, state.currentUserId)
  const admin = adminUser(state)

  const [inputQuery, setInputQuery] = useState(id ?? '')
  const [activeQuery, setActiveQuery] = useState(id ?? '')
  const [order, setOrder] = useState(null)
  const [shipment, setShipment] = useState(null)
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // OTP Verification state for guest / non-owner tracking
  const [verifiedOrderIds, setVerifiedOrderIds] = useState([])

  const [otpSent, setOtpSent] = useState(false)
  const [enteredOtp, setEnteredOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [otpNotice, setOtpNotice] = useState('')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)

  // Timers: 5-minute expiry (300s) & 30s resend cooldown
  const [expirySeconds, setExpirySeconds] = useState(300)
  const [resendCooldown, setResendCooldown] = useState(30)

  // Direct session verification flag
  const [sessionVerified, setSessionVerified] = useState(false)

  const userOrders = isLoggedIn ? ordersOfUser(state, state.currentUserId) : []

  // Ownership check: Admin, or logged in user owns this order
  const isOwner = Boolean(
    admin ||
    (currentUser && order && (
      order.userId === currentUser.id ||
      order.userId === state.currentUserId ||
      userOrders.some((o) => o.id === order.id) ||
      (order.email && currentUser.email && order.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase()) ||
      (order.customerEmail && currentUser.email && order.customerEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase()) ||
      (order.address?.email && currentUser.email && order.address.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase()) ||
      (order.phone && currentUser.phone && String(order.phone).replace(/\D/g, '') && String(order.phone).replace(/\D/g, '') === String(currentUser.phone).replace(/\D/g, ''))
    ))
  )

  const isVerified = Boolean(
    isOwner ||
    sessionVerified ||
    (order && verifiedOrderIds.map((x) => String(x).toUpperCase()).includes(String(order.id).toUpperCase())) ||
    (activeQuery && verifiedOrderIds.map((x) => String(x).toUpperCase()).includes(String(activeQuery).toUpperCase())) ||
    (id && verifiedOrderIds.map((x) => String(x).toUpperCase()).includes(String(id).toUpperCase()))
  )

  // Timer interval for expiry and resend countdown
  useEffect(() => {
    if (!order || isVerified) return
    const interval = setInterval(() => {
      setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0))
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [order?.id, isVerified])

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const handleSendOtp = async () => {
    if (!order) return
    setIsSendingOtp(true)
    setOtpError('')
    setOtpNotice('')

    const targetId = order.id || activeQuery || id
    const targetEmail = order.email || order.address?.email || order.customerEmail || ''

    try {
      const res = await apiPost('/orders/otp/request', { orderId: targetId, email: targetEmail })
      setOtpSent(true)
      setExpirySeconds(300) // 5 minutes
      setOtpNotice('A 4-digit verification code has been sent to your email.')
      if (res.data?.demoCode) {
        console.log(`%c[EvaraNest OTP] Security code for ${targetEmail || targetId}: ${res.data.demoCode}`, 'color: #4f46e5; font-weight: bold; font-size: 13px;')
      }
    } catch (err) {
      setOtpError(err?.message || 'Unable to send OTP. Please check your order details.')
    } finally {
      setIsSendingOtp(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault()
    setOtpError('')
    const clean = String(enteredOtp).trim().replace(/\D/g, '')
    if (clean.length !== 4) {
      setOtpError('Please enter a 4-digit verification code.')
      return
    }

    if (expirySeconds <= 0) {
      setOtpError('OTP has expired. Please click "Resend Code".')
      return
    }

    setIsVerifyingOtp(true)
    const targetId = order?.id || activeQuery || id
    const targetEmail = order?.email || order?.address?.email || order?.customerEmail || ''

    try {
      const res = await apiPost('/orders/otp/verify', { orderId: targetId, email: targetEmail, code: clean })
      if (res.data?.order) {
        setOrder(res.data.order)
        if (res.data.shipment) setShipment(res.data.shipment)
        if (res.data.payment) setPayment(res.data.payment)
      }
      const orderKey = String(targetId).toUpperCase()
      const updated = [...new Set([...verifiedOrderIds, orderKey])].filter(Boolean)
      setVerifiedOrderIds(updated)
      setSessionVerified(true)
      setOtpSent(false)
      setOtpNotice('')
    } catch (err) {
      setOtpError(err?.message || 'Incorrect or expired OTP.')
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  const maskEmail = (email) => {
    if (!email || !email.includes('@')) return '******@***.com'
    const [name, domain] = email.split('@')
    const visible = name.slice(0, 2)
    return `${visible}***@${domain}`
  }

  const maskPhone = (phone) => {
    if (!phone) return '+91 ****** ****'
    const clean = String(phone).replace(/\D/g, '')
    if (clean.length >= 10) {
      return `+91 ****** ${clean.slice(-4)}`
    }
    return '+91 ****** ****'
  }

  // Automatically request OTP from database when unverified order is opened
  const requestedRef = useRef(false)
  useEffect(() => {
    if (order && !isVerified && !requestedRef.current) {
      requestedRef.current = true
      handleSendOtp()
    } else if (isVerified) {
      setOtpSent(false)
      setEnteredOtp('')
      setOtpError('')
      setOtpNotice('')
    }
  }, [order?.id, isVerified])

  // Sync with URL params
  useEffect(() => {
    if (id) {
      setInputQuery(id)
      setActiveQuery(id)
    } else {
      setActiveQuery('')
    }
  }, [id])

  // Lookup order when activeQuery changes
  useEffect(() => {
    const q = activeQuery.trim()
    if (!q) {
      setOrder(null)
      setShipment(null)
      setPayment(null)
      setNotFound(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setNotFound(false)

    // Try local store first
    const localOrder = orderByQuery(state, q)
    if (localOrder) {
      setOrder(localOrder)
      setShipment(shipmentOfOrder(state, localOrder.id) ?? null)
      setPayment(paymentOfOrder(state, localOrder.id) ?? null)
      setLoading(false)
      return
    }

    // Fetch from API
    ;(async () => {
      try {
        const json = await apiGet(`/orders/track?q=${encodeURIComponent(q)}`)
        if (cancelled) return
        if (json.data?.order) {
          setOrder(json.data.order)
          setShipment(json.data.shipment ?? null)
          setPayment(json.data.payment ?? null)
          setNotFound(false)
        } else {
          setOrder(null)
          setShipment(null)
          setPayment(null)
          setNotFound(true)
        }
      } catch {
        if (!cancelled) {
          setOrder(null)
          setShipment(null)
          setPayment(null)
          setNotFound(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [activeQuery, state])

  const onTrack = (e) => {
    e.preventDefault()
    const clean = inputQuery.trim()
    if (clean) {
      navigate(`/track/${clean.toUpperCase()}`)
    }
  }

  const handlePrintInvoice = () => {
    window.print()
  }

  // Determine stage levels (0 to 5)
  const getStageIndex = (status) => {
    if (status === 'Delivered') return 5
    if (status === 'Out for Delivery') return 4
    if (status === 'Shipped') return 3
    if (status === 'Packed') return 2
    if (status === 'Confirmed') return 1
    return 0 // Pending / Placed
  }

  const currentStage = order ? getStageIndex(order.status) : 0

  // Estimated delivery date (Prioritize admin-configured deliveryDate if set)
  const placedTime = order?.placedAt ? new Date(order.placedAt) : new Date()
  let estDate = new Date(placedTime.getTime() + 3 * 24 * 60 * 60 * 1000)
  if (order?.deliveryDate) {
    const rawDateStr = String(order.deliveryDate).trim()
    const parsed = new Date(rawDateStr.includes('T') ? rawDateStr : rawDateStr + 'T00:00:00')
    if (!isNaN(parsed.getTime())) {
      estDate = parsed
    }
  }
  const estDateFormatted = estDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  // Origin & Destination Calculation
  const addr = order?.address ?? {}
  const originHub = {
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    pincode: '226010',
    hubName: 'EvaraNest Fulfillment Hub, Gomti Nagar, Lucknow',
  }

  const destCity = addr.city || order?.city || 'Destination City'
  const destState = addr.state || order?.state || ''
  const rawPincode = addr.zip || addr.postalCode || addr.pincode || addr.pin || order?.pincode || order?.postalCode || ''
  const destPincode = rawPincode && !String(rawPincode).toLowerCase().includes('pincode') ? String(rawPincode).trim() : ''
  const destFormatted = destPincode ? `${destCity} (${destPincode})` : destCity

  // Determine current hub based on status/stage
  let currentHub = 'EvaraNest Central Hub, Lucknow (226010)'
  let nextUpdateText = 'Order Processing & Quality Check'
  let transitLocationName = 'Lucknow'
  let transitDetail = 'Fulfillment Center, Lucknow (226010)'

  if (currentStage === 1) {
    currentHub = 'EvaraNest Central Hub, Lucknow (226010)'
    nextUpdateText = 'Packing & Label Generation'
    transitLocationName = 'Lucknow Hub'
    transitDetail = 'Order Confirmed & Allocated at Lucknow (226010)'
  } else if (currentStage === 2) {
    currentHub = 'Packaging Facility, Lucknow (226010)'
    nextUpdateText = `Handover to ${shipment?.carrier || 'Courier Partner'}`
    transitLocationName = 'Lucknow Atelier'
    transitDetail = 'Package Packed & Ready for Dispatch'
  } else if (currentStage === 3) {
    currentHub = shipment?.carrier ? `${shipment.carrier} Transit Hub` : 'Courier Transit Hub'
    nextUpdateText = `Dispatched towards ${destCity} Hub`
    transitLocationName = `${destCity} Transit Line`
    transitDetail = `In transit from Lucknow (226010) to ${destCity}`
  } else if (currentStage === 4) {
    currentHub = `${destCity} Delivery Hub (${destPincode})`
    nextUpdateText = 'Out for Delivery to Customer Address'
    transitLocationName = `${destCity} Hub`
    transitDetail = `Arrived at Local Hub (${destPincode})`
  } else if (currentStage >= 5) {
    currentHub = `Delivered at ${destCity} (${destPincode})`
    nextUpdateText = 'Delivery Completed'
    transitLocationName = destCity
    transitDetail = `Delivered to recipient at ${destCity}`
  }

  const whatsappUrl = site.whatsapp
    ? `${site.whatsapp}${order ? `&text=Hi%20EvaraNest%2C%20I%20need%20help%20with%20my%20Order%20%23${order.id}` : ''}`
    : `https://wa.me/7046735536?text=Hi%20EvaraNest%2C%20I%20need%20help%20with%20my%20order.`

  const milestones = [
    { label: 'Order Placed', time: order ? shortDate(order.placedAt) : 'Placed', icon: 'bag' },
    { label: 'Confirmed', time: order ? 'Confirmed' : '', icon: 'check' },
    { label: 'Packed', time: order?.status !== 'Pending' ? 'Packed' : 'Pending', icon: 'box' },
    { label: 'Shipped', time: shipment ? shortDate(shipment.shippedAt) : (currentStage >= 3 ? 'Shipped' : 'Pending'), icon: 'truck' },
    { label: 'Out for Delivery', time: currentStage >= 4 ? 'Out for delivery' : 'Upcoming', icon: 'van' },
    { label: 'Expected Delivery', time: estDateFormatted, icon: 'home' },
  ]

  return (
    <div className="relative min-h-[85vh] bg-[#F8F9FD] overflow-hidden">
      <Seo
        title={order ? `Track Order #${order.id}` : 'Track Your Order Status'}
        description="Track your EvaraNest candle order live status, shipment carrier details, and estimated delivery."
        canonical={order ? `/track/${order.id}` : '/track'}
        noindex={true}
      />
      
      {/* Standard Breadcrumbs (Hidden on mobile for clean native tracking UI) */}
      <div className="hidden sm:block">
        <Breadcrumbs
          items={[{ label: 'Home', href: '/' }]}
          current={order ? `Order #${order.id}` : 'Track Order'}
        />
      </div>

      {/* Background Decorative Soft Graphic Silhouettes */}
      <div className="pointer-events-none absolute -left-20 bottom-6 opacity-20 sm:opacity-35 select-none">
        <svg width="180" height="180" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="70" width="70" height="70" rx="8" fill="#E2E8F0" />
          <rect x="70" y="40" width="80" height="80" rx="8" fill="#CBD5E1" />
          <path d="M40 70 L40 140" stroke="#94A3B8" strokeWidth="2" strokeDasharray="3 3" />
        </svg>
      </div>
      <div className="pointer-events-none absolute -right-16 bottom-4 opacity-20 sm:opacity-35 select-none">
        <svg width="190" height="190" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="80" y="50" width="90" height="90" rx="10" fill="#E2E8F0" />
          <rect x="30" y="90" width="80" height="80" rx="8" fill="#CBD5E1" />
          <path d="M100 50 L100 140" stroke="#94A3B8" strokeWidth="2" strokeDasharray="3 3" />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-2.5 sm:px-6 relative z-10 py-1 sm:py-4">

        {/* ---------------------------------------------------- */}
        {/* CASE A: No Order Active OR Search Mode (Reference UI) */}
        {/* ---------------------------------------------------- */}
        {!order && !loading && (
          <div className="py-2 sm:py-4">
            
            {/* Center 3D Box Illustration & Headline */}
            <div className="text-center pt-2 sm:pt-4">
              <div className="relative mx-auto mb-3 h-16 w-20 flex items-center justify-center">
                {/* 3D Isometric Cardboard Box */}
                <svg width="62" height="62" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md transition-transform duration-300 hover:scale-105">
                  {/* Box Top */}
                  <path d="M50 16 L82 32 L50 48 L18 32 Z" fill="#E6AF6B" />
                  <path d="M50 16 L50 48" stroke="#CF9653" strokeWidth="1.5" />
                  {/* Box Tape Top */}
                  <path d="M44 19 L56 25 L56 45 L44 39 Z" fill="#F6DCA8" opacity="0.95" />
                  {/* Box Left Side */}
                  <path d="M18 32 L50 48 L50 80 L18 64 Z" fill="#D69B56" />
                  {/* Box Right Side */}
                  <path d="M50 48 L82 32 L82 64 L50 80 Z" fill="#BA7E3C" />
                  {/* Box Tape Side */}
                  <path d="M44 48 L50 51 L50 80 L44 77 Z" fill="#E6AF6B" opacity="0.95" />
                </svg>
                {/* Magnifying Glass Overlay */}
                <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md ring-2 ring-[#4F46E5]/20">
                  <svg className="h-4.5 w-4.5 text-[#4F46E5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
              </div>

              <h1 className="text-[24px] sm:text-[30px] font-black tracking-tight text-[#0B1527] font-sans">
                Track Your Order
              </h1>
              <p className="mt-1 text-[13px] sm:text-[14px] font-medium text-[#64748B]">
                Enter your order number to get real-time updates
              </p>
            </div>

            {/* Search Bar: Stacked on Mobile (input top, button below), Pill on Desktop */}
            <div className="mt-5 max-w-xl mx-auto px-2">
              <form onSubmit={onTrack}>
                <div className={`flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-0 sm:rounded-2xl sm:bg-white sm:border sm:shadow-[0_2px_8px_rgba(0,0,0,0.04)] sm:p-1.5 transition-all ${
                  notFound
                    ? 'sm:border-red-500 sm:ring-1 sm:ring-red-500/30'
                    : 'sm:border-gray-200/90 sm:focus-within:border-[#4F46E5] sm:focus-within:ring-3 sm:focus-within:ring-[#4F46E5]/10'
                }`}>
                  <div className={`rounded-xl sm:rounded-none bg-white sm:bg-transparent border sm:border-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:shadow-none px-3.5 sm:px-4 py-2.5 sm:py-0 flex-1 transition-all ${
                    notFound
                      ? 'border-red-500 ring-1 ring-red-500/30 sm:border-0 sm:ring-0'
                      : 'border-gray-200/90 focus-within:border-[#4F46E5] focus-within:ring-2 sm:focus-within:ring-0 focus-within:ring-[#4F46E5]/10'
                  }`}>
                    <input
                      type="text"
                      value={inputQuery}
                      onChange={(e) => {
                        setInputQuery(e.target.value)
                        if (notFound) setNotFound(false)
                      }}
                      placeholder="Enter Order Number (e.g. SN98476321)"
                      className="w-full bg-transparent py-1 sm:py-2.5 text-[13.5px] sm:text-[14px] font-medium text-gray-900 placeholder-gray-400 outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !inputQuery.trim()}
                    className="w-full sm:w-auto shrink-0 rounded-xl bg-[#5249EC] hover:bg-[#4339DF] active:scale-[0.98] text-white font-bold px-5 sm:px-7 py-2.5 sm:py-3 text-[13.5px] shadow-xs transition-all disabled:opacity-40 cursor-pointer text-center"
                  >
                    Track Order
                  </button>
                </div>
              </form>

              <p className="mt-2.5 text-center text-[11.5px] sm:text-[12.5px] text-[#64748B] font-medium">
                You can find your order number in the confirmation email or SMS.
              </p>
            </div>

            {/* Error message if order was not found */}
            {notFound && (
              <div className="mt-4 max-w-md mx-auto rounded-2xl border border-red-200 bg-red-50/80 p-3.5 text-center shadow-xs">
                <p className="text-[13px] font-bold text-red-700">
                  No order found matching &ldquo;{activeQuery}&rdquo;.
                </p>
                <p className="mt-0.5 text-[11.5px] text-red-600">
                  Please verify your Order ID or contact support.
                </p>
              </div>
            )}

            {/* Where to find your order number Card */}
            <div className="mt-6 max-w-2xl mx-auto rounded-2xl border border-gray-200/80 bg-white p-4.5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <h2 className="text-[14px] sm:text-[15px] font-bold text-[#0B1527] mb-3.5">
                Where to find your order number?
              </h2>

              <div className="grid sm:grid-cols-2 gap-3.5">
                {/* Card 1: Email */}
                <div className="flex items-center gap-3.5 rounded-xl border border-gray-100 bg-[#F8F9FD] p-3.5 hover:bg-[#F3F4FB] transition-colors">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-[#EEF0FD] text-[#5249EC] flex items-center justify-center">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[13px] sm:text-[13.5px] font-bold text-[#0B1527]">
                      Order Confirmation Email
                    </h3>
                    <p className="mt-0.5 text-[11.5px] text-[#64748B] leading-tight">
                      Check your email for the order number (e.g. SN98476321)
                    </p>
                  </div>
                </div>

                {/* Card 2: SMS */}
                <div className="flex items-center gap-3.5 rounded-xl border border-gray-100 bg-[#F8F9FD] p-3.5 hover:bg-[#F3F4FB] transition-colors">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-[#EEF0FD] text-[#5249EC] flex items-center justify-center">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[13px] sm:text-[13.5px] font-bold text-[#0B1527]">
                      SMS Notification
                    </h3>
                    <p className="mt-0.5 text-[11.5px] text-[#64748B] leading-tight">
                      Your order number is also shared via SMS
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Trust Badges */}
            <div className="mt-6 max-w-5xl mx-auto border-t border-line/70 pt-4 pb-2 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              
              {/* Badge 1: Secure & Safe */}
              <div className="flex items-center gap-2.5 sm:gap-3 p-1">
                <div className="grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-xl bg-brandLight text-brand border border-brand/15 shadow-2xs">
                  <svg className="h-4.5 w-4.5 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h4 className="text-[12.5px] sm:text-[13.5px] font-bold text-ink leading-tight">Secure &amp; Safe</h4>
                  <p className="text-[10.5px] sm:text-[11.5px] text-muted leading-tight">Your data is protected</p>
                </div>
              </div>

              {/* Badge 2: 24/7 Support */}
              <div className="flex items-center gap-2.5 sm:gap-3 p-1">
                <div className="grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-xl bg-brandLight text-brand border border-brand/15 shadow-2xs">
                  <svg className="h-4.5 w-4.5 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h4 className="text-[12.5px] sm:text-[13.5px] font-bold text-ink leading-tight">24/7 Support</h4>
                  <p className="text-[10.5px] sm:text-[11.5px] text-muted leading-tight">We&rsquo;re always here to help</p>
                </div>
              </div>

              {/* Badge 3: Easy Returns */}
              <div className="flex items-center gap-2.5 sm:gap-3 p-1">
                <div className="grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-xl bg-brandLight text-brand border border-brand/15 shadow-2xs">
                  <svg className="h-4.5 w-4.5 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h4 className="text-[12.5px] sm:text-[13.5px] font-bold text-ink leading-tight">Easy Returns</h4>
                  <p className="text-[10.5px] sm:text-[11.5px] text-muted leading-tight">Hassle-free process</p>
                </div>
              </div>

              {/* Badge 4: Trusted by Millions */}
              <div className="flex items-center gap-2.5 sm:gap-3 p-1">
                <div className="grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-xl bg-brandLight text-brand border border-brand/15 shadow-2xs">
                  <svg className="h-4.5 w-4.5 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h4 className="text-[12.5px] sm:text-[13.5px] font-bold text-ink leading-tight">Trusted by Millions</h4>
                  <p className="text-[10.5px] sm:text-[11.5px] text-muted leading-tight">Shop with confidence</p>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="my-8 rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center shadow-xs">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-[#2563EB] border-t-transparent" />
            <p className="mt-2 text-[12.5px] font-semibold text-[#0F172A]">Fetching live tracking details...</p>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* CASE B1: Email OTP Verification Gate (Clean & Professional Direct on Page) */}
        {/* ---------------------------------------------------- */}
        {!loading && order && !isVerified && (
          <div className="py-6 sm:py-10 max-w-sm mx-auto text-center px-4">
            
            {/* Professional Shield / Lock Icon */}
            <div className="mx-auto mb-3.5 h-12 w-12 rounded-2xl bg-gradient-to-b from-[#EEF0FD] to-[#E2E6FB] text-[#4F46E5] flex items-center justify-center shadow-xs border border-indigo-100/80">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            {/* Title & Short Subtitle */}
            <h2 className="text-[19px] sm:text-[21px] font-black text-[#0B1527] tracking-tight">
              Enter Verification Code
            </h2>
            <p className="mt-1 text-[12.5px] text-[#64748B]">
              Code sent to <span className="font-semibold text-gray-900">{maskEmail(order.email || order.address?.email)}</span>
            </p>

            {/* Expiry Timer Pill */}
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold border transition-all shadow-2xs"
              style={{
                backgroundColor: expirySeconds > 60 ? '#F8F9FD' : expirySeconds > 0 ? '#FFFBEB' : '#FEF2F2',
                borderColor: expirySeconds > 60 ? '#E2E8F0' : expirySeconds > 0 ? '#FDE68A' : '#FECACA',
                color: expirySeconds > 60 ? '#475467' : expirySeconds > 0 ? '#B45309' : '#B91C1C',
              }}
            >
              {expirySeconds > 0 ? (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Expires in</span>
                  <span className="font-mono font-black text-[12.5px]">{formatTimer(expirySeconds)}</span>
                </>
              ) : (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>OTP Expired — Please Resend</span>
                </>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleVerifyOtp} className="mt-5 space-y-3.5">
              <div>
                <input
                  type="text"
                  maxLength={4}
                  value={enteredOtp}
                  disabled={expirySeconds <= 0 || isVerifyingOtp}
                  onChange={(e) => {
                    setOtpError('')
                    setEnteredOtp(e.target.value.replace(/\D/g, ''))
                  }}
                  placeholder="• • • •"
                  className={`w-44 mx-auto text-center tracking-[0.45em] text-[22px] font-mono font-black bg-white rounded-2xl py-2 px-3 outline-none transition-all shadow-2xs disabled:bg-gray-100 disabled:opacity-60 ${
                    otpError
                      ? 'border border-red-500 ring-1 ring-red-500/30'
                      : 'border border-gray-300 focus:border-[#4F46E5] focus:ring-3 focus:ring-[#4F46E5]/15'
                  }`}
                  autoFocus
                />
                {otpError && (
                  <p className="mt-2 text-[11.5px] text-red-600 font-bold leading-tight">{otpError}</p>
                )}
                {otpNotice && !otpError && (
                  <p className="mt-2 text-[11.5px] text-emerald-600 font-semibold leading-tight">{otpNotice}</p>
                )}
              </div>

              {/* Compact, Professional Action Button */}
              <div>
                <button
                  type="submit"
                  disabled={enteredOtp.length !== 4 || expirySeconds <= 0 || isVerifyingOtp}
                  className="w-full max-w-[230px] mx-auto py-2.5 px-5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[13px] font-bold shadow-xs active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {isVerifyingOtp ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify &amp; Track Order</span>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Actions (Resend active only when current OTP expires) */}
            <div className="mt-4 flex items-center justify-center gap-3 text-[12px]">
              {expirySeconds > 0 ? (
                <span className="text-gray-400 font-medium cursor-not-allowed text-[11.5px]">
                  Resend in {formatTimer(expirySeconds)}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp}
                  className="text-[#4F46E5] hover:underline font-bold cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                >
                  {isSendingOtp ? 'Sending...' : '🔄 Resend Code'}
                </button>
              )}
              <span className="text-gray-300">•</span>
              <button
                type="button"
                onClick={() => {
                  setInputQuery('')
                  setActiveQuery('')
                  navigate('/track')
                }}
                className="text-gray-500 hover:text-gray-900 font-medium cursor-pointer"
              >
                Track Another Order
              </button>
            </div>

          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* CASE B2: Order Owner / Verified Full Tracking Dashboard */}
        {/* ---------------------------------------------------- */}
        {!loading && order && isVerified && (
          <div>
            
            {/* ========================================================================= */}
            {/* MOBILE VIEW (Vertical Timeline Stepper on Mobile View) */}
            {/* ========================================================================= */}
            <div className="block md:hidden space-y-2.5 pb-4 pt-0">

              {/* 1. Arriving Soon! Status Card with 3D Isometric Box & Vertical Stepper */}
              <div className="relative rounded-2xl border border-gray-100 bg-white p-3.5 shadow-xs overflow-hidden">
                <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="flex-1 min-w-0 pr-1">
                    <span className="inline-block rounded-full bg-[#ECFDF3] px-2.5 py-0.5 text-[10px] font-bold text-[#027A48]">
                      {order.status || 'Order Confirmed'}
                    </span>
                    <h2 className="mt-1 text-[18px] font-black text-[#0B1527] tracking-tight leading-tight">
                      {currentStage >= 5 ? 'Delivered!' : currentStage >= 3 ? 'On the way!' : 'Arriving Soon!'}
                    </h2>
                    <p className="mt-1 text-[11px] text-[#475467] font-medium leading-tight">
                      Estimated Delivery: <strong className="text-gray-900 font-bold">{estDateFormatted}</strong>
                    </p>
                  </div>

                  {/* 3D Isometric Delivery Box with Confetti & Heart */}
                  <div className="relative shrink-0 flex items-center justify-center" style={{ width: '56px', height: '56px', minWidth: '56px' }}>
                    <div className="rounded-full bg-[#ECEBFF] flex items-center justify-center relative shadow-inner" style={{ width: '48px', height: '48px' }}>
                      <svg viewBox="0 0 100 100" style={{ width: '26px', height: '26px' }} fill="none" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="50,15 85,32 50,49 15,32" fill="#E8B574" />
                        <polygon points="44,18 56,24 56,46 44,40" fill="#FCE7BA" opacity="0.95" />
                        <polygon points="15,32 50,49 50,85 15,68" fill="#D89D52" />
                        <polygon points="50,49 85,32 85,68 50,85" fill="#BF813B" />
                        <polygon points="44,49 50,52 50,85 44,82" fill="#E8B574" opacity="0.95" />
                      </svg>
                      <div className="absolute -top-0.5 -right-0.5 rounded-full bg-white shadow-xs flex items-center justify-center" style={{ width: '15px', height: '15px' }}>
                        <span className="text-[8px] leading-none">❤️</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vertical Stepper on Mobile (Flex column: icons perfectly centered on connecting line) */}
                <div className="mt-3.5 pt-1">
                  <h3 className="text-[11.5px] font-bold text-gray-900 mb-3.5 flex items-center gap-1.5">
                    <span>📦 Delivery Progress Timeline</span>
                  </h3>
                  <div className="space-y-0 px-1">
                    {milestones.map((m, idx) => {
                      const isDone = idx < currentStage
                      const isCurrent = idx === currentStage
                      const isLast = idx === milestones.length - 1

                      return (
                        <div key={m.label} className="flex items-start gap-3">
                          {/* Column 1: Node Icon + Vertical Connecting Line */}
                          <div className="flex flex-col items-center shrink-0 w-7">
                            {/* Circle Node */}
                            <div
                              className={`h-7 w-7 rounded-full shrink-0 flex items-center justify-center transition-all shadow-xs z-10 ${
                                isDone
                                  ? 'bg-[#12B76A] text-white shadow-xs'
                                  : isCurrent
                                  ? 'bg-[#12B76A] text-white ring-4 ring-[#12B76A]/20 scale-105 shadow-sm'
                                  : 'bg-white border-2 border-gray-200 text-gray-400'
                              }`}
                            >
                              {isDone ? (
                                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                <StageIcon type={m.icon} className="w-3.5 h-3.5" />
                              )}
                            </div>

                            {/* Vertical Line to Next Milestone */}
                            {!isLast && (
                              <div
                                className={`w-[2px] min-h-[26px] flex-1 my-0.5 rounded-full ${
                                  idx < currentStage ? 'bg-[#12B76A]' : 'bg-gray-200'
                                }`}
                              />
                            )}
                          </div>

                          {/* Column 2: Content (Title, Badge, Timestamp) */}
                          <div className={`min-w-0 flex-1 ${!isLast ? 'pb-3.5' : 'pb-1'} pt-0.5`}>
                            <div className="flex items-center gap-2">
                              <h4 className={`text-[12px] font-bold leading-tight ${isDone || isCurrent ? 'text-gray-900' : 'text-gray-400'}`}>
                                {m.label}
                              </h4>
                              {isCurrent && (
                                <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5] uppercase tracking-wider">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-500 mt-0.5 font-medium">
                              {m.time || (idx === 0 ? shortDate(order.placedAt) : 'Pending')}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

              </div>

              {/* 2. Notification Banner: We'll notify you at every step! */}
              <div className="rounded-2xl bg-[#ECEBFF] p-2.5 px-3 flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="rounded-full bg-[#DDE2FF] text-[#5249EC] flex items-center justify-center shrink-0 shadow-2xs" style={{ width: '32px', height: '32px', minWidth: '32px' }}>
                    <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px' }} fill="currentColor">
                      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                    </svg>
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <h4 className="text-[11.5px] font-bold text-[#0B1527] leading-tight">We’ll notify you at every step!</h4>
                    <p className="text-[10px] text-[#475467] leading-tight mt-0.5 break-all">
                      Updates will be sent to {order.email || user?.email || 'roshan.office75@gmail.com'}
                    </p>
                  </div>
                </div>
                <svg viewBox="0 0 24 24" style={{ width: '13px', height: '13px', minWidth: '13px' }} className="text-[#5249EC] shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>

              {/* 3. Items Ordered Card */}
              <div className="rounded-2xl border border-gray-100 bg-white p-2.5 shadow-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                  <h3 className="text-[12px] font-bold text-[#0B1527]">
                    Items Ordered ({(order.lines || []).length})
                  </h3>
                </div>

                <ul className="divide-y divide-gray-100">
                  {(order.lines || []).map((l, idx) => (
                    <li key={l.variantId || l.handle || idx} className="flex items-center justify-between gap-2 py-2 first:pt-1.5 last:pb-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="shrink-0 overflow-hidden rounded-xl bg-gray-50 border border-gray-100 shadow-2xs" style={{ width: '44px', height: '44px' }}>
                          <Img src={l.image} alt={l.title} width={60} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[11.5px] font-bold text-[#0B1527] leading-tight truncate">{l.title}</h4>
                          <p className="text-[10px] text-[#64748B] mt-0.5 truncate">
                            Size: {l.size || 'Bubblegum'} &nbsp;|&nbsp; Color: {l.color || 'Pastel'}
                          </p>
                          <p className="text-[10px] text-[#64748B]">
                            Qty: {l.qty}
                          </p>
                        </div>
                      </div>
                      <p className="text-[12.5px] font-bold text-[#0B1527] shrink-0">{inr(l.price * l.qty)}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 4. Payment Summary Card */}
              <div className="rounded-2xl border border-gray-100 bg-white p-2.5 shadow-xs">
                <h3 className="text-[12px] font-bold text-[#0B1527] pb-1">
                  Payment Summary
                </h3>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between text-[#475467]">
                    <span>Subtotal</span>
                    <span className="font-semibold text-[#0B1527]">{inr(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#475467]">
                    <span>Shipping</span>
                    <span className="font-semibold text-[#0B1527]">
                      {order.shipping ? inr(order.shipping) : <span className="text-emerald-600 font-bold">Free</span>}
                    </span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Discount {order.coupon ? `(${order.coupon})` : ''}</span>
                      <span>−{inr(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1 text-[12px] font-bold text-[#0B1527]">
                    <span>Total Amount</span>
                    <span className="text-[14.5px] font-black text-[#5249EC]">{inr(order.total)}</span>
                  </div>
                </div>

                {/* Payment Status Banner */}
                {(() => {
                  const isCod = payment?.method === 'COD' || order.paymentMethod === 'COD'
                  const payMethodName = isCod ? 'Cash on Delivery' : (payment?.method || 'Prepaid')
                  const isPaid = (payment?.status === 'Paid') || (!isCod && payment?.status !== 'Failed')
                  const payStatusText = payment?.status || (isCod ? 'Pending' : 'Paid')

                  return (
                    <div className={`mt-1.5 rounded-xl p-2 flex items-center justify-between border ${
                      isPaid
                        ? 'bg-emerald-50/70 border-emerald-200/80'
                        : 'bg-[#FFF9EE] border-[#FEE4B2]/70'
                    }`}>
                      <div className="flex items-center gap-2">
                        <div className={`rounded-lg flex items-center justify-center shrink-0 ${
                          isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-[#FEF0C7] text-[#B54708]'
                        }`} style={{ width: '24px', height: '24px', minWidth: '24px' }}>
                          <svg viewBox="0 0 24 24" style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="20" height="12" x="2" y="6" rx="2" />
                            <circle cx="12" cy="12" r="2" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[10.5px] font-bold text-[#101828]">{payMethodName}</p>
                          <p className={`text-[9px] ${isPaid ? 'text-emerald-700 font-medium' : 'text-[#64748B]'}`}>
                            {isCod ? 'Pay when your order arrives' : 'Paid online successfully'}
                          </p>
                        </div>
                      </div>
                      <span className={`rounded-lg px-2 py-0.5 text-[9.5px] font-bold ${
                        isPaid
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-[#FEF0C7] text-[#B54708]'
                      }`}>
                        {payStatusText}
                      </span>
                    </div>
                  )
                })()}
              </div>

              {/* 5. Bottom Action Button: Continue Shopping -> */}
              <div className="pt-1 pb-1">
                <Link
                  to="/collections/all-products"
                  className="w-full h-11 rounded-2xl bg-[#2E28B6] hover:bg-[#252099] active:scale-[0.99] text-white text-[13.5px] font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', minWidth: '18px' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <path d="M3 6h18" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                  <span>Continue Shopping →</span>
                </Link>
              </div>

            </div>

            {/* ========================================================================= */}
            {/* DESKTOP VIEW */}
            {/* ========================================================================= */}
            <div className="hidden md:block">
            
            {/* Header with Switcher & Action */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E7EB] pb-5">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-[22px] sm:text-[26px] font-bold text-[#111827] tracking-tight">
                    Order #{order.id}
                  </h1>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-[#2563EB] border border-blue-200">
                    {order.status}
                  </span>
                </div>
                <p className="mt-0.5 text-[12.5px] text-[#6B7280]">
                  Placed on {shortDate(order.placedAt)} · {order.itemsCount || order.lines?.length || 1} Item(s)
                </p>
              </div>

              {/* Quick search another order */}
              <div className="flex items-center gap-2">
                <form onSubmit={onTrack} className="flex items-center gap-2">
                  <input
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder="Search another Order ID..."
                    className="w-44 sm:w-56 rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] font-medium outline-none focus:border-[#2563EB]"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-[#2563EB] px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#1D4ED8]"
                  >
                    Search
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => {
                    setInputQuery('')
                    navigate('/track')
                  }}
                  className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#4B5563] hover:bg-[#F9FAFB]"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_390px]">
              
              {/* Left Main Column */}
              <div className="space-y-6">
                
                {/* Stepper Card */}
                <div className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 sm:px-5 sm:py-4 shadow-xs">
                  <div className="relative">
                    {/* Desktop Stepper */}
                    <div className="hidden md:block">
                      <div className="relative flex items-center justify-between">
                        {/* Base Progress Line (Exact center of 36px/h-9 circle is 18px from top) */}
                        <div
                          className="absolute h-[3px] bg-gray-200 rounded-full z-0 pointer-events-none"
                          style={{
                            left: `${(1 / 12) * 100}%`,
                            right: `${(1 / 12) * 100}%`,
                            top: '18px',
                            transform: 'translateY(-50%)',
                          }}
                        />
                        
                        {/* Active Green Progress Line */}
                        <div
                          className="absolute h-[3px] bg-[#12B76A] rounded-full z-0 transition-all duration-700 pointer-events-none"
                          style={{
                            left: `${(1 / 12) * 100}%`,
                            top: '18px',
                            transform: 'translateY(-50%)',
                            width: currentStage === 0 ? '0%' : `calc(${(Math.min(currentStage, 5) / 5) * (100 - (100 / 6))}%)`,
                          }}
                        />

                        {milestones.map((m, idx) => {
                          const isDone = idx < currentStage
                          const isCurrent = idx === currentStage

                          return (
                            <div key={m.label} className="relative z-10 flex flex-col items-center flex-1 text-center">
                              <div
                                className={`grid h-9 w-9 place-items-center rounded-full transition-all shrink-0 ${
                                  isDone
                                    ? 'bg-[#12B76A] text-white shadow-xs'
                                    : isCurrent
                                    ? 'bg-[#12B76A] text-white shadow-xs ring-2 ring-[#12B76A]/30 scale-105'
                                    : 'border-2 border-gray-200 bg-white text-gray-400'
                                }`}
                              >
                                {isDone ? (
                                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                ) : (
                                  <StageIcon type={m.icon} className="w-4 h-4" />
                                )}
                              </div>
                              <p
                                className={`mt-2 text-[12px] font-semibold leading-snug ${
                                  isDone || isCurrent ? 'text-[#111827]' : 'text-[#9CA3AF]'
                                }`}
                              >
                                {m.label}
                              </p>
                              <span className="mt-0.5 text-[10.5px] text-[#6B7280]">
                                {m.time}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Headline Banner & Map Card */}
                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-xs">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h2 className="text-[18px] sm:text-[20px] font-bold text-[#111827]">
                      {currentStage >= 5
                        ? 'Your order has been delivered!'
                        : currentStage >= 3
                        ? 'Your order is on the way!'
                        : 'Your order is being prepared!'}
                    </h2>
                    <span className="text-[16px] font-bold text-[#22C55E]">
                      Arriving by {estDateFormatted}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-[#4B5563]">
                    {currentStage >= 5
                      ? 'Delivered to your doorstep. We hope you love the handcrafted candles!'
                      : currentStage >= 3
                      ? 'Your package is currently in transit with the courier partner. It will be out for delivery soon.'
                      : 'Your package is currently being handcrafted & packed at our atelier.'}
                  </p>

                  {/* Live Transit Map Visualization (Clean, Compact, Professional Real-Cartography) */}
                  <div className="relative mt-4 h-64 sm:h-76 w-full overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] shadow-xs select-none">
                    {/* Realistic Cartographic Background with Exact Coordinate Space */}
                    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 360" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        {/* Map terrain river gradient */}
                        <linearGradient id="cleanRiver" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#E0EEFD" />
                          <stop offset="100%" stopColor="#CEE4FA" />
                        </linearGradient>
                      </defs>

                      {/* Map Land Base */}
                      <rect width="100%" height="100%" fill="#F8FAFC" />

                      {/* Subtle Natural Green Zones */}
                      <path d="M -20,20 Q 80,10 140,50 T 160,120 Q 80,140 20,110 Z" fill="#EEF7F2" />
                      <path d="M 440,10 Q 540,-10 620,30 T 580,110 Q 480,90 430,40 Z" fill="#EEF7F2" />
                      <path d="M 760,220 Q 840,200 920,250 T 900,340 Q 800,330 740,280 Z" fill="#EEF7F2" />
                      <path d="M 240,260 Q 320,240 380,290 T 350,360 Q 260,350 220,300 Z" fill="#EEF7F2" />

                      {/* Clean River / Waterway Arc */}
                      <path
                        d="M 280,-20 C 340,60 320,140 450,180 C 540,210 500,290 560,370"
                        fill="none"
                        stroke="url(#cleanRiver)"
                        strokeWidth="16"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Secondary Local Roads (Crisp & Subtle) */}
                      <path d="M -20,100 L 1020,150" fill="none" stroke="#FFFFFF" strokeWidth="4" />
                      <path d="M -20,100 L 1020,150" fill="none" stroke="#E2E8F0" strokeWidth="1.5" />

                      <path d="M 120,-20 L 300,380" fill="none" stroke="#FFFFFF" strokeWidth="3.5" />
                      <path d="M 120,-20 L 300,380" fill="none" stroke="#E2E8F0" strokeWidth="1.5" />

                      <path d="M 500,-20 L 450,380" fill="none" stroke="#FFFFFF" strokeWidth="3.5" />
                      <path d="M 500,-20 L 450,380" fill="none" stroke="#E2E8F0" strokeWidth="1.5" />

                      <path d="M 720,-20 L 840,380" fill="none" stroke="#FFFFFF" strokeWidth="3.5" />
                      <path d="M 720,-20 L 840,380" fill="none" stroke="#E2E8F0" strokeWidth="1.5" />

                      <path d="M -20,290 Q 280,240 640,310 T 1020,270" fill="none" stroke="#FFFFFF" strokeWidth="4" />
                      <path d="M -20,290 Q 280,240 640,310 T 1020,270" fill="none" stroke="#E2E8F0" strokeWidth="1.5" />

                      {/* Subtle Highway Corridors */}
                      <path d="M 60,200 Q 220,120 420,95 T 780,80" fill="none" stroke="#FEF3C7" strokeWidth="2.5" />
                      <path d="M 600,320 Q 720,250 880,205 T 1020,180" fill="none" stroke="#FEF3C7" strokeWidth="2.5" />

                      {/* Clean & Relevant Place Labels (Only corridor towns, subtle styling) */}
                      <text x="180" y="235" fill="#334155" fontSize="15" fontWeight="700" fontFamily="sans-serif">Lucknow Hub</text>
                      <text x="360" y="115" fill="#94A3B8" fontSize="10.5" fontWeight="600" fontFamily="sans-serif">Unnao</text>
                      <text x="490" y="210" fill="#64748B" fontSize="11" fontWeight="700" fontFamily="sans-serif">Kanpur Sorting Hub</text>
                      <text x="690" y="270" fill="#94A3B8" fontSize="10.5" fontWeight="600" fontFamily="sans-serif">Fatehpur</text>
                      <text x="790" y="170" fill="#334155" fontSize="14" fontWeight="700" fontFamily="sans-serif">{destCity || 'Kaushambi'}</text>

                      {/* Small Highway Badge */}
                      <g transform="translate(195, 140)">
                        <rect width="38" height="15" rx="3.5" fill="#FACC15" />
                        <text x="19" y="11" fill="#000000" fontSize="8" fontWeight="800" fontFamily="sans-serif" textAnchor="middle">NH 30</text>
                      </g>

                      {/* Base Route Road Underlay */}
                      <path
                        d="M 250,280 C 350,280 400,210 520,195 C 650,180 700,120 780,120"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Main Clean Google Blue Route Line */}
                      <path
                        d="M 250,280 C 350,280 400,210 520,195 C 650,180 700,120 780,120"
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="4.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Mid Transit Hub Node */}
                      <circle cx="520" cy="195" r="4.5" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2" />

                      {/* Destination Concentric Green Bullseye */}
                      <g transform="translate(780, 120)">
                        <circle r="8.5" fill="#10B981" />
                        <circle r="4.5" fill="#FFFFFF" />
                        <circle r="2" fill="#10B981" />
                      </g>
                    </svg>

                    {/* Top-Left: Live GPS Status Badge (Compact & Clean) */}
                    <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-20">
                      <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl shadow-xs border border-gray-200/80">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-gray-800">Live GPS Route</span>
                          <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">• Active</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom-Left: Origin Hub Badge (Compact & Clean) */}
                    <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 z-20">
                      <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-xs border border-blue-100">
                        <div className="grid h-6 w-6 place-items-center rounded-lg bg-blue-600 text-white shadow-2xs text-[10px]">
                          📦
                        </div>
                        <div>
                          <p className="text-[8px] font-bold uppercase tracking-wider text-blue-600 leading-none">Origin Hub</p>
                          <p className="text-[11.5px] font-bold text-gray-900 leading-tight mt-0.5">
                            Lucknow <span className="font-medium text-gray-500 text-[10px]">(226010)</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Moving Vehicle Pod (Compact & Crisp) */}
                    <div
                      className="absolute z-25 transition-all duration-1000 ease-out"
                      style={{
                        left: currentStage >= 5 ? '78%' : currentStage >= 4 ? '66%' : currentStage >= 3 ? '52%' : currentStage >= 2 ? '37%' : '26%',
                        top: currentStage >= 5 ? '33%' : currentStage >= 4 ? '41%' : currentStage >= 3 ? '54%' : currentStage >= 2 ? '67%' : '77%',
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <div className="relative flex flex-col items-center">
                        {/* Compact In-Transit Chip */}
                        <div className="mb-1 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-900/90 text-white shadow-xs text-[9.5px] font-semibold whitespace-nowrap">
                          <span>{currentStage >= 5 ? 'Delivered' : 'In Transit'}</span>
                          <span className="text-emerald-400 text-[8.5px]">((•))</span>
                        </div>

                        {/* Circular Delivery Truck Icon */}
                        <div className="grid h-8.5 w-8.5 sm:h-9.5 sm:w-9.5 place-items-center rounded-full bg-blue-600 text-white shadow-md ring-2 ring-white">
                          <span className="text-xs sm:text-sm">🚚</span>
                        </div>
                      </div>
                    </div>

                    {/* Top-Right: Destination Hub Badge (Compact & Clean) */}
                    <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-20">
                      <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-xs border border-emerald-100">
                        <div className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-600 text-white shadow-2xs text-[10px]">
                          📍
                        </div>
                        <div className="min-w-0">
                          <p className="text-[8px] font-bold uppercase tracking-wider text-emerald-600 leading-none">
                            {currentStage >= 5 ? 'Delivered To' : 'Destination'}
                          </p>
                          <p className="text-[11.5px] font-bold text-gray-900 leading-tight mt-0.5">
                            {destCity || 'Kaushambi'} {destPincode ? <span className="font-medium text-gray-500 text-[10px]">({destPincode})</span> : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom-Right: Minimal Zoom Controls */}
                    <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 z-20 flex flex-col rounded-lg border border-gray-200 bg-white/95 backdrop-blur-md shadow-2xs overflow-hidden text-[11px] font-bold text-gray-700">
                      <button type="button" className="px-2 py-0.5 hover:bg-gray-100 border-b border-gray-100 cursor-pointer text-gray-800 transition-colors">+</button>
                      <button type="button" className="px-2 py-0.5 hover:bg-gray-100 cursor-pointer text-gray-800 transition-colors">−</button>
                    </div>
                  </div>

                  {/* 2 Stats Cards (Full title visible, no cut-off) */}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="flex items-start gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-3.5 sm:p-4 shadow-2xs">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#2563EB] border border-blue-100 shadow-2xs">
                        <span className="text-[16px]">📍</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[10px] font-black uppercase tracking-wider text-[#6B7280]">Current Location</span>
                        <p className="mt-0.5 text-[13px] font-bold text-[#111827] leading-snug break-words">
                          {currentHub}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-3.5 sm:p-4 shadow-2xs">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-[#4F46E5] border border-indigo-100 shadow-2xs">
                        <span className="text-[16px]">⏱️</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[10px] font-black uppercase tracking-wider text-[#6B7280]">Next Update</span>
                        <p className="mt-0.5 text-[13px] font-bold text-[#111827] leading-snug break-words">
                          {nextUpdateText}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* Right Column: Order Details & Need Help */}
              <div className="space-y-6">
                
                {/* Order Details */}
                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
                  <h3 className="text-[14px] font-bold text-[#111827] border-b border-[#E5E7EB] pb-3">
                    Order Details
                  </h3>

                  <ul className="mt-3.5 divide-y divide-[#F3F4F6]">
                    {(order.lines || []).map((l, idx) => (
                      <li key={l.variantId || l.handle || idx} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="h-14 w-12 shrink-0 overflow-hidden rounded-xl bg-[#F3F4F6] border border-[#E5E7EB]">
                          <Img src={l.image} alt={l.title} width={96} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-[13px] font-bold text-[#111827]">{l.title}</p>
                          <p className="text-[11px] text-[#6B7280]">
                            {l.size} {l.color && l.color !== '—' ? `· ${l.color}` : ''} | Qty: {l.qty}
                          </p>
                        </div>
                        <span className="text-[13px] font-bold text-[#111827]">
                          {inr(l.price * l.qty)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <dl className="mt-4 space-y-2 border-t border-[#E5E7EB] pt-3.5 text-[12.5px]">
                    <div className="flex justify-between text-[#4B5563]">
                      <dt>Subtotal</dt>
                      <dd className="font-semibold text-[#111827]">{inr(order.subtotal)}</dd>
                    </div>
                    <div className="flex justify-between text-[#4B5563]">
                      <dt>Shipping</dt>
                      <dd className="font-bold text-[#22C55E]">
                        {order.shipping ? inr(order.shipping) : 'FREE'}
                      </dd>
                    </div>
                    {order.discount > 0 && (
                      <div className="flex justify-between text-[#22C55E] font-semibold">
                        <dt>Discount {order.coupon ? `(${order.coupon})` : ''}</dt>
                        <dd>−{inr(order.discount)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-[#E5E7EB] pt-3 text-[14.5px] font-extrabold text-[#111827]">
                      <dt>Total</dt>
                      <dd className="text-[#2563EB] font-black">{inr(order.total)}</dd>
                    </div>
                  </dl>

                  {isLoggedIn && (
                    <button
                      type="button"
                      onClick={() => {
                        window.open(`/invoice/${order.id}?download=true`, '_blank')
                      }}
                      className="mt-4 w-full rounded-xl border border-[#D0D9E7] bg-white py-2.5 text-[12.5px] font-bold text-[#111827] shadow-2xs transition-all hover:bg-[#F8F9FD] hover:border-[#2563EB] hover:text-[#2563EB] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span>Download Invoice</span>
                    </button>
                  )}
                </div>

                {/* Need Help Card */}
                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#2563EB]">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-[#111827]">Need Help?</h4>
                      <p className="text-[12px] text-[#6B7280]">We&rsquo;re here for you.</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full text-center rounded-xl border border-[#D1D5DB] bg-white py-2.5 text-[12.5px] font-bold text-[#111827] transition-colors hover:border-[#2563EB] hover:text-[#2563EB]"
                    >
                      Contact Support
                    </a>
                    {shipment?.awb ? (
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent((shipment.carrier || 'Courier') + ' tracking ' + shipment.awb)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full text-center rounded-xl border border-[#D1D5DB] bg-white py-2.5 text-[12.5px] font-bold text-[#111827] transition-colors hover:border-[#2563EB] hover:text-[#2563EB]"
                      >
                        Track on Courier Site
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate('/collections/all-products')}
                        className="block w-full text-center rounded-xl border border-[#D1D5DB] bg-white py-2.5 text-[12.5px] font-bold text-[#111827] transition-colors hover:border-[#2563EB] hover:text-[#2563EB]"
                      >
                        Continue Shopping
                      </button>
                    )}
                  </div>
                </div>

              </div>

            </div>

            </div>

          </div>
        )}

      </div>
    </div>
  )
}

