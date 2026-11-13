import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Img from '../components/Img'
import { useCart } from '../context/CartContext.jsx'
import { apiDelete, apiPatch, apiPost } from '../lib/api.js'
import { useStore, inr } from '../store/StoreContext.jsx'
import {
  allCategories, allProducts, categoryNames, stockOf, subcategoriesOf, variantsOf,
} from '../store/selectors.js'
import {
  Badge, Button, Card, ConfirmModal, Field, Input, Modal, PageHeader, Pagination, Select, Table, Td, Tr,
} from './ui.jsx'

const blank = {
  handle: '', title: '', price: 799, compareAt: 1099, color: '', category: '',
  subcategory: '', kind: 'lifestyle', productType: 'candle', sizes: '',
  collections: 'new-arrivals,scented-candles',
  material: '', scent: '', waxType: '', burnTime: '', fragrance: '', occasion: '',
  shortDescription: '', sku: '', weight: '', dimensions: '', candleType: '',
  scentTop: '', scentMiddle: '', scentBase: '',
}

const PRODUCT_TYPES = [
  { value: 'uniform', label: 'School / Industrial Uniform' },
  { value: 'schoolwear', label: 'Schoolwear' },
  { value: 'workwear', label: 'Workwear & Industrial' },
  { value: 'safety', label: 'Safety & FR Wear' },
  { value: 'corporate', label: 'Corporate Attire' },
  { value: 'other', label: 'Other' },
]

const UNIFORM_FITS = ['', 'Regular Fit', 'Classic School Fit', 'Athletic Fit', 'Tailored Cut', 'Industrial Workwear Fit', 'Pleated']

function inferSubcategory(product, cats) {
  const cols = product.collections ?? []
  for (const cat of cats) {
    if (cat.name !== product.category) continue
    const hit = (cat.children ?? []).find((s) => cols.includes(s.slug))
    if (hit) return hit.slug
  }
  for (const cat of cats) {
    const hit = (cat.children ?? []).find((s) => cols.includes(s.slug))
    if (hit) return hit.slug
  }
  return ''
}

const PAGE_SIZE = 12

