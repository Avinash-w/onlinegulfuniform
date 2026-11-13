import { useState } from 'react'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import Seo from '../components/Seo'
import { useCart } from '../context/CartContext.jsx'
import { apiPost, getCustomerToken } from '../lib/api.js'
import { Button } from '../admin/ui.jsx'
import { useStore } from '../store/StoreContext.jsx'
import { allProducts } from '../store/selectors.js'

export default function Wishlist() {
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const [busy, setBusy] = useState(false)
  const items = allProducts(state).filter((p) => state.wishlist.includes(p.handle))

  const clear = async () => {
    if (busy) return
    if (!getCustomerToken()) {
      dispatch({ type: 'wishlist/clear' })
      return
    }
    setBusy(true)
    try {
      const json = await apiPost('/wishlist/clear', {}, { auth: 'customer' })
      dispatch({ type: 'wishlist/set', handles: [] })
      notify(json.message || 'Wishlist cleared.')
    } catch (err) {
      notify(err.message || 'Unable to clear wishlist.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container py-8 md:py-12">
      <Seo
        title="Your Wishlist — Saved Luxury Candles"
        description="View and manage your saved luxury candles, soy wax blends and gift favourites on EvaraNest."
        canonical="/wishlist"
        noindex={true}
      />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] uppercase leading-none md:text-[38px]">Wishlist</h1>
          <p className="mt-1.5 text-[12px] text-muted">
            {items.length} saved item{items.length === 1 ? '' : 's'}
          </p>
        </div>
        {items.length > 0 && (
          <Button variant="ghost" onClick={clear} loading={busy} loadingText="Clearing...">
            Clear wishlist
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-chalk p-8 text-center sm:p-12">
          <p className="font-display text-[20px] uppercase text-ink">Your wishlist is empty</p>
          <p className="mx-auto mt-2 max-w-sm text-[12.5px] text-muted">
            Tap the heart icon on any candle or fragrance to save it for later.
          </p>
          <Link to="/collections/all-products" className="btn-ink mt-6 inline-flex">
            Explore catalogue
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.handle} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
