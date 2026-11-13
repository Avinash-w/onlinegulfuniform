import { useEffect, useState } from 'react'
import { useStore } from '../store/StoreContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { storefrontContent } from '../store/selectors.js'
import { apiPatch } from '../lib/api.js'
import { Button, Card, ConfirmModal, Field, Input, PageHeader } from './ui.jsx'

export default function FiltersAdmin() {
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const content = storefrontContent(state)
  const [groups, setGroups] = useState(content.filterGroups ?? [])
  const [swatches, setSwatches] = useState(
    Object.entries(content.colorSwatches ?? {}).map(([name, hex]) => ({ name, hex }))
  )
  const [sortOptions, setSortOptions] = useState((content.sortOptions ?? []).join('\n'))
  const [saving, setSaving] = useState(false)
  const [deletingItem, setDeletingItem] = useState(null) // { type: 'group' | 'swatch', index, label }

  useEffect(() => {
    setGroups(content.filterGroups ?? [])
    setSwatches(Object.entries(content.colorSwatches ?? {}).map(([name, hex]) => ({ name, hex })))
    setSortOptions((content.sortOptions ?? []).join('\n'))
  }, [
    JSON.stringify(content.filterGroups),
    JSON.stringify(content.colorSwatches),
    JSON.stringify(content.sortOptions),
  ])

  const save = async () => {
    if (saving) return
    const colorSwatches = Object.fromEntries(
      swatches
        .map((s) => [s.name.trim(), s.hex.trim()])
        .filter(([n, h]) => n && h)
    )
    const filterGroups = groups
      .map((g) => ({
        id: g.id,
        name: g.name.trim(),
        options: (typeof g.optionsText === 'string' ? g.optionsText.split('\n') : g.options)
          .map((o) => String(o).trim())
          .filter(Boolean),
      }))
      .filter((g) => g.name)
    const sorts = sortOptions
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)

    setSaving(true)
    try {
      await apiPatch('/content', { section: 'filterGroups', value: filterGroups }, { auth: true })
      await apiPatch('/content', { section: 'colorSwatches', value: colorSwatches }, { auth: true })
      const json = await apiPatch(
        '/content',
        { section: 'sortOptions', value: sorts },
        { auth: true }
      )
      dispatch({ type: 'catalog/setContent', content: json.data.content })
      notify(json.message || 'Filters saved.')
    } catch (err) {
      notify(err.message || 'Unable to save filters.')
    } finally {
      setSaving(false)
    }
  }

  const rows = groups.map((g) => ({
    ...g,
    optionsText: g.optionsText ?? (g.options ?? []).join('\n'),
  }))

  return (
    <>
      <PageHeader
        title="Filters"
        sub="Collection page facets, color swatches and sort options."
        action={
          <Button onClick={save} loading={saving} loadingText="Saving..." disabled={saving}>
            Save filters
          </Button>
        }
      />

      <div className="space-y-3">
        {rows.map((g, i) => (
          <Card key={g.id || g.name}>
            <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
              <Field label="Group name">
                <Input
                  value={g.name}
                  onChange={(e) =>
                    setGroups((list) =>
                      list.map((row, idx) => (idx === i ? { ...row, name: e.target.value } : row))
                    )
                  }
                  placeholder="e.g. Fragrance Family"
                />
              </Field>
              <Field label="Options (one per line)">
                <textarea
                  value={g.optionsText}
                  onChange={(e) =>
                    setGroups((list) =>
                      list.map((row, idx) =>
                        idx === i ? { ...row, optionsText: e.target.value } : row
                      )
                    )
                  }
                  rows={4}
                  placeholder="Floral&#10;Woody&#10;Citrus&#10;Gourmand"
                  className="w-full rounded-lg border border-line px-3 py-2 text-[12px] outline-none focus:border-ink"
                />
              </Field>
              <div className="flex items-end gap-1.5">
                <Button
                  variant="danger"
                  className="!px-2.5 !py-1.5"
                  onClick={() => setDeletingItem({ type: 'group', index: i, label: g.name || 'filter group' })}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {rows.length === 0 && (
          <Card>
            <div className="py-6 text-center text-muted text-[13px]">
              No filter groups configured. Add one below.
            </div>
          </Card>
        )}
      </div>

      <Button
        variant="ghost"
        className="mt-3"
        onClick={() =>
          setGroups((list) => [
            ...list,
            { id: `fg-${Date.now()}`, name: 'New filter', options: [], optionsText: '' },
          ])
        }
      >
        + Add filter group
      </Button>

      <Card
        title="Color swatches"
        className="mt-5"
        action={
          <Button
            variant="ghost"
            className="!py-1.5 !text-[11px]"
            onClick={() => setSwatches((rows) => [...rows, { name: 'New Color', hex: '#E5D0BA' }])}
          >
            + Add Color Swatch
          </Button>
        }
      >
        <p className="mb-4 text-[12px] text-muted">
          Define color names and hex codes for collection filter swatches and product color badges. Click any swatch circle to visually pick a color.
        </p>

        {swatches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line py-8 text-center">
            <p className="text-[13px] text-muted">No color swatches configured.</p>
            <Button
              variant="ghost"
              className="mt-3 !py-1.5 !text-[11px]"
              onClick={() => setSwatches((rows) => [...rows, { name: 'Amber', hex: '#B8895A' }])}
            >
              + Add first color
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {swatches.map((s, i) => (
              <div
                key={i}
                className="group relative flex items-center gap-3 rounded-xl border border-line bg-chalk/30 p-3 transition-all hover:border-ink/40 hover:bg-white hover:shadow-sm"
              >
                {/* Visual click-to-pick Color Swatch */}
                <label
                  className="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-white shadow-sm ring-1 ring-line/80 transition-transform hover:scale-105"
                  style={{ backgroundColor: s.hex || '#CCCCCC' }}
                  title="Click to open color picker"
                >
                  <input
                    type="color"
                    value={s.hex.startsWith('#') && s.hex.length === 7 ? s.hex : '#CCCCCC'}
                    onChange={(e) => {
                      const hex = e.target.value.toUpperCase()
                      setSwatches((rows) =>
                        rows.map((r, idx) => (idx === i ? { ...r, hex } : r))
                      )
                    }}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                  <span className="pointer-events-none absolute bottom-0.5 right-0.5 rounded-full bg-black/40 p-0.5 text-[8px] text-white backdrop-blur-xs">
                    🎨
                  </span>
                </label>

                {/* Color Name & Hex Inputs */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <input
                    value={s.name}
                    onChange={(e) =>
                      setSwatches((rows) =>
                        rows.map((r, idx) => (idx === i ? { ...r, name: e.target.value } : r))
                      )
                    }
                    placeholder="Color name (e.g. Amber)"
                    className="w-full rounded-md border border-line bg-white px-2.5 py-1 text-[13px] font-medium text-ink outline-none transition-colors focus:border-forest"
                  />
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-[10px] font-mono font-semibold text-muted">
                        #
                      </span>
                      <input
                        value={s.hex.replace(/^#/, '')}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6)
                          setSwatches((rows) =>
                            rows.map((r, idx) => (idx === i ? { ...r, hex: val ? `#${val}` : '' } : r))
                          )
                        }}
                        placeholder="B8895A"
                        className="w-full rounded-md border border-line bg-white pl-6 pr-2 py-0.5 font-mono text-[11px] uppercase text-graphite outline-none transition-colors focus:border-forest"
                      />
                    </div>
                  </div>
                </div>

                {/* Delete action */}
                <button
                  type="button"
                  onClick={() => setDeletingItem({ type: 'swatch', index: i, label: s.name || 'swatch' })}
                  title="Delete color"
                  className="rounded-lg p-2 text-muted transition-colors hover:bg-sale/10 hover:text-sale"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3">
          <Button
            variant="ghost"
            className="!py-1.5 !text-[11px]"
            onClick={() => setSwatches((rows) => [...rows, { name: 'New Color', hex: '#E5D0BA' }])}
          >
            + Add Color Swatch
          </Button>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
            <span>Quick add presets:</span>
            {[
              { name: 'Amber', hex: '#B8895A' },
              { name: 'Ivory', hex: '#F5F0E6' },
              { name: 'Blush', hex: '#E8C4C4' },
              { name: 'Charcoal', hex: '#2F2A26' },
              { name: 'Sage', hex: '#9CAF88' },
              { name: 'Terracotta', hex: '#C86D51' },
            ].map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  if (!swatches.some((s) => s.name.toLowerCase() === p.name.toLowerCase())) {
                    setSwatches((rows) => [...rows, p])
                  }
                }}
                className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-0.5 text-[10px] font-medium transition-colors hover:border-forest"
              >
                <span className="h-2 w-2 rounded-full ring-1 ring-line/50" style={{ backgroundColor: p.hex }} />
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Sort options" className="mt-5">
        <Field label="Active sorting options (one per line)">
          <textarea
            value={sortOptions}
            onChange={(e) => setSortOptions(e.target.value)}
            rows={5}
            placeholder="Featured | featured&#10;Price: Low to High | price-asc&#10;Price: High to Low | price-desc&#10;Newest Arrivals | newest"
            className="w-full rounded-lg border border-line px-3 py-2 text-[12px] outline-none focus:border-ink"
          />
        </Field>
      </Card>

      <ConfirmModal
        open={Boolean(deletingItem)}
        onClose={() => !saving && setDeletingItem(null)}
        loading={saving}
        loadingText="Deleting item..."
        onConfirm={async () => {
          if (!deletingItem) return
          const { type, index } = deletingItem
          setSaving(true)
          try {
            if (type === 'group') {
              const nextGroups = groups
                .filter((_, idx) => idx !== index)
                .map((g) => ({
                  id: g.id,
                  name: g.name.trim(),
                  options: (typeof g.optionsText === 'string' ? g.optionsText.split('\n') : g.options)
                    .map((o) => String(o).trim())
                    .filter(Boolean),
                }))
                .filter((g) => g.name)
              const json = await apiPatch('/content', { section: 'filterGroups', value: nextGroups }, { auth: true })
              dispatch({ type: 'catalog/setContent', content: json.data.content })
              setGroups(json.data.content.filterGroups ?? nextGroups)
              notify(`Filter group "${deletingItem.label}" deleted and database updated.`)
            } else if (type === 'swatch') {
              const nextSwatches = swatches.filter((_, idx) => idx !== index)
              const colorSwatches = Object.fromEntries(
                nextSwatches
                  .map((s) => [s.name.trim(), s.hex.trim()])
                  .filter(([n, h]) => n && h)
              )
              const json = await apiPatch('/content', { section: 'colorSwatches', value: colorSwatches }, { auth: true })
              dispatch({ type: 'catalog/setContent', content: json.data.content })
              setSwatches(nextSwatches)
              notify(`Color swatch "${deletingItem.label}" deleted and database updated.`)
            }
            setDeletingItem(null)
          } catch (err) {
            notify(err.message || 'Unable to delete from database.')
          } finally {
            setSaving(false)
          }
        }}
        title={`Delete ${deletingItem?.label || 'item'}?`}
        message={`Are you sure you want to permanently delete this ${deletingItem?.type === 'group' ? 'filter group' : 'color swatch'} (${deletingItem?.label || ''})?`}
        confirmText="Delete item"
        tone="danger"
      />
    </>
  )
}
