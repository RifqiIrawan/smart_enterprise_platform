import { useState, useEffect, useCallback, useRef } from 'react'
import { marketplaceApi } from '@/api'
import DataTable from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import {
  Store, ShoppingBag, Package, BarChart2, RefreshCw, CheckCircle,
  AlertCircle, Globe, TrendingUp, ShoppingCart, Zap, Tag
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell
} from 'recharts'

const fmt = (n) => 'Rp ' + Number(n).toLocaleString('id-ID')

const CHANNEL_ICONS = {
  tokopedia:  { color: '#00b14f', label: 'Tokopedia' },
  shopee:     { color: '#ee4d2d', label: 'Shopee' },
  lazada:     { color: '#0f1111', label: 'Lazada' },
  woocommerce:{ color: '#7f54b3', label: 'WooCommerce' },
  bukalapak:  { color: '#e31f26', label: 'Bukalapak' },
}

const STATUS_COLORS = {
  pending:   'bg-amber-100 text-amber-700',
  fulfilled: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
  active:    'bg-emerald-100 text-emerald-700',
  out_of_stock: 'bg-rose-100 text-rose-700',
  synced:    'bg-emerald-100 text-emerald-700',
  disconnected: 'bg-slate-100 text-slate-600',
}

const STATUS_LABELS = {
  pending:'Pending', fulfilled:'Fulfilled', cancelled:'Dibatalkan',
  active:'Aktif', out_of_stock:'Stok Habis', synced:'Tersinkron', disconnected:'Tidak Terhubung',
}

function Badge({ status }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-600'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

function ChannelDot({ type, label }) {
  const cfg = CHANNEL_ICONS[type] || { color: '#6366f1' }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
      <span className="text-sm font-medium">{label || cfg.label}</span>
    </span>
  )
}

const TABS = [
  { id: 'overview',  label: 'Ringkasan', icon: BarChart2 },
  { id: 'channels',  label: 'Channel', icon: Globe },
  { id: 'orders',    label: 'Pesanan', icon: ShoppingCart },
  { id: 'listings',  label: 'Listing Produk', icon: Tag },
]

