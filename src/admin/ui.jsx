import { useEffect } from 'react'
import { Close } from '../components/icons'

// ---------------------------------------------------------------------------
// Small building blocks shared by every admin screen.
// ---------------------------------------------------------------------------

export function Card({ title, action, children, className = '', flush = false, bodyClassName = '' }) {
  const isFlush = flush || /\b(!?p-0)\b/.test(className)
  return (
    <section className={`min-w-0 overflow-hidden rounded-xl border border-[#D5D1C8] bg-white shadow-xs ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DCD8CF] px-3 py-3 sm:gap-3 sm:px-4">
          <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
          {action}
        </header>
      )}
      <div className={isFlush ? (bodyClassName || '') : `p-3 sm:p-4 ${bodyClassName}`}>{children}</div>
    </section>
  )
}

export function Stat({ label, value, sub, tone = 'default' }) {
  const tones = {
    default: 'text-ink',
    good: 'text-save',
    warn: 'text-[#B26A00]',
    bad: 'text-sale',
  }
  return (
    <div className="group min-w-0 rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs transition-all duration-200 hover:border-[#ADA9A0] hover:shadow-xs">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-graphite">{label}</p>
      <p className={`mt-1 break-words text-[17px] font-bold leading-tight ${tones[tone]}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10.5px] font-medium text-graphite">{sub}</p>}
    </div>
  )
}

const BADGE_TONES = {
  Pending: 'bg-[#FFF4E0] text-[#B26A00]',
  Confirmed: 'bg-[#E7F0FF] text-[#0B63CE]',
  Packed: 'bg-[#EFE9FB] text-[#5B2E90]',
  Shipped: 'bg-[#E4F3FF] text-[#0B63CE]',
  Delivered: 'bg-[#E4F7EC] text-save',
  Cancelled: 'bg-[#FDE8E8] text-sale',
  Returned: 'bg-[#FDE8E8] text-sale',
  Paid: 'bg-[#E4F7EC] text-save',
  Failed: 'bg-[#FDE8E8] text-sale',
  Refunded: 'bg-[#FDE8E8] text-sale',
  'Refund Pending': 'bg-[#FFF4E0] text-[#B26A00]',
  'Partially refunded': 'bg-[#FFF4E0] text-[#B26A00]',
  Processed: 'bg-[#E4F7EC] text-save',
  Rejected: 'bg-[#FDE8E8] text-sale',
  Approved: 'bg-[#E4F7EC] text-save',
  Active: 'bg-[#E4F7EC] text-save',
  Blocked: 'bg-[#FDE8E8] text-sale',
  'In transit': 'bg-[#E4F3FF] text-[#0B63CE]',
  New: 'bg-[#E7F0FF] text-[#0B63CE]',
  Contacted: 'bg-[#FFF4E0] text-[#B26A00]',
  'In Progress': 'bg-[#EFE9FB] text-[#5B2E90]',
  Completed: 'bg-[#E4F7EC] text-save',
}

