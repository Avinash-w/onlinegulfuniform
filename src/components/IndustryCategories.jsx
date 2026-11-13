import { useState } from 'react'
import { Link } from 'react-router-dom'

const CATEGORIES = [
  {
    id: 'uniforms',
    name: 'Custom Uniforms',
    badge: 'Core Specialty',
    description:
      'Engineered for everyday durability, executive elegance, and workplace safety across all corporate sectors.',
    items: [
      {
        title: 'Corporate & Executive',
        desc: 'Two-piece suits, tailored blazers, formal trousers, and Oxford cotton shirts.',
        image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80',
        specs: 'Wrinkle-resistant · Custom monogram embroidery · Breathable lining',
      },
      {
        title: 'Hospitality & Culinary',
        desc: 'Chef coats, double-breasted jackets, server aprons, and banquet waitstaff vests.',
        image: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=800&q=80',
        specs: 'Stain-release finish · Heat-dissipation mesh · Reinforced buttons',
      },
      {
        title: 'Healthcare & Dental',
        desc: 'Anti-microbial scrub sets, doctor lab coats, nurse tunics, and dental patient gowns.',
        image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80',
        specs: 'Fluid-barrier certified · 65/35 poly-cotton · Colorfast autoclave wash',
      },
      {
        title: 'Industrial & High-Vis',
        desc: 'Heavy-duty coveralls, boiler suits, reflective safety vests, and cargo work pants.',
        image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
        specs: 'EN ISO certified · 3M Scotchlite reflective tape · Triple-stitched seams',
      },
      {
        title: 'School & Institutional',
        desc: 'School blazers, knit cardigans, polo shirts, pleated skirts, and sports PE kits.',
        image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
        specs: 'Child-safe dyes · Pill-resistant jersey · Embroidered school crests',
      },
      {
        title: 'Security & Aviation',
        desc: 'Tactical security uniforms, epaulette pilot shirts, and airport ground-handling jackets.',
        image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
        specs: 'Badge tab holders · Permanent crease seams · High durability',
      },
    ],
  },
  {
    id: 'fabrics',
    name: 'Customize Fabrics',
    badge: 'Direct Mill Sourcing',
    description:
      'We supply certified premium textiles directly from trusted mills, tailored for GCC heat and intensive industrial laundering.',
    items: [
      {
        title: 'Poly-Viscose (PV) Suiting',
        desc: 'Smooth drape, crease-recovery, ideal for five-star hotels and corporate offices.',
        image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=800&q=80',
        specs: 'Weights: 180–280 GSM · 60+ Stock shades · Anti-static treatment',
      },
      {
        title: 'Medical Anti-Microbial Twill',
        desc: 'Silver-ion infused fabrics that inhibit bacterial growth in clinical environments.',
        image: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=800&q=80',
        specs: 'ISO 20743 certified · Autoclave safe at 60°C · High breathability',
      },
      {
        title: '100% Combed Cotton Drill',
        desc: 'Ultra-breathable natural cotton designed for kitchen brigades and humid conditions.',
        image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
        specs: 'Pre-shrunk sanforized · Reactive color dyes · 200–320 GSM',
      },
      {
        title: 'Flame-Retardant & Anti-Static',
        desc: 'Specialized protective fabrics for oil refineries, civil defense, and chemical plants.',
        image: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80',
        specs: 'NFPA 2112 / EN 11612 · Inherent FR fibers · Permanent electric dissipation',
      },
    ],
  },
  {
    id: 'accessories',
    name: 'Bags & Accessories',
    badge: 'Brand Merchandising',
    description:
      'Complete the company wardrobe with branded backpacks, event lanyards, caps, umbrellas, and custom giveaways.',
    items: [
      {
        title: 'Corporate Laptop Backpacks',
        desc: 'Ergonomic business backpacks with padded compartments and embroidered logos.',
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
        specs: 'Water-resistant nylon · YKK zippers · USB charging pass-through',
      },
      {
        title: 'Promotional Caps & Headwear',
        desc: '6-panel baseball caps, snapbacks, and sun visors with 3D puff embroidery.',
        image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=800&q=80',
        specs: '100% brushed cotton twill · Brass buckle closure · UV50+ protection',
      },
      {
        title: 'Custom Golf Umbrellas & Bags',
        desc: 'Wind-resistant corporate umbrellas and reusable non-woven branded tote bags.',
        image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
        specs: 'Fiberglass double-canopy ribs · Sublimated full-panel logo print',
      },
    ],
  },
  {
    id: 'stock',
    name: 'Immediate Stock Items',
    badge: 'Ready for 24h Dispatch',
    description:
      'Need uniforms on tight deadlines? Our ready-made inventory can be decorated and delivered in 24–48 hours.',
    items: [
      {
        title: 'Premium Piqué Polo Shirts',
        desc: 'Available in 18 colors, sizes XS to 5XL, ready for urgent logo embroidery.',
        image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80',
        specs: '220 GSM combed cotton/poly · Ribbed collar & cuffs · In stock now',
      },
      {
        title: 'Heavyweight Cargo Trousers',
        desc: 'Multi-pocket combat work pants with reinforced knees for industrial crews.',
        image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80',
        specs: '6 utility pockets · Bar-tacked stress points · Navy, Black, Khaki',
      },
      {
        title: 'Classic Oxford Dress Shirts',
        desc: 'Crisp short & long-sleeve corporate shirts for sales teams and reception staff.',
        image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
        specs: 'Easy-iron finish · Button-down collar · Available in White & Sky Blue',
      },
    ],
  },
]

