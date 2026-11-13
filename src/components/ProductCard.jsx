import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { inr, useCart } from '../context/CartContext'
import { apiPost, getCustomerToken } from '../lib/api.js'
import { useStore } from '../store/StoreContext.jsx'
import { isCustomProduct } from '../store/selectors.js'
import { ChevronLeft, ChevronRight, Heart, Percent, Star } from './icons'
import Img from './Img'

/** Distinct chip colors per badge label. */
const BADGE_TONE = {
  'BEST SELLER': 'bg-[#D2E94A] text-[#121124] font-bold shadow-xs',
  'NEW ARRIVAL': 'bg-[#4849E8] text-white font-bold shadow-xs',
  'LUXURY': 'bg-[#1B1947] text-[#D2E94A] font-bold border border-[#D2E94A]/30 shadow-xs',
  'TRENDING': 'bg-[#E02438] text-white font-bold shadow-xs',
  'BEST VALUE': 'bg-[#0F944E] text-white font-bold shadow-xs',
  'VALUE PACK': 'bg-[#0F944E] text-white font-bold shadow-xs',
  'GIFT SET': 'bg-[#4849E8] text-white font-bold shadow-xs',
  'FESTIVE SPECIAL': 'bg-[#E07A10] text-white font-bold shadow-xs',
  'FESTIVE': 'bg-[#E07A10] text-white font-bold shadow-xs',
  'FESTIVE DECOR': 'bg-[#E07A10] text-white font-bold shadow-xs',
  'ROYAL DECOR': 'bg-[#1B1947] text-[#E0B84C] font-bold shadow-xs',
  'SIGNATURE COLLECTION': 'bg-[#1B1947] text-white font-bold shadow-xs',
  'WELLNESS': 'bg-[#2A8F82] text-white font-bold shadow-xs',
  'HEALING': 'bg-[#2A8F82] text-white font-bold shadow-xs',
  'CUTE FINDS': 'bg-[#D6457B] text-white font-bold shadow-xs',
  'CUSTOM': 'bg-[#4849E8] text-white font-bold shadow-xs',
  'BESPOKE': 'bg-[#1B1947] text-[#D2E94A] font-bold shadow-xs',
  'EXCLUSIVE': 'bg-[#4849E8] text-white font-bold shadow-xs',
  'BULK SAVINGS': 'bg-[#0F944E] text-white font-bold shadow-xs',
  'CORPORATE': 'bg-[#1B1947] text-white font-bold shadow-xs',
  'PORTABLE': 'bg-[#4849E8] text-white font-bold shadow-xs',
  'PACK OF 2': 'bg-[#4849E8] text-white font-bold shadow-xs',
  'PACK OF 10': 'bg-[#4849E8] text-white font-bold shadow-xs',
  'SALE': 'bg-[#E02438] text-white font-bold shadow-xs',
  'NEW IN': 'bg-[#4849E8] text-white font-bold shadow-xs',
}

function badgeTone(label) {
  return BADGE_TONE[label] || 'bg-[#4849E8] text-white font-bold shadow-xs'
}

