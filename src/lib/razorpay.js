const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js'

export function getRazorpayKey() {
  return import.meta.env.VITE_RAZORPAY_KEY_ID?.trim() || ''
}

export function loadRazorpay() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window unavailable'))
  if (window.Razorpay) return Promise.resolve(window.Razorpay)

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Razorpay))
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay')))
      return
    }
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => resolve(window.Razorpay)
    script.onerror = () => reject(new Error('Failed to load Razorpay'))
    document.body.appendChild(script)
  })
}

/**
 * Opens Razorpay Checkout. Resolves with payment response on success,
 * rejects if the user closes the modal or script/key fails.
 */
export async function openRazorpayCheckout({
  amountInr,
  name,
  email,
  phone,
  description = 'EvaraNest order',
  orderId,
}) {
  const key = getRazorpayKey()
  if (!key) {
    throw new Error(
      'Razorpay key missing. Add VITE_RAZORPAY_KEY_ID to your .env file (Razorpay Dashboard → API Keys).'
    )
  }

  const Razorpay = await loadRazorpay()
  const contact = String(phone ?? '').replace(/\D/g, '').slice(-10)

  return new Promise((resolve, reject) => {
    const rzp = new Razorpay({
      key,
      amount: Math.round(Number(amountInr) * 100), // paise
      currency: 'INR',
      name: 'EvaraNest',
      description,
      image: undefined,
      prefill: {
        name: name || '',
        email: email || '',
        contact: contact || '',
      },
      notes: orderId ? { store_order_id: orderId } : undefined,
      theme: { color: '#14331F' },
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
      handler: (response) => resolve(response),
    })

    rzp.on('payment.failed', (resp) => {
      reject(new Error(resp?.error?.description || 'Payment failed'))
    })

    rzp.open()
  })
}