export function Badge({ children, tone }) {
  const cls = BADGE_TONES[tone ?? children] ?? 'bg-chalk text-graphite'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${cls}`}>
      {children}
    </span>
  )
}

/** `fit` fits the table to its container (cells wrap) instead of scrolling horizontally. */
export function Table({ head, children, empty = 'Nothing here yet.', fit = false }) {
  const rows = Array.isArray(children) ? children.filter(Boolean) : children
  const isEmpty = Array.isArray(rows) ? rows.length === 0 : !rows
  return (
    <div className={`-mx-3 sm:-mx-4 ${fit ? '' : 'overflow-x-auto overscroll-x-contain'}`}>
      <table
        className={`w-full border-collapse text-[12px] ${fit ? '' : 'min-w-[560px] sm:min-w-[640px]'}`}
      >
        <thead>
          <tr className="border-b border-[#CBC8C1] text-left">
            {head.map((h) => (
              <th
                key={h.key ?? h}
                className={`whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider2 text-graphite sm:px-4 ${
                  h.align === 'right' ? 'text-right' : ''
                }`}
              >
                {h.label ?? h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <tr>
              <td colSpan={head.length} className="px-3 py-12 text-center font-medium text-graphite sm:px-4">
                {empty}
              </td>
            </tr>
          ) : (
            rows
          )}
        </tbody>
      </table>
    </div>
  )
}

export const Td = ({ children, align, className = '' }) => (
  <td className={`px-3 py-3 align-middle text-ink sm:px-4 ${align === 'right' ? 'text-right' : ''} ${className}`}>
    {children}
  </td>
)

export const Tr = ({ children, onClick, className = '' }) => (
  <tr
    onClick={onClick}
    className={`border-b border-[#D8D5CD] transition-colors duration-150 hover:bg-[#F9F9FE] ${
      onClick ? 'cursor-pointer' : ''
    } ${className}`}
  >
    {children}
  </tr>
)

export function Pagination({ page = 1, total = 0, pageSize = 12, onChange, className = '' }) {
  if (total <= pageSize) return null

  const totalPages = Math.ceil(total / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  // Generate page numbers with ellipsis
  const getPages = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages = []
    if (page <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages)
    } else if (page >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      pages.push(1, '...', page - 1, page, page + 1, '...', totalPages)
    }
    return pages
  }

  return (
    <div
      className={`mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-t border-[#DCD8CF] pt-3 text-[12px] text-graphite ${className}`}
    >
      <div>
        Showing <span className="font-semibold text-ink">{from}</span> to{' '}
        <span className="font-semibold text-ink">{to}</span> of{' '}
        <span className="font-semibold text-ink">{total}</span> records
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="inline-flex h-8 items-center justify-center rounded-lg border border-[#CBC8C1] bg-white px-2.5 text-[11.5px] font-medium text-ink transition-colors hover:bg-chalk disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        {getPages().map((p, idx) =>
          p === '...' ? (
            <span key={`dots-${idx}`} className="px-1.5 text-graphite">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg text-[11.5px] font-semibold transition-colors ${
                page === p
                  ? 'bg-forest text-white shadow-xs'
                  : 'border border-[#CBC8C1] bg-white text-ink hover:bg-chalk'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="inline-flex h-8 items-center justify-center rounded-lg border border-[#CBC8C1] bg-white px-2.5 text-[11.5px] font-medium text-ink transition-colors hover:bg-chalk disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex flex-wrap items-baseline gap-1.5 text-[11.5px] font-bold uppercase tracking-normal text-[#1A1918]">
        <span>{label}</span>
        {hint && (
          <span className="normal-case font-medium tracking-normal text-[11px] text-[#7E7B8A]">
            ({hint.replace(/^\(|\)$/g, '')})
          </span>
        )}
      </span>
      {children}
    </label>
  )
}

export const inputCls =
  'w-full rounded-md border border-[#D5D1C8] bg-white px-3 py-2 text-[13px] text-ink placeholder:text-[#9A968E] shadow-2xs focus:border-[#4849E8] focus:outline-none focus:ring-1 focus:ring-[#4849E8] disabled:bg-[#F6F5F2] disabled:text-[#9A968E] transition-colors'

export const Input = ({ error, invalid, className = '', ...p }) => (
  <input
    {...p}
    className={`${inputCls} ${
      error || invalid ? '!border-red-500 ring-1 !ring-red-500/30' : ''
    } ${className}`}
  />
)
export const Textarea = ({ error, invalid, className = '', ...p }) => (
  <textarea
    {...p}
    className={`${inputCls} ${
      error || invalid ? '!border-red-500 ring-1 !ring-red-500/30' : ''
    } ${className}`}
  />
)
export const Select = ({ options = [], error, invalid, className = '', ...p }) => (
  <select
    {...p}
    className={`${inputCls} h-[38px] py-1 text-[12.5px] ${
      error || invalid ? '!border-red-500 ring-1 !ring-red-500/30' : ''
    } ${className}`}
  >
    {options.map((o) => (
      <option key={o.value ?? o} value={o.value ?? o}>
        {o.label ?? o}
      </option>
    ))}
  </select>
)

function Spinner({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v2.5A5.5 5.5 0 006.5 12H4z"
      />
    </svg>
  )
}

export function Button({
  variant = 'primary',
  className = '',
  loading = false,
  loadingText,
  children,
  disabled,
  ...p
}) {
  const styles = {
    primary: 'bg-forest text-white hover:bg-ink',
    lime: 'bg-lime text-forest hover:opacity-90',
    ghost: 'border border-line text-ink hover:border-ink',
    danger: 'border border-sale text-sale hover:bg-sale hover:text-white',
  }
  return (
    <button
      {...p}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}
    >
      {loading ? (
        <>
          <Spinner />
          <span>{loadingText || 'Processing...'}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-0 sm:items-start sm:p-4 md:p-8">
      <div className="fixed inset-0 bg-ink/50 backdrop-blur-md transition-all animate-fadeIn" onClick={onClose} />
      <div
        className={`relative z-10 max-h-[92vh] w-full animate-slideUp overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden rounded-t-xl bg-white shadow-pop sm:rounded-xl ${
          wide ? 'max-w-3xl' : 'max-w-lg'
        }`}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-4 py-2.5 sm:px-5 sm:py-2.5">
          <h2 className="pr-2 text-[14px] font-bold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-chalk text-graphite hover:bg-line hover:text-ink transition-colors"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>
        <div className="p-3.5 sm:p-4">{children}</div>
      </div>
    </div>
  )
}

export function PageHeader({ title, sub, action }) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:mb-3.5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[18px] font-bold leading-tight text-ink sm:text-[20px] sm:leading-none">{title}</h1>
        {sub && <p className="mt-1 text-[11.5px] font-medium text-graphite">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

/** Minimal dependency-free bar chart. */
export function BarChart({ data, height = 140, valueKey = 'total' }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]))
  return (
    <div className="flex items-end gap-[3px]" style={{ height }}>
      {data.map((d, i) => (
        <div
          key={i}
          title={`${new Date(d.at).toLocaleDateString('en-IN')} — ₹${d[valueKey]}`}
          className="flex-1 rounded-t bg-forest/80 transition-colors hover:bg-lime"
          style={{ height: `${Math.max(2, (d[valueKey] / max) * 100)}%` }}
        />
      ))}
    </div>
  )
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Confirm action',
  message,
  confirmText = 'Delete permanently',
  cancelText = 'Cancel',
  tone = 'danger',
  loading = false,
  loadingText = 'Deleting...',
}) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !loading && onClose()
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, loading])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-ink/60 backdrop-blur-sm transition-opacity animate-fadeIn"
        onClick={() => !loading && onClose()}
      />
      <div className="relative z-10 w-full max-w-[480px] animate-slideUp overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-[#E5E2DA]">
        {/* Top-right dismiss button */}
        <button
          type="button"
          disabled={loading}
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-chalk text-graphite transition-all hover:bg-[#EAE7E0] hover:text-ink active:scale-95 disabled:opacity-40 cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon Badge */}
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-xs transition-transform ${
              tone === 'danger'
                ? 'bg-[#FEE4E2] text-[#D92D20] ring-8 ring-[#FEF3F2] border border-[#FECDCA]'
                : tone === 'warn'
                  ? 'bg-amber-100/80 text-amber-700 ring-8 ring-amber-50 border border-amber-200'
                  : 'bg-[#EEEDFC] text-[#4849E8] ring-8 ring-[#F8F7FF] border border-[#D5D2FE]'
            }`}
          >
            {tone === 'danger' ? (
              <svg className="h-6 w-6 text-[#D92D20]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            ) : tone === 'warn' ? (
              <svg className="h-6 w-6 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-[#4849E8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          <div className="min-w-0 flex-1 pr-6">
            <h3 className="text-[16px] font-bold text-ink leading-tight">{title}</h3>
            {message && (
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-graphite">
                {message}
              </p>
            )}
          </div>
        </div>

        {/* Warning Callout Box for Danger actions */}
        {tone === 'danger' && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#FECDCA] bg-[#FEF3F2] px-3 py-2 text-[11.5px] font-semibold text-[#B42318]">
            <svg className="h-4 w-4 shrink-0 text-[#D92D20]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>This action cannot be undone.</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 border-t border-line/70 pt-4">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-[#CBC8C1] bg-white px-5 py-2.5 text-[13px] font-semibold text-graphite transition-all hover:bg-chalk hover:border-[#ADA9A0] hover:text-ink active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-2xs whitespace-nowrap"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-sm whitespace-nowrap ${
              tone === 'danger'
                ? 'bg-[#E02438] hover:bg-[#C81E31] shadow-red-500/20'
                : tone === 'warn'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-forest hover:bg-ink'
            }`}
          >
            {loading ? (
              <>
                <Spinner className="h-3.5 w-3.5 text-white" />
                <span>{loadingText}</span>
              </>
            ) : (
              <>
                {tone === 'danger' && (
                  <svg className="h-4 w-4 shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
