import { Link } from 'react-router-dom'
import { useStore, inr, shortDate } from '../store/StoreContext.jsx'
import {
  metrics, revenueSeries, statusBreakdown, topProducts, lowStockVariants,
} from '../store/selectors.js'
import { BarChart, Badge, Card, PageHeader, Stat, Table, Td, Tr } from './ui.jsx'

export default function Dashboard() {
  const { state } = useStore()
  const m = metrics(state)
  const series = revenueSeries(state, 30)
  const status = statusBreakdown(state)
  const top = topProducts(state, 5)
  const low = lowStockVariants(state).slice(0, 6)
  const recent = [...state.orders].sort((a, b) => b.placedAt - a.placedAt).slice(0, 8)

  return (
    <>
      <PageHeader title="Dashboard" sub="Everything happening across the store right now." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Net revenue" value={inr(m.netRevenue)} sub={`${inr(m.refunded)} refunded`} />
        <Stat label="Orders" value={m.orderCount} sub={`${m.pending} awaiting confirmation`} />
        <Stat label="Avg order value" value={inr(m.aov)} sub={`${m.paidCount} paid orders`} />
        <Stat
          label="Needs attention"
          value={m.lowStock + m.openRefunds}
          tone={m.lowStock + m.openRefunds > 0 ? 'warn' : 'good'}
          sub={`${m.lowStock} low stock · ${m.openRefunds} refunds`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Revenue — last 30 days" className="lg:col-span-2">
          <BarChart data={series} />
          <div className="mt-2 flex justify-between text-[10px] text-muted">
            <span>{shortDate(series[0].at)}</span>
            <span>{shortDate(series[series.length - 1].at)}</span>
          </div>
        </Card>

        <Card title="Orders by status">
          <ul className="space-y-2.5">
            {Object.entries(status)
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => (
                <li key={k} className="flex items-center justify-between gap-3">
                  <Badge tone={k}>{k}</Badge>
                  <span className="text-[12px] font-semibold">{v}</span>
                </li>
              ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card
          title="Recent orders"
          action={<Link to="/admin/orders" className="text-[11px] underline underline-offset-2">View all</Link>}
        >
          <Table fit head={['Order', 'Customer', 'Status', { label: 'Total', align: 'right' }]}>
            {recent.map((o) => (
              <Tr key={o.id}>
                <Td>
                  <Link to={`/admin/orders/${o.id}`} className="font-semibold underline underline-offset-2">
                    {o.id}
                  </Link>
                  <span className="block text-[11px] text-muted">{shortDate(o.placedAt)}</span>
                </Td>
                <Td>{o.customerName}</Td>
                <Td><Badge tone={o.status}>{o.status}</Badge></Td>
                <Td align="right" className="font-semibold">{inr(o.total)}</Td>
              </Tr>
            ))}
          </Table>
        </Card>

        <Card title="Best sellers">
          <Table fit head={['Product', { label: 'Units', align: 'right' }, { label: 'Revenue', align: 'right' }]}>
            {top.map((t) => (
              <Tr key={t.handle}>
                <Td className="max-w-[260px]"><span className="line-clamp-1">{t.title}</span></Td>
                <Td align="right">{t.units}</Td>
                <Td align="right" className="font-semibold">{inr(t.revenue)}</Td>
              </Tr>
            ))}
          </Table>
        </Card>
      </div>

      <Card
        title="Low stock"
        className="mt-4"
        action={<Link to="/admin/stock" className="text-[11px] underline underline-offset-2">Manage stock</Link>}
      >
        <Table fit head={['SKU', 'Product', 'Variant', { label: 'Left', align: 'right' }]} empty="Everything is well stocked.">
          {low.map((v) => (
            <Tr key={v.id}>
              <Td className="font-mono text-[11px]">{v.sku}</Td>
              <Td className="max-w-[280px]"><span className="line-clamp-1">{v.productHandle}</span></Td>
              <Td>{v.size} · {v.color}</Td>
              <Td align="right"><Badge tone="Pending">{v.stock} left</Badge></Td>
            </Tr>
          ))}
        </Table>
      </Card>
    </>
  )
}
