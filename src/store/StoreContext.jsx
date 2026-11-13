import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import {
  apiGet,
  getAdminToken,
  getCustomerToken,
  setAdminToken,
  setCustomerToken,
} from '../lib/api.js'
import { mergeContentDefaults } from './contentSeed.js'
import { reducer } from './reducer.js'
import { ADMIN_ROLES, DEMO_ADMIN_PASSWORD, buildSeed } from './seed.js'

const StoreContext = createContext(null)

function getInitialState() {
  const seed = buildSeed()
  let cachedCustomerUser = null
  let cachedAdminUser = null
  try {
    if (typeof localStorage !== 'undefined') {
      const uStr = localStorage.getItem('evaranest_customer_user')
      if (uStr) cachedCustomerUser = JSON.parse(uStr)
      const aStr = localStorage.getItem('evaranest_admin_user')
      if (aStr) cachedAdminUser = JSON.parse(aStr)
    }
  } catch {}

  const initialUsers = [...(seed.users || [])]
  if (cachedCustomerUser && !initialUsers.some((u) => u.id === cachedCustomerUser.id)) {
    initialUsers.push(cachedCustomerUser)
  }
  if (cachedAdminUser && !initialUsers.some((u) => u.id === cachedAdminUser.id)) {
    initialUsers.push(cachedAdminUser)
  }

  return {
    ...seed,
    content: mergeContentDefaults(seed.content),
    catalogReady: false,
    catalogue: seed.catalogue || [],
    variants: seed.variants || [],
    categories: seed.categories || [],
    coupons: seed.coupons || [],
    orders: [],
    payments: [],
    shipments: [],
    refunds: [],
    users: initialUsers,
    wishlist: [],
    adminUserId: cachedAdminUser?.id || null,
    currentUserId: cachedCustomerUser?.id || null,
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState)
  const [catalogError, setCatalogError] = useState(null)

  // Clear any legacy localStorage platform data from previous builds
  useEffect(() => {
    try {
      localStorage.removeItem('evaranest.platform.v1')
      localStorage.removeItem('juneberry.platform.v1')
    } catch {
      /* ignore */
    }
  }, [])

  // Hydrate catalogue / CMS / categories from Core PHP API
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const json = await apiGet('/bootstrap')
        if (cancelled) return
        const data = json.data ?? {}
        dispatch({
          type: 'catalog/hydrate',
          products: data.products ?? [],
          variants: data.variants ?? [],
          categories: data.categories ?? [],
          content: data.content ?? {},
          deletedProducts: data.deletedProducts ?? [],
        })
        if (Array.isArray(data.coupons)) {
          dispatch({ type: 'coupons/set', coupons: data.coupons })
        }
        setCatalogError(null)
      } catch (err) {
        if (!cancelled) {
          setCatalogError(err?.message || 'Unable to load catalogue from API.')
          dispatch({ type: 'catalog/markReady' })
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Restore admin session from token
  useEffect(() => {
    const token = getAdminToken()
    if (!token) {
      if (typeof localStorage !== 'undefined') localStorage.removeItem('evaranest_admin_user')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const json = await apiGet('/auth/me', { auth: true })
        if (cancelled) return
        const user = json.data?.user
        if (user?.id) {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('evaranest_admin_user', JSON.stringify(user))
          }
          dispatch({ type: 'user/ensure', user })
          dispatch({ type: 'admin/login', id: user.id })
          try {
            const [ordersJson, customersJson] = await Promise.all([
              apiGet('/orders', { auth: true }),
              apiGet('/customers', { auth: true }),
            ])
            if (cancelled) return
            dispatch({
              type: 'commerce/hydrate',
              orders: ordersJson.data?.orders ?? [],
              payments: ordersJson.data?.payments ?? [],
              shipments: ordersJson.data?.shipments ?? [],
              refunds: ordersJson.data?.refunds ?? [],
              users: customersJson.data?.users ?? undefined,
            })
          } catch {
            /* commerce hydrate optional if tables empty */
          }
        }
      } catch {
        if (typeof localStorage !== 'undefined') localStorage.removeItem('evaranest_admin_user')
        setAdminToken(null)
        dispatch({ type: 'admin/logout' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Restore customer session + wishlist
  useEffect(() => {
    const token = getCustomerToken()
    if (!token) {
      if (typeof localStorage !== 'undefined') localStorage.removeItem('evaranest_customer_user')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const json = await apiGet('/customer/me', { auth: 'customer' })
        if (cancelled) return
        const user = json.data?.user
        if (user?.id) {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('evaranest_customer_user', JSON.stringify(user))
          }
          dispatch({ type: 'user/ensure', user })
          if (user.addresses) {
            dispatch({
              type: 'user/update',
              id: user.id,
              patch: { addresses: user.addresses, address: user.address },
            })
          }
          dispatch({ type: 'auth/login', id: user.id })
          try {
            const wish = await apiGet('/wishlist', { auth: 'customer' })
            if (!cancelled) {
              dispatch({ type: 'wishlist/set', handles: wish.data?.wishlist ?? [] })
            }
          } catch {
            /* ignore */
          }
          try {
            const ordersJson = await apiGet('/orders', { auth: 'customer' })
            if (!cancelled) {
              dispatch({
                type: 'commerce/hydrate',
                orders: ordersJson.data?.orders ?? [],
                payments: ordersJson.data?.payments ?? [],
                shipments: ordersJson.data?.shipments ?? [],
                refunds: ordersJson.data?.refunds ?? [],
              })
            }
          } catch {
            /* ignore */
          }
        } else {
          if (typeof localStorage !== 'undefined') localStorage.removeItem('evaranest_customer_user')
          setCustomerToken(null)
          dispatch({ type: 'auth/logout' })
        }
      } catch {
        if (typeof localStorage !== 'undefined') localStorage.removeItem('evaranest_customer_user')
        setCustomerToken(null)
        dispatch({ type: 'auth/logout' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(
    () => ({ state, dispatch, catalogError }),
    [state, catalogError]
  )
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}

export const inr = (n) =>
  `₹${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

export const shortDate = (ts) =>
  new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })

export const longDate = (ts) =>
  new Date(ts).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
