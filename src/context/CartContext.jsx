import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { inr } from '../store/StoreContext.jsx'

const CartContext = createContext(null)

function cartReducer(state, action) {
  switch (action.type) {
    case 'hydrate':
      return Array.isArray(action.lines) ? action.lines : []
    case 'add': {
      const notePart = action.item.customNote ? `-${action.item.customNote.trim()}` : ''
      const key = `${action.item.handle}-${action.item.size}${notePart}`
      const existing = state.find((l) => l.key === key)
      if (existing) {
        return state.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l))
      }
      return [...state, { ...action.item, key, qty: 1 }]
    }
    case 'qty':
      return state
        .map((l) => (l.key === action.key ? { ...l, qty: Math.max(0, l.qty + action.delta) } : l))
        .filter((l) => l.qty > 0)
    case 'remove':
      return state.filter((l) => l.key !== action.key)
    case 'clear':
      return []
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [lines, dispatch] = useReducer(cartReducer, [])
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState(null)

  // Clear any legacy localStorage cart data
  useEffect(() => {
    try {
      localStorage.removeItem('evaranest.cart.v1')
      localStorage.removeItem('evaranest.cart.coupon.v1')
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0)
    const subtotal = lines.reduce((n, l) => n + l.qty * l.price, 0)
    const originalSavings = lines.reduce((n, l) => n + l.qty * ((l.compareAt ?? l.price) - l.price), 0)

    let couponDiscount = 0
    if (appliedCoupon && subtotal > 0) {
      const minRequired = Number(appliedCoupon.minCart || 0)
      if (subtotal >= minRequired) {
        if (appliedCoupon.type === 'percent') {
          couponDiscount = Math.round((subtotal * Number(appliedCoupon.value)) / 100)
        } else {
          couponDiscount = Math.min(Number(appliedCoupon.value), subtotal)
        }
      }
    }

    const finalSubtotal = Math.max(0, subtotal - couponDiscount)
    const totalSavings = originalSavings + couponDiscount

    const applyCoupon = (couponOrCode, availableCoupons = []) => {
      let coupon = null
      if (typeof couponOrCode === 'object' && couponOrCode) {
        coupon = couponOrCode
      } else if (typeof couponOrCode === 'string') {
        const clean = couponOrCode.trim().toUpperCase()
        coupon = availableCoupons.find((c) => c.code.toUpperCase() === clean && c.active !== false && c.active !== 0 && c.active !== '0')
      }

      if (!coupon) {
        return { success: false, message: 'Invalid or expired coupon code.' }
      }

      const minRequired = Number(coupon.minCart || 0)
      if (subtotal < minRequired) {
        return {
          success: false,
          message: `Minimum cart value of ${inr(minRequired)} required for code ${coupon.code}.`,
        }
      }

      let discount = 0
      if (coupon.type === 'percent') {
        discount = Math.round((subtotal * Number(coupon.value)) / 100)
      } else {
        discount = Math.min(Number(coupon.value), subtotal)
      }

      const couponData = {
        code: coupon.code.toUpperCase(),
        type: coupon.type,
        value: coupon.value,
        minCart: coupon.minCart,
        discount,
      }

      setAppliedCoupon(couponData)
      return { success: true, message: `Coupon ${coupon.code} applied! Saved ${inr(discount)}.` }
    }

    const removeCoupon = () => {
      setAppliedCoupon(null)
    }

    return {
      lines,
      count,
      subtotal,
      finalSubtotal,
      savings: originalSavings,
      totalSavings,
      appliedCoupon,
      couponDiscount,
      applyCoupon,
      removeCoupon,
      open,
      openCart: () => setOpen(true),
      closeCart: () => setOpen(false),
      add: (item) => {
        dispatch({ type: 'add', item })
        setToast(`${item.title} (${item.size}) added to bag`)
        setTimeout(() => setToast(null), 2600)
        setOpen(true)
      },
      inc: (key) => dispatch({ type: 'qty', key, delta: 1 }),
      dec: (key) => dispatch({ type: 'qty', key, delta: -1 }),
      remove: (key) => dispatch({ type: 'remove', key }),
      clear: () => {
        dispatch({ type: 'clear' })
        setAppliedCoupon(null)
      },
      toast,
      notify: (message) => {
        setToast(message)
        setTimeout(() => setToast(null), 2800)
      },
    }
  }, [lines, open, toast, appliedCoupon])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}

export { inr }
