import { useEffect, useMemo, useState } from 'react'
import { useCart } from '../context/CartContext.jsx'
import { apiDelete, apiGet, apiPatch } from '../lib/api.js'
import { Badge, Button, Card, ConfirmModal, Field, Modal, PageHeader, Pagination, Select, Stat, Table, Td, Textarea, Tr } from './ui.jsx'

const STATUS_OPTIONS = [
  { value: 'New', label: 'New' },
  { value: 'Contacted', label: 'Contacted' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
]

export default function CustomEnquiriesAdmin() {
  const { notify } = useCart()
  const [enquiries, setEnquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [selectedEnquiry, setSelectedEnquiry] = useState(null)
  const [modalNotes, setModalNotes] = useState('')
  const [modalStatus, setModalStatus] = useState('New')
  const [updating, setUpdating] = useState(false)
  const [deletingEnquiry, setDeletingEnquiry] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadEnquiries = async () => {
    setLoading(true)
    try {
      const res = await apiGet('/enquiries', { auth: 'admin' })
      if (res?.data?.enquiries) {
        setEnquiries(res.data.enquiries)
      } else if (Array.isArray(res?.data)) {
        setEnquiries(res.data)
      }
    } catch (err) {
      console.error('Failed to load enquiries:', err)
      setEnquiries([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEnquiries()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [query, statusFilter])

  const filtered = useMemo(() => {
    let list = enquiries
    if (statusFilter !== 'ALL') {
      list = list.filter((e) => (e.status || 'New') === statusFilter)
    }
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (e) =>
          e.name?.toLowerCase().includes(q) ||
          e.phone?.toLowerCase().includes(q) ||
          e.email?.toLowerCase().includes(q) ||
          e.occasion?.toLowerCase().includes(q) ||
          e.message?.toLowerCase().includes(q) ||
          e.id?.toLowerCase().includes(q)
      )
    }
    return list
  }, [enquiries, statusFilter, query])

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * 12
    return filtered.slice(start, start + 12)
  }, [filtered, page])

  const stats = useMemo(() => {
    const total = enquiries.length
    const newCount = enquiries.filter((e) => (e.status || 'New') === 'New').length
    const inProgress = enquiries.filter((e) => ['Contacted', 'In Progress'].includes(e.status)).length
    const completed = enquiries.filter((e) => e.status === 'Completed').length
    return { total, newCount, inProgress, completed }
  }, [enquiries])

  const openDetail = (enq) => {
    setSelectedEnquiry(enq)
    setModalStatus(enq.status || 'New')
    setModalNotes(enq.notes || '')
  }

  const handleUpdate = async () => {
    if (!selectedEnquiry) return
    setUpdating(true)
    try {
      const res = await apiPatch(`/enquiries/${selectedEnquiry.id}`, {
        status: modalStatus,
        notes: modalNotes,
      }, { auth: 'admin' })

      setEnquiries((prev) =>
        prev.map((e) =>
          e.id === selectedEnquiry.id
            ? { ...e, status: modalStatus, notes: modalNotes }
            : e
        )
      )

      setSelectedEnquiry(null)
      notify(res?.message || 'Enquiry updated successfully!')
    } catch (err) {
      notify(err.message || 'Failed to update enquiry.')
    } finally {
      setUpdating(false)
    }
  }

  const confirmDelete = async () => {
    if (!deletingEnquiry || deleting) return
    const enq = deletingEnquiry
    setDeleting(true)
    try {
      const res = await apiDelete(`/enquiries/${enq.id}`, { auth: 'admin' })
      setEnquiries((prev) => prev.filter((item) => item.id !== enq.id))
      notify(res?.message || 'Enquiry deleted successfully!')
      if (selectedEnquiry?.id === enq.id) {
        setSelectedEnquiry(null)
      }
      setDeletingEnquiry(null)
    } catch (err) {
      notify(err?.message || 'Failed to delete enquiry.')
    } finally {
      setDeleting(false)
    }
  }

  const getWhatsAppLink = (enq) => {
    const cleanPhone = (enq.phone || '').replace(/[^0-9]/g, '')
    const msg = `Hi ${enq.name}, thank you for contacting EvaraNest regarding your custom enquiry for ${enq.occasion} (${enq.quantity}). How can we help you further?`
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Custom Enquiries"
        sub="Manage and respond to bespoke orders, wedding favors & bulk gifting requests."
        action={
          <Button variant="ghost" onClick={loadEnquiries} loading={loading}>
            Refresh List
          </Button>
        }
      />

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-graphite">Total Enquiries</p>
          <p className="mt-1 text-[17px] font-bold text-ink leading-tight">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">New Requests</p>
          <p className="mt-1 text-[17px] font-bold text-amber-600 leading-tight">{stats.newCount}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">In Discussion</p>
          <p className="mt-1 text-[17px] font-bold text-indigo-600 leading-tight">{stats.inProgress}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-2.5 px-3 shadow-2xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Completed Orders</p>
          <p className="mt-1 text-[17px] font-bold text-emerald-600 leading-tight">{stats.completed}</p>
        </div>
      </div>

      <Card className="!p-0">
        {/* Search & Filter Tabs */}
        <div className="p-3.5 sm:p-4 border-b border-line space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {['ALL', 'New', 'Contacted', 'In Progress', 'Completed', 'Cancelled'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`rounded-full px-3 py-0.5 text-[11px] font-semibold transition-all cursor-pointer ${
                    statusFilter === tab
                      ? 'bg-[#4849E8] text-white shadow-2xs'
                      : 'bg-chalk text-graphite hover:bg-line/70'
                  }`}
                >
                  {tab === 'ALL' ? 'All Enquiries' : tab}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-graphite">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="search"
                placeholder="Search name, phone, event…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-[38px] rounded-lg border border-line bg-white pl-9 pr-3 text-[12.5px] text-ink outline-none placeholder:text-muted focus:border-[#4849E8]"
              />
            </div>
          </div>
        </div>

        {/* Enquiries Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-line bg-chalk/40 text-[10.5px] font-bold uppercase tracking-wider text-graphite">
                <th className="py-2.5 pl-4 px-3">Date & ID</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Occasion / Event</th>
                <th className="py-2.5 px-3">Quantity</th>
                <th className="py-2.5 px-3">Requirement / Notes</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 pr-4 pl-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted">
                    No custom product enquiries found.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((enq) => {
                  const dateStr = enq.created_at || enq.date
                  const formattedDate = dateStr
                    ? new Date(dateStr).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'

                  return (
                    <tr key={enq.id} className="hover:bg-[#F9F9FE] transition-colors cursor-pointer" onClick={() => openDetail(enq)}>
                      <td className="py-3 pl-4 px-3 whitespace-nowrap font-mono text-[11px]">
                        <div className="font-bold text-ink hover:text-[#4849E8]">{enq.id}</div>
                        <div className="text-muted text-[10.5px]">{formattedDate}</div>
                      </td>

                      <td className="py-3 px-3 min-w-[140px]">
                        <div className="font-semibold text-ink">{enq.name}</div>
                        <div className="text-[11px] text-muted">{enq.phone}</div>
                        {enq.email && <div className="text-[11px] text-muted truncate">{enq.email}</div>}
                      </td>

                      <td className="py-3 px-3">
                        <span className="inline-block rounded-md bg-chalk px-2 py-0.5 text-[11px] font-medium text-ink">
                          {enq.occasion || '—'}
                        </span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-[12px] font-semibold text-ink">
                        {enq.quantity || '—'}
                      </td>

                      <td className="py-3 px-3 max-w-[200px]">
                        <p className="line-clamp-2 text-[11px] text-muted">
                          {enq.message || (enq.notes ? `Note: ${enq.notes}` : '—')}
                        </p>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <Badge tone={enq.status || 'New'}>{enq.status || 'New'}</Badge>
                      </td>

                      <td className="py-3 pr-4 pl-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <a
                            href={getWhatsAppLink(enq)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Chat on WhatsApp"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                          >
                            <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z" />
                            </svg>
                          </a>

                          <button
                            type="button"
                            title="Edit / View Details"
                            onClick={() => openDetail(enq)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line bg-white text-graphite hover:bg-chalk hover:text-ink transition-colors"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            title="Delete Enquiry"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeletingEnquiry(enq)
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 bg-red-50 text-[#E02438] hover:bg-red-100 transition-colors"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-line px-4 py-3">
          <Pagination
            page={page}
            total={filtered.length}
            pageSize={12}
            onChange={setPage}
          />
        </div>
      </Card>

      {/* Detail / Edit Status Modal */}
      <Modal
        open={Boolean(selectedEnquiry)}
        onClose={() => setSelectedEnquiry(null)}
        title={`Custom Enquiry — ${selectedEnquiry?.id || ''}`}
        wide
      >
        {selectedEnquiry && (
          <div className="space-y-4">
            {/* Customer & Event Details Card */}
            <div className="rounded-xl border border-line bg-chalk/60 p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3.5 text-[12.5px]">
                <div>
                  <span className="block text-[10.5px] font-bold uppercase tracking-wider text-muted mb-0.5">
                    Customer Name
                  </span>
                  <span className="font-semibold text-ink break-words">{selectedEnquiry.name}</span>
                </div>

                <div>
                  <span className="block text-[10.5px] font-bold uppercase tracking-wider text-muted mb-0.5">
                    WhatsApp / Phone
                  </span>
                  <a
                    href={`tel:${selectedEnquiry.phone}`}
                    className="font-bold text-[#4849E8] hover:underline"
                  >
                    {selectedEnquiry.phone}
                  </a>
                </div>

                <div>
                  <span className="block text-[10.5px] font-bold uppercase tracking-wider text-muted mb-0.5">
                    Email Address
                  </span>
                  <span className="text-graphite font-medium break-all">{selectedEnquiry.email || '—'}</span>
                </div>

                <div>
                  <span className="block text-[10.5px] font-bold uppercase tracking-wider text-muted mb-0.5">
                    Occasion / Event
                  </span>
                  <span className="font-semibold text-ink">{selectedEnquiry.occasion}</span>
                </div>

                <div>
                  <span className="block text-[10.5px] font-bold uppercase tracking-wider text-muted mb-0.5">
                    Estimated Quantity
                  </span>
                  <span className="inline-flex items-center font-bold text-ink">
                    {selectedEnquiry.quantity}
                  </span>
                </div>

                <div>
                  <span className="block text-[10.5px] font-bold uppercase tracking-wider text-muted mb-0.5">
                    Received At
                  </span>
                  <span className="text-muted font-medium">
                    {selectedEnquiry.created_at || selectedEnquiry.date
                      ? new Date(selectedEnquiry.created_at || selectedEnquiry.date).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Message / Specifications */}
            {selectedEnquiry.message && (
              <div>
                <span className="block text-[10.5px] font-bold uppercase tracking-wider text-muted mb-1.5">
                  Customer Specifications / Message
                </span>
                <div className="rounded-xl border border-line bg-white p-3.5 text-[13px] leading-relaxed text-ink shadow-xs">
                  {selectedEnquiry.message}
                </div>
              </div>
            )}

            {/* Status & Actions Section */}
            <div className="rounded-xl border border-line bg-white p-4 shadow-xs space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
                <Field label="Update Enquiry Status">
                  <Select
                    options={STATUS_OPTIONS}
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value)}
                  />
                </Field>

                <a
                  href={getWhatsAppLink(selectedEnquiry)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-[34px] items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 text-[12px] font-bold text-white shadow-xs transition-all hover:bg-[#1EBE5D] hover:shadow active:scale-[0.98]"
                >
                  <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.952 3.71 1.453 5.711 1.454h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <span>Open WhatsApp Chat</span>
                </a>
              </div>

              <Field label="Admin Internal Notes" hint="Visible only to administrators">
                <Textarea
                  rows={2}
                  placeholder="e.g. Quoted ₹450/pc for 50 custom soy candles. Follow-up on Thursday."
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                />
              </Field>
            </div>

            {/* Modal Bottom Footer Actions */}
            <div className="flex items-center justify-between border-t border-line pt-3.5">
              <Button
                variant="danger"
                onClick={() => setDeletingEnquiry(selectedEnquiry)}
              >
                Delete Enquiry
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setSelectedEnquiry(null)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleUpdate} loading={updating}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={Boolean(deletingEnquiry)}
        onClose={() => !deleting && setDeletingEnquiry(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        loadingText="Deleting enquiry..."
        title={`Delete Enquiry ${deletingEnquiry?.id || ''}?`}
        message={`Are you sure you want to permanently delete the custom enquiry from ${deletingEnquiry?.name || 'this customer'} (${deletingEnquiry?.occasion || ''})?`}
        confirmText="Delete enquiry"
        tone="danger"
      />
    </div>
  )
}