export default function IndustryCategories() {
  const [activeTab, setActiveTab] = useState('uniforms')
  const activeCategory = CATEGORIES.find((c) => c.id === activeTab) || CATEGORIES[0]

  return (
    <section className="bg-slate-50 py-16 md:py-24" id="products">
      <div className="container px-4 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-800">
            <span>Our Product Catalogue</span>
          </div>
          <h2 className="mt-3 font-display text-3xl uppercase tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            Custom Uniforms & Workwear Solutions
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">
            Manufactured in our UAE facility with Japanese Barudan embroidery and high-tensile stitching.
            Explore our standard lines or request custom design and fabric formulations.
          </p>

          {/* Navigation Category Tabs */}
          <div className="mt-8 flex flex-wrap justify-center gap-2 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all sm:px-5 sm:text-sm ${
                  activeTab === cat.id
                    ? 'bg-[#0A192F] text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`hidden rounded-full px-1.5 py-0.5 text-[10px] sm:inline ${
                    activeTab === cat.id ? 'bg-amber-400 text-slate-950 font-extrabold' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {cat.badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Category Description Banner */}
        <div className="mx-auto mt-8 max-w-3xl rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-center text-xs text-blue-900 sm:text-sm">
          <span className="font-bold">{activeCategory.name}: </span>
          <span>{activeCategory.description}</span>
        </div>

        {/* Product Cards Grid */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activeCategory.items.map((item) => (
            <div
              key={item.title}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl"
            >
              {/* Image with zoom effect */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="absolute bottom-3 left-3 right-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <a
                    href="#b2b-quote"
                    className="inline-flex w-full items-center justify-center rounded-lg bg-amber-400 py-2 text-xs font-bold text-slate-950 shadow-md transition-all hover:bg-amber-300"
                  >
                    Request Quote for this Line →
                  </a>
                </div>
              </div>

              {/* Card Body */}
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {item.desc}
                </p>

                {/* Specs Pill */}
                <div className="mt-4 rounded-lg bg-slate-50 p-2.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200/60">
                  <span className="font-semibold text-slate-800">Factory Specs: </span>
                  {item.specs}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
                    ✓ Custom Embroidery Ready
                  </span>
                  <a
                    href="#b2b-quote"
                    className="text-xs font-bold text-slate-800 hover:text-blue-600"
                  >
                    Inquire ↗
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Banner */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#0A192F] to-[#172A45] p-6 text-white sm:flex-row sm:p-8">
          <div>
            <h4 className="text-lg font-bold sm:text-xl">
              Need a completely bespoke uniform design or special fabric blend?
            </h4>
            <p className="mt-1 text-xs text-slate-300 sm:text-sm">
              Our pattern masters and textile consultants can craft custom samples for corporate tenders.
            </p>
          </div>
          <a
            href="#b2b-quote"
            className="shrink-0 rounded-xl bg-amber-400 px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-md transition-all hover:bg-amber-300 active:scale-95"
          >
            Speak to a Uniform Specialist
          </a>
        </div>
      </div>
    </section>
  )
}
