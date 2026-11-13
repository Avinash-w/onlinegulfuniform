// ---------------------------------------------------------------------------
// Image resolution
//
// Every image in this project is stored as its ORIGINAL Shopify CDN url inside
// src/data/*. `localName()` turns that url into a stable filename, and
// `npm run fetch:images` downloads each one into /public/images using exactly
// the same name.
//
// The <Img> component therefore tries the LOCAL copy first and silently falls
// back to the remote CDN url if the file hasn't been downloaded yet — so the
// app looks correct whether or not you've run the fetch script.
// ---------------------------------------------------------------------------

/** Turn a CDN url into a deterministic, filesystem-safe local filename. */
export function localName(url) {
  try {
    const { pathname } = new URL(url)
    let base = pathname.split('/').pop() || 'image'
    base = decodeURIComponent(base).replace(/[^a-zA-Z0-9._-]/g, '_')
    if (!/\.(jpe?g|png|gif|svg|webp|avif)$/i.test(base)) base = `${base}.jpg`
    return base
  } catch {
    return String(url).split('/').pop()
  }
}

/** Local /public path for a given CDN url. */
export function localPath(url) {
  return `/images/${localName(url)}`
}

/**
 * Shopify supports on-the-fly resizing via ?width=. We keep that for the remote
 * fallback so large product shots don't blow up the network on first paint.
 */
export function remoteAt(url, width) {
  if (!width) return url
  return url + (url.includes('?') ? '&' : '?') + `width=${width}`
}
