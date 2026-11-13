import { useEffect, useState } from 'react'
import { useStore } from '../store/StoreContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { adminUser } from '../store/selectors.js'
import { DEMO_ADMIN_PASSWORD } from '../store/seed.js'
import { apiGet, apiPatch, apiPost } from '../lib/api.js'
import { Badge, Button, Field, Input, PageHeader } from './ui.jsx'

export default function AdminProfile() {
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const session = adminUser(state)

  const [name, setName] = useState(session?.name || '')
  const [email, setEmail] = useState(session?.email || '')
  const [phone, setPhone] = useState(session?.phone || '')
  const [avatar, setAvatar] = useState(session?.avatar || '')
  const [avatarTab, setAvatarTab] = useState('upload') // 'upload' | 'url'
  const [dragActive, setDragActive] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [loadingDb, setLoadingDb] = useState(true)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [passError, setPassError] = useState('')
  const [savingPass, setSavingPass] = useState(false)

  // Fetch fresh values directly from the database on component load
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const json = await apiGet('/auth/me', { auth: true })
        if (cancelled) return
        const u = json.data?.user
        if (u) {
          setName(u.name || '')
          setEmail(u.email || '')
          setPhone(u.phone || '')
          setAvatar(u.avatar || '')
          dispatch({ type: 'user/ensure', user: u })
        }
      } catch {
        // Fallback to local session
      } finally {
        if (!cancelled) setLoadingDb(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [dispatch])

  const initials = (name || 'AD')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleAvatarFile = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      notify('Please select a valid image file (PNG, JPG, SVG, WebP, etc.).')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatar(e.target.result)
      notify('Avatar loaded. Click "Save Profile Details" to save to database.')
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!session) return
    if (!name.trim()) {
      notify('Name cannot be empty.')
      return
    }
    if (!email.trim()) {
      notify('Email cannot be empty.')
      return
    }

    setSavingProfile(true)
    const patch = { name: name.trim(), email: email.trim(), phone: phone.trim(), avatar: avatar.trim() }

    try {
      const json = await apiPatch('/auth/profile', patch, { auth: true })
      const updatedUser = json.data?.user
      if (updatedUser) {
        dispatch({
          type: 'user/ensure',
          user: updatedUser,
        })
      }
      notify(json.message || 'Profile successfully saved to database.')
    } catch (err) {
      // Offline fallback
      dispatch({
        type: 'user/update',
        id: session.id,
        patch,
      })
      notify(err.message || 'Profile saved.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!session) return
    setPassError('')

    if (!currentPassword) {
      setPassError('Please enter your current password.')
      return
    }
    if (!newPassword || newPassword.length < 6) {
      setPassError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.')
      return
    }

    setSavingPass(true)
    try {
      const json = await apiPost('/auth/password', { currentPassword, newPassword }, { auth: true })
      dispatch({
        type: 'user/update',
        id: session.id,
        patch: { password: newPassword },
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      notify(json.message || 'Password changed in database successfully.')
    } catch (err) {
      setPassError(err.message || 'Unable to change password in database.')
    } finally {
      setSavingPass(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1360px] space-y-6">
      <PageHeader
        title="Account & Profile Settings"
        sub="Manage your personal details, profile appearance, and login credentials."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 items-stretch">
        {/* COLUMN 1: Profile Summary / Identity Card */}
        <div className="flex flex-col justify-between rounded-xl border border-[#D5D1C8] bg-white p-5 sm:p-6 shadow-xs">
          <div>
            <div className="flex flex-col items-center text-center">
              <div className={`relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full text-2xl font-bold shadow-md ring-4 ring-white border border-[#D5D1C8] ${
                avatar ? 'bg-white p-1' : 'bg-[#181A4E] text-lime'
              }`}>
                {avatar ? (
                  <img src={avatar} alt={name} className="h-full w-full rounded-full object-contain" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <h2 className="mt-3.5 text-[17px] font-bold text-ink">{name || 'Admin User'}</h2>
              <p className="text-[12px] font-medium text-graphite">{email}</p>

              <div className="mt-2.5 flex items-center gap-2">
                <Badge tone="Active">{session?.role || 'Admin'}</Badge>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-2 border-t border-[#DCD8CF] pt-4 text-[12px]">
              <div className="flex items-center justify-between py-1">
                <span className="font-medium text-graphite">User ID</span>
                <span className="font-mono text-[11px] font-semibold text-ink bg-chalk px-2 py-0.5 rounded">
                  {session?.id}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="font-medium text-graphite">Access Level</span>
                <span className="font-semibold text-ink">Super Administrator</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="font-medium text-graphite">Phone Number</span>
                <span className="font-medium text-ink">{phone || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="font-medium text-graphite">Panel Scope</span>
                <span className="font-semibold text-forest">Full Back Office</span>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-lg bg-chalk/80 p-3 text-[11px] text-graphite border border-[#D5D1C8]/60">
            💡 Changes made here apply immediately to your active session and top header.
          </div>
        </div>

        {/* COLUMN 2: Personal Details Card */}
        <div className="flex flex-col justify-between overflow-hidden rounded-xl border border-[#D5D1C8] bg-white shadow-xs">
          <header className="border-b border-[#DCD8CF] px-4 py-3 sm:px-5">
            <h2 className="text-[13.5px] font-semibold text-ink">Personal Details</h2>
          </header>

          <form onSubmit={handleSaveProfile} className="flex flex-1 flex-col justify-between p-4 sm:p-5">
            <div className="space-y-3.5">
              <Field label="Full Name">
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </Field>

              <Field label="Email Address">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@evaranest.in"
                  required
                />
              </Field>

              <Field label="Phone Number">
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 90000 00000"
                />
              </Field>

              {/* Profile Avatar with Manual Upload & URL */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider2 text-graphite">
                    Profile Avatar
                  </span>
                  <div className="flex items-center rounded-md border border-[#D5D1C8] bg-chalk/60 p-0.5 text-[10px] font-medium">
                    <button
                      type="button"
                      onClick={() => setAvatarTab('upload')}
                      className={`rounded px-2 py-0.5 transition-colors ${
                        avatarTab === 'upload' ? 'bg-forest text-white font-semibold shadow-xs' : 'text-graphite hover:text-ink'
                      }`}
                    >
                      📁 Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarTab('url')}
                      className={`rounded px-2 py-0.5 transition-colors ${
                        avatarTab === 'url' ? 'bg-forest text-white font-semibold shadow-xs' : 'text-graphite hover:text-ink'
                      }`}
                    >
                      🔗 Link URL
                    </button>
                  </div>
                </div>

                {avatarTab === 'upload' ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragActive(true)
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      setDragActive(false)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setDragActive(false)
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleAvatarFile(e.dataTransfer.files[0])
                      }
                    }}
                    className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-3 text-center transition-all ${
                      dragActive ? 'border-forest bg-[#4849E8]/5' : 'border-[#CBC8C1] bg-chalk/20 hover:border-forest/50'
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleAvatarFile(e.target.files[0])
                        }
                      }}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                    <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
                      <span>🖼️ Click or drag photo here</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-graphite">PNG, JPG, SVG, WebP (Max ~2MB)</p>
                  </div>
                ) : (
                  <Input
                    type="url"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="https://... or /images/..."
                  />
                )}

                {avatar && (
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className="font-medium text-emerald-700">✓ Avatar selected</span>
                    <button
                      type="button"
                      onClick={() => setAvatar('')}
                      className="text-sale hover:underline"
                    >
                      Remove photo
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#DCD8CF]">
              <Button type="submit" className="w-full" loading={savingProfile} loadingText="Saving Details...">
                Save Profile Details
              </Button>
            </div>
          </form>
        </div>

        {/* COLUMN 3: Security & Password Card */}
        <div className="flex flex-col justify-between overflow-hidden rounded-xl border border-[#D5D1C8] bg-white shadow-xs">
          <header className="border-b border-[#DCD8CF] px-4 py-3 sm:px-5">
            <h2 className="text-[13.5px] font-semibold text-ink">Security & Password</h2>
          </header>

          <form onSubmit={handleChangePassword} className="flex flex-1 flex-col justify-between p-4 sm:p-5">
            <div className="space-y-3.5">
              <Field label="Current Password">
                <div className="relative">
                  <Input
                    type={showPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value)
                      setPassError('')
                    }}
                    placeholder="Enter current password"
                    className="pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute inset-y-0 right-2.5 my-auto text-[11px] font-semibold text-graphite hover:text-ink"
                  >
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </Field>

              <Field label="New Password">
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    setPassError('')
                  }}
                  placeholder="Min 6 characters"
                />
              </Field>

              <Field label="Confirm New Password">
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setPassError('')
                  }}
                  placeholder="Repeat new password"
                />
              </Field>

              {passError ? (
                <div className="rounded-lg bg-[#FDE8E8] px-3.5 py-2 text-[12px] font-medium text-sale">
                  {passError}
                </div>
              ) : (
                <div className="rounded-lg bg-chalk/60 p-2.5 text-[11px] text-graphite border border-line/60">
                  🔒 Minimum 6 characters required for password.
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-line">
              <Button type="submit" variant="primary" className="w-full" loading={savingPass} loadingText="Updating Password...">
                Update Password
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
