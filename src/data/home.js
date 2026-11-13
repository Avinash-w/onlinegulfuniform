// ---------------------------------------------------------------------------
// Homepage + collection chrome — EvaraNest candles.
// ---------------------------------------------------------------------------

const u = (id, w = 1600) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`
const px = (id, w = 1600) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`

export const heroSlides = [
  {
    href: '/collections/scented-candles',
    image: u('photo-1603006905003-be475563bc59'),
    // Local Pexels footage (free license) — poster falls back to the image.
    video: '/videos/candle-timelapse.mp4',
    alt: 'Handcrafted scented candles — EvaraNest',
    banner: false,
    kicker: 'EvaraNest',
    title: 'Light Up\nYour Moments.',
    subtitle: 'Handmade · Luxury · Gift-ready',
    cta: 'Shop Candles',
    align: 'left',
  },
  {
    href: '/collections/gift-hampers',
    image: u('photo-1513885535751-8b9238bd345a'),
    alt: 'Luxury candle gift collection',
    banner: false,
    kicker: 'Gifting',
    title: 'Thoughtfully\nWrapped.',
    subtitle: 'Hampers & personalised pours',
    cta: 'Explore Gifts',
    align: 'right',
  },
  {
    href: '/collections/signature-scents',
    image: u('photo-1602874801007-bd458bb1b8b6'),
    video: '/videos/burning-candles.mp4',
    alt: 'Signature scent collection',
    banner: false,
    kicker: 'Signature Scents',
    title: 'Handcrafted\nScents.',
    subtitle: 'Beautifully made',
    cta: 'Discover Scents',
    align: 'left',
  },
]

export const heroTrustLine = ['HAND-POURED', 'CLEAN BURN', 'GIFT READY']

export const heroQuickLinks = [
  { label: 'ALL PRODUCTS', href: '/collections/all-products' },
  { label: 'CANDLES', href: '/collections/all-candles' },
  { label: 'HOME FRAGRANCE', href: '/collections/home-fragrance' },
  { label: 'BODY FRAGRANCE', href: '/collections/body-fragrance' },
  { label: 'CUSTOM ORDERS', href: '/collections/custom-orders' },
]

export const topCategories = [
  {
    label: 'CANDLES',
    href: '/collections/all-candles',
    image: '/images/categories/candles.jpg',
  },
  {
    label: 'HOME FRAGRANCE',
    href: '/collections/home-fragrance',
    image: '/images/categories/home-fragrance.jpg',
  },
  {
    label: 'BODY FRAGRANCE',
    href: '/collections/body-fragrance',
    image: '/images/categories/body-fragrance.jpg',
  },
  {
    label: 'CUSTOM ORDERS',
    href: '/collections/custom-orders',
    image: '/images/categories/custom-orders.jpg',
  },
  {
    label: 'WAX MELTS',
    href: '/collections/wax-melts',
    image: '/images/categories/wax-melts.jpg',
  },
  {
    label: 'HAMPERS',
    href: '/collections/hampers',
    image: '/images/categories/hampers.jpg',
  },
]

export const aboutBanner = {
  image: px(11434947), // handmade beeswax candles
  kicker: 'Handmade with care',
}

// Signature Scents tiles play looping candle footage (local Pexels clips);
// `image` doubles as the poster/fallback.
export const merch = {
  title: 'SIGNATURE SCENTS',
  tiles: [
    {
      href: '/collections/signature-scents',
      image: u('photo-1603006905003-be475563bc59', 900),
      video: '/videos/candle-closeup.mp4',
      alt: 'Vanilla Amber Glow',
    },
    {
      href: '/products/midnight-oud-candle',
      image: u('photo-1602874801007-bd458bb1b8b6', 900),
      video: '/videos/candle-glow-dark.mp4',
      alt: 'Midnight Oud',
    },
    {
      href: '/products/rose-petal-luxury-candle',
      image: px(11431774, 900),
      video: '/videos/red-candle.mp4',
      alt: 'Rose Petal Luxury',
    },
    {
      href: '/products/champagne-luxe-candle',
      image: px(28260283, 900),
      video: '/videos/candle-dark-room.mp4',
      alt: 'Champagne Luxe',
    },
  ],
  cta: { label: 'VIEW ALL SCENTS', href: '/collections/signature-scents' },
}

