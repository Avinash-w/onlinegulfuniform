import { useState } from 'react'
import { Check, Copy, Tag } from './icons'

export default function CouponMarquee({ coupons = [] }) {
  const [copiedCode, setCopiedCode] = useState(null)

  const activeCoupons = coupons.filter(
    (c) => c && c.active !== false && c.active !== 0 && c.active !== '0'
  )

  if (!activeCoupons.length) return null

  const handleCopy = (code) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code)
    }
    setCopiedCode(code)
    setTimeout(() => {
      setCopiedCode((cur) => (cur === code ? null : cur))
    }, 2000)
  }

  // Duplicate items for seamless continuous looping marquee
  const loopItems = [...activeCoupons, ...activeCoupons, ...activeCoupons, ...activeCoupons, ...activeCoupons, ...activeCoupons]

  return (
    <div className="w-full overflow-hidden py-3">
      <div className="relative w-full overflow-hidden">
        {/* Left and Right subtle edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-cream to-transparent md:w-16" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-cream to-transparent md:w-16" />

        <div className="flex w-max animate-marquee items-center gap-3.5 hover:[animation-play-state:paused]">
          {loopItems.map((c, i) => {
            const isCopied = copiedCode === c.code
            const discountLabel =
              c.type === 'percent' ? `${c.value}% OFF` : `FLAT ₹${c.value} OFF`
            const minCartLabel =
              c.minCart && Number(c.minCart) > 0
                ? `Min Order ₹${Number(c.minCart).toLocaleString('en-IN')}`
                : 'No Min Order'

            return (
              <div
                key={`${c.code}-${i}`}
                onClick={() => handleCopy(c.code)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCopy(c.code)}
                title={`Click to copy ${c.code}`}
                className="inline-flex cursor-pointer select-none items-center gap-2.5 rounded-full border border-brand/25 bg-white px-4 py-2 shadow-sm transition-all hover:border-brand hover:shadow-md active:scale-95"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
                  <Tag className="h-3 w-3" />
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-brand text-[12px] tracking-wide">
                    {discountLabel}
                  </span>
                  <span className="text-[11px] text-muted">({minCartLabel})</span>
                </div>

                <div className="flex items-center gap-1 rounded-full bg-brandLight px-2.5 py-0.5 font-mono text-[11px] font-bold text-brand">
                  <span>{c.code}</span>
                  {isCopied ? (
                    <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] font-medium text-save">
                      <Check className="h-3 w-3" /> Copied!
                    </span>
                  ) : (
                    <Copy className="ml-1 h-3 w-3 text-muted/80 transition-colors group-hover:text-brand" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
