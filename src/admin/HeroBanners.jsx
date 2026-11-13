import { useEffect, useState } from 'react'
import { useStore } from '../store/StoreContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { storefrontContent } from '../store/selectors.js'
import { apiPatch, apiUpload } from '../lib/api.js'
import { Badge, Button, Card, ConfirmModal, Field, Input, Modal, PageHeader, Select } from './ui.jsx'

function uid() {
  return `hero-${Date.now().toString(36)}`
}

const blank = () => ({
  id: uid(),
  href: '/collections/all-candles',
  image: '',
  video: '',
  alt: '',
  banner: false,
  kicker: 'EvaraNest',
  title: 'Light Up\nYour Moments.',
  subtitle: 'Handmade · Luxury · Gift-ready',
  cta: 'Shop Candles',
  align: 'left',
})

export default function HeroBanners() {
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const content = storefrontContent(state)
  const [slides, setSlides] = useState(content.heroSlides ?? [])
  const [editing, setEditing] = useState(null)
  const [deletingSlide, setDeletingSlide] = useState(null)
  const [deletingQuickLink, setDeletingQuickLink] = useState(null)
  const [trust, setTrust] = useState((content.heroTrustLine ?? []).join(' | '))
  const [quick, setQuick] = useState(content.heroQuickLinks ?? [])
  const [saving, setSaving] = useState(false)
  const [savingExtras, setSavingExtras] = useState(false)
  const [busyKey, setBusyKey] = useState(null)

  useEffect(() => {
    setSlides(content.heroSlides ?? [])
    setTrust((content.heroTrustLine ?? []).join(' | '))
    setQuick(content.heroQuickLinks ?? [])
  }, [JSON.stringify(content.heroSlides), JSON.stringify(content.heroTrustLine), JSON.stringify(content.heroQuickLinks)])

  const persist = async (nextSlides, key) => {
    if (saving || busyKey) return
    if (key) setBusyKey(key)
    else setSaving(true)
    try {
      const json = await apiPatch(
        '/content',
        { section: 'heroSlides', value: nextSlides },
        { auth: true }
      )
      dispatch({ type: 'catalog/setContent', content: json.data.content })
      setSlides(json.data.content.heroSlides ?? nextSlides)
      notify(json.message || 'Hero slides saved successfully.')
      return true
    } catch (err) {
      notify(err.message || 'Unable to save hero slides.')
      return false
    } finally {
      if (key) setBusyKey(null)
      else setSaving(false)
    }
  }

  const saveExtras = async () => {
    if (savingExtras) return
    setSavingExtras(true)
    try {
      const heroTrustLine = trust
        .split('|')
        .map((t) => t.trim())
        .filter(Boolean)
      const json = await apiPatch(
        '/content',
        {
          section: 'homepage',
          value: { heroTrustLine, heroQuickLinks: quick },
        },
        { auth: true }
      )
      dispatch({ type: 'catalog/setContent', content: json.data.content })
      notify(json.message || 'Trust line & links saved.')
    } catch (err) {
      notify(err.message || 'Unable to save trust & links.')
    } finally {
      setSavingExtras(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Hero banners & Slider"
        sub="Manage homepage carousel slides — photos, video backgrounds, headlines and buttons."
        action={<Button onClick={() => setEditing(blank())}>+ New slide</Button>}
      />

      <div className="space-y-3">
        {slides.map((s, index) => (
          <Card key={s.id || s.href + index}>
            <div className="flex flex-wrap items-start gap-3.5">
              {/* Media Thumbnail (Image or Video) */}
              <div className="relative h-20 w-36 shrink-0 overflow-hidden rounded-xl bg-chalk border border-line/80 shadow-2xs">
                {s.video ? (
                  <div className="relative h-full w-full bg-black/10">
                    <video
                      src={s.video}
                      poster={s.image}
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[10px] text-ink shadow-xs">
                        ▶
                      </span>
                    </span>
                  </div>
                ) : s.image ? (
                  <img src={s.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-muted">
                    No media
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[13.5px] font-bold text-ink">{s.title?.replace(/\n/g, ' ') || s.alt || 'Untitled slide'}</p>
                </div>
                <p className="truncate text-[11.5px] text-muted mt-0.5">{s.subtitle || s.kicker || 'No subtitle'}</p>
                <p className="truncate font-mono text-[10.5px] text-graphite/70 mt-0.5">{s.href}</p>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {s.video ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#EEEDFC] px-2 py-0.5 text-[10.5px] font-bold text-brand">
                      🎬 Video Slide
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-chalk px-2 py-0.5 text-[10.5px] font-semibold text-graphite">
                      🖼️ Image Slide
                    </span>
                  )}
                  <Badge tone={s.banner ? 'Active' : 'Confirmed'}>
                    {s.banner ? 'Baked-in Artwork' : 'Text Overlay'}
                  </Badge>
                  {s.align && (
                    <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] font-medium text-muted uppercase">
                      Align: {s.align}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 self-center">
                <Button
                  variant="ghost"
                  className="!px-2.5 !py-1.5"
                  disabled={index === 0 || Boolean(busyKey) || saving}
                  loading={busyKey === `up-${s.id || index}`}
                  title="Move up"
                  onClick={() => {
                    const next = [...slides]
                    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                    persist(next, `up-${s.id || index}`)
                  }}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  className="!px-2.5 !py-1.5"
                  disabled={index === slides.length - 1 || Boolean(busyKey) || saving}
                  loading={busyKey === `down-${s.id || index}`}
                  title="Move down"
                  onClick={() => {
                    const next = [...slides]
                    ;[next[index + 1], next[index]] = [next[index], next[index + 1]]
                    persist(next, `down-${s.id || index}`)
                  }}
                >
                  ↓
                </Button>
                <Button variant="ghost" className="!px-3 !py-1.5" onClick={() => setEditing({ ...s })}>
                  Edit
                </Button>
                <Button
                  variant="danger"
                  className="!px-3 !py-1.5"
                  disabled={Boolean(busyKey) || saving}
                  loading={busyKey === `del-${s.id || index}`}
                  loadingText="Deleting..."
                  onClick={() => setDeletingSlide({ slide: s, index })}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {slides.length === 0 && (
          <Card>
            <div className="py-8 text-center text-muted text-[13px]">
              No hero slides configured. Click "+ New slide" to create one.
            </div>
          </Card>
        )}
      </div>

      <Card title="Trust line & quick links" className="mt-5">
        <Field label="Trust line (separate with | )">
          <Input value={trust} onChange={(e) => setTrust(e.target.value)} placeholder="Hand-poured luxury | Soy & beeswax | Pan-India shipping" />
        </Field>
        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider2 text-muted">Quick links</p>
          {quick.map((l, i) => (
            <div key={l.id || i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                value={l.label}
                onChange={(e) =>
                  setQuick((rows) => rows.map((r, idx) => (idx === i ? { ...r, label: e.target.value } : r)))
                }
                placeholder="Label"
              />
              <Input
                value={l.href}
                onChange={(e) =>
                  setQuick((rows) => rows.map((r, idx) => (idx === i ? { ...r, href: e.target.value } : r)))
                }
                placeholder="/collections/..."
              />
              <Button
                variant="danger"
                className="!px-2.5 !py-1.5"
                onClick={() => setDeletingQuickLink({ index: i, label: l.label })}
              >
                Delete
              </Button>
            </div>
          ))}
          <Button
            variant="ghost"
            onClick={() =>
              setQuick((rows) => [...rows, { id: `ql-${Date.now()}`, label: 'NEW LINK', href: '/collections/new-arrivals' }])
            }
          >
            + Add quick link
          </Button>
        </div>
        <div className="mt-4 border-t border-line/60 pt-4">
          <Button
            onClick={saveExtras}
            loading={savingExtras}
            loadingText="Saving..."
            disabled={savingExtras}
          >
            Save trust & links
          </Button>
        </div>
      </Card>

      {editing && (
        <SlideEditor
          slide={editing}
          onClose={() => !saving && setEditing(null)}
          saving={saving}
          onSave={async (slide) => {
            const exists = slides.some((s) => s.id === slide.id)
            const next = exists
              ? slides.map((s) => (s.id === slide.id ? slide : s))
              : [...slides, slide]
            const ok = await persist(next)
            if (ok) setEditing(null)
          }}
        />
      )}

      <ConfirmModal
        open={Boolean(deletingSlide)}
        onClose={() => !busyKey && setDeletingSlide(null)}
        onConfirm={async () => {
          if (!deletingSlide) return
          const ok = await persist(
            slides.filter((_, i) => i !== deletingSlide.index),
            `del-${deletingSlide.slide.id || deletingSlide.index}`
          )
          if (ok) setDeletingSlide(null)
        }}
        loading={Boolean(busyKey && busyKey.startsWith('del-'))}
        loadingText="Deleting slide..."
        title="Delete hero slide?"
        message={`Are you sure you want to remove this hero slide (${deletingSlide?.slide?.title?.replace(/\n/g, ' ') || deletingSlide?.slide?.alt || 'slide'})?`}
        confirmText="Delete slide"
        tone="danger"
      />

      <ConfirmModal
        open={Boolean(deletingQuickLink)}
        onClose={() => !savingExtras && setDeletingQuickLink(null)}
        loading={savingExtras}
        loadingText="Deleting quick link..."
        onConfirm={async () => {
          if (!deletingQuickLink) return
          const nextQuick = quick.filter((_, idx) => idx !== deletingQuickLink.index)
          setSavingExtras(true)
          try {
            const heroTrustLine = trust
              .split('|')
              .map((t) => t.trim())
              .filter(Boolean)
            const json = await apiPatch(
              '/content',
              {
                section: 'homepage',
                value: { heroTrustLine, heroQuickLinks: nextQuick },
              },
              { auth: true }
            )
            dispatch({ type: 'catalog/setContent', content: json.data.content })
            setQuick(nextQuick)
            notify('Quick link removed and database updated.')
            setDeletingQuickLink(null)
          } catch (err) {
            notify(err.message || 'Unable to delete quick link.')
          } finally {
            setSavingExtras(false)
          }
        }}
        title="Remove quick link?"
        message={`Are you sure you want to remove quick link "${deletingQuickLink?.label || ''}"?`}
        confirmText="Remove quick link"
        tone="danger"
      />
    </>
  )
}

function SlideEditor({ slide, onClose, onSave, saving }) {
  const [f, setF] = useState(slide)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setF((s) => ({ ...s, [k]: v }))
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImg(true)
    setUploadError('')
    try {
      const res = await apiUpload(file, f.slug || f.title || 'hero-banner')
      if (res.data?.url) {
        setF((s) => ({ ...s, image: res.data.url }))
      }
    } catch (err) {
      setUploadError(err.message || 'Image upload failed. Using local preview.')
      const reader = new FileReader()
      reader.onload = (ev) => {
        setF((s) => ({ ...s, image: ev.target?.result }))
      }
      reader.readAsDataURL(file)
    } finally {
      setUploadingImg(false)
    }
  }

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingVideo(true)
    setUploadError('')
    try {
      const res = await apiUpload(file, f.slug || f.title || 'hero-banner')
      if (res.data?.url) {
        setF((s) => ({ ...s, video: res.data.url }))
      }
    } catch (err) {
      setUploadError(err.message || 'Video upload failed. Check file size (max 35MB).')
    } finally {
      setUploadingVideo(false)
    }
  }

  const removeVideo = () => {
    setF((s) => ({ ...s, video: '' }))
  }

  return (
    <Modal open onClose={onClose} title="Edit hero slide" wide>
      <div className="space-y-4">
        {uploadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] font-medium text-red-700">
            {uploadError}
          </div>
        )}

        {/* Media Section (Image + Video) */}
        <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-line bg-chalk/40 p-4">
          {/* Background Video Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-bold uppercase text-ink">
                Background Video (Optional MP4)
              </span>
              {f.video && (
                <button
                  type="button"
                  onClick={removeVideo}
                  className="text-[11px] font-semibold text-sale hover:underline"
                >
                  ✕ Remove Video
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                value={f.video || ''}
                onChange={set('video')}
                placeholder="/videos/candle-timelapse.mp4 or URL"
                className="flex-1 text-[12px]"
              />
              <label className="flex cursor-pointer shrink-0 items-center justify-center rounded-lg border border-line bg-white px-3 py-1.5 text-[11.5px] font-semibold text-ink hover:bg-chalk shadow-2xs">
                <span>{uploadingVideo ? 'Uploading...' : '🎬 Upload Video'}</span>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleVideoUpload}
                  className="hidden"
                  disabled={uploadingVideo}
                />
              </label>
            </div>

            {/* Video Live Preview */}
            {f.video && (
              <div className="relative aspect-[2.4/1] w-full overflow-hidden rounded-xl border border-line bg-black shadow-xs">
                <video
                  key={f.video}
                  src={f.video}
                  poster={f.image}
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Slide Poster / Image Field */}
          <div className="space-y-2">
            <span className="text-[11.5px] font-bold uppercase text-ink">
              {f.video ? 'Poster Fallback Image' : 'Slide Background Image (Required)'}
            </span>

            <div className="flex gap-2">
              <Input
                value={f.image || ''}
                onChange={set('image')}
                placeholder="https://... or /logo/banner.jpg"
                className="flex-1 text-[12px]"
              />
              <label className="flex cursor-pointer shrink-0 items-center justify-center rounded-lg border border-line bg-white px-3 py-1.5 text-[11.5px] font-semibold text-ink hover:bg-chalk shadow-2xs">
                <span>{uploadingImg ? 'Uploading...' : '📁 Upload Image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImg}
                />
              </label>
            </div>

            {/* Image Preview */}
            {f.image && (
              <div className="relative aspect-[2.4/1] w-full overflow-hidden rounded-xl border border-line bg-chalk shadow-xs">
                <img src={f.image} alt="Preview" className="h-full w-full object-cover" />
              </div>
            )}
          </div>
        </div>

        {/* Links & Text Metadata */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Link URL (Where button/slide goes)">
            <Input value={f.href} onChange={set('href')} placeholder="/collections/all-candles" />
          </Field>
          <Field label="Alt Text / SEO Label">
            <Input value={f.alt} onChange={set('alt')} placeholder="e.g. Handcrafted scented candles" />
          </Field>

          <label className="flex items-center gap-2 text-[12px] sm:col-span-2 py-1">
            <input
              type="checkbox"
              checked={!!f.banner}
              onChange={set('banner')}
              className="h-4 w-4 rounded border-line accent-forest"
            />
            <span className="font-medium text-ink">
              Artwork already includes headline &amp; buttons (hide text overlay on top of slide)
            </span>
          </label>

          {!f.banner && (
            <>
              <Field label="Kicker (Small top tag)">
                <Input value={f.kicker || ''} onChange={set('kicker')} placeholder="e.g. EVARANEST or GIFTING" />
              </Field>
              <Field label="Text Alignment">
                <Select
                  value={f.align || 'left'}
                  onChange={set('align')}
                  options={[
                    { value: 'left', label: 'Left Aligned' },
                    { value: 'center', label: 'Center Aligned' },
                    { value: 'right', label: 'Right Aligned' },
                  ]}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Headline Title (Use \n or Enter for line breaks)">
                  <textarea
                    rows={2}
                    value={f.title || ''}
                    onChange={set('title')}
                    placeholder="Light Up&#10;Your Moments."
                    className="w-full rounded-lg border border-[#CBC8C1] bg-white px-3 py-2 text-[12.5px] text-ink font-medium placeholder:text-[#A5A2B2] outline-none transition-all hover:border-[#ADA9A0] focus:border-forest focus:ring-1 focus:ring-forest/25 shadow-xs"
                  />
                </Field>
              </div>
              <Field label="Subtitle / Tagline">
                <Input value={f.subtitle || ''} onChange={set('subtitle')} placeholder="Handmade · Luxury · Gift-ready" />
              </Field>
              <Field label="Button Label (CTA)">
                <Input value={f.cta || ''} onChange={set('cta')} placeholder="e.g. Shop Candles" />
              </Field>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2.5 border-t border-line/70 pt-4">
        <Button variant="ghost" onClick={onClose} disabled={saving || uploadingImg || uploadingVideo}>
          Cancel
        </Button>
        <Button
          onClick={() => onSave(f)}
          disabled={(!f.image?.trim() && !f.video?.trim()) || !f.href?.trim() || saving || uploadingImg || uploadingVideo}
          loading={saving}
          loadingText="Saving slide..."
        >
          Save hero slide
        </Button>
      </div>
    </Modal>
  )
}