export const collectionMeta = {
  'all-products': {
    title: 'All Products',
    banner: u('photo-1603006905003-be475563bc59'),
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Shop All', href: '/collections/all-products' }],
  },
  'all-candles': {
    title: 'All Candles',
    banner: u('photo-1603006905003-be475563bc59'),
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Candles', href: '/collections/all-candles' }],
  },
  'candles': {
    title: 'Candles',
    banner: u('photo-1603006905003-be475563bc59'),
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Candles', href: '/collections/all-candles' }],
  },
  'jar-candles': {
    title: 'Jar Candles',
    banner: px(19769052),
    crumbs: [
      { label: 'Home', href: '/' },
      { label: 'Candles', href: '/collections/all-candles' },
      { label: 'Jar Candles', href: '/collections/jar-candles' },
    ],
  },
  'decorative-candles': {
    title: 'Decorative Candles',
    banner: px(28260283),
    crumbs: [
      { label: 'Home', href: '/' },
      { label: 'Candles', href: '/collections/all-candles' },
      { label: 'Decorative Candles', href: '/collections/decorative-candles' },
    ],
  },
  'festive-candles': {
    title: 'Festive Candles',
    banner: px(19783022),
    crumbs: [
      { label: 'Home', href: '/' },
      { label: 'Candles', href: '/collections/all-candles' },
      { label: 'Festive Candles', href: '/collections/festive-candles' },
    ],
  },
  'tealights': {
    title: 'Tealights',
    banner: px(4612501),
    crumbs: [
      { label: 'Home', href: '/' },
      { label: 'Candles', href: '/collections/all-candles' },
      { label: 'Tealights', href: '/collections/tealights' },
    ],
  },
  'home-fragrance': {
    title: 'Home Fragrance',
    banner: px(3865794),
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Home Fragrance', href: '/collections/home-fragrance' }],
  },
  'wax-melts': {
    title: 'Wax Melts',
    banner: px(6755742),
    crumbs: [
      { label: 'Home', href: '/' },
      { label: 'Home Fragrance', href: '/collections/home-fragrance' },
      { label: 'Wax Melts', href: '/collections/wax-melts' },
    ],
  },
  'diffusers': {
    title: 'Diffusers',
    banner: px(3865794),
    crumbs: [
      { label: 'Home', href: '/' },
      { label: 'Home Fragrance', href: '/collections/home-fragrance' },
      { label: 'Diffusers', href: '/collections/diffusers' },
    ],
  },
  'diffuser-melts': {
    title: 'Diffuser Melts',
    banner: px(11434947),
    crumbs: [
      { label: 'Home', href: '/' },
      { label: 'Home Fragrance', href: '/collections/home-fragrance' },
      { label: 'Diffuser Melts', href: '/collections/diffuser-melts' },
    ],
  },
  'body-fragrance': {
    title: 'Body Fragrance',
    banner: px(28260283),
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Body Fragrance', href: '/collections/body-fragrance' }],
  },
  'solid-body-perfume': {
    title: 'Solid Body Perfume',
    banner: px(28260283),
    crumbs: [
      { label: 'Home', href: '/' },
      { label: 'Body Fragrance', href: '/collections/body-fragrance' },
      { label: 'Solid Body Perfume', href: '/collections/solid-body-perfume' },
    ],
  },
  'perfumed-sanitizers': {
    title: 'Perfumed Sanitizers',
    banner: px(3865794),
    crumbs: [
      { label: 'Home', href: '/' },
      { label: 'Body Fragrance', href: '/collections/body-fragrance' },
      { label: 'Perfumed Sanitizers', href: '/collections/perfumed-sanitizers' },
    ],
  },
  'custom-orders': {
    title: 'Custom Orders',
    banner: u('photo-1513885535751-8b9238bd345a'),
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Custom Orders', href: '/collections/custom-orders' }],
  },
  'customised-candles': {
    title: 'Customised Candles',
    banner: px(6755742),
    crumbs: [
      { label: 'Home', href: '/' },
      { label: 'Custom Orders', href: '/collections/custom-orders' },
      { label: 'Customised Candles', href: '/collections/customised-candles' },
    ],
  },
  'hampers': {
    title: 'Hampers',
    banner: u('photo-1513885535751-8b9238bd345a'),
    crumbs: [
      { label: 'Home', href: '/' },
      { label: 'Custom Orders', href: '/collections/custom-orders' },
      { label: 'Hampers', href: '/collections/hampers' },
    ],
  },
  'bulk-return-gifts': {
    title: 'Bulk & Return Gifts',
    banner: px(11434947),
    crumbs: [
      { label: 'Home', href: '/' },
      { label: 'Custom Orders', href: '/collections/custom-orders' },
      { label: 'Bulk & Return Gifts', href: '/collections/bulk-return-gifts' },
    ],
  },
  'signature-scents': {
    title: 'Signature Scents',
    banner: u('photo-1603006905003-be475563bc59'),
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Signature Scents', href: '/collections/signature-scents' }],
  },
  'new-arrivals': {
    title: 'New Arrivals',
    banner: px(4612501),
    crumbs: [{ label: 'Home', href: '/' }, { label: 'New Arrivals', href: '/collections/new-arrivals' }],
  },
  'best-sellers': {
    title: 'Bestsellers',
    banner: u('photo-1603006905003-be475563bc59'),
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Bestsellers', href: '/collections/best-sellers' }],
  },
  'scented-candles': {
    title: 'Scented Candles',
    banner: u('photo-1603006905003-be475563bc59'),
    crumbs: [{ label: 'Home', href: '/' }],
  },
  'soy-wax-candles': {
    title: 'Soy Wax Candles',
    banner: px(6755742),
    crumbs: [{ label: 'Home', href: '/' }],
  },
  'beeswax-candles': {
    title: 'Beeswax Candles',
    banner: px(11434947),
    crumbs: [{ label: 'Home', href: '/' }],
  },
  'pillar-candles': {
    title: 'Pillar Candles',
    banner: px(4612501),
    crumbs: [{ label: 'Home', href: '/' }],
  },
  'floral-candles': {
    title: 'Floral Candles',
    banner: px(11431774),
    crumbs: [{ label: 'Home', href: '/' }],
  },
  'dessert-candles': {
    title: 'Dessert Candles',
    banner: px(19783022),
    crumbs: [{ label: 'Home', href: '/' }],
  },
  'luxury-candles': {
    title: 'Luxury Candles',
    banner: u('photo-1602874801007-bd458bb1b8b6'),
    crumbs: [{ label: 'Home', href: '/' }],
  },
  'gift-hampers': {
    title: 'Gift Hampers',
    banner: u('photo-1513885535751-8b9238bd345a'),
    crumbs: [{ label: 'Home', href: '/' }],
  },
  'personalised-candles': {
    title: 'Personalised Candles',
    banner: px(6755742),
    crumbs: [{ label: 'Home', href: '/' }],
  },
}

