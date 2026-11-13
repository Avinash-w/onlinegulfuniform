import { useState, useMemo, useRef, useEffect } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import Img from '../components/Img'
import Seo from '../components/Seo'
import { Badge, Modal, Button } from '../admin/ui.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useStore, inr, shortDate } from '../store/StoreContext.jsx'
import {
  lifetimeValue,
  ordersOfUser,
  userById,
  paymentOfOrder,
  refundsOfOrder,
  wishlistProducts,
} from '../store/selectors.js'
import { apiGet, apiPost, apiPatch, apiPut, apiDelete, apiUpload, setCustomerToken, getCustomerToken } from '../lib/api.js'

export default function Account() {
  const { state, dispatch } = useStore()
  const { add: addToCart, setOpen: setCartOpen, notify } = useCart()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const user = userById(state, state.currentUserId)

  // Live fetch customer data by user_id with Bearer token
  const [loadingAccountData, setLoadingAccountData] = useState(false)
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    ;(async () => {
      setLoadingAccountData(true)
      try {
        const [meRes, ordersRes, wishRes] = await Promise.allSettled([
          apiGet('/customer/me', { auth: 'customer' }),
          apiGet('/orders', { auth: 'customer' }),
          apiGet('/wishlist', { auth: 'customer' }),
        ])
        if (cancelled) return

        if (meRes.status === 'fulfilled' && meRes.value?.data?.user) {
          const u = meRes.value.data.user
          dispatch({ type: 'user/ensure', user: u })
          if (u.addresses) {
            dispatch({ type: 'user/update', id: u.id, patch: { addresses: u.addresses, address: u.address } })
          }
        }

        if (ordersRes.status === 'fulfilled' && ordersRes.value?.data) {
          const d = ordersRes.value.data
          dispatch({
            type: 'commerce/hydrate',
            orders: d.orders ?? [],
            payments: d.payments ?? [],
            shipments: d.shipments ?? [],
            refunds: d.refunds ?? [],
          })
        }

        if (wishRes.status === 'fulfilled' && Array.isArray(wishRes.value?.data?.wishlist)) {
          dispatch({ type: 'wishlist/set', handles: wishRes.value.data.wishlist })
        }
      } catch (err) {
        console.error('Failed to sync account data:', err)
      } finally {
        if (!cancelled) setLoadingAccountData(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  // Active navigation tab on the left sidebar
  // Options: null (menu on mobile) | 'orders' | 'dashboard' | 'wishlist' | 'addresses' | 'payments' | 'cards' | 'settings' | 'support'
  const activeTabParam = searchParams.get('tab')
  const activeTab = activeTabParam || ''
  const effectiveTab = activeTab || 'orders' // desktop default if no tab param

  const openTab = (tab) => {
    setSearchParams({ tab })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBackToMenu = () => {
    setSearchParams({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Order status filter tab in My Orders: 'all' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  const [orderFilter, setOrderFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [timeRange, setTimeRange] = useState('all')

  // Only one order accordion can be expanded at a time
  const [expandedOrderId, setExpandedOrderId] = useState(null)

  // Order Cancellation Modal states
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [cancelReason, setCancelReason] = useState('Ordered by mistake')
  const [cancelNotes, setCancelNotes] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('')

  // Address Modal & Management states
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [editingAddrId, setEditingAddrId] = useState(null)
  const [busyAddr, setBusyAddr] = useState(null)
  const [pincodeLoading, setPincodeLoading] = useState(false)
  const [pincodeCity, setPincodeCity] = useState('')
  const [addrError, setAddrError] = useState('')
  const [addrFieldErrors, setAddrFieldErrors] = useState({})
  const [addrForm, setAddrForm] = useState({
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
  })

  // Profile Settings Form state
  const [profileName, setProfileName] = useState(user?.name || '')
  const [profileEmail, setProfileEmail] = useState(user?.email || '')
  const [profilePhone, setProfilePhone] = useState(user?.phone || '')
  const [profileAvatar, setProfileAvatar] = useState(user?.avatar || '')
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' })
  const [profileErrors, setProfileErrors] = useState({})
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef(null)

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '')
      setProfileEmail(user.email || '')
      setProfilePhone(user.phone || '')
      setProfileAvatar(user.avatar || '')
    }
  }, [user?.name, user?.email, user?.phone, user?.avatar])

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    try {
      // 1. Upload the image file to the server
      const uploadRes = await apiUpload(file, 'avatar')
      const uploadedUrl = uploadRes?.url || uploadRes?.data?.url

      if (!uploadedUrl) {
        throw new Error('Could not get uploaded image URL.')
      }

      // 2. Patch customer profile with the permanent image URL
      const res = await apiPatch('/customer/profile', {
        avatar: uploadedUrl,
      })

      if (res && res.user) {
        dispatch({
          type: 'users/upsert',
          payload: {
            ...user,
            ...res.user,
            avatar: uploadedUrl,
          },
        })
      } else {
        dispatch({
          type: 'users/upsert',
          payload: {
            ...user,
            avatar: uploadedUrl,
          },
        })
      }
      setProfileAvatar(uploadedUrl)
    } catch (err) {
      console.error('Failed to upload and update avatar:', err)
      // Fallback: Read as data URL locally if server upload fails
      const reader = new FileReader()
      reader.onload = (event) => {
        const localData = event.target?.result
        if (localData) {
          dispatch({
            type: 'users/upsert',
            payload: {
              ...user,
              avatar: localData,
            },
          })
          setProfileAvatar(localData)
        }
      }
      reader.readAsDataURL(file)
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' })
  const [passwordErrors, setPasswordErrors] = useState({})
  const [savingPassword, setSavingPassword] = useState(false)

  if (!user) {
    if (getCustomerToken()) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#4849E8] border-t-transparent" />
          <p className="text-[12.5px] font-medium text-gray-500">Loading your account…</p>
        </div>
      )
    }
    return <Navigate to="/login" replace state={{ from: { pathname: '/account' } }} />
  }

  const rawOrders = ordersOfUser(state, user.id)
  const wishlistItems = wishlistProducts(state)

  const initials =
    (user.name || '')
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'

  const logout = async () => {
    try {
      await apiPost('/customer/logout', {})
    } catch (e) {
      console.error('Logout failed:', e)
    }
    setCustomerToken(null)
    dispatch({ type: 'auth/logout' })
    navigate('/login')
  }

  // Filtered Orders Calculation
  const filteredOrders = useMemo(() => {
    return rawOrders.filter((o) => {
      // Status filter
      if (orderFilter === 'processing') {
        if (!['Pending', 'Confirmed', 'In Progress', 'Packed'].includes(o.status)) return false
      } else if (orderFilter === 'shipped') {
        if (o.status !== 'Shipped' && o.status !== 'In transit') return false
      } else if (orderFilter === 'delivered') {
        if (o.status !== 'Delivered') return false
      } else if (orderFilter === 'cancelled') {
        if (o.status !== 'Cancelled' && o.status !== 'Returned' && o.status !== 'Refunded') return false
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchId = o.id.toLowerCase().includes(q)
        const matchTitle = o.lines.some((l) => l.title?.toLowerCase().includes(q))
        if (!matchId && !matchTitle) return false
      }

      // Time range filter
      if (timeRange === '6months') {
        const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000
        if (o.placedAt < sixMonthsAgo) return false
      } else if (timeRange === 'year') {
        const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000
        if (o.placedAt < oneYearAgo) return false
      }

      return true
    })
  }, [rawOrders, orderFilter, searchQuery, timeRange])

  // Count helper for tabs
  const orderCounts = useMemo(() => {
    return {
      all: rawOrders.length,
      processing: rawOrders.filter((o) =>
        ['Pending', 'Confirmed', 'In Progress', 'Packed'].includes(o.status)
      ).length,
      shipped: rawOrders.filter((o) => ['Shipped', 'In transit'].includes(o.status)).length,
      delivered: rawOrders.filter((o) => o.status === 'Delivered').length,
      cancelled: rawOrders.filter((o) => ['Cancelled', 'Returned', 'Refunded'].includes(o.status)).length,
    }
  }, [rawOrders])

  // Toggle order card accordion (only one expanded at a time)
  const toggleCollapse = (orderId) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId))
  }

  // Cancellation Modal Actions
  const openCancelModal = (order) => {
    setSelectedOrder(order)
    setCancelReason('Ordered by mistake')
    setCancelNotes('')
    setCancelError('')
    setCancelModalOpen(true)
  }

  const handleConfirmCancel = async () => {
    if (!selectedOrder) return
    setCancelling(true)
    setCancelError('')

    try {
      const reasonCombined = cancelNotes.trim()
        ? `${cancelReason} - ${cancelNotes.trim()}`
        : cancelReason

      const res = await apiPost(`/orders/${selectedOrder.id}/cancel`, {
        reason: reasonCombined,
      })

      if (res && res.order) {
        dispatch({
          type: 'order/cancelSuccess',
          order: res.order,
          payment: res.payment,
          refunds: res.refunds,
        })
      }

      setCancelSuccessMsg(
        res?.message ||
          (res?.isPrepaid
            ? `Order #${selectedOrder.id} cancelled. Refund of ${inr(selectedOrder.total)} has been requested and is awaiting Admin Approval.`
            : `Order #${selectedOrder.id} cancelled successfully.`)
      )
      setCancelModalOpen(false)
    } catch (err) {
      setCancelError(err?.message || 'Failed to cancel order. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  // "Buy Again" handler
  const handleBuyAgain = (order) => {
    if (!order?.lines?.length) return
    order.lines.forEach((l) => {
      addToCart({
        handle: l.productHandle || l.handle,
        title: l.title,
        price: l.price,
        image: l.image,
        size: l.size || 'One size',
        color: l.color || 'Default',
        qty: l.qty || 1,
      })
    })
    setCartOpen(true)
  }

  // Wishlist Actions
  const handleRemoveWishlist = async (handle) => {
    dispatch({ type: 'wishlist/toggle', handle })
    notify('Removed from wishlist')
    if (getCustomerToken()) {
      try {
        const json = await apiPost('/wishlist/toggle', { handle }, { auth: 'customer' })
        if (json?.data?.wishlist) {
          dispatch({ type: 'wishlist/set', handles: json.data.wishlist })
        }
      } catch (err) {
        console.error('Failed to sync wishlist removal:', err)
      }
    }
  }

  // Address Actions
  const handlePincodeChange = async (pinVal) => {
    const rawPin = pinVal.replace(/\D/g, '').slice(0, 6)
    setAddrForm((prev) => ({ ...prev, pin: rawPin }))
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
          const state = po.State || ''
          const country = po.Country || 'India'

          setAddrForm((prev) => ({
            ...prev,
            name: prev.name || user?.name || '',
            phone: prev.phone || user?.phone || '',
            email: prev.email || user?.email || '',
            line2: prev.line2 || areaName,
            city: city || prev.city,
            state: state || prev.state,
            country: country,
          }))
          setPincodeCity(city)
        }
      } catch (err) {
        console.error('Pincode lookup error:', err)
      } finally {
        setPincodeLoading(false)
      }
    }
  }

  const openAddAddressModal = () => {
    setEditingAddrId(null)
    setAddrError('')
    setPincodeCity('')
    setPincodeLoading(false)
    setAddrForm({
      label: 'Home',
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      pin: '',
      country: 'India',
      isDefault: !user.addresses || user.addresses.length === 0,
    })
    setAddressModalOpen(true)
  }

  const openEditAddressModal = (addr) => {
    setEditingAddrId(addr.id)
    setAddrError('')
    setAddrFieldErrors({})
    setPincodeCity(addr.city || '')
    setPincodeLoading(false)
    setAddrForm({
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
      isDefault: !!addr.isDefault,
    })
    setAddressModalOpen(true)
  }

  const handleSaveAddress = async () => {
    const errors = {}
    if (!addrForm.name?.trim()) errors.name = true
    const cleanPhone = (addrForm.phone || '').replace(/\D/g, '')
    if (cleanPhone.length !== 10) errors.phone = true
    if (!addrForm.line1?.trim()) errors.line1 = true
    if (!addrForm.city?.trim()) errors.city = true
    if (!addrForm.state?.trim()) errors.state = true
    if (!addrForm.pin?.trim() || addrForm.pin.length !== 6) errors.pin = true

    if (Object.keys(errors).length > 0) {
      setAddrFieldErrors(errors)
      if (errors.phone && Object.keys(errors).length === 1) {
        setAddrError('Please enter a valid 10-digit mobile phone number.')
      } else {
        setAddrError('Please fill in all required fields marked with *.')
      }
      return
    }

    setBusyAddr('saving')
    setAddrError('')
    setAddrFieldErrors({})

    const payload = {
      label: addrForm.label,
      name: addrForm.name,
      recipientName: addrForm.name,
      phone: addrForm.phone,
      recipientPhone: addrForm.phone,
      email: addrForm.email,
      line1: addrForm.line1,
      line2: addrForm.line2,
      city: addrForm.city,
      state: addrForm.state,
      pin: addrForm.pin,
      country: addrForm.country,
      isDefault: addrForm.isDefault,
    }

    try {
      let updatedUser
      let updatedAddresses
      if (editingAddrId) {
        const res = await apiPut(`/customer/addresses/${editingAddrId}`, payload)
        updatedUser = res?.user
        updatedAddresses = res?.addresses
      } else {
        const res = await apiPost('/customer/addresses', payload)
        updatedUser = res?.user
        updatedAddresses = res?.addresses
      }

      if (updatedUser) {
        dispatch({ type: 'users/upsert', payload: updatedUser })
      } else if (updatedAddresses) {
        dispatch({
          type: 'users/upsert',
          payload: {
            ...user,
            addresses: updatedAddresses,
            address: updatedAddresses.find((a) => a.isDefault) || updatedAddresses[0] || user.address,
          },
        })
      }
      setAddressModalOpen(false)
    } catch (err) {
      setAddrError(err?.message || 'Failed to save address.')
    } finally {
      setBusyAddr(null)
    }
  }

  const handleDeleteAddress = async (addrId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return
    setBusyAddr(addrId)
    try {
      const res = await apiDelete(`/customer/addresses/${addrId}`)
      if (res?.user) {
        dispatch({ type: 'users/upsert', payload: res.user })
      }
    } catch (err) {
      alert(err?.message || 'Failed to delete address.')
    } finally {
      setBusyAddr(null)
    }
  }

  const handleSetDefaultAddress = async (addrId) => {
    setBusyAddr(addrId)
    try {
      const res = await apiPatch(`/customer/addresses/${addrId}/default`, {})
      if (res?.user) {
        dispatch({ type: 'users/upsert', payload: res.user })
      }
    } catch (err) {
      alert(err?.message || 'Failed to set default address.')
    } finally {
      setBusyAddr(null)
    }
  }

  // Profile Save
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileMsg({ type: '', text: '' })
    const errors = {}

    if (!profileName.trim()) errors.name = true
    if (!profileEmail.trim() || !profileEmail.includes('@')) errors.email = true
    if (profilePhone.trim()) {
      const clean = profilePhone.replace(/\D/g, '')
      if (clean.length !== 10) errors.phone = true
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors)
      if (errors.phone && Object.keys(errors).length === 1) {
        setProfileMsg({ type: 'error', text: 'Please enter a valid 10-digit mobile phone number.' })
      } else {
        setProfileMsg({ type: 'error', text: 'Please fill in required profile fields correctly.' })
      }
      return
    }

    setProfileErrors({})
    setSavingProfile(true)

    try {
      const res = await apiPatch('/customer/profile', {
        name: profileName,
        email: profileEmail,
        phone: profilePhone,
        avatar: profileAvatar,
      })

      if (res && res.user) {
        dispatch({
          type: 'users/upsert',
          payload: {
            ...user,
            ...res.user,
          },
        })
        setProfileMsg({ type: 'success', text: 'Profile updated successfully!' })
      } else {
        setProfileMsg({ type: 'success', text: 'Profile updated successfully!' })
      }
    } catch (err) {
      setProfileMsg({ type: 'error', text: err?.message || 'Failed to update profile.' })
    } finally {
      setSavingProfile(false)
    }
  }

  // Password Save
  const handleSavePassword = async (e) => {
    e.preventDefault()
    setPasswordMsg({ type: '', text: '' })
    const errors = {}

    if (!currentPassword) errors.current = true
    if (newPassword.length < 6) errors.new = true
    if (!confirmPassword || newPassword !== confirmPassword) errors.confirm = true

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors)
      if (errors.new) {
        setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters long.' })
      } else if (errors.confirm) {
        setPasswordMsg({ type: 'error', text: 'Passwords do not match.' })
      } else {
        setPasswordMsg({ type: 'error', text: 'Please enter your current password.' })
      }
      return
    }

    setPasswordErrors({})
    setSavingPassword(true)
    try {
      await apiPost('/customer/password', {
        currentPassword,
        newPassword,
        confirmPassword,
      })
      setPasswordMsg({ type: 'success', text: 'Password changed successfully!' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err?.message || 'Failed to change password.' })
    } finally {
      setSavingPassword(false)
    }
  }

  // Stepper Calculation Helper
  const getStepperStatus = (orderStatus) => {
    const s = (orderStatus || '').toLowerCase()
    if (s === 'delivered') return 4
    if (s === 'shipped' || s === 'in transit') return 3
    if (s === 'processing' || s === 'confirmed' || s === 'packed') return 2
    if (s === 'cancelled' || s === 'returned' || s === 'refunded') return 0
    return 1 // Order Placed (Pending)
  }

  const formatPlacedDate = (timestamp) => {
    if (!timestamp) return ''
    const d = new Date(timestamp)
    const day = String(d.getDate()).padStart(2, '0')
    const month = d.toLocaleString('en-US', { month: 'short' })
    const year = String(d.getFullYear()).slice(-2)
    const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    return `${day} ${month} ${year}, ${time}`
  }

  const formatShortDayMonth = (timestamp) => {
    if (!timestamp) return ''
    const d = new Date(timestamp)
    const day = String(d.getDate()).padStart(2, '0')
    const month = d.toLocaleString('en-US', { month: 'short' })
    return `${day} ${month}`
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] py-3 sm:py-6 md:py-10">
      <Seo
        title="My Account & Orders — EvaraNest"
        description="Manage your EvaraNest customer account, track your active orders, addresses and profile settings."
        canonical="/account"
        noindex={true}
      />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
      
      {/* Cancellation Notification Alert */}
      {cancelSuccessMsg && (
        <div className="mb-4 sm:mb-6 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4 text-[13px] font-medium text-emerald-900 shadow-xs">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-circle-check text-emerald-600 text-lg"></i>
            <span>{cancelSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setCancelSuccessMsg('')}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid gap-3.5 sm:gap-6 lg:grid-cols-[260px_1fr] items-start">
        
        {/* =================================================================== */}
        {/* LEFT SIDEBAR (Mobile: visible only when no activeTab; Desktop: always) */}
        {/* =================================================================== */}
        <aside className={`space-y-3 sm:space-y-4 ${activeTab ? 'hidden lg:block' : 'block'}`}>
          
          {/* User Profile Card */}
          <div className="relative rounded-2xl border border-gray-200 bg-white p-2.5 sm:p-4 lg:p-5 shadow-xs flex flex-row lg:flex-col items-center gap-3 lg:gap-0 lg:text-center">
            
            {/* Avatar Circle with Edit / Camera Upload Badge */}
            <div className="relative shrink-0 group">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
              <div
                onClick={() => avatarInputRef.current?.click()}
                className={`h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 shrink-0 aspect-square rounded-full overflow-hidden flex items-center justify-center font-bold text-[15px] sm:text-lg lg:text-xl shadow-xs cursor-pointer relative border border-gray-200/90 transition-transform active:scale-95 ${
                  user.avatar ? 'bg-white p-1' : 'bg-[#3B3486] text-white'
                }`}
                title="Click to upload profile picture"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-full w-full rounded-full object-contain"
                  />
                ) : (
                  <span className="leading-none select-none">{initials}</span>
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  </div>
                )}
              </div>

              {/* Small Edit/Camera Badge on Avatar */}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                title="Change photo"
                aria-label="Change photo"
                className="absolute -bottom-1 -right-1 h-5 w-5 sm:h-5.5 sm:w-5.5 rounded-full bg-[#5851DB] hover:bg-[#483fc9] text-white flex items-center justify-center shadow-xs border-2 border-white cursor-pointer transition-transform active:scale-90"
              >
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </button>
            </div>

            {/* Name & Contact Info */}
            <div className="min-w-0 flex-1 text-left lg:text-center lg:mt-3">
              <h2 className="text-[14px] sm:text-[16px] font-bold text-gray-900 truncate leading-tight">{user.name}</h2>
              <p className="text-[11px] sm:text-[12px] text-gray-600 truncate mt-0.5">{user.email}</p>
              {user.phone && <p className="text-[10.5px] sm:text-[11.5px] text-gray-500 mt-0.5">{user.phone}</p>}
            </div>

            {/* Edit Profile Rightmost Pencil Icon */}
            <button
              type="button"
              onClick={() => openTab('settings')}
              title="Edit Profile"
              aria-label="Edit Profile"
              className="lg:absolute lg:top-3.5 lg:right-3.5 shrink-0 h-7.5 w-7.5 sm:h-8 sm:w-8 rounded-full border border-gray-200 bg-gray-50/80 text-gray-500 hover:text-[#5851DB] hover:bg-[#F0EBFA] hover:border-[#D6BBFB] transition-all flex items-center justify-center shadow-2xs cursor-pointer active:scale-95"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>

          </div>

          {/* Navigation Menu */}
          <nav className="rounded-2xl border border-gray-200 bg-white p-2 shadow-xs space-y-0.5 text-[13px] font-medium">
            
            {/* My Orders */}
            <button
              type="button"
              onClick={() => openTab('orders')}
              className={`w-full flex items-center justify-between px-3.5 py-3 lg:py-2.5 rounded-xl transition-all cursor-pointer ${
                effectiveTab === 'orders'
                  ? 'bg-[#F0EBFA] text-[#5851DB] font-semibold'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 22V12" />
                </svg>
                My Orders
              </span>
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400 lg:hidden" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>

            {/* Wishlist */}
            <button
              type="button"
              onClick={() => openTab('wishlist')}
              className={`w-full flex items-center justify-between px-3.5 py-3 lg:py-2.5 rounded-xl transition-all cursor-pointer ${
                effectiveTab === 'wishlist'
                  ? 'bg-[#F0EBFA] text-[#5851DB] font-semibold'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
                Wishlist
              </span>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                  {state.wishlist.length}
                </span>
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400 lg:hidden" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            </button>

            {/* Addresses */}
            <button
              type="button"
              onClick={() => openTab('addresses')}
              className={`w-full flex items-center justify-between px-3.5 py-3 lg:py-2.5 rounded-xl transition-all cursor-pointer ${
                effectiveTab === 'addresses'
                  ? 'bg-[#F0EBFA] text-[#5851DB] font-semibold'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Addresses
              </span>
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400 lg:hidden" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>

            {/* Settings */}
            <button
              type="button"
              onClick={() => openTab('settings')}
              className={`w-full flex items-center justify-between px-3.5 py-3 lg:py-2.5 rounded-xl transition-all cursor-pointer ${
                effectiveTab === 'settings'
                  ? 'bg-[#F0EBFA] text-[#5851DB] font-semibold'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Settings
              </span>
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400 lg:hidden" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>

            {/* Help & Support */}
            <button
              type="button"
              onClick={() => openTab('support')}
              className={`w-full flex items-center justify-between px-3.5 py-3 lg:py-2.5 rounded-xl transition-all cursor-pointer ${
                effectiveTab === 'support'
                  ? 'bg-[#F0EBFA] text-[#5851DB] font-semibold'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                </svg>
                Help & Support
              </span>
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400 lg:hidden" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>

            {/* Log Out */}
            <div className="pt-1 border-t border-gray-200">
              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center gap-3 px-3.5 py-3 lg:py-2.5 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold transition-colors cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Log Out
              </button>
            </div>

          </nav>

          {/* Promotional Card Bottom */}
          <div className="overflow-hidden rounded-2xl border border-[#FDBA74] bg-linear-to-br from-[#FFF5ED] via-[#FFF9F5] to-white p-4 shadow-2xs relative flex items-center justify-between">
            <div className="z-10">
              <p className="text-[12.5px] font-bold leading-tight text-gray-900 max-w-[125px]">
                Spreading Warmth & Fragrance Across Every Home
              </p>
              <Link
                to="/collections/new-arrivals"
                className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#1F2937] px-3.5 py-1.5 text-[11px] font-semibold text-white hover:bg-black transition-colors shadow-2xs"
              >
                Shop Now →
              </Link>
            </div>
            <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl">
              <img
                src="/images/categories/candles.jpg"
                alt="Candle"
                className="h-full w-full object-cover rounded-xl"
              />
            </div>
          </div>

        </aside>

        {/* =================================================================== */}
        {/* RIGHT CONTENT AREA (Mobile: visible only when activeTab; Desktop: always) */}
        {/* =================================================================== */}
        <main className={`min-w-0 ${activeTab ? 'block' : 'hidden lg:block'}`}>

          {/* ----------------------------------------------------------------- */}
          {/* TAB: MY ORDERS                                                    */}
          {/* ----------------------------------------------------------------- */}
          {effectiveTab === 'orders' && (
            <div className="space-y-4 sm:space-y-5">
              
              {/* Header Title & Top Greeting Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={goBackToMenu}
                      className="lg:hidden shrink-0 h-7.5 w-7.5 rounded-full border border-gray-200 bg-white text-gray-700 shadow-2xs hover:bg-gray-50 flex items-center justify-center cursor-pointer active:scale-95"
                      title="Back to Account Menu"
                      aria-label="Back to Account Menu"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#5851DB]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </button>
                    <div>
                      <p className="text-[11px] sm:text-[12px] font-semibold text-[#5851DB] flex items-center gap-1.5">
                        <svg viewBox="0 0 24 24" className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
                        </svg>
                        My Account
                      </p>
                      <h1 className="text-[20px] sm:text-[26px] md:text-[30px] font-extrabold text-gray-900 tracking-tight leading-tight">
                        My Orders
                      </h1>
                    </div>
                  </div>
                  <p className="text-[11.5px] sm:text-[12.5px] text-gray-600 mt-0.5">
                    View, track and manage all your orders in one place.
                  </p>
                </div>

                {/* Right Thanks Greeting Banner */}
                <div className="hidden sm:flex items-center gap-3.5 rounded-2xl bg-[#F4F0FF] border border-[#D6BBFB] px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-2xs shrink-0">
                  <div className="grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-xl bg-white text-[#5851DB] shadow-2xs">
                    <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="8" width="18" height="4" rx="1" />
                      <path d="M12 8v13" />
                      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
                      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[12px] sm:text-[12.5px] font-bold text-gray-900">Thanks for being a part of EvaraNest!</p>
                    <p className="text-[11px] sm:text-[11.5px] text-gray-600 mt-0.5">Handcrafted with love, just for you.</p>
                  </div>
                </div>
              </div>

              {/* Filter Tabs & Search Row */}
              <div className="flex flex-col gap-2.5 pt-0.5">
                
                {/* Status Filter Pill Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar whitespace-nowrap shrink-0 py-0.5 -mx-1 px-1">
                  {[
                    { id: 'all', label: 'All', count: orderCounts.all },
                    { id: 'processing', label: 'Processing', count: orderCounts.processing },
                    { id: 'shipped', label: 'Shipped', count: orderCounts.shipped },
                    { id: 'delivered', label: 'Delivered', count: orderCounts.delivered },
                    { id: 'cancelled', label: 'Cancelled', count: orderCounts.cancelled },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setOrderFilter(tab.id)}
                      className={`rounded-xl px-3 py-1.5 text-[11.5px] sm:text-xs transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                        orderFilter === tab.id
                          ? 'bg-[#5851DB] text-white font-bold shadow-xs'
                          : 'bg-white border border-gray-200 text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10.5px] px-1.5 py-0.2 rounded-full font-bold ${
                          orderFilter === tab.id ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Search & Date Controls */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search order ID, product name..."
                      className="w-full rounded-xl border border-gray-250 bg-white pl-9 pr-3 py-1.5 sm:py-2 text-[11.5px] sm:text-xs font-medium text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#5851DB] focus:ring-1 focus:ring-[#5851DB]/20 transition-all"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center rounded-xl border border-gray-250 bg-white px-2.5 py-1.5 sm:py-2 text-[11.5px] sm:text-xs font-medium text-gray-700 shrink-0">
                    <select
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value)}
                      className="bg-transparent outline-none cursor-pointer text-[11.5px] sm:text-xs text-gray-800 font-medium pr-1"
                    >
                      <option value="6months">Last 6 Mos</option>
                      <option value="all">All Time</option>
                      <option value="year">Past Year</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Orders List */}
              {filteredOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 sm:p-12 text-center shadow-xs">
                  <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#F0EBFA] text-[#5851DB]">
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                      <path d="m3.3 7 8.7 5 8.7-5" />
                      <path d="M12 22V12" />
                    </svg>
                  </div>
                  <p className="text-[14px] sm:text-[15px] font-bold text-gray-900">No orders found</p>
                  <p className="text-[12px] sm:text-[12.5px] text-gray-600 mt-1 max-w-sm mx-auto">
                    {searchQuery
                      ? 'No orders matched your search criteria.'
                      : 'You haven’t placed any orders in this status category.'}
                  </p>
                  <Link
                    to="/collections/new-arrivals"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#5851DB] px-4 py-2 text-xs font-bold text-white hover:bg-[#483fc9] transition-colors shadow-2xs"
                  >
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {filteredOrders.map((o) => {
                    const payment = paymentOfOrder(state, o.id)
                    const refunds = refundsOfOrder(state, o.id)
                    const isPrepaid =
                      payment &&
                      (payment.status === 'Paid' ||
                        payment.status === 'Refund Pending' ||
                        (payment.method && payment.method !== 'COD' && payment.method !== 'Cash on delivery'))
                    const isPaid = Boolean((payment && payment.status === 'Paid') || isPrepaid || o.status === 'Delivered')
                    const isCancellable = o.status === 'Pending' || o.status === 'Confirmed'
                    const isRefunded = o.status === 'Refunded' || (payment && payment.status === 'Refunded')
                    const isCancelled = o.status === 'Cancelled'
                    const isExpanded = expandedOrderId === o.id
                    const stepNum = getStepperStatus(o.status)
                    const isDelivered = o.status === 'Delivered'
                    const latestRefund = refunds && refunds.length ? refunds[0] : null

                    // Price breakdown calculations
                    const calculatedSubtotal = o.subtotal || o.lines.reduce((n, l) => n + (l.price || 0) * (l.qty || 1), 0)
                    const shipping = typeof o.shipping === 'number' ? o.shipping : (calculatedSubtotal >= 999 ? 0 : 49)
                    const discount = typeof o.discount === 'number' ? o.discount : Math.max(0, calculatedSubtotal + shipping - o.total)

                    return (
                      <div
                        key={o.id}
                        className="rounded-2xl border border-gray-200/90 bg-white shadow-xs overflow-hidden transition-all"
                      >
                        {/* Order Header Row (Clickable to toggle accordion) */}
                        <div
                          onClick={() => toggleCollapse(o.id)}
                          className="p-3 sm:p-3.5 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-gray-50 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="text-[12.5px] sm:text-[13.5px] font-bold text-gray-900 tracking-tight">
                                Order #{o.id}
                              </h3>
                              {/* Status Badge */}
                              {isDelivered ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF3] border border-[#A6F4C5] px-1.5 sm:px-2 py-0.5 text-[9.5px] sm:text-[10px] font-bold text-[#027A48]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A]"></span>
                                  Delivered
                                </span>
                              ) : isRefunded ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3F2] border border-[#FECDCA] px-1.5 sm:px-2 py-0.5 text-[9.5px] sm:text-[10px] font-bold text-[#B42318]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#F04438]"></span>
                                  Refunded
                                </span>
                              ) : isCancelled ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3F2] border border-[#FECDCA] px-1.5 sm:px-2 py-0.5 text-[9.5px] sm:text-[10px] font-bold text-[#B42318]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#F04438]"></span>
                                  Cancelled
                                </span>
                              ) : o.status === 'Shipped' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#F0F9FF] border border-[#B9E6FE] px-1.5 sm:px-2 py-0.5 text-[9.5px] sm:text-[10px] font-bold text-[#026AA2]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#0BA5EC]"></span>
                                  Shipped
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF6EE] border border-[#FEE4E2] px-1.5 sm:px-2 py-0.5 text-[9.5px] sm:text-[10px] font-bold text-[#B54708]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#F79009]"></span>
                                  {o.status || 'Pending'}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] sm:text-[10.5px] text-gray-500 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>Placed on {formatPlacedDate(o.placedAt)}</span>
                              {o.deliveryDate && !isCancelled && !isRefunded && !isDelivered && (
                                <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-[9.5px]">
                                  📦 Est. Delivery: {new Date(o.deliveryDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto">
                            <div className="text-right">
                              <span className="text-[12.5px] sm:text-[14px] font-bold text-gray-900 block leading-tight">
                                {inr(o.total)}
                              </span>
                              <span className="text-[9.5px] sm:text-[10px] text-gray-500 font-medium">
                                {o.lines.length} {o.lines.length === 1 ? 'item' : 'items'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleCollapse(o.id)
                              }}
                              aria-label="Toggle order details"
                              className="h-6.5 w-6.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 flex items-center justify-center cursor-pointer transition-transform active:scale-95 shadow-2xs"
                              title={isExpanded ? 'Collapse details' : 'Expand details'}
                            >
                              <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m18 15-6-6-6 6" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Order Content */}
                        {isExpanded && (
                          <div className="p-3 sm:p-3.5 space-y-3">
                            
                            {/* Cancellation & Refund Alert for Cancelled / Refunded Orders */}
                            {(isCancelled || isRefunded) && (
                              <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-2.5 text-[10.5px] sm:text-[11.5px] text-amber-950">
                                <div className="flex items-center gap-2">
                                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-amber-700 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                  </svg>
                                  <span>
                                    {isRefunded || latestRefund?.status === 'Processed' ? (
                                      <strong className="text-emerald-800">
                                        Refund Processed: {inr(o.total)} credited to your original payment method.
                                      </strong>
                                    ) : latestRefund?.status === 'Rejected' ? (
                                      <strong className="text-red-800">Refund Request Declined by Admin.</strong>
                                    ) : isPrepaid ? (
                                      <strong>
                                        Prepaid Refund ({inr(o.total)}): Awaiting Admin Approval. Once approved, the amount will be credited to your account.
                                      </strong>
                                    ) : (
                                      <strong className="text-gray-800">
                                        Order has been cancelled.
                                      </strong>
                                    )}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Middle Row: Items & Stepper */}
                            <div className="grid gap-3 lg:grid-cols-[1.1fr_1.3fr] lg:items-center">
                              
                              {/* Product Items Thumbnails & Info */}
                              <div className="space-y-2 divide-y divide-gray-100">
                                {o.lines.map((l, idx) => (
                                  <div
                                    key={l.variantId || idx}
                                    className={`flex items-center gap-2.5 sm:gap-3 ${idx > 0 ? 'pt-2' : ''}`}
                                  >
                                    <div className="w-13 h-13 min-w-[52px] min-h-[52px] max-w-[52px] max-h-[52px] shrink-0 overflow-hidden rounded-xl bg-gray-50 border border-gray-200">
                                      <Img
                                        src={l.image}
                                        alt={l.title}
                                        width={100}
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[11.5px] sm:text-[12.5px] font-bold text-gray-900 truncate leading-snug">
                                        {l.title}
                                      </p>
                                      <p className="text-[10.5px] text-gray-500 font-medium mt-0.5">
                                        {l.size || 'One size'} • Qty: {l.qty}
                                      </p>
                                      <p className="text-[11.5px] font-bold text-gray-900 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                        <span>{inr(l.price * l.qty)}</span>
                                        <span className="text-[10px] text-gray-500 font-normal">
                                          ({inr(l.price)} × {l.qty})
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* 4-Step Visual Stepper */}
                              {!isCancelled && (
                                <div className="py-2 px-1 sm:px-2">
                                  <div className="relative flex items-center justify-between">
                                    
                                    {/* Background Connecting Gray Line */}
                                    <div className="absolute left-4 sm:left-6 right-4 sm:right-6 top-3 h-[2px] bg-gray-200 z-0">
                                      {/* Filled Green Progress Line */}
                                      <div
                                        className="h-full bg-[#12B76A] transition-all duration-500"
                                        style={{
                                          width:
                                            stepNum >= 4
                                              ? '100%'
                                              : stepNum === 3
                                              ? '66.6%'
                                              : stepNum === 2
                                              ? '33.3%'
                                              : '0%',
                                        }}
                                      ></div>
                                    </div>

                                    {/* Step 1: Order Placed */}
                                    <div className="relative z-10 flex flex-col items-center text-center shrink-0 w-12 sm:w-14">
                                      <div
                                        className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold shadow-2xs transition-colors ${
                                          stepNum >= 1
                                            ? 'bg-[#12B76A] text-white'
                                            : 'bg-gray-100 border border-gray-200 text-gray-400'
                                        }`}
                                      >
                                        {stepNum > 1 ? (
                                          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                          </svg>
                                        ) : (
                                          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="8" cy="21" r="1" />
                                            <circle cx="19" cy="21" r="1" />
                                            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                                          </svg>
                                        )}
                                      </div>
                                      <span className={`mt-1 text-[9.5px] sm:text-[10px] whitespace-nowrap ${stepNum >= 1 ? 'font-bold text-gray-900' : 'font-medium text-gray-500'}`}>
                                        Placed
                                      </span>
                                      <span className="text-[8.5px] sm:text-[9px] text-gray-400 font-medium whitespace-nowrap">
                                        {formatShortDayMonth(o.placedAt)}
                                      </span>
                                    </div>

                                    {/* Step 2: Processing */}
                                    <div className="relative z-10 flex flex-col items-center text-center shrink-0 w-12 sm:w-14">
                                      <div
                                        className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold shadow-2xs transition-colors ${
                                          stepNum >= 2
                                            ? 'bg-[#12B76A] text-white'
                                            : 'bg-gray-100 border border-gray-200 text-gray-400'
                                        }`}
                                      >
                                        {stepNum > 2 ? (
                                          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                          </svg>
                                        ) : (
                                          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                                            <path d="m3.3 7 8.7 5 8.7-5" />
                                            <path d="M12 22V12" />
                                          </svg>
                                        )}
                                      </div>
                                      <span
                                        className={`mt-1 text-[9.5px] sm:text-[10px] whitespace-nowrap ${
                                          stepNum >= 2 ? 'font-bold text-gray-900' : 'font-medium text-gray-500'
                                        }`}
                                      >
                                        Processing
                                      </span>
                                      <span className="text-[8.5px] sm:text-[9px] text-gray-400 font-medium whitespace-nowrap">
                                        {stepNum >= 2 ? formatShortDayMonth(o.placedAt) : ''}
                                      </span>
                                    </div>

                                    {/* Step 3: Shipped */}
                                    <div className="relative z-10 flex flex-col items-center text-center shrink-0 w-12 sm:w-14">
                                      <div
                                        className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold shadow-2xs transition-colors ${
                                          stepNum >= 3
                                            ? 'bg-[#12B76A] text-white'
                                            : 'bg-gray-100 border border-gray-200 text-gray-400'
                                        }`}
                                      >
                                        {stepNum > 3 ? (
                                          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                          </svg>
                                        ) : (
                                          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M10 17h4V5H2v12h3" />
                                            <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
                                            <circle cx="7.5" cy="17.5" r="2.5" />
                                            <circle cx="17.5" cy="17.5" r="2.5" />
                                          </svg>
                                        )}
                                      </div>
                                      <span
                                        className={`mt-1 text-[9.5px] sm:text-[10px] whitespace-nowrap ${
                                          stepNum >= 3 ? 'font-bold text-gray-900' : 'font-medium text-gray-500'
                                        }`}
                                      >
                                        Shipped
                                      </span>
                                      <span className="text-[8.5px] sm:text-[9px] text-gray-400 font-medium whitespace-nowrap">
                                        {stepNum >= 3 ? formatShortDayMonth(o.placedAt + 86400000) : ''}
                                      </span>
                                    </div>

                                    {/* Step 4: Delivered */}
                                    <div className="relative z-10 flex flex-col items-center text-center shrink-0 w-12 sm:w-14">
                                      <div
                                        className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold shadow-2xs transition-colors ${
                                          stepNum >= 4
                                            ? 'bg-[#12B76A] text-white'
                                            : 'bg-gray-100 border border-gray-200 text-gray-400'
                                        }`}
                                      >
                                        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                      </div>
                                      <span
                                        className={`mt-1 text-[9.5px] sm:text-[10px] whitespace-nowrap ${
                                          stepNum >= 4 ? 'font-bold text-gray-900' : 'font-medium text-gray-500'
                                        }`}
                                      >
                                        Delivered
                                      </span>
                                      <span className="text-[8.5px] sm:text-[9px] text-gray-400 font-medium whitespace-nowrap">
                                        {stepNum >= 4 ? formatShortDayMonth(o.placedAt + 259200000) : ''}
                                      </span>
                                    </div>

                                  </div>
                                </div>
                              )}

                            </div>

                            {/* Price Breakup Summary - Seamless directly in card */}
                            <div className="pt-2 border-t border-gray-100 text-[10.5px] sm:text-[11px] space-y-1">
                              <div className="flex items-center justify-between text-gray-500 font-medium">
                                <span>Items Subtotal</span>
                                <span className="text-gray-800 font-semibold">{inr(calculatedSubtotal)}</span>
                              </div>
                              {discount > 0 && (
                                <div className="flex items-center justify-between text-emerald-600 font-medium">
                                  <span>Discount {o.coupon ? `(${o.coupon})` : ''}</span>
                                  <span className="font-semibold">-{inr(discount)}</span>
                                </div>
                              )}
                              <div className="flex items-center justify-between text-gray-500 font-medium">
                                <span>Delivery Fee</span>
                                <span className="text-gray-800 font-semibold">
                                  {shipping === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : inr(shipping)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[11px] sm:text-[12px] font-bold text-gray-900">
                                <span>Total Amount</span>
                                <span className="text-[#5851DB]">{inr(o.total)}</span>
                              </div>
                            </div>

                            {/* Bottom Actions Row - Single inline line */}
                            <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-gray-100 flex-nowrap">
                              
                              {/* Left: Cancel Order (if eligible) or Empty Spacer */}
                              <div className="shrink-0">
                                {isCancellable ? (
                                  <button
                                    type="button"
                                    onClick={() => openCancelModal(o)}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 py-1.5 px-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                                  >
                                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <circle cx="12" cy="12" r="10" />
                                      <line x1="15" x2="9" y1="9" y2="15" />
                                      <line x1="9" x2="15" y1="9" y2="15" />
                                    </svg>
                                    <span>Cancel</span>
                                  </button>
                                ) : (
                                  <span />
                                )}
                              </div>

                              {/* Right: Action Buttons in strict single line */}
                              <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
                                {/* Invoice Button (Only if paid) */}
                                {isPaid && (
                                  <Link
                                    to={`/invoice/${o.id}?download=true`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 rounded-xl border border-gray-250 bg-white hover:bg-gray-50 px-2.5 sm:px-3 py-1.5 text-[11px] font-semibold text-gray-700 transition-colors shadow-2xs whitespace-nowrap"
                                    title="Download Tax Invoice"
                                  >
                                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#5851DB] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                      <polyline points="14 2 14 8 20 8" />
                                      <line x1="16" x2="8" y1="13" y2="13" />
                                      <line x1="16" x2="8" y1="17" y2="17" />
                                    </svg>
                                    <span>Invoice</span>
                                  </Link>
                                )}

                                {isDelivered ? (
                                  /* Buy Again Button (Primary for Delivered) */
                                  <button
                                    type="button"
                                    onClick={() => handleBuyAgain(o)}
                                    className="inline-flex items-center gap-1 rounded-xl bg-[#5851DB] hover:bg-[#483fc9] px-3 sm:px-3.5 py-1.5 text-[11px] font-bold text-white transition-all shadow-2xs cursor-pointer active:scale-95 whitespace-nowrap"
                                  >
                                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                                      <path d="M3 6h18" />
                                      <path d="M16 10a4 4 0 0 1-8 0" />
                                    </svg>
                                    <span>Buy Again</span>
                                  </button>
                                ) : !isCancelled ? (
                                  /* Track Order Button */
                                  <Link
                                    to={`/track/${o.id}`}
                                    className="inline-flex items-center gap-1 rounded-xl bg-[#5851DB] hover:bg-[#483fc9] px-3 sm:px-3.5 py-1.5 text-[11px] font-bold text-white transition-all shadow-2xs active:scale-95 whitespace-nowrap"
                                  >
                                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polygon points="3 11 22 2 13 21 11 13 3 11" />
                                    </svg>
                                    <span>Track</span>
                                  </Link>
                                ) : null}
                              </div>

                            </div>

                          </div>
                        )}

                      </div>
                    )
                  })}
                </div>
              )}

            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* TAB: WISHLIST                                                     */}
          {/* ----------------------------------------------------------------- */}
          {effectiveTab === 'wishlist' && (
            <div className="space-y-4 sm:space-y-6">
              <div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goBackToMenu}
                    className="lg:hidden shrink-0 h-7.5 w-7.5 rounded-full border border-gray-200 bg-white text-gray-700 shadow-2xs hover:bg-gray-50 flex items-center justify-center cursor-pointer active:scale-95"
                    title="Back to Account Menu"
                    aria-label="Back to Account Menu"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#5851DB]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <h1 className="text-[20px] sm:text-[26px] md:text-[30px] font-extrabold text-gray-900 tracking-tight leading-tight">
                    My Wishlist
                  </h1>
                </div>
                <p className="text-[11.5px] sm:text-[12.5px] text-gray-600 mt-0.5">
                  Products you have saved for later.
                </p>
              </div>

              {wishlistItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 sm:p-12 text-center">
                  <div className="mx-auto mb-2.5 sm:mb-3 grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-full bg-gray-50 text-gray-500">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    </svg>
                  </div>
                  <p className="text-[13.5px] sm:text-[14px] font-bold text-gray-900">Your wishlist is empty</p>
                  <p className="text-[11.5px] sm:text-[12.5px] text-gray-600 mt-0.5 sm:mt-1">Explore our collections and save your favorite candles.</p>
                  <Link
                    to="/collections/new-arrivals"
                    className="mt-3.5 sm:mt-4 inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-[#1F2937] px-3.5 sm:px-4 py-1.5 sm:py-2 text-[11.5px] sm:text-[12.5px] font-semibold text-white hover:bg-black transition-colors"
                  >
                    Explore Products
                  </Link>
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
                  {wishlistItems.map((p) => {
                    const imgUrl =
                      (typeof p.images?.[0] === 'object' ? p.images[0]?.url : p.images?.[0]) ||
                      p.image ||
                      p.imageUrl ||
                      ''
                    return (
                      <div
                        key={p.handle}
                        className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 shadow-xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="aspect-square w-full overflow-hidden rounded-xl bg-gray-50 border border-gray-100">
                            <Img src={imgUrl} alt={p.title} className="h-full w-full object-cover" />
                          </div>
                          <h3 className="mt-2 sm:mt-3 text-[12.5px] sm:text-[13.5px] font-bold text-gray-900 line-clamp-1">{p.title}</h3>
                          <p className="text-[12px] sm:text-[13px] font-bold text-[#5851DB] mt-0.5 sm:mt-1">{inr(p.price)}</p>
                        </div>
                        <div className="mt-3 sm:mt-4 flex items-center gap-1.5 sm:gap-2 pt-2.5 sm:pt-3 border-t border-gray-100">
                          <Link
                            to={`/products/${p.handle}`}
                            className="flex-1 text-center rounded-xl bg-[#5851DB] py-1.5 sm:py-2 text-[11px] sm:text-[12px] font-bold text-white hover:bg-[#483fc9] transition-colors"
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleRemoveWishlist(p.handle)}
                            className="p-1.5 sm:p-2 rounded-xl border border-gray-250 text-gray-500 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer"
                            title="Remove from wishlist"
                          >
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* TAB: ADDRESSES                                                    */}
          {/* ----------------------------------------------------------------- */}
          {effectiveTab === 'addresses' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={goBackToMenu}
                      className="lg:hidden shrink-0 h-7.5 w-7.5 rounded-full border border-gray-200 bg-white text-gray-700 shadow-2xs hover:bg-gray-50 flex items-center justify-center cursor-pointer active:scale-95"
                      title="Back to Account Menu"
                      aria-label="Back to Account Menu"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#5851DB]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </button>
                    <h1 className="text-[20px] sm:text-[26px] md:text-[30px] font-extrabold text-gray-900 tracking-tight leading-tight">
                      Saved Addresses
                    </h1>
                  </div>
                  <p className="text-[11.5px] sm:text-[12.5px] text-gray-600 mt-0.5">
                    Manage your delivery and billing addresses.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openAddAddressModal}
                  className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-[#1F2937] px-3 sm:px-4 py-1.5 sm:py-2 text-[11.5px] sm:text-[12.5px] font-semibold text-white hover:bg-black transition-colors cursor-pointer shadow-2xs"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Address
                </button>
              </div>

              {(!user.addresses || user.addresses.length === 0) && !user.address ? (
                <div className="rounded-2xl border border-dashed border-gray-300 p-8 sm:p-12 text-center bg-white">
                  <div className="mx-auto mb-2.5 sm:mb-3 grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-full bg-gray-50 text-gray-500">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <p className="text-[13.5px] sm:text-[14px] font-bold text-gray-900">No saved addresses</p>
                  <p className="mt-0.5 sm:mt-1 text-[11.5px] sm:text-[12.5px] text-gray-600">Add an address for fast and seamless checkout.</p>
                  <button
                    type="button"
                    onClick={openAddAddressModal}
                    className="mt-3.5 sm:mt-4 inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-[#1F2937] px-3.5 sm:px-4 py-1.5 sm:py-2 text-[11.5px] sm:text-[12.5px] font-semibold text-white hover:bg-black transition-colors cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add Address
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(user.addresses && user.addresses.length > 0
                    ? user.addresses
                    : user.address
                    ? [{ ...user.address, id: user.address.id || 'default', isDefault: true }]
                    : []
                  ).map((addr) => (
                    <div
                      key={addr.id}
                      className="relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-3.5 sm:p-5 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-md bg-gray-100 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-800">
                            {addr.label || 'Delivery Address'}
                          </span>
                          {addr.isDefault && (
                            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] sm:text-[10.5px] font-bold text-emerald-800 border border-emerald-300">
                              DEFAULT
                            </span>
                          )}
                        </div>

                        <p className="mt-2.5 sm:mt-3 text-[13px] sm:text-[13.5px] font-bold text-gray-900">
                          {addr.name || addr.recipientName || user.name}
                        </p>
                        <p className="mt-1 text-[11.5px] sm:text-[12.5px] leading-relaxed text-gray-700">
                          {addr.line1}
                          {addr.line2 && (
                            <>
                              <br />
                              {addr.line2}
                            </>
                          )}
                          <br />
                          {addr.city}, {addr.state} - {addr.pin}
                          <br />
                          {addr.country || 'India'}
                        </p>

                        {(addr.phone || addr.recipientPhone) && (
                          <p className="mt-2 sm:mt-2.5 text-[11px] sm:text-[12px] text-gray-600 font-medium flex items-center gap-1.5">
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                            {addr.phone || addr.recipientPhone}
                          </p>
                        )}
                      </div>

                      <div className="mt-3.5 sm:mt-5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2.5 sm:pt-3 text-[11px] sm:text-[11.5px] font-semibold">
                        <button
                          type="button"
                          onClick={() => openEditAddressModal(addr)}
                          className="text-gray-700 hover:text-gray-900 hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                        <span className="text-gray-300">•</span>
                        <button
                          type="button"
                          disabled={busyAddr === addr.id}
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="text-red-600 hover:text-red-800 hover:underline disabled:opacity-50 cursor-pointer"
                        >
                          Delete
                        </button>
                        {!addr.isDefault && (
                          <>
                            <span className="text-gray-300">•</span>
                            <button
                              type="button"
                              disabled={busyAddr === addr.id}
                              onClick={() => handleSetDefaultAddress(addr.id)}
                              className="text-[#5851DB] hover:underline disabled:opacity-50 cursor-pointer"
                            >
                              Set Default
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* TAB: SETTINGS                                                     */}
          {/* ----------------------------------------------------------------- */}
          {effectiveTab === 'settings' && (
            <div className="space-y-4 sm:space-y-6">
              <div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goBackToMenu}
                    className="lg:hidden shrink-0 h-7.5 w-7.5 rounded-full border border-gray-200 bg-white text-gray-700 shadow-2xs hover:bg-gray-50 flex items-center justify-center cursor-pointer active:scale-95"
                    title="Back to Account Menu"
                    aria-label="Back to Account Menu"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#5851DB]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <h1 className="text-[20px] sm:text-[26px] md:text-[30px] font-extrabold text-gray-900 tracking-tight leading-tight">
                    Profile Settings
                  </h1>
                </div>
                <p className="text-[11.5px] sm:text-[12.5px] text-gray-600 mt-0.5">
                  Manage your personal information and password security.
                </p>
              </div>

              {/* Personal Info Card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-xs">
                <h2 className="text-[14px] sm:text-[15px] font-bold text-gray-900">Personal Information</h2>
                {profileMsg.text && (
                  <div
                    className={`mt-2.5 sm:mt-3 rounded-xl p-2.5 sm:p-3 text-[11.5px] sm:text-[12.5px] font-medium ${
                      profileMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {profileMsg.text}
                  </div>
                )}
                <form onSubmit={handleSaveProfile} className="mt-3.5 sm:mt-5 space-y-3 sm:space-y-4">
                  <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[10.5px] sm:text-[11.5px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                        Full Name
                      </label>
                      <input
                        required
                        value={profileName}
                        onChange={(e) => {
                          setProfileName(e.target.value)
                          setProfileErrors((prev) => ({ ...prev, name: false }))
                          setProfileMsg({ type: '', text: '' })
                        }}
                        className={`w-full rounded-xl border px-3 sm:px-3.5 py-1.5 sm:py-2 text-[12px] sm:text-[13px] text-gray-900 outline-none transition-colors ${
                          profileErrors.name ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-250 focus:border-[#5851DB]'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] sm:text-[11.5px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        required
                        type="email"
                        value={profileEmail}
                        onChange={(e) => {
                          setProfileEmail(e.target.value)
                          setProfileErrors((prev) => ({ ...prev, email: false }))
                          setProfileMsg({ type: '', text: '' })
                        }}
                        className={`w-full rounded-xl border px-3 sm:px-3.5 py-1.5 sm:py-2 text-[12px] sm:text-[13px] text-gray-900 outline-none transition-colors ${
                          profileErrors.email ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-250 focus:border-[#5851DB]'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] sm:text-[11.5px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                        Mobile Phone
                      </label>
                      <input
                        type="tel"
                        maxLength={10}
                        value={profilePhone}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                          setProfilePhone(digits)
                          setProfileErrors((prev) => ({ ...prev, phone: false }))
                          setProfileMsg({ type: '', text: '' })
                        }}
                        placeholder="10-digit mobile number"
                        className={`w-full rounded-xl border px-3 sm:px-3.5 py-1.5 sm:py-2 text-[12px] sm:text-[13px] text-gray-900 outline-none transition-colors ${
                          profileErrors.phone ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-250 focus:border-[#5851DB]'
                        }`}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="rounded-xl bg-[#1F2937] px-4 sm:px-5 py-1.5 sm:py-2 text-[11.5px] sm:text-[12.5px] font-semibold text-white hover:bg-black transition-colors cursor-pointer shadow-2xs"
                  >
                    {savingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </form>
              </div>

              {/* Password Card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-xs">
                <h2 className="text-[14px] sm:text-[15px] font-bold text-gray-900">Change Password</h2>
                {passwordMsg.text && (
                  <div
                    className={`mt-2.5 sm:mt-3 rounded-xl p-2.5 sm:p-3 text-[11.5px] sm:text-[12.5px] font-medium ${
                      passwordMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {passwordMsg.text}
                  </div>
                )}
                <form onSubmit={handleSavePassword} className="mt-3.5 sm:mt-5 space-y-3 sm:space-y-4">
                  <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-[10.5px] sm:text-[11.5px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => {
                            setCurrentPassword(e.target.value)
                            setPasswordErrors((prev) => ({ ...prev, current: false }))
                            setPasswordMsg({ type: '', text: '' })
                          }}
                          className={`w-full rounded-xl border px-3 sm:px-3.5 py-1.5 sm:py-2 pr-8 text-[12px] sm:text-[13px] text-gray-900 outline-none transition-colors ${
                            passwordErrors.current ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-250 focus:border-[#5851DB]'
                          }`}
                          placeholder="Current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                        >
                          {showPassword ? (
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                              <line x1="2" y1="2" x2="22" y2="22" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10.5px] sm:text-[11.5px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                        New Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value)
                          setPasswordErrors((prev) => ({ ...prev, new: false }))
                          setPasswordMsg({ type: '', text: '' })
                        }}
                        className={`w-full rounded-xl border px-3 sm:px-3.5 py-1.5 sm:py-2 text-[12px] sm:text-[13px] text-gray-900 outline-none transition-colors ${
                          passwordErrors.new ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-250 focus:border-[#5851DB]'
                        }`}
                        placeholder="Min 6 chars"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] sm:text-[11.5px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                        Confirm Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)
                          setPasswordErrors((prev) => ({ ...prev, confirm: false }))
                          setPasswordMsg({ type: '', text: '' })
                        }}
                        className={`w-full rounded-xl border px-3 sm:px-3.5 py-1.5 sm:py-2 text-[12px] sm:text-[13px] text-gray-900 outline-none transition-colors ${
                          passwordErrors.confirm ? 'border-red-500 ring-1 ring-red-500/30' : 'border-gray-250 focus:border-[#5851DB]'
                        }`}
                        placeholder="Repeat password"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="rounded-xl bg-[#1F2937] px-4 sm:px-5 py-1.5 sm:py-2 text-[11.5px] sm:text-[12.5px] font-semibold text-white hover:bg-black transition-colors cursor-pointer shadow-2xs"
                  >
                    {savingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* TAB: HELP & SUPPORT                                               */}
          {/* ----------------------------------------------------------------- */}
          {effectiveTab === 'support' && (
            <div className="space-y-4 sm:space-y-6">
              <div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goBackToMenu}
                    className="lg:hidden shrink-0 h-7.5 w-7.5 rounded-full border border-gray-200 bg-white text-gray-700 shadow-2xs hover:bg-gray-50 flex items-center justify-center cursor-pointer active:scale-95"
                    title="Back to Account Menu"
                    aria-label="Back to Account Menu"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#5851DB]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <h1 className="text-[20px] sm:text-[26px] md:text-[30px] font-extrabold text-gray-900 tracking-tight leading-tight">
                    Help & Support
                  </h1>
                </div>
                <p className="text-[11.5px] sm:text-[12.5px] text-gray-600 mt-0.5">
                  We’re here to help you with your orders and queries.
                </p>
              </div>

              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-xs">
                  <div className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 text-base sm:text-lg mb-2.5 sm:mb-3">
                    <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 sm:w-5 sm:h-5" fill="currentColor">
                      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5v-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c.6.3 1.1.4 1.5.5a3.6 3.6 0 0 0 1.6.1 2.7 2.7 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3Z" />
                    </svg>
                  </div>
                  <h3 className="text-[13px] sm:text-[14px] font-bold text-gray-900">WhatsApp Support</h3>
                  <p className="text-[11px] sm:text-[12px] text-gray-600 mt-0.5 sm:mt-1">Get instant assistance from our customer care team.</p>
                  <a
                    href="https://wa.me/918565895895"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 sm:mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-[12px] font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                  >
                    Chat on WhatsApp
                  </a>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-xs">
                  <div className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl bg-purple-50 text-[#5851DB] text-base sm:text-lg mb-2.5 sm:mb-3">
                    <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                  <h3 className="text-[13px] sm:text-[14px] font-bold text-gray-900">Email Us</h3>
                  <p className="text-[11px] sm:text-[12px] text-gray-600 mt-0.5 sm:mt-1">Send your query and we will respond within 24 hours.</p>
                  <a
                    href="mailto:support@evaranest.com"
                    className="mt-3 sm:mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#5851DB] px-3.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-[12px] font-semibold text-white hover:bg-[#483fc9] transition-colors shadow-2xs"
                  >
                    support@evaranest.com
                  </a>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Trust Badges Footer Bar */}
      <div className="mt-14 pt-8 border-t border-gray-300/80 hidden sm:grid sm:grid-cols-2 md:grid-cols-5 gap-6 items-center">
        
        {/* Badge 1: Secure Shopping */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-[#F4F0FF] text-[#5851DB] flex items-center justify-center shadow-2xs">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <div>
            <h4 className="text-[12.5px] font-bold text-gray-900 leading-tight">Secure Shopping</h4>
            <p className="text-[11px] text-gray-600 mt-0.5">100% Safe & Secure</p>
          </div>
        </div>

        {/* Badge 2: Easy Returns */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-[#F4F0FF] text-[#5851DB] flex items-center justify-center shadow-2xs">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </div>
          <div>
            <h4 className="text-[12.5px] font-bold text-gray-900 leading-tight">Easy Returns</h4>
            <p className="text-[11px] text-gray-600 mt-0.5">Hassle-free process</p>
          </div>
        </div>

        {/* Badge 3: Customer Support */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-[#F4F0FF] text-[#5851DB] flex items-center justify-center shadow-2xs">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
          </div>
          <div>
            <h4 className="text-[12.5px] font-bold text-gray-900 leading-tight">Customer Support</h4>
            <p className="text-[11px] text-gray-600 mt-0.5">We're here to help</p>
          </div>
        </div>

        {/* Badge 4: Handcrafted with Love */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-[#F4F0FF] text-[#5851DB] flex items-center justify-center shadow-2xs">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </div>
          <div>
            <h4 className="text-[12.5px] font-bold text-gray-900 leading-tight">Handcrafted with Love</h4>
            <p className="text-[11px] text-gray-600 mt-0.5">Premium Quality</p>
          </div>
        </div>

        {/* Badge 5: Decorative Script */}
        <div className="col-span-2 md:col-span-1 text-right italic font-serif text-gray-400 text-xs hidden md:block">
          <p className="font-medium text-gray-700 font-sans not-italic text-[13px] tracking-wide">More than candles</p>
          <p className="text-[13px] text-gray-600 mt-0.5 font-serif italic">It’s a feeling ♡</p>
        </div>

      </div>

      </div>

      <Modal
        open={cancelModalOpen}
        onClose={() => !cancelling && setCancelModalOpen(false)}
        title={`Cancel Order #${selectedOrder?.id || ''}`}
      >
        {selectedOrder && (() => {
          const payment = paymentOfOrder(state, selectedOrder.id)
          const isPrepaid =
            payment &&
            (payment.status === 'Paid' ||
              (payment.method && payment.method !== 'COD' && payment.method !== 'Cash on delivery'))

          return (
            <div className="space-y-4 text-ink">
              
              {/* Summary Card */}
              <div className="rounded-xl border border-line/80 bg-chalk/40 p-3.5 flex items-center justify-between text-[12.5px]">
                <div>
                  <p className="font-bold text-ink">Order #{selectedOrder.id}</p>
                  <p className="text-[11px] text-muted">
                    {selectedOrder.lines.length} items • Placed {shortDate(selectedOrder.placedAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-ink">{inr(selectedOrder.total)}</p>
                  <span className="text-[10.5px] font-medium text-graphite">
                    {isPrepaid ? 'Prepaid (Online)' : 'Cash on Delivery'}
                  </span>
                </div>
              </div>

              {/* Notice Banner */}
              {isPrepaid ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[12px] text-amber-900">
                  <p className="font-bold flex items-center gap-1.5 text-amber-800">
                    <i className="fa-solid fa-circle-info"></i> Prepaid Order Refund Notice
                  </p>
                  <p className="mt-1 leading-relaxed">
                    This order of <strong>{inr(selectedOrder.total)}</strong> was paid online. Upon cancellation, your refund request will be submitted for <strong>Admin Approval</strong>. Once approved by the admin team, the full amount will be credited back to your original payment method.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-[12px] text-blue-900">
                  <p className="font-bold flex items-center gap-1.5 text-blue-800">
                    <i className="fa-solid fa-circle-info"></i> Cash on Delivery Order
                  </p>
                  <p className="mt-0.5 leading-relaxed">
                    No payment was deducted for this order. It will be cancelled immediately without any fee.
                  </p>
                </div>
              )}

              {/* Reason Selector */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-wider text-muted mb-1.5">
                  Reason for Cancellation <span className="text-red-500">*</span>
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-3.5 py-2 text-[13px] font-medium text-ink outline-none focus:border-brand"
                >
                  <option value="Ordered by mistake">Ordered by mistake</option>
                  <option value="Found a better price elsewhere">Found a better price elsewhere</option>
                  <option value="Want to change delivery address or phone">Want to change delivery address or phone</option>
                  <option value="Delivery time is too long">Delivery time is too long</option>
                  <option value="Duplicate order placed">Duplicate order placed</option>
                  <option value="Other reason">Other reason</option>
                </select>
              </div>

              {/* Additional Comments (Optional) */}
              <div>
                <label className="block text-[11.5px] font-bold uppercase tracking-wider text-muted mb-1.5">
                  Additional Details (Optional)
                </label>
                <textarea
                  rows={2}
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  placeholder="Tell us more about why you're cancelling..."
                  className="w-full rounded-xl border border-line bg-white px-3.5 py-2 text-[12.5px] font-medium text-ink outline-none focus:border-brand"
                />
              </div>

              {cancelError && <p className="text-[12px] font-semibold text-red-600">{cancelError}</p>}

              {/* Modal Action Buttons */}
              <div className="mt-5 flex justify-end gap-2.5 border-t border-line/70 pt-3.5">
                <Button variant="ghost" onClick={() => setCancelModalOpen(false)} disabled={cancelling}>
                  Keep Order
                </Button>
                <Button
                  onClick={handleConfirmCancel}
                  loading={cancelling}
                  loadingText="Cancelling..."
                  className="!bg-red-600 hover:!bg-red-700 !text-white"
                >
                  Confirm Cancellation
                </Button>
              </div>

            </div>
          )
        })()}
      </Modal>

      {/* ------------------------------------------------------------------ */}
      {/* ADD / EDIT ADDRESS MODAL                                           */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        open={addressModalOpen}
        onClose={() => !busyAddr && setAddressModalOpen(false)}
        title={editingAddrId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wider text-muted">
              Address Label
            </span>
            <select
              value={addrForm.label}
              onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })}
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2 text-[13px] font-medium text-ink outline-none focus:border-brand"
            >
              <option value="Home">Home</option>
              <option value="Work / Office">Work / Office</option>
              <option value="Studio">Studio</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wider text-muted">
                Recipient Name <span className="text-red-500">*</span>
              </span>
              <input
                required
                value={addrForm.name}
                onChange={(e) => {
                  setAddrForm({ ...addrForm, name: e.target.value })
                  setAddrFieldErrors((prev) => ({ ...prev, name: false }))
                  setAddrError('')
                }}
                placeholder="Recipient full name"
                className={`w-full rounded-xl border px-3.5 py-2 text-[13px] outline-none transition-colors ${
                  addrFieldErrors.name ? 'border-red-500 ring-1 ring-red-500/30' : 'border-line focus:border-brand'
                }`}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wider text-muted">
                Mobile Phone <span className="text-red-500">*</span>
              </span>
              <input
                required
                type="tel"
                maxLength={10}
                value={addrForm.phone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setAddrForm({ ...addrForm, phone: digits })
                  setAddrFieldErrors((prev) => ({ ...prev, phone: false }))
                  setAddrError('')
                }}
                placeholder="10-digit mobile number"
                className={`w-full rounded-xl border px-3.5 py-2 text-[13px] outline-none transition-colors ${
                  addrFieldErrors.phone ? 'border-red-500 ring-1 ring-red-500/30' : 'border-line focus:border-brand'
                }`}
              />
            </label>
          </div>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wider text-muted">
              Email Address (Optional)
            </span>
            <input
              type="email"
              value={addrForm.email}
              onChange={(e) => setAddrForm({ ...addrForm, email: e.target.value })}
              placeholder="Recipient email address"
              className="w-full rounded-xl border border-line px-3.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          </label>

          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
            <label className="block">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11.5px] font-bold uppercase tracking-wider text-muted">
                  Pincode <span className="text-red-500">*</span>
                  {pincodeCity && (
                    <span className="ml-1.5 font-semibold text-emerald-600 normal-case tracking-normal">
                      ({pincodeCity})
                    </span>
                  )}
                </span>
                {pincodeLoading && (
                  <span className="text-[11px] font-semibold text-brand flex items-center gap-1">
                    <i className="fa-solid fa-spinner animate-spin text-[10px]"></i> Fetching...
                  </span>
                )}
              </div>
              <input
                required
                maxLength={6}
                value={addrForm.pin}
                onChange={(e) => {
                  handlePincodeChange(e.target.value)
                  setAddrFieldErrors((prev) => ({ ...prev, pin: false }))
                  setAddrError('')
                }}
                placeholder="6-digit Pincode (e.g. 400001)"
                className={`w-full rounded-xl border px-3.5 py-2 text-[13px] font-semibold text-ink outline-none transition-colors ${
                  addrFieldErrors.pin ? 'border-red-500 ring-1 ring-red-500/30' : 'border-line focus:border-brand'
                }`}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wider text-muted">
                Country
              </span>
              <input
                value={addrForm.country}
                onChange={(e) => setAddrForm({ ...addrForm, country: e.target.value })}
                placeholder="India"
                className="w-full rounded-xl border border-line px-3.5 py-2 text-[13px] outline-none focus:border-brand"
              />
            </label>
          </div>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wider text-muted">
              Address Line 1 <span className="text-red-500">*</span>
            </span>
            <input
              required
              value={addrForm.line1}
              onChange={(e) => {
                setAddrForm({ ...addrForm, line1: e.target.value })
                setAddrFieldErrors((prev) => ({ ...prev, line1: false }))
                setAddrError('')
              }}
              placeholder="Flat, House no., Building, Company, Apartment"
              className={`w-full rounded-xl border px-3.5 py-2 text-[13px] outline-none transition-colors ${
                addrFieldErrors.line1 ? 'border-red-500 ring-1 ring-red-500/30' : 'border-line focus:border-brand'
              }`}
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wider text-muted">
              Address Line 2 (Area, Street, Landmark - Optional)
            </span>
            <input
              value={addrForm.line2}
              onChange={(e) => setAddrForm({ ...addrForm, line2: e.target.value })}
              placeholder="Area, Colony, Street, Sector, Village, Landmark"
              className="w-full rounded-xl border border-line px-3.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          </label>

          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wider text-muted">
                City / District <span className="text-red-500">*</span>
              </span>
              <input
                required
                value={addrForm.city}
                onChange={(e) => {
                  setAddrForm({ ...addrForm, city: e.target.value })
                  setAddrFieldErrors((prev) => ({ ...prev, city: false }))
                  setAddrError('')
                }}
                placeholder="e.g. Mumbai"
                className={`w-full rounded-xl border px-3.5 py-2 text-[13px] outline-none transition-colors ${
                  addrFieldErrors.city ? 'border-red-500 ring-1 ring-red-500/30' : 'border-line focus:border-brand'
                }`}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wider text-muted">
                State <span className="text-red-500">*</span>
              </span>
              <input
                required
                value={addrForm.state}
                onChange={(e) => {
                  setAddrForm({ ...addrForm, state: e.target.value })
                  setAddrFieldErrors((prev) => ({ ...prev, state: false }))
                  setAddrError('')
                }}
                placeholder="e.g. Maharashtra"
                className={`w-full rounded-xl border px-3.5 py-2 text-[13px] outline-none transition-colors ${
                  addrFieldErrors.state ? 'border-red-500 ring-1 ring-red-500/30' : 'border-line focus:border-brand'
                }`}
              />
            </label>
          </div>

          <label className="flex items-center gap-2.5 sm:col-span-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={addrForm.isDefault}
              onChange={(e) => setAddrForm({ ...addrForm, isDefault: e.target.checked })}
              className="h-4 w-4 rounded text-brand focus:ring-brand"
            />
            <span className="text-[12.5px] font-semibold text-ink">Set as my default delivery address</span>
          </label>

        </div>

        {addrError && <p className="mt-3 text-[12px] font-semibold text-red-600">{addrError}</p>}

        <div className="mt-5 flex justify-end gap-2.5 border-t border-line/70 pt-3.5">
          <Button variant="ghost" onClick={() => setAddressModalOpen(false)} disabled={busyAddr === 'saving'}>
            Cancel
          </Button>
          <Button onClick={handleSaveAddress} loading={busyAddr === 'saving'} loadingText="Saving...">
            Save Address
          </Button>
        </div>
      </Modal>

    </div>
  )
}
