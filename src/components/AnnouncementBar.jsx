import { useEffect, useState } from 'react'
import { useStore } from '../store/StoreContext.jsx'
import { storefrontContent } from '../store/selectors.js'
import { ChevronLeft, ChevronRight } from './icons'

/** Black strip at the very top that rotates through the offer messages. */
export default function AnnouncementBar() {
  const { state } = useStore()
  const announcements = storefrontContent(state).announcements ?? []
  const [i, setI] = useState(0)
  const n = announcements.length

  useEffect(() => {
    if (n <= 1) return
    const id = setInterval(() => setI((v) => (v + 1) % n), 3200)
    return () => clearInterval(id)
  }, [n])

  useEffect(() => {
    setI(0)
  }, [n])

  if (!n) return null

  const go = (d) => setI((v) => (v + d + n) % n)

  return (
    <div className="bg-lime text-brandDark shadow-xs">
      <div className="container flex h-7 sm:h-8 md:h-9 items-center justify-center gap-2 sm:gap-4 overflow-hidden px-2">
        <button type="button" onClick={() => go(-1)} aria-label="Previous offer" className="shrink-0 p-0.5 sm:p-1 transition-opacity hover:opacity-75">
          <ChevronLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-brandDark" />
        </button>
        <p
          key={i}
          className="animate-fadeIn text-center text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider2 text-brandDark md:text-[11.5px]"
        >
          {announcements[i]}
        </p>
        <button type="button" onClick={() => go(1)} aria-label="Next offer" className="shrink-0 p-0.5 sm:p-1 transition-opacity hover:opacity-75">
          <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-brandDark" />
        </button>
      </div>
    </div>
  )
}
