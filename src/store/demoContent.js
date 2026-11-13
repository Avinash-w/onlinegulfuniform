// ---------------------------------------------------------------------------
// DEV-ONLY (used by `npm run seed:export`, never imported at runtime).
// Default storefront CMS payload — copied into seed.state.content so the admin
// can edit hero, filters, collections, homepage sections, site chrome, etc.
// ---------------------------------------------------------------------------

import {
  aboutBanner,
  collectionMeta,
  colorSwatches,
  filterGroups,
  heroQuickLinks,
  heroSlides,
  heroTrustLine,
  merch,
  offers,
  reviewSummary,
  sortOptions,
  topCategories,
  whyChoose,
} from '../data/home.js'
import {
  announcements,
  footer as siteFooter,
  marqueeText,
  supportLinks,
} from '../data/site.js'
import { candleCare, manufacturer } from '../data/products.js'

function clone(v) {
  return JSON.parse(JSON.stringify(v))
}

const defaultPages = [
  {
    id: 'page-about-us',
    path: '/pages/about-us',
    title: 'About EvaraNest',
    body: 'EvaraNest is a luxury handmade candle atelier crafting soy wax, beeswax and signature scent collections for everyday warmth and thoughtful gifting.\n\nEvery pour is made in small batches in India — clean ingredients, gift-ready packaging, and fragrances composed to feel personal.',
  },
  {
    id: 'page-work-with-us',
    path: '/pages/work-with-us',
    title: 'Work with Us',
    body: 'We partner with stylists, event planners, and retailers who share a love for calm, scented spaces.\n\nWrite to us via Contact for collaborations, wholesale, or custom pours.',
  },
  {
    id: 'page-candle-care',
    path: '/pages/candle-care',
    title: 'Candle Care',
    body: 'Trim the wick to 5mm before every burn.\n\nAllow the wax pool to reach the edges on the first burn (2–3 hours).\n\nNever burn for more than 4 hours at a time.\n\nKeep away from drafts, pets, and flammable materials.\n\nDiscontinue use when 1cm of wax remains.',
  },
  {
    id: 'page-privacy',
    path: '/policies/privacy-policy',
    title: 'Privacy Policy',
    body: 'We collect only what we need to fulfil orders, improve the storefront, and support you — name, contact details, shipping address, and order history.\n\nWe do not sell personal data. Payment details are processed by our payment partner and are not stored on this site.',
  },
  {
    id: 'page-terms',
    path: '/policies/terms-of-service',
    title: 'Terms & Conditions',
    body: 'By placing an order with EvaraNest you agree that product colours may vary slightly from screen to life, personalised items are final sale unless damaged, and delivery timelines are estimates subject to courier partners.',
  },
  {
    id: 'page-contact',
    path: '/policies/contact-information',
    title: 'Contact Us',
    body: 'Reach us on WhatsApp for the fastest reply, or email hello@evaranest.in.\n\nWe typically respond within one business day.',
  },
  {
    id: 'page-shipping',
    path: '/policies/shipping-policy',
    title: 'Shipping Policy',
    body: 'Orders leave our atelier within 1–2 business days.\n\nMetros usually arrive in 2–4 days; rest of India in 3–6 days.\n\nFree shipping applies on eligible prepaid & COD orders above the threshold shown on the storefront.',
  },
  {
    id: 'page-refund',
    path: '/policies/refund-policy',
    title: 'Refund Policy',
    body: 'Unused items may be returned or exchanged within 7 days of delivery.\n\nPersonalised candles are final sale unless damaged in transit.\n\nApproved refunds are processed to the original payment method.',
  },
]

