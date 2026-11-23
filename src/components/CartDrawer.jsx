import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { inr, useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { useStore } from '../store/StoreContext.jsx'
import { freeShippingAt, minOrderAmount, shippingFlat, siteSettings } from '../store/selectors.js'
import { ArrowLeft, ArrowUp, Check, Close, Minus, Plus, Tag } from './icons'
import Img from './Img'

export default function CartDrawer() {
  const {
    open,
    closeCart,
    lines,
    subtotal,
    finalSubtotal,
    savings,
    totalSavings,
    appliedCoupon,
    couponDiscount,
    applyCoupon,
    removeCoupon,
    inc,
    dec,
    remove,
  } = useCart()

  const { state } = useStore()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const shipAt = freeShippingAt(state)
  const shipFlat = shippingFlat(state)
  const placeholder = siteSettings(state).logo || '/logo.png'

  const [view, setView] = useState('cart') // 'cart' | 'coupons'
  const [couponInput, setCouponInput] = useState('')
  const [couponFeedback, setCouponFeedback] = useState(null) // { type: 'success' | 'error', message: string }

  const activeCoupons = (state.coupons ?? []).filter(
    (c) => c && c.active !== false && c.active !== 0 && c.active !== '0'
  )

  const goCheckout = () => {
    closeCart()
    navigate('/checkout')
  }

  const handleApply = (couponOrCode) => {
    setCouponFeedback(null)
    const res = applyCoupon(couponOrCode, activeCoupons)
    if (res.success) {
      setCouponFeedback({ type: 'success', message: res.message })
      setCouponInput('')
      setTimeout(() => {
        setView('cart')
        setCouponFeedback(null)
      }, 900)
    } else {
      setCouponFeedback({ type: 'error', message: res.message })
    }
  }

  const handleManualApply = (e) => {
    e.preventDefault()
    if (!couponInput.trim()) return
    handleApply(couponInput.trim())
  }

  const minOrder = minOrderAmount(state)
  const belowMin = minOrder > 0 && (finalSubtotal ?? subtotal) < minOrder
  const effectiveTotal = (finalSubtotal ?? subtotal) + ((finalSubtotal ?? subtotal) >= shipAt ? 0 : shipFlat)
  const currentSavings = totalSavings ?? savings

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-ink/45 backdrop-blur-sm transition-all duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'pointer-events-none opacity-0'
        }`}
        onClick={closeCart}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[92%] max-w-[420px] flex-col bg-white shadow-drawer transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Shopping bag"
      >
        {/* Drawer Header */}
        <div className="flex h-12 items-center justify-between border-b border-line px-4 sm:h-14 sm:px-5">
          {view === 'coupons' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setView('cart')
                  setCouponFeedback(null)
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-chalk transition-colors text-ink"
                aria-label="Back to bag"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h2 className="label-caps">{t('applyCoupon')}</h2>
            </div>
          ) : (
            <h2 className="label-caps">{t('myBag')}</h2>
          )}

          <button
            onClick={closeCart}
            aria-label="Close cart"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink/70 hover:bg-chalk hover:text-ink transition-colors active:scale-95"
          >
            <Close className="h-5 w-5" />
          </button>
        </div>

        {/* View: Coupons List & Manual Input */}
        {view === 'coupons' ? (
          <div className="flex flex-1 flex-col overflow-y-auto bg-chalk/40">
            {/* Top manual input box */}
            <div className="border-b border-line bg-white p-4">
              <form onSubmit={handleManualApply} className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value.toUpperCase())
                    if (couponFeedback) setCouponFeedback(null)
                  }}
                  placeholder={t('enterCoupon')}
                  className={`flex-1 rounded-lg border bg-cream/40 px-3.5 py-2.5 font-mono text-[13px] font-semibold tracking-wider text-ink outline-none transition-colors ${
                    couponFeedback?.type === 'error'
                      ? 'border-red-500 ring-1 ring-red-500/30'
                      : 'border-line focus:border-forest focus:bg-white'
                  }`}
                />
                <button
                  type="submit"
                  disabled={!couponInput.trim()}
                  className="rounded-lg bg-forest px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-lime transition-opacity hover:bg-forest/90 disabled:opacity-40"
                >
                  {t('apply')}
                </button>
              </form>

              {couponFeedback && (
                <div
                  className={`mt-2.5 rounded-md px-3 py-2 text-[12px] font-medium ${
                    couponFeedback.type === 'success'
                      ? 'bg-save/10 text-save'
                      : 'bg-sale/10 text-sale'
                  }`}
                >
                  {couponFeedback.message}
                </div>
              )}
            </div>

            {/* Coupons List */}
            <div className="flex-1 space-y-3.5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider2 text-muted">
                {t('availableCoupons')} ({activeCoupons.length})
              </p>

              {activeCoupons.length === 0 ? (
                <div className="py-8 text-center text-muted text-[13px]">
                  No active coupons available right now.
                </div>
              ) : (
                activeCoupons.map((c) => {
                  const isApplied = appliedCoupon?.code?.toUpperCase() === c.code.toUpperCase()
                  const minReq = Number(c.minCart || 0)
                  const isEligible = subtotal >= minReq
                  const neededMore = minReq - subtotal
                  const discountText =
                    c.type === 'percent' ? `${c.value}% OFF` : `FLAT ₹${c.value} OFF`
                  
                  let estimatedSavings = 0
                  if (c.type === 'percent') {
                    estimatedSavings = Math.round((subtotal * Number(c.value)) / 100)
                  } else {
                    estimatedSavings = Math.min(Number(c.value), subtotal)
                  }

                  return (
                    <div
                      key={c.code}
                      className={`relative rounded-2xl border bg-white p-3.5 sm:p-4 shadow-xs transition-all ${
                        isApplied
                          ? 'border-save ring-1 ring-save/30 bg-save/[0.02]'
                          : isEligible
                          ? 'border-line hover:border-forest/40'
                          : 'border-line/70 opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="inline-flex items-center gap-1 rounded-md bg-forest/10 px-2 py-0.5 font-mono text-[11.5px] sm:text-[12px] font-bold text-forest">
                              <Tag className="h-3 w-3" />
                              {c.code}
                            </span>
                            <span className="text-[12.5px] sm:text-[13px] font-bold text-forest whitespace-nowrap">
                              {discountText}
                            </span>
                          </div>

                          <p className="mt-1.5 text-[11.5px] sm:text-[12px] text-graphite leading-snug">
                            {c.type === 'percent'
                              ? `Get ${c.value}% discount on your cart total.`
                              : `Save Flat ${inr(c.value)} on this purchase.`}
                          </p>

                          <p className="mt-1 text-[10.5px] sm:text-[11px] text-muted">
                            {minReq > 0
                              ? `Valid on orders above ${inr(minReq)}`
                              : 'No minimum order required'}
                          </p>

                          {isEligible && estimatedSavings > 0 && !isApplied && (
                            <p className="mt-1.5 text-[11px] font-semibold text-save">
                              You will save {inr(estimatedSavings)} with this code
                            </p>
                          )}

                          {!isEligible && (
                            <p className="mt-1.5 text-[10.5px] sm:text-[11px] font-medium text-muted">
                              Add {inr(neededMore)} more to unlock this coupon
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 pt-0.5">
                          {isApplied ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-save">
                                <Check className="h-3.5 w-3.5" /> APPLIED
                              </span>
                              <button
                                onClick={removeCoupon}
                                className="text-[11px] text-muted underline hover:text-sale"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleApply(c)}
                              disabled={!isEligible}
                              className={`rounded-xl px-3 sm:px-3.5 py-1.5 text-[11px] sm:text-[11.5px] font-bold uppercase tracking-wider transition-all shadow-2xs ${
                                isEligible
                                  ? 'bg-lime text-forest hover:bg-forest hover:text-lime active:scale-95'
                                  : 'cursor-not-allowed bg-chalk text-muted'
                              }`}
                            >
                              {t('apply')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        ) : lines.length === 0 ? (
          /* View: Empty Bag */
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <Img src={placeholder} alt="" className="mb-5 h-24 w-24 object-contain" />
            <p className="font-display text-lg uppercase">{t('cartEmpty')}</p>
            <p className="mt-2 text-[12px] text-muted">
              {t('cartEmptySub')}
            </p>
            <button
              onClick={() => {
                closeCart()
                navigate('/collections/all-products')
              }}
              className="btn-ink mt-7"
            >
              {t('continueShopping')}
            </button>
          </div>
        ) : (
          /* View: Cart Items & Summary */
          <>
            <div className="flex-1 overflow-y-auto px-3.5 py-2.5 sm:px-5 sm:py-4">
              {lines.map((l) => (
                <div key={l.key} className="flex gap-2.5 sm:gap-3 border-b border-line py-2.5 sm:py-3.5">
                  <div className="h-16 w-14 sm:h-20 sm:w-16 shrink-0 overflow-hidden rounded-md bg-chalk">
                    <Img src={l.image} alt={l.title} width={200} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[11.5px] sm:text-[12px] font-medium leading-snug">{l.title}</p>
                    <p className="mt-0.5 text-[10.5px] sm:text-[11px] text-muted">{t('size')}: {l.size}</p>
                    {l.customNote && (
                      <div className="mt-1 rounded border border-forest/15 bg-forest/5 px-1.5 py-0.5 text-[10px] text-forest">
                        <span className="block text-[8.5px] font-semibold uppercase tracking-wider2 text-forest/80">
                          {t('customization')}:
                        </span>
                        <span className="line-clamp-1 italic text-ink">&ldquo;{l.customNote}&rdquo;</span>
                      </div>
                    )}
                    <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
                      <span className="text-[10px] sm:text-[10.5px] text-muted font-normal">
                        {inr(l.price)} × {l.qty} =
                      </span>
                      <span className="text-[12px] sm:text-[13px] font-semibold text-ink">{inr(l.price * l.qty)}</span>
                      {l.compareAt > l.price && (
                        <span className="text-[10.5px] sm:text-[11px] text-muted line-through">{inr(l.compareAt * l.qty)}</span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center rounded border border-line">
                        <button onClick={() => dec(l.key)} className="px-2 py-1 hover:bg-chalk" aria-label="Decrease">
                          <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </button>
                        <span className="min-w-5 sm:min-w-6 text-center text-[11px] sm:text-[12px] font-medium">{l.qty}</span>
                        <button onClick={() => inc(l.key)} className="px-2 py-1 hover:bg-chalk" aria-label="Increase">
                          <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => remove(l.key)}
                        className="text-[10.5px] sm:text-[11px] uppercase tracking-wider2 text-muted hover:text-sale underline underline-offset-2"
                      >
                        {t('remove')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-line px-3.5 py-3 sm:px-5 sm:py-4">
              {/* Savings & Coupons Trigger Row */}
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] sm:text-[12px] font-medium text-save">
                  {currentSavings > 0 ? `${t('youSave')} ${inr(currentSavings)}` : t('availableOffers')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setView('coupons')
                    setCouponFeedback(null)
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-forest/25 bg-forest/5 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10.5px] sm:text-[11px] font-semibold text-forest transition-all hover:border-forest hover:bg-forest hover:text-lime"
                  title="View and apply coupons"
                >
                  <Tag className="h-3 w-3" />
                  <span>{appliedCoupon ? appliedCoupon.code : t('coupons')}</span>
                  <ArrowUp className="h-3 w-3" />
                </button>
              </div>

              {/* Applied Coupon Info if active */}
              {appliedCoupon && couponDiscount > 0 && (
                <div className="mb-2 flex items-center justify-between rounded-lg bg-save/10 px-2.5 py-1 text-[11px] sm:text-[12px]">
                  <span className="font-medium text-save flex items-center gap-1">
                    <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {t('coupon')} ({appliedCoupon.code})
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-save">-{inr(couponDiscount)}</span>
                    <button
                      onClick={removeCoupon}
                      className="text-[10px] text-muted underline hover:text-sale"
                    >
                      {t('remove')}
                    </button>
                  </div>
                </div>
              )}

              <div className="mb-2.5 flex items-center justify-between">
                <span className="label-caps text-[10.5px] sm:text-[11px]">{t('subtotal')}</span>
                <div className="text-right">
                  {couponDiscount > 0 && (
                    <span className="mr-2 text-[11px] sm:text-[12px] text-muted line-through">{inr(subtotal)}</span>
                  )}
                  <span className="text-sm sm:text-base font-semibold">{inr(finalSubtotal ?? subtotal)}</span>
                </div>
              </div>

              {belowMin && (
                <p className="mb-2 rounded-lg bg-sale/10 px-2.5 py-1.5 text-center text-[11px] sm:text-[12px] font-medium text-sale">
                  {t('minOrderMsg', { amount: inr(minOrder), more: inr(minOrder - (finalSubtotal ?? subtotal)) })}
                </p>
              )}
              <button
                className="btn-ink w-full py-2.5 sm:py-3 text-[12px] sm:text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={goCheckout}
                disabled={belowMin}
              >
                {t('checkout')} · {inr(effectiveTotal)}
              </button>
              <p className="mt-2 text-center text-[10px] sm:text-[11px] text-muted">
                {shipAt > 0 ? `${t('shopForFreeShipping', { amount: inr(shipAt) })}` : t('freeShippingNote')} · {t('dayReturns')}
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
