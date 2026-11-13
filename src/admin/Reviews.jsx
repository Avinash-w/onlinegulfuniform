import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { apiDelete, apiGet, apiPatch } from '../lib/api.js'
import { Badge, Button, Card, ConfirmModal, PageHeader } from './ui.jsx'

const TABS = ['Pending', 'Approved', 'Rejected', 'All']

const Stars = ({ n }) => (
  <span className="whitespace-nowrap text-[13px] tracking-tight text-[#F5A623]" title={`${n}/5`}>
    {'★'.repeat(n)}
    <span className="text-line">{'★'.repeat(5 - n)}</span>
  </span>
)

export default function Reviews() {
  const { notify } = useCart()
  const [tab, setTab] = useState('Pending')
  const [rows, setRows] = useState([])
  const [counts, setCounts] = useState({ Pending: 0, Approved: 0, Rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const json = await apiGet(`/reviews${tab === 'All' ? '' : `?status=${tab}`}`, { auth: true })
      setRows(json.data?.reviews ?? [])
      setCounts(json.data?.counts ?? {})
    } catch (err) {
      notify(err.message || 'Unable to load reviews.')
    } finally {
      setLoading(false)
    }
  }, [tab, notify])

  useEffect(() => {
    load()
  }, [load])

  const setStatus = async (r, status) => {
    setBusyId(r.id)
    try {
      const json = await apiPatch(`/reviews/${r.id}`, { status }, { auth: true })
      notify(json.message || `Review ${status.toLowerCase()}.`)
      await load()
    } catch (err) {
      notify(err.message || 'Unable to update review.')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async () => {
    const r = deleting
    setBusyId(r.id)
    try {
      const json = await apiDelete(`/reviews/${r.id}`, { auth: true })
      notify(json.message || 'Review deleted.')
      setDeleting(null)
      await load()
    } catch (err) {
      notify(err.message || 'Unable to delete review.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Reviews"
        sub="Customer reviews appear on the product page only after you approve them."
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
              tab === t ? 'bg-forest text-white' : 'bg-white text-graphite ring-1 ring-line hover:ring-ink'
            }`}
          >
            {t}
            {t !== 'All' && <span className="ml-1.5 opacity-70">{counts[t] ?? 0}</span>}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <p className="py-10 text-center text-[13px] text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-muted">No {tab === 'All' ? '' : tab.toLowerCase()} reviews.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars n={r.rating} />
                    <Badge tone={r.status}>{r.status}</Badge>
                    <span className="text-[11px] text-muted">
                      {new Date(r.createdAt.replace(' ', 'T')).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] font-semibold text-ink">
                    {r.name}
                    <span className="font-normal text-muted"> on </span>
                    <Link to={`/admin/products/${encodeURIComponent(r.productHandle)}`} className="underline underline-offset-2">
                      {r.productTitle}
                    </Link>
                  </p>
                  {r.title && <p className="mt-1 text-[12.5px] font-medium">{r.title}</p>}
                  <p className="mt-1 whitespace-pre-line text-[12.5px] text-graphite">{r.body}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {r.status !== 'Approved' && (
                    <Button
                      className="!px-3 !py-1.5"
                      loading={busyId === r.id}
                      loadingText="…"
                      onClick={() => setStatus(r, 'Approved')}
                    >
                      Approve
                    </Button>
                  )}
                  {r.status !== 'Rejected' && (
                    <Button
                      variant="ghost"
                      className="!px-3 !py-1.5"
                      disabled={busyId === r.id}
                      onClick={() => setStatus(r, 'Rejected')}
                    >
                      Reject
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    className="!px-3 !py-1.5"
                    disabled={busyId === r.id}
                    onClick={() => setDeleting(r)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmModal
        open={Boolean(deleting)}
        onClose={() => busyId == null && setDeleting(null)}
        onConfirm={remove}
        loading={busyId != null && Boolean(deleting)}
        loadingText="Deleting…"
        title="Delete review?"
        message={`Permanently delete the review by ${deleting?.name || 'this customer'}? This cannot be undone.`}
        confirmText="Delete review"
        tone="danger"
      />
    </>
  )
}
