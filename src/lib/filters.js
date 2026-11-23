// ---------------------------------------------------------------------------
// Collection filtering + sorting — product-type agnostic facets.
// ---------------------------------------------------------------------------

const PRICE_RANGES = {
  'Under AED 599': (p) => p.price < 599,
  'AED 599 - AED 999': (p) => p.price >= 599 && p.price <= 999,
  'AED 999 - AED 1499': (p) => p.price > 999 && p.price <= 1499,
  'Above AED 1499': (p) => p.price > 1499,
}

/** groupName -> (product, selectedValue) => boolean */
export const PREDICATES = {
  Size: (p, v) => (p.sizes ?? []).includes(v),
  Price: (p, v) => {
    // Dual-range slider: { min, max }
    if (v && typeof v === 'object' && 'min' in v && 'max' in v) {
      return p.price >= v.min && p.price <= v.max
    }
    return PRICE_RANGES[v] ? PRICE_RANGES[v](p) : true
  },
  Color: (p, v) => p.color === v,
  Fabric: (p, v) => p.fabric === v,
  Availability: (p, v) => (v === 'In stock' ? !p.soldOut : !!p.soldOut),
  Pattern: (p, v) => p.pattern === v,
  Category: (p, v) => p.category === v,
  Scent: (p, v) => p.scent === v || p.fragrance === v,
  Fragrance: (p, v) =>
    p.scent === v ||
    p.fragrance === v ||
    (p.tags ?? []).some((t) => String(t).toLowerCase() === v.toLowerCase()),
  Material: (p, v) => p.material === v || p.waxType === v,
  'Wax Type': (p, v) => p.waxType === v || p.material === v,
  Occasion: (p, v) => p.occasion === v,
  'Burn Time': (p, v) => p.burnTime === v,
  Rating: (p, v) => (p.rating ?? 0) >= Number(v),
}

/** Min/max for Price dual-range slider from collection products. */
export function priceBounds(products) {
  if (!products?.length) return { min: 0, max: 2000 }
  const maxPrice = Math.max(...products.map((p) => Number(p.price) || 0))
  const rounded = Math.ceil(maxPrice / 100) * 100
  return { min: 0, max: Math.max(rounded || 2000, 2000) }
}

export function isPriceRange(value) {
  return value && typeof value === 'object' && !(value instanceof Set) && 'min' in value && 'max' in value
}

export function isPriceRangeActive(range, bounds) {
  if (!isPriceRange(range) || !bounds) return false
  return range.min > bounds.min || range.max < bounds.max
}

/** Free-text search across title, scent, material, tags, category. */
export function applyQuery(products, query) {
  const t = (query || '').trim().toLowerCase()
  if (!t) return products
  const terms = t.split(/\s+/)
  return products.filter((p) => {
    const hay = [
      p.title,
      p.shortDescription,
      p.description,
      p.color,
      p.scent,
      p.fragrance,
      p.material,
      p.waxType,
      p.pattern,
      p.category,
      p.productType,
      ...(p.tags ?? []),
      ...(p.collections ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return terms.every((w) => hay.includes(w))
  })
}

export function applyFilters(products, selected) {
  return products.filter((p) =>
    Object.entries(selected).every(([group, values]) => {
      if (!values) return true
      const test = PREDICATES[group]
      if (!test) return true
      // Price dual-range: { min, max }
      if (group === 'Price' && isPriceRange(values)) {
        return test(p, values)
      }
      if (values.size === 0) return true
      return [...values].some((v) => test(p, v))
    })
  )
}

/** Timestamp a product was added (ms), or 0 when unknown. */
function addedTime(p) {
  const raw = p.addedAt ?? p.createdAt ?? p.created_at
  if (!raw) return 0
  const t = typeof raw === 'number' ? raw : Date.parse(raw)
  return Number.isFinite(t) ? t : 0
}

/** Recently added products first (newest → oldest); the rest keep their order. */
function newestFirst(list) {
  return list.sort((a, b) => addedTime(b) - addedTime(a))
}

export function applySort(list, sort) {
  const out = [...list]
  switch (sort) {
    case 'Price Low to High':
      return out.sort((a, b) => a.price - b.price)
    case 'Price High to Low':
      return out.sort((a, b) => b.price - a.price)
    case 'Best Selling':
      return out.sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0))
    case 'Newest':
      return newestFirst(out)
    case 'New Arrivals':
      return out.sort(
        (a, b) =>
          Number(b.badges?.includes('NEW ARRIVAL')) - Number(a.badges?.includes('NEW ARRIVAL'))
      )
    default:
      return newestFirst(out)
  }
}

