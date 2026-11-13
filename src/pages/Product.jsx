import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AmazonTrustStrip from '../components/AmazonTrustStrip'
import ProductRail from '../components/ProductRail'
import Seo from '../components/Seo'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { useStore } from '../store/StoreContext.jsx'
import { allProducts, isCustomProduct, productByHandle } from '../store/selectors.js'
import { Share, Whatsapp } from '../components/icons'

export default function Product() {
  const { handle } = useParams()
  const { state } = useStore()
  const catalogue = allProducts(state)
  const product = productByHandle(state, handle) ?? catalogue[0]
  const { lines = [], add } = useCart()
  const { t, lang } = useLanguage()
  const navigate = useNavigate()

  const [active, setActive] = useState(0)
  const [size, setSize] = useState(null)
  const [colour, setColour] = useState(null)
  const [fragrance, setFragrance] = useState(null)
  const [qty, setQty] = useState(1)
  const [customNote, setCustomNote] = useState('')
  const [noteError, setNoteError] = useState('')
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const sizeRef = useRef(null)
  const noteRef = useRef(null)

  useEffect(() => {
    setActive(0)
    setSize(null)
    setCustomNote('')
    setNoteError('')
    window.scrollTo({ top: 0 })
  }, [handle])

  const media = useMemo(
    () => [
      ...(product?.images ?? []).map((src) => ({ type: 'image', src })),
      ...(product?.videos ?? []).map((src) => ({ type: 'video', src })),
    ],
    [product]
  )

  const related = useMemo(
    () =>
      catalogue
        .filter((p) => p.handle !== product?.handle)
        .slice(0, 8),
    [catalogue, product]
  )

  const whatsappBulkUrl = useMemo(() => {
    const phone = '8546063989'
    const productUrl = typeof window !== 'undefined' ? window.location.href : ''
    const text = `Hi EvaraNest, I want to inquire about a Bulk Order on Amazon Store for:\n*${product?.title || ''}*\nPrice: ₹${product?.price || 0}\nSKU: ${product?.sku || 'N/A'}\nLink: ${productUrl}`
    return `https://api.whatsapp.com/send?phone=91${phone}&text=${encodeURIComponent(text)}`
  }, [product])

  if (!product && !state.catalogReady) {
    return (
      <div className="container py-12 animate-pulse bg-white">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-5 h-[400px] bg-slate-200 rounded" />
          <div className="md:col-span-4 space-y-4">
            <div className="h-6 bg-slate-200 rounded w-3/4" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
            <div className="h-24 bg-slate-200 rounded" />
          </div>
          <div className="md:col-span-3 h-[300px] bg-slate-200 rounded" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container py-20 text-center bg-white">
        <p className="font-sans text-2xl font-bold text-slate-800">Product not found</p>
        <Link to="/" className="mt-6 inline-block rounded bg-[#1D4ED8] px-6 py-2 text-xs font-bold text-white shadow">
          {t('home')}
        </Link>
      </div>
    )
  }

  const colorOptions = product.colors ?? []
  const fragranceOptions = product.fragrances ?? []
  const hasChoices = colorOptions.length > 0 || fragranceOptions.length > 0
  const needsSize = (product.sizes?.length ?? 0) > 0
  const pendingChoice = hasChoices
    ? (colorOptions.length > 0 && !colour) || (fragranceOptions.length > 0 && !fragrance)
    : needsSize && !size
  const choiceSize = [colour, fragrance].filter(Boolean).join(' · ')
  const isCustom = isCustomProduct(product)

  const discountPercent = product.compareAt && product.compareAt > product.price
    ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
    : 32

  const mrp = product.compareAt || Math.round(product.price * 1.45)

  const addToBag = (redirect = false) => {
    if (pendingChoice) {
      sizeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (isCustom && !customNote.trim()) {
      setNoteError('Please enter your customization requirements.')
      noteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setNoteError('')
    for (let k = 0; k < qty; k++) {
      add({
        handle: product.handle,
        title: product.title,
        image: product.images[0],
        price: product.price,
        compareAt: product.compareAt,
        size: hasChoices ? choiceSize : needsSize ? size : 'Standard',
        customNote: isCustom ? customNote.trim() : undefined,
      })
    }
    if (redirect) {
      navigate('/checkout')
    }
  }

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  // Multilingual Amazon bullet points
  const bulletPoints = [
    lang === 'ar'
      ? '【أقمشة متينة فاخرة】: مصنوع من أجود خامات البوليستر والقطن المقاوم للاهتراء مع خياطة مدعمة للارتداء المدرسي والعملي اليومي.'
      : lang === 'ml'
      ? '【പ്രീമിയം ഗുണനിലവാരം】: സ്കൂൾ, വ്യാവസായിക ആവശ്യങ്ങൾക്കായി ഈടുനിൽക്കുന്ന മികച്ച പോളികോട്ടൺ തുണിത്തരത്തിൽ തയ്ച്ചെടുത്തത്.'
      : '【PREMIUM UNIFORM FABRIC】: Crafted from high-grade durable poly-cotton twill with reinforced double stitching for long-lasting school & workplace endurance.',

    lang === 'ar'
      ? '【راحة وتهوية طوال اليوم】: مصمم لتوفير أقصى درجات حرية الحركة مع نسيج مسامي لطيف على البشرة يمتص الرطوبة ويبقي الطلاب في قمة الانتعاش.'
      : lang === 'ml'
      ? '【ദിവസം മുഴുവൻ സൗകര്യം】: കഠിനമായ ചൂടിലും വിയർപ്പ് വലിച്ചെടുത്ത് തണുപ്പും ആശ്വാസവും നൽകുന്ന ബ്രീത്തബിൾ മെറ്റീരിയൽ.'
      : '【ALL-DAY BREATHABLE COMFORT】: Engineered for freedom of movement and moisture control. Keeps students and workers fresh and comfortable all day.',

    lang === 'ar'
      ? '【سهولة العناية ومقاومة البقع】: مقاوم للتجعد وثبات تام للألوان حتى مع الغسيل المتكرر والغسيل الآلي الأسبوعي.'
      : lang === 'ml'
      ? '【എളുപ്പത്തിൽ കഴുകാം】: ചുളിവുകൾ വീഴാത്തതും നിറം മങ്ങാത്തതുമായ വാഷ് ആന്റ് വെയർ തുണിത്തരം.'
      : '【EASY CARE & WRINKLE RESISTANT】: Machine washable with color-lock technology. Retains its sharp press and vibrant hue through frequent wash cycles.',

    lang === 'ar'
      ? '【جاهز للمدارس والمؤسسات】: مناسب للمدارس والشركات مع إمكانية إضافة شعار وتطريز مخصص لطلبات الجملة.'
      : lang === 'ml'
      ? '【ബൾക്ക് ഓർഡറുകൾ ലഭ്യമാണ്】: സ്കൂളുകൾക്കും സ്ഥാപനങ്ങൾക്കും കസ്റ്റം ലോഗോ എംബ്രോയിഡറിയോടെ ലഭ്യമാണ്.'
      : '【INSTITUTIONAL & BULK READY】: Perfect standard compliance for school uniform codes and industrial workplace safety standards.',
  ]

  // Dynamic translated specifications
  const specsList = [
    { label: t('attrBrand'), value: product.brand || 'Online Gulf Uniform' },
    { label: t('attrMaterial'), value: product.material || '65% Polyester, 35% Cotton Twill' },
    { label: t('attrScent'), value: product.fit || 'Regular Comfort Fit' },
    { label: t('attrBurnTime'), value: product.gender || product.category || 'Boys & Girls' },
    { label: t('attrItemWeight'), value: product.weight || '220 GSM' },
    { label: t('attrDimensions'), value: product.dimensions || 'Gulf / UK Standard Sizing' },
    { label: t('attrNumberItems'), value: '1 Uniform Unit with Size Label' },
    { label: t('attrCountryOrigin'), value: 'UAE / GCC & India' },
  ]

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <Seo
        title={`${product.title}: Buy Online at Online Gulf Uniform`}
        description={product.shortDescription || product.description}
        canonical={`/products/${product.handle}`}
        image={product.images?.[0]}
      />

      {/* 1. Amazon Breadcrumb Bar */}
      <div className="border-b border-slate-200 bg-white py-2 text-xs text-slate-500">
        <div className="container flex items-center gap-1.5 px-4 overflow-x-auto whitespace-nowrap">
          <Link to="/" className="hover:text-[#1D4ED8]">{t('home')}</Link>
          <span>›</span>
          <Link to="/collections/all-products" className="hover:text-[#1D4ED8]">Uniforms</Link>
          <span>›</span>
          <Link to={`/collections/${product.category ? product.category.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'boys'}`} className="hover:text-[#1D4ED8]">
            {product.category || 'Uniforms'}
          </Link>
          <span>›</span>
          <span className="truncate text-slate-700 font-medium">{product.title}</span>
        </div>
      </div>

      {/* 2. Main Amazon 3-Column PDP Container */}
      <div className="container px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 xl:gap-8">
          
          {/* ================= COLUMN 1: Gallery (Thumbnails + Main Zoom Image) ================= */}
          <div className="lg:col-span-5">
            <div className="sticky top-20 flex flex-col-reverse gap-3 sm:flex-row sm:items-start">
              {/* Vertical Thumbnails */}
              {media.length > 1 && (
                <div className="flex shrink-0 gap-2 overflow-x-auto sm:w-14 sm:flex-col sm:overflow-y-auto">
                  {media.map((m, i) => (
                    <button
                      key={m.src + i}
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => setActive(i)}
                      className={`relative aspect-square h-12 w-12 shrink-0 overflow-hidden rounded border transition-all sm:h-14 sm:w-14 ${
                        active === i
                          ? 'border-[#1D4ED8] ring-2 ring-[#1D4ED8] shadow-sm'
                          : 'border-slate-300 hover:border-[#1D4ED8]'
                      }`}
                    >
                      <img
                        src={m.src}
                        alt=""
                        className="h-full w-full object-contain p-1"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Main Photo Frame */}
              <div className="relative flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white p-2">
                <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden">
                  <img
                    src={media[active]?.src || media[0]?.src}
                    alt={product.title}
                    className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-110 cursor-crosshair"
                  />
                  {/* Share button */}
                  <button
                    onClick={handleShare}
                    className="absolute right-2 top-2 rounded-full border border-slate-300 bg-white/90 p-2 text-slate-600 shadow-sm hover:bg-slate-100"
                    title="Share this product"
                  >
                    <Share className="h-4 w-4" />
                  </button>
                  {copiedLink && (
                    <div className="absolute right-2 top-12 rounded bg-black/80 px-2 py-1 text-[10px] text-white">
                      Link copied!
                    </div>
                  )}
                </div>
                <p className="mt-2 text-center text-[11px] text-slate-400">
                  {t('rollOverZoom')}
                </p>
              </div>
            </div>
          </div>

          {/* ================= COLUMN 2: Product Information & Specifications ================= */}
          <div className="lg:col-span-4 xl:col-span-4">
            {/* Brand Store Link in Royal Blue */}
            <Link
              to="/collections/all-products"
              className="text-xs font-semibold text-[#1D4ED8] hover:underline"
            >
              {t('visitStore')}
            </Link>

            {/* Amazon Title */}
            <h1 className="mt-1 text-base font-bold leading-snug text-slate-900 sm:text-lg">
              {product.title}
            </h1>

            {/* Amazon Ratings & Reviews line */}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center text-[#FBBF24]">
                <span>★★★★☆</span>
                <span className="ml-1 font-bold text-slate-800">
                  {product.rating ? Number(product.rating).toFixed(1) : '4.6'}
                </span>
              </div>
              <span className="text-slate-300">|</span>
              <a href="#reviews" className="text-[#1D4ED8] hover:underline">
                {product.reviews || 142} {t('ratings')}
              </a>
              <span className="text-slate-300">|</span>
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
                {t('boughtPastMonth')}
              </span>
            </div>

            {/* Amazon's Choice Badge in Royal Blue */}
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex items-center rounded-xs bg-[#0B2545] px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
                <span>{t('amazonsChoice')}</span>
              </div>
              <span className="text-xs text-slate-600">{t('forHandmadeCandle')}</span>
            </div>

            <div className="my-3 border-t border-slate-200" />

            {/* Price Block */}
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-light text-[#cc0c39]">
                  -{discountPercent}%
                </span>
                <div className="flex items-start">
                  <span className="text-xs font-semibold text-slate-800">₹</span>
                  <span className="text-3xl font-bold leading-none text-slate-900">
                    {product.price}
                  </span>
                </div>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {t('mrp')} <span className="line-through">₹{mrp}</span>
              </div>
              <div className="mt-0.5 text-xs text-slate-600">
                {t('inclusiveTaxes')}
              </div>
              <div className="mt-1 text-xs text-slate-800 font-medium">
                {t('emiStarts')}
              </div>
            </div>

            {/* Offers Cards */}
            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/40 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B2545]">
                <span>🏷️ {t('offers')}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded border border-slate-200 bg-white p-2">
                  <p className="font-bold text-slate-900">{t('bankOffer')}</p>
                  <p className="text-slate-600 line-clamp-2">{t('bankOfferDesc')}</p>
                  <span className="text-[#1D4ED8] font-semibold">1 offer ›</span>
                </div>
                <div className="rounded border border-slate-200 bg-white p-2">
                  <p className="font-bold text-slate-900">{t('partnerOffer')}</p>
                  <p className="text-slate-600 line-clamp-2">{t('partnerOfferDesc')}</p>
                  <span className="text-[#1D4ED8] font-semibold">1 offer ›</span>
                </div>
              </div>
            </div>

            {/* 4 Service Guarantee Badges */}
            <div className="mt-4 grid grid-cols-4 gap-2 border-y border-slate-200 py-3 text-center text-[10.5px] text-slate-700">
              <div className="flex flex-col items-center">
                <span className="text-lg">🔄</span>
                <span>{t('replacement7Days')}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg">🚚</span>
                <span>{t('freeDelivery')}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg">📦</span>
                <span>{t('amazonDelivered')}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg">🔒</span>
                <span>{t('secureTransaction')}</span>
              </div>
            </div>

            {/* Variants Selector */}
            {hasChoices && (
              <div className="mt-4 space-y-3" ref={sizeRef}>
                {colorOptions.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-slate-900">
                      {t('colour')}: <span className="font-normal text-slate-600">{colour || 'Select'}</span>
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {colorOptions.map((c) => (
                        <button
                          key={c}
                          onClick={() => setColour(c)}
                          className={`rounded border px-3 py-1.5 text-xs font-medium transition-all ${
                            colour === c
                              ? 'border-[#1D4ED8] bg-blue-50/70 ring-1 ring-[#1D4ED8] font-bold text-[#1D4ED8]'
                              : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {fragranceOptions.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-slate-900">
                      {t('fragrance')}: <span className="font-normal text-slate-600">{fragrance || 'Select'}</span>
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {fragranceOptions.map((f) => (
                        <button
                          key={f}
                          onClick={() => setFragrance(f)}
                          className={`rounded border px-3 py-1.5 text-xs font-medium transition-all ${
                            fragrance === f
                              ? 'border-[#1D4ED8] bg-blue-50/70 ring-1 ring-[#1D4ED8] font-bold text-[#1D4ED8]'
                              : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Custom Notes */}
            {isCustom && (
              <div ref={noteRef} className="mt-4 rounded border border-blue-200 bg-blue-50/40 p-3">
                <label className="text-xs font-bold text-slate-900">
                  Customization Instructions <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={2}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Enter name, message or monogram..."
                  className="mt-1.5 w-full rounded border border-slate-300 p-2 text-xs outline-none focus:border-[#1D4ED8]"
                />
                {noteError && <p className="mt-1 text-xs text-red-600">{noteError}</p>}
              </div>
            )}

            {/* "About this item" Bullet Points */}
            <div className="mt-5 border-t border-slate-200 pt-4">
              <h3 className="text-sm font-bold text-slate-900">{t('aboutItem')}</h3>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed text-slate-700">
                {bulletPoints.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="font-bold text-[#1D4ED8]">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Specifications Table */}
            <div className="mt-5 border-t border-slate-200 pt-4">
              <h3 className="text-sm font-bold text-slate-900">{t('technicalDetails')}</h3>
              <div className="mt-2 overflow-hidden rounded border border-slate-200 text-xs">
                <table className="w-full">
                  <tbody>
                    {specsList.map((row, idx) => (
                      <tr key={row.label} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="w-2/5 p-2 font-semibold text-slate-700 border-b border-slate-100">{row.label}</td>
                        <td className="w-3/5 p-2 text-slate-900 border-b border-slate-100">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ================= COLUMN 3: The Iconic Amazon Buy Box ================= */}
          <div className="lg:col-span-3 xl:col-span-3">
            <div className="sticky top-20 rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
              {/* Buy Box Price */}
              <div className="flex items-baseline">
                <span className="text-xs font-semibold text-slate-800">₹</span>
                <span className="text-2xl font-bold text-slate-900">{product.price}.00</span>
              </div>

              {/* Delivery Speed */}
              <div className="mt-2 text-xs text-slate-700">
                <span className="font-bold text-slate-900">{t('freeDelivery')}</span> <b>Tomorrow, by 2 PM</b>. Order within <span className="text-emerald-700 font-semibold">3 hrs 45 mins</span>.
              </div>

              {/* Deliver to Address */}
              <div className="mt-2 flex items-center gap-1 text-xs text-[#1D4ED8] hover:underline cursor-pointer">
                <span>📍 {t('deliverTo')} {t('newDelhi')}</span>
              </div>

              {/* In Stock */}
              <div className="mt-3 text-base font-bold text-[#007600]">
                {t('inStock')}
              </div>

              {/* Quantity Selector */}
              <div className="mt-3 flex items-center gap-2 text-xs">
                <label className="font-semibold text-slate-700">{t('quantity')}</label>
                <select
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="rounded border border-slate-300 bg-[#f0f2f2] px-2 py-1 text-xs text-slate-800 shadow-xs focus:outline-none"
                >
                  {[1, 2, 3, 4, 5, 10].map((num) => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>

              {/* Royal Blue & Amazon Gold Action Buttons */}
              <div className="mt-4 space-y-2.5">
                {/* 1. Add to Cart Button (Royal Blue Gradient) */}
                <button
                  type="button"
                  onClick={() => addToBag(false)}
                  className="w-full rounded-full bg-[#1D4ED8] py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#1E40AF] active:scale-95"
                >
                  {t('addToCart')}
                </button>

                {/* 2. Buy Now Button (Amazon Warm Amber/Orange Gold) */}
                <button
                  type="button"
                  onClick={() => addToBag(true)}
                  className="w-full rounded-full bg-[#FFA41C] py-2.5 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-md transition-all hover:bg-[#F08804] active:scale-95"
                >
                  {t('buyNow')}
                </button>
              </div>

              {/* Meta details */}
              <div className="mt-4 space-y-1 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('shipsFrom')}</span>
                  <span className="font-medium text-slate-900">EvaraNest Fulfillment</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('soldBy')}</span>
                  <span className="font-medium text-[#1D4ED8]">EvaraNest Direct (4.9 ★)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('payment')}</span>
                  <span className="font-medium text-slate-900">{t('secureTransaction')}</span>
                </div>
              </div>

              {/* Gift Options */}
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-700">
                <input type="checkbox" id="gift" defaultChecked className="rounded accent-[#1D4ED8]" />
                <label htmlFor="gift">{t('addGiftOptions')}</label>
              </div>

              {/* Wishlist Button */}
              <div className="mt-4 border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={() => setIsWishlisted((w) => !w)}
                  className="w-full rounded-md border border-slate-300 bg-white py-1.5 text-xs font-medium text-slate-800 shadow-xs hover:bg-slate-50"
                >
                  {isWishlisted ? t('addedToWishList') : t('addToWishList')}
                </button>
              </div>

              {/* WhatsApp Bulk Ordering Support */}
              <div className="mt-3">
                <a
                  href={whatsappBulkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-md border border-emerald-600 bg-emerald-50 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  <Whatsapp className="h-3.5 w-3.5 fill-emerald-600" />
                  <span>{t('bulkWhatsApp')}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Amazon Customer Reviews & Breakdown */}
      <section className="border-t border-slate-200 bg-[#f8fafc] py-8" id="reviews">
        <div className="container px-4">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
            {/* Reviews Summary Column */}
            <div className="md:col-span-4">
              <h2 className="text-lg font-bold text-slate-900">{t('customerReviews')}</h2>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-2xl font-bold text-slate-900">4.6</span>
                <span className="text-lg text-[#FBBF24]">★★★★☆</span>
                <span className="text-xs text-slate-500">{t('outOf5Stars')}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{product.reviews || 142} {t('globalRatings')}</p>

              {/* Star Rating Progress Bars */}
              <div className="mt-4 space-y-2 text-xs">
                {[
                  { star: 5, pct: 74 },
                  { star: 4, pct: 16 },
                  { star: 3, pct: 6 },
                  { star: 2, pct: 2 },
                  { star: 1, pct: 2 },
                ].map((row) => (
                  <div key={row.star} className="flex items-center gap-2">
                    <span className="w-12 text-[#1D4ED8] hover:underline cursor-pointer">{row.star} star</span>
                    <div className="h-4 flex-1 overflow-hidden rounded bg-slate-200">
                      <div className="h-full bg-[#1D4ED8]" style={{ width: `${row.pct}%` }} />
                    </div>
                    <span className="w-8 text-right text-slate-600">{row.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Individual Reviews */}
            <div className="md:col-span-8">
              <h3 className="text-base font-bold text-slate-900">{t('topReviews')}</h3>
              <div className="mt-4 space-y-4">
                {[
                  {
                    author: lang === 'ar' ? 'فاطمة المنصوري' : lang === 'ml' ? 'അഞ്ജലി നായർ' : 'Pooja Sharma',
                    date: '14 October 2026',
                    verified: true,
                    headline: lang === 'ar' ? 'جودة أقمشة ممتازة وخياطة متينة ومريحة طوال اليوم!' : lang === 'ml' ? 'മികച്ച തുണിത്തരവും ഈടുനിൽക്കുന്ന തയ്യലും!' : 'Superb fabric quality, durable stitching and comfortable all day!',
                    review: lang === 'ar'
                      ? 'القماش ممتاز جداً ومريح للطلاب طوال اليوم الدراسي. الألوان ثابتة حتى بعد الغسيل المتكرر.'
                      : lang === 'ml'
                      ? 'സ്കൂൾ ആവശ്യങ്ങൾക്ക് ഏറ്റവും അനുയോജ്യം. വാഷ് ചെയ്താലും നിറം മങ്ങുന്നില്ല, വളരെ കംഫർട്ടബിൾ ആണ്.'
                      : 'The fabric quality and reinforced stitching are outstanding. Held its shape and vibrant color through weekly washes. Perfect school fit.',
                  },
                ].map((rev) => (
                  <div key={rev.author} className="border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="h-6 w-6 rounded-full bg-blue-100 text-[#1D4ED8] grid place-items-center font-bold">
                        {rev.author[0]}
                      </div>
                      <span className="font-semibold text-slate-900">{rev.author}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="text-[#FBBF24]">★★★★★</span>
                      <span className="font-bold text-slate-900">{rev.headline}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Reviewed on {rev.date}
                    </div>
                    {rev.verified && (
                      <span className="text-[11px] font-bold text-[#c45500]">
                        {t('verifiedPurchase')}
                      </span>
                    )}
                    <p className="mt-2 text-xs leading-relaxed text-slate-700">
                      {rev.review}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Related Product Rail */}
      <div className="py-6 bg-white">
        <ProductRail title={t('customersAlsoViewed')} items={related} />
      </div>

      {/* Amazon Trust Strip */}
      <AmazonTrustStrip />
    </div>
  )
}
