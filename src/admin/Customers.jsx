import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { apiDelete, apiPatch, apiPost } from '../lib/api.js'
import { useStore, inr, shortDate } from '../store/StoreContext.jsx'
import { customers, lifetimeValue, ordersOfUser, staff, userAddresses, userById } from '../store/selectors.js'
import { ROLES } from '../store/seed.js'
import { Search } from '../components/icons'
import { Badge, Button, Card, ConfirmModal, Field, Input, Modal, PageHeader, Pagination, Select, Stat, Table, Td, Textarea, Tr } from './ui.jsx'

export default function Customers() {
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [roleFilter, setRoleFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [saving, setSaving] = useState(false)

  // Reset to page 1 whenever search query or filters change
  useEffect(() => {
    setPage(1)
  }, [q, statusFilter, roleFilter])

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return state.users
      .filter((u) => {
        const matchesQuery =
          !t ||
          u.name.toLowerCase().includes(t) ||
          u.email.toLowerCase().includes(t) ||
          (u.phone && u.phone.includes(t))
        const matchesStatus = statusFilter === 'All' || u.status === statusFilter
        const matchesRole = roleFilter === 'All' || u.role === roleFilter
        return matchesQuery && matchesStatus && matchesRole
      })
      .sort((a, b) => b.createdAt - a.createdAt)
  }, [state.users, q, statusFilter, roleFilter])

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * 12
    return rows.slice(start, start + 12)
  }, [rows, page])

  const cust = customers(state)
  const blocked = cust.filter((u) => u.status === 'Blocked').length
  const totalLtv = cust.reduce((n, u) => n + lifetimeValue(state, u.id), 0)

  const patchUser = async (id, patch) => {
    if (busyId) return
    setBusyId(id)
    try {
      const json = await apiPatch(`/customers/${id}`, { patch }, { auth: true })
      dispatch({ type: 'user/ensure', user: json.data.user })
      dispatch({ type: 'user/update', id, patch: json.data.user })
      notify(json.message || 'Customer updated successfully.')
    } catch (err) {
      notify(err.message || 'Unable to update customer.')
    } finally {
      setBusyId(null)
    }
  }

  const saveUserEdit = async (id, patch) => {
    if (saving) return
    setSaving(true)
    try {
      const json = await apiPatch(`/customers/${id}`, { patch }, { auth: true })
      dispatch({ type: 'user/ensure', user: json.data.user })
      dispatch({ type: 'user/update', id, patch: json.data.user })
      notify(json.message || 'Customer updated successfully.')
      setEditingUser(null)
    } catch (err) {
      notify(err.message || 'Unable to update customer.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deletingUser || deleteBusy) return
    setDeleteBusy(true)
    try {
      await apiDelete(`/customers/${deletingUser.id}`, { auth: true })
      dispatch({ type: 'user/delete', id: deletingUser.id })
      notify('Customer deleted successfully.')
      if (editingUser?.id === deletingUser.id) setEditingUser(null)
      setDeletingUser(null)
    } catch (err) {
      notify(err.message || 'Unable to delete customer.')
    } finally {
      setDeleteBusy(false)
    }
  }

  const createUser = async (user) => {
    if (saving) return
    setSaving(true)
    try {
      const json = await apiPost('/customers', { user }, { auth: true })
      dispatch({ type: 'user/ensure', user: json.data.user })
      notify(json.message || 'Customer created successfully.')
      setAdding(false)
    } catch (err) {
      notify(err.message || 'Unable to create customer.')
    } finally {
      setSaving(false)
    }
  }

  const getInitials = (name) =>
    (name || 'U')
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

  return (
    <>
      <PageHeader
        title="Customers & Users"
        sub={`${cust.length} customers registered · ${staff(state).length} staff accounts`}
        action={
          <Button onClick={() => setAdding(true)}>
            + Add user
          </Button>
        }
      />

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total Customers" value={cust.length} />
        <Stat label="Blocked Accounts" value={blocked} tone={blocked ? 'warn' : 'good'} />
        <Stat label="Lifetime Value" value={inr(totalLtv)} />
        <Stat label="Avg per Customer" value={inr(cust.length ? Math.round(totalLtv / cust.length) : 0)} />
      </div>

      {/* Main Customers Table Card */}
      <Card className="mt-4 !p-0">
        {/* Filters and Search Bar */}
        <div className="p-3.5 sm:p-4 border-b border-line space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-graphite">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search name, email, phone…"
                  className="w-full h-[38px] rounded-lg border border-[#CBC8C1] bg-white pl-9 pr-3 text-[12.5px] font-medium text-ink placeholder:text-[#A5A2B2] placeholder:font-normal outline-none transition-all hover:border-[#ADA9A0] focus:border-forest focus:ring-1 focus:ring-forest/25 shadow-xs"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-[38px] rounded-lg border border-[#CBC8C1] bg-white px-3 text-[12.5px] font-medium text-ink outline-none transition-all hover:border-[#ADA9A0] focus:border-forest focus:ring-1 focus:ring-forest/25 shadow-xs"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Blocked">Blocked</option>
              </select>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-[38px] rounded-lg border border-[#CBC8C1] bg-white px-3 text-[12.5px] font-medium text-ink outline-none transition-all hover:border-[#ADA9A0] focus:border-forest focus:ring-1 focus:ring-forest/25 shadow-xs"
              >
                <option value="All">All Roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {(q || statusFilter !== 'All' || roleFilter !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setQ('')
                    setStatusFilter('All')
                    setRoleFilter('All')
                  }}
                  className="h-[38px] rounded-lg border border-[#CBC8C1] px-3 text-[11.5px] font-semibold text-graphite hover:bg-chalk hover:text-ink transition-colors"
                >
                  Reset
                </button>
              )}
            </div>

            <span className="text-[11.5px] font-medium text-muted self-end sm:self-auto">
              Showing <strong className="text-ink">{paginatedRows.length}</strong> of <strong className="text-ink">{rows.length}</strong> customers
            </span>
          </div>
        </div>

        {/* Customer Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-line bg-chalk/40 text-[10.5px] font-bold uppercase tracking-normal text-graphite">
                <th className="py-2.5 pl-4 px-3">User</th>
                <th className="py-2.5 px-3">Addresses</th>
                <th className="py-2.5 px-3">Joined</th>
                <th className="py-2.5 px-3">Orders</th>
                <th className="py-2.5 px-3 text-right">Lifetime Value</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 pr-4 pl-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-graphite">
                    No matching customers found.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((u) => {
                  const orders = ordersOfUser(state, u.id)
                  const addrs = userAddresses(u)
                  const initials = getInitials(u.name)

                  return (
                    <tr
                      key={u.id}
                      className="group transition-all duration-150 hover:bg-[#F9F9FE]"
                    >
                      {/* User Column with Avatar */}
                      <td className="py-2.5 pl-4 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-bold shadow-xs ring-1 ring-black/5 ${
                            u.avatar ? 'bg-white p-0.5' : 'bg-[#EEEDFC] text-[#4849E8]'
                          }`}>
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.name} className="h-full w-full rounded-full object-contain" />
                            ) : (
                              <span>{initials}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              to={`/admin/customers/${u.id}`}
                              className="block truncate text-[12.5px] font-semibold text-ink transition-colors hover:text-[#4849E8]"
                            >
                              {u.name}
                            </Link>
                            <span className="block truncate text-[10.5px] font-medium text-graphite">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Addresses */}
                      <td className="py-2.5 px-3">
                        <span className="text-[12px] font-semibold text-ink">
                          {addrs.length} saved
                        </span>
                        {addrs[0] ? (
                          <span className="block max-w-[140px] truncate text-[10.5px] text-graphite">
                            {addrs[0].city}, {addrs[0].state}
                          </span>
                        ) : (
                          <span className="block text-[10.5px] text-graphite/60">No address saved</span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="py-2.5 px-3 text-[11.5px] font-medium text-graphite">
                        {shortDate(u.createdAt)}
                      </td>

                      {/* Order count */}
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center rounded-full bg-chalk px-2.5 py-0.5 text-[11px] font-semibold text-ink border border-line/60">
                          {orders.length}
                        </span>
                      </td>

                      {/* Lifetime Value */}
                      <td className="py-2.5 px-3 text-right text-[12.5px] font-bold text-ink">
                        {inr(lifetimeValue(state, u.id))}
                      </td>

                      {/* Status Toggle Button */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          disabled={busyId === u.id}
                          onClick={() =>
                            patchUser(u.id, { status: u.status === 'Active' ? 'Blocked' : 'Active' })
                          }
                          className="transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                          title="Click to toggle status"
                        >
                          <Badge tone={u.status}>{u.status}</Badge>
                        </button>
                      </td>

                      {/* Actions Column */}
                      <td className="py-2.5 pr-4 pl-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingUser(u)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#CBC8C1] bg-white px-2.5 py-1 text-[11.5px] font-semibold text-ink shadow-2xs transition-all hover:border-[#ADA9A0] hover:bg-chalk active:scale-95 cursor-pointer"
                            title="Edit customer details"
                          >
                            <svg className="h-3.5 w-3.5 text-[#5D586C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            <span>Edit</span>
                          </button>
                          <Link
                            to={`/admin/customers/${u.id}`}
                            className="inline-flex h-[27px] w-[27px] items-center justify-center rounded-lg border border-line bg-white text-graphite shadow-2xs transition-all hover:bg-[#4849E8]/5 hover:text-[#4849E8] hover:border-[#4849E8]/40 active:scale-95"
                            title="View customer profile"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </Link>
                          <button
                            type="button"
                            disabled={busyId === u.id}
                            onClick={() => setDeletingUser(u)}
                            className="inline-flex h-[27px] w-[27px] items-center justify-center rounded-lg border border-red-200 bg-red-50/70 text-[#E02438] transition-all hover:bg-red-100 hover:border-red-300 active:scale-95 disabled:opacity-50 cursor-pointer"
                            title="Delete customer"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
            total={rows.length}
            pageSize={12}
            onChange={setPage}
            className="!mt-0 !border-t-0 !pt-0"
          />
        </div>
      </Card>

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          saving={saving}
          onClose={() => !saving && setEditingUser(null)}
          onSave={saveUserEdit}
          onDelete={(u) => setDeletingUser(u)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={Boolean(deletingUser)}
        onClose={() => !deleteBusy && setDeletingUser(null)}
        onConfirm={confirmDelete}
        loading={deleteBusy}
        loadingText="Archiving customer..."
        title={`Archive customer “${deletingUser?.name}”?`}
        message={`Are you sure you want to archive customer “${deletingUser?.name}”? The customer record will be deactivated and archived without losing historical order records.`}
        confirmText="Archive customer"
        tone="danger"
      />

      {/* Add User Modal */}
      {adding && (
        <AddUser
          saving={saving}
          onClose={() => !saving && setAdding(false)}
          onAdd={createUser}
        />
      )}
    </>
  )
}

function EditUserModal({ user, onClose, onSave, onDelete, saving }) {
  const [f, setF] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    role: user.role || 'Customer',
    status: user.status || 'Active',
    notes: user.notes || '',
  })

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  return (
    <Modal open onClose={onClose} title={`Edit Customer: ${user.name}`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full Name">
          <Input value={f.name} onChange={set('name')} disabled={saving} placeholder="Full name" required />
        </Field>
        <Field label="Email Address">
          <Input type="email" value={f.email} onChange={set('email')} disabled={saving} placeholder="user@example.com" required />
        </Field>
        <Field label="Phone Number">
          <Input value={f.phone} onChange={set('phone')} disabled={saving} placeholder="+91 90000 00000" />
        </Field>
        <Field label="Role">
          <Select value={f.role} onChange={set('role')} options={ROLES} disabled={saving} />
        </Field>
        <Field label="Account Status">
          <Select
            value={f.status}
            onChange={set('status')}
            options={[
              { value: 'Active', label: 'Active' },
              { value: 'Blocked', label: 'Blocked' },
            ]}
            disabled={saving}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Internal Notes / Remarks" hint="Admin only, not visible to customer">
            <Textarea
              rows={3}
              value={f.notes}
              onChange={set('notes')}
              disabled={saving}
              placeholder="Add customer preference notes, tags, or internal remarks…"
            />
          </Field>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        {onDelete ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => onDelete(user)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/70 px-3 py-2 text-[12px] font-semibold text-[#D92D20] shadow-2xs transition-all hover:bg-red-100 hover:border-red-300 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <svg className="h-3.5 w-3.5 text-[#D92D20]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Delete customer</span>
          </button>
        ) : <div />}
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            disabled={!f.name.trim() || !f.email.trim() || saving}
            loading={saving}
            loadingText="Saving changes..."
            onClick={() =>
              onSave(user.id, {
                name: f.name.trim(),
                email: f.email.trim(),
                phone: f.phone.trim(),
                role: f.role,
                status: f.status,
                notes: f.notes.trim(),
              })
            }
          >
            Save changes
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function AddUser({ onClose, onAdd, saving }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', role: 'Customer' })
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  return (
    <Modal open onClose={onClose} title="Add User">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input value={f.name} onChange={set('name')} disabled={saving} placeholder="Full name" required />
        </Field>
        <Field label="Email">
          <Input type="email" value={f.email} onChange={set('email')} disabled={saving} placeholder="user@example.com" required />
        </Field>
        <Field label="Phone">
          <Input value={f.phone} onChange={set('phone')} disabled={saving} placeholder="+91 90000 00000" />
        </Field>
        <Field label="Role">
          <Select value={f.role} onChange={set('role')} options={ROLES} disabled={saving} />
        </Field>
      </div>
      <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          disabled={!f.name.trim() || !f.email.trim()}
          loading={saving}
          loadingText="Creating..."
          onClick={() =>
            onAdd({
              name: f.name.trim(),
              email: f.email.trim(),
              phone: f.phone.trim(),
              role: f.role,
              status: 'Active',
            })
          }
        >
          Create user
        </Button>
      </div>
    </Modal>
  )
}

/** Single-customer view with order history. */
export function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const { notify } = useCart()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const user = userById(state, id)

  if (!user) {
    return (
      <Card>
        <p className="py-10 text-center text-muted">
          No user “{id}”. <Link to="/admin/customers" className="underline">Back to customers</Link>
        </p>
      </Card>
    )
  }

  const orders = ordersOfUser(state, user.id)
  const addresses = userAddresses(user)
  const ltv = lifetimeValue(state, user.id)

  const initials = (user.name || 'U')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const saveDetails = async (userId, patch) => {
    if (saving) return
    setSaving(true)
    try {
      const json = await apiPatch(`/customers/${userId}`, { patch }, { auth: true })
      dispatch({ type: 'user/ensure', user: json.data.user })
      dispatch({ type: 'user/update', id: userId, patch: json.data.user })
      notify(json.message || 'Customer updated successfully.')
      setEditing(false)
    } catch (err) {
      notify(err.message || 'Unable to update customer.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!user || deleteBusy) return
    setDeleteBusy(true)
    try {
      await apiDelete(`/customers/${user.id}`, { auth: true })
      dispatch({ type: 'user/delete', id: user.id })
      notify('Customer deleted successfully.')
      navigate('/admin/customers', { replace: true })
    } catch (err) {
      notify(err.message || 'Unable to delete customer.')
    } finally {
      setDeleteBusy(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <>
      <PageHeader
        title={user.name}
        sub={`${user.email} · joined ${shortDate(user.createdAt)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/admin/customers"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBC8C1] bg-white px-3.5 py-2 text-[12px] font-semibold text-graphite shadow-2xs transition-all hover:border-[#ADA9A0] hover:bg-chalk hover:text-ink active:scale-95"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back</span>
            </Link>
            <Button
              variant="ghost"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 !border-[#CBC8C1] !bg-white !px-3.5 !py-2 !text-[12px] !font-semibold text-ink shadow-2xs hover:!border-[#ADA9A0] hover:!bg-chalk active:scale-95"
            >
              <svg className="h-3.5 w-3.5 text-[#5D586C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Edit customer</span>
            </Button>
            <Button
              variant={user.status === 'Active' ? 'danger' : 'primary'}
              className="!px-3.5 !py-2 !text-[12px]"
              disabled={saving}
              onClick={() =>
                saveDetails(user.id, { status: user.status === 'Active' ? 'Blocked' : 'Active' })
              }
            >
              {user.status === 'Active' ? 'Block user' : 'Unblock user'}
            </Button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/70 px-3.5 py-2 text-[12px] font-semibold text-[#D92D20] shadow-2xs transition-all hover:bg-red-100 hover:border-red-300 active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Delete customer permanently"
            >
              <svg className="h-3.5 w-3.5 text-[#D92D20]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete</span>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Lifetime value" value={inr(ltv)} />
        <Stat label="Orders" value={orders.length} />
        <Stat label="Saved Addresses" value={addresses.length} />
        <Stat label="Status" value={user.status} tone={user.status === 'Active' ? 'good' : 'bad'} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Card
            title="User Details"
            action={
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-[11.5px] font-semibold text-[#4849E8] hover:underline cursor-pointer"
              >
                Edit
              </button>
            }
          >
            <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-bold shadow-xs ring-2 ring-white border border-line ${
                user.avatar ? 'bg-white p-0.5' : 'bg-[#EEEDFC] text-[#4849E8]'
              }`}>
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="h-full w-full rounded-full object-contain" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-ink">{user.name}</h3>
                <p className="text-[11.5px] text-graphite">{user.email}</p>
              </div>
            </div>
            <dl className="space-y-2.5 text-[12px]">
              <div className="flex justify-between"><dt className="text-graphite font-medium">Role</dt><dd className="font-semibold text-ink">{user.role}</dd></div>
              <div className="flex justify-between"><dt className="text-graphite font-medium">Phone</dt><dd className="font-medium text-ink">{user.phone || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-graphite font-medium">Email</dt><dd className="font-medium text-ink">{user.email}</dd></div>
              <div className="flex justify-between"><dt className="text-graphite font-medium">Status</dt><dd><Badge tone={user.status}>{user.status}</Badge></dd></div>
            </dl>
            {user.notes && (
              <div className="mt-3.5 rounded-lg border border-line bg-chalk/60 p-2.5 text-[11.5px]">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-graphite">
                  Internal Notes
                </span>
                <p className="whitespace-pre-wrap text-ink">{user.notes}</p>
              </div>
            )}
          </Card>

          <Card title={`Saved Addresses (${addresses.length})`}>
            {addresses.length === 0 ? (
              <p className="text-[12px] text-graphite">No address registered yet.</p>
            ) : (
              <div className="space-y-3">
                {addresses.map((a, idx) => (
                  <div key={a.id || idx} className="rounded-lg border border-line bg-chalk/40 p-3 text-[12px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">{a.label || 'Address'}</span>
                      {a.isDefault && (
                        <span className="rounded bg-lime px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-forest">
                          Default
                        </span>
                      )}
                    </div>
                    <address className="mt-1.5 not-italic leading-relaxed text-graphite">
                      {a.line1}
                      <br />
                      {a.city}, {a.state} - {a.pin}
                      <br />
                      {a.country || 'India'}
                    </address>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card title="Order history" className="lg:col-span-2">
          <Table head={['Order', 'Date', 'Items', 'Status', { label: 'Total', align: 'right' }]} empty="No orders yet.">
            {orders.map((o) => (
              <Tr key={o.id}>
                <Td>
                  <Link to={`/admin/orders/${o.id}`} className="font-semibold text-[#4849E8] underline underline-offset-2">{o.id}</Link>
                </Td>
                <Td className="text-graphite">{shortDate(o.placedAt)}</Td>
                <Td>{o.lines.reduce((n, l) => n + l.qty, 0)}</Td>
                <Td><Badge tone={o.status}>{o.status}</Badge></Td>
                <Td align="right" className="font-bold text-ink">{inr(o.total)}</Td>
              </Tr>
            ))}
          </Table>
        </Card>
      </div>

      {/* Edit Customer Modal */}
      {editing && (
        <EditUserModal
          user={user}
          saving={saving}
          onClose={() => !saving && setEditing(false)}
          onSave={saveDetails}
          onDelete={() => {
            setEditing(false)
            setShowDeleteConfirm(true)
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => !deleteBusy && setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        loading={deleteBusy}
        loadingText="Deleting customer..."
        title={`Delete customer “${user?.name}”?`}
        message={`Are you sure you want to delete customer “${user?.name}”? All profile details and saved addresses will be removed.`}
        confirmText="Delete permanently"
        tone="danger"
      />
    </>
  )
}
