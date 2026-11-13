import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { storefrontContent } from '../store/selectors.js'
import { apiPatch, apiUpload } from '../lib/api.js'
import { Button, Card, ConfirmModal, Field, Input, Modal, PageHeader } from './ui.jsx'

export default function CollectionsAdmin() {
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const meta = storefrontContent(state).collectionMeta ?? {}
  const entries = useMemo(
    () => Object.entries(meta).map(([slug, data]) => ({ slug, ...data })),
    [meta]
  )
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [busySlug, setBusySlug] = useState(null)
  const [deletingSlug, setDeletingSlug] = useState(null)

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await apiUpload(file, editing?.slug || editing?.name || 'collection')
      if (res.data?.url) {
        setEditing((s) => ({ ...s, banner: res.data.url }))
      }
    } catch {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setEditing((s) => ({ ...s, banner: ev.target?.result }))
      }
      reader.readAsDataURL(file)
    } finally {
      setUploading(false)
    }
  }

  const persistMeta = async (next, opts = {}) => {
    const { closeEditor = false, busy = null } = opts
    if (saving || busySlug) return false
    if (busy) setBusySlug(busy)
    else setSaving(true)
    try {
      const json = await apiPatch(
        '/content',
        { section: 'collectionMeta', value: next },
        { auth: true }
      )
      dispatch({ type: 'catalog/setContent', content: json.data.content })
      notify(json.message || 'Collections saved.')
      if (closeEditor) setEditing(null)
      return true
    } catch (err) {
      notify(err.message || 'Unable to save collections.')
      return false
    } finally {
      if (busy) setBusySlug(null)
      else setSaving(false)
    }
  }

  const save = async (row) => {
    const next = { ...meta }
    if (row._oldSlug && row._oldSlug !== row.slug) delete next[row._oldSlug]
    const { _oldSlug, slug, ...rest } = row
    next[slug] = {
      title: rest.title,
      banner: rest.banner,
      blurb: rest.blurb || undefined,
      crumbs: rest.crumbsText
        ? rest.crumbsText.split('\n').map((line) => {
            const [label, href] = line.split('|').map((s) => s.trim())
            return { label, href: href || '/' }
          })
        : rest.crumbs ?? [{ label: 'Home', href: '/' }],
    }
    await persistMeta(next, { closeEditor: true })
  }

  const confirmDelete = async () => {
    if (!deletingSlug || busySlug || saving) return
    const slug = deletingSlug
    const next = { ...meta }
    delete next[slug]
    const ok = await persistMeta(next, { busy: slug })
    if (ok) setDeletingSlug(null)
  }

  return (
    <>
      <PageHeader
        title="Collections"
        sub="Titles, banners and breadcrumbs for /collections/:slug pages."
        action={
          <Button
            onClick={() =>
              setEditing({
                _oldSlug: '',
                slug: 'new-collection',
                title: 'New collection',
                banner: '',
                blurb: '',
                crumbsText: 'Home | /',
              })
            }
          >
            + New collection
          </Button>
        }
      />

      <div className="space-y-3">
        {entries.map((row) => (
          <Card key={row.slug}>
            <div className="flex flex-wrap items-start gap-3">
              <div className="h-14 w-28 shrink-0 overflow-hidden rounded-lg bg-chalk border border-line/60">
                {row.banner ? (
                  <img src={row.banner} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-muted">
                    No banner
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">{row.title}</p>
                <p className="font-mono text-[10px] text-muted">/collections/{row.slug}</p>
              </div>
              <div className="flex gap-1.5">
                <Button
                  variant="ghost"
                  className="!px-2.5 !py-1.5"
                  onClick={() =>
                    setEditing({
                      ...row,
                      _oldSlug: row.slug,
                      crumbsText: (row.crumbs ?? [])
                        .map((c) => `${c.label} | ${c.href}`)
                        .join('\n'),
                    })
                  }
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  className="!px-2.5 !py-1.5"
                  disabled={Boolean(busySlug) || saving}
                  loading={busySlug === row.slug}
                  loadingText="Deleting..."
                  onClick={() => setDeletingSlug(row.slug)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {entries.length === 0 && (
          <Card>
            <div className="py-8 text-center text-muted text-[13px]">
              No custom collection metadata. Click "+ New collection" to define banners and titles.
            </div>
          </Card>
        )}
      </div>

      {editing && (
        <Modal open onClose={() => !saving && !uploading && setEditing(null)} title="Edit collection">
          <div className="grid gap-3">
            <Field label="Slug (URL path)">
              <Input
                value={editing.slug}
                onChange={(e) => setEditing((s) => ({ ...s, slug: e.target.value }))}
                placeholder="e.g. all-candles or new-arrivals"
              />
            </Field>
            <Field label="Title">
              <Input
                value={editing.title}
                onChange={(e) => setEditing((s) => ({ ...s, title: e.target.value }))}
                placeholder="Display title"
              />
            </Field>
            <Field label="Banner image (Upload or URL)">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={editing.banner || ''}
                    onChange={(e) => setEditing((s) => ({ ...s, banner: e.target.value }))}
                    placeholder="https://... or /logo/banner.jpg"
                    className="flex-1"
                  />
                  <label className="flex cursor-pointer items-center justify-center rounded-lg border border-line bg-chalk px-3 py-1.5 text-[12px] font-medium hover:bg-line/40">
                    <span>{uploading ? '...' : '📁 Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
                {editing.banner && (
                  <div className="h-20 w-full overflow-hidden rounded-lg border border-line bg-chalk">
                    <img src={editing.banner} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
            </Field>
            <Field label="Blurb (optional description)">
              <Input
                value={editing.blurb || ''}
                onChange={(e) => setEditing((s) => ({ ...s, blurb: e.target.value }))}
                placeholder="Short intro paragraph for the collection"
              />
            </Field>
            <Field label="Breadcrumbs (Label | /href per line)">
              <textarea
                value={editing.crumbsText || ''}
                onChange={(e) => setEditing((s) => ({ ...s, crumbsText: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-line px-3 py-2 text-[12px] outline-none focus:border-ink"
                placeholder="Home | /&#10;Candles | /collections/all-candles"
              />
            </Field>
          </div>
          <div className="mt-5 flex justify-end gap-2 border-t border-line/60 pt-4">
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving || uploading}>
              Cancel
            </Button>
            <Button
              onClick={() => save(editing)}
              disabled={!editing.slug.trim() || !editing.title.trim() || saving || uploading}
              loading={saving}
              loadingText="Saving..."
            >
              Save collection
            </Button>
          </div>
        </Modal>
      )}

      <ConfirmModal
        open={Boolean(deletingSlug)}
        onClose={() => !busySlug && setDeletingSlug(null)}
        onConfirm={confirmDelete}
        loading={Boolean(busySlug)}
        loadingText="Deleting collection..."
        title={`Delete collection meta for “/${deletingSlug}”?`}
        message={`Are you sure you want to delete the collection metadata (banner, title, breadcrumbs) for “/${deletingSlug}”?`}
        confirmText="Delete collection"
        tone="danger"
      />
    </>
  )
}
