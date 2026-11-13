import { useState } from 'react'
import AmazonHomeHero from '../components/AmazonHomeHero'
import AmazonDealsRail from '../components/AmazonDealsRail'
import AmazonTrustStrip from '../components/AmazonTrustStrip'
import B2BQuoteBuilder from '../components/B2BQuoteBuilder'
import CatalogueModal from '../components/CatalogueModal'
import Seo from '../components/Seo'
import { useLanguage } from '../context/LanguageContext'
import { useStore } from '../store/StoreContext.jsx'
import { allProducts } from '../store/selectors.js'

export default function Home() {
  const { state } = useStore()
  const { t } = useLanguage()
  const catalogue = allProducts(state)
  const [catalogueOpen, setCatalogueOpen] = useState(false)

  const deals = catalogue.filter((p) => p.compareAt && p.compareAt > p.price).slice(0, 10)
  const boysUniforms = catalogue.filter((p) => p.category === 'Boys').slice(0, 10)
  const girlsUniforms = catalogue.filter((p) => p.category === 'Girls').slice(0, 10)
  const industrialUniforms = catalogue.filter((p) => p.category === 'Industrial Uniforms').slice(0, 10)

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 font-sans text-slate-900">
      <Seo
        title="Online Gulf Uniform — School & Industrial Uniforms in UAE, GCC & India"
        description="Shop online for premium school uniforms for boys and girls, PE tracksuits, and industrial workwear including flame-resistant coveralls, polo shirts, and corporate uniforms."
        keywords="school uniforms, boys school pants, girls skirts, industrial uniforms, oil gas coveralls, online gulf uniform"
        canonical="/"
      />

      {/* 1. Amazon Hero with 4-in-1 Quadrant Cards */}
      <AmazonHomeHero catalogue={catalogue} />

      {/* 2. Today's Deals Rail */}
      <AmazonDealsRail
        title={`${t('todaysDeals')} | Featured Uniforms`}
        subtitle="Limited-time institutional savings on school & workwear"
        items={deals.length ? deals : catalogue.slice(0, 8)}
        link="/collections/all-products"
      />

      {/* 3. Amazon Trust Services Strip */}
      <AmazonTrustStrip />

      {/* 4. Boys School Uniforms Rail */}
      <AmazonDealsRail
        title="Boys Uniforms — Pants, Oxford Shirts, PE Kits & Blazers"
        subtitle="Durable stain-resistant schoolwear engineered for daily wear"
        items={boysUniforms.length ? boysUniforms : catalogue.slice(0, 8)}
        link="/collections/boys"
      />

      {/* 5. Girls School Uniforms Rail */}
      <AmazonDealsRail
        title="Girls Uniforms — Pleated Skirts, Pinafores, Blouses & PE"
        subtitle="Comfort-tailored premium fabrics for junior & senior students"
        items={girlsUniforms.length ? girlsUniforms : catalogue.slice(8, 16)}
        link="/collections/girls"
      />

      {/* 6. Industrial & Safety Workwear Rail */}
      <AmazonDealsRail
        title="Industrial Uniforms — FR Coveralls, Engineering & Corporate"
        subtitle="EN ISO & NFPA certified safety garments for commercial industries"
        items={industrialUniforms.length ? industrialUniforms : catalogue.slice(16, 24)}
        link="/collections/industrial-uniforms"
      />

      {/* 7. B2B / Bulk Corporate Orders Quote Section */}
      <div className="mt-8" id="b2b-quote">
        <B2BQuoteBuilder />
      </div>

      {/* Catalogue Download Modal */}
      <CatalogueModal isOpen={catalogueOpen} onClose={() => setCatalogueOpen(false)} />
    </div>
  )
}
