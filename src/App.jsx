import { useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import AmazonHeader from './components/AmazonHeader'
import BackToTop from './components/BackToTop'
import CartDrawer from './components/CartDrawer'
import CatalogueModal from './components/CatalogueModal'
import Footer from './components/Footer'
import MobileMenu from './components/MobileMenu'
import Toast from './components/Toast'
import { CartProvider } from './context/CartContext'
import { LanguageProvider } from './context/LanguageContext'
import { StoreProvider } from './store/StoreContext.jsx'

import Collection from './pages/Collection'
import CustomOrderPage from './pages/CustomOrderPage'
import CmsPage from './pages/CmsPage'
import Home from './pages/Home'
import Product from './pages/Product'
import Account from './pages/Account'
import AccountSettings from './pages/AccountSettings'
import Checkout from './pages/Checkout'
import Login from './pages/Login'
import OrderConfirmed from './pages/OrderConfirmed'
import Track from './pages/Track'
import Wishlist from './pages/Wishlist'

import AdminLayout from './admin/AdminLayout.jsx'
import AdminLogin from './admin/AdminLogin.jsx'
import Announcements from './admin/Announcements.jsx'
import HomeSections from './admin/HomeSections.jsx'
import Reviews from './admin/Reviews.jsx'
import Categories from './admin/Categories.jsx'
import CollectionsAdmin from './admin/CollectionsAdmin.jsx'
import Coupons from './admin/Coupons.jsx'
import CustomEnquiriesAdmin from './admin/CustomEnquiriesAdmin.jsx'
import Customers, { CustomerDetail } from './admin/Customers.jsx'
import Dashboard from './admin/Dashboard.jsx'
import FiltersAdmin from './admin/FiltersAdmin.jsx'
import HeroBanners from './admin/HeroBanners.jsx'
import HomepageAdmin from './admin/HomepageAdmin.jsx'
import OrderDetail from './admin/OrderDetail.jsx'
import Orders from './admin/Orders.jsx'
import PagesAdmin from './admin/PagesAdmin.jsx'
import ProductDetail from './admin/ProductDetail.jsx'
import ProductNew from './admin/ProductNew.jsx'
import Products from './admin/Products.jsx'
import Payments from './admin/Payments.jsx'
import Refunds from './admin/Refunds.jsx'
import RequireAdmin from './admin/RequireAdmin.jsx'
import Shipments from './admin/Shipments.jsx'
import SiteSettings from './admin/SiteSettings.jsx'
import Stock from './admin/Stock.jsx'
import AdminProfile from './admin/AdminProfile.jsx'
import InvoiceSettings from './admin/InvoiceSettings.jsx'
import Invoice from './pages/Invoice'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  return null
}

/** Storefront chrome — Amazon style Royal Blue & White header & layout */
function Shop({ children }) {
  const [catalogueOpen, setCatalogueOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <AmazonHeader onOpenAllMenu={() => setMobileMenuOpen(true)} />
      <main className="bg-white">{children}</main>
      <Footer onOpenCatalogue={() => setCatalogueOpen(true)} />
      <CartDrawer />
      <BackToTop />
      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <CatalogueModal isOpen={catalogueOpen} onClose={() => setCatalogueOpen(false)} />
    </>
  )
}

const admin = (el) => (
  <RequireAdmin>
    <AdminLayout>{el}</AdminLayout>
  </RequireAdmin>
)
const shop = (el) => <Shop>{el}</Shop>

export default function App() {
  return (
    <LanguageProvider>
      <StoreProvider>
        <CartProvider>
          <ScrollToTop />
          <Toast />
          <Routes>
            {/* ------------------------------------------------------- admin */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={admin(<Dashboard />)} />
            <Route path="/admin/profile" element={admin(<AdminProfile />)} />
            <Route path="/admin/account" element={admin(<AdminProfile />)} />
            <Route path="/admin/orders" element={admin(<Orders />)} />
            <Route path="/admin/orders/:id" element={admin(<OrderDetail />)} />
            <Route path="/admin/enquiries" element={admin(<CustomEnquiriesAdmin />)} />
            <Route path="/admin/products" element={admin(<Products />)} />
            <Route path="/admin/products/new" element={admin(<ProductNew />)} />
            <Route path="/admin/products/:handle/edit" element={admin(<ProductNew />)} />
            <Route path="/admin/products/edit/:handle" element={admin(<ProductNew />)} />
            <Route path="/admin/products/:handle" element={admin(<ProductDetail />)} />
            <Route path="/admin/categories" element={admin(<Categories />)} />
            <Route path="/admin/stock" element={admin(<Stock />)} />
            <Route path="/admin/announcements" element={admin(<Announcements />)} />
            <Route path="/admin/home-sections" element={admin(<HomeSections />)} />
            <Route path="/admin/reviews" element={admin(<Reviews />)} />
            <Route path="/admin/hero" element={admin(<HeroBanners />)} />
            <Route path="/admin/homepage" element={admin(<HomepageAdmin />)} />
            <Route path="/admin/collections" element={admin(<CollectionsAdmin />)} />
            <Route path="/admin/filters" element={admin(<FiltersAdmin />)} />
            <Route path="/admin/site" element={admin(<SiteSettings />)} />
            <Route path="/admin/pages" element={admin(<PagesAdmin />)} />
            <Route path="/admin/payments" element={admin(<Payments />)} />
            <Route path="/admin/refunds" element={admin(<Refunds />)} />
            <Route path="/admin/shipments" element={admin(<Shipments />)} />
            <Route path="/admin/customers" element={admin(<Customers />)} />
            <Route path="/admin/customers/:id" element={admin(<CustomerDetail />)} />
            <Route path="/admin/coupons" element={admin(<Coupons />)} />
            <Route path="/admin/invoice-settings" element={admin(<InvoiceSettings />)} />

            {/* --------------------------------------------------- invoice print view */}
            <Route path="/invoice/:id" element={<Invoice />} />

            {/* --------------------------------------------------- storefront */}
            <Route path="/" element={shop(<Home />)} />
            <Route path="/custom-orders" element={shop(<CustomOrderPage />)} />
            <Route path="/inquiry" element={shop(<CustomOrderPage />)} />
            <Route path="/quote" element={shop(<CustomOrderPage />)} />
            <Route path="/collections/:slug" element={shop(<Collection />)} />
            <Route path="/products/:handle" element={shop(<Product />)} />
            <Route path="/wishlist" element={shop(<Wishlist />)} />
            <Route path="/checkout" element={shop(<Checkout />)} />
            <Route path="/order-confirmed/:id" element={shop(<OrderConfirmed />)} />
            <Route path="/order-success/:id" element={shop(<OrderConfirmed />)} />
            <Route path="/login" element={shop(<Login />)} />
            <Route path="/account" element={shop(<Account />)} />
            <Route path="/account/settings" element={shop(<AccountSettings />)} />
            <Route path="/settings" element={shop(<AccountSettings />)} />
            <Route path="/track" element={shop(<Track />)} />
            <Route path="/track/:id" element={shop(<Track />)} />
            <Route path="/pages/*" element={shop(<CmsPage />)} />
            <Route path="/policies/*" element={shop(<CmsPage />)} />
            <Route path="*" element={shop(<CmsPage />)} />
          </Routes>
        </CartProvider>
      </StoreProvider>
    </LanguageProvider>
  )
}
