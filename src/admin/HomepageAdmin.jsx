import { useEffect, useState } from 'react'
import { useStore } from '../store/StoreContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { storefrontContent } from '../store/selectors.js'
import { apiPatch, apiUpload } from '../lib/api.js'
import { Button, Card, ConfirmModal, Field, Input, PageHeader, Textarea } from './ui.jsx'

const ICON_OPTIONS = ['truck', 'refresh', 'star', 'whatsapp']

export default function HomepageAdmin() {
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const content = storefrontContent(state)
  const [topCategories, setTopCategories] = useState(content.topCategories ?? [])
  const [aboutBanner, setAboutBanner] = useState(content.aboutBanner ?? { image: '', kicker: '' })
  const [merch, setMerch] = useState(content.merch ?? { title: '', tiles: [], cta: { label: '', href: '' } })
  const [offers, setOffers] = useState(content.offers ?? [])
  const [whyChoose, setWhyChoose] = useState(content.whyChoose ?? [])
  const [homeRails, setHomeRails] = useState(content.homeRails ?? {})
  const [trustMarkers, setTrustMarkers] = useState(content.trustMarkers ?? [])
  const [reviewSummary, setReviewSummary] = useState(
    content.reviewSummary ?? { average: 0, total: 0, distribution: [], items: [] }
  )
  const [saving, setSaving] = useState(false)
  const [deletingItem, setDeletingItem] = useState(null) // { type, index, title }
  const [uploadingTarget, setUploadingTarget] = useState(null)

  useEffect(() => {
    setTopCategories(content.topCategories ?? [])
    setAboutBanner(content.aboutBanner ?? { image: '', kicker: '' })
    setMerch(content.merch ?? { title: '', tiles: [], cta: { label: '', href: '' } })
    setOffers(content.offers ?? [])
    setWhyChoose(content.whyChoose ?? [])
    setHomeRails(content.homeRails ?? {})
    setTrustMarkers(content.trustMarkers ?? [])
    setReviewSummary(content.reviewSummary ?? { average: 0, total: 0, distribution: [], items: [] })
  }, [
    JSON.stringify(content.topCategories),
    JSON.stringify(content.aboutBanner),
    JSON.stringify(content.merch),
    JSON.stringify(content.offers),
    JSON.stringify(content.whyChoose),
    JSON.stringify(content.homeRails),
    JSON.stringify(content.trustMarkers),
    JSON.stringify(content.reviewSummary),
  ])

  const handleImageUpload = async (e, callback, targetKey, slug) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingTarget(targetKey)
    try {
      const res = await apiUpload(file, slug || String(targetKey || 'homepage'))
      if (res.data?.url) {
        callback(res.data.url)
      }
    } catch {
      const reader = new FileReader()
      reader.onload = (ev) => callback(ev.target?.result)
      reader.readAsDataURL(file)
    } finally {
      setUploadingTarget(null)
    }
  }

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      const json = await apiPatch(
        '/content',
        {
          section: 'homepage',
          value: {
            topCategories,
            aboutBanner,
            merch,
            offers,
            whyChoose,
            homeRails,
            trustMarkers,
            reviewSummary,
          },
        },
        { auth: true }
      )
      dispatch({ type: 'catalog/setContent', content: json.data.content })
      notify(json.message || 'Homepage saved.')
    } catch (err) {
      notify(err.message || 'Unable to save homepage.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Homepage"
        sub="Categories, about, merch, why-choose, trust markers, reviews and PDP offers."
        action={
          <Button onClick={save} loading={saving} loadingText="Saving..." disabled={saving}>
            Save homepage
          </Button>
        }
      />

      <Card title="Top categories">
        <div className="space-y-2">
          {topCategories.map((c, i) => (
            <div key={c.id || i} className="grid gap-2 md:grid-cols-3">
              <Input
                value={c.label}
                onChange={(e) =>
                  setTopCategories((rows) =>
                    rows.map((r, idx) => (idx === i ? { ...r, label: e.target.value } : r))
                  )
                }
                placeholder="Label"
              />
              <Input
                value={c.href}
                onChange={(e) =>
                  setTopCategories((rows) =>
                    rows.map((r, idx) => (idx === i ? { ...r, href: e.target.value } : r))
                  )
                }
                placeholder="/collections/..."
              />
              <div className="flex gap-2">
                <Input
                  value={c.image}
                  onChange={(e) =>
                    setTopCategories((rows) =>
                      rows.map((r, idx) => (idx === i ? { ...r, image: e.target.value } : r))
                    )
                  }
                  placeholder="Image URL"
                  className="min-w-0 flex-1"
                />
                <label className="flex cursor-pointer items-center justify-center rounded-lg border border-line bg-chalk px-2.5 py-1.5 text-[11px] font-medium hover:bg-line/40">
                  <span>{uploadingTarget === `cat-${i}` ? '...' : '📁'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageUpload(
                        e,
                        (url) =>
                          setTopCategories((rows) =>
                            rows.map((r, idx) => (idx === i ? { ...r, image: url } : r))
                          ),
                        `cat-${i}`,
                        c.slug || c.name || c.title
                      )
                    }
                    className="hidden"
                  />
                </label>
                <Button
                  variant="danger"
                  className="!px-2.5 !py-1.5"
                  onClick={() => setDeletingItem({ type: 'category', index: i, title: c.label || 'Category tile' })}
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() =>
            setTopCategories((rows) => [
              ...rows,
              { id: `tc-${Date.now()}`, label: 'NEW', href: '/collections/new-arrivals', image: '' },
            ])
          }
        >
          + Add category tile
        </Button>
      </Card>

      <Card title="About banner" className="mt-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Image URL">
            <div className="flex gap-2">
              <Input
                value={aboutBanner.image || ''}
                onChange={(e) => setAboutBanner((s) => ({ ...s, image: e.target.value }))}
                placeholder="https://... or /logo/about.jpg"
                className="flex-1"
              />
              <label className="flex cursor-pointer items-center justify-center rounded-lg border border-line bg-chalk px-3 py-1.5 text-[12px] font-medium hover:bg-line/40">
                <span>{uploadingTarget === 'about' ? '...' : '📁 Upload'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleImageUpload(e, (url) => setAboutBanner((s) => ({ ...s, image: url })), 'about')
                  }
                  className="hidden"
                />
              </label>
            </div>
          </Field>
          <Field label="Kicker">
            <Input
              value={aboutBanner.kicker || ''}
              onChange={(e) => setAboutBanner((s) => ({ ...s, kicker: e.target.value }))}
            />
          </Field>
        </div>
      </Card>

      <Card title="Merch grid" className="mt-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Section title">
            <Input
              value={merch.title || ''}
              onChange={(e) => setMerch((s) => ({ ...s, title: e.target.value }))}
            />
          </Field>
          <Field label="CTA label">
            <Input
              value={merch.cta?.label || ''}
              onChange={(e) =>
                setMerch((s) => ({ ...s, cta: { ...(s.cta ?? {}), label: e.target.value } }))
              }
            />
          </Field>
          <Field label="CTA href" className="sm:col-span-2">
            <Input
              value={merch.cta?.href || ''}
              onChange={(e) =>
                setMerch((s) => ({ ...s, cta: { ...(s.cta ?? {}), href: e.target.value } }))
              }
            />
          </Field>
        </div>
        <div className="mt-4 space-y-2">
          {(merch.tiles ?? []).map((t, i) => (
            <div key={t.id || i} className="grid gap-2 md:grid-cols-3">
              <Input
                value={t.alt || ''}
                onChange={(e) =>
                  setMerch((s) => ({
                    ...s,
                    tiles: s.tiles.map((row, idx) =>
                      idx === i ? { ...row, alt: e.target.value } : row
                    ),
                  }))
                }
                placeholder="Alt"
              />
              <Input
                value={t.href || ''}
                onChange={(e) =>
                  setMerch((s) => ({
                    ...s,
                    tiles: s.tiles.map((row, idx) =>
                      idx === i ? { ...row, href: e.target.value } : row
                    ),
                  }))
                }
                placeholder="Href"
              />
              <div className="flex gap-2">
                <Input
                  value={t.image || ''}
                  onChange={(e) =>
                    setMerch((s) => ({
                      ...s,
                      tiles: s.tiles.map((row, idx) =>
                        idx === i ? { ...row, image: e.target.value } : row
                      ),
                    }))
                  }
                  placeholder="Image URL"
                  className="min-w-0 flex-1"
                />
                <label className="flex cursor-pointer items-center justify-center rounded-lg border border-line bg-chalk px-2.5 py-1.5 text-[11px] font-medium hover:bg-line/40">
                  <span>{uploadingTarget === `merch-${i}` ? '...' : '📁'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageUpload(
                        e,
                        (url) =>
                          setMerch((s) => ({
                            ...s,
                            tiles: s.tiles.map((row, idx) =>
                              idx === i ? { ...row, image: url } : row
                            ),
                          })),
                        `merch-${i}`,
                        t.title || t.label || "merch"
                      )
                    }
                    className="hidden"
                  />
                </label>
                <Button
                  variant="danger"
                  className="!px-2.5 !py-1.5"
                  onClick={() => setDeletingItem({ type: 'merch', index: i, title: t.alt || 'Merch tile' })}
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() =>
            setMerch((s) => ({
              ...s,
              tiles: [
                ...(s.tiles ?? []),
                { id: `mt-${Date.now()}`, href: '/collections/signature-scents', image: '', alt: 'Scent' },
              ],
            }))
          }
        >
          + Add merch tile
        </Button>
      </Card>

      <Card title="Why choose section" className="mt-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Headline">
            <Input
              value={homeRails.why?.title || ''}
              onChange={(e) =>
                setHomeRails((s) => ({
                  ...s,
                  why: { ...(s.why ?? {}), title: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Subtitle" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={homeRails.why?.subtitle || ''}
              onChange={(e) =>
                setHomeRails((s) => ({
                  ...s,
                  why: { ...(s.why ?? {}), subtitle: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Primary CTA label">
            <Input
              value={homeRails.why?.primaryCta?.label || ''}
              onChange={(e) =>
                setHomeRails((s) => ({
                  ...s,
                  why: {
                    ...(s.why ?? {}),
                    primaryCta: { ...(s.why?.primaryCta ?? {}), label: e.target.value },
                  },
                }))
              }
            />
          </Field>
          <Field label="Primary CTA href">
            <Input
              value={homeRails.why?.primaryCta?.href || ''}
              onChange={(e) =>
                setHomeRails((s) => ({
                  ...s,
                  why: {
                    ...(s.why ?? {}),
                    primaryCta: { ...(s.why?.primaryCta ?? {}), href: e.target.value },
                  },
                }))
              }
            />
          </Field>
          <Field label="Secondary CTA label">
            <Input
              value={homeRails.why?.secondaryCta?.label || ''}
              onChange={(e) =>
                setHomeRails((s) => ({
                  ...s,
                  why: {
                    ...(s.why ?? {}),
                    secondaryCta: { ...(s.why?.secondaryCta ?? {}), label: e.target.value },
                  },
                }))
              }
            />
          </Field>
          <Field label="Secondary CTA href">
            <Input
              value={homeRails.why?.secondaryCta?.href || ''}
              onChange={(e) =>
                setHomeRails((s) => ({
                  ...s,
                  why: {
                    ...(s.why ?? {}),
                    secondaryCta: { ...(s.why?.secondaryCta ?? {}), href: e.target.value },
                  },
                }))
              }
            />
          </Field>
        </div>
        <div className="mt-4 space-y-3">
          {whyChoose.map((item, i) => (
            <div key={item.id || i} className="rounded-lg border border-line p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={item.title || ''}
                  onChange={(e) =>
                    setWhyChoose((rows) =>
                      rows.map((r, idx) => (idx === i ? { ...r, title: e.target.value } : r))
                    )
                  }
                  placeholder="Title"
                />
                <Input
                  value={item.image || ''}
                  onChange={(e) =>
                    setWhyChoose((rows) =>
                      rows.map((r, idx) => (idx === i ? { ...r, image: e.target.value } : r))
                    )
                  }
                  placeholder="Image URL"
                />
                <Textarea
                  className="sm:col-span-2"
                  rows={2}
                  value={item.body || ''}
                  onChange={(e) =>
                    setWhyChoose((rows) =>
                      rows.map((r, idx) => (idx === i ? { ...r, body: e.target.value } : r))
                    )
                  }
                  placeholder="Body"
                />
              </div>
              <Button
                variant="danger"
                className="mt-2 !px-2.5 !py-1.5"
                onClick={() => setDeletingItem({ type: 'why', index: i, title: item.title || 'Why card' })}
              >
                Delete card
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() =>
            setWhyChoose((rows) => [
              ...rows,
              { id: `wc-${Date.now()}`, title: 'New reason', body: '', image: '' },
            ])
          }
        >
          + Add why card
        </Button>
      </Card>

      <Card title="Trust markers" className="mt-5">
        <div className="space-y-3">
          {trustMarkers.map((m, i) => (
            <div key={m.id || i} className="grid gap-2 md:grid-cols-4">
              <select
                className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
                value={m.icon || 'star'}
                onChange={(e) =>
                  setTrustMarkers((rows) =>
                    rows.map((r, idx) => (idx === i ? { ...r, icon: e.target.value } : r))
                  )
                }
              >
                {ICON_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <Input
                value={m.title || ''}
                onChange={(e) =>
                  setTrustMarkers((rows) =>
                    rows.map((r, idx) => (idx === i ? { ...r, title: e.target.value } : r))
                  )
                }
                placeholder="Title"
              />
              <Input
                value={m.sub || ''}
                onChange={(e) =>
                  setTrustMarkers((rows) =>
                    rows.map((r, idx) => (idx === i ? { ...r, sub: e.target.value } : r))
                  )
                }
                placeholder="Subtitle"
              />
              <Button
                variant="danger"
                className="!px-2.5 !py-1.5"
                onClick={() => setDeletingItem({ type: 'trust', index: i, title: m.title || 'Trust marker' })}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() =>
            setTrustMarkers((rows) => [
              ...rows,
              { id: `tm-${Date.now()}`, icon: 'star', title: 'New', sub: '' },
            ])
          }
        >
          + Add marker
        </Button>
      </Card>

      <Card title="Review summary" className="mt-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Average rating">
            <Input
              type="number"
              step="0.1"
              value={reviewSummary.average ?? 0}
              onChange={(e) =>
                setReviewSummary((s) => ({ ...s, average: Number(e.target.value) || 0 }))
              }
            />
          </Field>
          <Field label="Total reviews">
            <Input
              type="number"
              value={reviewSummary.total ?? 0}
              onChange={(e) =>
                setReviewSummary((s) => ({ ...s, total: Number(e.target.value) || 0 }))
              }
            />
          </Field>
        </div>
        <p className="mt-4 text-[12px] font-medium text-ink">Featured reviews</p>
        <div className="mt-2 space-y-2">
          {(reviewSummary.items ?? []).map((item, i) => (
            <div key={i} className="grid gap-2 md:grid-cols-3">
              <Input
                value={item.name || ''}
                onChange={(e) =>
                  setReviewSummary((s) => ({
                    ...s,
                    items: s.items.map((r, idx) =>
                      idx === i ? { ...r, name: e.target.value } : r
                    ),
                  }))
                }
                placeholder="Name"
              />
              <Input
                value={item.title || ''}
                onChange={(e) =>
                  setReviewSummary((s) => ({
                    ...s,
                    items: s.items.map((r, idx) =>
                      idx === i ? { ...r, title: e.target.value } : r
                    ),
                  }))
                }
                placeholder="Title (optional)"
              />
              <div className="flex gap-2 md:col-span-3">
                <Input
                  value={item.body || ''}
                  onChange={(e) =>
                    setReviewSummary((s) => ({
                      ...s,
                      items: s.items.map((r, idx) =>
                        idx === i ? { ...r, body: e.target.value } : r
                      ),
                    }))
                  }
                  placeholder="Review body"
                  className="min-w-0 flex-1"
                />
                <Button
                  variant="danger"
                  className="!px-2.5 !py-1.5"
                  onClick={() => setDeletingItem({ type: 'review', index: i, title: item.name || 'Customer review' })}
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() =>
            setReviewSummary((s) => ({
              ...s,
              items: [...(s.items ?? []), { name: 'Customer', body: '', title: '' }],
            }))
          }
        >
          + Add review
        </Button>
      </Card>

      <Card title="Product page offers" className="mt-5">
        <div className="space-y-3">
          {offers.map((o, i) => (
            <div key={o.id || i} className="rounded-lg border border-line p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={o.title || ''}
                  onChange={(e) =>
                    setOffers((rows) =>
                      rows.map((r, idx) => (idx === i ? { ...r, title: e.target.value } : r))
                    )
                  }
                  placeholder="Offer title"
                />
                <Input
                  value={o.sub || ''}
                  onChange={(e) =>
                    setOffers((rows) =>
                      rows.map((r, idx) => (idx === i ? { ...r, sub: e.target.value } : r))
                    )
                  }
                  placeholder="Subtitle"
                />
              </div>
              <Button
                variant="danger"
                className="mt-2 !px-2.5 !py-1.5"
                onClick={() => setDeletingItem({ type: 'offer', index: i, title: o.title || 'Offer' })}
              >
                Delete offer
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          className="mt-3"
          onClick={() =>
            setOffers((rows) => [
              ...rows,
              { id: `off-${Date.now()}`, title: 'New offer', sub: '', apply: '', terms: [] },
            ])
          }
        >
          + Add offer
        </Button>
      </Card>

      <ConfirmModal
        open={Boolean(deletingItem)}
        onClose={() => !saving && setDeletingItem(null)}
        loading={saving}
        loadingText="Deleting item..."
        onConfirm={async () => {
          if (!deletingItem) return
          const { type, index } = deletingItem
          let nextTopCategories = topCategories
          let nextMerch = merch
          let nextWhyChoose = whyChoose
          let nextTrustMarkers = trustMarkers
          let nextReviewSummary = reviewSummary
          let nextOffers = offers

          if (type === 'category') {
            nextTopCategories = topCategories.filter((_, idx) => idx !== index)
            setTopCategories(nextTopCategories)
          } else if (type === 'merch') {
            nextMerch = { ...merch, tiles: merch.tiles.filter((_, idx) => idx !== index) }
            setMerch(nextMerch)
          } else if (type === 'why') {
            nextWhyChoose = whyChoose.filter((_, idx) => idx !== index)
            setWhyChoose(nextWhyChoose)
          } else if (type === 'trust') {
            nextTrustMarkers = trustMarkers.filter((_, idx) => idx !== index)
            setTrustMarkers(nextTrustMarkers)
          } else if (type === 'review') {
            nextReviewSummary = { ...reviewSummary, items: reviewSummary.items.filter((_, idx) => idx !== index) }
            setReviewSummary(nextReviewSummary)
          } else if (type === 'offer') {
            nextOffers = offers.filter((_, idx) => idx !== index)
            setOffers(nextOffers)
          }

          setSaving(true)
          try {
            const json = await apiPatch(
              '/content',
              {
                section: 'homepage',
                value: {
                  topCategories: nextTopCategories,
                  aboutBanner,
                  merch: nextMerch,
                  offers: nextOffers,
                  whyChoose: nextWhyChoose,
                  homeRails,
                  trustMarkers: nextTrustMarkers,
                  reviewSummary: nextReviewSummary,
                },
              },
              { auth: true }
            )
            dispatch({ type: 'catalog/setContent', content: json.data.content })
            notify(`${deletingItem?.title || 'Item'} deleted and database updated.`)
            setDeletingItem(null)
          } catch (err) {
            notify(err.message || 'Unable to delete item from database.')
          } finally {
            setSaving(false)
          }
        }}
        title={`Delete ${deletingItem?.title || 'item'}?`}
        message={`Are you sure you want to permanently delete this ${deletingItem?.type || 'item'} (${deletingItem?.title || ''})?`}
        confirmText="Delete item"
        tone="danger"
      />
    </>
  )
}
