import { useEffect, useState } from 'react'
import { useStore } from '../store/StoreContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { storefrontContent } from '../store/selectors.js'
import { apiPatch } from '../lib/api.js'
import { Button, Card, ConfirmModal, Field, Input, PageHeader, Textarea } from './ui.jsx'

function LogoField({
  title,
  subtitle,
  value,
  onChange,
  previewBg = 'blue',
  defaultFallback = '/logo/evaranest-logo.png',
}) {
  const [tab, setTab] = useState('upload') // 'upload' | 'url'
  const [dragActive, setDragActive] = useState(false)
  const currentLogo = value || defaultFallback
  const isCustom = Boolean(value)

  const handleFile = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, SVG, WebP, etc.).')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      onChange(e.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  return (
    <div className="rounded-xl border border-line bg-chalk/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted">{subtitle}</p>}
        </div>
        <div className="flex items-center rounded-lg border border-line bg-white p-0.5 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`rounded-md px-2.5 py-1 transition-colors ${
              tab === 'upload' ? 'bg-forest text-white shadow-xs' : 'text-graphite hover:text-ink'
            }`}
          >
            📁 Upload File
          </button>
          <button
            type="button"
            onClick={() => setTab('url')}
            className={`rounded-md px-2.5 py-1 transition-colors ${
              tab === 'url' ? 'bg-forest text-white shadow-xs' : 'text-graphite hover:text-ink'
            }`}
          >
            🔗 Image Link / URL
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-12 items-center">
        {/* Left: Input controls (7 cols) */}
        <div className="md:col-span-7 space-y-2.5">
          {tab === 'upload' ? (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                setDragActive(false)
              }}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-all ${
                dragActive
                  ? 'border-forest bg-[#4849E8]/5'
                  : 'border-line/90 bg-white hover:border-forest/50'
              }`}
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0])
                  }
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label={`Upload ${title}`}
              />
              <div className="text-2xl mb-1">🖼️</div>
              <p className="text-[12px] font-medium text-ink">
                Click or drag & drop image here
              </p>
              <p className="text-[10px] text-muted mt-0.5">PNG, JPG, SVG, WebP (Max ~2MB recommended)</p>
            </div>
          ) : (
            <div>
              <Input
                type="text"
                placeholder="e.g. /logo/evaranest-logo.png or https://example.com/logo.png"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full text-[12px]"
              />
              <p className="mt-1 text-[10px] text-muted">
                Enter relative path (e.g. <code>/logo/my-logo.png</code>) or full external URL.
              </p>
            </div>
          )}

          {isCustom && (
            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="inline-flex items-center gap-1.5 text-save font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-save animate-pulse" />
                Custom logo applied
              </span>
              <button
                type="button"
                onClick={() => onChange('')}
                className="text-sale hover:underline font-medium"
              >
                Reset to default
              </button>
            </div>
          )}
        </div>

        {/* Right: Live Preview Box (5 cols) */}
        <div className="md:col-span-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1 flex items-center justify-between">
            <span>Live Preview</span>
            <span className="text-[9px] font-normal lowercase opacity-70">
              ({previewBg === 'blue' ? 'Header Navbar theme' : 'Footer Light theme'})
            </span>
          </div>
          <div
            className={`flex items-center justify-center rounded-lg p-3 min-h-[70px] border border-line ${
              previewBg === 'blue' ? 'bg-[#4849E8]' : 'bg-white'
            }`}
          >
            {currentLogo ? (
              <img
                src={currentLogo}
                alt={`${title} preview`}
                className="max-h-11 w-auto max-w-full object-contain"
                onError={(e) => {
                  e.target.onerror = null
                  e.target.src = defaultFallback
                }}
              />
            ) : (
              <span className="text-[11px] text-muted">No preview</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SiteSettings() {
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const content = storefrontContent(state)
  const [site, setSite] = useState(content.site ?? {})
  const [footer, setFooter] = useState(content.footer ?? { columns: [] })
  const [pdp, setPdp] = useState(content.pdp ?? {})
  const [saving, setSaving] = useState(false)
  const [deletingColIndex, setDeletingColIndex] = useState(null)

  useEffect(() => {
    setSite(content.site ?? {})
    setFooter(content.footer ?? { columns: [] })
    setPdp(content.pdp ?? {})
  }, [
    JSON.stringify(content.site),
    JSON.stringify(content.footer),
    JSON.stringify(content.pdp),
  ])

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      const json = await apiPatch(
        '/content',
        { section: 'siteBundle', value: { site, footer, pdp } },
        { auth: true }
      )
      dispatch({ type: 'catalog/setContent', content: json.data.content })
      notify(json.message || 'Site settings saved.')
    } catch (err) {
      notify(err.message || 'Unable to save site settings.')
    } finally {
      setSaving(false)
    }
  }

  const setColumn = (ci, patch) => {
    setFooter((f) => ({
      ...f,
      columns: (f.columns ?? []).map((c, i) => (i === ci ? { ...c, ...patch } : c)),
    }))
  }

  const setLink = (ci, li, patch) => {
    setFooter((f) => ({
      ...f,
      columns: (f.columns ?? []).map((c, i) =>
        i === ci
          ? {
              ...c,
              links: (c.links ?? []).map((l, j) => (j === li ? { ...l, ...patch } : l)),
            }
          : c
      ),
    }))
  }

  return (
    <>
      <PageHeader
        title="Site settings"
        sub="Brand, logo, social links, footer, free shipping and PDP copy."
        action={
          <Button onClick={save} loading={saving} loadingText="Saving..." disabled={saving}>
            Save site settings
          </Button>
        }
      />

      {/* Brand Logos (Header & Footer) */}
      <Card title="Brand Logos (Navbar & Footer)">
        <div className="space-y-4">
          <LogoField
            title="Header / Navbar Logo"
            subtitle="Displayed in the top navigation bar. Best viewed with bright / white / contrast artwork."
            previewBg="blue"
            value={site.logo || ''}
            onChange={(val) => setSite((s) => ({ ...s, logo: val }))}
          />
          <LogoField
            title="Footer Logo"
            subtitle="Displayed in the site footer on light background. Defaults to Navbar logo if left blank."
            previewBg="light"
            value={site.footerLogo || ''}
            onChange={(val) => setSite((s) => ({ ...s, footerLogo: val }))}
          />
        </div>
      </Card>

      <Card title="Brand & contact" className="mt-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Brand name">
            <Input
              value={site.brandName || ''}
              onChange={(e) => setSite((s) => ({ ...s, brandName: e.target.value }))}
            />
          </Field>
          <Field label="Marquee text">
            <Input
              value={site.marqueeText || ''}
              onChange={(e) => setSite((s) => ({ ...s, marqueeText: e.target.value }))}
            />
          </Field>
          <Field label="Free shipping above (₹)">
            <Input
              type="number"
              value={site.freeShippingAt ?? 999}
              onChange={(e) =>
                setSite((s) => ({ ...s, freeShippingAt: Number(e.target.value) || 0 }))
              }
            />
          </Field>
          <Field label="Minimum order amount (₹) — 0 for no minimum">
            <Input
              type="number"
              min="0"
              value={site.minOrderAmount ?? 500}
              onChange={(e) =>
                setSite((s) => ({ ...s, minOrderAmount: Math.max(0, Number(e.target.value) || 0) }))
              }
            />
          </Field>
          <Field label="Flat shipping (₹)">
            <Input
              type="number"
              value={site.shippingFlat ?? 49}
              onChange={(e) =>
                setSite((s) => ({ ...s, shippingFlat: Number(e.target.value) || 0 }))
              }
            />
          </Field>
          <Field label="WhatsApp URL">
            <Input
              value={site.whatsapp || ''}
              onChange={(e) => setSite((s) => ({ ...s, whatsapp: e.target.value }))}
            />
          </Field>
          <Field label="Instagram URL">
            <Input
              value={site.instagram || ''}
              onChange={(e) => setSite((s) => ({ ...s, instagram: e.target.value }))}
            />
          </Field>
          <Field label="Returns link">
            <Input
              value={site.returns || ''}
              onChange={(e) => setSite((s) => ({ ...s, returns: e.target.value }))}
            />
          </Field>
        </div>
      </Card>

      <Card title="Footer" className="mt-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Newsletter title (use line break for 2 lines)">
            <Textarea
              rows={2}
              value={footer.newsletterTitle || ''}
              onChange={(e) => setFooter((f) => ({ ...f, newsletterTitle: e.target.value }))}
            />
          </Field>
          <Field label="Brand blurb">
            <Textarea
              rows={2}
              value={footer.blurb || ''}
              onChange={(e) => setFooter((f) => ({ ...f, blurb: e.target.value }))}
            />
          </Field>
          <Field label="Copyright">
            <Input
              value={footer.copyright || ''}
              onChange={(e) => setFooter((f) => ({ ...f, copyright: e.target.value }))}
            />
          </Field>
          <Field label="Spot us label">
            <Input
              value={footer.spotUsLabel || ''}
              onChange={(e) => setFooter((f) => ({ ...f, spotUsLabel: e.target.value }))}
            />
          </Field>
        </div>

        <div className="mt-5 space-y-4">
          {(footer.columns ?? []).map((col, ci) => (
            <div key={ci} className="rounded-lg border border-line p-3">
              <div className="mb-2 flex items-center gap-2">
                <Input
                  value={col.title || ''}
                  onChange={(e) => setColumn(ci, { title: e.target.value })}
                  placeholder="Column title"
                  className="max-w-xs"
                />
                <Button
                  variant="danger"
                  className="!px-2.5 !py-1.5"
                  onClick={() => setDeletingColIndex(ci)}
                >
                  × Column
                </Button>
              </div>
              <div className="space-y-2">
                {(col.links ?? []).map((l, li) => (
                  <div key={li} className="flex gap-2">
                    <Input
                      value={l.label || ''}
                      onChange={(e) => setLink(ci, li, { label: e.target.value })}
                      placeholder="Label"
                    />
                    <Input
                      value={l.href || ''}
                      onChange={(e) => setLink(ci, li, { href: e.target.value })}
                      placeholder="/path"
                    />
                    <Button
                      variant="danger"
                      className="!px-2.5 !py-1.5"
                      onClick={() =>
                        setColumn(ci, {
                          links: (col.links ?? []).filter((_, j) => j !== li),
                        })
                      }
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                className="mt-2"
                onClick={() =>
                  setColumn(ci, {
                    links: [...(col.links ?? []), { label: 'New link', href: '/' }],
                  })
                }
              >
                + Add link
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() =>
            setFooter((f) => ({
              ...f,
              columns: [...(f.columns ?? []), { title: 'New', links: [] }],
            }))
          }
        >
          + Add column
        </Button>
      </Card>

      <Card title="Product page (PDP)" className="mt-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Countdown enabled">
            <select
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
              value={pdp.countdownEnabled === false ? 'no' : 'yes'}
              onChange={(e) =>
                setPdp((p) => ({ ...p, countdownEnabled: e.target.value === 'yes' }))
              }
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </Field>
          <Field label="Countdown label">
            <Input
              value={pdp.countdownLabel || ''}
              onChange={(e) => setPdp((p) => ({ ...p, countdownLabel: e.target.value }))}
            />
          </Field>
          <Field label="Countdown minutes">
            <Input
              type="number"
              value={pdp.countdownMinutes ?? 10}
              onChange={(e) =>
                setPdp((p) => ({ ...p, countdownMinutes: Number(e.target.value) || 0 }))
              }
            />
          </Field>
          <Field label="Countdown seconds">
            <Input
              type="number"
              value={pdp.countdownSeconds ?? 30}
              onChange={(e) =>
                setPdp((p) => ({ ...p, countdownSeconds: Number(e.target.value) || 0 }))
              }
            />
          </Field>
          <Field label="Shipping subtitle">
            <Input
              value={pdp.shippingSubtitle || ''}
              onChange={(e) => setPdp((p) => ({ ...p, shippingSubtitle: e.target.value }))}
            />
          </Field>
          <Field label="Returns subtitle">
            <Input
              value={pdp.returnsSubtitle || ''}
              onChange={(e) => setPdp((p) => ({ ...p, returnsSubtitle: e.target.value }))}
            />
          </Field>
          <Field label="Dispatch copy" className="sm:col-span-2">
            <Input
              value={pdp.shippingDispatch || ''}
              onChange={(e) => setPdp((p) => ({ ...p, shippingDispatch: e.target.value }))}
            />
          </Field>
          <Field label="Delivery copy" className="sm:col-span-2">
            <Input
              value={pdp.shippingDelivery || ''}
              onChange={(e) => setPdp((p) => ({ ...p, shippingDelivery: e.target.value }))}
            />
          </Field>
          <Field label="Returns body" className="sm:col-span-2">
            <Textarea
              rows={3}
              value={pdp.returnsBody || ''}
              onChange={(e) => setPdp((p) => ({ ...p, returnsBody: e.target.value }))}
            />
          </Field>
          <Field label="Candle care (one tip per line)" className="sm:col-span-2">
            <Textarea
              rows={5}
              value={(pdp.candleCare ?? []).join('\n')}
              onChange={(e) =>
                setPdp((p) => ({
                  ...p,
                  candleCare: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean),
                }))
              }
            />
          </Field>
          <Field label="Packed by">
            <Textarea
              rows={2}
              value={pdp.manufacturer?.packedBy || ''}
              onChange={(e) =>
                setPdp((p) => ({
                  ...p,
                  manufacturer: { ...(p.manufacturer ?? {}), packedBy: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Marketed by">
            <Textarea
              rows={2}
              value={pdp.manufacturer?.marketedBy || ''}
              onChange={(e) =>
                setPdp((p) => ({
                  ...p,
                  manufacturer: { ...(p.manufacturer ?? {}), marketedBy: e.target.value },
                }))
              }
            />
          </Field>
        </div>
      </Card>

      <ConfirmModal
        open={deletingColIndex !== null}
        onClose={() => !saving && setDeletingColIndex(null)}
        loading={saving}
        loadingText="Deleting column..."
        onConfirm={async () => {
          if (deletingColIndex === null) return
          const nextFooter = {
            ...footer,
            columns: (footer.columns ?? []).filter((_, i) => i !== deletingColIndex),
          }
          setSaving(true)
          try {
            const json = await apiPatch(
              '/content',
              { section: 'siteBundle', value: { site, footer: nextFooter, pdp } },
              { auth: true }
            )
            dispatch({ type: 'catalog/setContent', content: json.data.content })
            setFooter(nextFooter)
            notify('Footer column deleted and database updated.')
            setDeletingColIndex(null)
          } catch (err) {
            notify(err.message || 'Unable to delete footer column from database.')
          } finally {
            setSaving(false)
          }
        }}
        title="Delete footer column?"
        message={`Are you sure you want to permanently remove this footer column (${footer.columns?.[deletingColIndex]?.title || ''}) and its links?`}
        confirmText="Delete column"
        tone="danger"
      />
    </>
  )
}
