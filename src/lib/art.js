// ---------------------------------------------------------------------------
// Inline SVG artwork helpers (admin “new product” placeholders, data-URI checks).
//
// When a product has no photography yet, we generate a tiny illustration as a
// data URI so grids never show broken images. Replace with real photos anytime.
// ---------------------------------------------------------------------------

const SHAPES = {
  candle: (a, b) => `
    <rect x="150" y="300" width="100" height="46" rx="8" fill="${b}" opacity=".35"/>
    <rect x="146" y="196" width="108" height="150" rx="14" fill="${a}"/>
    <rect x="146" y="196" width="108" height="34" rx="14" fill="${b}" opacity=".55"/>
    <path d="M200 196v-22" stroke="${b}" stroke-width="5" stroke-linecap="round"/>
    <path d="M200 174c11-9 8-24 0-32-8 8-11 23 0 32z" fill="${b}"/>
    <circle cx="200" cy="272" r="26" fill="#fff" opacity=".22"/>`,

  jar: (a, b) => `
    <ellipse cx="200" cy="336" rx="72" ry="12" fill="${b}" opacity=".25"/>
    <path d="M140 214h120v92a34 34 0 0 1-34 34h-52a34 34 0 0 1-34-34z" fill="${a}"/>
    <rect x="132" y="192" width="136" height="30" rx="12" fill="${b}" opacity=".6"/>
    <path d="M172 250h56" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".45"/>`,

  vase: (a, b) => `
    <ellipse cx="200" cy="340" rx="60" ry="11" fill="${b}" opacity=".25"/>
    <path d="M176 150h48l-10 46c26 16 42 40 42 68 0 42-35 72-56 72s-56-30-56-72c0-28 16-52 42-68z" fill="${a}"/>
    <path d="M200 150c-6-26 8-46 26-56" stroke="${b}" stroke-width="6" fill="none" stroke-linecap="round"/>
    <circle cx="232" cy="90" r="13" fill="${b}"/>
    <circle cx="206" cy="74" r="9" fill="${b}" opacity=".7"/>`,

  cushion: (a, b) => `
    <rect x="96" y="150" width="208" height="196" rx="34" fill="${a}"/>
    <rect x="126" y="180" width="148" height="136" rx="20" fill="${b}" opacity=".35"/>
    <path d="M150 248h100M150 214h100M150 282h100" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".5"/>`,

  planter: (a, b) => `
    <ellipse cx="200" cy="344" rx="66" ry="11" fill="${b}" opacity=".25"/>
    <path d="M142 224h116l-14 108a14 14 0 0 1-14 12h-60a14 14 0 0 1-14-12z" fill="${a}"/>
    <rect x="132" y="204" width="136" height="28" rx="10" fill="${b}" opacity=".55"/>
    <path d="M200 204c0-42 22-70 54-82-6 44-24 70-54 82z" fill="${b}"/>
    <path d="M200 204c0-32-18-54-42-64 5 34 19 54 42 64z" fill="${b}" opacity=".65"/>`,

  frame: (a, b) => `
    <rect x="104" y="118" width="192" height="240" rx="10" fill="${a}"/>
    <rect x="128" y="142" width="144" height="192" rx="6" fill="#fff" opacity=".85"/>
    <circle cx="176" cy="196" r="20" fill="${b}" opacity=".7"/>
    <path d="M136 300l52-62 34 40 24-26 26 48z" fill="${b}" opacity=".55"/>`,
}

/**
 * @param {'candle'|'jar'|'vase'|'cushion'|'planter'|'frame'} shape
 * @param {string} bg      page-background tint
 * @param {string} accent  main object colour
 * @param {string} deep    shadow / detail colour
 */
export function art(shape, bg, accent, deep) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">
    <rect width="400" height="500" fill="${bg}"/>
    <circle cx="200" cy="230" r="132" fill="#fff" opacity=".35"/>
    <g transform="translate(0 60)">${(SHAPES[shape] || SHAPES.candle)(accent, deep)}</g>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`
}

export const isDataUri = (u) => typeof u === 'string' && u.startsWith('data:')
