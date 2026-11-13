import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { invoiceSettings } from '../store/selectors.js'
import { apiPatch } from '../lib/api.js'
import { Button, Card, Field, Input, PageHeader, Select, Textarea } from './ui.jsx'

const GST_RATES = [
  { value: '0', label: '0% (Exempted)' },
  { value: '5', label: '5% (Essential Goods)' },
  { value: '12', label: '12% (Standard Low)' },
  { value: '18', label: '18% (Standard Candles/Fragrances)' },
  { value: '28', label: '28% (Luxury Goods)' },
]

const INDIAN_STATES = [
  { name: 'Andhra Pradesh', code: '37' },
  { name: 'Arunachal Pradesh', code: '12' },
  { name: 'Assam', code: '18' },
  { name: 'Bihar', code: '10' },
  { name: 'Chhattisgarh', code: '22' },
  { name: 'Delhi', code: '07' },
  { name: 'Goa', code: '30' },
  { name: 'Gujarat', code: '24' },
  { name: 'Haryana', code: '06' },
  { name: 'Himachal Pradesh', code: '02' },
  { name: 'Jammu & Kashmir', code: '01' },
  { name: 'Jharkhand', code: '20' },
  { name: 'Karnataka', code: '29' },
  { name: 'Kerala', code: '32' },
  { name: 'Madhya Pradesh', code: '23' },
  { name: 'Maharashtra', code: '27' },
  { name: 'Manipur', code: '14' },
  { name: 'Meghalaya', code: '17' },
  { name: 'Mizoram', code: '15' },
  { name: 'Nagaland', code: '13' },
  { name: 'Odisha', code: '21' },
  { name: 'Punjab', code: '03' },
  { name: 'Rajasthan', code: '08' },
  { name: 'Sikkim', code: '11' },
  { name: 'Tamil Nadu', code: '33' },
  { name: 'Telangana', code: '36' },
  { name: 'Tripura', code: '16' },
  { name: 'Uttar Pradesh', code: '09' },
  { name: 'Uttarakhand', code: '05' },
  { name: 'West Bengal', code: '19' },
]

