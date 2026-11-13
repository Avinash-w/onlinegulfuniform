import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { allCategories, productsInCategory } from '../store/selectors.js'
import { apiPost, apiPut, apiDelete } from '../lib/api.js'
import { Badge, Button, Card, ConfirmModal, Field, Input, Modal, PageHeader } from './ui.jsx'
import { ChevronDown } from '../components/icons'

const slugify = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export default function Categories() {
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const categories = allCategories(state)
  const [openId, setOpenId] = useState(categories[0]?.id ?? null)
  const [catModal, setCatModal] = useState(null) // null | 'new' | category
  const [subModal, setSubModal] = useState(null) // null | { categoryId, sub?: subcategory }
  const [deletingItem, setDeletingItem] = useState(null) // null | { type: 'category' | 'subcategory', item }
  const [busyKey, setBusyKey] = useState(null)
  const [saving, setSaving] = useState(false)

  const totals = useMemo(() => {
    const cats = categories.length
    const subs = categories.reduce((n, c) => n + (c.children?.length ?? 0), 0)
    return { cats, subs }
  }, [categories])

  const applyCategories = (json) => {
    dispatch({ type: 'catalog/setCategories', categories: json.data.categories })
  }

  const run = async (key, fn, fallbackMsg) => {
    if (busyKey || saving) return
    setBusyKey(key)
    try {
      const json = await fn()
      applyCategories(json)
      notify(json.message || fallbackMsg)
    } catch (err) {
      notify(err.message || 'Request failed.')
    } finally {
      setBusyKey(null)
    }
  }

  const saveCategory = async (payload) => {
    if (saving) return
    setSaving(true)
    try {
      const isNew = catModal === 'new'
      const json = isNew
        ? await apiPost(
            '/categories',
            { id: uid('cat'), active: true, ...payload },
            { auth: true }
          )
        : await apiPut(`/categories/${encodeURIComponent(catModal.id)}`, payload, { auth: true })
      applyCategories(json)
      notify(json.message || (isNew ? 'Category created successfully.' : 'Category updated successfully.'))
      setCatModal(null)
    } catch (err) {
      notify(err.message || 'Unable to save category.')
    } finally {
      setSaving(false)
    }
  }

  const saveSubcategory = async (payload) => {
    if (saving || !subModal) return
    setSaving(true)
    try {
      const isNew = !subModal.sub
      const json = isNew
        ? await apiPost(
            '/subcategories',
            {
              categoryId: subModal.categoryId,
              id: uid('sub'),
              active: true,
              ...payload,
            },
            { auth: true }
          )
        : await apiPut(`/subcategories/${encodeURIComponent(subModal.sub.id)}`, payload, {
            auth: true,
          })
      applyCategories(json)
      notify(
        json.message ||
          (isNew ? 'Subcategory created successfully.' : 'Subcategory updated successfully.')
      )
      setSubModal(null)
    } catch (err) {
      notify(err.message || 'Unable to save subcategory.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deletingItem || busyKey) return
    const { type, item } = deletingItem
    if (type === 'category') {
      await run(
        `cat-del-${item.id}`,
        () => apiDelete(`/categories/${encodeURIComponent(item.id)}`, { auth: true }),
        'Category deleted successfully.'
      )
    } else {
      await run(
        `sub-del-${item.id}`,
        () =>
          apiDelete(`/subcategories/${encodeURIComponent(item.id)}`, {
            auth: true,
          }),
        'Subcategory deleted successfully.'
      )
    }
    setDeletingItem(null)
  }

  return (
    <>
      <PageHeader
        title="Categories"
        sub={`${totals.cats} categories · ${totals.subs} subcategories — drives storefront navigation.`}
        action={<Button onClick={() => setCatModal('new')}>+ New category</Button>}
      />

      <div className="space-y-3">
        {categories.length === 0 && (
          <Card>
            <p className="py-10 text-center text-[13px] text-muted">
              No categories yet. Create one to start organising the catalogue.
            </p>
          </Card>
        )}

        {categories.map((cat, index) => {
          const expanded = openId === cat.id
          const productCount = productsInCategory(state, { name: cat.name, slug: cat.slug })
          const subs = cat.children ?? []

          return (
            <Card key={cat.id} className="!overflow-visible">
              <div className="-m-3 sm:-m-4">
                <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-3 sm:px-4">
                  <button
                    type="button"
                    onClick={() => setOpenId(expanded ? null : cat.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    aria-expanded={expanded}
                  >
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">{cat.name}</p>
                      <p className="truncate font-mono text-[10px] text-muted">/{cat.slug}</p>
                    </div>
                  </button>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={cat.active !== false ? 'Active' : 'Blocked'}>
                      {cat.active !== false ? 'Active' : 'Hidden'}
                    </Badge>
                    <span className="rounded-full bg-chalk px-2 py-1 text-[10px] text-muted">
                      {subs.length} sub · {productCount} products
                    </span>
                    <Button
                      variant="ghost"
                      className="!px-2.5 !py-1.5"
                      disabled={index === 0 || Boolean(busyKey)}
                      loading={busyKey === `cat-up-${cat.id}`}
                      onClick={() =>
                        run(
                          `cat-up-${cat.id}`,
                          () =>
                            apiPost(
                              `/categories/${encodeURIComponent(cat.id)}/move`,
                              { delta: -1 },
                              { auth: true }
                            ),
                          'Category order updated.'
                        )
                      }
                      aria-label="Move up"
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      className="!px-2.5 !py-1.5"
                      disabled={index === categories.length - 1 || Boolean(busyKey)}
                      loading={busyKey === `cat-down-${cat.id}`}
                      onClick={() =>
                        run(
                          `cat-down-${cat.id}`,
                          () =>
                            apiPost(
                              `/categories/${encodeURIComponent(cat.id)}/move`,
                              { delta: 1 },
                              { auth: true }
                            ),
                          'Category order updated.'
                        )
                      }
                      aria-label="Move down"
                    >
                      ↓
                    </Button>
                    <Button variant="ghost" className="!px-2.5 !py-1.5" onClick={() => setCatModal(cat)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      className="!px-2.5 !py-1.5"
                      disabled={Boolean(busyKey)}
                      loading={busyKey === `cat-toggle-${cat.id}`}
                      onClick={() =>
                        run(
                          `cat-toggle-${cat.id}`,
                          () =>
                            apiPut(
                              `/categories/${encodeURIComponent(cat.id)}`,
                              { active: cat.active === false },
                              { auth: true }
                            ),
                          'Category updated successfully.'
                        )
                      }
                    >
                      {cat.active === false ? 'Show' : 'Hide'}
                    </Button>
                    <Button
                      variant="danger"
                      className="!px-2.5 !py-1.5"
                      disabled={Boolean(busyKey)}
                      loading={busyKey === `cat-del-${cat.id}`}
                      loadingText="Deleting..."
                      onClick={() => setDeletingItem({ type: 'category', item: cat })}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {expanded && (
                  <div className="px-3 py-3 sm:px-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] uppercase tracking-wider2 text-muted">Subcategories</p>
                      <Button
                        variant="lime"
                        className="!px-3 !py-1.5"
                        onClick={() => setSubModal({ categoryId: cat.id })}
                      >
                        + Add subcategory
                      </Button>
                    </div>

                    {subs.length === 0 ? (
                      <p className="rounded-lg bg-chalk px-3 py-6 text-center text-[12px] text-muted">
                        No subcategories. Add one, or leave empty for a single top-level link.
                      </p>
                    ) : (
                      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
                        {subs.map((sub, si) => {
                          const count = productsInCategory(state, { slug: sub.slug })
                          return (
                            <li
                              key={sub.id}
                              className="flex flex-wrap items-center gap-2 bg-white px-3 py-2.5 sm:px-3.5"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-[12px] font-medium">{sub.name}</p>
                                <Link
                                  to={`/collections/${sub.slug}`}
                                  className="font-mono text-[10px] text-muted underline underline-offset-2"
                                >
                                  /collections/{sub.slug}
                                </Link>
                              </div>
                              <Badge tone={sub.active !== false ? 'Active' : 'Blocked'}>
                                {sub.active !== false ? 'Active' : 'Hidden'}
                              </Badge>
                              <span className="text-[10px] text-muted">{count} products</span>
                              <Button
                                variant="ghost"
                                className="!px-2 !py-1"
                                disabled={si === 0 || Boolean(busyKey)}
                                loading={busyKey === `sub-up-${sub.id}`}
                                onClick={() =>
                                  run(
                                    `sub-up-${sub.id}`,
                                    () =>
                                      apiPost(
                                        `/subcategories/${encodeURIComponent(sub.id)}/move`,
                                        { delta: -1 },
                                        { auth: true }
                                      ),
                                    'Subcategory order updated.'
                                  )
                                }
                              >
                                ↑
                              </Button>
                              <Button
                                variant="ghost"
                                className="!px-2 !py-1"
                                disabled={si === subs.length - 1 || Boolean(busyKey)}
                                loading={busyKey === `sub-down-${sub.id}`}
                                onClick={() =>
                                  run(
                                    `sub-down-${sub.id}`,
                                    () =>
                                      apiPost(
                                        `/subcategories/${encodeURIComponent(sub.id)}/move`,
                                        { delta: 1 },
                                        { auth: true }
                                      ),
                                    'Subcategory order updated.'
                                  )
                                }
                              >
                                ↓
                              </Button>
                              <Button
                                variant="ghost"
                                className="!px-2.5 !py-1"
                                onClick={() => setSubModal({ categoryId: cat.id, sub })}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                className="!px-2.5 !py-1"
                                disabled={Boolean(busyKey)}
                                loading={busyKey === `sub-toggle-${sub.id}`}
                                onClick={() =>
                                  run(
                                    `sub-toggle-${sub.id}`,
                                    () =>
                                      apiPut(
                                        `/subcategories/${encodeURIComponent(sub.id)}`,
                                        { active: sub.active === false },
                                        { auth: true }
                                      ),
                                    'Subcategory updated successfully.'
                                  )
                                }
                              >
                                {sub.active === false ? 'Show' : 'Hide'}
                              </Button>
                              <Button
                                variant="danger"
                                className="!px-2.5 !py-1"
                                disabled={Boolean(busyKey)}
                                loading={busyKey === `sub-del-${sub.id}`}
                                loadingText="Deleting..."
                                onClick={() => setDeletingItem({ type: 'subcategory', item: sub })}
                              >
                                Delete
                              </Button>
                            </li>
                          )
                        })}
                      </ul>
                    )}

                    <p className="mt-3 text-[11px] text-muted">
                      Storefront link:{' '}
                      <Link to={`/collections/${cat.slug}`} className="underline underline-offset-2">
                        /collections/{cat.slug}
                      </Link>
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {catModal && (
        <CategoryModal
          initial={catModal === 'new' ? null : catModal}
          onClose={() => !saving && setCatModal(null)}
          onSave={saveCategory}
          saving={saving}
        />
      )}

      {subModal && (
        <SubcategoryModal
          initial={subModal.sub ?? null}
          onClose={() => !saving && setSubModal(null)}
          onSave={saveSubcategory}
          saving={saving}
        />
      )}

      <ConfirmModal
        open={Boolean(deletingItem)}
        onClose={() => !busyKey && setDeletingItem(null)}
        onConfirm={confirmDelete}
        loading={Boolean(busyKey)}
        loadingText="Deleting..."
        title={
          deletingItem?.type === 'category'
            ? `Delete category “${deletingItem?.item?.name}”?`
            : `Delete subcategory “${deletingItem?.item?.name}”?`
        }
        message={
          deletingItem?.type === 'category'
            ? `Are you sure you want to delete category “${deletingItem?.item?.name}” and all of its subcategories? Products assigned to this category will need to be recategorised.`
            : `Are you sure you want to delete subcategory “${deletingItem?.item?.name}”? Products linked to this subcategory will no longer be filterable under it.`
        }
        confirmText={deletingItem?.type === 'category' ? 'Delete category' : 'Delete subcategory'}
        tone="danger"
      />
    </>
  )
}

function CategoryModal({ initial, onClose, onSave, saving }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(initial))

  return (
    <Modal open onClose={onClose} title={initial ? 'Edit category' : 'New category'}>
      <div className="grid gap-4">
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => {
              const v = e.target.value
              setName(v)
              if (!slugTouched) setSlug(slugify(v))
            }}
            placeholder="e.g. SCENTED CANDLES"
          />
        </Field>
        <Field label="Slug" hint="Used in /collections/{slug}">
          <Input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true)
              setSlug(slugify(e.target.value))
            }}
            placeholder="scented-candles"
          />
        </Field>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          disabled={!name.trim() || !slug.trim() || saving}
          loading={saving}
          loadingText={initial ? 'Saving...' : 'Creating...'}
          onClick={() => onSave({ name: name.trim(), slug })}
        >
          {initial ? 'Save' : 'Create category'}
        </Button>
      </div>
    </Modal>
  )
}

function SubcategoryModal({ initial, onClose, onSave, saving }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(initial))

  return (
    <Modal open onClose={onClose} title={initial ? 'Edit subcategory' : 'New subcategory'}>
      <div className="grid gap-4">
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => {
              const v = e.target.value
              setName(v)
              if (!slugTouched) setSlug(slugify(v))
            }}
            placeholder="e.g. Floral Candles"
          />
        </Field>
        <Field label="Slug" hint="Collection URL path under /collections/">
          <Input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true)
              setSlug(slugify(e.target.value))
            }}
            placeholder="floral-candles"
          />
        </Field>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          disabled={!name.trim() || !slug.trim() || saving}
          loading={saving}
          loadingText={initial ? 'Saving...' : 'Creating...'}
          onClick={() => onSave({ name: name.trim(), slug })}
        >
          {initial ? 'Save' : 'Create subcategory'}
        </Button>
      </div>
    </Modal>
  )
}
