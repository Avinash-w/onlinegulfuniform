import { useState } from 'react'

export default function CatalogueModal({ isOpen, onClose }) {
  const [downloaded, setDownloaded] = useState(false)
  const [email, setEmail] = useState('')

  if (!isOpen) return null

  const handleDownload = (e) => {
    e.preventDefault()
    setDownloaded(true)
    // Create an automated download link or simulated PDF download
    const link = document.createElement('a')
    link.href = '/catalogue/Legend_Uniforms_UAE_Catalogue_2026.pdf'
    link.download = 'Legend_Uniforms_UAE_Catalogue_2026.pdf'
    document.body.appendChild(link)
    // Attempt download or fallback
    try {
      link.click()
    } catch (_) {}
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl sm:p-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-400/10 text-2xl text-amber-400 ring-1 ring-amber-400/30">
            📄
          </div>
          <h3 className="mt-4 font-display text-2xl uppercase tracking-tight text-white">
            Download 2026 Corporate Catalogue
          </h3>
          <p className="mt-1.5 text-xs text-slate-300">
            Access our complete range of bespoke uniforms, fabric swatches, technical embroidery specifications, and stock lines.
          </p>
        </div>

        {/* Highlights Preview */}
        <div className="mt-6 space-y-2 rounded-2xl border border-slate-800 bg-slate-800/50 p-4 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">✓</span>
            <span>Over 120+ pages of Corporate, Healthcare, Hospitality & Industrial styles</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400">✓</span>
            <span>Technical fabric data sheets, GSM ratings, and color charts</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400">✓</span>
            <span>Promotional gifting & Japanese Barudan embroidery options</span>
          </div>
        </div>

        {downloaded ? (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-center">
            <p className="text-sm font-bold text-emerald-300">
              ✓ Downloading Started!
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Need immediate pricing or samples? WhatsApp our Dubai team directly.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <a
                href="https://wa.me/971501234567"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold uppercase text-slate-950 hover:bg-emerald-400"
              >
                <span>WhatsApp Specialist</span>
              </a>
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleDownload} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300">Corporate Email (Optional)</label>
              <input
                type="email"
                placeholder="procurement@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95"
            >
              Download PDF Catalogue (Free) ↓
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
