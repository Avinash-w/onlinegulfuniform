import { useEffect, useRef, useState } from 'react'

/**
 * Renders children only once the placeholder is near the viewport, so below-the-fold
 * homepage sections don't mount (or fetch images) until the visitor scrolls close.
 * `eager` mounts immediately (used for the first sections on the page).
 */
export default function LazyMount({ children, eager = false, minHeight = 480, rootMargin = '600px 0px' }) {
  const ref = useRef(null)
  const [show, setShow] = useState(eager)

  useEffect(() => {
    if (show) return
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShow(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true)
          io.disconnect()
        }
      },
      { rootMargin }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [show, rootMargin])

  return show ? children : <div ref={ref} style={{ minHeight }} aria-hidden />
}
