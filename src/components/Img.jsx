import { useCallback, useState } from 'react'
import { localPath, remoteAt } from '../lib/img'
import { isDataUri } from '../lib/art.js'

/**
 * Renders a local /public/images copy of a CDN asset, falling back to the
 * live Shopify url if that file isn't present. Inline SVG data URIs (used for
 * the Home & Living range) are passed straight through.
 * Images fade in softly once decoded to avoid pop-in. The fade uses an inline
 * opacity override (cleared after load) so it never fights the opacity
 * utility classes callers use for their own cross-fades.
 */
export default function Img({ src, alt = '', width, className = '', style, ...rest }) {
  const [stage, setStage] = useState(0) // 0 = local, 1 = remote, 2 = give up
  const [loaded, setLoaded] = useState(false)

  // Cached images may already be complete before onLoad can fire.
  const refCb = useCallback((node) => {
    if (node?.complete && node.naturalWidth > 0) setLoaded(true)
  }, [])

  if (!src) return <div className={`bg-chalk ${className}`} aria-hidden />

  const inline = isDataUri(src)
  const absolute = !inline && (src.startsWith('/') || src.startsWith('blob:') || src.startsWith('data:'))
  const resolved = inline || absolute ? src : stage === 0 ? localPath(src) : remoteAt(src, width)

  return (
    <img
      ref={refCb}
      src={resolved}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      style={{ transition: 'opacity 0.35s ease', ...(loaded ? null : { opacity: 0 }), ...style }}
      onLoad={() => setLoaded(true)}
      onError={inline || absolute ? undefined : () => setStage((s) => Math.min(s + 1, 2))}
      {...rest}
    />
  )
}
