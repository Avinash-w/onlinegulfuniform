// ---------------------------------------------------------------------------
// Storefront CMS content is loaded from the API (content_blocks). This file only
// provides an empty skeleton so components can render while it loads.
// ---------------------------------------------------------------------------


/**
 * Empty CMS skeleton so components can read arrays / objects safely while the
 * API response is loading. It carries NO content: every real value comes from
 * the API (content_blocks → /bootstrap).
 */
const EMPTY_CONTENT = {
  invoice: {},
  announcements: [],
  heroSlides: [],
  heroTrustLine: [],
  heroQuickLinks: [],
  topCategories: [],
  aboutBanner: {},
  merch: { title: '', tiles: [] },
  collectionMeta: {},
  filterGroups: [],
  colorSwatches: {},
  sortOptions: [],
  offers: [],
  reviewSummary: {},
  whyChoose: [],
  site: {},
  footer: {},
  trustMarkers: [],
  homeRails: {},
  pdp: {},
  pages: [],
}

export function mergeContentDefaults(content) {
  const c = content && typeof content === 'object' ? content : {}
  const out = { ...EMPTY_CONTENT, ...c }
  for (const key of Object.keys(EMPTY_CONTENT)) {
    if (out[key] === undefined || out[key] === null) out[key] = EMPTY_CONTENT[key]
  }
  return out
}
