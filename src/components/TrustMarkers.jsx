import { useStore } from '../store/StoreContext.jsx'
import { storefrontContent } from '../store/selectors.js'
import { Refresh, Star, Truck, Whatsapp } from './icons'

const ICONS = {
  truck: Truck,
  refresh: Refresh,
  star: Star,
  whatsapp: Whatsapp,
}

export default function TrustMarkers() {
  const { state } = useStore()
  const markers = storefrontContent(state).trustMarkers ?? []

  if (!markers.length) return null

  return (
    <section className="border-y border-line bg-chalk">
      <div className="container grid grid-cols-2 gap-6 py-8 md:grid-cols-4 md:py-10">
        {markers.map(({ id, icon, title, sub }) => {
          const Icon = ICONS[icon] || Star
          return (
            <div key={id || title} className="flex flex-col items-center text-center">
              <Icon className="mb-2.5 h-7 w-7 text-ink" />
              <p className="label-caps">{title}</p>
              <p className="mt-1 text-[11px] text-muted">{sub}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
