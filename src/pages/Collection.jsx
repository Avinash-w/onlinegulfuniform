import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import CustomOrderPage from './CustomOrderPage'
import Breadcrumbs from '../components/Breadcrumbs'
import CouponMarquee from '../components/CouponMarquee'
import Img from '../components/Img'
import ProductCard from '../components/ProductCard'
import Seo from '../components/Seo'
import { Check, ChevronDown, Close, Refresh, Sliders, Sort } from '../components/icons'
import SearchBar from '../components/SearchBar'
import {
  applyFilters,
  applyQuery,
  applySort,
  countSelected,
  deriveFacets,
  facetOptionCount,
  isPriceRange,
  isPriceRangeActive,
  priceBounds,
} from '../lib/filters'
import { useStore, inr } from '../store/StoreContext.jsx'
import { useLanguage } from '../context/LanguageContext'
import {
  allCategories,
  allProducts,
  colorSwatchesOf,
  filterGroupsOf,
  storefrontContent,
} from '../store/selectors.js'

const DEFAULT_SORT_VALUES = [
  { value: 'featured', key: 'featured' },
  { value: 'best-selling', key: 'bestSelling' },
  { value: 'price-asc', key: 'priceLowHigh' },
  { value: 'price-desc', key: 'priceHighLow' },
  { value: 'newest', key: 'newest' },
]

