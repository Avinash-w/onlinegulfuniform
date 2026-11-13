import { useLocation } from 'react-router-dom'
import Seo from '../components/Seo'
import { useStore } from '../store/StoreContext.jsx'
import { pageByPath } from '../store/selectors.js'

/** CMS-driven static / policy page. Body is plain text; blank lines become paragraphs. */
export default function CmsPage() {
  const { pathname } = useLocation()
  const { state } = useStore()
  const page = pageByPath(state, pathname)
  const title =
    page?.title ||
    pathname
      .split('/')
      .filter(Boolean)
      .pop()
      ?.replace(/-/g, ' ')
      .replace(/\b\w/g, (m) => m.toUpperCase()) ||
    'Page'
  const paragraphs = (page?.body || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  const excerpt = paragraphs[0]
    ? paragraphs[0].slice(0, 155) + '...'
    : `Read about ${title} at EvaraNest — Luxury Handmade Candles & Home Fragrance.`

  return (
    <div className="container max-w-3xl py-16 md:py-24">
      <Seo
        title={title}
        description={excerpt}
        canonical={pathname}
      />
      <h1 className="font-display text-[28px] uppercase md:text-[40px]">{title}</h1>
      {paragraphs.length ? (
        <div className="mt-8 space-y-4 text-[14px] leading-relaxed text-graphite md:text-[15px]">
          {paragraphs.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-[13px] text-muted">
          This page has no content yet. Add it under Admin → Storefront → Pages.
        </p>
      )}
    </div>
  )
}