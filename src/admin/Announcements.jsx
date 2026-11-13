import { useEffect, useState } from 'react'
import { useStore } from '../store/StoreContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { storefrontContent } from '../store/selectors.js'
import { apiPatch } from '../lib/api.js'
import { Button, Card, ConfirmModal, Input, PageHeader } from './ui.jsx'

export default function Announcements() {
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const items = storefrontContent(state).announcements ?? []
  const [draft, setDraft] = useState(items)
  const [saving, setSaving] = useState(false)
  const [deletingIndex, setDeletingIndex] = useState(null)

  useEffect(() => {
    setDraft(items)
  }, [JSON.stringify(items)])

  const save = async () => {
    if (saving) return
    const value = draft.map((t) => t.trim()).filter(Boolean)
    setSaving(true)
    try {
      const json = await apiPatch('/content', { section: 'announcements', value }, { auth: true })
      dispatch({ type: 'catalog/setContent', content: json.data.content })
      setDraft(json.data.content.announcements ?? value)
      notify(json.message || 'Announcements saved.')
    } catch (err) {
      notify(err.message || 'Unable to save announcements.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Announcements"
        sub="Rotating messages in the top storefront announcement bar."
        action={
          <Button
            onClick={save}
            disabled={saving || JSON.stringify(draft) === JSON.stringify(items)}
            loading={saving}
            loadingText="Saving..."
          >
            Save changes
          </Button>
        }
      />

      <Card>
        <div className="space-y-3">
          {draft.map((text, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <Input
                value={text}
                onChange={(e) =>
                  setDraft((rows) => rows.map((r, idx) => (idx === i ? e.target.value : r)))
                }
                placeholder="e.g. Complimentary gift box on all orders above ₹1499"
                className="min-w-0 flex-1"
              />
              <Button
                variant="ghost"
                className="!px-2.5 !py-1.5"
                disabled={i === 0}
                title="Move up"
                onClick={() =>
                  setDraft((rows) => {
                    const next = [...rows]
                    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                    return next
                  })
                }
              >
                ↑
              </Button>
              <Button
                variant="ghost"
                className="!px-2.5 !py-1.5"
                disabled={i === draft.length - 1}
                title="Move down"
                onClick={() =>
                  setDraft((rows) => {
                    const next = [...rows]
                    ;[next[i + 1], next[i]] = [next[i], next[i + 1]]
                    return next
                  })
                }
              >
                ↓
              </Button>
              <Button
                variant="danger"
                className="!px-2.5 !py-1.5"
                onClick={() => setDeletingIndex(i)}
              >
                Delete
              </Button>
            </div>
          ))}

          {draft.length === 0 && (
            <div className="py-8 text-center text-muted text-[13px]">
              No announcements configured. Add a message below.
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-line/60 pt-4">
          <Button
            variant="ghost"
            onClick={() => setDraft((rows) => [...rows, 'NEW ANNOUNCEMENT MESSAGE'])}
          >
            + Add message
          </Button>
          <Button variant="ghost" onClick={() => setDraft(items)}>
            Reset
          </Button>
        </div>
      </Card>

      <ConfirmModal
        open={deletingIndex !== null}
        onClose={() => !saving && setDeletingIndex(null)}
        loading={saving}
        loadingText="Deleting announcement..."
        onConfirm={async () => {
          if (deletingIndex === null) return
          const next = draft.filter((_, idx) => idx !== deletingIndex)
          setSaving(true)
          try {
            const json = await apiPatch('/content', { section: 'announcements', value: next }, { auth: true })
            dispatch({ type: 'catalog/setContent', content: json.data.content })
            setDraft(json.data.content.announcements ?? next)
            notify('Announcement removed and database updated.')
            setDeletingIndex(null)
          } catch (err) {
            notify(err.message || 'Unable to delete announcement.')
          } finally {
            setSaving(false)
          }
        }}
        title="Delete announcement?"
        message={`Are you sure you want to permanently remove this announcement: "${draft[deletingIndex] || ''}"?`}
        confirmText="Delete announcement"
        tone="danger"
      />
    </>
  )
}
