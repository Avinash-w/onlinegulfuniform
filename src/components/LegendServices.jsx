import { Link } from 'react-router-dom'

export default function LegendServices({ onOpenCatalogue }) {
  const services = [
    {
      icon: '🪡',
      title: 'Customize Embroidery',
      subtitle: 'Japanese Barudan Automated Technology',
      body: 'State-of-the-art Japanese multi-head Barudan embroidery machines utilizing King Fisher high-tensile threads for ultra-crisp logos, 3D puff badges, and enduring wash resistance.',
      highlights: ['Barudan Multi-Head Machinery', 'King Fisher Thread', '3D Puff & Monogram Badging'],
      gradient: 'from-blue-600 to-indigo-700',
    },
    {
      icon: '🎨',
      title: 'Customize Printing',
      subtitle: 'Screen & High-Definition Sublimation',
      body: 'Precision screen printing, all-over dye sublimation, and heat-transfer vinyl on any apparel, activewear, and promotional giveaways with vivid color accuracy.',
      highlights: ['Spot Color & Halftone Screen Print', 'All-over Sublimation', 'Direct-to-Film (DTF) Transfers'],
      gradient: 'from-amber-600 to-orange-700',
    },
    {
      icon: '🎁',
      title: 'Promotional Items & Giveaways',
      subtitle: 'Corporate Merchandise & Executive Gifting',
      body: 'Custom-branded business giveaways: engraved USBs, metal pens, luxury keychains, woven event lanyards, stress relievers, presentation folders, and drinkware.',
      highlights: ['Laser Engraved Metalwork', 'Custom Woven Lanyards', 'Executive Welcome Packs'],
      gradient: 'from-emerald-600 to-teal-700',
    },
    {
      icon: '⚡',
      title: 'Immediate Stock Deliveries',
      subtitle: 'Fast Turnaround for Tight Deadlines',
      body: 'Extensive warehouse inventory in Dubai with ready cargo work trousers, piqué polo shirts, and formal dress shirts ready for rapid in-house decoration and dispatch.',
      highlights: ['24–48h Dispatch in UAE', 'Wide Range of Sizes XS–6XL', 'Low Minimum Order Quantities'],
      gradient: 'from-violet-600 to-purple-700',
    },
  ]

  return (
    <section className="relative overflow-hidden bg-[#0A192F] py-16 text-white md:py-24" id="services">
      {/* Background glow */}
      <div className="pointer-events-none absolute right-0 top-1/4 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-10 h-80 w-80 rounded-full bg-amber-500/10 blur-[100px]" />

      <div className="container relative z-10 px-4 lg:px-8">
        {/* Section title */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
            <span>In-House Manufacturing Capabilities</span>
          </div>
          <h2 className="mt-3 font-display text-3xl uppercase tracking-tight sm:text-4xl md:text-5xl">
            Our Customization Services
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Equipped with proprietary industrial machines and skilled tailors to deliver impeccable quality,
            fast turnarounds, and consistent corporate brand execution.
          </p>
        </div>

        {/* 4 Core Services Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => (
            <div
              key={s.title}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-700/60 bg-slate-800/40 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/40 hover:bg-slate-800/70 hover:shadow-xl hover:shadow-amber-500/5"
            >
              <div>
                {/* Icon box */}
                <div className="grid h-14 w-14 place-items-center rounded-xl bg-slate-700/60 text-2xl shadow-inner group-hover:scale-110 transition-transform">
                  {s.icon}
                </div>

                <h3 className="mt-5 text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                  {s.title}
                </h3>
                <p className="mt-1 text-xs font-semibold text-amber-400/90">
                  {s.subtitle}
                </p>

                <p className="mt-3 text-xs leading-relaxed text-slate-300">
                  {s.body}
                </p>
              </div>

              {/* Highlights */}
              <div className="mt-6 border-t border-slate-700/60 pt-4">
                <ul className="space-y-1.5 text-[11px] text-slate-400">
                  {s.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-1.5">
                      <span className="text-amber-400">✓</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Quote banner from original site */}
        <div className="mt-16 rounded-3xl border border-slate-700/80 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8 text-center shadow-2xl sm:p-12">
          <p className="font-serif italic text-lg text-amber-200 sm:text-2xl md:text-3xl">
            “Let love & skill work together to create a master piece for your business.”
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Legend Uniforms Commitment to Quality
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <button
              onClick={onOpenCatalogue}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-md transition-all hover:bg-amber-300 active:scale-95"
            >
              <span>📥 Download Corporate Catalogue</span>
            </button>
            <a
              href="#b2b-quote"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/80 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white transition-all hover:bg-slate-700 active:scale-95"
            >
              <span>Request Customization Quote →</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
