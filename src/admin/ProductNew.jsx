import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { art } from '../lib/art.js'
import { apiPatch, apiPost, apiUpload } from '../lib/api.js'
import {
  buildImageQuery,
  getUnsplashKey,
  imageUrlToDataUrl,
  searchProductImages,
} from '../lib/imageSearch.js'
import { useStore } from '../store/StoreContext.jsx'
import { allCategories, categoryNames, productByHandle, subcategoriesOf, variantsOf } from '../store/selectors.js'
import { Button, Card, Field, Input, PageHeader, Select, Textarea } from './ui.jsx'

const STEPS = [
  { id: 'details', label: 'Basic Info' },
  { id: 'specs', label: 'Specifications' },
  { id: 'media', label: 'Media & Photos' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'review', label: 'Review' },
]

const PRODUCT_TYPES = [
  { value: 'uniform', label: 'School / Industrial Uniform' },
  { value: 'schoolwear', label: 'Schoolwear' },
  { value: 'workwear', label: 'Workwear & Industrial' },
  { value: 'safety', label: 'Safety & FR Wear' },
  { value: 'corporate', label: 'Corporate Attire' },
  { value: 'other', label: 'Other' },
]

const UNIFORM_FITS = ['', 'Regular Fit', 'Classic School Fit', 'Athletic Fit', 'Tailored Cut', 'Industrial Workwear Fit', 'Pleated']

function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)
}

