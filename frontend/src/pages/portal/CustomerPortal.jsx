import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { portalApi } from '@/api'
import DataTable from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import {
  ShoppingCart, FileText, Truck, TrendingUp,
  Clock, CheckCircle, AlertCircle, Package, ChevronDown, RefreshCw,
  Building2, Phone, Mail
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const fmt = (n) => 'Rp ' + Number(n).toLocaleString('id-ID')

const STATUS_COLORS = {
  delivered: 'bg-emerald-100 text-emerald-700',
  shipped:   'bg-blue-100 text-blue-700',
  in_transit:'bg-blue-100 text-blue-700',
  processing:'bg-amber-100 text-amber-700',
  pending:   'bg-slate-100 text-slate-600',
  paid:      'bg-emerald-100 text-emerald-700',
  unpaid:    'bg-rose-100 text-rose-700',
  approved:  'bg-blue-100 text-blue-700',
  confirmed: 'bg-indigo-100 text-indigo-700',
}

const STATUS_LABELS = {
  delivered:'Terkirim', shipped:'Dikirim', in_transit:'Dalam Pengiriman',
  processing:'Diproses', pending:'Pending', paid:'Lunas',
  unpaid:'Belum Bayar', confirmed:'Dikonfirmasi',
}

function Badge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-600'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

const VALID_TABS = ['dashboard', 'orders', 'invoices', 'delivery']

export default function CustomerPortal() {
  const navigate = useNavigate()
  const { tab } = useParams()
  const activeTab = VALID_TABS.includes(tab) ? tab : 'dashboard'
  useEffect(() => {
    if (!VALID_TABS.includes(tab)) navigate('/portal/customer/dashboard', { replace: true })
  }, [tab])
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [dashData, setDashData] = useState(null)

  useEffect(() => {
    portalApi.getCustomers().then(r => {
      const list = r?.value || []
      setCustomers(list)
      if (list.length > 0) setSelectedCustomer(list[0])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedCustomer) return
    portalApi.getCustomerDashboard(selectedCustomer.id).then(r => {
      setDashData(r?.data || null)
    }).catch(() => {})
  }, [selectedCustomer])

  const ordersFetch = useCallback(p => portalApi.getCustomerOrders(p), [])
  const invoicesFetch = useCallback(p => portalApi.getCustomerInvoices(p), [])
  const deliveriesFetch = useCallback(p => portalApi.getCustomerDeliveries(p), [])

  const kpi = dashData?.kpi || {}
  const dash = dashData || {}

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Customer Portal</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Self-service portal untuk pelanggan
          </p>
        </div>
        {/* Customer switcher */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
          >
            <Building2 className="w-4 h-4 text-indigo-500" />
            {selectedCustomer?.name || 'Pilih Pelanggan'}
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 w-72 rounded-xl border shadow-lg z-20 overflow-hidden"
              style={{ backgroundColor: 'var(--dropdown-bg)', borderColor: 'var(--border-color)' }}>
              {customers.map(c => (
                <button key={c.id} onClick={() => { setSelectedCustomer(c); setShowDropdown(false) }}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Customer Info Bar */}
      {selectedCustomer && (
        <div className="rounded-2xl border p-4 flex flex-wrap gap-4 items-center"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{selectedCustomer.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pelanggan sejak {dashData?.since || '-'}</p>
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selectedCustomer.phone}</span>
            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{selectedCustomer.email}</span>
          </div>
        </div>
      )}

      {/* Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Pesanan', value: kpi.total_orders, sub: `${kpi.active_orders} aktif`, icon: ShoppingCart, color: 'indigo' },
              { label: 'Total Invoice', value: kpi.total_invoices, sub: `${kpi.unpaid_invoices} belum lunas`, icon: FileText, color: 'amber' },
              { label: 'Tagihan Tertunda', value: fmt(kpi.outstanding_amount), sub: 'outstanding', icon: AlertCircle, color: 'rose' },
              { label: 'On-Time Delivery', value: `${kpi.on_time_delivery}%`, sub: 'ketepatan waktu', icon: CheckCircle, color: 'emerald' },
            ].map(c => {
              const Icon = c.icon
              const colors = { indigo:'from-indigo-500 to-blue-600', amber:'from-amber-400 to-orange-500', rose:'from-rose-400 to-pink-600', emerald:'from-emerald-400 to-teal-600' }
              return (
                <Card key={c.label}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[c.color]} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
                        <p className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>{c.value}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.sub}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Monthly spend chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  Pengeluaran 6 Bulan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dash.monthly_spend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={v => `${(v/1e6).toFixed(0)}jt`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={v => [fmt(v), 'Total Pembelian']} />
                    <Bar dataKey="amount" fill="#6366f1" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Aktivitas Terbaru
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(dash.recent_activity || []).map((a, i) => {
                    const icons = { invoice: FileText, delivery: Truck, order: ShoppingCart, payment: CheckCircle }
                    const colors2 = { invoice: 'bg-amber-100 text-amber-600', delivery: 'bg-blue-100 text-blue-600', order: 'bg-indigo-100 text-indigo-600', payment: 'bg-emerald-100 text-emerald-600' }
                    const Icon2 = icons[a.type] || Package
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colors2[a.type] || 'bg-slate-100 text-slate-600'}`}>
                          <Icon2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.desc} · <span className="font-mono text-xs">{a.ref}</span></p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.date}</p>
                        </div>
                        {a.amount > 0 && <p className="text-sm font-semibold text-right" style={{ color: 'var(--text-primary)' }}>{fmt(a.amount)}</p>}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Orders */}
      {activeTab === 'orders' && (
        <DataTable
          title="Pesanan Saya"
          fetchFn={ordersFetch}
          columns={[
            { key: 'id', label: 'No. Order', render: v => <span className="font-mono font-semibold text-indigo-600">{v}</span> },
            { key: 'date', label: 'Tanggal' },
            { key: 'product_summary', label: 'Produk' },
            { key: 'items', label: 'Item' },
            { key: 'total', label: 'Total', render: v => fmt(v) },
            { key: 'eta', label: 'ETA' },
            { key: 'status', label: 'Status', render: v => <Badge status={v} /> },
          ]}
          searchable
        />
      )}

      {/* Invoices */}
      {activeTab === 'invoices' && (
        <DataTable
          title="Invoice"
          fetchFn={invoicesFetch}
          columns={[
            { key: 'id', label: 'No. Invoice', render: v => <span className="font-mono font-semibold text-indigo-600">{v}</span> },
            { key: 'so_ref', label: 'Ref. Order', render: v => <span className="font-mono text-xs">{v}</span> },
            { key: 'date', label: 'Tgl. Terbit' },
            { key: 'due_date', label: 'Jatuh Tempo' },
            { key: 'amount', label: 'Total', render: v => fmt(v) },
            { key: 'paid', label: 'Terbayar', render: v => <span className="text-emerald-600 font-medium">{fmt(v)}</span> },
            { key: 'status', label: 'Status', render: v => <Badge status={v} /> },
          ]}
          searchable
        />
      )}

      {/* Deliveries */}
      {activeTab === 'delivery' && (
        <DataTable
          title="Status Pengiriman"
          fetchFn={deliveriesFetch}
          columns={[
            { key: 'id', label: 'No. DO', render: v => <span className="font-mono font-semibold text-indigo-600">{v}</span> },
            { key: 'so_ref', label: 'Ref. Order', render: v => <span className="font-mono text-xs">{v}</span> },
            { key: 'date', label: 'Tgl. Kirim' },
            { key: 'items', label: 'Isi Pengiriman' },
            { key: 'carrier', label: 'Ekspedisi' },
            { key: 'tracking', label: 'Nomor Resi', render: v => v ? <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{v}</span> : '-' },
            { key: 'status', label: 'Status', render: v => <Badge status={v} /> },
            { key: 'received_date', label: 'Tgl. Terima', render: v => v || '-' },
          ]}
          searchable
        />
      )}
    </div>
  )
}
