import { Fragment } from 'react'
import { Link } from 'react-router-dom'

export default function Breadcrumbs({ items = [], current }) {
  const links = current ? items : items.slice(0, -1)
  const activeLabel = current || (items.length ? items[items.length - 1].label : '')

  return (
    <nav
      aria-label="Breadcrumb"
      className="container flex items-center gap-1.5 py-2 text-[11.5px] text-muted whitespace-nowrap overflow-x-auto hide-scrollbar sm:text-[12.5px] sm:py-2.5"
    >
      {links.map((c, i) => (
        <Fragment key={(c.href || '') + i}>
          <Link to={c.href} className="font-medium text-graphite shrink-0 transition-colors hover:text-[#4849E8]">
            {c.label}
          </Link>
          <span className="mx-0.5 shrink-0 text-muted/60">&gt;</span>
        </Fragment>
      ))}
      {activeLabel && (
        <span className="font-semibold text-ink shrink-0 truncate max-w-[200px] sm:max-w-none">{activeLabel}</span>
      )}
    </nav>
  )
}
