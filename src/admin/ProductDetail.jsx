import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Img from '../components/Img'
import { useCart } from '../context/CartContext.jsx'
import { apiDelete, apiPatch, apiPost } from '../lib/api.js'
import { useStore, inr } from '../store/StoreContext.jsx'
import { productByHandle, variantsOf } from '../store/selectors.js'
import {
  Badge, Button, Card, ConfirmModal, Field, Input, Modal, PageHeader, Table, Td, Tr,
} from './ui.jsx'

/** Variant matrix for one product — SKU, price and stock per sellable unit. */
export default function ProductDetail() {
  const { handle } = useParams()
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const product = productByHandle(state, handle)
  const variants = variantsOf(state, handle)
  const [adding, setAdding] = useState(false)
  const [addingBusy, setAddingBusy] = useState(false)
  const [deletingVariant, setDeletingVariant] = useState(null)
  const [deletingBusy, setDeletingBusy] = useState(false)

  if (!state.catalogReady) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-forest border-t-transparent" />
          <p className="mt-3 text-[13px] font-medium text-graphite">Loading product data...</p>
        </div>
      </Card>
    )
  }

  if (!product) {
    return (
      <Card>
        <p className="py-10 text-center text-muted">
          No product with handle “{handle}”.{' '}
          <Link to="/admin/products" className="underline">Back to products</Link>
        </p>
      </Card>
    )
  }

  const addVariant = async (variant) => {
    if (addingBusy) return
    setAddingBusy(true)
    try {
      const json = await apiPost('/variants', { variant }, { auth: true })
      dispatch({ type: 'catalog/setVariant', variant: json.data.variant })
      notify(json.message || 'Variant created successfully.')
      setAdding(false)
    } catch (err) {
      notify(err.message || 'Unable to create variant.')
    } finally {
      setAddingBusy(false)
    }
  }

  const confirmDeleteVariant = async () => {
    if (!deletingVariant || deletingBusy) return
    const v = deletingVariant
    setDeletingBusy(true)
    try {
      const json = await apiDelete(`/variants/${encodeURIComponent(v.id)}`, { auth: true })
      dispatch({ type: 'catalog/removeVariant', id: v.id })
      notify(json.message || 'Variant deleted successfully.')
      setDeletingVariant(null)
    } catch (err) {
      notify(err.message || 'Unable to delete variant.')
    } finally {
      setDeletingBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title={product.title}
        sub={`${product.handle} · ${product.category} · ${variants.length} variants`}
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link
              to={`/admin/products/${product.handle}/edit`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#4849E8] px-3.5 py-2 text-[12px] font-semibold text-white shadow-xs hover:bg-[#3839D6] transition-all"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Edit product</span>
            </Link>
            <Link to={`/products/${product.handle}`} className="rounded-lg border border-line px-3.5 py-2 text-center text-[12px] font-semibold hover:bg-chalk transition-colors">
              View on store
            </Link>
            <Button onClick={() => setAdding(true)} className="w-full sm:w-auto">+ Add variant</Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Card title="Media">
          <div className="grid grid-cols-2 gap-2">
            {product.images.map((src, i) => (
              <div key={i} className="aspect-[3/4] overflow-hidden rounded bg-chalk">
                <Img src={src} alt="" width={200} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
          <dl className="mt-4 space-y-1.5 text-[11px]">
            <div className="flex justify-between"><dt className="text-muted">Price</dt><dd className="font-semibold">{inr(product.price)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Compare at</dt><dd>{inr(product.compareAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Colour</dt><dd>{product.color}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Category</dt><dd>{product.category}</dd></div>
            {product.subcategory && (
              <div className="flex justify-between"><dt className="text-muted">Subcategory</dt><dd>{product.subcategory}</dd></div>
            )}
            {product.material && (
              <div className="flex justify-between"><dt className="text-muted">Fabric / Material</dt><dd>{product.material}</dd></div>
            )}
            {product.fit && (
              <div className="flex justify-between"><dt className="text-muted">Fit / Cut</dt><dd>{product.fit}</dd></div>
            )}
            {product.gender && (
              <div className="flex justify-between"><dt className="text-muted">Gender</dt><dd>{product.gender}</dd></div>
            )}
            {product.weight && (
              <div className="flex justify-between"><dt className="text-muted">Fabric Weight</dt><dd>{product.weight}</dd></div>
            )}
            {product.careInstructions && (
              <div className="flex justify-between"><dt className="text-muted">Care</dt><dd>{product.careInstructions}</dd></div>
            )}
          </dl>
        </Card>

        <Card title="Variants">
          <Table
            head={['SKU', 'Size', 'Colour', 'Price', 'Stock', { label: '', align: 'right' }]}
            empty="No variants — add one to make this sellable."
          >
            {variants.map((v) => (
              <VariantRow
                key={v.id}
                v={v}
                dispatch={dispatch}
                notify={notify}
                isDeleting={deletingBusy && deletingVariant?.id === v.id}
                onDelete={setDeletingVariant}
              />
            ))}
          </Table>
        </Card>
      </div>

      {adding && (
        <AddVariant
          product={product}
          busy={addingBusy}
          onClose={() => !addingBusy && setAdding(false)}
          onAdd={addVariant}
        />
      )}

      <ConfirmModal
        open={Boolean(deletingVariant)}
        onClose={() => !deletingBusy && setDeletingVariant(null)}
        onConfirm={confirmDeleteVariant}
        loading={deletingBusy}
        loadingText="Deleting variant..."
        title={`Delete variant “${deletingVariant?.sku || ''}”?`}
        message={`Are you sure you want to delete SKU “${deletingVariant?.sku}” (${deletingVariant?.size})? This unit will no longer be purchasable.`}
        confirmText="Delete variant"
        tone="danger"
      />
    </>
  )
}

function VariantRow({ v, dispatch, notify, isDeleting, onDelete }) {
  const [price, setPrice] = useState(v.price)
  const [stock, setStock] = useState(v.stock)
  const [busy, setBusy] = useState(null)
  const dirty = Number(price) !== v.price || Number(stock) !== v.stock

  const save = async () => {
    if (busy) return
    setBusy('save')
    try {
      const json = await apiPatch(
        `/variants/${encodeURIComponent(v.id)}`,
        { patch: { price: Number(price), stock: Math.max(0, Number(stock)) } },
        { auth: true }
      )
      dispatch({ type: 'catalog/setVariant', variant: json.data.variant })
      notify(json.message || 'Variant updated successfully.')
    } catch (err) {
      notify(err.message || 'Unable to save variant.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Tr>
      <Td className="font-mono text-[11px]">{v.sku}</Td>
      <Td>{v.size}</Td>
      <Td>{v.color}</Td>
      <Td>
        <Input
          type="number"
          value={price}
          disabled={!!busy || isDeleting}
          onChange={(e) => setPrice(e.target.value)}
          className="!w-24 !py-1.5 !text-[12px]"
        />
      </Td>
      <Td>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            value={stock}
            disabled={!!busy || isDeleting}
            onChange={(e) => setStock(e.target.value)}
            className="!w-20 !py-1.5 !text-[12px]"
          />
          {v.stock === 0 ? <Badge tone="Cancelled">Out</Badge>
            : v.stock <= v.lowStockAt ? <Badge tone="Pending">Low</Badge> : null}
        </div>
      </Td>
      <Td align="right">
        <div className="flex justify-end gap-1.5">
          <Button
            variant={dirty ? 'primary' : 'ghost'}
            disabled={!dirty || isDeleting}
            className="!px-3 !py-1.5"
            loading={busy === 'save'}
            loadingText="Saving..."
            onClick={save}
          >
            Save
          </Button>
          <Button
            variant="danger"
            className="!px-3 !py-1.5"
            loading={isDeleting}
            loadingText="Deleting..."
            onClick={() => onDelete(v)}
          >
            Delete
          </Button>
        </div>
      </Td>
    </Tr>
  )
}

function AddVariant({ product, onClose, onAdd, busy }) {
  const [size, setSize] = useState('')
  const [color, setColor] = useState(product.color ?? '')
  const [price, setPrice] = useState(product.price)
  const [stock, setStock] = useState(0)

  const submit = () => {
    const id = `${product.handle}::${size.toLowerCase().replace(/\s+/g, '-') || 'one-size'}`
    onAdd({
      id,
      productHandle: product.handle,
      size: size || 'One size',
      color: color || '—',
      sku: `${product.handle.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)}-${(size || 'OS').toUpperCase()}`,
      price: Number(price),
      compareAt: product.compareAt,
      stock: Math.max(0, Number(stock)),
      lowStockAt: 8,
    })
  }

  return (
    <Modal open onClose={onClose} title="Add variant">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Size / Weight" hint="Blank = One size"><Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. 220g" disabled={busy} /></Field>
        <Field label="Colour"><Input value={color} onChange={(e) => setColor(e.target.value)} disabled={busy} /></Field>
        <Field label="Price (₹)"><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} disabled={busy} /></Field>
        <Field label="Opening stock"><Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} disabled={busy} /></Field>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button onClick={submit} loading={busy} loadingText="Creating...">Add variant</Button>
      </div>
    </Modal>
  )
}
