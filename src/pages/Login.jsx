import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Seo from '../components/Seo'
import { apiPost, getCustomerToken, setCustomerToken } from '../lib/api.js'
import { useStore } from '../store/StoreContext.jsx'
import { userById } from '../store/selectors.js'

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

/**
 * Storefront OTP auth — backed by Core PHP /customer/otp/* endpoints.
 */
export default function Login() {
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const sessionUser = userById(state, state.currentUserId)
  const from = location.state?.from?.pathname || '/account'

  const initialMode = params.get('mode') === 'signup' ? 'signup' : 'login'
  const [mode, setMode] = useState(initialMode)
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isLoggedIn = Boolean(sessionUser)
  const hasCustomerToken = Boolean(getCustomerToken())

  if (isLoggedIn || hasCustomerToken) {
    return <Navigate to={from.startsWith('/admin') ? '/account' : from} replace />
  }

  const switchMode = (next) => {
    setMode(next)
    setStep('email')
    setOtp('')
    setName('')
    setError('')
  }

  const applySession = (data) => {
    const user = data.user
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('evaranest_customer_user', JSON.stringify(user))
    }
    setCustomerToken(data.token)
    dispatch({ type: 'user/ensure', user })
    if (user.addresses) {
      dispatch({ type: 'user/update', id: user.id, patch: { addresses: user.addresses, address: user.address } })
    }
    dispatch({ type: 'auth/login', id: user.id })
    if (Array.isArray(data.wishlist)) {
      dispatch({ type: 'wishlist/set', handles: data.wishlist })
    }
  }

  const sendOtp = async (e) => {
    e?.preventDefault()
    if (busy) return
    setError('')
    const cleaned = normalizeEmail(email)
    if (!cleaned || !cleaned.includes('@')) {
      setError('Enter a valid email address.')
      return
    }
    setBusy(true)
    try {
      await apiPost('/customer/otp/request', { email: cleaned, mode })
      setStep('otp')
      setOtp('')
    } catch (err) {
      setError(err.message || 'Unable to send OTP.')
    } finally {
      setBusy(false)
    }
  }

  const confirmOtp = async (e) => {
    e.preventDefault()
    if (busy) return
    setError('')
    const cleanOtp = String(otp).trim()
    if (!cleanOtp) {
      setError('Please enter the 6-digit OTP code.')
      return
    }

    setBusy(true)
    try {
      const json = await apiPost('/customer/otp/verify', {
        email: normalizeEmail(email),
        code: cleanOtp,
        name: name.trim() || undefined,
      })
      applySession(json.data)
      navigate(from.startsWith('/admin') ? '/account' : from, { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to verify OTP. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-10 md:py-14">
      <Seo
        title={mode === 'login' ? 'Customer Sign In & OTP Login' : 'Create Customer Account'}
        description="Sign in or register with EvaraNest to track your candle orders, save wishlist favourites and manage delivery addresses."
        canonical="/login"
        noindex={true}
      />
      <div className="w-full max-w-[420px]">
        <div className="mb-6 text-center">
          <h1 className="font-display text-[28px] uppercase leading-none md:text-[36px]">
            {mode === 'login' ? 'Log in' : 'Create account'}
          </h1>
          <p className="mt-2 text-[13px] text-muted">
            {mode === 'login'
              ? 'Enter your email — we’ll send a one-time password.'
              : 'Sign up with email. Verify OTP, then just add your name.'}
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-7">
          {step === 'email' && (
            <form onSubmit={sendOtp} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider2 text-muted">
                  Email
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  disabled={busy}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError('')
                  }}
                  placeholder="you@email.com"
                  className={`w-full rounded-lg border px-3.5 py-3 text-[13px] outline-none transition-colors disabled:opacity-50 ${
                    error ? 'border-red-500 ring-1 ring-red-500/30' : 'border-line focus:border-ink'
                  }`}
                />
              </label>
              {error && <ErrorMsg>{error}</ErrorMsg>}
              <button type="submit" className="btn-ink w-full disabled:opacity-40" disabled={busy || !email.trim()}>
                {busy ? 'Sending OTP…' : 'Send OTP'}
              </button>
              <ModeSwitch mode={mode} onSwitch={switchMode} />
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={confirmOtp} className="space-y-4">
              <p className="text-[12px] text-muted">
                Please enter the 6-digit verification code sent to <span className="font-semibold text-ink">{normalizeEmail(email)}</span>.
              </p>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider2 text-muted">
                  Enter OTP
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  value={otp}
                  disabled={busy}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                    setError('')
                  }}
                  placeholder="6-digit code"
                  className={`w-full rounded-lg border px-3.5 py-3 text-center font-mono text-[18px] tracking-[0.35em] outline-none transition-colors ${
                    error ? 'border-red-500 ring-1 ring-red-500/30' : 'border-line focus:border-ink'
                  }`}
                />
              </label>
              {error && <ErrorMsg>{error}</ErrorMsg>}
              <button type="submit" className="btn-ink w-full disabled:opacity-40" disabled={busy || otp.length !== 6}>
                {busy ? 'Verifying…' : mode === 'login' ? 'Verify & log in' : 'Verify OTP'}
              </button>
              <div className="flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  className="text-muted underline underline-offset-2 hover:text-ink"
                  onClick={() => {
                    setStep('email')
                    setOtp('')
                    setError('')
                  }}
                >
                  Change email
                </button>
                <button
                  type="button"
                  className="font-semibold text-ink underline underline-offset-2"
                  onClick={() => sendOtp()}
                  disabled={busy}
                >
                  Resend OTP
                </button>
              </div>
              <ModeSwitch mode={mode} onSwitch={switchMode} />
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-[12px] text-muted">
          <Link to="/" className="underline underline-offset-2 hover:text-ink">
            ← Continue shopping
          </Link>
        </p>
      </div>
    </div>
  )
}

function ModeSwitch({ mode, onSwitch }) {
  if (mode === 'login') {
    return (
      <p className="pt-1 text-center text-[12px] text-muted">
        New here?{' '}
        <button
          type="button"
          onClick={() => onSwitch('signup')}
          className="font-semibold text-ink underline underline-offset-2"
        >
          Create account
        </button>
      </p>
    )
  }
  return (
    <p className="pt-1 text-center text-[12px] text-muted">
      Already have an account?{' '}
      <button
        type="button"
        onClick={() => onSwitch('login')}
        className="font-semibold text-ink underline underline-offset-2"
      >
        Log in
      </button>
    </p>
  )
}

function ErrorMsg({ children }) {
  return (
    <p className="rounded-lg bg-[#FDE8E8] px-3 py-2 text-[12px] text-sale" role="alert">
      {children}
    </p>
  )
}
