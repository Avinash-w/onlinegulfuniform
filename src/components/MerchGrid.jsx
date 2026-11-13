import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import { storefrontContent } from '../store/selectors.js'
import Img from './Img'

export default function MerchGrid() {
  const { state } = useStore()
  const merch = storefrontContent(state).merch
  if (!merch?.tiles?.length) return null

  return (
    <section className="py-10 md:py-14">
      <div className="container">
        <h2 className="section-title mb-6 md:mb-8">{merch.title}</h2>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {merch.tiles.map((t) => (
            <Link key={t.id || t.href} to={t.href} className="group block overflow-hidden bg-chalk">
              <div className="relative aspect-square overflow-hidden">
                {t.video ? (
                  <video
                    src={t.video}
                    poster={t.image}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    aria-label={t.alt}
                    className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <Img
                    src={t.image}
                    alt={t.alt}
                    width={700}
                    className="h-full w-full object-contain object-center transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                {t.alt && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-3 pt-10 md:p-4">
                    <span className="label-caps !text-[13px] font-bold leading-snug !tracking-[0.12em] text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.8)] sm:!text-base md:!text-lg lg:!text-xl">
                      {t.alt}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>

        {merch.cta?.href && (
          <div className="mt-8 flex justify-center md:mt-10">
            <Link to={merch.cta.href} className="btn-ink">
              {merch.cta.label}
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
