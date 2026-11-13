import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { storefrontContent } from '../store/selectors.js'
import { apiPatch } from '../lib/api.js'
import { Button, Card, ConfirmModal, Field, Input, PageHeader, Textarea } from './ui.jsx'

export default function PagesAdmin() {
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const content = storefrontContent(state)
  const [pages, setPages] = useState(content.pages ?? [])
  const [activeId, setActiveId] = useState(pages[0]?.id ?? null)
  const [saving, setSaving] = useState(false)
  const [deletingPage, setDeletingPage] = useState(null)

  useEffect(() => {
    const list = content.pages ?? []
    setPages(list)
    if (!activeId && list.length > 0) {
      setActiveId(list[0].id)
    }
  }, [JSON.stringify(content.pages)])

  const active = pages.find((p) => p.id === activeId) ?? pages[0] ?? null

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      const json = await apiPatch('/content', { section: 'pages', value: pages }, { auth: true })
      dispatch({ type: 'catalog/setContent', content: json.data.content })
      setPages(json.data.content.pages ?? pages)
      notify(json.message || 'Pages saved.')
    } catch (err) {
      notify(err.message || 'Unable to save pages.')
    } finally {
      setSaving(false)
    }
  }

  const updateActive = (patch) => {
    if (!active) return
    setPages((rows) => rows.map((p) => (p.id === active.id ? { ...p, ...patch } : p)))
  }

  return (
    <>
      <PageHeader
        title="Pages"
        sub="About, policies, candle care and other static storefront pages."
        action={
          <Button onClick={save} loading={saving} loadingText="Saving..." disabled={saving}>
            Save pages
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <Card title="All pages">
          <ul className="space-y-1">
            {pages.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(p.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-[13px] ${
                    p.id === active?.id ? 'bg-ink text-white' : 'hover:bg-chalk'
                  }`}
                >
                  <span className="block font-medium">{p.title}</span>
                  <span className="block truncate text-[11px] opacity-70">{p.path}</span>
                </button>
              </li>
            ))}
          </ul>
          <Button
            variant="ghost"
            className="mt-3 w-full"
            onClick={() => {
              const id = `page-${Date.now()}`
              const row = {
                id,
                path: '/pages/new-page',
                title: 'New page',
                body: '',
              }
              setPages((rows) => [...rows, row])
              setActiveId(id)
            }}
          >
            + Add page
          </Button>
        </Card>

        {active ? (
          <Card
            title="Edit page"
            action={
              <div className="flex gap-2">
                <Link
                  to={active.path}
                  target="_blank"
                  className="text-[12px] underline underline-offset-2"
                >
                  Preview
                </Link>
                <Button
                  variant="danger"
                  className="!px-2.5 !py-1.5"
                  onClick={() => setDeletingPage(active)}
                >
                  Delete
                </Button>
              </div>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title">
                <Input
                  value={active.title || ''}
                  onChange={(e) => updateActive({ title: e.target.value })}
                />
              </Field>
              <Field label="Path">
                <Input
                  value={active.path || ''}
                  onChange={(e) => updateActive({ path: e.target.value })}
                  placeholder="/pages/about-us"
                />
              </Field>
              <Field label="Body (blank line = new paragraph)" className="sm:col-span-2">
                <Textarea
                  rows={14}
                  value={active.body || ''}
                  onChange={(e) => updateActive({ body: e.target.value })}
                />
              </Field>
            </div>
          </Card>
        ) : (
          <Card title="Edit page">
            <p className="text-[13px] text-muted">Select or add a page.</p>
          </Card>
        )}
      </div>

      <ConfirmModal
        open={Boolean(deletingPage)}
        onClose={() => !saving && setDeletingPage(null)}
        loading={saving}
        loadingText="Deleting page..."
        onConfirm={async () => {
          if (!deletingPage) return
          const nextPages = pages.filter((p) => p.id !== deletingPage.id)
          setSaving(true)
          try {
            const json = await apiPatch('/content', { section: 'pages', value: nextPages }, { auth: true })
            dispatch({ type: 'catalog/setContent', content: json.data.content })
            setPages(json.data.content.pages ?? nextPages)
            if (activeId === deletingPage.id) {
              setActiveId(nextPages[0]?.id ?? null)
            }
            notify(`Page "${deletingPage.title}" deleted and database updated.`)
            setDeletingPage(null)
          } catch (err) {
            notify(err.message || 'Unable to delete page from database.')
          } finally {
            setSaving(false)
          }
        }}
        title={`Delete page “${deletingPage?.title || ''}”?`}
        message={`Are you sure you want to permanently delete page “${deletingPage?.title}” (${deletingPage?.path})?`}
        confirmText="Delete page"
        tone="danger"
      />
    </>
  )
}
