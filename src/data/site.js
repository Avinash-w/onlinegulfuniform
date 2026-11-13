// ---------------------------------------------------------------------------
// Global chrome: announcement bar, navigation, footer, static assets.
// EvaraNest — Luxury Handmade Candles & Gifting
// ---------------------------------------------------------------------------

export const assets = {
  logo: '/logo.png',
  placeholder: '/logo.png',
}

export const announcements = [
  'SHOP FOR ₹999 & GET FREE SHIPPING',
  'HAND-POURED IN SMALL BATCHES',
  'GIFT WRAP AVAILABLE AT CHECKOUT',
  'PERSONALISED CANDLES — MADE TO ORDER',
]

export const marqueeText = 'LIGHT UP YOUR MOMENTS'

export const nav = [
  {
    label: 'HOME',
    href: '/',
  },
  {
    label: 'SHOP ALL',
    href: '/collections/all-products',
    children: [
      { label: 'All Products', href: '/collections/all-products' },
    ],
  },
  {
    label: 'CANDLES',
    href: '/collections/all-candles',
    children: [
      { label: 'All Candles', href: '/collections/all-candles' },
      { label: 'Jar Candles', href: '/collections/jar-candles' },
      { label: 'Decorative Candles', href: '/collections/decorative-candles' },
      { label: 'Festive Candles', href: '/collections/festive-candles' },
      { label: 'Tealights', href: '/collections/tealights' },
    ],
  },
  {
    label: 'HOME FRAGRANCE',
    href: '/collections/home-fragrance',
    children: [
      { label: 'Wax Melts', href: '/collections/wax-melts' },
      { label: 'Diffusers', href: '/collections/diffusers' },
      { label: 'Diffuser Melts', href: '/collections/diffuser-melts' },
    ],
  },
  {
    label: 'BODY FRAGRANCE',
    href: '/collections/body-fragrance',
    children: [
      { label: 'Solid Body Perfume', href: '/collections/solid-body-perfume' },
      { label: 'Perfumed Sanitizers', href: '/collections/perfumed-sanitizers' },
    ],
  },
  {
    label: 'CUSTOM ORDERS',
    href: '/collections/custom-orders',
  },
]

export const supportLinks = {
  whatsapp:
    'https://api.whatsapp.com/send/?phone=7046735536&text=Hi+EvaraNest&type=phone_number&app_absent=0',
  returns: '/policies/refund-policy',
  instagram: 'https://www.instagram.com/evaranest_candles/',
}

export const footer = {
  columns: [
    {
      title: 'Shop',
      links: [
        { label: 'All Products', href: '/collections/all-products' },
        { label: 'Candles', href: '/collections/all-candles' },
        { label: 'Jar Candles', href: '/collections/jar-candles' },
        { label: 'Home Fragrance', href: '/collections/home-fragrance' },
        { label: 'Wax Melts', href: '/collections/wax-melts' },
        { label: 'Body Fragrance', href: '/collections/body-fragrance' },
        { label: 'Custom Orders', href: '/collections/custom-orders' },
        { label: 'Hampers', href: '/collections/hampers' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About EvaraNest', href: '/pages/about-us' },
        { label: 'Privacy Policy', href: '/policies/privacy-policy' },
        { label: 'Terms & Conditions', href: '/policies/terms-of-service' },
        { label: 'Work with Us', href: '/pages/work-with-us' },
      ],
    },
    {
      title: 'Help',
      links: [
        { label: 'Contact Us', href: '/policies/contact-information' },
        { label: 'Shipping Policy', href: '/policies/shipping-policy' },
        { label: 'Refund Policy', href: '/policies/refund-policy' },
        { label: 'Track Order', href: '/track' },
        { label: 'Candle Care', href: '/pages/candle-care' },
      ],
    },
  ],
  copyright: 'Copyright © EvaraNest',
}
