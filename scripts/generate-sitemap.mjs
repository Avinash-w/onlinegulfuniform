import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const DOMAIN = 'https://evaranest.braintechtools.xyz'

async function load(rel) {
  return import(pathToFileURL(join(root, rel)).href)
}

const { products } = await load('src/data/products.js')
const { nav, footer } = await load('src/data/site.js')

const today = new Date().toISOString().split('T')[0]

// Gather unique collection URLs
const collectionUrls = new Set([
  '/collections/all-products',
  '/collections/all-candles',
  '/collections/jar-candles',
  '/collections/decorative-candles',
  '/collections/festive-candles',
  '/collections/tealights',
  '/collections/home-fragrance',
  '/collections/wax-melts',
  '/collections/diffusers',
  '/collections/diffuser-melts',
  '/collections/body-fragrance',
  '/collections/solid-body-perfume',
  '/collections/perfumed-sanitizers',
  '/collections/custom-orders',
  '/collections/hampers',
  '/collections/new-arrivals',
  '/collections/best-sellers',
])

for (const item of nav) {
  if (item.href && item.href.startsWith('/collections/')) {
    collectionUrls.add(item.href)
  }
  for (const child of item.children || []) {
    if (child.href && child.href.startsWith('/collections/')) {
      collectionUrls.add(child.href)
    }
  }
}

// Gather unique static / policy pages
const staticUrls = new Set([
  '/custom-orders',
  '/pages/about-us',
  '/pages/candle-care',
  '/pages/work-with-us',
  '/policies/shipping-policy',
  '/policies/refund-policy',
  '/policies/terms-of-service',
  '/policies/privacy-policy',
  '/policies/contact-information',
  '/track',
])

let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!-- Homepage -->
  <url>
    <loc>${DOMAIN}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`

// Add Collection Pages
sitemap += `\n  <!-- Collections & Category Pages -->\n`
for (const col of Array.from(collectionUrls)) {
  sitemap += `  <url>
    <loc>${DOMAIN}${col}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>\n`
}

// Add Product Pages with image sitemaps
sitemap += `\n  <!-- Individual Products -->\n`
for (const p of products) {
  const images = (p.images || []).slice(0, 3)
  let imgTags = ''
  for (const img of images) {
    imgTags += `\n    <image:image>
      <image:loc>${img.startsWith('http') ? img : `${DOMAIN}${img}`}</image:loc>
      <image:title><![CDATA[${p.title} - Luxury Handmade Candle by EvaraNest]]></image:title>
    </image:image>`
  }

  sitemap += `  <url>
    <loc>${DOMAIN}/products/${p.handle}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${imgTags}
  </url>\n`
}

// Add Static & Info Pages
sitemap += `\n  <!-- Info, Guides & Policy Pages -->\n`
for (const page of Array.from(staticUrls)) {
  sitemap += `  <url>
    <loc>${DOMAIN}${page}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>\n`
}

sitemap += `</urlset>\n`

// Write public/sitemap.xml
const sitemapPath = join(root, 'public', 'sitemap.xml')
writeFileSync(sitemapPath, sitemap, 'utf-8')
console.log('Successfully generated sitemap at:', sitemapPath)

// Generate robots.txt
const robotsTxt = `# robots.txt for https://evaranest.braintechtools.xyz/
User-agent: *
Allow: /
Allow: /collections/*
Allow: /products/*
Allow: /pages/*
Allow: /policies/*
Allow: /custom-orders
Allow: /track

# Disallow private user & admin endpoints
Disallow: /admin
Disallow: /admin/*
Disallow: /api/*
Disallow: /checkout
Disallow: /account
Disallow: /account/*
Disallow: /login

# Crawl Delay
Crawl-delay: 1

# Sitemap Location
Sitemap: ${DOMAIN}/sitemap.xml
`

const robotsPath = join(root, 'public', 'robots.txt')
writeFileSync(robotsPath, robotsTxt, 'utf-8')
console.log('Successfully generated robots.txt at:', robotsPath)
