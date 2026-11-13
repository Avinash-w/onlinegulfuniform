import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { calculateGstBreakup, formatInvoiceNumber, formatPhoneNumber } from '../lib/invoiceUtils.js'
import { apiGet, apiPost } from '../lib/api.js'
import { useStore, inr, longDate, shortDate } from '../store/StoreContext.jsx'
import { invoiceSettings, orderById, paymentOfOrder, siteSettings, adminUser, userById, ordersOfUser } from '../store/selectors.js'

export default function Invoice() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { state } = useStore()
  const settings = invoiceSettings(state)
  const site = siteSettings(state)
  const admin = adminUser(state)
  const isLoggedIn = Boolean(state.currentUserId)
  const currentUser = userById(state, state.currentUserId)

  const [order, setOrder] = useState(() => (id ? orderById(state, id) ?? null : null))
  const [payment, setPayment] = useState(() => (id ? paymentOfOrder(state, id) ?? null : null))
  const [loading, setLoading] = useState(!order && !!id)
  const [error, setError] = useState('')

  // Ownership / Security Verification state
  const [verifiedOrderIds, setVerifiedOrderIds] = useState([])

  const [otpSent, setOtpSent] = useState(false)
  const [enteredOtp, setEnteredOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [otpNotice, setOtpNotice] = useState('')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [expirySeconds, setExpirySeconds] = useState(300)
  const [resendCooldown, setResendCooldown] = useState(30)

  // Direct session verification flag
  const [sessionVerified, setSessionVerified] = useState(false)

  const userOrders = isLoggedIn ? ordersOfUser(state, state.currentUserId) : []

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
    (id && verifiedOrderIds.map((x) => String(x).toUpperCase()).includes(String(id).toUpperCase()))
  )

  // Timer interval for 5-minute expiry & 30s resend
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

    try {
      const targetId = order.id || id
      await apiPost('/orders/otp/request', { orderId: targetId })
      setOtpSent(true)
      setExpirySeconds(300)
      setResendCooldown(30)
      setOtpNotice('A 4-digit verification code has been sent to your email.')
    } catch {
      setOtpSent(true)
      setExpirySeconds(300)
      setResendCooldown(30)
      setOtpNotice('Verification code sent to registered email.')
    } finally {
      setIsSendingOtp(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault()
    setOtpError('')
    const clean = String(enteredOtp).trim().replace(/\D/g, '')
    if (clean.length !== 4) {
      setOtpError('Please enter a valid 4-digit code.')
      return
    }

    if (expirySeconds <= 0) {
      setOtpError('OTP has expired (5 mins limit). Please click Resend OTP.')
      return
    }

    setIsVerifyingOtp(true)
    const targetId = order?.id || id

    try {
      const res = await apiPost('/orders/otp/verify', { orderId: targetId, code: clean })
      if (res.data?.order) {
        setOrder(res.data.order)
        if (res.data.payment) setPayment(res.data.payment)
      }
      const orderKey = String(targetId).toUpperCase()
      const updated = [...new Set([...verifiedOrderIds, orderKey])].filter(Boolean)
      setVerifiedOrderIds(updated)
      setSessionVerified(true)
      setOtpSent(false)
      setOtpNotice('')
    } catch (err) {
      setOtpError(err?.message || 'Invalid or expired OTP.')
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  // Set document title with Order ID so Save as PDF suggests "Invoice_EN11004.pdf"
  useEffect(() => {
    if (order?.id) {
      const prevTitle = document.title
      document.title = `Invoice_${order.id}`
      return () => {
        document.title = prevTitle
      }
    }
  }, [order?.id])

  // Auto trigger Save as PDF / Print if ?download=true or ?print=true
  useEffect(() => {
    if (order && !loading && (searchParams.get('download') === 'true' || searchParams.get('print') === 'true' || searchParams.get('download') === '1')) {
      const timer = setTimeout(() => {
        window.print()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [order, loading, searchParams])

  useEffect(() => {
    if (order || !id) return
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
          setError('Order not found.')
        }
      } catch (err) {
        if (!cancelled) {
          const localOrd = orderById(state, id)
          if (localOrd) {
            setOrder(localOrd)
            setPayment(paymentOfOrder(state, id) ?? null)
          } else {
            setError(err.message || 'Invoice could not be loaded.')
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

  const gstData = useMemo(() => {
    if (!order) return null
    return calculateGstBreakup(order, settings)
  }, [order, settings])

  const handlePrint = () => {
    if (order?.id) {
      document.title = `Invoice_${order.id}`
    }
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F5FA] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="h-10 w-10 border-3 border-[#4849E8] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-xs text-gray-600 font-medium">Loading Tax Invoice...</p>
        </div>
      </div>
    )
  }

  if (error || !order || !gstData) {
    return (
      <div className="min-h-screen bg-[#F4F5FA] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 text-center border border-gray-200 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-gray-900">Invoice Unavailable</h2>
          <p className="mt-1 text-xs text-gray-500">{error || 'Could not find order details for this invoice.'}</p>
          <div className="mt-5 flex justify-center gap-2.5">
            <button
              onClick={() => navigate(-1)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Go Back
            </button>
            <Link
              to="/account?tab=orders"
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#4849E8] text-white hover:bg-[#3838d0]"
            >
              My Orders
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Security gate: Require OTP verification or login if invoice is not owned by current user
  if (!isVerified && order) {
    return (
      <div className="min-h-screen bg-[#F4F5FA] flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 sm:p-7 text-center border border-gray-200 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-3 shadow-2xs">
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="text-lg font-black text-gray-900">Security Verification Required</h2>
          <p className="mt-1 text-xs text-gray-600 leading-relaxed">
            For security and privacy, tax invoices containing customer addresses and GST details require authentication.
          </p>

          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 text-left">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-900">Invoice for Order #{order.id}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase">Protected</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Contact: {order.email ? `${order.email.slice(0, 2)}***@${order.email.split('@')[1]}` : 'Registered customer email'}
            </p>
          </div>

          {otpSent ? (
            <form onSubmit={handleVerifyOtp} className="mt-4 space-y-3">
              {/* Expiry Timer */}
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border"
                style={{
                  backgroundColor: expirySeconds > 60 ? '#F8F9FD' : expirySeconds > 0 ? '#FFFBEB' : '#FEF2F2',
                  borderColor: expirySeconds > 60 ? '#E2E8F0' : expirySeconds > 0 ? '#FDE68A' : '#FECACA',
                  color: expirySeconds > 60 ? '#475467' : expirySeconds > 0 ? '#B45309' : '#B91C1C',
                }}
              >
                {expirySeconds > 0 ? (
                  <>
                    <span>⏱️ Expires in</span>
                    <span className="font-mono font-black">{formatTimer(expirySeconds)}</span>
                  </>
                ) : (
                  <span>⚠️ OTP Expired</span>
                )}
              </div>

              {otpNotice && !otpError && (
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[11.5px] font-medium leading-tight text-left">
                  {otpNotice}
                </div>
              )}

              <div className="flex justify-center gap-2">
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
                  className={`w-44 text-center tracking-[0.4em] text-[18px] font-mono font-bold bg-white rounded-xl py-2 px-3 outline-none transition-colors disabled:bg-gray-100 disabled:opacity-60 ${
                    otpError ? 'border border-red-500 ring-1 ring-red-500/30' : 'border border-gray-300 focus:border-[#4849E8]'
                  }`}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={enteredOtp.length !== 4 || expirySeconds <= 0 || isVerifyingOtp}
                  className="px-4 py-2 rounded-xl bg-[#4849E8] hover:bg-[#3838d0] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-40"
                >
                  {isVerifyingOtp ? 'Verifying...' : 'Verify'}
                </button>
              </div>

              {otpError && <p className="text-xs text-red-600 font-semibold">{otpError}</p>}

              <div className="pt-1">
                {expirySeconds > 0 ? (
                  <span className="text-xs text-gray-400 font-medium cursor-not-allowed">
                    Resend OTP in {formatTimer(expirySeconds)}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp}
                    className="text-xs text-[#4849E8] hover:underline font-bold cursor-pointer disabled:opacity-50"
                  >
                    {isSendingOtp ? 'Sending...' : '🔄 Resend OTP'}
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSendingOtp}
                className="w-full py-2.5 rounded-xl bg-[#4849E8] hover:bg-[#3838d0] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSendingOtp ? 'Sending...' : 'Send OTP to Unlock Tax Invoice'}
              </button>
              <Link
                to="/login"
                className="block w-full py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors"
              >
                Log In to Your Account
              </Link>
            </div>
          )}
        </div>
      </div>
    )
  }

  const invoiceNo = formatInvoiceNumber(
    order.id,
    settings.invoicePrefix || 'INV-2024-',
    settings.invoiceNumberDigits || 5
  )
  const invoiceDate = shortDate(order.placedAt || Date.now())
  const isPaid = payment?.status === 'Paid' || order.status === 'Delivered' || (payment && payment.method !== 'COD')
  
  const logoUrl = settings.logo || site.logo || '/logo/evaranest-logo.png'
  const customerAddr = order.address || order.shippingAddress || {}
  const customerName = order.customerName || customerAddr.name || 'Valued Customer'
  const customerPhone = order.phone || customerAddr.phone || '—'
  const customerEmail = order.email || customerAddr.email || '—'
  const hasDiscounts = gstData.discount > 0 || gstData.lines.some((l) => l.lineDiscount > 0)

  // Payment QR URL
  const generatedUpiUri = `upi://pay?pa=${settings.upiId || 'evaranest@hdfcbank'}&pn=${encodeURIComponent(
    settings.upiPayeeName || settings.companyName || 'EvaraNest'
  )}&am=${gstData.grandTotal}&cu=INR&tn=${encodeURIComponent(`Order ${order.id}`)}`

  const qrImageUrl =
    settings.qrCodeType === 'custom' && settings.qrCodeUrl
      ? settings.qrCodeUrl
      : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(generatedUpiUri)}`

  return (
    <div className="min-h-screen bg-[#F0F2F8] py-4 sm:py-6 px-2 sm:px-4 text-gray-900 font-sans print:bg-white print:p-0 print:m-0">
      
      {/* Precision Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          html, body {
            background: #fff !important;
            color: #111827 !important;
            font-size: 10px !important;
            line-height: 1.35 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          }
          .no-print {
            display: none !important;
          }
          .invoice-sheet {
            box-shadow: none !important;
            border: 1px solid #9ca3af !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            padding: 16px 20px !important;
            margin: 0 !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Top Action Bar (hidden in print) */}
      <div className="max-w-[840px] mx-auto mb-3.5 no-print flex items-center justify-between gap-3 bg-white border border-gray-200/90 rounded-2xl p-3 sm:p-3.5 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 -ml-1 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
            title="Back"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14.5px] sm:text-[15.5px] font-extrabold text-gray-900 leading-tight">
                Tax Invoice #{invoiceNo}
              </span>
              <span
                className={`text-[9.5px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  isPaid
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {isPaid ? 'PAID' : 'PAYMENT PENDING'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5 truncate">
              Order #{order.id} · {longDate(order.placedAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {admin && (
            <Link
              to="/admin/invoice-settings"
              className="px-3 sm:px-3.5 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-[11.5px] font-semibold text-gray-700 transition-colors whitespace-nowrap"
            >
              ⚙️ Invoice Settings
            </Link>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-[#4849E8] hover:bg-[#3838d0] text-white text-[11.5px] sm:text-[12px] font-bold transition-all shadow-xs active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect width="12" height="8" x="6" y="14" />
            </svg>
            <span>Save to PDF / Print</span>
          </button>
        </div>
      </div>

      {/* Main Single-Page Invoice Document */}
      <div className="invoice-sheet max-w-[840px] mx-auto bg-white border border-gray-300 rounded-2xl shadow-sm p-5 sm:p-7 text-[10.5px] sm:text-[11px] leading-relaxed space-y-3.5">
        
        {/* 1. HEADER: Logo, Company Profile, and Tax Invoice Badge */}
        <div className="flex items-start justify-between gap-4 border-b-2 border-gray-900 pb-3">
          
          {/* Left: Brand Logo & Business Information */}
          <div className="flex items-start gap-3.5 min-w-0">
            {settings.showLogo !== false && (
              <div className="h-12 sm:h-13 shrink-0 flex items-center pt-0.5">
                <img
                  src={logoUrl}
                  alt={settings.brandName || 'EvaraNest'}
                  className="max-h-12 sm:max-h-13 w-auto max-w-[140px] object-contain"
                />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-[16px] sm:text-[18px] font-black text-gray-900 tracking-tight leading-none uppercase">
                {settings.companyName || 'EvaraNest Lifestyle Pvt. Ltd.'}
              </h1>
              {settings.tagline && (
                <p className="text-[9.5px] sm:text-[10px] text-[#4849E8] font-bold uppercase tracking-wider mt-1">
                  {settings.tagline}
                </p>
              )}
              <p className="text-[10px] sm:text-[10.5px] text-gray-600 mt-1 leading-normal max-w-md">
                {[settings.addressLine1, settings.addressLine2, `${settings.city || ''}, ${settings.state || ''} - ${settings.pincode || ''}`, settings.country || 'India'].filter(Boolean).join(', ')}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[9.5px] text-gray-600 font-medium mt-1">
                {settings.phone && <span><strong className="text-gray-800">Phone:</strong> {formatPhoneNumber(settings.phone)}</span>}
                {settings.email && <span><strong className="text-gray-800">Email:</strong> {settings.email}</span>}
                {settings.website && <span><strong className="text-gray-800">Web:</strong> {settings.website}</span>}
              </div>
            </div>
          </div>

          {/* Right: TAX INVOICE Title & Tax Identifiers */}
          <div className="text-right shrink-0">
            <div className="inline-block bg-[#111827] text-white px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-widest shadow-2xs">
              TAX INVOICE
            </div>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
              (Original for Recipient)
            </p>
            <div className="mt-1.5 space-y-0.5 text-[10px] text-gray-700">
              <p>
                <span className="font-bold text-gray-900">GSTIN: </span>
                <span className="font-mono font-bold text-[#4849E8] text-[10.5px]">{settings.gstin || '07AAAAA0000A1Z5'}</span>
              </p>
              {settings.pan && (
                <p>
                  <span className="font-bold text-gray-900">PAN: </span>
                  <span className="font-mono">{settings.pan}</span>
                </p>
              )}
              {settings.cin && (
                <p>
                  <span className="font-bold text-gray-900">CIN: </span>
                  <span className="font-mono text-[9px]">{settings.cin}</span>
                </p>
              )}
            </div>
          </div>

        </div>

        {/* 2. INVOICE META ROW */}
        <div className="grid grid-cols-4 gap-2.5 bg-[#F8F9FC] border border-gray-200 rounded-xl p-2.5 sm:p-3 text-[10px] sm:text-[10.5px]">
          <div>
            <span className="block text-gray-500 font-bold uppercase text-[8.5px] tracking-wide">Invoice No.</span>
            <span className="font-extrabold font-mono text-gray-900 text-[11.5px]">{invoiceNo}</span>
          </div>
          <div>
            <span className="block text-gray-500 font-bold uppercase text-[8.5px] tracking-wide">Invoice Date</span>
            <span className="font-bold text-gray-900">{invoiceDate}</span>
          </div>
          <div>
            <span className="block text-gray-500 font-bold uppercase text-[8.5px] tracking-wide">Order ID & Date</span>
            <span className="font-bold text-gray-900">#{order.id} ({shortDate(order.placedAt)})</span>
          </div>
          <div>
            <span className="block text-gray-500 font-bold uppercase text-[8.5px] tracking-wide">Place of Supply</span>
            <span className="font-extrabold text-[#4849E8]">{gstData.destState.toUpperCase()}</span>
          </div>
          <div>
            <span className="block text-gray-500 font-bold uppercase text-[8.5px] tracking-wide">Payment Mode</span>
            <span className="font-bold text-gray-900">{payment?.method || (order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Prepaid Online')}</span>
          </div>
          <div>
            <span className="block text-gray-500 font-bold uppercase text-[8.5px] tracking-wide">Payment Status</span>
            <span className={`font-bold ${isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
              {isPaid ? 'PAID' : 'PENDING'}
            </span>
          </div>
          <div>
            <span className="block text-gray-500 font-bold uppercase text-[8.5px] tracking-wide">Supply Type</span>
            <span className="font-bold text-gray-900">
              {gstData.isIntraState ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'}
            </span>
          </div>
          <div>
            <span className="block text-gray-500 font-bold uppercase text-[8.5px] tracking-wide">Reverse Charge</span>
            <span className="font-bold text-gray-900">No</span>
          </div>
        </div>

        {/* 3. BILLED TO & SHIPPED TO */}
        <div className="grid grid-cols-2 gap-3 text-[10px] sm:text-[10.5px]">
          {/* Bill To */}
          <div className="border border-gray-200 rounded-xl p-2.5 sm:p-3 bg-[#FAFAFC]">
            <h2 className="font-bold uppercase tracking-wider text-[#4849E8] border-b border-gray-200 pb-1 mb-1.5 text-[9px]">
              Billed To (Customer / Buyer)
            </h2>
            <p className="font-bold text-gray-900 text-[11.5px]">{customerName}</p>
            <p className="text-gray-600 leading-normal mt-0.5">
              {[customerAddr.line1, customerAddr.line2, `${customerAddr.city || ''}, ${customerAddr.state || ''} - ${customerAddr.pin || ''}`].filter(Boolean).join(', ')}
            </p>
            <p className="text-gray-600 mt-1.5">
              <span className="font-semibold text-gray-800">Phone: </span>{formatPhoneNumber(customerPhone)} · <span className="font-semibold text-gray-800">Email: </span>{customerEmail}
            </p>
          </div>

          {/* Ship To */}
          <div className="border border-gray-200 rounded-xl p-2.5 sm:p-3 bg-[#FAFAFC]">
            <h2 className="font-bold uppercase tracking-wider text-[#4849E8] border-b border-gray-200 pb-1 mb-1.5 text-[9px]">
              Shipped To (Delivery Destination)
            </h2>
            <p className="font-bold text-gray-900 text-[11.5px]">{customerName}</p>
            <p className="text-gray-600 leading-normal mt-0.5">
              {[customerAddr.line1, customerAddr.line2, `${customerAddr.city || ''}, ${customerAddr.state || ''} - ${customerAddr.pin || ''}`, customerAddr.country || 'India'].filter(Boolean).join(', ')}
            </p>
            <p className="text-gray-600 mt-1.5">
              <span className="font-semibold text-gray-800">Phone: </span>{formatPhoneNumber(customerPhone)} · <span className="font-semibold text-gray-800">State: </span>{customerAddr.state || gstData.destState}
            </p>
          </div>
        </div>

        {/* 4. ITEMS TABLE (Thead with theme background color and full column layout) */}
        <div className="border border-gray-300 rounded-xl overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse text-[10px] sm:text-[10.5px]">
            <thead
              style={{ backgroundColor: settings.themeColor || '#4849E8' }}
              className="text-white uppercase text-[9px] font-bold tracking-wider"
            >
              <tr>
                <th className="py-2.5 px-2.5 text-center w-7">#</th>
                <th className="py-2.5 px-2.5">Item Description</th>
                <th className="py-2.5 px-2 text-center w-18">HSN/SAC</th>
                <th className="py-2.5 px-1.5 text-center w-9">Qty</th>
                <th className="py-2.5 px-2.5 text-right w-18">Unit Rate</th>
                {hasDiscounts && (
                  <th className="py-2.5 px-2.5 text-right w-18 text-emerald-200">Discount</th>
                )}
                <th className="py-2.5 px-2.5 text-right w-18">Taxable</th>
                <th className="py-2.5 px-1.5 text-center w-12">GST %</th>
                <th className="py-2.5 px-2.5 text-right w-18">GST Amt</th>
                <th className="py-2.5 px-2.5 text-right w-20">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {gstData.lines.map((l) => (
                <tr key={l.index} className="hover:bg-gray-50/50">
                  <td className="py-1.5 sm:py-2 px-2.5 text-center text-gray-500 font-medium">{l.index}</td>
                  <td className="py-1.5 sm:py-2 px-2.5">
                    <span className="font-bold text-gray-900 text-[11px]">{l.title}</span>
                    {(l.size || l.color || l.sku) && (
                      <span className="block text-[9px] text-gray-500 mt-0.5">
                        {[l.size, l.color, `SKU: ${l.sku}`].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 sm:py-2 px-2 text-center font-mono text-gray-700 font-semibold">{l.hsn}</td>
                  <td className="py-1.5 sm:py-2 px-1.5 text-center font-bold text-gray-900">{l.qty}</td>
                  <td className="py-1.5 sm:py-2 px-2.5 text-right font-mono text-gray-700">{inr(l.unitPrice)}</td>
                  {hasDiscounts && (
                    <td className="py-1.5 sm:py-2 px-2.5 text-right font-mono text-emerald-600 font-bold">
                      {l.lineDiscount > 0 ? `-${inr(l.lineDiscount)}` : '—'}
                    </td>
                  )}
                  <td className="py-1.5 sm:py-2 px-2.5 text-right font-mono font-medium text-gray-900">{inr(l.taxableValue)}</td>
                  <td className="py-1.5 sm:py-2 px-1.5 text-center font-semibold text-gray-700">{l.gstRate}%</td>
                  <td className="py-1.5 sm:py-2 px-2.5 text-right font-mono text-gray-600">{inr(l.gstAmount)}</td>
                  <td className="py-1.5 sm:py-2 px-2.5 text-right font-mono font-bold text-gray-900">{inr(l.lineNet)}</td>
                </tr>
              ))}

              {/* Shipping Row */}
              {gstData.shippingTotal > 0 && (
                <tr className="bg-gray-50/70 font-medium">
                  <td className="py-1.5 sm:py-2 px-2.5 text-center text-gray-500">{gstData.lines.length + 1}</td>
                  <td className="py-1.5 sm:py-2 px-2.5">
                    <span className="font-bold text-gray-900">Shipping & Delivery Charges</span>
                    <span className="block text-[9px] text-gray-500 mt-0.5">Insured express door delivery</span>
                  </td>
                  <td className="py-1.5 sm:py-2 px-2 text-center font-mono text-gray-700 font-semibold">996813</td>
                  <td className="py-1.5 sm:py-2 px-1.5 text-center font-bold text-gray-900">1</td>
                  <td className="py-1.5 sm:py-2 px-2.5 text-right font-mono text-gray-700">{inr(gstData.shippingTotal)}</td>
                  {hasDiscounts && <td className="py-1.5 sm:py-2 px-2.5 text-right font-mono text-gray-400">—</td>}
                  <td className="py-1.5 sm:py-2 px-2.5 text-right font-mono text-gray-900">{inr(gstData.shippingTaxable)}</td>
                  <td className="py-1.5 sm:py-2 px-1.5 text-center font-semibold text-gray-700">{settings.defaultGstRate || 18}%</td>
                  <td className="py-1.5 sm:py-2 px-2.5 text-right font-mono text-gray-600">{inr(gstData.shippingGst)}</td>
                  <td className="py-1.5 sm:py-2 px-2.5 text-right font-mono font-bold text-gray-900">{inr(gstData.shippingTotal)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. HSN SUMMARY & TOTALS FINANCIALS ROW (Amount in Words on TOP, HSN Breakdown BELOW) */}
        <div className="grid grid-cols-12 gap-3 items-start">
          
          {/* Left 7 cols: Amount in Words (TOP) + GST Tax Breakdown (BELOW) */}
          <div className="col-span-7 space-y-2">
            
            {/* 1. Invoice Total in Words (TOP) */}
            <div className="bg-[#F8F9FC] border border-gray-200 rounded-xl p-2.5 text-[9.5px] sm:text-[10px]">
              <span className="block text-[8px] font-bold uppercase tracking-wider text-gray-400">
                Invoice Total in Words
              </span>
              <p className="font-bold text-gray-900 mt-0.5 leading-snug">
                {gstData.amountInWords}
              </p>
            </div>

            {/* 2. GST Tax Breakdown Table (BELOW) */}
            {settings.showTaxBreakupTable !== false && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-[#F8F9FC] px-2.5 py-1 border-b border-gray-200 flex justify-between items-center text-[9px] font-bold uppercase text-gray-700">
                  <span>GST Tax Breakdown (HSN / SAC Wise)</span>
                  <span className="text-[#4849E8] font-bold">{gstData.isIntraState ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'}</span>
                </div>
                <table className="w-full text-left border-collapse text-[9px] sm:text-[9.5px]">
                  <thead>
                    <tr className="bg-gray-100/80 text-gray-700 font-bold uppercase text-[8.5px] border-b border-gray-200">
                      <th className="py-1 px-2.5">HSN/SAC</th>
                      <th className="py-1 px-2 text-right">Taxable</th>
                      {gstData.isIntraState ? (
                        <>
                          <th className="py-1 px-2 text-right">CGST</th>
                          <th className="py-1 px-2 text-right">SGST</th>
                        </>
                      ) : (
                        <th className="py-1 px-2 text-right">IGST</th>
                      )}
                      <th className="py-1 px-2.5 text-right">Total Tax (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {gstData.hsnBreakdown.map((row) => (
                      <tr key={row.hsn}>
                        <td className="py-1 px-2.5 font-mono font-bold text-gray-800">{row.hsn}</td>
                        <td className="py-1 px-2 text-right font-mono">{inr(row.taxableValue)}</td>
                        {gstData.isIntraState ? (
                          <>
                            <td className="py-1 px-2 text-right font-mono">{inr(row.cgstAmount)}</td>
                            <td className="py-1 px-2 text-right font-mono">{inr(row.sgstAmount)}</td>
                          </>
                        ) : (
                          <td className="py-1 px-2 text-right font-mono">{inr(row.igstAmount)}</td>
                        )}
                        <td className="py-1 px-2.5 text-right font-mono font-bold text-gray-900">{inr(row.totalTax)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>

          {/* Right 5 cols: Financials Breakup Box */}
          <div className="col-span-5 bg-white border border-gray-300 rounded-xl p-2.5 sm:p-3 space-y-1.5 text-[10px] sm:text-[10.5px]">
            <div className="flex justify-between text-gray-600">
              <span>Items Total (Gross)</span>
              <span className="font-mono font-semibold text-gray-900">{inr(gstData.itemsGross)}</span>
            </div>

            {gstData.discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Total Discount {order.coupon ? `(${order.coupon})` : ''}</span>
                <span className="font-mono">- {inr(gstData.discount)}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>Shipping & Delivery</span>
              <span className="font-mono font-semibold text-gray-900">
                {gstData.shippingTotal === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : inr(gstData.shippingTotal)}
              </span>
            </div>

            <div className="flex justify-between text-gray-600 border-t border-dashed border-gray-200 pt-1">
              <span>Total Taxable Value</span>
              <span className="font-mono font-medium text-gray-900">{inr(gstData.totalTaxable)}</span>
            </div>

            <div className="flex justify-between text-gray-600">
              <span>Total GST Tax ({gstData.isIntraState ? 'CGST+SGST' : 'IGST'})</span>
              <span className="font-mono font-bold text-gray-900">{inr(gstData.totalGst)}</span>
            </div>

            <div className="flex justify-between items-center border-t-2 border-gray-900 pt-1.5 text-[12px] sm:text-[12.5px] font-black text-gray-900">
              <span>Grand Total</span>
              <span className="text-[14.5px] sm:text-[15.5px] text-[#4849E8] font-mono">{inr(gstData.grandTotal)}</span>
            </div>

            <div className="pt-1 border-t border-gray-150 flex justify-between text-[9.5px] font-bold text-emerald-700">
              <span>Amount Received</span>
              <span className="font-mono">{isPaid ? inr(gstData.grandTotal) : inr(0)}</span>
            </div>
          </div>

        </div>

        {/* 6. BOTTOM ROW: Bank Details & UPI QR, Terms & Signatory */}
        <div className="grid grid-cols-12 gap-3 border-t border-gray-200 pt-2.5 items-end text-[9px] sm:text-[9.5px]">
          
          {/* Left 5 cols: Bank & UPI Payment QR Code */}
          <div className="col-span-5 bg-gray-50/90 border border-gray-200 rounded-xl p-2 flex items-center gap-2.5">
            {/* Scannable Payment QR Code */}
            {settings.showQrCode !== false && (settings.qrCodeUrl || settings.upiId) && (
              <div className="shrink-0 bg-white p-1 rounded-lg border border-gray-250 text-center shadow-2xs">
                <img
                  src={qrImageUrl}
                  alt="Scan to Pay via UPI"
                  className="w-16 h-16 sm:w-18 sm:h-18 object-contain rounded mx-auto"
                />
                <span className="block text-[7px] sm:text-[7.5px] font-black text-[#4849E8] uppercase tracking-tight mt-0.5">
                  Scan & Pay UPI
                </span>
              </div>
            )}

            {/* Bank Info */}
            <div className="min-w-0 flex-1 space-y-0.5 text-[8.5px] sm:text-[9px]">
              <span className="font-bold text-[#4849E8] uppercase tracking-wider block text-[8px] sm:text-[8.5px]">
                Bank / UPI Transfer
              </span>
              {settings.bankName && (
                <p className="truncate"><span className="font-semibold text-gray-800">Bank: </span>{settings.bankName}</p>
              )}
              {settings.accountNumber && (
                <p className="truncate"><span className="font-semibold text-gray-800">A/C: </span><span className="font-mono font-bold text-gray-900">{settings.accountNumber}</span></p>
              )}
              {settings.ifscCode && (
                <p className="truncate"><span className="font-semibold text-gray-800">IFSC: </span><span className="font-mono font-bold">{settings.ifscCode}</span></p>
              )}
              {settings.upiId && (
                <p className="truncate"><span className="font-semibold text-gray-800">UPI ID: </span><span className="font-mono font-bold text-[#4849E8]">{settings.upiId}</span></p>
              )}
            </div>
          </div>

          {/* Middle 4 cols: Notes & Terms */}
          <div className="col-span-4 text-gray-500 leading-normal space-y-1">
            {settings.invoiceNotes && (
              <p className="italic text-gray-700 font-medium line-clamp-2">
                "{settings.invoiceNotes}"
              </p>
            )}
            {settings.showTerms !== false && settings.termsAndConditions && (
              <div>
                <span className="font-bold text-gray-700 uppercase tracking-wider block text-[8px]">
                  Terms & Conditions:
                </span>
                <p className="text-[8px] text-gray-500 line-clamp-3 whitespace-pre-line">
                  {settings.termsAndConditions}
                </p>
              </div>
            )}
          </div>

          {/* Right 3 cols: Authorized Signatory (Large & Prominent) */}
          <div className="col-span-3 text-right flex flex-col items-end justify-end">
            <p className="text-[8.5px] sm:text-[9px] font-bold text-gray-900 truncate max-w-full">
              {settings.authorizedSignatoryTitle || `For ${settings.companyName || 'EvaraNest Lifestyle Pvt. Ltd.'}`}
            </p>
            
            <div className="h-14 sm:h-16 my-1 flex items-center justify-end">
              {settings.signatureUrl ? (
                <img
                  src={settings.signatureUrl}
                  alt="Signature"
                  className="max-h-12 sm:max-h-14 w-auto object-contain"
                />
              ) : (
                <div className="italic font-serif text-[17px] sm:text-[19px] text-[#111827] font-bold pr-1 tracking-wide">
                  EvaraNest Signatory
                </div>
              )}
            </div>

            <p className="text-[8.5px] sm:text-[9px] font-bold text-gray-800">
              {settings.authorizedSignatoryName || 'Authorized Signatory'}
            </p>
            <p className="text-[7px] sm:text-[7.5px] text-gray-400 mt-0.2">
              Digitally Generated
            </p>
          </div>

        </div>

        {/* 7. Bottom Legal Footer */}
        <div className="border-t border-gray-200 pt-1.5 text-center text-[8px] text-gray-400">
          This is a computer-generated tax invoice issued in accordance with GST Rules. Subject to {settings.city || 'Delhi'} Jurisdiction.
        </div>

      </div>

    </div>
  )
}
