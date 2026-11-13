export function apiBase() {
  const fromEnv = import.meta.env.VITE_API_BASE
  if (fromEnv) return String(fromEnv).replace(/\/$/, '')
  if (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null') {
    return `${window.location.origin}/api`
  }
  return '/api'
}

function getCookie(name) {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift() || null
  return null
}

function setCookie(name, value, days = 7) {
  if (typeof document === 'undefined') return
  let expires = ''
  if (days) {
    const date = new Date()
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
    expires = `; expires=${date.toUTCString()}`
  }
  document.cookie = `${name}=${value || ''}${expires}; path=/; SameSite=Lax`
}

function deleteCookie(name) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`
}

let memAdminToken = null
let memCustomerToken = null

export function getAdminToken() {
  if (memAdminToken) return memAdminToken
  if (typeof localStorage !== 'undefined') {
    const ls = localStorage.getItem('evaranest_admin_token')
    if (ls) return ls
  }
  return getCookie('evaranest_admin_token')
}

export function setAdminToken(token) {
  memAdminToken = token || null
  if (token) {
    if (typeof localStorage !== 'undefined') localStorage.setItem('evaranest_admin_token', token)
    setCookie('evaranest_admin_token', token, 7)
  } else {
    if (typeof localStorage !== 'undefined') localStorage.removeItem('evaranest_admin_token')
    deleteCookie('evaranest_admin_token')
  }
}

export function getCustomerToken() {
  if (memCustomerToken) return memCustomerToken
  if (typeof localStorage !== 'undefined') {
    const ls = localStorage.getItem('evaranest_customer_token')
    if (ls) return ls
  }
  return getCookie('evaranest_customer_token')
}

export function setCustomerToken(token) {
  memCustomerToken = token || null
  if (token) {
    if (typeof localStorage !== 'undefined') localStorage.setItem('evaranest_customer_token', token)
    setCookie('evaranest_customer_token', token, 7)
  } else {
    if (typeof localStorage !== 'undefined') localStorage.removeItem('evaranest_customer_token')
    deleteCookie('evaranest_customer_token')
  }
}

export class ApiError extends Error {
  constructor(message, { status = 400, errors = null, data = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
    this.data = data
  }
}

async function parseBody(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * @param {string} path
 * @param {{ method?: string, body?: any, auth?: boolean|'admin'|'customer', formData?: FormData, signal?: AbortSignal }} [opts]
 */
export async function api(path, opts = {}) {
  const { method = 'GET', body, auth = false, formData, signal } = opts
  const headers = {}
  if (!formData) headers['Content-Type'] = 'application/json'

  if (auth === true || auth === 'admin') {
    const token = getAdminToken()
    if (token) headers.Authorization = `Bearer ${token}`
  } else if (auth === 'customer' || (!auth && path.startsWith('/customer/'))) {
    const token = getCustomerToken()
    if (token) headers.Authorization = `Bearer ${token}`
  } else if (!auth) {
    // If no explicit auth set, send admin or customer token if present
    const token = getAdminToken() || getCustomerToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res
  try {
    res = await fetch(`${apiBase()}${path.startsWith('/') ? path : `/${path}`}`, {
      method,
      headers,
      credentials: 'include',
      body: formData ? formData : body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch {
    throw new ApiError('Network error. Please check your connection and try again.', { status: 0 })
  }

  const json = await parseBody(res)

  if (!res.ok || json?.success === false) {
    const message =
      json?.message ||
      (res.status === 401
        ? 'Please sign in again.'
        : res.status >= 500
          ? 'Something went wrong. Please try again.'
          : 'Request failed.')
    throw new ApiError(message, {
      status: res.status,
      errors: json?.errors ?? null,
      data: json?.data ?? null,
    })
  }

  return json
}

export const apiGet = (path, opts) => api(path, { ...opts, method: 'GET' })
export const apiPost = (path, body, opts) => api(path, { ...opts, method: 'POST', body })
export const apiPut = (path, body, opts) => api(path, { ...opts, method: 'PUT', body })
export const apiPatch = (path, body, opts) => api(path, { ...opts, method: 'PATCH', body })
export const apiDelete = (path, opts) => api(path, { ...opts, method: 'DELETE' })

// `slug` (product handle / category slug etc.) becomes the stored file name: <slug>-xxxx.<ext>
export async function apiUpload(file, slug = '') {
  const fd = new FormData()
  fd.append('file', file)
  if (slug) fd.append('slug', slug)
  return api('/upload', { method: 'POST', formData: fd })
}