export default function Marketplace() {
  const [activeTab, setActiveTab] = useState('overview')
  const [summary, setSummary] = useState({})
  const [channels, setChannels] = useState([])
  const [syncing, setSyncing] = useState(false)
  const ordersRef = useRef()
  const listingsRef = useRef()

  useEffect(() => {
    marketplaceApi.getSummary().then(r => setSummary(r?.data)).catch(() => {})
    marketplaceApi.getChannels().then(r => setChannels(r?.value || [])).catch(() => {})
  }, [])

  const ordersFetch = useCallback(p => marketplaceApi.getOrders(p), [])
  const listingsFetch = useCallback(p => marketplaceApi.getListings(p), [])

  const handleFulfill = async (row) => {
    try {
      const r = await marketplaceApi.fulfillOrder(row.id)
      if (r?.success) ordersRef.current?.refetch()
    } catch (e) { console.error(e) }
  }

  const handleSyncAll = async () => {
    setSyncing(true)
    try {
      await marketplaceApi.syncListing()
      listingsRef.current?.refetch()
    } catch (e) { console.error(e) }
    finally { setSyncing(false) }
  }

  const kpi = summary || {}

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Marketplace</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Omnichannel order & listing management</p>
        </div>
        <button onClick={handleSyncAll} disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-all shadow-md shadow-indigo-200">
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          Sinkron Semua
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-surface-3)' }}>
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Order Hari Ini', value: kpi.total_orders_today, icon: ShoppingCart, color: 'from-indigo-500 to-blue-600' },
              { label: 'Revenue Bulan Ini', value: fmt(kpi.total_revenue_month), icon: TrendingUp, color: 'from-emerald-400 to-teal-600' },
              { label: 'Channel Aktif', value: kpi.active_channels, icon: Globe, color: 'from-violet-500 to-purple-600' },
              { label: 'Produk Terdaftar', value: kpi.total_products, icon: Tag, color: 'from-amber-400 to-orange-500' },
              { label: 'Perlu Fulfillment', value: kpi.pending_fulfillment, icon: AlertCircle, color: 'from-rose-400 to-pink-600' },
            ].map(c => {
              const Icon = c.icon
              return (
                <Card key={c.label}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
                        <p className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>{c.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Daily trend */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    Tren Order 6 Hari (Per Channel)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={kpi.daily_trend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="shopee" name="Shopee" fill="#ee4d2d" radius={[2,2,0,0]} />
                      <Bar dataKey="tokopedia" name="Tokopedia" fill="#00b14f" radius={[2,2,0,0]} />
                      <Bar dataKey="b2b" name="Website B2B" fill="#6366f1" radius={[2,2,0,0]} />
                      <Bar dataKey="lazada" name="Lazada" fill="#9ca3af" radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Channel breakdown pie */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-violet-500" />
                    Revenue per Channel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={kpi.channel_breakdown || []} dataKey="revenue" nameKey="channel" cx="50%" cy="50%" outerRadius={70} label={({ channel, percent }) => `${channel} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                        {(kpi.channel_breakdown || []).map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={v => [fmt(v), 'Revenue']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-1">
                    {(kpi.channel_breakdown || []).map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                          <span style={{ color: 'var(--text-secondary)' }}>{c.channel}</span>
                        </span>
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{c.orders} order</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Channels */}
      {activeTab === 'channels' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {channels.map(ch => {
            const cfg = CHANNEL_ICONS[ch.type] || { color: '#6366f1' }
            return (
              <Card key={ch.id}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: cfg.color + '20' }}>
                        <Store className="w-5 h-5" style={{ color: cfg.color }} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{ch.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{ch.store_name}</p>
                      </div>
                    </div>
                    <Badge status={ch.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-surface-3)' }}>
                      <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{ch.products_listed}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Produk</p>
                    </div>
                    <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-surface-3)' }}>
                      <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{ch.orders_today}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Order Hari Ini</p>
                    </div>
                    <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-surface-3)' }}>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{ch.revenue_month > 0 ? `${(ch.revenue_month/1e6).toFixed(0)}jt` : '-'}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Revenue</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Badge status={ch.sync_status} />
                    <span>Sync: {ch.last_sync}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Orders */}
      {activeTab === 'orders' && (
        <DataTable
          ref={ordersRef}
          fetchFn={ordersFetch}
          columns={[
            { key: 'id', label: 'ID', render: v => <span className="font-mono text-xs font-semibold text-indigo-600">{v}</span> },
            { key: 'channel', label: 'Channel', render: (v, row) => <ChannelDot type={row.channel_type} label={v} /> },
            { key: 'external_id', label: 'Ext. ID', render: v => <span className="font-mono text-xs">{v}</span> },
            { key: 'date', label: 'Tanggal' },
            { key: 'customer', label: 'Pembeli' },
            { key: 'product_summary', label: 'Produk' },
            { key: 'total', label: 'Total', render: v => fmt(v) },
            { key: 'so_ref', label: 'SO Ref.', render: v => v ? <span className="font-mono text-xs text-emerald-600 font-semibold">{v}</span> : '-' },
            { key: 'status', label: 'Status', render: v => <Badge status={v} /> },
          ]}
          actions={(row) => row.status === 'pending' ? (
            <button onClick={() => handleFulfill(row)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium transition-all">
              <Zap className="w-3 h-3" />
              Fulfill
            </button>
          ) : null}
          searchable
        />
      )}

      {/* Listings */}
      {activeTab === 'listings' && (
        <DataTable
          ref={listingsRef}
          fetchFn={listingsFetch}
          toolbar={
            <button onClick={handleSyncAll} disabled={syncing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-all">
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              Sinkron Semua
            </button>
          }
          columns={[
            { key: 'sku', label: 'SKU', render: v => <span className="font-mono text-xs font-semibold">{v}</span> },
            { key: 'name', label: 'Nama Produk' },
            { key: 'channels', label: 'Channel', render: v => (
              <div className="flex flex-wrap gap-1">
                {(v || []).map(ch => {
                  const cfg = CHANNEL_ICONS[ch]
                  return cfg ? (
                    <span key={ch} className="w-2 h-2 rounded-full inline-block" title={cfg.label} style={{ backgroundColor: cfg.color }} />
                  ) : null
                })}
              </div>
            )},
            { key: 'price', label: 'Harga', render: v => fmt(v) },
            { key: 'stock', label: 'Stok', render: v => <span className={v === 0 ? 'text-rose-500 font-semibold' : 'font-medium'}>{v}</span> },
            { key: 'last_sync', label: 'Last Sync' },
            { key: 'status', label: 'Status', render: v => <Badge status={v} /> },
          ]}
          actions={(row) => (
            <button onClick={() => marketplaceApi.syncListing(row.id).then(() => listingsRef.current?.refetch())}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-xs font-medium transition-all">
              <RefreshCw className="w-3 h-3" />
              Sync
            </button>
          )}
          searchable
        />
      )}
    </div>
  )
}
