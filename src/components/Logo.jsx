import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import { siteSettings } from '../store/selectors.js'

/**
 * Site logo — Online Gulf Uniform logo
 */
export default function Logo({
  className = '',
  heightClass = 'h-9 sm:h-10 md:h-11',
  to = '/',
  variant = 'header',
  src: customSrc,
}) {
  const { state } = useStore()
  const site = siteSettings(state)
  const defaultSrc = '/logo/online-gulf-uniform-logo.jpg'
  const src = customSrc || defaultSrc
  const brand = 'Online Gulf Uniform'

  if (variant === 'header') {
    return (
      <Link
        to={to}
        aria-label={`${brand} — Home`}
        className={`inline-flex shrink-0 items-center rounded-md bg-white px-2.5 py-1 shadow-sm transition-all hover:ring-2 hover:ring-[#FBBF24] ${className}`}
      >
        <img
          src={src}
          alt={brand}
          className={`${heightClass} w-auto object-contain object-left`}
          width={180}
          height={44}
          decoding="async"
        />
      </Link>
    )
  }

  return (
    <Link
      to={to}
      aria-label={`${brand} — Home`}
      className={`inline-flex shrink-0 items-center ${className}`}
    >
      <img
        src={src}
        alt={brand}
        className={`${heightClass} w-auto object-contain object-left`}
        width={180}
        height={44}
        decoding="async"
      />
    </Link>
  )
}
