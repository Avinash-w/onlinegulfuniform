import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function CorporateTopBar({ onOpenCatalogue, onOpenQuote }) {
  return (
    <div className="border-b border-navyLight/40 bg-[#071324] text-xs text-slate-300">
      <div className="container flex h-9 items-center justify-between px-2 text-[11px] sm:px-4 md:text-xs lg:px-8">
        {/* Left: Contact & Location */}
        <div className="flex items-center gap-3 sm:gap-5">
          <span className="flex items-center gap-1 font-medium text-slate-200">
            <span className="inline-block text-[13px]">🇦🇪</span>
            <span className="hidden sm:inline">Dubai & MENA Region</span>
            <span className="text-slate-400 sm:hidden">UAE</span>
          </span>
          <span className="hidden h-3 w-px bg-slate-700 md:inline-block" />
          <a
            href="tel:+97142288990"
            className="hidden items-center gap-1 text-slate-300 transition-colors hover:text-amber-400 md:flex"
          >
            <span>📞</span>
            <span>+971 4 228 8990</span>
          </a>
          <span className="hidden h-3 w-px bg-slate-700 sm:inline-block" />
          <a
            href="mailto:crm@legenduniforms.ae"
            className="flex items-center gap-1 text-slate-300 transition-colors hover:text-amber-400"
          >
            <span>✉️</span>
            <span className="hidden sm:inline">crm@legenduniforms.ae</span>
            <span className="sm:hidden">Email</span>
          </a>
        </div>

        {/* Right: Factory Badge & CTAs */}
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="hidden items-center gap-1.5 rounded-full bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-500/30 lg:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            100% In-House Factory & Barudan Embroidery
          </span>
          <button
            onClick={onOpenCatalogue}
            className="flex items-center gap-1 rounded bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-amber-300 transition-colors hover:bg-slate-700 hover:text-amber-200"
          >
            <span>📄</span>
            <span className="hidden xs:inline">Catalogue</span> PDF
          </button>
          <a
            href="#b2b-quote"
            className="rounded bg-gradient-to-r from-amber-500 to-amber-600 px-2.5 py-0.5 text-[11px] font-bold text-slate-950 transition-transform hover:scale-[1.02] hover:brightness-110"
          >
            Request Quote
          </a>
        </div>
      </div>
    </div>
  )
}
