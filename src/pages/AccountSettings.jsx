import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Modal, Button } from '../admin/ui.jsx'
import { useStore } from '../store/StoreContext.jsx'
import { userById } from '../store/selectors.js'
import { apiPost, apiPatch, apiPut, apiDelete } from '../lib/api.js'

export default function AccountSettings() {
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const user = userById(state, state.currentUserId)

  // Active Tab state: 'profile' | 'security' | 'addresses'
  const [activeTab, setActiveTab] = useState('profile')

  // Profile Form state
  const [profileName, setProfileName] = useState(user?.name || '')
  const [profileEmail, setProfileEmail] = useState(user?.email || '')
  const [profilePhone, setProfilePhone] = useState(user?.phone || '')
  const [profileAvatar, setProfileAvatar] = useState(user?.avatar || '')
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' })
  const [profileErrors, setProfileErrors] = useState({})
  const [savingProfile, setSavingProfile] = useState(false)

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' })
  const [passwordErrors, setPasswordErrors] = useState({})
  const [savingPassword, setSavingPassword] = useState(false)

  // Address Modal & Action states
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [editingAddrId, setEditingAddrId] = useState(null)
  const [busyAddr, setBusyAddr] = useState(null)
  const [addrError, setAddrError] = useState('')
  const [addrFieldErrors, setAddrFieldErrors] = useState({})
  const [pincodeLoading, setPincodeLoading] = useState(false)
  const [pincodeCity, setPincodeCity] = useState('')
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

  // Auto-fill all address fields (City, State, Country, Area/Line2) from Pincode
  const handlePincodeChange = async (pinVal) => {
    const rawPin = pinVal.replace(/\D/g, '').slice(0, 6)
    setAddrForm((prev) => ({ ...prev, pin: rawPin }))
    setPincodeCity('')
    if (addrFieldErrors.pin) setAddrFieldErrors((prev) => ({ ...prev, pin: false }))

    if (rawPin.length === 6) {
      setPincodeLoading(true)
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${rawPin}`)
        const data = await res.json()
        if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice?.length > 0) {
          const offices = data[0].PostOffice
          const po = offices[0]
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

  if (!user || user.role !== 'Customer') {
    return <Navigate to="/login" replace state={{ from: { pathname: '/account/settings' } }} />
  }

  const initials = (user.name || user.email || 'User')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setProfileMsg({ type: 'error', text: 'Image size must be less than 2MB.' })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result
      setProfileAvatar(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveAvatar = () => {
    setProfileAvatar('')
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileMsg({ type: '', text: '' })
    const errs = {}
    if (!profileName.trim()) {
      errs.name = true
      setProfileMsg({ type: 'error', text: 'Please enter your full name.' })
      setProfileErrors(errs)
      return
    }
    if (profilePhone) {
      const clean = profilePhone.replace(/\D/g, '')
      if (clean.length !== 10) {
        errs.phone = true
        setProfileMsg({ type: 'error', text: 'Please enter a valid 10-digit mobile number.' })
        setProfileErrors(errs)
        return
      }
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

  const handleSavePassword = async (e) => {
    e.preventDefault()
    setPasswordMsg({ type: '', text: '' })
    const errs = {}

    if (!currentPassword) {
      errs.current = true
      setPasswordMsg({ type: 'error', text: 'Please enter your current password.' })
      setPasswordErrors(errs)
      return
    }

    if (newPassword.length < 6) {
      errs.new = true
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters long.' })
      setPasswordErrors(errs)
      return
    }

    if (newPassword !== confirmPassword) {
      errs.confirm = true
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' })
      setPasswordErrors(errs)
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

  const openAddAddressModal = () => {
    setEditingAddrId(null)
    setAddrError('')
    setAddrFieldErrors({})
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
    const errs = {}
    if (!addrForm.name?.trim()) errs.name = true
    if (!addrForm.phone?.trim()) errs.phone = true
    else {
      const cleanP = addrForm.phone.replace(/\D/g, '')
      if (cleanP.length !== 10) errs.phone = true
    }
    if (!addrForm.line1?.trim()) errs.line1 = true
    if (!addrForm.city?.trim()) errs.city = true
    if (!addrForm.state?.trim()) errs.state = true
    if (!addrForm.pin?.trim() || addrForm.pin.replace(/\D/g, '').length !== 6) errs.pin = true

    if (Object.keys(errs).length > 0) {
      setAddrFieldErrors(errs)
      if (errs.phone && addrForm.phone?.trim()) {
        setAddrError('Please enter a valid 10-digit mobile number.')
      } else if (errs.pin && addrForm.pin?.trim()) {
        setAddrError('Please enter a valid 6-digit pincode.')
      } else {
        setAddrError('Please fill in all required fields.')
      }
      return
    }

    setAddrFieldErrors({})
    setBusyAddr('saving')
    setAddrError('')

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

  return (
    <div className="container py-8 md:py-12">
      {/* Back Link & Title */}
      <div className="mb-6">
        <Link
          to="/account"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted hover:text-ink transition-colors mb-3"
        >
          <i className="fa-solid fa-arrow-left text-[11px]"></i> Back to My Account
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-[26px] uppercase leading-none md:text-[34px] tracking-tight text-ink">
              Account Settings
            </h1>
            <p className="mt-1.5 text-[13px] text-muted">
              Manage your personal info, security preferences, and delivery addresses
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Settings Tabs">
          
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 py-3.5 text-[13px] transition-all ${
              activeTab === 'profile'
                ? 'border-b-2 border-brand font-bold text-brand -mb-px'
                : 'border-b-2 border-transparent font-medium text-muted hover:border-gray-300 hover:text-ink'
            }`}
          >
            <i className="fa-regular fa-user text-[13px]"></i>
            Profile & Info
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 py-3.5 text-[13px] transition-all ${
              activeTab === 'security'
                ? 'border-b-2 border-brand font-bold text-brand -mb-px'
                : 'border-b-2 border-transparent font-medium text-muted hover:border-gray-300 hover:text-ink'
            }`}
          >
            <i className="fa-solid fa-lock text-[13px]"></i>
            Security & Password
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('addresses')}
            className={`flex items-center gap-2 py-3.5 text-[13px] transition-all ${
              activeTab === 'addresses'
                ? 'border-b-2 border-brand font-bold text-brand -mb-px'
                : 'border-b-2 border-transparent font-medium text-muted hover:border-gray-300 hover:text-ink'
            }`}
          >
            <i className="fa-solid fa-location-dot text-[13px]"></i>
            Saved Addresses
          </button>

        </nav>
      </div>

      {/* Tab Content Body */}
      <div className="mt-8">
        
        {/* ================================================================ */}
        {/* TAB 1: PROFILE & PERSONAL INFO                                   */}
        {/* ================================================================ */}
        {activeTab === 'profile' && (
          <div className="rounded-2xl border border-line/80 bg-white p-6 md:p-8 shadow-xs">
            <h2 className="text-[16px] font-bold text-ink">Personal Information</h2>
            <p className="mt-1 text-[12.5px] text-muted">
              Update your photo, full name, email address and contact details.
            </p>

            {profileMsg.text && (
              <div
                className={`mt-4 rounded-xl p-3 text-[12.5px] font-medium ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {profileMsg.text}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="mt-6 space-y-6">
              
              {/* Profile Avatar Section */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 rounded-xl border border-line/70 bg-chalk/40 p-4">
                <div className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-full ring-4 ring-white shadow-sm grid place-items-center border border-gray-200 ${
                  profileAvatar ? 'bg-white p-1' : 'bg-forest'
                }`}>
                  {profileAvatar ? (
                    <img
                      src={profileAvatar}
                      alt="Profile Avatar"
                      className="h-full w-full rounded-full object-contain"
                    />
                  ) : (
                    <span className="text-xl font-bold text-lime">{initials}</span>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <p className="text-[13px] font-bold text-ink">Profile Picture</p>
                  <p className="text-[11.5px] text-muted">
                    JPG, PNG or GIF. Max file size: 2MB.
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
                    <label className="cursor-pointer rounded-lg bg-ink px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-black transition-colors">
                      Upload New Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>
                    {profileAvatar && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Input Fields Grid */}
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-[12px] font-bold uppercase tracking-wider text-muted mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => {
                      setProfileName(e.target.value)
                      if (profileErrors.name) setProfileErrors((prev) => ({ ...prev, name: false }))
                    }}
                    className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-[13.5px] font-medium text-ink outline-none transition-colors ${
                      profileErrors.name
                        ? 'border-red-500 ring-1 ring-red-500/30'
                        : 'border-line focus:border-brand focus:ring-2 focus:ring-brand/10'
                    }`}
                    placeholder="Your full name"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wider text-muted mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={profileEmail}
                    onChange={(e) => {
                      setProfileEmail(e.target.value)
                      if (profileErrors.email) setProfileErrors((prev) => ({ ...prev, email: false }))
                    }}
                    className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-[13.5px] font-medium text-ink outline-none transition-colors ${
                      profileErrors.email
                        ? 'border-red-500 ring-1 ring-red-500/30'
                        : 'border-line focus:border-brand focus:ring-2 focus:ring-brand/10'
                    }`}
                    placeholder="your.email@example.com"
                  />
                </div>

                {/* Mobile Phone */}
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wider text-muted mb-1.5">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={profilePhone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                      setProfilePhone(digits)
                      if (profileErrors.phone) setProfileErrors((prev) => ({ ...prev, phone: false }))
                    }}
                    className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-[13.5px] font-medium text-ink outline-none transition-colors ${
                      profileErrors.phone
                        ? 'border-red-500 ring-1 ring-red-500/30'
                        : 'border-line focus:border-brand focus:ring-2 focus:ring-brand/10'
                    }`}
                    placeholder="10-digit mobile number"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-xl bg-ink px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-black transition-colors disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>

            </form>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 2: SECURITY & PASSWORD                                       */}
        {/* ================================================================ */}
        {activeTab === 'security' && (
          <div className="rounded-2xl border border-line/80 bg-white p-6 md:p-8 shadow-xs">
            <h2 className="text-[16px] font-bold text-ink">Change Password</h2>
            <p className="mt-1 text-[12.5px] text-muted">
              Keep your account secure with a strong password. Minimum 6 characters.
            </p>

            {passwordMsg.text && (
              <div
                className={`mt-4 rounded-xl p-3 text-[12.5px] font-medium ${
                  passwordMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handleSavePassword} className="mt-6 space-y-5">
              
              <div className="grid gap-5 sm:grid-cols-3">
                {/* Current Password */}
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wider text-muted mb-1.5">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value)
                        if (passwordErrors.current) setPasswordErrors((prev) => ({ ...prev, current: false }))
                      }}
                      className={`w-full rounded-xl border bg-white px-3.5 py-2.5 pr-10 text-[13.5px] font-medium text-ink outline-none transition-colors ${
                        passwordErrors.current
                          ? 'border-red-500 ring-1 ring-red-500/30'
                          : 'border-line focus:border-brand focus:ring-2 focus:ring-brand/10'
                      }`}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                    >
                      <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wider text-muted mb-1.5">
                    New Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      if (passwordErrors.new) setPasswordErrors((prev) => ({ ...prev, new: false }))
                    }}
                    className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-[13.5px] font-medium text-ink outline-none transition-colors ${
                      passwordErrors.new
                        ? 'border-red-500 ring-1 ring-red-500/30'
                        : 'border-line focus:border-brand focus:ring-2 focus:ring-brand/10'
                    }`}
                    placeholder="Enter new password (min 6 chars)"
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-[12px] font-bold uppercase tracking-wider text-muted mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (passwordErrors.confirm) setPasswordErrors((prev) => ({ ...prev, confirm: false }))
                    }}
                    className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-[13.5px] font-medium text-ink outline-none transition-colors ${
                      passwordErrors.confirm
                        ? 'border-red-500 ring-1 ring-red-500/30'
                        : 'border-line focus:border-brand focus:ring-2 focus:ring-brand/10'
                    }`}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword || !newPassword}
                  className="rounded-xl bg-ink px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-black transition-colors disabled:opacity-50"
                >
                  {savingPassword ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>

            </form>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 3: SAVED ADDRESSES                                           */}
        {/* ================================================================ */}
        {activeTab === 'addresses' && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-[16px] font-bold text-ink">Delivery Addresses</h2>
                <p className="text-[12.5px] text-muted">
                  Add or edit your shipping and billing delivery addresses.
                </p>
              </div>
              <button
                type="button"
                onClick={openAddAddressModal}
                className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-black transition-colors"
              >
                <i className="fa-solid fa-plus text-xs"></i>
                Add New Address
              </button>
            </div>

            {(!user.addresses || user.addresses.length === 0) && !user.address ? (
              <div className="rounded-2xl border border-dashed border-line p-12 text-center bg-white">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-chalk text-muted">
                  <i className="fa-solid fa-location-dot text-lg"></i>
                </div>
                <p className="text-[14px] font-bold text-ink">No saved addresses</p>
                <p className="mt-1 text-[12.5px] text-muted">
                  Add an address now for faster and smoother checkout on future orders.
                </p>
                <button
                  type="button"
                  onClick={openAddAddressModal}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-black transition-colors"
                >
                  <i className="fa-solid fa-plus text-xs"></i> Add Address
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(user.addresses && user.addresses.length > 0
                  ? user.addresses
                  : user.address
                  ? [{ ...user.address, id: user.address.id || 'default', isDefault: true }]
                  : []
                ).map((addr) => (
                  <div
                    key={addr.id}
                    className="relative flex flex-col justify-between rounded-2xl border border-line/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-md bg-chalk px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-graphite">
                          {addr.label || 'Delivery Address'}
                        </span>
                        {addr.isDefault && (
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 border border-emerald-200">
                            DEFAULT
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-[13.5px] font-bold text-ink">
                        {addr.name || addr.recipientName || user.name}
                      </p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-graphite">
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
                        <p className="mt-2.5 text-[12px] text-muted flex items-center gap-1.5">
                          <i className="fa-solid fa-phone text-[10px]"></i>
                          {addr.phone || addr.recipientPhone}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line/70 pt-3 text-[11.5px] font-semibold">
                      <button
                        type="button"
                        onClick={() => openEditAddressModal(addr)}
                        className="text-graphite hover:text-ink hover:underline"
                      >
                        Edit
                      </button>
                      <span className="text-line">•</span>
                      <button
                        type="button"
                        disabled={busyAddr === addr.id}
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="text-red-600 hover:text-red-800 hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                      {!addr.isDefault && (
                        <>
                          <span className="text-line">•</span>
                          <button
                            type="button"
                            disabled={busyAddr === addr.id}
                            onClick={() => handleSetDefaultAddress(addr.id)}
                            className="text-brand hover:underline disabled:opacity-50"
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

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* ADD / EDIT ADDRESS MODAL                                           */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        open={addressModalOpen}
        onClose={() => !busyAddr && setAddressModalOpen(false)}
        title={editingAddrId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          
          {/* Address Label Dropdown */}
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

          {/* Recipient Name and Mobile Phone in 1 row */}
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
                  if (addrFieldErrors.name) setAddrFieldErrors((prev) => ({ ...prev, name: false }))
                }}
                placeholder="Recipient full name"
                className={`w-full rounded-xl border px-3.5 py-2 text-[13px] outline-none transition-colors ${
                  addrFieldErrors.name
                    ? 'border-red-500 ring-1 ring-red-500/30'
                    : 'border-line focus:border-brand'
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
                  if (addrFieldErrors.phone) setAddrFieldErrors((prev) => ({ ...prev, phone: false }))
                }}
                placeholder="10-digit mobile number"
                className={`w-full rounded-xl border px-3.5 py-2 text-[13px] outline-none transition-colors ${
                  addrFieldErrors.phone
                    ? 'border-red-500 ring-1 ring-red-500/30'
                    : 'border-line focus:border-brand'
                }`}
              />
            </label>
          </div>

          {/* Email Address */}
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

          {/* Pincode & Country (Pincode First with Auto-Fill) */}
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
                onChange={(e) => handlePincodeChange(e.target.value)}
                placeholder="6-digit Pincode (e.g. 400001)"
                className={`w-full rounded-xl border px-3.5 py-2 text-[13px] font-semibold text-ink outline-none transition-colors ${
                  addrFieldErrors.pin
                    ? 'border-red-500 ring-1 ring-red-500/30'
                    : 'border-line focus:border-brand'
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

          {/* Address Line 1 */}
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wider text-muted">
              Address Line 1 <span className="text-red-500">*</span>
            </span>
            <input
              required
              value={addrForm.line1}
              onChange={(e) => {
                setAddrForm({ ...addrForm, line1: e.target.value })
                if (addrFieldErrors.line1) setAddrFieldErrors((prev) => ({ ...prev, line1: false }))
              }}
              placeholder="Flat, House no., Building, Company, Apartment"
              className={`w-full rounded-xl border px-3.5 py-2 text-[13px] outline-none transition-colors ${
                addrFieldErrors.line1
                  ? 'border-red-500 ring-1 ring-red-500/30'
                  : 'border-line focus:border-brand'
              }`}
            />
          </label>

          {/* Address Line 2 */}
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

          {/* City & State (Auto-filled from Pincode) */}
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
                  if (addrFieldErrors.city) setAddrFieldErrors((prev) => ({ ...prev, city: false }))
                }}
                placeholder="e.g. Mumbai"
                className={`w-full rounded-xl border px-3.5 py-2 text-[13px] outline-none transition-colors ${
                  addrFieldErrors.city
                    ? 'border-red-500 ring-1 ring-red-500/30'
                    : 'border-line focus:border-brand'
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
                  if (addrFieldErrors.state) setAddrFieldErrors((prev) => ({ ...prev, state: false }))
                }}
                placeholder="e.g. Maharashtra"
                className={`w-full rounded-xl border px-3.5 py-2 text-[13px] outline-none transition-colors ${
                  addrFieldErrors.state
                    ? 'border-red-500 ring-1 ring-red-500/30'
                    : 'border-line focus:border-brand'
                }`}
              />
            </label>
          </div>

          {/* Default Address Checkbox */}
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

        {addrError && (
          <p className="mt-3 text-[12px] font-semibold text-red-600">{addrError}</p>
        )}

        <div className="mt-6 flex justify-end gap-2.5 border-t border-line/70 pt-4">
          <Button
            variant="ghost"
            onClick={() => setAddressModalOpen(false)}
            disabled={busyAddr === 'saving'}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveAddress}
            loading={busyAddr === 'saving'}
            loadingText="Saving..."
          >
            Save Address
          </Button>
        </div>
      </Modal>

    </div>
  )
}
