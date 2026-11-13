import { useEffect, useState } from 'react'
import { useStore } from '../store/StoreContext.jsx'
import { storefrontContent } from '../store/selectors.js'

const pad = (n) => String(n).padStart(2, '0')

/** Promo countdown bar on PDP — copy & duration from admin Site / PDP settings. */
export default function CountdownStrip() {
  const { state } = useStore()
  const pdp = storefrontContent(state).pdp ?? {}
  const minutes = pdp.countdownMinutes ?? 10
  const seconds = pdp.countdownSeconds ?? 30
  const label = pdp.countdownLabel || 'Sale ends in'
  const [left, setLeft] = useState(minutes * 60 + seconds)

  useEffect(() => {
    setLeft(minutes * 60 + seconds)
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [minutes, seconds])

  if (pdp.countdownEnabled === false) return null

  const h = Math.floor(left / 3600)
  const m = Math.floor((left % 3600) / 60)
  const s = left % 60

  return (
    <div className="flex items-center gap-2 bg-sale/10 px-3 py-2 text-[11px] font-medium text-sale">
      <span className="uppercase tracking-wider2">{label}</span>
      <span className="tabular-nums">
        {pad(h)}h : {pad(m)}m : {pad(s)}s
      </span>
    </div>
  )
}