export function optionCount(products, selected, group, value) {
  const existing = selected[group]
  const prev = existing instanceof Set ? [...existing] : []
  const trial = { ...selected, [group]: new Set([...prev, value]) }
  return applyFilters(products, trial).length
}

/** Products matching an option within the current pool (other filters applied). */
export function facetOptionCount(products, selected, group, value) {
  const others = { ...selected }
  delete others[group]
  const pool = applyFilters(products, others)
  const test = PREDICATES[group]
  if (!test) return 0
  return pool.filter((p) => test(p, value)).length
}

export const countSelected = (selected, priceBoundsValue) =>
  Object.entries(selected).reduce((n, [group, s]) => {
    if (group === 'Price' && isPriceRange(s)) {
      return n + (isPriceRangeActive(s, priceBoundsValue) ? 1 : 0)
    }
    return n + (s?.size ?? 0)
  }, 0)

export const FILTER_ORDER = [
  'Price',
  'Category',
  'Occasion',
  'Wax Type',
  'Fragrance',
  'Color',
]

const SIZE_ORDER = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL']

export function deriveFacets(products, groups) {
  const facets = groups
    .map((g) => {
      let options

      switch (g.name) {
        case 'Size': {
          const set = new Set(products.flatMap((p) => p.sizes ?? []))
          options = SIZE_ORDER.filter((s) => set.has(s))
          break
        }
        case 'Price':
          // Dual-range slider UI — keep the group visible regardless of chip options.
          options = ['_range']
          break
        case 'Availability':
          options = ['In stock', 'Out of stock'].filter((o) =>
            products.some((p) => PREDICATES.Availability(p, o))
          )
          break
        case 'Color':
          options = [...new Set(products.map((p) => p.color).filter(Boolean))].sort()
          break
        case 'Fabric':
          options = [...new Set(products.map((p) => p.fabric).filter(Boolean))].sort()
          break
        case 'Pattern':
          options = [...new Set(products.map((p) => p.pattern).filter(Boolean))].sort()
          break
        case 'Category':
          options = [...new Set(products.map((p) => p.category).filter(Boolean))].sort()
          break
        case 'Scent':
        case 'Fragrance':
          options = [
            ...new Set(products.map((p) => p.scent || p.fragrance).filter(Boolean)),
          ].sort()
          break
        case 'Material':
        case 'Wax Type':
          options = [
            ...new Set(products.map((p) => p.waxType || p.material).filter(Boolean)),
          ].sort()
          break
        case 'Occasion':
          options = [...new Set(products.map((p) => p.occasion).filter(Boolean))].sort()
          break
        case 'Burn Time':
          options = [...new Set(products.map((p) => p.burnTime).filter(Boolean))].sort()
          break
        default:
          options = g.options
      }

      return { ...g, options }
    })
    .filter((g) => g.name === 'Price' || g.options.length > 1)

  return facets.sort((a, b) => {
    const idxA = FILTER_ORDER.indexOf(a.name)
    const idxB = FILTER_ORDER.indexOf(b.name)
    const posA = idxA === -1 ? 999 : idxA
    const posB = idxB === -1 ? 999 : idxB
    return posA - posB
  })
}