export const filterGroups = [
  {
    name: 'Price',
    options: ['Under ₹699', '₹699 - ₹999', '₹999 - ₹1499', 'Above ₹1499'],
  },
  {
    name: 'Category',
    options: [
      'Candles',
      'Home Fragrance',
      'Body Fragrance',
      'Custom Orders',
      'Jar Candles',
      'Decorative Candles',
      'Festive Candles',
      'Tealights',
      'Wax Melts',
      'Diffusers',
      'Diffuser Melts',
      'Solid Body Perfume',
      'Perfumed Sanitizers',
      'Customised Candles',
      'Hampers',
      'Bulk & Return Gifts',
    ],
  },
  {
    name: 'Occasion',
    options: ['Everyday', 'Gifting', 'Anniversary', 'Celebration', 'Relaxation', 'Festive', 'Evening', 'Meditation'],
  },
  {
    name: 'Wax Type',
    options: ['Soy Wax', 'Beeswax', 'Coconut Wax', 'Paraffin'],
  },
  {
    name: 'Fragrance',
    options: [
      'Vanilla',
      'Rose',
      'Lavender',
      'Jasmine',
      'Sandalwood',
      'Oud',
      'Cinnamon',
      'Coffee',
      'Ocean',
      'Musk',
      'Floral',
      'Fruity',
      'Woody',
      'Fresh',
    ],
  },
  {
    name: 'Color',
    options: ['Amber', 'Ivory', 'Blush', 'Charcoal', 'Cream', 'Gold', 'Honey', 'Pearl'],
  },
  { name: 'Availability', options: ['In stock', 'Out of stock'] },
]

