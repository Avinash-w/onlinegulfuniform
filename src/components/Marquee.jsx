import { useStore } from '../store/StoreContext.jsx'
import { siteSettings } from '../store/selectors.js'

/**
 * Full-bleed ink ticker. Content is duplicated once and the
 * track translates -50%, which makes the loop perfectly seamless.
 */
export default function Marquee({
  text,
  repeat = 12,
  className = '',
  speed = 'animate-marquee',
  invert = false,
}) {
  const { state } = useStore()
  const site = siteSettings(state)
  const label = text ?? site.marqueeText ?? 'LIGHT UP YOUR MOMENTS'
  const items = Array.from({ length: repeat })

  return (
    <div
      className={`overflow-hidden ${invert ? 'bg-white text-ink' : 'bg-ink text-white'} ${className}`}
    >
      <div className={`flex w-max ${speed}`}>
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0" aria-hidden={half === 1}>
            {items.map((_, i) => (
              <span
                key={i}
                className="flex items-center gap-6 whitespace-nowrap px-6 py-2.5 font-display text-[15px] uppercase tracking-wider2 md:text-[18px]"
              >
                {label}
                <span className="inline-block h-1 w-1 rounded-full bg-current opacity-60" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