export const defaultInvoiceSettings = {
  companyName: 'EvaraNest Lifestyle Pvt. Ltd.',
  brandName: 'EvaraNest',
  tagline: 'Handmade Luxury Candles & Artisanal Fragrances',
  logo: '/logo/evaranest-logo.png',
  gstin: '07AAAAA0000A1Z5',
  pan: 'AAAAA0000A',
  cin: 'U74999DL2023PTC123456',
  
  // Registered Business Address
  addressLine1: 'Plot No. 42, Okhla Industrial Area Phase-III',
  addressLine2: 'Near Crown Plaza, South Delhi',
  city: 'New Delhi',
  state: 'Delhi',
  stateCode: '07',
  pincode: '110020',
  country: 'India',
  
  // Contact
  phone: '+91 98765 43210',
  email: 'care@evaranest.com',
  website: 'www.evaranest.com',
  
  // Invoice Format & Tax Defaults
  invoicePrefix: 'INV-2024-',
  invoiceNumberDigits: 5,
  defaultHsn: '34060010',
  taxType: 'inclusive', // 'inclusive' | 'exclusive'
  defaultGstRate: 18,
  enableInterStateGst: true,
  showTaxBreakupTable: true,
  
  // Bank & UPI Details
  bankName: 'HDFC Bank Ltd.',
  accountHolder: 'EvaraNest Lifestyle Pvt. Ltd.',
  accountNumber: '50200012345678',
  ifscCode: 'HDFC0001234',
  branch: 'Okhla Phase-III, New Delhi',
  upiId: 'evaranest@hdfcbank',
  upiPayeeName: 'EvaraNest Lifestyle',
  qrCodeType: 'auto', // 'auto' | 'custom'
  qrCodeUrl: '',
  showQrCode: true,
  
  // Authorized Signatory
  authorizedSignatoryName: 'Authorized Signatory',
  authorizedSignatoryTitle: 'For EvaraNest Lifestyle Pvt. Ltd.',
  signatureUrl: '',
  
  // Notes & Terms
  invoiceNotes: 'Thank you for shopping with EvaraNest! We hope our artisanal fragrances bring warmth and calm to your home.',
  termsAndConditions: '1. Goods once sold are covered under our 7-day return policy as per terms.\n2. All disputes are subject to New Delhi jurisdiction only.\n3. This is a computer-generated tax invoice and requires no physical signature.',
  
  // Toggles & Theme
  showLogo: true,
  showBankDetails: true,
  showAuthorizedSignature: true,
  showTerms: true,
  themeColor: '#4849E8',
}

export function buildStorefrontContent() {
  return {
    invoice: clone(defaultInvoiceSettings),
    announcements: clone(announcements),
    heroSlides: clone(heroSlides).map((s, i) => ({ id: `hero-${i + 1}`, ...s })),
    heroTrustLine: clone(heroTrustLine),
    heroQuickLinks: clone(heroQuickLinks).map((l, i) => ({ id: `ql-${i + 1}`, ...l })),
    topCategories: clone(topCategories).map((c, i) => ({ id: `tc-${i + 1}`, ...c })),
    aboutBanner: clone(aboutBanner),
    merch: {
      ...clone(merch),
      tiles: clone(merch.tiles).map((t, i) => ({ id: `mt-${i + 1}`, ...t })),
    },
    collectionMeta: clone(collectionMeta),
    filterGroups: clone(filterGroups).map((g, i) => ({ id: `fg-${i + 1}`, ...g })),
    colorSwatches: clone(colorSwatches),
    sortOptions: clone(sortOptions),
    offers: clone(offers).map((o, i) => ({ id: `off-${i + 1}`, ...o })),
    reviewSummary: clone(reviewSummary),
    whyChoose: clone(whyChoose).map((w, i) => ({ id: `wc-${i + 1}`, ...w })),

    site: {
      brandName: 'EvaraNest',
      logo: '/logo/evaranest-logo.png',
      freeShippingAt: 999,
      minOrderAmount: 500,
      shippingFlat: 49,
      marqueeText,
      whatsapp: supportLinks.whatsapp,
      returns: supportLinks.returns,
      instagram: supportLinks.instagram,
    },

    footer: {
      ...clone(siteFooter),
      blurb:
        'Trendy handmade candles & home fragrance — soy wax, beeswax, luxury gifts and signature scents.',
      newsletterTitle: 'Join our\nEvaraNest circle',
      newsletterDone: "You're in! Watch your inbox for new drops & offers.",
      spotUsLabel: 'Spot us on',
    },

    trustMarkers: [
      { id: 'tm-1', icon: 'truck', title: 'Free Shipping', sub: 'On orders above ₹999' },
      { id: 'tm-2', icon: 'refresh', title: 'Easy Returns', sub: '7-day hassle-free' },
      { id: 'tm-3', icon: 'star', title: 'Hand-Poured', sub: 'Small-batch quality' },
      { id: 'tm-4', icon: 'whatsapp', title: 'Easy Support', sub: 'We reply fast' },
    ],

    homeRails: {
      newArrivals: {
        title: 'New Arrivals',
        ctaLabel: 'View all new arrivals',
        ctaHref: '/collections/new-arrivals',
      },
      bestsellers: {
        title: 'Bestsellers',
        ctaLabel: 'View all bestsellers',
        ctaHref: '/collections/best-sellers',
      },
      why: {
        title: 'Why EvaraNest',
        subtitle:
          'Luxury handmade candles crafted to bring warmth, fragrance and elegance into every space.',
        primaryCta: { label: 'Shop Candles', href: '/collections/all-candles' },
        secondaryCta: { label: 'Explore Custom Orders', href: '/collections/custom-orders' },
      },
    },

    pdp: {
      countdownEnabled: true,
      countdownLabel: 'Sale ends in',
      countdownMinutes: 10,
      countdownSeconds: 30,
      shippingSubtitle: 'Free shipping on orders above ₹999',
      shippingDispatch: 'Orders leave our atelier within 1–2 business days.',
      shippingDelivery: 'Metros 2–4 days · Rest of India 3–6 days.',
      returnsSubtitle: '7-day returns on unused items',
      returnsBody:
        'Items purchased from EvaraNest are eligible for return/exchange if returned unused within 7 days of delivery. Personalised candles are final sale unless damaged.',
      candleCare: clone(candleCare),
      manufacturer: clone(manufacturer),
    },

    pages: clone(defaultPages),
  }
}

