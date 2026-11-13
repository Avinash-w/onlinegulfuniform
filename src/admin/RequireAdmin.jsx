import { Navigate, useLocation } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import { adminUser } from '../store/selectors.js'

/** Blocks admin routes until a staff session exists. */
export default function RequireAdmin({ children }) {
  const { state } = useStore()
  const location = useLocation()
  const session = adminUser(state)

  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />
  }

  return children
}
