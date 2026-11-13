import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { allProducts, storefrontContent } from '../store/selectors.js'
import { apiPatch, apiUpload } from '../lib/api.js'
import { FIXED_BLOCKS, newProductSection, resolveHomeLayout } from '../lib/homeLayout.js'
import { Badge, Button, Card, ConfirmModal, Field, Input, Modal, PageHeader } from './ui.jsx'

function ProductPicker({ catalogue, selected, onChange, q }) {
  const byHandle = useMemo(() => new Map(catalogue.map((p) => [p.handle, p])), [catalogue])
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return catalogue
      .filter((p) => !selected.includes(p.handle))
      .filter((p) => !needle || `${p.title} ${p.handle}`.toLowerCase().includes(needle))
      .slice(0, 60)
  }, [catalogue, selected, q])

  const move = (i, d) => {
    const next = [...selected]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    onChange(next)
  }

  const thumb = (p) => p?.images?.[0]

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11.5px] font-semibold text-graphite">
            Selected ({selected.length}) — shown in this order
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {selected.map((h, i) => {
              const p = byHandle.get(h)
              return (
                <div key={h} className="overflow-hidden rounded-lg border border-forest/40 bg-white">
                  <div className="aspect-square bg-chalk" style={{ position: 'relative' }}>
                    {thumb(p) && <img src={thumb(p)} alt="" loading="lazy" className="h-full w-full object-cover" />}
                    <span style={{ position: 'absolute', left: 4, top: 4 }} className="rounded bg-ink/80 px-1.5 text-[10px] font-bold text-white">{i + 1}</span>
                    <button
                      type="button"
                      onClick={() => onChange(selected.filter((x) => x !== h))}
                      title="Remove"
                      style={{ position: 'absolute', right: 4, top: 4 }}
                      className="grid h-6 w-6 place-items-center rounded-full bg-white text-[12px] font-bold leading-none text-sale shadow"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="line-clamp-2 px-1.5 pt-1 text-[11px] leading-tight">{p?.title || h}</p>
                  <div className="flex justify-between px-1 pb-1">
                    <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="px-1.5 text-[13px] disabled:opacity-30">←</button>
                    <button type="button" disabled={i === selected.length - 1} onClick={() => move(i, 1)} className="px-1.5 text-[13px] disabled:opacity-30">→</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {selected.length === 0 && (
        <p className="text-[12px] text-muted">No products selected — the section will use its collection fallback (if set).</p>
      )}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {results.map((p) => (
          <button
            key={p.handle}
            type="button"
            onClick={() => onChange([...selected, p.handle])}
            title="Add to section"
            className="group overflow-hidden rounded-lg border border-line bg-white text-left transition-colors hover:border-forest"
          >
            <div className="relative aspect-square bg-chalk">
              {thumb(p) && <img src={thumb(p)} alt="" loading="lazy" className="h-full w-full object-cover" />}
              <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-forest text-[13px] leading-none text-white opacity-0 shadow transition-opacity group-hover:opacity-100">+</span>
            </div>
            <p className="line-clamp-2 px-1.5 py-1 text-[11px] leading-tight">{p.title}</p>
          </button>
        ))}
        {results.length === 0 && <p className="col-span-full px-1 text-[12px] text-muted">No matching products.</p>}
      </div>
    </div>
  )
}

function SectionEditor({ section, catalogue, onClose, onSave, saving }) {
  const [f, setF] = useState(section)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(0)
  const [q, setQ] = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const setBanner = (k, v) => setF((s) => ({ ...s, banner: { ...(s.banner ?? {}), [k]: v } }))

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const slug = (f.title || 'home-section').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-banner'
      const res = await apiUpload(file, slug)
      if (res.data?.url) setBanner('image', res.data.url)
    } catch (err) {
      setError(err.message || 'Upload failed.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <Modal open onClose={onClose} title={section.title ? `Edit "${section.title}"` : 'New section'} wide>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[12px] font-semibold">
          {['1. Details', '2. Products'].map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => (i === 0 || f.title.trim()) && setStep(i)}
              className={`rounded-full px-3 py-1 ${step === i ? 'bg-forest text-white' : 'bg-chalk text-graphite'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {step === 1 && (
          <div
            className="-mx-3.5 bg-white px-3.5 py-2 sm:-mx-4 sm:px-4"
            style={{ position: 'sticky', top: 48, zIndex: 5 }}
          >
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products to add…" />
          </div>
        )}

        {step === 0 ? (
          <div className="space-y-3">
        <Field label="Section heading" hint="shown above the products">
          <Input value={f.title} onChange={set('title')} placeholder="e.g. Festive Picks" />
        </Field>

        <div>
          <p className="mb-1.5 border-t border-line pt-3 text-[12px] font-bold uppercase">Banner (optional) <span className="ml-1 font-medium normal-case text-graphite">— best size 1600 × 360 px</span></p>
          {f.banner?.image && (
            <img src={f.banner.image} alt="" className="mb-2 max-h-40 w-full rounded-md object-cover" />
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Banner image URL">
              <Input value={f.banner?.image || ''} onChange={(e) => setBanner('image', e.target.value)} />
            </Field>
            <Field label="Banner link">
              <Input value={f.banner?.href || ''} onChange={(e) => setBanner('href', e.target.value)} placeholder="/collections/..." />
            </Field>
            <Field label="Alt text">
              <Input value={f.banner?.alt || ''} onChange={(e) => setBanner('alt', e.target.value)} />
            </Field>
            <div className="flex items-end gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-lg border border-line px-3 py-2 text-[12px] font-semibold hover:border-ink">
                {uploading ? 'Uploading…' : '📁 Upload banner'}
                <input type="file" accept="image/*" className="hidden" onChange={onFile} />
              </label>
              {f.banner?.image && (
                <Button variant="ghost" onClick={() => setBanner('image', '')}>Remove</Button>
              )}
            </div>
          </div>
          {error && <p className="mt-2 text-[12px] text-sale">{error}</p>}
          <p className="mt-2 text-[11px] text-muted">Banner appears only when an image is set. Recommended: 1600 × 360 px (wide, ~4.4:1), JPG/WEBP under 500 KB. Keep text and buttons in the centre area — other sizes get trimmed at the top/bottom on desktop.</p>
        </div>

        <div className="grid gap-2 border-t border-line pt-3 sm:grid-cols-2">
          <Field label="Button label" hint="optional">
            <Input value={f.ctaLabel || ''} onChange={set('ctaLabel')} placeholder="View all" />
          </Field>
          <Field label="Button link" hint="optional — blank opens All Products">
            <Input value={f.ctaHref || ''} onChange={set('ctaHref')} placeholder="/collections/all-products" />
          </Field>
        </div>

          </div>
        ) : (
          <div className="space-y-3">
        <div>
          <ProductPicker
            catalogue={catalogue}
            q={q}
            selected={f.productHandles ?? []}
            onChange={(productHandles) => setF((s) => ({ ...s, productHandles }))}
          />
          <div className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-2">
            <Field label="Collection fallback" hint="used only if no product is selected">
              <Input value={f.collection || ''} onChange={set('collection')} placeholder="e.g. new-arrivals" />
            </Field>
            <Field label="Fallback limit">
              <Input type="number" min="1" value={f.limit ?? 10} onChange={set('limit')} />
            </Field>
          </div>
        </div>

          </div>
        )}

        <div className="flex justify-between gap-2 border-t border-line pt-3">
          {step === 0 ? (
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          ) : (
            <Button variant="ghost" onClick={() => setStep(0)}>← Back</Button>
          )}
          {step === 0 ? (
            <Button
              disabled={uploading}
              onClick={() => {
                if (!f.title.trim()) return setError('Enter a section heading.')
                setError('')
                setStep(1)
              }}
            >
              Next: Select products →
            </Button>
          ) : (
            <Button
              loading={saving}
              loadingText="Saving..."
              onClick={() => onSave({ ...f, title: f.title.trim(), limit: Number(f.limit) || 10 })}
            >
              Apply &amp; save
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default function HomeSections() {
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const content = storefrontContent(state)
  const catalogue = allProducts(state)
  const saved = useMemo(() => resolveHomeLayout(content), [JSON.stringify(content.homeLayout), JSON.stringify(content.homeRails)])
  const [draft, setDraft] = useState(saved)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(saved)
  }, [JSON.stringify(saved)])

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const update = (id, patch) => setDraft((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const move = (i, d) =>
    setDraft((rows) => {
      const next = [...rows]
      ;[next[i], next[i + d]] = [next[i + d], next[i]]
      return next
    })

  const save = async (layout = draft, successMsg) => {
    if (saving) return false
    setSaving(true)
    try {
      const json = await apiPatch('/content', { section: 'homeLayout', value: layout }, { auth: true })
      dispatch({ type: 'catalog/setContent', content: json.data.content })
      notify(successMsg || json.message || 'Home sections saved.')
      return true
    } catch (err) {
      notify(err.message || 'Unable to save home sections.')
      return false
    } finally {
      setSaving(false)
    }
  }

  // Apply in the modal saves straight to the database (together with any other pending changes).
  const applyEdit = async (section) => {
    const isNew = !draft.some((r) => r.id === section.id)
    const next = isNew ? [...draft, section] : draft.map((r) => (r.id === section.id ? section : r))
    setDraft(next)
    const ok = await save(next, isNew ? `Section "${section.title}" added.` : `Section "${section.title}" updated.`)
    if (ok) setEditing(null)
  }

  return (
    <>
      <PageHeader
        title="Home sections"
        sub="Order, show/hide and manage the sections on the storefront homepage."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setEditing(newProductSection({ title: '' }))}>
              + Add section
            </Button>
            <Button onClick={() => save()} loading={saving} loadingText="Saving..." disabled={saving || !dirty}>
              Save changes
            </Button>
          </div>
        }
      />

      <Card>
        <div className="space-y-2">
          {draft.map((b, i) => {
            const isProducts = b.type === 'products'
            const count = (b.productHandles ?? []).length
            return (
              <div
                key={b.id}
                className={`flex flex-wrap items-center gap-2 rounded-lg border border-line px-3 py-2.5 ${
                  b.active === false ? 'bg-chalk opacity-60' : 'bg-white'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[13px] font-semibold text-ink">
                      {isProducts ? b.title || 'Untitled section' : FIXED_BLOCKS[b.type] || b.type}
                    </span>
                    <Badge>{isProducts ? 'Products' : 'Built-in'}</Badge>
                    {b.active === false && <Badge>Hidden</Badge>}
                  </div>
                  {isProducts && (
                    <p className="mt-0.5 text-[11.5px] text-muted">
                      {count ? `${count} selected product${count > 1 ? 's' : ''}` : b.collection ? `Auto: ${b.collection}` : 'No products'}
                      {b.banner?.image ? ' · banner' : ''}
                    </p>
                  )}
                </div>
                <Button variant="ghost" className="!px-2.5 !py-1.5" disabled={i === 0} title="Move up" onClick={() => move(i, -1)}>↑</Button>
                <Button variant="ghost" className="!px-2.5 !py-1.5" disabled={i === draft.length - 1} title="Move down" onClick={() => move(i, 1)}>↓</Button>
                <Button variant="ghost" className="!px-2.5 !py-1.5" onClick={() => update(b.id, { active: b.active === false })}>
                  {b.active === false ? 'Show' : 'Hide'}
                </Button>
                {isProducts && (
                  <>
                    <Button variant="ghost" className="!px-2.5 !py-1.5" onClick={() => setEditing(b)}>Edit</Button>
                    <Button variant="danger" className="!px-2.5 !py-1.5" onClick={() => setDeleting(b)}>Delete</Button>
                  </>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-line/60 pt-4">
          <Button variant="ghost" onClick={() => setDraft(saved)} disabled={!dirty}>Reset</Button>
        </div>
        <p className="mt-3 text-[11.5px] text-muted">
          Built-in blocks (hero, categories, about, merch, why-choose, trust) are edited under Hero banners / Homepage; here you can only reorder or hide them.
        </p>
      </Card>

      {editing && (
        <SectionEditor
          key={editing.id}
          section={editing}
          catalogue={catalogue}
          saving={saving}
          onClose={() => !saving && setEditing(null)}
          onSave={applyEdit}
        />
      )}

      <ConfirmModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          setDraft((rows) => rows.filter((r) => r.id !== deleting.id))
          setDeleting(null)
        }}
        title="Delete section?"
        message={`Remove "${deleting?.title || 'this section'}" from the homepage? Click "Save changes" afterwards to publish.`}
        confirmText="Delete section"
        tone="danger"
      />
    </>
  )
}