/** Fill missing CMS keys only if undefined in DB payload (preserves deletions). */
export function mergeContentDefaults(content) {
  const defaults = buildStorefrontContent()
  if (!content || typeof content !== 'object' || Object.keys(content).length === 0) {
    return defaults
  }
  return {
    ...defaults,
    ...content,
    invoice: content.invoice !== undefined ? content.invoice : defaults.invoice,
    site: content.site !== undefined ? { ...defaults.site, ...content.site } : defaults.site,
    footer: content.footer !== undefined ? content.footer : defaults.footer,
    trustMarkers: content.trustMarkers !== undefined ? content.trustMarkers : defaults.trustMarkers,
    homeRails: content.homeRails !== undefined ? { ...defaults.homeRails, ...content.homeRails } : defaults.homeRails,
    pdp: content.pdp !== undefined ? { ...defaults.pdp, ...content.pdp } : defaults.pdp,
    pages: content.pages !== undefined ? content.pages : defaults.pages,
    whyChoose: content.whyChoose !== undefined ? content.whyChoose : defaults.whyChoose,
    reviewSummary: content.reviewSummary !== undefined ? content.reviewSummary : defaults.reviewSummary,
    heroSlides: content.heroSlides !== undefined ? content.heroSlides : defaults.heroSlides,
    heroTrustLine: content.heroTrustLine !== undefined ? content.heroTrustLine : defaults.heroTrustLine,
    heroQuickLinks: content.heroQuickLinks !== undefined ? content.heroQuickLinks : defaults.heroQuickLinks,
    topCategories: content.topCategories !== undefined ? content.topCategories : defaults.topCategories,
    collectionMeta: content.collectionMeta !== undefined ? content.collectionMeta : defaults.collectionMeta,
    filterGroups: content.filterGroups !== undefined ? content.filterGroups : defaults.filterGroups,
    colorSwatches: content.colorSwatches !== undefined ? content.colorSwatches : defaults.colorSwatches,
    sortOptions: content.sortOptions !== undefined ? content.sortOptions : defaults.sortOptions,
    offers: content.offers !== undefined ? content.offers : defaults.offers,
    announcements: content.announcements !== undefined ? content.announcements : defaults.announcements,
  }
}