/** One badge at a time — fades out, swaps, fades in. */
function BadgeCycle({ badges }) {
  const [i, setI] = useState(0)
  const [on, setOn] = useState(true)

  useEffect(() => {
    if (badges.length <= 1) return
    let fadeTimer
    const id = setInterval(() => {
      setOn(false)
      fadeTimer = window.setTimeout(() => {
        setI((v) => (v + 1) % badges.length)
        setOn(true)
      }, 320)
    }, 2600)
    return () => {
      clearInterval(id)
      if (fadeTimer) clearTimeout(fadeTimer)
    }
  }, [badges.length])

  const label = badges[Math.min(i, badges.length - 1)]
  return (
    <div className="absolute left-2.5 top-2.5 z-10 min-h-[22px]">
      <span
        className={`inline-flex items-center rounded-md px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider shadow-sm transition-all duration-300 ease-out md:text-[9.5px] ${badgeTone(label)} ${
          on ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-1.5 opacity-0 scale-95'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

/**
 * Product tile — homepage rails, collection grid and PDP "Similar Products".
 *
 * On the reference site each card holds the product's full image set and
 * behaves like a mini gallery on hover: moving across the image scrubs through
 * the shots, with dot indicators underneath. Cards with a single image just
 * do the scale-up hover.
 */
export default function ProductCard({ product, className = '', imageRatio = 'aspect-[3/4]' }) {
  const { lines = [], add, inc, dec, notify } = useCart()
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const [idx, setIdx] = useState(0)
  const [hover, setHover] = useState(false)
  // Extra gallery frames are only mounted after the first hover, so a rail loads 1 image per card.
  const [wantAll, setWantAll] = useState(false)
  const [picking, setPicking] = useState(false)
  const [wishBusy, setWishBusy] = useState(false)

  const {
    handle, title, images, price, compareAt, discount, bestPrice,
    rating, reviews, colorCount, badges = [], soldOut, sizes = [],
  } = product

  const multi = images.length > 1
  const wished = state.wishlist.includes(handle)

  const cartLines = lines.filter((l) => l.handle === handle)
  const totalInCart = cartLines.reduce((sum, l) => sum + l.qty, 0)

  /** Scrub through images based on cursor position across the image. */
  const onMove = (e) => {
    if (!multi) return
    const { left, width } = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - left) / width
    const next = Math.min(images.length - 1, Math.max(0, Math.floor(ratio * images.length)))
    setIdx(next)
  }

  const step = (e, d) => {
    e.preventDefault()
    e.stopPropagation()
    setIdx((i) => (i + d + images.length) % images.length)
  }

  const toggleWish = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (wishBusy) return
    if (!state.currentUserId || !getCustomerToken()) {
      navigate('/login', { state: { from: { pathname: `/products/${handle}` } } })
      return
    }
    setWishBusy(true)
    try {
      const json = await apiPost('/wishlist/toggle', { handle }, { auth: 'customer' })
      dispatch({ type: 'wishlist/set', handles: json.data?.wishlist ?? [] })
      notify(json.message || (json.data?.added ? 'Added to wishlist.' : 'Removed from wishlist.'))
    } catch (err) {
      notify(err.message || 'Unable to update wishlist.')
    } finally {
      setWishBusy(false)
    }
  }

  return (
    <article
      className={`group relative flex h-full flex-col ${className}`}
      onMouseEnter={() => {
        setHover(true)
        setWantAll(true)
      }}
      onMouseLeave={() => {
        setHover(false)
        setPicking(false)
        setIdx(0)
      }}
    >
      <Link
        to={`/products/${handle}`}
        className="relative block overflow-hidden rounded-lg bg-chalk"
        onMouseMove={onMove}
      >
        <div className={`relative w-full ${imageRatio}`}>
          {/* All frames stacked; opacity swap avoids re-decoding on every move. */}
          {images.map((src, i) => (i === 0 || wantAll ? (
            <Img
              key={src}
              src={src}
              alt={i === 0 ? title : ''}
              width={600}
              className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-200 ${
                i === idx ? 'opacity-100' : 'opacity-0'
              } ${!multi ? 'transition-transform duration-500 group-hover:scale-[1.03]' : ''}`}
            />
          ) : null))}
        </div>

        {/* badges — one at a time, rotating with fade */}
        {badges.length > 0 && <BadgeCycle badges={badges} />}

        {/* hover arrows */}
        {multi && hover && (
          <>
            <button
              onClick={(e) => step(e, -1)}
              aria-label="Previous image"
              className="absolute left-1.5 top-1/2 hidden -translate-y-1/2 place-items-center rounded-full bg-white/85 p-1.5 md:grid"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => step(e, 1)}
              aria-label="Next image"
              className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 place-items-center rounded-full bg-white/85 p-1.5 md:grid"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </>
        )}

        {/* dot indicators */}
        {multi && (
          <div
            className={`absolute inset-x-0 bottom-2 flex justify-center gap-1 transition-opacity ${
              hover ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-[3px] rounded-full transition-all ${
                  i === idx ? 'w-4 bg-ink' : 'w-1.5 bg-ink/30'
                }`}
              />
            ))}
          </div>
        )}

        {soldOut && (
          <div className="absolute inset-0 grid place-items-center bg-white/55">
            <span className="border border-ink bg-white px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider2">
              Sold out
            </span>
          </div>
        )}
      </Link>

      {/* wishlist toggle — outside the Link so it doesn't navigate */}
      <button
        type="button"
        onClick={toggleWish}
        disabled={wishBusy}
        aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
        aria-pressed={wished}
        className={`absolute right-2 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-card transition-colors disabled:opacity-50 ${
          wished ? 'text-sale' : 'text-ink hover:text-sale'
        }`}
      >
        <Heart filled={wished} className="h-4 w-4" />
      </button>

      {/* price row */}
      <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-[13px] font-semibold md:text-sm">{inr(price)}</span>
        {compareAt > price && (
          <>
            <span className="text-[11px] text-muted line-through md:text-[12px]">
              {inr(compareAt)}
            </span>
            <span className="text-[11px] font-semibold text-save md:text-[12px]">
              {discount}% off
            </span>
          </>
        )}
      </div>

      {bestPrice && (
        <p className="mt-1 inline-flex w-fit items-center gap-1 bg-save/10 px-1.5 py-0.5 text-[10px] font-medium text-save md:text-[11px]">
          <Percent className="h-3 w-3" />
          Best price {inr(bestPrice)}
        </p>
      )}

      <h3 className="mt-1.5 line-clamp-2 min-h-[2.6em] text-[12px] leading-snug text-graphite md:text-[13px]">
        <Link to={`/products/${handle}`}>{title}</Link>
      </h3>

      <div className="mt-1.5 flex min-h-4 items-center gap-3">
        {rating != null && (
          <span className="flex items-center gap-1 text-[11px] text-muted">
            <Star className="h-3 w-3 text-star" />
            {rating.toFixed(1)}
            <span className="text-muted/80">({reviews})</span>
          </span>
        )}
        {colorCount > 1 && <span className="text-[11px] text-muted">{colorCount} colors</span>}
      </div>

      {/* mt-auto keeps the CTA pinned to the card bottom so rows stay aligned */}
      <div className="mt-auto pt-2">
        {soldOut ? (
          <button disabled className="btn-outline w-full cursor-not-allowed opacity-50 py-1.5 text-[10.5px] sm:py-2.5 sm:text-xs">
            Sold out
          </button>
        ) : isCustomProduct(product) ? (
          <Link
            to={`/products/${handle}`}
            className="btn-outline flex w-full items-center justify-center gap-1.5 border-brand/40 bg-brand/5 py-1.5 text-[10.5px] text-brand transition-all hover:bg-brand hover:text-white sm:py-2.5 sm:text-xs"
          >
            <span>✨</span> Customize
          </Link>
        ) : totalInCart > 0 ? (
          <div className="flex h-[32px] sm:h-[38px] w-full items-center justify-between rounded-lg border border-[#4849E8] bg-[#EEEDFC] p-0.5 sm:p-1 shadow-xs">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (cartLines.length > 0) {
                  dec(cartLines[cartLines.length - 1].key)
                }
              }}
              aria-label="Decrease quantity"
              className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-md bg-white text-[13px] font-bold text-[#4849E8] shadow-xs transition-transform active:scale-90 hover:bg-[#4849E8] hover:text-white"
            >
              −
            </button>
            <span className="text-[13px] sm:text-[14px] font-bold text-[#4849E8] select-none">
              {totalInCart}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (cartLines.length > 0) {
                  inc(cartLines[cartLines.length - 1].key)
                } else {
                  add({ handle, title, image: images[0], price, compareAt, size: sizes[0] || 'One size' })
                }
              }}
              aria-label="Increase quantity"
              className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-md bg-[#4849E8] text-[13px] font-bold text-white shadow-xs transition-transform active:scale-90 hover:bg-[#3839D6]"
            >
              +
            </button>
          </div>
        ) : picking ? (
          <div className="flex flex-wrap gap-1">
            {sizes.map((s) => (
              <button
                key={s}
                onClick={() => {
                  add({ handle, title, image: images[0], price, compareAt, size: s })
                  setPicking(false)
                }}
                className="flex-1 min-w-[32px] rounded-md border border-line px-1.5 py-1 text-[10.5px] font-semibold transition-colors hover:border-ink hover:bg-ink hover:text-white"
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() =>
              // No size grid (Home & Living) ⇒ straight into the bag.
              sizes.length
                ? setPicking(true)
                : add({ handle, title, image: images[0], price, compareAt, size: 'One size' })
            }
            className="btn-outline w-full py-1.5 text-[10.5px] sm:py-2.5 sm:text-xs"
          >
            Add to cart
          </button>
        )}
      </div>
    </article>
  )
}
