import { useEffect, useRef } from 'react'

const RATIO = 0.7886
const LEFT = 50.46

/** Glass-wing cherry-blossom butterfly (front view): two wings flap separately around a fixed body. */
function Photo() {
  return (
    <span className="bf-flip">
      <img src="/images/butterfly-left.png" alt="" className="bf-wing bf-wing-l" style={{ width: `${LEFT}%` }} draggable="false" />
      <img src="/images/butterfly-right.png" alt="" className="bf-wing bf-wing-r" style={{ left: `${LEFT}%`, width: `${100 - LEFT}%` }} draggable="false" />
      <img src="/images/butterfly-body.png" alt="" className="bf-body" draggable="false" />
    </span>
  )
}

const ease = (t) => 1 - Math.pow(1 - t, 2.4)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const angleDiff = (a, b) => ((((b - a) % 360) + 540) % 360) - 180

/** Visible element carrying data-butterfly="<name>", or null. */
function findAnchor(name) {
  const els = document.querySelectorAll(`[data-butterfly="${name}"]`)
  for (const el of els) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) return r
  }
  return null
}

/** Colour palette of the glowing trail: blossom pink, lilac, sky blue, soft gold. */
const TRAIL_HUES = [320, 290, 270, 340, 195, 48]

/**
 * One butterfly: rises from below the viewport, wanders upward and finally
 * settles on the element marked data-butterfly="<anchor>" (tracks scrolling).
 * While flying it leaves a trail of coloured glow via `emit`.
 */
function useFlight(ref, emit, { anchor, size, duration, delay, offset, rest, wobble, trail }) {
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const vw = () => window.innerWidth
    const vh = () => window.innerHeight
    const h = size * RATIO
    const startX = vw() * (0.2 + Math.random() * 0.6)
    const startY = vh() + h
    const phase = Math.random() * Math.PI * 2

    let raf = 0
    let t0 = 0
    let prev = null
    let rot = 0
    let state = 'fly'
    let timer = 0
    let lastEmit = 0
    let drag = null
    let ret = null
    const home = { x: 0, y: 0 }
    let cur = null
    let last = null
    const setState = (s) => {
      state = s
      el.dataset.state = s
    }
    setState('fly')

    const target = () => {
      const r = findAnchor(anchor)
      return r ? offset(r) : { x: vw() / 2, y: vh() * 0.4, missing: true }
    }

    const flutter = () => {
      if (state !== 'rest') return
      setState('flutter')
      timer = window.setTimeout(() => {
        setState('rest')
        timer = window.setTimeout(flutter, 4000 + Math.random() * 5000)
      }, 900)
    }

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      if (!t0) t0 = now
      const tg = target()
      const elapsed = now - t0 - delay
      if (elapsed < 0) {
        el.style.opacity = '0'
        return
      }
      let t = Math.min(1, elapsed / duration)
      if (tg.missing) t = Math.min(t, 0.7)
      const s = ease(t)
      const amp = wobble * Math.pow(1 - s, 0.9)
      const wx = Math.sin(t * Math.PI * 5 + phase) * amp
      const wy = Math.sin(t * Math.PI * 11 + phase) * 7 * (1 - s)
      const x = startX + (tg.x - startX) * s + wx
      const y = startY + (tg.y - startY) * s + wy
      const flying = t < 1

      if (flying) {
        if (prev) {
          const dx = x - prev.x
          const dy = y - prev.y
          // lean into the sideways drift
          rot += (clamp(dx * 1.6, -14, 14) - rot) * 0.12
        }
        if (now - lastEmit > 28) {
          lastEmit = now
          emit(x, y + h * 0.12, size, trail)
        }
      } else {
        // grabbed by the user: follow the pointer; once released glide back home
        if (drag) {
          cur = cur
            ? { x: cur.x + (drag.x - cur.x) * 0.4, y: cur.y + (drag.y - cur.y) * 0.4 }
            : { x: drag.x, y: drag.y }
        } else if (cur && ret) {
          // flies back home along a gentle arc, easing in and out
          const k = Math.min(1, (now - ret.t0) / ret.dur)
          const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
          const dx = x - ret.sx
          const dy = y - ret.sy
          const len = Math.hypot(dx, dy) || 1
          const bow = Math.sin(k * Math.PI) * len * 0.14 * ret.dir
          cur = { x: ret.sx + dx * e - (dy / len) * bow, y: ret.sy + dy * e + (dx / len) * bow }
          if (now - lastEmit > 28) {
            lastEmit = now
            emit(cur.x, cur.y + h * 0.12, size, trail)
          }
          if (k >= 1) {
            cur = null
            ret = null
            setState('rest')
            emit(x, y, size, trail, 14)
            timer = window.setTimeout(flutter, 3000 + Math.random() * 3000)
          }
        }
        if (cur) {
          const mx = last ? cur.x - last.x : 0
          rot += (clamp(mx * 1.6, -18, 18) - rot) * 0.15
        } else {
          rot += angleDiff(rot, rest) * 0.1
        }
        if (state === 'fly') {
          setState('rest')
          emit(x, y, size, trail, 26)
          timer = window.setTimeout(flutter, 3500 + Math.random() * 3000)
        }
      }
      prev = { x, y }
      home.x = x
      home.y = y
      const px = !flying && cur ? cur.x : x
      const py = !flying && cur ? cur.y : y
      last = { x: px, y: py }

      const hidden = !flying && !cur && anchor === 'hero' && (y < 78 + size * 0.2 || y > vh() + size)
      el.style.opacity = hidden ? '0' : '1'
      el.style.transform = `translate3d(${px - size / 2}px, ${py - h / 2}px, 0) rotate(${rot}deg)`
    }

    const onDown = (e) => {
      if (state === 'fly' || e.button > 0) return
      e.preventDefault()
      window.clearTimeout(timer)
      ret = null
      drag = { x: e.clientX, y: e.clientY }
      if (!cur) cur = last ? { ...last } : null
      el.setPointerCapture?.(e.pointerId)
      el.dataset.dragging = '1'
      setState('flutter')
    }
    const onMove = (e) => {
      if (drag) drag = { x: e.clientX, y: e.clientY }
    }
    const onUp = () => {
      if (!drag) return
      drag = null
      delete el.dataset.dragging
      if (cur && last) {
        const dist = Math.hypot(home.x - cur.x, home.y - cur.y)
        ret = {
          sx: cur.x,
          sy: cur.y,
          t0: performance.now(),
          dur: clamp(500 + dist * 1.1, 700, 1800),
          dir: Math.random() < 0.5 ? -1 : 1,
        }
        setState('return')
      } else {
        cur = null
        setState('rest')
        timer = window.setTimeout(flutter, 2500 + Math.random() * 2500)
      }
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)

    if (reduce) {
      setState('rest')
      const place = () => {
        const tg = target()
        el.style.opacity = '1'
        el.style.transform = `translate3d(${tg.x - size / 2}px, ${tg.y - h / 2}px, 0) rotate(${rest}deg)`
      }
      place()
      window.addEventListener('scroll', place, { passive: true })
      window.addEventListener('resize', place)
      return () => {
        window.removeEventListener('scroll', place)
        window.removeEventListener('resize', place)
      }
    }

    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
  }, [ref, emit, anchor, size, duration, delay, offset, rest, wobble, trail])
}

