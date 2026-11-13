import { useState } from 'react'

import AmazonDealsRail from '../components/AmazonDealsRail'

import B2BQuoteBuilder from '../components/B2BQuoteBuilder'
import CatalogueModal from '../components/CatalogueModal'
import Seo from '../components/Seo'
import { useLanguage } from '../context/LanguageContext'
import { useStore } from '../store/StoreContext.jsx'
import { allProducts } from '../store/selectors.js'

export default function BulkOrdersAndCorporate() {
  const { state } = useStore()
  const { t } = useLanguage()
  const catalogue = allProducts(state)
  const [catalogueOpen, setCatalogueOpen] = useState(false)

  const deals = catalogue.filter((p) => p.compareAt && p.compareAt > p.price).slice(0, 10)
  const bestsellers = catalogue.filter((p) => p.featured || p.rating >= 4.5).slice(0, 10)
  const candles = catalogue.filter((p) => p.category?.toLowerCase().includes('candle') || p.productType === 'candle').slice(0, 10)

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 font-sans text-slate-900">
      <Seo
        title="Amazon.com: Online Shopping for Handmade Candles, Soy Wax & Gifting Hampers"
        description="Shop online for luxury handmade soy wax candles, aroma wax melts, scented jar candles, and custom gift hampers at best prices. Free Delivery on Prime orders."
        keywords="amazon candles, buy scented candles online, soy wax candles amazon, gift hampers online"
        canonical="/"
      />

      

      {/* 4. Best Sellers in Luxury Candles */}
      <AmazonDealsRail
        title={t('bestSellers')}
        subtitle="Top rated by customer reviews"
        items={bestsellers.length ? bestsellers : catalogue.slice(4, 12)}
        link="/collections/best-sellers"
      />

      {/* 5. Pure Soy Wax Artisan Collection */}
      

      {/* 6. B2B / Bulk Corporate Orders Quote Section */}
      <div className="mt-8">
        <B2BQuoteBuilder />
      </div>

      {/* Catalogue Download Modal */}
      <CatalogueModal isOpen={catalogueOpen} onClose={() => setCatalogueOpen(false)} />
    </div>
  )
}