function inferSubcategory(product, cats = []) {
  if (!product) return ''
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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Images are picked as data URLs for preview only; on save they are uploaded as files
// named after the product slug and only the returned path/URL is stored.
async function uploadIfDataUrl(src, slug) {
  if (typeof src !== 'string' || !src.startsWith('data:')) return src
  const blob = await (await fetch(src)).blob()
  const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg').replace('+xml', '')
  const res = await apiUpload(new File([blob], `${slug}.${ext}`, { type: blob.type }), slug)
  const url = res?.data?.url
  if (!url) throw new Error('Image upload failed.')
  return url
}

async function filesToDataUrls(fileList) {
  const files = [...fileList].filter((f) => f.type.startsWith('image/'))
  return Promise.all(files.map(readFileAsDataUrl))
}

const blank = (defaultCategory) => ({
  title: '',
  handle: '',
  price: 65,
  compareAt: 85,
  color: 'Navy Blue',
  category: defaultCategory || 'Boys',
  subcategory: '',
  kind: 'uniforms',
  productType: 'uniform',
  material: '65% Polyester, 35% Cotton Twill',
  fit: 'Regular Fit',
  gender: 'Boys',
  sleeve: 'Short Sleeve',
  care: 'Machine wash warm, easy iron',
  occasion: 'School Uniform',
  shortDescription: '',
  description: '',
  sku: '',
  weight: '220 GSM',
  dimensions: 'Standard Sizing',
  collections: 'boys,all-products',
  badges: 'NEW ARRIVAL',
  thumbnail: '',
  gallery: [],
  variants: [
    { size: '28', selected: true, stock: 50 },
    { size: '30', selected: true, stock: 50 },
    { size: '32', selected: true, stock: 50 },
    { size: '34', selected: true, stock: 50 },
  ],
  newSize: '',
})

function getInitialForm(existingProduct, existingVariants, defaultCategory, managedCats) {
  if (!existingProduct) {
    return blank(defaultCategory)
  }

  const variantsList = existingVariants.length
    ? existingVariants.map((v) => ({
        size: v.size,
        selected: true,
        stock: v.stock,
      }))
    : (existingProduct.sizes?.length
        ? existingProduct.sizes.map((s) => ({ size: s, selected: true, stock: 25 }))
        : [{ size: 'One size', selected: true, stock: 25 }])

  const images = existingProduct.images || []
  const thumbnail = images[0] || ''
  const gallery = images.slice(1)

  return {
    title: existingProduct.title || '',
    handle: existingProduct.handle || '',
    price: existingProduct.price ?? 799,
    compareAt: existingProduct.compareAt || existingProduct.price || 1099,
    color: existingProduct.color || '',
    category: existingProduct.category || defaultCategory,
    subcategory: inferSubcategory(existingProduct, managedCats),
    kind: existingProduct.kind || 'lifestyle',
    productType: existingProduct.productType || 'candle',
    material: existingProduct.material || '65% Polyester, 35% Cotton Twill',
    fit: existingProduct.fit || 'Regular Fit',
    gender: existingProduct.gender || 'Boys',
    sleeve: existingProduct.sleeve || 'Short Sleeve',
    care: existingProduct.careInstructions || 'Machine wash warm, easy iron',
    occasion: existingProduct.occasion || 'School Uniform',
    scentTop: existingProduct.scentNotes?.top || '',
    scentMiddle: existingProduct.scentNotes?.middle || '',
    scentBase: existingProduct.scentNotes?.base || '',
    collections: Array.isArray(existingProduct.collections)
      ? existingProduct.collections.join(',')
      : 'new-arrivals,scented-candles',
    badges: Array.isArray(existingProduct.badges)
      ? existingProduct.badges.join(',')
      : 'NEW ARRIVAL',
    thumbnail,
    gallery,
    variants: variantsList,
    newSize: '',
  }
}

export default function ProductNew() {
  const { handle } = useParams()
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const navigate = useNavigate()
  const managedCats = allCategories(state)
  const defaultCategory = categoryNames(state)[0] || 'Scented Candles'

  const isEdit = Boolean(handle)
  const existingProduct = isEdit && handle ? productByHandle(state, handle) : null
  const existingVariants = isEdit && handle ? variantsOf(state, handle) : []

  const [step, setStep] = useState(0)
  const [form, setForm] = useState(() =>
    getInitialForm(existingProduct, existingVariants, defaultCategory, managedCats)
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [imageHits, setImageHits] = useState([])
  const [imageBusy, setImageBusy] = useState(false)
  const [imageMsg, setImageMsg] = useState('')

  useEffect(() => {
    if (isEdit && existingProduct) {
      setForm(getInitialForm(existingProduct, existingVariants, defaultCategory, managedCats))
    }
  }, [isEdit, existingProduct?.handle])

  const set = (k) => (e) => {
    const v = e?.target ? e.target.value : e
    setForm((f) => ({ ...f, [k]: v }))
    setError('')
  }

  const catOptions = useMemo(() => {
    const names = managedCats.filter((c) => c.active !== false).map((c) => c.name)
    if (form.category && !names.includes(form.category)) names.unshift(form.category)
    return names.length ? names : [defaultCategory]
  }, [managedCats, form.category, defaultCategory])

  const subOptions = useMemo(() => {
    const subs = subcategoriesOf({ categories: managedCats }, form.category)
    return [{ value: '', label: '— None —' }, ...subs.map((s) => ({ value: s.slug, label: s.name }))]
  }, [managedCats, form.category])

  const resolvedHandle = form.handle.trim() || slugify(form.title) || 'new-product'

  const selectedVariants = useMemo(
    () => form.variants.filter((v) => v.selected),
    [form.variants]
  )

  const validateStep = () => {
    if (step === 0) {
      if (!form.title.trim()) return 'Enter a product title.'
      if (!form.category) return 'Choose a category.'
      if (!Number(form.price) || Number(form.price) <= 0) return 'Enter a valid price.'
    }
    if (step === 2) {
      if (!form.thumbnail) return 'Upload a thumbnail image.'
    }
    if (step === 3) {
      if (selectedVariants.length === 0) {
        return 'Select at least one variant, or add a new one.'
      }
    }
    return ''
  }

  const next = () => {
    const err = validateStep()
    if (err) {
      setError(err)
      return
    }
    setError('')
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const back = () => {
    setError('')
    setStep((s) => Math.max(s - 1, 0))
  }

  const toggleVariant = (size) => {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v) =>
        v.size === size ? { ...v, selected: !v.selected } : v
      ),
    }))
    setError('')
  }

  const setVariantStock = (size, stock) => {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v) => (v.size === size ? { ...v, stock } : v)),
    }))
  }

  const selectAll = (on) => {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v) => ({ ...v, selected: on })),
    }))
  }

  const addCustomSize = () => {
    const size = form.newSize.trim()
    if (!size) {
      setError('Enter a variant name to add.')
      return
    }
    if (form.variants.some((v) => v.size.toLowerCase() === size.toLowerCase())) {
      setError('That variant already exists — tick its checkbox to include it.')
      return
    }
    setForm((f) => ({
      ...f,
      newSize: '',
      variants: [
        ...f.variants,
        { size, selected: true, stock: f.variants[0]?.stock ?? 25 },
      ],
    }))
    setError('')
  }

  const onThumbnail = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const url = await readFileAsDataUrl(file)
      setForm((f) => ({ ...f, thumbnail: url }))
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  const onGallery = async (e) => {
    const list = e.target.files
    if (!list?.length) return
    setBusy(true)
    try {
      const urls = await filesToDataUrls(list)
      setForm((f) => ({ ...f, gallery: [...f.gallery, ...urls] }))
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  const removeGallery = (idx) => {
    setForm((f) => ({ ...f, gallery: f.gallery.filter((_, i) => i !== idx) }))
  }

  const create = async () => {
    const err = validateStep()
    if (err) {
      setError(err)
      return
    }

    let collections = form.collections
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (form.subcategory && !collections.includes(form.subcategory)) {
      collections = [form.subcategory, ...collections]
    }
    const parent = managedCats.find((c) => c.name === form.category)
    if (parent?.slug && !collections.includes(parent.slug)) {
      collections = [...collections, parent.slug]
    }

    const targetHandle = isEdit ? existingProduct.handle : resolvedHandle
    let images
    setBusy(true)
    setError('')
    try {
      const cache = new Map()
      const upload = async (src) => {
        if (!cache.has(src)) cache.set(src, uploadIfDataUrl(src, targetHandle))
        return cache.get(src)
      }
      images = (
        await Promise.all(
          [form.thumbnail, ...form.gallery.filter((src) => src && src !== form.thumbnail)]
            .filter(Boolean)
            .map(upload)
        )
      ).filter(Boolean)
    } catch (err) {
      setBusy(false)
      setError(err.message || 'Image upload failed. Please try again.')
      return
    }

    const fallback = art('frame', '#F3F4F1', '#C9D3C4', '#4F6B49')
    const price = Number(form.price)
    const compareAt = Number(form.compareAt) || price
    const badges = form.badges
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean)

    const onlyOneSize =
      selectedVariants.length === 1 && selectedVariants[0].size === 'One size'
    const sizesForProduct = onlyOneSize ? [] : selectedVariants.map((v) => v.size)

    const scentNotes =
      form.scentTop || form.scentMiddle || form.scentBase
        ? { top: form.scentTop, middle: form.scentMiddle, base: form.scentBase }
        : undefined

    const product = {
      handle: targetHandle,
      title: form.title.trim(),
      price,
      compareAt,
      discount: compareAt > price ? Math.round((1 - price / compareAt) * 100) : 0,
      color: form.color.trim() || '—',
      category: form.category,
      kind: form.kind || 'lifestyle',
      productType: form.productType || 'candle',
      sizes: sizesForProduct,
      collections,
      badges: badges.length ? badges : ['NEW ARRIVAL'],
      soldOut: false,
      images: images.length ? images : [fallback],
      shortDescription: form.shortDescription || undefined,
      description: form.description || undefined,
      material: form.waxType || form.material || undefined,
      waxType: form.waxType || form.material || undefined,
      scent: form.fragrance || form.scent || undefined,
      fragrance: form.fragrance || form.scent || undefined,
      burnTime: form.burnTime || undefined,
      occasion: form.occasion || undefined,
      sku: form.sku.trim() || undefined,
      weight: form.weight || undefined,
      dimensions: form.dimensions || undefined,
      candleType: form.candleType || undefined,
      scentNotes,
      brand: 'Online Gulf Uniform',
      bestPrice: undefined,
      status: 'active',
    }

    setBusy(true)
    setError('')

    if (isEdit) {
      try {
        const json = await apiPatch(`/products/${encodeURIComponent(targetHandle)}`, { product }, { auth: true })
        const updated = json.data?.product
        dispatch({
          type: 'product/update',
          handle: targetHandle,
          patch: updated ?? product,
          fromApi: true,
        })

        // Sync variants
        for (const v of selectedVariants) {
          const id = `${targetHandle}::${v.size.toLowerCase().replace(/\s+/g, '-')}`
          const existing = (existingVariants || []).find((x) => x.id === id || x.size === v.size)
          if (existing) {
            if (Number(existing.stock) !== Number(v.stock)) {
              try {
                const vPatch = await apiPatch(`/variants/${encodeURIComponent(existing.id)}`, {
                  patch: { stock: Number(v.stock) || 0, price, compareAt }
                }, { auth: true })
                if (vPatch.data?.variant) {
                  dispatch({ type: 'catalog/setVariant', variant: vPatch.data.variant })
                }
              } catch {
                /* ignore */
              }
            }
          } else {
            try {
              const vJson = await apiPost('/variants', {
                variant: {
                  id,
                  productHandle: targetHandle,
                  size: v.size,
                  color: form.color.trim() || '—',
                  sku: `${form.sku.trim() || targetHandle.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)}-${v.size.toUpperCase().replace(/\s+/g, '')}`,
                  price,
                  compareAt,
                  stock: Number(v.stock) || 0,
                  lowStockAt: 8,
                }
              }, { auth: true })
              if (vJson.data?.variant) {
                dispatch({ type: 'catalog/setVariant', variant: vJson.data.variant })
              }
            } catch {
              /* ignore */
            }
          }
        }

        notify(json.message || 'Product updated successfully.')
        navigate('/admin/products', { replace: true })
      } catch (err) {
        setError(err.message || 'Unable to update the product.')
        notify(err.message || 'Unable to update the product.')
      } finally {
        setBusy(false)
      }
      return
    }

    try {
      const json = await apiPost('/products', { product }, { auth: true })
      const created = json.data?.product
      const apiVariants = json.data?.variants ?? []

      dispatch({ type: 'product/create', product: created ?? product, fromApi: true })
      for (const v of apiVariants) {
        dispatch({ type: 'catalog/setVariant', variant: v })
      }

      // If API auto-created one-size but wizard specified stocks, sync variants
      for (const v of selectedVariants) {
        const id = `${targetHandle}::${v.size.toLowerCase().replace(/\s+/g, '-')}`
        const existing = apiVariants.find((x) => x.id === id || x.size === v.size)
        if (!existing) {
          try {
            const vJson = await apiPost(
              '/variants',
              {
                variant: {
                  id,
                  productHandle: targetHandle,
                  size: v.size,
                  color: form.color.trim() || '—',
                  sku: `${form.sku.trim() || targetHandle.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)}-${v.size.toUpperCase().replace(/\s+/g, '')}`,
                  price,
                  compareAt,
                  stock: Number(v.stock) || 0,
                  lowStockAt: 8,
                },
              },
              { auth: true }
            )
            dispatch({ type: 'catalog/setVariant', variant: vJson.data.variant })
          } catch {
            /* ignore duplicate one-size */
          }
        }
      }

      notify(json.message || 'Product created successfully.')
      navigate(`/admin/products/${targetHandle}`, { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to create the product.')
      notify(err.message || 'Unable to create the product.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title={isEdit ? `Edit Product: ${existingProduct?.title || handle}` : 'Add product'}
        sub={
          isEdit
            ? `Update details, photos, variants, and pricing for /products/${handle}`
            : 'Create a new catalogue item with thumbnail and gallery images.'
        }
        action={
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBC8C1] bg-white px-3.5 py-2 text-[12px] font-semibold text-graphite shadow-2xs transition-all hover:border-[#ADA9A0] hover:bg-chalk hover:text-ink active:scale-[0.98]"
          >
            <svg className="h-3.5 w-3.5 text-[#8E8B99]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Cancel</span>
          </Link>
        }
      />

      {/* Modern Sleek Step Navigation */}
      <nav aria-label="Product form steps" className="mb-4 rounded-xl border border-line bg-white p-1.5 shadow-2xs">
        <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {STEPS.map((s, i) => {
            const active = i === step
            const done = i < step
            return (
              <li key={s.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    if (isEdit || i < step) {
                      setError('')
                      setStep(i)
                    }
                  }}
                  className={`group flex w-full items-center justify-center gap-2 rounded-lg py-2.5 px-3 transition-all duration-200 ${
                    active
                      ? 'bg-[#1C1A17] text-white shadow-xs'
                      : done
                        ? 'bg-[#F7F6F3] text-ink hover:bg-[#EFECE6] cursor-pointer'
                        : isEdit
                          ? 'bg-transparent text-graphite hover:bg-[#F7F6F3] hover:text-ink cursor-pointer'
                          : 'bg-transparent text-muted/50 cursor-not-allowed'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold transition-transform group-hover:scale-105 ${
                      active
                        ? 'bg-white text-[#1C1A17] shadow-2xs'
                        : done
                          ? 'bg-[#E4F7EC] text-save'
                          : isEdit
                            ? 'bg-chalk text-graphite border border-line/60'
                            : 'bg-chalk text-muted/60'
                    }`}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  <span className="truncate text-[12px] font-semibold">
                    {s.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <Card>
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-2">
              <Field label="Title">
                <Input
                  value={form.title}
                  onChange={set('title')}
                  placeholder="Product name"
                  autoFocus
                />
              </Field>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <Field label="Handle" hint="Leave blank to auto-generate.">
                <Input
                  value={form.handle}
                  onChange={set('handle')}
                  placeholder={slugify(form.title) || 'auto'}
                />
              </Field>
            </div>
            <Field label="Price (₹)">
              <Input type="number" value={form.price} onChange={set('price')} />
            </Field>
            <Field label="Compare at (₹)">
              <Input type="number" value={form.compareAt} onChange={set('compareAt')} />
            </Field>
            <Field label="SKU" hint="Used as prefix for variants.">
              <Input value={form.sku} onChange={set('sku')} placeholder="EN-VA-220" />
            </Field>
            <Field label="Category">
              <Select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value, subcategory: '' }))
                }
                options={catOptions}
              />
            </Field>
            <Field label="Subcategory">
              <Select value={form.subcategory} onChange={set('subcategory')} options={subOptions} />
            </Field>
            <Field label="Product type">
              <Select
                value={form.productType || 'candle'}
                onChange={(e) =>
                  setForm((f) => ({ ...f, productType: e.target.value, kind: 'lifestyle' }))
                }
                options={PRODUCT_TYPES}
              />
            </Field>
            <Field label="Colour">
              <Input value={form.color} onChange={set('color')} placeholder="Navy / White" />
            </Field>
            <Field label="Badges" hint="Comma separated, e.g. NEW ARRIVAL, BEST SELLER">
              <Input value={form.badges} onChange={set('badges')} />
            </Field>
            <Field label="Collections" hint="Comma separated collection slugs">
              <Input value={form.collections} onChange={set('collections')} />
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Short description">
                <Textarea
                  rows={3}
                  value={form.shortDescription}
                  onChange={set('shortDescription')}
                  placeholder="Warm Vanilla · Amber · Sandalwood"
                />
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Fabric / Material" hint="e.g. 65% Polyester / 35% Cotton Twill, Nomex FR">
              <Input value={form.material} onChange={set('material')} placeholder="65% Poly / 35% Cotton Twill" />
            </Field>
            <Field label="Fit / Cut">
              <Select
                value={form.fit}
                onChange={set('fit')}
                options={UNIFORM_FITS.map((t) => ({ value: t, label: t || '— None —' }))}
              />
            </Field>
            <Field label="Gender / Target Group" hint="e.g. Boys, Girls, Unisex Adults">
              <Input value={form.gender} onChange={set('gender')} placeholder="Boys" />
            </Field>
            <Field label="Sleeve / Length" hint="e.g. Short Sleeve, Long Sleeve, Full Length">
              <Input value={form.sleeve} onChange={set('sleeve')} placeholder="Short Sleeve" />
            </Field>
            <Field label="Fabric Weight / GSM" hint="e.g. 220 GSM">
              <Input value={form.weight} onChange={set('weight')} placeholder="220 GSM" />
            </Field>
            <Field label="Care Instructions" hint="e.g. Machine wash warm, easy iron">
              <Input value={form.care} onChange={set('care')} placeholder="Machine wash warm, easy iron" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Occasion / Work Environment" hint="e.g. School Academic, Oil & Gas Offshore, Kitchen">
                <Input value={form.occasion} onChange={set('occasion')} placeholder="School Uniform / Academic" />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Sizing Standard" hint="e.g. UK / Gulf Standard Size Guide">
                <Input value={form.dimensions} onChange={set('dimensions')} placeholder="Gulf / UK Standard Sizing (Chest/Waist in inches)" />
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-[12px] font-semibold uppercase tracking-wider2 text-muted">
                Thumbnail
              </h3>
              <p className="mt-1 text-[12px] text-muted">
                Main card image — shown first in grids and as the default PDP shot.
              </p>
              <div className="mt-3 aspect-square max-w-[220px] overflow-hidden rounded-lg border border-dashed border-line bg-chalk">
                {form.thumbnail ? (
                  <img src={form.thumbnail} alt="Thumbnail" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center px-4 text-center text-[11px] text-muted">
                    No thumbnail yet
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#CBC8C1] bg-white px-3.5 py-2 text-[12px] font-semibold text-ink shadow-2xs transition-all hover:border-[#ADA9A0] hover:bg-chalk active:scale-[0.98]">
                  <svg className="h-4 w-4 text-[#5D586C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>{form.thumbnail ? 'Replace thumbnail' : 'Upload thumbnail'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={onThumbnail} />
                </label>
                <button
                  type="button"
                  disabled={imageBusy || !form.title.trim()}
                  onClick={async () => {
                    setImageMsg('')
                    setImageBusy(true)
                    try {
                      if (!getUnsplashKey()) {
                        setImageMsg('Set VITE_UNSPLASH_ACCESS_KEY in .env to search Unsplash.')
                        return
                      }
                      const q = buildImageQuery({
                        title: form.title,
                        category: form.category,
                        fragrance: form.fragrance || form.scent,
                        waxType: form.waxType || form.material,
                        productType: form.productType,
                      })
                      const hits = await searchProductImages(q)
                      setImageHits(hits)
                      setImageMsg(hits.length ? `Found ${hits.length} images for “${q}”` : 'No images found')
                    } catch (err) {
                      setImageMsg(err.message || 'Image search failed')
                    } finally {
                      setImageBusy(false)
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D5D2FE] bg-[#F4F3FF] px-3.5 py-2 text-[12px] font-semibold text-[#574BE8] shadow-2xs transition-all hover:border-[#C4C0FE] hover:bg-[#ECE9FE] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {imageBusy ? (
                    <svg className="h-4 w-4 animate-spin text-[#574BE8]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v2.5A5.5 5.5 0 006.5 12H4z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 text-[#574BE8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                  <span>{imageBusy ? 'Searching…' : 'Find product image'}</span>
                </button>
                {form.thumbnail && (
                  <button
                    type="button"
                    onClick={() => set('thumbnail')('')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#FECDCA] bg-[#FEF3F2] px-3.5 py-2 text-[12px] font-semibold text-[#D92D20] shadow-2xs transition-all hover:border-[#FDA29B] hover:bg-[#FEE4E2] active:scale-[0.98]"
                  >
                    <svg className="h-4 w-4 text-[#D92D20]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Remove</span>
                  </button>
                )}
              </div>
              {imageMsg && <p className="mt-2 text-[11px] text-muted">{imageMsg}</p>}
              {imageHits.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {imageHits.map((hit) => (
                    <button
                      key={hit.id}
                      type="button"
                      title={hit.credit}
                      className="aspect-square overflow-hidden rounded-lg border border-line hover:border-ink"
                      onClick={async () => {
                        setImageBusy(true)
                        try {
                          const dataUrl = await imageUrlToDataUrl(hit.url)
                          setForm((f) => ({ ...f, thumbnail: dataUrl }))
                          setImageMsg(`Selected — ${hit.credit}`)
                        } catch (err) {
                          setImageMsg(err.message || 'Could not download image')
                        } finally {
                          setImageBusy(false)
                        }
                      }}
                    >
                      <img src={hit.thumb} alt={hit.alt} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-[12px] font-semibold uppercase tracking-wider2 text-muted">
                Gallery images
              </h3>
              <p className="mt-1 text-[12px] text-muted">
                Extra product shots for the PDP gallery (hover scrub on cards).
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                {form.gallery.map((src, i) => (
                  <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-line bg-chalk shadow-2xs">
                    <img src={src} alt="" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
                    <button
                      type="button"
                      onClick={() => removeGallery(i)}
                      title="Remove image"
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-xs opacity-0 backdrop-blur-xs transition-all duration-150 hover:bg-red-600 hover:text-white group-hover:opacity-100 active:scale-95"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <label className="group flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#CBC8C1] bg-[#FAF9F5] p-2 text-center transition-all hover:border-forest hover:bg-[#F3F6F2] active:scale-[0.98]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#DCD8CF] bg-white shadow-2xs transition-transform group-hover:scale-110 group-hover:border-forest/40">
                    <svg className="h-4 w-4 text-graphite transition-colors group-hover:text-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="mt-1.5 text-[11px] font-semibold text-graphite transition-colors group-hover:text-forest">Add images</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={onGallery} />
                </label>
              </div>
              {form.gallery.length > 0 && (
                <p className="mt-2 text-[11px] text-muted">{form.gallery.length} gallery image(s)</p>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-[12px] font-semibold uppercase tracking-wider2 text-muted">
                  Variants & Stocks
                </h3>
                <p className="mt-1 text-[12px] text-muted">
                  Select available sizes / weights and assign their current opening inventory.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => selectAll(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBC8C1] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-ink shadow-2xs transition-all hover:border-[#ADA9A0] hover:bg-chalk active:scale-[0.98]"
                >
                  <svg className="h-3.5 w-3.5 text-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Select all</span>
                </button>
                <button
                  type="button"
                  onClick={() => selectAll(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBC8C1] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-graphite shadow-2xs transition-all hover:border-[#ADA9A0] hover:bg-chalk hover:text-ink active:scale-[0.98]"
                >
                  <svg className="h-3.5 w-3.5 text-[#8E8B99]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Clear</span>
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-line">
              <div className="grid grid-cols-[auto_1fr_120px] gap-3 border-b border-line bg-chalk px-3 py-2 text-[10px] font-semibold uppercase tracking-wider2 text-muted sm:px-4">
                <span>Sell</span>
                <span>Variant</span>
                <span>Stock</span>
              </div>
              <ul>
                {form.variants.map((v) => (
                  <li
                    key={v.size}
                    className="grid grid-cols-[auto_1fr_120px] items-center gap-3 border-b border-line/70 px-3 py-2.5 last:border-0 sm:px-4"
                  >
                    <label className="flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={v.selected}
                        onChange={() => toggleVariant(v.size)}
                        className="h-4 w-4 accent-forest"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleVariant(v.size)}
                      className={`text-left text-[13px] ${
                        v.selected ? 'text-ink font-medium' : 'text-muted'
                      }`}
                    >
                      {v.size}
                    </button>
                    <Input
                      type="number"
                      value={v.stock}
                      disabled={!v.selected}
                      onChange={(e) => setVariantStock(v.size, e.target.value)}
                      className="!py-1.5 !text-[12px]"
                    />
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-dashed border-line p-3 sm:p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider2 text-muted">
                Add custom variant size
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Input
                  value={form.newSize}
                  onChange={set('newSize')}
                  placeholder="e.g. 220g, 450g, Set of 3…"
                  className="min-w-0 flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addCustomSize()
                    }
                  }}
                />
                <Button onClick={addCustomSize}>+ Add variant</Button>
              </div>
            </div>

            <p className="text-[12px] text-muted">
              {selectedVariants.length} variant{selectedVariants.length === 1 ? '' : 's'} selected
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-5 lg:grid-cols-[180px_1fr]">
            <div className="aspect-[3/4] overflow-hidden rounded-lg bg-chalk">
              {form.thumbnail ? (
                <img src={form.thumbnail} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-[11px] text-muted">No image</div>
              )}
            </div>
            <dl className="space-y-3 text-[13px]">
              <div>
                <dt className="text-[10.5px] font-bold uppercase tracking-normal text-graphite">Title & Handle</dt>
                <dd className="mt-0.5 font-semibold text-ink">{form.title || '—'}</dd>
                <dd className="font-mono text-[11.5px] text-muted">/{resolvedHandle}</dd>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <dt className="text-[10.5px] font-bold uppercase tracking-normal text-graphite">Price</dt>
                  <dd className="mt-0.5 font-bold text-ink">₹{form.price}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-bold uppercase tracking-normal text-graphite">Compare at</dt>
                  <dd className="mt-0.5 text-muted">₹{form.compareAt}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-bold uppercase tracking-normal text-graphite">Category</dt>
                  <dd className="mt-0.5 font-medium text-ink">{form.category}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-bold uppercase tracking-normal text-graphite">Style</dt>
                  <dd className="mt-0.5 text-ink">{form.candleType || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-bold uppercase tracking-normal text-graphite">Wax / Material</dt>
                  <dd className="mt-0.5 text-ink">{form.waxType || form.material || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-bold uppercase tracking-normal text-graphite">Fragrance</dt>
                  <dd className="mt-0.5 text-ink">{form.fragrance || form.scent || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-bold uppercase tracking-normal text-graphite">Burn Time</dt>
                  <dd className="mt-0.5 text-ink">{form.burnTime || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-bold uppercase tracking-normal text-graphite">Photos</dt>
                  <dd className="mt-0.5 text-ink">{form.thumbnail ? 1 : 0} thumb · {form.gallery.length} gallery</dd>
                </div>
              </div>
              <div>
                <dt className="text-[10.5px] font-bold uppercase tracking-normal text-graphite">Selected Variants</dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {selectedVariants.map((v) => (
                    <span
                      key={v.size}
                      className="rounded-md border border-line bg-chalk px-2.5 py-1 text-[11px] font-medium text-ink"
                    >
                      {v.size} · {v.stock} pcs in stock
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-[#FDE8E8] px-3 py-2 text-[12px] text-sale" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          <Button
            variant="ghost"
            onClick={back}
            disabled={step === 0 || busy}
            className="inline-flex items-center gap-2 !border-[#CBC8C1] !bg-white !px-4 !py-2.5 !text-[12.5px] !font-semibold text-ink shadow-2xs transition-all hover:!border-[#ADA9A0] hover:!bg-chalk active:scale-[0.98] disabled:opacity-40"
          >
            <svg className="h-4 w-4 text-graphite" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back</span>
          </Button>
          <div className="flex gap-2">
            {step < STEPS.length - 1 ? (
              <Button
                onClick={next}
                disabled={busy}
                className="inline-flex items-center gap-2 !bg-[#1E293B] !px-5 !py-2.5 !text-[12.5px] !font-semibold text-white shadow-xs transition-all hover:!bg-black active:scale-[0.98]"
              >
                <span>Continue</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Button>
            ) : (
              <Button
                onClick={create}
                disabled={busy}
                loading={busy}
                loadingText={isEdit ? 'Saving changes...' : 'Creating...'}
                className="inline-flex items-center gap-2 !bg-forest !px-5 !py-2.5 !text-[12.5px] !font-semibold text-white shadow-xs transition-all hover:!bg-[#15341e] active:scale-[0.98]"
              >
                {!busy && (
                  <svg className="h-4 w-4 text-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                <span>{isEdit ? 'Save changes' : 'Create product'}</span>
              </Button>
            )}
          </div>
        </div>
      </Card>
    </>
  )
}