function Flyer({ emit, size, ...cfg }) {
  const ref = useRef(null)
  useFlight(ref, emit, { size, ...cfg })
  return (
    <div ref={ref} className="bf" style={{ width: size, height: size * RATIO, opacity: 0 }}>
      <Photo />
    </div>
  )
}

/** Canvas of fading, additive colour sparks that make the flight trail. */
function useTrail(canvasRef) {
  const parts = useRef([])
  const emit = useRef((x, y, size, trail, burst = 0) => {
    const n = burst || (trail === 'big' ? 3 : 2)
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = burst ? 0.6 + Math.random() * 2.2 : Math.random() * 0.5
      parts.current.push({
        x: x + (Math.random() - 0.5) * size * 0.45,
        y: y + (Math.random() - 0.5) * size * 0.45,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp + 0.25,
        r: (burst ? 2 : 1.6) + Math.random() * size * (trail === 'big' ? 0.07 : 0.1),
        life: 1,
        decay: 0.011 + Math.random() * 0.012,
        hue: TRAIL_HUES[Math.floor(Math.random() * TRAIL_HUES.length)] + (Math.random() - 0.5) * 16,
      })
    }
    if (parts.current.length > 420) parts.current.splice(0, parts.current.length - 420)
  }).current

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return undefined
    const ctx = cv.getContext('2d')
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const fit = () => {
      cv.width = window.innerWidth * dpr
      cv.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    fit()
    window.addEventListener('resize', fit)
    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const list = parts.current
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      if (!list.length) return
      ctx.globalCompositeOperation = 'lighter'
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i]
        p.life -= p.decay
        if (p.life <= 0) {
          list.splice(i, 1)
          continue
        }
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.97
        const rad = p.r * (0.5 + p.life * 0.8)
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 2.6)
        g.addColorStop(0, `hsla(${p.hue},100%,78%,${0.75 * p.life})`)
        g.addColorStop(0.35, `hsla(${p.hue},95%,65%,${0.38 * p.life})`)
        g.addColorStop(1, `hsla(${p.hue},95%,60%,0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(p.x, p.y, rad * 2.6, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'
    }
    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', fit)
    }
  }, [canvasRef])

  return emit
}

const logoSpot = (r) => ({ x: r.right + 24, y: r.top + 4 })
const heroSpot = (r) => ({
  x: r.right - Math.min(130, r.width * 0.15),
  y: r.top + Math.min(100, r.height * 0.28),
})

/** Two butterflies for the home page: a small one on the logo, a big one on the hero slider. */
export default function Butterflies() {
  const canvasRef = useRef(null)
  const emit = useTrail(canvasRef)
  const narrow = typeof window !== 'undefined' && window.innerWidth < 640
  return (
    <div className="bf-layer" aria-hidden="true">
      <canvas ref={canvasRef} className="bf-trail" />
      <Flyer
        emit={emit}
        anchor="logo"
        size={narrow ? 30 : 46}
        duration={6500}
        delay={500}
        offset={logoSpot}
        rest={-6}
        wobble={70}
        trail="small"
      />
    </div>
  )
}