export default function Products() {
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const list = allProducts(state)
  const managedCats = allCategories(state)
  const defaultCategory = managedCats[0]?.name || 'Boys'

  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [archivingProduct, setArchivingProduct] = useState(null)
  const [saving, setSaving] = useState(false)
  const [rowBusy, setRowBusy] = useState(null)

  useEffect(() => {
    setPage(1)
  }, [q, cat])

  const categories = useMemo(() => {
    const names = new Set([
      ...categoryNames(state),
      ...list.map((p) => p.category).filter(Boolean),
    ])
    return ['All', ...names]
  }, [state, list])

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return list.filter(
      (p) =>
        (cat === 'All' || p.category === cat) &&
        (!t || p.title.toLowerCase().includes(t) || p.handle.includes(t))
    )
  }, [list, q, cat])

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return rows.slice(start, start + PAGE_SIZE)
  }, [rows, page])

  const save = async (form) => {
    if (saving) return
    const sizes = form.sizes.split(',').map((s) => s.trim()).filter(Boolean)
    let collections = form.collections.split(',').map((s) => s.trim()).filter(Boolean)
    if (form.subcategory && !collections.includes(form.subcategory)) {
      collections = [form.subcategory, ...collections]
    }
    const parent = managedCats.find((c) => c.name === form.category)
    if (parent?.slug && !collections.includes(parent.slug)) {
      collections = [...collections, parent.slug]
    }

    const scentNotes =
      form.scentTop || form.scentMiddle || form.scentBase
        ? { top: form.scentTop, middle: form.scentMiddle, base: form.scentBase }
        : undefined

    const patch = {
      title: form.title,
      price: Number(form.price),
      compareAt: Number(form.compareAt),
      discount: Math.round((1 - Number(form.price) / Number(form.compareAt)) * 100) || 0,
      color: form.color,
      category: form.category,
      kind: 'lifestyle',
      productType: form.productType || 'candle',
      sizes,
      collections,
      shortDescription: form.shortDescription || undefined,
      material: form.waxType || form.material || undefined,
      waxType: form.waxType || form.material || undefined,
      scent: form.fragrance || form.scent || undefined,
      fragrance: form.fragrance || form.scent || undefined,
      burnTime: form.burnTime || undefined,
      occasion: form.occasion || undefined,
      sku: form.sku || undefined,
      weight: form.weight || undefined,
      dimensions: form.dimensions || undefined,
      candleType: form.candleType || undefined,
      scentNotes,
    }

    setSaving(true)
    try {
      const json = await apiPatch(`/products/${editing.handle}`, { product: patch }, { auth: true })
      const product = json.data?.product
      dispatch({
        type: 'product/update',
        handle: editing.handle,
        patch: product ?? patch,
        fromApi: true,
      })
      notify(json.message || 'Product updated successfully.')
      setEditing(null)
    } catch (err) {
      notify(err.message || 'Unable to save the product.')
    } finally {
      setSaving(false)
    }
  }

  const confirmArchive = async () => {
    if (!archivingProduct || rowBusy) return
    const p = archivingProduct
    setRowBusy(p.handle)
    try {
      const json = await apiDelete(`/products/${p.handle}`, { auth: true })
      dispatch({ type: 'product/delete', handle: p.handle, keepVariants: true })
      notify(json.message || 'Product archived successfully.')
      setArchivingProduct(null)
    } catch (err) {
      notify(err.message || 'Unable to archive the product.')
    } finally {
      setRowBusy(null)
    }
  }

  const restore = async (handle) => {
    if (rowBusy) return
    setRowBusy(handle)
    try {
      const json = await apiPost(`/products/${handle}/restore`, {}, { auth: true })
      const product = json.data?.product
      dispatch({ type: 'product/restore', handle, product })
      notify(json.message || 'Product restored successfully.')
    } catch (err) {
      notify(err.message || 'Unable to restore the product.')
    } finally {
      setRowBusy(null)
    }
  }

  const totalLive = list.length
  const totalVariants = state.variants.length
  const outOfStockCount = list.filter((p) => stockOf(state, p.handle) === 0).length
  const lowStockCount = list.filter((p) => {
    const s = stockOf(state, p.handle)
    return s > 0 && s <= 10
  }).length

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-ink">Products</h1>
          <p className="text-[12px] text-muted">{list.length} live products · {state.deletedProducts.length} archived</p>
        </div>

        <Link
          to="/admin/products/new"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#4849E8] px-3 text-[12px] font-semibold text-white shadow-xs transition-all hover:bg-[#3839D6] active:scale-95 self-start sm:self-auto"
        >
          <span className="text-[14px] leading-none">+</span>
          <span>New Product</span>
        </Link>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-graphite">Total Products</p>
          <p className="mt-1 text-[17px] font-bold text-ink leading-tight">{totalLive}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-graphite">Total Variants</p>
          <p className="mt-1 text-[17px] font-bold text-ink leading-tight">{totalVariants}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Low Stock</p>
          <p className="mt-1 text-[17px] font-bold text-amber-600 leading-tight">{lowStockCount}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600">Out of Stock</p>
          <p className="mt-1 text-[17px] font-bold text-red-600 leading-tight">{outOfStockCount}</p>
        </div>
      </div>

      <Card className="!p-0">
        {/* Filter Toolbar */}
        <div className="p-3.5 sm:p-4 border-b border-line space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-graphite">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by title or handle…"
                  className="w-full h-[38px] rounded-lg border border-line bg-white pl-9 pr-3 text-[12.5px] text-ink outline-none placeholder:text-muted focus:border-[#4849E8]"
                />
              </div>

              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="h-[38px] rounded-lg border border-line bg-white px-3 text-[12.5px] font-medium text-ink outline-none focus:border-[#4849E8]"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
                ))}
              </select>
            </div>

            <span className="text-[11.5px] font-medium text-muted self-end sm:self-auto">
              Showing <strong className="text-ink">{paginatedRows.length}</strong> of <strong className="text-ink">{rows.length}</strong> products
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-line bg-chalk/40 text-[10.5px] font-bold uppercase tracking-wider text-graphite">
                <th className="py-2.5 pl-4 px-3">Product</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Price</th>
                <th className="py-2.5 px-3">Variants</th>
                <th className="py-2.5 px-3 text-right">Stock</th>
                <th className="py-2.5 pr-4 pl-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    No products match your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((p) => {
                  const stock = stockOf(state, p.handle)
                  const vs = variantsOf(state, p.handle).length
                  const busy = rowBusy === p.handle
                  return (
                    <tr key={p.handle} className="hover:bg-[#F9F9FE] transition-colors">
                      <td className="py-3 pl-4 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-10 w-8 shrink-0 overflow-hidden rounded-md border border-line bg-chalk">
                            <Img src={p.images[0]} alt="" width={80} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <Link to={`/admin/products/${p.handle}`} className="line-clamp-1 font-semibold text-ink hover:text-[#4849E8] transition-colors">
                              {p.title}
                            </Link>
                            <span className="block font-mono text-[10px] text-muted">{p.handle}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-graphite">{p.category}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-ink">{inr(p.price)}</span>
                        {p.compareAt > p.price && (
                          <span className="ml-1.5 text-[11px] text-muted line-through">{inr(p.compareAt)}</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <Link to={`/admin/products/${p.handle}`} className="underline underline-offset-2 text-ink hover:text-[#4849E8]">
                          {vs} variant{vs === 1 ? '' : 's'}
                        </Link>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {stock === 0 ? (
                          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                            Out of stock
                          </span>
                        ) : stock <= 10 ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            {stock} left
                          </span>
                        ) : (
                          <span className="font-semibold text-ink">{stock}</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 pl-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/admin/products/${p.handle}/edit`}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-line bg-white px-2 text-[11px] font-semibold text-ink shadow-2xs hover:bg-chalk active:scale-95 transition-all cursor-pointer"
                          >
                            <svg className="h-3 w-3 text-graphite" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            <span>Edit</span>
                          </Link>

                          <button
                            type="button"
                            disabled={!!rowBusy}
                            onClick={() => setArchivingProduct(p)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 bg-red-50/70 text-[#E02438] hover:bg-red-100 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                            title="Archive product"
                          >
                            {busy ? (
                              <span className="h-3 w-3 animate-spin rounded-full border border-red-500 border-t-transparent" />
                            ) : (
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-line px-4 py-3">
          <Pagination
            page={page}
            total={rows.length}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </div>
      </Card>

      {state.deletedProducts?.length > 0 && (
        <Card title={`Archived products (${state.deletedProducts.length})`}>
          <p className="mb-3 text-xs text-graphite">
            Archived products are hidden from the store. Restore any product to make it available again.
          </p>
          <div className="flex flex-wrap gap-2">
            {state.deletedProducts.map((h) => (
              <button
                key={h}
                disabled={!!rowBusy}
                onClick={() => restore(h)}
                className="rounded-lg border border-line px-3 py-1.5 text-[11px] font-medium transition-colors hover:border-ink disabled:opacity-40 bg-chalk/50"
              >
                {rowBusy === h ? 'Restoring...' : <>{h} · <span className="text-[#4849E8] font-bold">restore</span></>}
              </button>
            ))}
          </div>
        </Card>
      )}

      {editing && (
        <ProductEditModal
          key={editing.handle}
          product={editing}
          defaultCategory={defaultCategory}
          categories={managedCats}
          saving={saving}
          onClose={() => !saving && setEditing(null)}
          onSave={save}
        />
      )}

      <ConfirmModal
        open={Boolean(archivingProduct)}
        onClose={() => !rowBusy && setArchivingProduct(null)}
        onConfirm={confirmArchive}
        loading={Boolean(rowBusy)}
        loadingText="Archiving..."
        title={`Archive “${archivingProduct?.title || 'this product'}”?`}
        message={`Are you sure you want to archive “${archivingProduct?.title}”? It will be hidden from the storefront catalogue. You can restore it later if needed.`}
        confirmText="Archive product"
        tone="danger"
      />
    </div>
  )
}

function ProductEditModal({ product, onClose, onSave, categories, defaultCategory, saving }) {
  const [form, setForm] = useState({
    ...blank,
    ...product,
    category: product.category || defaultCategory,
    subcategory: inferSubcategory(product, categories),
    sizes: (product.sizes ?? []).join(','),
    collections: (product.collections ?? []).join(','),
    material: product.material ?? '',
    scent: product.scent ?? '',
    productType: product.productType ?? 'candle',
    waxType: product.waxType ?? product.material ?? '',
    fragrance: product.fragrance ?? product.scent ?? '',
    burnTime: product.burnTime ?? '',
    occasion: product.occasion ?? '',
    shortDescription: product.shortDescription ?? '',
    sku: product.sku ?? '',
    weight: product.weight ?? '',
    dimensions: product.dimensions ?? '',
    candleType: product.candleType ?? '',
    scentTop: product.scentNotes?.top ?? '',
    scentMiddle: product.scentNotes?.middle ?? '',
    scentBase: product.scentNotes?.base ?? '',
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const catOptions = useMemo(() => {
    const names = categories.filter((c) => c.active !== false).map((c) => c.name)
    if (form.category && !names.includes(form.category)) names.unshift(form.category)
    return names.length ? names : [defaultCategory]
  }, [categories, form.category, defaultCategory])

  const subOptions = useMemo(() => {
    const cat = categories.find((c) => c.name === form.category || c.id === form.category)
    const subs = (cat?.children ?? []).filter((s) => s.active !== false)
    return [{ value: '', label: '— None —' }, ...subs.map((s) => ({ value: s.slug, label: s.name }))]
  }, [categories, form.category])

  return (
    <Modal open onClose={onClose} title="Edit product" wide>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Field label="Title">
            <Input value={form.title} onChange={set('title')} placeholder="Product name" disabled={saving} />
          </Field>
        </div>
        <Field label="Price (₹)"><Input type="number" value={form.price} onChange={set('price')} disabled={saving} /></Field>
        <Field label="Compare at (₹)"><Input type="number" value={form.compareAt} onChange={set('compareAt')} disabled={saving} /></Field>
        <Field label="Colour"><Input value={form.color} onChange={set('color')} disabled={saving} /></Field>
        <Field label="Category">
          <Select
            value={form.category}
            disabled={saving}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, subcategory: '' }))}
            options={catOptions}
          />
        </Field>
        <Field label="Subcategory" hint="Maps to a collection slug on the storefront.">
          <Select value={form.subcategory} onChange={set('subcategory')} options={subOptions} disabled={saving} />
        </Field>
        <Field label="Product type">
          <Select
            value={form.productType || 'candle'}
            disabled={saving}
            onChange={(e) => setForm((f) => ({ ...f, productType: e.target.value, kind: 'lifestyle' }))}
            options={PRODUCT_TYPES}
          />
        </Field>
        <Field label="Fit / Cut">
          <Select
            value={form.fit || ''}
            onChange={set('fit')}
            disabled={saving}
            options={UNIFORM_FITS.map((t) => ({ value: t, label: t || '— None —' }))}
          />
        </Field>
        <Field label="Sizes" hint="Comma separated, e.g. 220g, 450g. Leave blank for one-size.">
          <Input value={form.sizes} onChange={set('sizes')} disabled={saving} />
        </Field>
        <Field label="SKU">
          <Input value={form.sku} onChange={set('sku')} placeholder="EN-VA-220" disabled={saving} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Collections" hint="Comma separated slugs, e.g. new-arrivals, best-sellers">
            <Input value={form.collections} onChange={set('collections')} disabled={saving} />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Short description">
            <Input value={form.shortDescription ?? ''} onChange={set('shortDescription')} placeholder="Warm Vanilla · Amber · Sandalwood" disabled={saving} />
          </Field>
        </div>
        <Field label="Fabric / Material">
          <Input value={form.material || ''} onChange={set('material')} placeholder="65% Polyester, 35% Cotton Twill" disabled={saving} />
        </Field>
        <Field label="Gender / Target Group">
          <Input value={form.gender || ''} onChange={set('gender')} placeholder="Boys / Girls / Unisex" disabled={saving} />
        </Field>
        <Field label="Sleeve / Length">
          <Input value={form.sleeve || ''} onChange={set('sleeve')} placeholder="Short Sleeve / Long Sleeve" disabled={saving} />
        </Field>
        <Field label="Fabric Weight (GSM)">
          <Input value={form.weight || ''} onChange={set('weight')} placeholder="220 GSM" disabled={saving} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Care Instructions">
            <Input value={form.careInstructions || form.care || ''} onChange={set('careInstructions')} placeholder="Machine wash warm, easy iron" disabled={saving} />
          </Field>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          onClick={() => onSave(form)}
          disabled={!form.title.trim() || !form.category}
          loading={saving}
          loadingText="Saving Product..."
        >
          Save changes
        </Button>
      </div>
    </Modal>
  )
}
