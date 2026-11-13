import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { apiGet, apiPost, setAdminToken } from '../lib/api.js'
import { useCart } from '../context/CartContext.jsx'
import { useStore } from '../store/StoreContext.jsx'
import { adminUser } from '../store/selectors.js'

export default function AdminLogin() {
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const session = adminUser(state)
  const from = location.state?.from?.pathname || '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  if (session) {
    return <Navigate to={from.startsWith('/admin') && from !== '/admin/login' ? from : '/admin'} replace />
  }

  const submit = async (e) => {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)
    try {
      const json = await apiPost('/auth/login', { email: email.trim(), password })
      const { token, user } = json.data
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('evaranest_admin_user', JSON.stringify(user))
      }
      setAdminToken(token)
      dispatch({ type: 'user/ensure', user })
      dispatch({ type: 'admin/login', id: user.id })

      try {
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
      } catch (err) {
        console.error('Commerce hydrate error:', err)
      }

      notify(json.message || 'Signed in successfully.')
      navigate(from.startsWith('/admin') && from !== '/admin/login' ? from : '/admin', { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0A0A18] px-4 py-10 selection:bg-brand selection:text-white">
      {/* Dynamic Keyframes for Background Motion */}
      <style>{`
        @keyframes subtleZoom {
          0% { transform: scale(1.02) translate(0, 0); }
          50% { transform: scale(1.08) translate(-1.5%, -1%); }
          100% { transform: scale(1.02) translate(0, 0); }
        }
        @keyframes floatOrb1 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.45; }
          33% { transform: translate3d(60px, -40px, 0) scale(1.15); opacity: 0.65; }
          66% { transform: translate3d(-40px, 50px, 0) scale(0.95); opacity: 0.35; }
        }
        @keyframes floatOrb2 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.4; }
          50% { transform: translate3d(-70px, -60px, 0) scale(1.2); opacity: 0.6; }
        }
        @keyframes floatOrb3 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(0.9); opacity: 0.3; }
          50% { transform: translate3d(50px, 60px, 0) scale(1.1); opacity: 0.55; }
        }
        @keyframes floatBokeh {
          0% { transform: translateY(100vh) translateX(0) scale(0.6); opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.6; }
          100% { transform: translateY(-20vh) translateX(30px) scale(1.2); opacity: 0; }
        }
        .animate-bg-kenburns {
          animation: subtleZoom 28s ease-in-out infinite;
        }
        .animate-orb-1 {
          animation: floatOrb1 18s ease-in-out infinite;
        }
        .animate-orb-2 {
          animation: floatOrb2 22s ease-in-out infinite;
        }
        .animate-orb-3 {
          animation: floatOrb3 16s ease-in-out infinite;
        }
      `}</style>

      {/* Animated Luxury Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-bg-kenburns will-change-transform"
        style={{ backgroundImage: "url('/images/admin-login-bg.jpg')" }}
      />

      {/* Dark Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-[#0B0C1E]/80 to-black/90 backdrop-blur-[2px]" />

      {/* Animated Floating Glow Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Orb 1 - Brand Blue Glow Top-Left */}
        <div
          className="animate-orb-1 absolute -top-20 -left-20 h-[380px] w-[380px] sm:h-[480px] sm:w-[480px] rounded-full bg-brand/35 blur-[90px]"
        />

        {/* Orb 2 - Deep Indigo Glow Bottom-Right */}
        <div
          className="animate-orb-2 absolute -bottom-24 -right-20 h-[400px] w-[400px] sm:h-[520px] sm:w-[520px] rounded-full bg-[#3839D6]/35 blur-[100px]"
        />

        {/* Orb 3 - Soft Center Glow */}
        <div
          className="animate-orb-3 absolute top-1/3 left-1/2 -translate-x-1/2 h-[320px] w-[320px] rounded-full bg-brandLight/20 blur-[80px]"
        />

        {/* Animated Floating Warm/Gold Bokeh Light Motes */}
        {[
          { left: '15%', size: '8px', delay: '0s', dur: '14s', bg: 'rgba(255,255,255,0.7)' },
          { left: '28%', size: '14px', delay: '3s', dur: '18s', bg: 'rgba(72,73,232,0.8)' },
          { left: '42%', size: '6px', delay: '6s', dur: '12s', bg: 'rgba(255,255,255,0.9)' },
          { left: '60%', size: '12px', delay: '1.5s', dur: '16s', bg: 'rgba(210,233,74,0.7)' },
          { left: '75%', size: '10px', delay: '5s', dur: '20s', bg: 'rgba(72,73,232,0.7)' },
          { left: '88%', size: '7px', delay: '2s', dur: '13s', bg: 'rgba(255,255,255,0.8)' },
        ].map((bokeh, idx) => (
          <div
            key={idx}
            className="absolute rounded-full shadow-[0_0_12px_rgba(255,255,255,0.8)] pointer-events-none"
            style={{
              left: bokeh.left,
              bottom: '-20px',
              width: bokeh.size,
              height: bokeh.size,
              background: bokeh.bg,
              animation: `floatBokeh ${bokeh.dur} linear infinite`,
              animationDelay: bokeh.delay,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Brand Logo & Header */}
        <div className="mb-7 flex flex-col items-center text-center">
          <Link to="/" className="group inline-flex items-center justify-center transition-transform duration-300 hover:scale-[1.03]">
            <img
              src="/logo/evaranest-logo-light.png"
              alt="EvaraNest"
              className="h-11 sm:h-12 w-auto object-contain drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]"
              onError={(e) => {
                e.currentTarget.src = '/logo/evaranest-logo.png'
                e.currentTarget.className = 'h-11 sm:h-12 w-auto object-contain brightness-0 invert drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]'
              }}
            />
          </Link>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="h-[1px] w-6 bg-gradient-to-r from-transparent to-brand/60" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brandLight/90">
              Back Office Portal
            </p>
            <span className="h-[1px] w-6 bg-gradient-to-l from-transparent to-brand/60" />
          </div>
        </div>

        {/* Glassmorphism Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.65)] backdrop-blur-2xl transition-all duration-300 hover:border-white/25 hover:shadow-[0_30px_70px_rgba(72,73,232,0.2)]">
          {/* Top subtle highlight */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

          <div className="mb-6">
            <h1 className="text-[22px] font-bold tracking-tight text-white">
              Admin Login
            </h1>
            <p className="mt-1 text-[12.5px] leading-relaxed text-white/70">
              Sign in with your staff account to open the dashboard.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-white/80">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                disabled={loading}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                placeholder="admin@evaranest.in"
                className={`w-full rounded-xl border bg-black/40 px-3.5 py-2.5 text-[13px] font-medium text-white placeholder-white/35 outline-none transition-all duration-200 focus:bg-black/55 focus:ring-2 ${
                  error
                    ? 'border-red-500 ring-1 ring-red-500/40'
                    : 'border-white/20 hover:border-white/35 focus:border-brand focus:ring-brand/30'
                }`}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  disabled={loading}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                  placeholder="Enter your password"
                  className={`w-full rounded-xl border bg-black/40 px-3.5 py-2.5 pr-14 text-[13px] font-medium text-white placeholder-white/35 outline-none transition-all duration-200 focus:bg-black/55 focus:ring-2 ${
                    error
                      ? 'border-red-500 ring-1 ring-red-500/40'
                      : 'border-white/20 hover:border-white/35 focus:border-brand focus:ring-brand/30'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute inset-y-0 right-3 my-auto flex items-center text-[11.5px] font-semibold text-white/60 hover:text-white transition-colors"
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/20 px-3.5 py-2.5 text-[12px] font-medium text-red-200" role="alert">
                <svg className="h-4 w-4 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!email.trim() || !password || loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brandDark px-5 py-3 text-[13px] font-bold text-white shadow-[0_6px_25px_rgba(72,73,232,0.45)] transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v2.5A5.5 5.5 0 006.5 12H4z" />
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in to Dashboard</span>
              )}
            </button>
          </form>
        </div>

        {/* Back link */}
        <p className="mt-6 text-center text-[12px] text-white/60">
          <Link to="/" className="inline-flex items-center gap-1.5 font-medium transition-colors hover:text-brandLight">
            <span>←</span>
            <span className="underline underline-offset-4">Back to storefront</span>
          </Link>
        </p>
      </div>
    </div>
  )
}
