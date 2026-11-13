import { useCart } from '../context/CartContext'
import { Check } from './icons'

export default function Toast() {
  const { toast } = useCart()
  if (!toast) return null

  return (
    <div className="fixed top-3 right-3 z-[100] animate-slideUp pointer-events-none sm:top-6 sm:right-6 max-w-[85vw] sm:max-w-md">
      <div className="flex items-center gap-2 rounded-xl bg-[#4849E8] px-2.5 py-2 sm:px-4 sm:py-3 text-white shadow-pop border border-white/20 backdrop-blur-md">
        <span className="flex h-4 w-4 sm:h-5 sm:w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-lime">
          <Check className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 stroke-[2.5]" />
        </span>
        <span className="text-[10.5px] sm:text-[12.5px] font-semibold tracking-wide text-white leading-tight">{toast}</span>
      </div>
    </div>
  )
}