export const colorSwatches = {
  Amber: '#B8895A',
  Ivory: '#F5F0E6',
  Blush: '#E8C4C4',
  Charcoal: '#2F2A26',
  Cream: '#F7F3ED',
  Gold: '#B89B5E',
  Honey: '#C4A35A',
  Pearl: '#F2EDE6',
  Lilac: '#C5B4D6',
  Terracotta: '#C4785A',
  Seafoam: '#A8C5C0',
  Sand: '#D4C4A8',
  Espresso: '#4A3728',
  Forest: '#3D4F3F',
  Berry: '#8B3A4A',
  Assorted: '#8B6F5A',
  Custom: '#B89B5E',
  'Blush Pink': '#E8B4B8',
}

export const sortOptions = [
  'Featured',
  'New Arrivals',
  'Best Selling',
  'Price Low to High',
  'Price High to Low',
]

export const offers = [
  {
    title: 'Shop for ₹999 & get free shipping',
    sub: 'Prepaid & COD orders across India',
    apply: '*Auto-applied at checkout',
    terms: ['Offer valid on eligible pin codes.', 'Gift wrap charged separately when selected.'],
  },
  {
    title: 'Gift wrap available',
    sub: 'Add a handwritten note at checkout',
    apply: '*Select gift wrap in cart',
    terms: ['Personalised candles may take 3–5 extra days.'],
  },
]

export const reviewSummary = {
  average: 4.8,
  total: 214,
  distribution: [
    { stars: 5, pct: 78, count: 167 },
    { stars: 4, pct: 16, count: 34 },
    { stars: 3, pct: 4, count: 8 },
    { stars: 2, pct: 1, count: 3 },
    { stars: 1, pct: 1, count: 2 },
  ],
  items: [
    { name: 'Ananya M.', body: 'The Vanilla Amber Glow fills the room gently — not overpowering at all.' },
    { name: 'Rohit K.', body: 'Gifted the hamper. Packaging felt premium and the candles burned evenly.' },
    { name: 'Meera S.', body: 'Midnight Oud is gorgeous for evenings. Will reorder.' },
    { name: 'Priya D.', body: 'Loved the personalised jar for our wedding favours.' },
    { name: 'Kabir A.', title: 'Beautiful burn', body: 'Clean soy wax, soft scent throw. Exactly what I wanted.' },
  ],
}

export const whyChoose = [
  {
    title: 'Hand-poured',
    body: 'Small-batch candles crafted with care — never mass-pressed.',
    image: px(19783022, 600), // melting wax on vintage holder
  },
  {
    title: 'Clean ingredients',
    body: 'Premium soy & beeswax blends with thoughtfully composed fragrances.',
    image: px(6755742, 600), // white soy candle
  },
  {
    title: 'Gift-ready',
    body: 'Elegant packaging and personalised options for every occasion.',
    image: u('photo-1513885535751-8b9238bd345a', 600), // gift boxes
  },
  {
    title: 'Made in India',
    body: 'A D2C atelier focused on warmth, scent, and lasting quality.',
    image: px(28260283, 600), // golden candle
  },
]
