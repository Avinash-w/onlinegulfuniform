import { useState } from 'react'
import { Minus, Plus } from './icons'

export function Accordion({ icon: Icon, title, subtitle, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-line">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 py-4 text-left"
        aria-expanded={open}
      >
        {Icon && <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-ink" />}
        <span className="flex-1">
          <span className="block text-[13px] font-semibold">{title}</span>
          {subtitle && <span className="mt-0.5 block text-[11px] text-muted">{subtitle}</span>}
        </span>
        {open ? <Minus className="mt-1 h-4 w-4" /> : <Plus className="mt-1 h-4 w-4" />}
      </button>

      {open && <div className="animate-fadeIn pb-5 text-[12px] leading-relaxed">{children}</div>}
    </div>
  )
}

export default Accordion
