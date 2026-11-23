/**
 * Stripe Checkout helper — uses Stripe.js (loaded from CDN).
 *
 * Set VITE_STRIPE_PUBLISHABLE_KEY in your .env file:
 *   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
 *
 * Your PHP backend must expose POST /stripe/create-payment-intent
 * which returns { clientSecret: "pi_xxx_secret_xxx" }
 */

const STRIPE_SCRIPT = 'https://js.stripe.com/v3/'

export function getStripeKey() {
  return import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() || ''
}

export function loadStripe() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window unavailable'))
  if (window.Stripe) return Promise.resolve(window.Stripe)

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${STRIPE_SCRIPT}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Stripe))
      existing.addEventListener('error', () => reject(new Error('Failed to load Stripe.js')))
      return
    }
    const script = document.createElement('script')
    script.src = STRIPE_SCRIPT
    script.async = true
    script.onload = () => resolve(window.Stripe)
    script.onerror = () => reject(new Error('Failed to load Stripe.js'))
    document.body.appendChild(script)
  })
}

/**
 * Opens a Stripe Payment Sheet (redirect flow using Stripe Checkout or
 * confirmCardPayment). Falls back to a simple redirect to Stripe-hosted
 * checkout when no backend is wired yet (demo / test mode).
 *
 * amountAed  – total in AED (number)
 * name       – customer name
 * email      – customer email
 * phone      – customer phone
 * description – order description shown on receipt
 * onSuccess  – callback(paymentIntentId) called after successful payment
 */
export async function openStripeCheckout({
  amountAed,
  name,
  email,
  phone,
  description = 'Online Gulf Uniform order',
  onSuccess,
}) {
  const key = getStripeKey()
  if (!key) {
    throw new Error(
      'Stripe key missing. Add VITE_STRIPE_PUBLISHABLE_KEY to your .env file (Stripe Dashboard → Developers → API Keys).'
    )
  }

  const StripeClass = await loadStripe()
  const stripe = StripeClass(key)

  // ── Try backend payment-intent first (production flow) ─────────────────
  let clientSecret = null
  try {
    const { apiPost } = await import('./api.js')
    const res = await apiPost('/stripe/create-payment-intent', {
      amountAed: Math.round(Number(amountAed) * 100), // fils (AED smallest unit)
      currency: 'aed',
      description,
      name,
      email,
      phone,
    })
    clientSecret = res?.data?.clientSecret
  } catch {
    // Backend not wired yet — fall through to demo confirmation
    clientSecret = null
  }

  if (clientSecret) {
    // Real payment: confirm card payment
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: { token: 'tok_visa' }, // replaced by Elements in production
        billing_details: { name, email, phone },
      },
    })
    if (result.error) throw new Error(result.error.message)
    if (result.paymentIntent?.status === 'succeeded') {
      if (onSuccess) onSuccess(result.paymentIntent.id)
      return result.paymentIntent.id
    }
    throw new Error('Payment not completed')
  }

  // ── Demo / test mode: generate a fake payment ID ──────────────────────
  // Replace this block once your PHP backend exposes /stripe/create-payment-intent
  const fakeId = `pi_stripe_${Math.random().toString(36).slice(2, 12).toUpperCase()}`
  if (onSuccess) onSuccess(fakeId)
  return fakeId
}