function PriceRangeSlider({ min, max, value, onChange }) {
  const { t } = useLanguage()
  const lo = value?.min ?? min
  const hi = value?.max ?? max
  const span = Math.max(max - min, 1)
  const leftPct = ((lo - min) / span) * 100
  const rightPct = ((hi - min) / span) * 100

  const setLo = (n) => {
    const next = Math.min(Number(n), hi)
    onChange({ min: next, max: hi })
  }
  const setHi = (n) => {
    const next = Math.max(Number(n), lo)
    onChange({ min: lo, max: next })
  }

  return (
    <div className="pb-1 pt-1">
      <p className="text-[12px] text-muted">{t('selectedPriceRange')}</p>
      <p className="mt-1 text-[15px] font-semibold text-ink">
        {inr(lo)} - {inr(hi)}
      </p>
      <div className="price-dual-range mt-4">
        <div className="price-dual-range__rail" />
        <div
          className="price-dual-range__fill"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={10}
          value={lo}
          onChange={(e) => setLo(e.target.value)}
          aria-label="Minimum price"
          style={{ zIndex: lo > max - (hi - min) * 0.1 ? 5 : 3 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={10}
          value={hi}
          onChange={(e) => setHi(e.target.value)}
          aria-label="Maximum price"
          style={{ zIndex: 4 }}
        />
      </div>
    </div>
  )
}

export default function Collection() {
  const { slug = 'all-products' } = useParams()
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const cat = searchParams.get('category') || ''

  if (['custom-orders', 'bulk-quote', 'bulk-orders'].includes(slug)) {
    return <CustomOrderPage />
  }

  return <CollectionContent key={`${slug}-${q}-${cat}`} slug={slug} />
}

function CollectionContent({ slug }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQuery = searchParams.get('q') || ''
  const urlCategory = searchParams.get('category') || ''

  const { state } = useStore()
  const { t } = useLanguage()
  const content = storefrontContent(state)
  const collectionMeta = content.collectionMeta ?? {}
  const filterGroups = filterGroupsOf(state).length ? filterGroupsOf(state) : []
  const colorSwatches = colorSwatchesOf(state)
  const sortOptions = content.sortOptions?.length ? content.sortOptions : DEFAULT_SORT_VALUES
  const catalogue = allProducts(state)

  const isSearchMode = Boolean(urlQuery.trim())

  const meta = useMemo(() => {
    if (isSearchMode && (slug === 'all-products' || slug === 'all' || !slug)) {
      return {
        title: `Search: “${urlQuery.trim()}”`,
        banner: collectionMeta['all-products']?.banner,
        crumbs: [
          { label: 'Home', href: '/' },
          { label: 'All Products', href: '/collections/all-products' },
          { label: `Search: “${urlQuery.trim()}”`, href: `/collections/all-products?q=${encodeURIComponent(urlQuery.trim())}` },
        ],
      }
    }
    return (
      collectionMeta[slug] ?? {
        title: slug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
        banner: collectionMeta['all-products']?.banner,
        crumbs: [
          { label: 'Home', href: '/' },
          { label: slug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()), href: `/collections/${slug}` },
        ],
      }
    )
  }, [slug, collectionMeta, isSearchMode, urlQuery])

  const categories = allCategories(state)
  const categoryBadges = useMemo(() => {
    const list = [
      { label: 'All Products', slug: 'all-products', href: '/collections/all-products' },
    ]
    const seen = new Set(['all-products', 'home', 'track-order', 'about-us', 'contact-us'])

    // The local catalogue can render before the PHP API provides category
    // records. Derive useful collection links from products in that case.
    if (!categories.length) {
      const groups = new Map()
      for (const product of catalogue) {
        const categoryName = product.category?.trim()
        if (!categoryName) continue
        const categorySlug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        if (!groups.has(categorySlug)) groups.set(categorySlug, { name: categoryName, children: new Map() })
        const subcategory = product.subcategory?.trim()
        if (subcategory) {
          const subSlug = subcategory.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          if (!groups.get(categorySlug).children.has(subSlug)) {
            const label = subcategory.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
            groups.get(categorySlug).children.set(subSlug, label)
          }
        }
      }
      for (const [slug, group] of groups) {
        list.push({ label: group.name, slug, href: `/collections/${slug}` })
        for (const [subSlug, label] of group.children) {
          if (seen.has(subSlug)) continue
          seen.add(subSlug)
          list.push({ label: `${group.name} · ${label}`, slug: subSlug, href: `/collections/${subSlug}` })
        }
      }
      return list
    }

    for (const c of categories) {
      if (!c.active || seen.has(c.slug)) continue
      seen.add(c.slug)
      list.push({ label: c.name, slug: c.slug, href: `/collections/${c.slug}` })

      for (const s of c.children ?? []) {
        if (!s.active || seen.has(s.slug)) continue
        seen.add(s.slug)
        list.push({ label: `${c.name} · ${s.name}`, slug: s.slug, href: `/collections/${s.slug}` })
      }
    }
    return list
  }, [categories, catalogue])

  const base = useMemo(() => {
    let pool = catalogue
    const catNorm = urlCategory && urlCategory !== 'All' ? urlCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-') : null
    const effectiveSlug = (slug === 'all-products' || slug === 'all' || !slug) ? catNorm : slug

    if (effectiveSlug) {
      const found = catalogue.filter((p) => {
        if (p.collections?.includes(effectiveSlug)) return true
        if (p.subcategory === effectiveSlug) return true
        const catP = (p.category ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
        if (catP === effectiveSlug) return true
        const subP = (p.subcategory ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
        if (subP === effectiveSlug) return true
        return false
      })
      if (found.length) pool = found
    }
    return pool
  }, [slug, catalogue, urlCategory])

  const bounds = useMemo(() => priceBounds(base), [base])

  const [sort, setSort] = useState('Featured')
  const [sortOpen, setSortOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selected, setSelected] = useState({})
  const [openGroups, setOpenGroups] = useState(['Price', 'Category'])
  const [query, setQuery] = useState(urlQuery)

  useEffect(() => {
    setQuery(urlQuery)
  }, [urlQuery])

  const handleQueryChange = (val) => {
    setQuery(val)
    const next = new URLSearchParams(searchParams)
    if (val.trim()) {
      next.set('q', val.trim())
    } else {
      next.delete('q')
    }
    setSearchParams(next, { replace: true })
  }

  // Facets reflect what's actually in this collection.
  const facets = useMemo(() => deriveFacets(base, filterGroups), [base, filterGroups])

  const items = useMemo(
    () => applySort(applyFilters(applyQuery(base, query), selected), sort),
    [base, selected, sort, query]
  )

  const active = countSelected(selected, bounds)

  const toggle = (group, value) =>
    setSelected((s) => {
      const cur = new Set(s[group] ?? [])
      if (cur.has(value)) cur.delete(value)
      else cur.add(value)
      return { ...s, [group]: cur }
    })

  const setPriceRange = (range) => setSelected((s) => ({ ...s, Price: range }))

  const clearAll = () => {
    setSelected({})
    setQuery('')
    const next = new URLSearchParams(searchParams)
    next.delete('q')
    next.delete('category')
    setSearchParams(next, { replace: true })
  }

  const toggleGroup = (group) =>
    setOpenGroups((g) => (g.includes(group) ? g.filter((x) => x !== group) : [...g, group]))

  const isFilteredOrCustomCategory =
    active > 0 || query.trim() !== '' || (slug !== 'all-products' && slug !== 'all')

  const resetEverything = () => {
    clearAll()
    if (slug !== 'all-products' && slug !== 'all') {
      navigate('/collections/all-products')
    }
  }

  const FilterPanel = (
    <div className="space-y-4">
      <div className="border-b border-line pb-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0B2545]">Category</p>
        <div className="space-y-1">
          {categoryBadges.map((badge) => {
            const selectedCategory = badge.slug === slug || (slug === 'all' && badge.slug === 'all-products')
            const categoryCount = badge.slug === 'all-products'
              ? catalogue.length
              : catalogue.filter((product) => {
                  const productCategory = (product.category ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
                  const productSubcategory = (product.subcategory ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
                  return product.collections?.includes(badge.slug) || productCategory === badge.slug || productSubcategory === badge.slug
                }).length
            return (
              <button
                key={`${badge.slug}-${badge.label}`}
                type="button"
                onClick={() => { navigate(badge.href); setFiltersOpen(false) }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12px] transition-colors ${selectedCategory ? 'bg-blue-50 font-semibold text-[#1D4ED8]' : 'text-graphite hover:bg-slate-50'}`}
              >
                <span className="truncate">{badge.label}</span>
                <span className="ml-3 shrink-0 text-[11px] text-muted">{categoryCount}</span>
              </button>
            )
          })}
        </div>
      </div>
      {facets.map((fg) => {
        if (fg.name === 'Category') return null
        const isOpen = openGroups.includes(fg.name)
        if (fg.type === 'price_range') {
          return (
            <div key={fg.name} className="border-b border-line pb-4">
              <button
                onClick={() => toggleGroup(fg.name)}
                className="label-caps flex w-full items-center justify-between py-1 text-left"
              >
                <span>{fg.name}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="mt-3">
                  <PriceRangeSlider
                    min={bounds.min}
                    max={bounds.max}
                    value={selected.Price}
                    onChange={setPriceRange}
                  />
                </div>
              )}
            </div>
          )
        }

        const selSet = selected[fg.name] instanceof Set ? selected[fg.name] : new Set()

        return (
          <div key={fg.name} className="border-b border-line pb-4">
            <button
              onClick={() => toggleGroup(fg.name)}
              className="label-caps flex w-full items-center justify-between py-1 text-left"
            >
              <span>{fg.name}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="mt-3 space-y-2">
                {fg.options.map((opt) => {
                  const checked = selSet.has(opt)
                  const count = facetOptionCount(base, fg.name, opt)
                  return (
                    <label
                      key={opt}
                      className="flex cursor-pointer items-center justify-between text-[12px] text-graphite hover:text-ink"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(fg.name, opt)}
                          className="h-3.5 w-3.5 rounded border-line text-[#1D4ED8] focus:ring-[#1D4ED8]"
                        />
                        <span>{opt}</span>
                      </div>
                      <span className="text-[11px] text-muted">({count})</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <>
      <Seo
        title={`${meta.title} — Online Gulf Uniform`}
        description={`Explore our collection of ${meta.title.toLowerCase()} at Online Gulf Uniform. Premium durable school uniforms, workwear, and industrial safety apparel.`}
        keywords={`${meta.title.toLowerCase()}, school uniforms, industrial workwear, online gulf uniform`}
        canonical={`/collections/${slug}`}
        schema={[
          {
            '@type': 'BreadcrumbList',
            itemListElement: (meta.crumbs || []).map((c, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              name: c.label,
              item: c.href,
            })),
          },
          {
            '@type': 'CollectionPage',
            name: `${meta.title} - Online Gulf Uniform`,
            url: `/collections/${slug}`,
            description: `Explore our collection of ${meta.title} at Online Gulf Uniform.`,
          },
        ]}
      />

      <Breadcrumbs items={meta.crumbs} />

      <CouponMarquee />

      {/* Collection heading and browse controls */}
      <section className="border-b border-slate-200/70 bg-gradient-to-b from-[#F4F7FB] to-white">
      <div className="container py-5 sm:py-7 lg:py-9">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1D4ED8] sm:text-[11px]">{t('uniformCatalog')}</p>
            <h1 className="font-sans text-2xl font-semibold leading-tight tracking-tight text-[#0B2545] sm:text-3xl lg:text-4xl">
              {meta.title}
            </h1>
            <p className="mt-1.5 hidden text-sm text-slate-500 sm:block">Premium school uniforms and workwear, selected for everyday comfort and durability.</p>
          </div>
          <span className="shrink-0 pb-1 text-xs font-medium text-slate-500 sm:text-sm">{items.length} {items.length === 1 ? 'item' : 'items'}</span>

          {/* Mobile inline Reset button */}
          {isFilteredOrCustomCategory && (
            <button
              type="button"
              onClick={resetEverything}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#1D4ED8]/30 bg-[#EFF6FF] px-3 py-1.5 text-[11.5px] font-bold text-[#1D4ED8] shadow-xs transition-all active:scale-95 sm:hidden"
              aria-label="Reset all filters and categories"
            >
              <Refresh className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* full-width product search */}
        <SearchBar
          className="mt-4 sm:mt-5"
          value={query}
          onQueryChange={handleQueryChange}
          placeholder="Search uniforms, pants, shirts, PE, safety…"
          resultCount={items.length}
        />
      </div>
      </section>

      {/* mobile controls */}
      <div className="sticky top-[108px] z-30 -mt-px border-y border-line bg-white sm:top-[108px] md:top-[124px] lg:hidden">
        <div className="container grid grid-cols-2 divide-x divide-line">
          <button
            onClick={() => setFiltersOpen(true)}
            className="flex items-center justify-center gap-1.5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-ink sm:py-4 sm:text-[13px]"
          >
            <Sliders className="h-3.5 w-3.5" /> Filters
            {active > 0 && (
              <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[#1D4ED8] px-1 text-[9px] font-bold text-white">
                {active}
              </span>
            )}
          </button>
          <button
            onClick={() => setSortOpen(true)}
            className="flex items-center justify-center gap-1.5 py-3.5 text-[12px] font-semibold uppercase tracking-wider text-ink sm:py-4 sm:text-[13px]"
          >
            <Sort className="h-3.5 w-3.5" /> Sort by
          </button>
        </div>
      </div>

      <div className="container flex items-start gap-8 pb-12 pt-4 sm:pb-16 sm:pt-6 lg:gap-10">
        <aside className="sticky top-20 lg:top-24 hidden max-h-[calc(100vh-6.5rem)] w-[250px] shrink-0 self-start overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hide-scrollbar lg:block">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#0B2545]">Filters</h2>
            {active > 0 && (
              <button onClick={clearAll} className="text-[11px] text-muted underline underline-offset-2">
                Clear all
              </button>
            )}
          </div>
          {FilterPanel}
        </aside>

        <div className="min-w-0 flex-1">
          {/* active filter chips + sort */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {Object.entries(selected).flatMap(([group, values]) => {
              if (group === 'Price' && isPriceRange(values)) {
                if (!isPriceRangeActive(values, bounds)) return []
                return [
                  <button
                    key="Price-range"
                    onClick={() =>
                      setSelected((s) => {
                        const next = { ...s }
                        delete next.Price
                        return next
                      })
                    }
                    className="flex items-center gap-1.5 border border-line bg-chalk px-2.5 py-1.5 text-[11px] transition-colors hover:border-ink"
                  >
                    <span className="text-muted">Price:</span> {inr(values.min)} - {inr(values.max)}
                    <Close className="h-3 w-3" />
                  </button>,
                ]
              }
              if (!(values instanceof Set)) return []
              return [...values].map((v) => (
                <button
                  key={`${group}-${v}`}
                  onClick={() => toggle(group, v)}
                  className="flex items-center gap-1.5 border border-line bg-chalk px-2.5 py-1.5 text-[11px] transition-colors hover:border-ink"
                >
                  <span className="text-muted">{group}:</span> {v}
                  <Close className="h-3 w-3" />
                </button>
              ))
            })}
            {active > 0 && (
              <button
                onClick={clearAll}
                className="hidden text-[11px] text-muted underline underline-offset-2 lg:inline"
              >
                Clear all
              </button>
            )}

            <div className="relative ml-auto hidden lg:block">
              <button
                onClick={() => setSortOpen((o) => !o)}
                className="label-caps flex items-center gap-2 border border-line px-4 py-2.5"
              >
                Sort by : <span className="font-normal normal-case tracking-normal">{sort}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-56 border border-line bg-white py-1 shadow-pop">
                  {sortOptions.map((o) => {
                    const label = typeof o === 'string' ? o : (o.key ? t(o.key) : (o.label || o.value))
                    const val = typeof o === 'string' ? o : (o.value || o.label || o)
                    return (
                      <button
                        key={val}
                        onClick={() => {
                          setSort(val)
                          setSortOpen(false)
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[12px] hover:bg-chalk"
                      >
                        <Check className={`h-3.5 w-3.5 ${sort === val ? 'opacity-100' : 'opacity-0'}`} />
                        {label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="py-24 text-center">
              <p className="font-display text-[20px] uppercase text-[#0B2545]">
                {query.trim() ? `No products match “${query.trim()}”` : 'Nothing matches those filters'}
              </p>
              <p className="mt-2 text-[12px] text-muted">
                {query.trim() ? 'Try checking your spelling or use different keywords.' : 'Try clearing filters to see all uniforms.'}
              </p>
              <button onClick={resetEverything} className="btn-ink mt-6 bg-[#1D4ED8] hover:bg-[#1E40AF]">
                {query.trim() ? 'Clear search' : 'Clear all filters'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-4">
              {items.map((p) => (
                <ProductCard key={p.handle} product={p} variant="collection" imageRatio="aspect-[4/5]" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* mobile filters sheet */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/45 backdrop-blur-sm transition-all" onClick={() => setFiltersOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col bg-white">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink">Filters</h2>
              <button onClick={() => setFiltersOpen(false)} aria-label="Close">
                <Close className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5">{FilterPanel}</div>
            <div className="grid grid-cols-2 gap-3 border-t border-line px-5 py-4">
              <button onClick={clearAll} className="btn-outline">
                Clear all
              </button>
              <button onClick={() => setFiltersOpen(false)} className="btn-ink bg-[#1D4ED8] hover:bg-[#1E40AF]">
                Show {items.length}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* mobile sort sheet */}
      {sortOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/45 backdrop-blur-sm transition-all" onClick={() => setSortOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 bg-white">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="label-caps">Sort by</h2>
              <button onClick={() => setSortOpen(false)} aria-label="Close">
                <Close className="h-5 w-5" />
              </button>
            </div>
            {sortOptions.map((o) => {
              const label = typeof o === 'string' ? o : (o.key ? t(o.key) : (o.label || o.value))
              const val = typeof o === 'string' ? o : (o.value || o.label || o)
              return (
                <button
                  key={val}
                  onClick={() => {
                    setSort(val)
                    setSortOpen(false)
                  }}
                  className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-[13px]"
                >
                  <Check className={`h-4 w-4 ${sort === val ? 'opacity-100' : 'opacity-0'}`} />
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
