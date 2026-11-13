/**
 * Homepage layout: an ordered list of blocks stored in content.homeLayout.
 *
 * Fixed blocks (hero, topCategories, about, merch, why, trust) are edited elsewhere and here
 * can only be reordered / hidden. `products` blocks are fully managed in Admin → Home sections.
 */

export const FIXED_BLOCKS = {
  hero: 'Hero banners',
  topCategories: 'Top categories',
  about: 'About banner',
  merch: 'Merch grid',
  why: 'Why choose us',
  trust: 'Trust markers',
}

export function newProductSection(patch = {}) {
  return {
    id: `sec-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    type: 'products',
    active: true,
    title: 'New Section',
    banner: { image: '', href: '', alt: '' },
    productHandles: [],
    collection: '',
    limit: 10,
    ctaLabel: '',
    ctaHref: '',
    ...patch,
  }
}

/** Layout that reproduces the original homepage until an admin saves their own. */
export function defaultHomeLayout(content = {}) {
  const rails = content.homeRails ?? {}
  return [
    { id: 'hero', type: 'hero', active: true },
    newProductSection({
      id: 'sec-new-arrivals',
      title: rails.newArrivals?.title || 'New Arrivals',
      collection: 'new-arrivals',
      limit: 10,
      ctaLabel: rails.newArrivals?.ctaLabel || 'View all new arrivals',
      ctaHref: rails.newArrivals?.ctaHref || '/collections/new-arrivals',
    }),
    { id: 'topCategories', type: 'topCategories', active: true },
    newProductSection({
      id: 'sec-bestsellers',
      title: rails.bestsellers?.title || 'Bestsellers',
      collection: 'best-sellers',
      limit: 8,
      ctaLabel: rails.bestsellers?.ctaLabel || 'View all bestsellers',
      ctaHref: rails.bestsellers?.ctaHref || '/collections/best-sellers',
    }),
    { id: 'about', type: 'about', active: true },
    { id: 'merch', type: 'merch', active: true },
    { id: 'why', type: 'why', active: true },
    { id: 'trust', type: 'trust', active: true },
  ]
}

export function resolveHomeLayout(content = {}) {
  const saved = content.homeLayout
  return Array.isArray(saved) && saved.length ? saved : defaultHomeLayout(content)
}

/** Products shown in a section: the hand-picked ones, else the collection fallback. */
export function sectionProducts(section, catalogue) {
  const handles = section.productHandles ?? []
  if (handles.length) {
    const byHandle = new Map(catalogue.map((p) => [p.handle, p]))
    return handles.map((h) => byHandle.get(h)).filter(Boolean)
  }
  const slug = section.collection
  if (!slug) return []
  const badge = slug === 'new-arrivals' ? 'NEW ARRIVAL' : slug === 'best-sellers' ? 'BEST SELLER' : null
  return catalogue
    .filter((p) => p.collections?.includes(slug) || (badge && p.badges?.includes(badge)))
    .slice(0, Number(section.limit) || 10)
}
