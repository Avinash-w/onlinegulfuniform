// ---------------------------------------------------------------------------
// Demo OTP auth — no real email server. Codes live in sessionStorage and are
// shown on-screen so the flow is testable end-to-end.
// ---------------------------------------------------------------------------

const KEY = 'evaranest.otp.v1'
const TTL_MS = 5 * 60 * 1000

function randOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export function findCustomerByEmail(state, email) {
  const needle = normalizeEmail(email)
  return state.users.find(
    (u) => u.role === 'Customer' && u.email.toLowerCase() === needle && u.status !== 'Blocked'
  )
}

let memSession = null

export function issueOtp({ email, mode }) {
  const session = {
    email: normalizeEmail(email),
    mode, // 'login' | 'signup'
    code: randOtp(),
    expiresAt: Date.now() + TTL_MS,
  }
  memSession = session
  return session
}

export function peekOtp() {
  if (!memSession) return null
  if (Date.now() > memSession.expiresAt) {
    memSession = null
    return null
  }
  return memSession
}

export function verifyOtp(email, code) {
  const session = peekOtp()
  if (!session) return { ok: false, error: 'OTP expired. Request a new one.' }
  if (session.email !== normalizeEmail(email)) {
    return { ok: false, error: 'Email mismatch. Start again.' }
  }
  if (String(code).trim() !== session.code) {
    return { ok: false, error: 'Incorrect OTP. Try again.' }
  }
  return { ok: true, session }
}

export function clearOtp() {
  memSession = null
}

export function newCustomerId() {
  return `u-${Date.now().toString(36)}`
}
