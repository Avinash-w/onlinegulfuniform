#!/usr/bin/env node
/**
 * Downloads every image referenced in src/data/* into public/images.
 *
 *   npm run fetch:images
 *
 * Filenames match `localName()` in src/lib/img.js exactly, so once this
 * finishes the app serves everything locally and needs no network at all.
 * Already-downloaded files are skipped, so re-running is cheap.
 */

import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'images')
const dataDir = join(root, 'src', 'data')

const CONCURRENCY = 8

function localName(url) {
  const { pathname } = new URL(url)
  let base = pathname.split('/').pop() || 'image'
  base = decodeURIComponent(base).replace(/[^a-zA-Z0-9._-]/g, '_')
  if (!/\.(jpe?g|png|gif|svg|webp|avif)$/i.test(base)) base = `${base}.jpg`
  return base
}

/** Walk every exported value in the data modules and collect http(s) strings. */
function collect(value, out) {
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value)) {
      if (/\.(jpe?g|png|gif|svg|webp|avif)(\?|$)/i.test(value)) out.add(value)
      else if (/images\.unsplash\.com/i.test(value) || /images\.pexels\.com/i.test(value)) out.add(value)
    }
    return
  }
  if (Array.isArray(value)) return value.forEach((v) => collect(v, out))
  if (value && typeof value === 'object') return Object.values(value).forEach((v) => collect(v, out))
}

async function gatherUrls() {
  const urls = new Set()
  for (const file of await readdir(dataDir)) {
    if (!file.endsWith('.js')) continue
    const mod = await import(pathToFileURL(join(dataDir, file)).href)
    collect(mod, urls)
  }
  return [...urls]
}

async function download(url) {
  const name = localName(url)
  const dest = join(outDir, name)

  if (existsSync(dest) && (await stat(dest)).size > 0) return { name, skipped: true }

  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (evaranest asset fetcher)' },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)

  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(dest, buf)
  return { name, bytes: buf.length }
}

async function main() {
  await mkdir(outDir, { recursive: true })

  const urls = await gatherUrls()
  console.log(`Found ${urls.length} image urls → ${outDir}\n`)

  let ok = 0
  let skipped = 0
  const failures = []

  const queue = [...urls]
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const url = queue.shift()
      try {
        const r = await download(url)
        if (r.skipped) {
          skipped++
          process.stdout.write('·')
        } else {
          ok++
          process.stdout.write('.')
        }
      } catch (err) {
        failures.push({ url, message: err.message })
        process.stdout.write('x')
      }
    }
  })

  await Promise.all(workers)

  console.log(`\n\n  downloaded ${ok}   already present ${skipped}   failed ${failures.length}`)
  if (failures.length) {
    console.log('\nFailed:')
    for (const f of failures) console.log(`  ${f.message}  ${f.url}`)
    console.log('\n(The app falls back to the live CDN for anything that failed.)')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
