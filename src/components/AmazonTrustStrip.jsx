import { useLanguage } from '../context/LanguageContext'

/* Palette: white #FFFFFF · navy #0B2545 · royal blue #1D4ED8 · tint #EFF4FF */

const ICONS = {
  truck: (
    <>
      <path d="M3 7h11v9H3z" />
      <path d="M14 10h4l3 3v3h-7z" />
      <circle cx="7.5" cy="17.5" r="1.8" />
      <circle cx="17.5" cy="17.5" r="1.8" />
    </>
  ),
  cash: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.5 9.5v.01M17.5 14.5v.01" />
    </>
  ),
  swap: (
    <>
      <path d="M4 9h13l-3-3" />
      <path d="M20 15H7l3 3" />
    </>
  ),
  box: (
    <>
      <path d="M3 8l9-5 9 5-9 5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
}

function Icon({ name }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  )
}

export default function AmazonTrustStrip() {
  const { t } = useLanguage()

  const items = [
    { icon: 'truck', title: t('freeDelivery'), sub: t('freeDeliverySub') },
    { icon: 'cash', title: t('payOnDelivery'), sub: t('payOnDeliverySub') },
    { icon: 'swap', title: t('replacement7Days'), sub: t('replacementSub') },
    { icon: 'box', title: t('amazonDelivered'), sub: t('amazonDeliveredSub') },
    { icon: 'lock', title: t('safePayments'), sub: t('safePaymentsSub') },
  ]

  return (
    <section className="bg-white py-6" aria-label="Why shop with us">
      <div className="container px-4 sm:px-6 lg:px-8">
        <ul className="grid grid-cols-1 overflow-hidden rounded-3xl border border-[#0B2545]/10 bg-white sm:grid-cols-2 lg:grid-cols-5 lg:divide-x lg:divide-[#0B2545]/10">
          {items.map((it, i) => (
            <li
              key={it.title}
              className={`flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-[#EFF4FF] ${
                i > 0 ? 'border-t border-[#0B2545]/10 sm:border-t-0' : ''
              } ${i >= 2 ? 'sm:border-t sm:border-[#0B2545]/10' : ''} lg:border-t-0`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EFF4FF] text-[#1D4ED8]">
                <Icon name={it.icon} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight text-[#0B2545]">{it.title}</p>
                <p className="mt-0.5 text-xs leading-snug text-[#0B2545]/60">{it.sub}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}