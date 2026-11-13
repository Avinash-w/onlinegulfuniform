/**
 * Licensed image search for admin "Find Product Image".
 * Uses Unsplash API when VITE_UNSPLASH_ACCESS_KEY is set.
 * Docs: https://unsplash.com/documentation
 */

const UNSPLASH = 'https://api.unsplash.com'

export function buildImageQuery(product = {}) {
  const bits = [
    product.title,
    product.category,
    product.fragrance || product.scent,
    product.waxType || product.material,
    product.productType === 'candle' || !product.productType ? 'luxury handmade candle' : '',
    product.productType === 'clothing' ? 'apparel product photography' : '',
    'premium product photo',
  ]
    .filter(Boolean)
    .join(' ')
  return bits.replace(/\s+/g, ' ').trim()
}

export function getUnsplashKey() {
  return import.meta.env.VITE_UNSPLASH_ACCESS_KEY?.trim() || ''
}

/**
 * @returns {Promise<Array<{ id: string, url: string, thumb: string, alt: string, credit: string }>>}
 */
export async function searchProductImages(query, { perPage = 8 } = {}) {
  const key = getUnsplashKey()
  if (!key) {
    throw new Error(
      'Add VITE_UNSPLASH_ACCESS_KEY to your .env file (free key at https://unsplash.com/developers).'
    )
  }

  const url = new URL(`${UNSPLASH}/search/photos`)
  url.searchParams.set('query', query)
  url.searchParams.set('per_page', String(perPage))
  url.searchParams.set('orientation', 'squarish')

  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${key}` },
  })
  if (!res.ok) throw new Error(`Unsplash error ${res.status}`)

  const data = await res.json()
  return (data.results || []).map((photo) => ({
    id: photo.id,
    url: photo.urls?.regular || photo.urls?.full,
    thumb: photo.urls?.small || photo.urls?.thumb,
    alt: photo.alt_description || query,
    credit: photo.user?.name ? `${photo.user.name} / Unsplash` : 'Unsplash',
  }))
}

/** Browser-safe: fetch remote image → data URL for localStorage product media. */
export async function imageUrlToDataUrl(imageUrl) {
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error('Failed to download image')
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
