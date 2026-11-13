import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { apiGet, apiPost, getCustomerToken } from '../lib/api.js'
import { useStore } from '../store/StoreContext.jsx'
import { Star } from './icons'

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          aria-label={`${s} star${s > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(s)}
          onClick={() => onChange(s)}
          className="p-0.5"
        >
          <Star className={`h-6 w-6 ${s <= (hover || value) ? 'text-star' : 'text-line'}`} />
        </button>
      ))}
    </div>
  )
}

function ReviewForm({ handle, onDone, onCancel }) {
  const { notify } = useCart()
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!rating) return setError('Please choose a star rating.')
    if (text.trim().length < 10) return setError('Please write at least 10 characters.')
    setBusy(true)
    setError('')
    try {
      const json = await apiPost(
        `/products/${encodeURIComponent(handle)}/reviews`,
        { rating, title: title.trim(), body: text.trim() },
        { auth: 'customer' }
      )
      notify(json.message || 'Thanks! Your review is awaiting approval.')
      onDone('Pending')
    } catch (err) {
      const first = err.errors && Object.values(err.errors)[0]
      setError(first || err.message || 'Unable to submit review.')
      if (err.status === 409) onDone('Pending')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3 rounded-lg border border-line bg-white p-4">
      <p className="text-[13px] font-semibold">Write a review</p>
      <div>
        <p className="mb-1 text-[11px] text-muted">Your rating</p>
        <StarPicker value={rating} onChange={setRating} />
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={160}
        placeholder="Title (optional)"
        className="w-full rounded-md border border-line px-3 py-2 text-[13px] focus:border-ink focus:outline-none"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="Share your experience with this product…"
        className="w-full rounded-md border border-line px-3 py-2 text-[13px] focus:border-ink focus:outline-none"
      />
      {error && <p className="text-[12px] text-sale">{error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={busy} className="btn-ink px-5 py-2 text-[11px] disabled:opacity-50">
          {busy ? 'Submitting…' : 'Submit review'}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-2 text-[12px] text-muted underline">
          Cancel
        </button>
      </div>
      <p className="text-[11px] text-muted">Your review will be published after our team approves it.</p>
    </form>
  )
}

export default function ReviewSummary({ handle }) {
  const { state } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [live, setLive] = useState(null) // real, approved reviews for this product
  const [mine, setMine] = useState(null) // { status } if this customer already reviewed
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    if (!handle) return
    let alive = true
    setLive(null)
    setFormOpen(false)
    apiGet(`/products/${encodeURIComponent(handle)}/reviews`, { auth: 'customer' })
      .then((json) => {
        if (!alive) return
        setLive(json.data)
        setMine(json.data?.mine ?? null)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [handle])

  // Everything here comes from this product's approved customer reviews.
  const empty = {
    average: 0,
    total: 0,
    distribution: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0, pct: 0 })),
    items: [],
  }
  const { average, total, distribution, items } = live ?? empty

  const onWrite = () => {
    if (!state.currentUserId || !getCustomerToken()) {
      navigate('/login', { state: { from: { pathname: location.pathname } } })
      return
    }
    setFormOpen(true)
  }

  return (
    <div>
      <h3 className="font-display text-[20px] uppercase">Customer Reviews</h3>
      <p className="mt-1 text-[12px] text-muted">
        {total > 0 ? `Based on ${total} review${total > 1 ? 's' : ''}` : 'No reviews yet'}
      </p>

      <div className="mt-5 flex flex-row items-center gap-3 sm:gap-6 md:items-start md:gap-10">
        <div className="shrink-0 text-center">
          <p className="font-display text-[40px] leading-none">{average}</p>
          <div className="mt-1.5 flex justify-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-3.5 w-3.5 ${s <= Math.round(average) ? 'text-star' : 'text-line'}`}
              />
            ))}
          </div>
          {mine ? (
            <p className="mt-3 max-w-[140px] text-[11px] text-muted">
              {mine.status === 'Approved'
                ? 'You reviewed this product.'
                : mine.status === 'Rejected'
                  ? 'Your review was not approved.'
                  : 'Your review is awaiting approval.'}
            </p>
          ) : (
            <button
              type="button"
              onClick={onWrite}
              className="mt-3 text-[11px] underline underline-offset-2"
            >
              Write a review
            </button>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          {(distribution ?? []).map((d) => (
            <div key={d.stars} className="flex items-center gap-1.5 text-[10.5px] sm:gap-2.5 sm:text-[11px]">
              <span className="w-7 shrink-0 text-muted sm:w-8">{d.stars} ★</span>
              <div className="h-1.5 flex-1 bg-line">
                <div className="h-full bg-star" style={{ width: `${d.pct}%` }} />
              </div>
              <span className="w-[54px] shrink-0 text-right text-muted sm:w-14">
                {d.pct}% ({d.count})
              </span>
            </div>
          ))}
        </div>
      </div>

      {formOpen && !mine && (
        <ReviewForm
          handle={handle}
          onCancel={() => setFormOpen(false)}
          onDone={(status) => {
            setMine({ status })
            setFormOpen(false)
          }}
        />
      )}

      <ul className="mt-7 divide-y divide-line border-t border-line">
        {(items ?? []).map((r) => (
          <li key={r.id ?? r.name} className="flex gap-3 py-4">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-chalk text-[12px] font-semibold">
              {r.name[0]}
            </span>
            <div>
              <p className="text-[12px] font-semibold">{r.name}</p>
              {r.rating != null && (
                <div className="mt-0.5 flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-3 w-3 ${s <= r.rating ? 'text-star' : 'text-line'}`} />
                  ))}
                </div>
              )}
              {r.title && <p className="mt-0.5 text-[12px] font-medium">{r.title}</p>}
              <p className="mt-1 text-[12px] text-graphite">{r.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