export default function InvoiceSettings() {
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const savedSettings = invoiceSettings(state)

  const [form, setForm] = useState({
    companyName: savedSettings.companyName || 'EvaraNest Lifestyle Pvt. Ltd.',
    brandName: savedSettings.brandName || 'EvaraNest',
    tagline: savedSettings.tagline || 'Handmade Luxury Candles & Artisanal Fragrances',
    logo: savedSettings.logo || '/logo/evaranest-logo.png',
    gstin: savedSettings.gstin || '07AAAAA0000A1Z5',
    pan: savedSettings.pan || 'AAAAA0000A',
    cin: savedSettings.cin || 'U74999DL2023PTC123456',

    // Registered Address
    addressLine1: savedSettings.addressLine1 || 'Plot No. 42, Okhla Industrial Area Phase-III',
    addressLine2: savedSettings.addressLine2 || 'Near Crown Plaza, South Delhi',
    city: savedSettings.city || 'New Delhi',
    state: savedSettings.state || 'Delhi',
    stateCode: savedSettings.stateCode || '07',
    pincode: savedSettings.pincode || '110020',
    country: savedSettings.country || 'India',

    // Contact
    phone: savedSettings.phone || '+91 98765 43210',
    email: savedSettings.email || 'care@evaranest.com',
    website: savedSettings.website || 'www.evaranest.com',

    // Invoice Format & Tax Rules
    invoicePrefix: savedSettings.invoicePrefix || 'INV-2024-',
    invoiceNumberDigits: savedSettings.invoiceNumberDigits || 5,
    defaultHsn: savedSettings.defaultHsn || '34060010',
    taxType: savedSettings.taxType || 'inclusive',
    defaultGstRate: String(savedSettings.defaultGstRate ?? '18'),
    enableInterStateGst: savedSettings.enableInterStateGst !== false,
    showTaxBreakupTable: savedSettings.showTaxBreakupTable !== false,

    // Bank Details & QR
    bankName: savedSettings.bankName || 'HDFC Bank Ltd.',
    accountHolder: savedSettings.accountHolder || 'EvaraNest Lifestyle Pvt. Ltd.',
    accountNumber: savedSettings.accountNumber || '50200012345678',
    ifscCode: savedSettings.ifscCode || 'HDFC0001234',
    branch: savedSettings.branch || 'Okhla Phase-III, New Delhi',
    upiId: savedSettings.upiId || 'evaranest@hdfcbank',
    upiPayeeName: savedSettings.upiPayeeName || 'EvaraNest Lifestyle',
    qrCodeType: savedSettings.qrCodeType || 'auto', // 'auto' | 'custom'
    qrCodeUrl: savedSettings.qrCodeUrl || '',
    showQrCode: savedSettings.showQrCode !== false,

    // Authorized Signatory
    authorizedSignatoryName: savedSettings.authorizedSignatoryName || 'Authorized Signatory',
    authorizedSignatoryTitle: savedSettings.authorizedSignatoryTitle || 'For EvaraNest Lifestyle Pvt. Ltd.',
    signatureUrl: savedSettings.signatureUrl || '',

    // Notes & Terms
    invoiceNotes:
      savedSettings.invoiceNotes ||
      'Thank you for shopping with EvaraNest! We hope our artisanal fragrances bring warmth and calm to your home.',
    termsAndConditions:
      savedSettings.termsAndConditions ||
      '1. Goods once sold are covered under our 7-day return policy as per terms.\n2. All disputes are subject to New Delhi jurisdiction only.\n3. This is a computer-generated tax invoice and requires no physical signature.',

    // Toggles
    showLogo: savedSettings.showLogo !== false,
    showBankDetails: savedSettings.showBankDetails !== false,
    showAuthorizedSignature: savedSettings.showAuthorizedSignature !== false,
    showTerms: savedSettings.showTerms !== false,
    themeColor: savedSettings.themeColor || '#4849E8',
  })

  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('company') // 'company' | 'tax' | 'bank' | 'signatory' | 'terms'

  const updateField = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  const handleStateChange = (stateName) => {
    const found = INDIAN_STATES.find((s) => s.name.toLowerCase() === stateName.toLowerCase())
    setForm((prev) => ({
      ...prev,
      state: stateName,
      stateCode: found ? found.code : prev.stateCode,
    }))
  }

  const handleSignatureUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      updateField('signatureUrl', event.target?.result)
    }
    reader.readAsDataURL(file)
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      updateField('logo', event.target?.result)
    }
    reader.readAsDataURL(file)
  }

  const handleQrCodeUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      updateField('qrCodeUrl', event.target?.result)
      updateField('qrCodeType', 'custom')
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // 1. Update Redux store
      dispatch({
        type: 'content/set',
        patch: { invoice: form },
      })

      // 2. Persist to API backend
      await apiPatch('/content', { section: 'invoice', value: form }, { auth: true })

      notify('Invoice and GST settings saved successfully!')
    } catch (err) {
      console.error('Failed to save invoice settings:', err)
      notify(err.message || 'Failed to save settings, please try again.')
    } finally {
      setSaving(false)
    }
  }

  const sampleOrderId = state.orders?.[0]?.id || 'EN11002'

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Invoice & GST Settings"
        sub="Manage company profile, GSTIN tax rules, invoice formatting, banking details, and authorized signature."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/invoice/${sampleOrderId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-[12px] font-semibold text-gray-700 transition-colors shadow-xs"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#4849E8]" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>Preview Tax Invoice ↗</span>
            </Link>
            <Button
              variant="primary"
              disabled={saving}
              onClick={handleSave}
              className="!bg-[#4849E8] hover:!bg-[#3b3cd8] text-white"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        }
      />

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('company')}
          className={`px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-colors ${
            activeTab === 'company'
              ? 'bg-[#4849E8] text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          🏢 Company & GST Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tax')}
          className={`px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-colors ${
            activeTab === 'tax'
              ? 'bg-[#4849E8] text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          🧾 Numbering & Tax Rules
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bank')}
          className={`px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-colors ${
            activeTab === 'bank'
              ? 'bg-[#4849E8] text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          🏦 Bank & UPI Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('signatory')}
          className={`px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-colors ${
            activeTab === 'signatory'
              ? 'bg-[#4849E8] text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          ✍️ Authorized Signatory
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('terms')}
          className={`px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-colors ${
            activeTab === 'terms'
              ? 'bg-[#4849E8] text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          📋 Notes & Terms
        </button>
      </div>

      {/* TAB 1: Company Profile & GST Details */}
      {activeTab === 'company' && (
        <div className="grid gap-6">
          <Card title="Business & Legal Information">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Registered Company Name">
                <Input
                  value={form.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  placeholder="e.g. EvaraNest Lifestyle Pvt. Ltd."
                />
              </Field>
              <Field label="Brand / Trade Name">
                <Input
                  value={form.brandName}
                  onChange={(e) => updateField('brandName', e.target.value)}
                  placeholder="e.g. EvaraNest"
                />
              </Field>
              <Field label="Company Tagline / Subtitle">
                <Input
                  value={form.tagline}
                  onChange={(e) => updateField('tagline', e.target.value)}
                  placeholder="e.g. Handmade Luxury Candles & Artisanal Fragrances"
                />
              </Field>
              <Field label="GSTIN (15-digit GST Number)">
                <Input
                  value={form.gstin}
                  onChange={(e) => updateField('gstin', e.target.value.toUpperCase())}
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  className="font-mono"
                />
              </Field>
              <Field label="PAN Number">
                <Input
                  value={form.pan}
                  onChange={(e) => updateField('pan', e.target.value.toUpperCase())}
                  placeholder="e.g. AAAAA0000A"
                  className="font-mono"
                />
              </Field>
              <Field label="CIN (Corporate Identification Number)">
                <Input
                  value={form.cin}
                  onChange={(e) => updateField('cin', e.target.value.toUpperCase())}
                  placeholder="e.g. U74999DL2023PTC123456"
                  className="font-mono"
                />
              </Field>
            </div>
          </Card>

          <Card title="Registered Business & Dispatch Address">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Address Line 1 (Premises / Plot / Street)">
                  <Input
                    value={form.addressLine1}
                    onChange={(e) => updateField('addressLine1', e.target.value)}
                    placeholder="e.g. Plot No. 42, Okhla Industrial Area Phase-III"
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Address Line 2 (Landmark / Area)">
                  <Input
                    value={form.addressLine2}
                    onChange={(e) => updateField('addressLine2', e.target.value)}
                    placeholder="e.g. Near Crown Plaza, South Delhi"
                  />
                </Field>
              </div>
              <Field label="City">
                <Input
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="e.g. New Delhi"
                />
              </Field>
              <Field label="State">
                <Select
                  value={form.state}
                  onChange={(e) => handleStateChange(e.target.value)}
                  options={INDIAN_STATES.map((s) => ({ value: s.name, label: `${s.name} (${s.code})` }))}
                />
              </Field>
              <Field label="State Code (2-digit GST State Code)">
                <Input
                  value={form.stateCode}
                  onChange={(e) => updateField('stateCode', e.target.value)}
                  placeholder="e.g. 07"
                  className="font-mono"
                />
              </Field>
              <Field label="PIN Code">
                <Input
                  value={form.pincode}
                  onChange={(e) => updateField('pincode', e.target.value)}
                  placeholder="e.g. 110020"
                />
              </Field>
            </div>
          </Card>

          <Card title="Contact & Storefront Branding">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Support Phone / Helpline">
                <Input
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                />
              </Field>
              <Field label="Official Billing Email">
                <Input
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="e.g. care@evaranest.com"
                />
              </Field>
              <Field label="Website URL">
                <Input
                  value={form.website}
                  onChange={(e) => updateField('website', e.target.value)}
                  placeholder="e.g. www.evaranest.com"
                />
              </Field>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-150 grid gap-4 sm:grid-cols-2 items-center">
              <div>
                <Field label="Invoice Logo URL or Upload">
                  <div className="flex gap-2">
                    <Input
                      value={form.logo}
                      onChange={(e) => updateField('logo', e.target.value)}
                      placeholder="/logo/evaranest-logo.png"
                    />
                    <label className="shrink-0 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1">
                      <span>Upload</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  </div>
                </Field>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="showLogo"
                  checked={form.showLogo}
                  onChange={(e) => updateField('showLogo', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#4849E8]"
                />
                <label htmlFor="showLogo" className="text-xs font-medium text-gray-800 cursor-pointer">
                  Display Logo in Invoice Header
                </label>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: Numbering & Tax Rules */}
      {activeTab === 'tax' && (
        <div className="grid gap-6">
          <Card title="Invoice Numbering & HSN Setup">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Invoice Number Prefix">
                <Input
                  value={form.invoicePrefix}
                  onChange={(e) => updateField('invoicePrefix', e.target.value)}
                  placeholder="e.g. INV-2024-"
                  className="font-mono"
                />
                <p className="mt-1 text-[11px] text-gray-500">Appears before the order number (e.g. <code>INV-2024-EN11002</code>)</p>
              </Field>
              <Field label="Padded Digits Count">
                <Input
                  type="number"
                  value={form.invoiceNumberDigits}
                  onChange={(e) => updateField('invoiceNumberDigits', Number(e.target.value))}
                  placeholder="5"
                />
                <p className="mt-1 text-[11px] text-gray-500">Minimum number of digits for invoice numbering</p>
              </Field>
              <Field label="Default HSN / SAC Code">
                <Input
                  value={form.defaultHsn}
                  onChange={(e) => updateField('defaultHsn', e.target.value)}
                  placeholder="e.g. 34060010"
                  className="font-mono"
                />
                <p className="mt-1 text-[11px] text-gray-500">34060010 is standard HSN for Candles & Tapers</p>
              </Field>
            </div>
          </Card>

          <Card title="GST Tax Calculation Rules">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tax Pricing Mode">
                <Select
                  value={form.taxType}
                  onChange={(e) => updateField('taxType', e.target.value)}
                  options={[
                    { value: 'inclusive', label: 'Tax Inclusive (Catalog prices include GST)' },
                    { value: 'exclusive', label: 'Tax Exclusive (GST is added over catalog prices)' },
                  ]}
                />
              </Field>

              <Field label="Default GST Rate (%)">
                <Select
                  value={form.defaultGstRate}
                  onChange={(e) => updateField('defaultGstRate', e.target.value)}
                  options={GST_RATES}
                />
              </Field>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-150 space-y-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="enableInterStateGst"
                  checked={form.enableInterStateGst}
                  onChange={(e) => updateField('enableInterStateGst', e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#4849E8]"
                />
                <div>
                  <label htmlFor="enableInterStateGst" className="text-xs font-semibold text-gray-900 cursor-pointer">
                    Enable Auto-Detection of Intra-State vs Inter-State GST
                  </label>
                  <p className="text-[11px] text-gray-500">
                    When buyer state matches company state ({form.state}), CGST ({Number(form.defaultGstRate) / 2}%) + SGST ({Number(form.defaultGstRate) / 2}%) is applied. Otherwise, IGST ({form.defaultGstRate}%) is charged automatically.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="showTaxBreakupTable"
                  checked={form.showTaxBreakupTable}
                  onChange={(e) => updateField('showTaxBreakupTable', e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#4849E8]"
                />
                <div>
                  <label htmlFor="showTaxBreakupTable" className="text-xs font-semibold text-gray-900 cursor-pointer">
                    Include Detailed HSN/SAC Tax Summary Table in Invoice
                  </label>
                  <p className="text-[11px] text-gray-500">
                    Complies with Indian GST Law section 31 for tax invoice disclosures.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: Bank & UPI Details */}
      {activeTab === 'bank' && (
        <div className="grid gap-6">
          <Card title="Banking Details for Direct Bank Transfer (NEFT / RTGS / IMPS)">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Bank Name">
                <Input
                  value={form.bankName}
                  onChange={(e) => updateField('bankName', e.target.value)}
                  placeholder="e.g. HDFC Bank Ltd."
                />
              </Field>
              <Field label="Account Holder Name">
                <Input
                  value={form.accountHolder}
                  onChange={(e) => updateField('accountHolder', e.target.value)}
                  placeholder="e.g. EvaraNest Lifestyle Pvt. Ltd."
                />
              </Field>
              <Field label="Bank Account Number">
                <Input
                  value={form.accountNumber}
                  onChange={(e) => updateField('accountNumber', e.target.value)}
                  placeholder="e.g. 50200012345678"
                  className="font-mono"
                />
              </Field>
              <Field label="IFSC Code">
                <Input
                  value={form.ifscCode}
                  onChange={(e) => updateField('ifscCode', e.target.value.toUpperCase())}
                  placeholder="e.g. HDFC0001234"
                  className="font-mono"
                />
              </Field>
              <Field label="Branch Name & City">
                <Input
                  value={form.branch}
                  onChange={(e) => updateField('branch', e.target.value)}
                  placeholder="e.g. Okhla Phase-III, New Delhi"
                />
              </Field>
              <Field label="UPI ID / VPA">
                <Input
                  value={form.upiId}
                  onChange={(e) => updateField('upiId', e.target.value)}
                  placeholder="e.g. evaranest@hdfcbank"
                  className="font-mono"
                />
              </Field>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-150 flex items-center gap-3">
              <input
                type="checkbox"
                id="showBankDetails"
                checked={form.showBankDetails}
                onChange={(e) => updateField('showBankDetails', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#4849E8]"
              />
              <label htmlFor="showBankDetails" className="text-xs font-semibold text-gray-900 cursor-pointer">
                Show Bank & UPI Details on Invoices
              </label>
            </div>
          </Card>

          {/* UPI Payment QR Code Card */}
          <Card title="📱 UPI Payment QR Code Setup (Scan & Pay on Invoice)">
            <div className="grid gap-6 md:grid-cols-12 items-start">
              {/* Left Settings (7 cols) */}
              <div className="md:col-span-7 space-y-4">
                <Field label="QR Code Mode">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label
                      className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                        form.qrCodeType === 'auto'
                          ? 'border-[#4849E8] bg-[#4849E8]/5 text-[#4849E8] font-bold ring-1 ring-[#4849E8]'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="qrCodeType"
                        value="auto"
                        checked={form.qrCodeType === 'auto'}
                        onChange={() => updateField('qrCodeType', 'auto')}
                        className="text-[#4849E8]"
                      />
                      <span>⚡ Auto-Generate Dynamic UPI QR</span>
                    </label>

                    <label
                      className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                        form.qrCodeType === 'custom'
                          ? 'border-[#4849E8] bg-[#4849E8]/5 text-[#4849E8] font-bold ring-1 ring-[#4849E8]'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="qrCodeType"
                        value="custom"
                        checked={form.qrCodeType === 'custom'}
                        onChange={() => updateField('qrCodeType', 'custom')}
                        className="text-[#4849E8]"
                      />
                      <span>🖼️ Upload Custom Merchant QR</span>
                    </label>
                  </div>
                </Field>

                <Field label="UPI Payee / Business Display Name">
                  <Input
                    value={form.upiPayeeName}
                    onChange={(e) => updateField('upiPayeeName', e.target.value)}
                    placeholder="e.g. EvaraNest Lifestyle"
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    Displayed on the customer's UPI app (Google Pay, PhonePe, Paytm, BHIM) when scanned.
                  </p>
                </Field>

                {form.qrCodeType === 'custom' && (
                  <Field label="Custom Merchant QR Code Image">
                    <div className="flex gap-2">
                      <Input
                        value={form.qrCodeUrl}
                        onChange={(e) => updateField('qrCodeUrl', e.target.value)}
                        placeholder="Upload or paste image link"
                      />
                      <label className="shrink-0 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1">
                        <span>Upload</span>
                        <input type="file" accept="image/*" onChange={handleQrCodeUpload} className="hidden" />
                      </label>
                    </div>
                  </Field>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="showQrCode"
                    checked={form.showQrCode}
                    onChange={(e) => updateField('showQrCode', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#4849E8]"
                  />
                  <label htmlFor="showQrCode" className="text-xs font-semibold text-gray-900 cursor-pointer">
                    Display Payment QR Code on Invoices
                  </label>
                </div>
              </div>

              {/* Right Live QR Code Preview (5 cols) */}
              <div className="md:col-span-5 bg-[#F8F9FD] border border-gray-200 rounded-2xl p-4 text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-700 block mb-2">
                  Live QR Code Preview
                </span>
                
                <div className="inline-block bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm mx-auto">
                  {form.qrCodeType === 'custom' && form.qrCodeUrl ? (
                    <img
                      src={form.qrCodeUrl}
                      alt="Custom Merchant QR"
                      className="w-36 h-36 object-contain rounded"
                    />
                  ) : form.upiId ? (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=8&data=${encodeURIComponent(
                        `upi://pay?pa=${form.upiId}&pn=${encodeURIComponent(form.upiPayeeName || form.companyName || 'EvaraNest')}&cu=INR`
                      )}`}
                      alt="UPI QR Code"
                      className="w-36 h-36 object-contain rounded"
                    />
                  ) : (
                    <div className="w-36 h-36 bg-gray-100 rounded flex items-center justify-center text-[11px] text-gray-400 p-3">
                      Enter UPI ID to generate QR
                    </div>
                  )}
                </div>

                <p className="mt-2 text-[11px] font-bold text-gray-900">
                  {form.upiPayeeName || form.companyName || 'EvaraNest'}
                </p>
                <p className="text-[10px] font-mono text-[#4849E8] font-semibold">
                  {form.upiId || 'Enter UPI ID above'}
                </p>
                <p className="mt-1 text-[9.5px] text-gray-500">
                  Compatible with GPay, PhonePe, Paytm, BHIM & all UPI apps
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: Authorized Signatory */}
      {activeTab === 'signatory' && (
        <div className="grid gap-6">
          <Card title="Authorized Signatory & Digital Signature Stamp">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Signatory Person / Title">
                <Input
                  value={form.authorizedSignatoryName}
                  onChange={(e) => updateField('authorizedSignatoryName', e.target.value)}
                  placeholder="e.g. Authorized Signatory"
                />
              </Field>
              <Field label="Signatory Company Header">
                <Input
                  value={form.authorizedSignatoryTitle}
                  onChange={(e) => updateField('authorizedSignatoryTitle', e.target.value)}
                  placeholder="e.g. For EvaraNest Lifestyle Pvt. Ltd."
                />
              </Field>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-150 grid gap-4 sm:grid-cols-2 items-center">
              <div>
                <Field label="Signature Image (PNG / JPEG / WebP)">
                  <div className="flex gap-2">
                    <Input
                      value={form.signatureUrl}
                      onChange={(e) => updateField('signatureUrl', e.target.value)}
                      placeholder="Upload or paste image URL"
                    />
                    <label className="shrink-0 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1">
                      <span>Upload</span>
                      <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                    </label>
                  </div>
                </Field>
              </div>

              {form.signatureUrl && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="h-12 w-28 bg-white border border-gray-200 rounded flex items-center justify-center p-1">
                    <img src={form.signatureUrl} alt="Signature Preview" className="max-h-full max-w-full object-contain" />
                  </div>
                  <button
                    type="button"
                    onClick={() => updateField('signatureUrl', '')}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove Signature
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <input
                type="checkbox"
                id="showAuthorizedSignature"
                checked={form.showAuthorizedSignature}
                onChange={(e) => updateField('showAuthorizedSignature', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#4849E8]"
              />
              <label htmlFor="showAuthorizedSignature" className="text-xs font-semibold text-gray-900 cursor-pointer">
                Display Authorized Signatory Section on Invoices
              </label>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: Notes & Terms */}
      {activeTab === 'terms' && (
        <div className="grid gap-6">
          <Card title="Invoice Notes & Terms of Service">
            <div className="space-y-4">
              <Field label="Customer Thank You Note / Tagline Note">
                <Input
                  value={form.invoiceNotes}
                  onChange={(e) => updateField('invoiceNotes', e.target.value)}
                  placeholder="e.g. Thank you for shopping with EvaraNest!"
                />
              </Field>

              <Field label="Terms & Conditions (Displays in invoice footer)">
                <Textarea
                  rows={4}
                  value={form.termsAndConditions}
                  onChange={(e) => updateField('termsAndConditions', e.target.value)}
                  placeholder="1. Goods once sold are covered under our 7-day return policy..."
                />
              </Field>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="showTerms"
                  checked={form.showTerms}
                  onChange={(e) => updateField('showTerms', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#4849E8]"
                />
                <label htmlFor="showTerms" className="text-xs font-semibold text-gray-900 cursor-pointer">
                  Display Terms & Conditions block on Invoices
                </label>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Bottom Save Action Bar */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 bg-white border border-gray-300 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-gray-600 font-medium">Changes will apply to all newly generated and printed invoices</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/invoice/${sampleOrderId}`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
          >
            Preview Invoice ↗
          </Link>
          <Button
            variant="primary"
            disabled={saving}
            onClick={handleSave}
            className="!bg-[#4849E8] hover:!bg-[#3b3cd8] text-white px-5"
          >
            {saving ? 'Saving...' : 'Save All Settings'}
          </Button>
        </div>
      </div>
    </div>
  )
}
