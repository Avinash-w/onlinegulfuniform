import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SITE_URL = 'https://evaranest.braintechtools.xyz'
const SITE_NAME = 'EvaraNest'
const DEFAULT_TITLE = 'EvaraNest — Luxury Handmade Candles, Wax Melts & Home Fragrance'
const DEFAULT_DESC =
  'Shop handcrafted scented soy wax candles, aesthetic decorative candles, wax melts, aroma diffusers, and personalised luxury gift hampers from EvaraNest. Hand-poured in small batches in India.'
const DEFAULT_KEYWORDS =
  'luxury handmade candles, scented candles India, soy wax candles, aesthetic jar candles, decorative candles, aroma wax melts, reed diffusers, home fragrance, custom wedding candle favours, corporate gift hampers, hand poured candles'
const DEFAULT_IMAGE = `${SITE_URL}/logo/evaranest-logo.png`

/**
 * Powerful Dynamic SEO component for EvaraNest
 * Injects Title, Meta Description, Keywords, Canonical, OpenGraph, Twitter Cards, and Schema.org JSON-LD
 */
export default function Seo({
  title,
  description,
  keywords,
  canonical,
  image,
  type = 'website',
  schema,
  noindex = false,
}) {
  const location = useLocation()
  const currentPath = location.pathname

  const fullTitle = title
    ? `${title} | ${SITE_NAME} — Luxury Handmade Candles`
    : DEFAULT_TITLE
  const metaDesc = description || DEFAULT_DESC
  const metaKeywords = Array.isArray(keywords)
    ? keywords.join(', ')
    : keywords || DEFAULT_KEYWORDS
  const canonicalUrl = canonical
    ? canonical.startsWith('http')
      ? canonical
      : `${SITE_URL}${canonical.startsWith('/') ? canonical : `/${canonical}`}`
    : `${SITE_URL}${currentPath}`
  const ogImage = image
    ? image.startsWith('http')
      ? image
      : `${SITE_URL}${image.startsWith('/') ? image : `/${image}`}`
    : DEFAULT_IMAGE

  useEffect(() => {
    // 1. Document Title
    document.title = fullTitle

    // Helper to safely create or update meta tags
    const setMeta = (attr, key, content) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content || '')
    }

    // 2. Standard Meta Tags
    setMeta('name', 'description', metaDesc)
    setMeta('name', 'keywords', metaKeywords)
    setMeta(
      'name',
      'robots',
      noindex
        ? 'noindex, nofollow'
        : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'
    )
    setMeta('name', 'author', 'EvaraNest Lifestyle')

    // 3. Canonical Link
    let linkCanonical = document.querySelector('link[rel="canonical"]')
    if (!linkCanonical) {
      linkCanonical = document.createElement('link')
      linkCanonical.setAttribute('rel', 'canonical')
      document.head.appendChild(linkCanonical)
    }
    linkCanonical.setAttribute('href', canonicalUrl)

    // 4. Open Graph Tags
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', metaDesc)
    setMeta('property', 'og:url', canonicalUrl)
    setMeta('property', 'og:type', type)
    setMeta('property', 'og:image', ogImage)
    setMeta('property', 'og:site_name', SITE_NAME)
    setMeta('property', 'og:locale', 'en_IN')

    // 5. Twitter Card Tags
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', fullTitle)
    setMeta('name', 'twitter:description', metaDesc)
    setMeta('name', 'twitter:image', ogImage)

    // 6. Schema.org JSON-LD Structured Data
    const scriptId = 'evaranest-dynamic-jsonld'
    let scriptEl = document.getElementById(scriptId)

    if (schema) {
      if (!scriptEl) {
        scriptEl = document.createElement('script')
        scriptEl.id = scriptId
        scriptEl.type = 'application/ld+json'
        document.head.appendChild(scriptEl)
      }
      const schemaData = Array.isArray(schema)
        ? { '@context': 'https://schema.org', '@graph': schema }
        : schema['@context']
          ? schema
          : { '@context': 'https://schema.org', ...schema }
      scriptEl.textContent = JSON.stringify(schemaData)
    } else if (scriptEl) {
      scriptEl.remove()
    }

    return () => {
      // Optional cleanup on unmount
    }
  }, [fullTitle, metaDesc, metaKeywords, canonicalUrl, ogImage, type, schema, noindex])

  return null
}
