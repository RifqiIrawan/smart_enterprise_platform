import { useState, useEffect } from 'react'
import { supplyChainApi } from '@/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import {
  GitMerge, Search, Award, AlertTriangle, Package, Factory, Warehouse,
  Truck, CheckCircle, ClipboardList, Cpu, MapPin, TrendingDown, TrendingUp,
  ShieldAlert, Clock, ArrowRight, Star
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend
} from 'recharts'

const fmt = (n) => 'Rp ' + Number(n).toLocaleString('id-ID')

const TABS = [
  { id: 'map',       label: 'Peta Rantai Pasok', icon: GitMerge },
  { id: 'trace',     label: 'Traceability', icon: Search },
  { id: 'scorecard', label: 'Supplier Scorecard', icon: Award },
  { id: 'risk',      label: 'Risk Dashboard', icon: AlertTriangle },
]

const NODE_STYLES = {
  supplier:   { bg: 'bg-indigo-100 border-indigo-300', icon: Package,   color: 'text-indigo-700', badge: 'bg-indigo-500' },
  warehouse:  { bg: 'bg-slate-100 border-slate-300',   icon: Warehouse, color: 'text-slate-700',  badge: 'bg-slate-500' },
  production: { bg: 'bg-amber-100 border-amber-300',   icon: Factory,   color: 'text-amber-700',  badge: 'bg-amber-500' },
  qc:         { bg: 'bg-violet-100 border-violet-300', icon: CheckCircle, color: 'text-violet-700', badge: 'bg-violet-500' },
  channel:    { bg: 'bg-emerald-100 border-emerald-300', icon: Truck,   color: 'text-emerald-700', badge: 'bg-emerald-500' },
}

const TRACE_ICONS = {
  package:     Package,
  clipboard:   ClipboardList,
  factory:     Factory,
  cpu:         Cpu,
  'check-circle': CheckCircle,
  warehouse:   Warehouse,
  truck:       Truck,
}

const GRADE_COLORS = {
  A: 'text-emerald-600 bg-emerald-100',
  B: 'text-blue-600 bg-blue-100',
  C: 'text-amber-600 bg-amber-100',
  D: 'text-rose-600 bg-rose-100',
}

const RISK_SEV_COLORS = {
  high:   'bg-rose-100 text-rose-700 border-rose-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low:    'bg-emerald-100 text-emerald-700 border-emerald-200',
}

export default function SupplyChain() {
  const [activeTab, setActiveTab] = useState('map')
  const [mapData, setMapData] = useState(null)
  const [traceData, setTraceData] = useState(null)
  const [scorecardData, setScorecardData] = useState(null)
  const [riskData, setRiskData] = useState(null)
  const [lotSearch, setLotSearch] = useState('LOT-2026-0441')
  const [searching, setSearching] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState(null)

  useEffect(() => {
    supplyChainApi.getMap().then(r => setMapData(r?.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (activeTab === 'scorecard' && !scorecardData) {
      supplyChainApi.getSupplierScorecard().then(r => setScorecardData(r?.data)).catch(() => {})
    }
    if (activeTab === 'risk' && !riskData) {
      supplyChainApi.getRisk().then(r => setRiskData(r?.data)).catch(() => {})
    }
  }, [activeTab])

  const handleTrace = async () => {
    setSearching(true)
    setTraceData(null)
    try {
      const r = await supplyChainApi.getTraceability({ lot: lotSearch })
      setTraceData(r?.data)
    } catch (e) { console.error(e) }
    finally { setSearching(false) }
  }

  const map = mapData || { summary: {}, nodes: [] }
  const vendors = scorecardData?.vendors || []
  const activeVendor = selectedVendor || vendors[0]

  const radarData = activeVendor ? [
    { metric: 'OTD', value: activeVendor.metrics.on_time_delivery },
    { metric: 'Kualitas', value: activeVendor.metrics.quality_rate },
    { metric: 'Harga', value: activeVendor.metrics.price_compliance },
    { metric: 'Responsif', value: activeVendor.metrics.responsiveness },
  ] : []

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Supply Chain</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Visibilitas & traceability rantai pasok end-to-end</p>
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
              <Icon className="w-4 h-4" />{t.label}
            </button>
          )
        })}
      </div>

      {/* Supply Chain Map */}
      {activeTab === 'map' && (
        <div className="space-y-5">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Avg. Lead Time', value: map.summary.avg_lead_time_days != null ? `${map.summary.avg_lead_time_days} hari` : '-', icon: Clock, color: 'from-indigo-500 to-blue-600' },
              { label: 'Supplier Aktif', value: map.summary.active_suppliers ?? '-', icon: Package, color: 'from-violet-500 to-purple-600' },
              { label: 'Customer Aktif', value: map.summary.active_customers ?? '-', icon: Truck, color: 'from-emerald-400 to-teal-600' },
              { label: 'Pengiriman Aktif', value: map.summary.in_transit_shipments ?? '-', icon: MapPin, color: 'from-amber-400 to-orange-500' },
              { label: 'Item Berisiko', value: map.summary.supply_risk_items ?? '-', icon: AlertTriangle, color: 'from-rose-400 to-pink-600' },
            ].map(c => {
              const Icon = c.icon
              return (
                <Card key={c.label}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
                        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{c.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Visual flow map */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-indigo-500" />
                Peta Alur Rantai Pasok
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto pb-4">
                {/* Stage labels */}
                <div className="flex gap-2 mb-4 min-w-max">
                  {['Supplier', 'Gudang Bahan Baku', 'Produksi', 'Quality Control', 'Gudang Jadi', 'Channel'].map(s => (
                    <div key={s} className="flex-1 text-center text-xs font-semibold uppercase tracking-wider py-1 rounded-lg" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface-3)', minWidth: 140 }}>{s}</div>
                  ))}
                </div>
                {/* Node cards */}
                <div className="flex gap-2 items-center min-w-max">
                  {/* Suppliers column */}
                  <div className="flex flex-col gap-2 w-36 flex-shrink-0">
                    {map.nodes.filter(n => n.type === 'supplier').map(node => {
                      const s = NODE_STYLES.supplier
                      const Icon = s.icon
                      const isRisk = node.status === 'risk'
                      return (
                        <div key={node.id} className={`rounded-xl border-2 p-3 ${isRisk ? 'bg-rose-50 border-rose-300' : s.bg}`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Icon className={`w-3 h-3 ${isRisk ? 'text-rose-600' : s.color}`} />
                            {isRisk && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                          </div>
                          <p className={`text-xs font-semibold ${isRisk ? 'text-rose-700' : s.color}`}>{node.label}</p>
                          <p className="text-xs mt-0.5 text-slate-500">{node.sub}</p>
                        </div>
                      )
                    })}
                  </div>

                  <ArrowRight className="w-5 h-5 text-slate-300 flex-shrink-0" />

                  {/* Warehouse */}
                  <div className="flex flex-col gap-2 w-36 flex-shrink-0">
                    {map.nodes.filter(n => n.type === 'warehouse' && n.id === 'n4').map(node => {
                      const s = NODE_STYLES.warehouse; const Icon = s.icon
                      return (
                        <div key={node.id} className={`rounded-xl border-2 p-3 ${s.bg}`}>
                          <Icon className={`w-3 h-3 ${s.color} mb-1`} />
                          <p className={`text-xs font-semibold ${s.color}`}>{node.label}</p>
                          <p className="text-xs mt-0.5 text-slate-500">{node.sub}</p>
                        </div>
                      )
                    })}
                  </div>

                  <ArrowRight className="w-5 h-5 text-slate-300 flex-shrink-0" />

                  {/* Production */}
                  <div className="flex flex-col gap-2 w-36 flex-shrink-0">
                    {map.nodes.filter(n => n.type === 'production').map(node => {
                      const s = NODE_STYLES.production; const Icon = s.icon
                      return (
                        <div key={node.id} className={`rounded-xl border-2 p-3 ${s.bg}`}>
                          <Icon className={`w-3 h-3 ${s.color} mb-1`} />
                          <p className={`text-xs font-semibold ${s.color}`}>{node.label}</p>
                          <p className="text-xs mt-0.5 text-slate-500">{node.sub}</p>
                        </div>
                      )
                    })}
                  </div>

                  <ArrowRight className="w-5 h-5 text-slate-300 flex-shrink-0" />

                  {/* QC */}
                  <div className="flex flex-col gap-2 w-36 flex-shrink-0">
                    {map.nodes.filter(n => n.type === 'qc').map(node => {
                      const s = NODE_STYLES.qc; const Icon = s.icon
                      return (
                        <div key={node.id} className={`rounded-xl border-2 p-3 ${s.bg}`}>
                          <Icon className={`w-3 h-3 ${s.color} mb-1`} />
                          <p className={`text-xs font-semibold ${s.color}`}>{node.label}</p>
                          <p className="text-xs mt-0.5 text-slate-500">{node.sub}</p>
                        </div>
                      )
                    })}
                  </div>

                  <ArrowRight className="w-5 h-5 text-slate-300 flex-shrink-0" />

                  {/* Finished goods */}
                  <div className="flex flex-col gap-2 w-36 flex-shrink-0">
                    {map.nodes.filter(n => n.type === 'warehouse' && n.id === 'n9').map(node => {
                      const s = NODE_STYLES.warehouse; const Icon = s.icon
                      return (
                        <div key={node.id} className={`rounded-xl border-2 p-3 ${s.bg}`}>
                          <Icon className={`w-3 h-3 ${s.color} mb-1`} />
                          <p className={`text-xs font-semibold ${s.color}`}>{node.label}</p>
                          <p className="text-xs mt-0.5 text-slate-500">{node.sub}</p>
                        </div>
                      )
                    })}
                  </div>

                  <ArrowRight className="w-5 h-5 text-slate-300 flex-shrink-0" />

                  {/* Channels */}
                  <div className="flex flex-col gap-2 w-36 flex-shrink-0">
                    {map.nodes.filter(n => n.type === 'channel').map(node => {
                      const s = NODE_STYLES.channel; const Icon = s.icon
                      return (
                        <div key={node.id} className={`rounded-xl border-2 p-3 ${s.bg}`}>
                          <Icon className={`w-3 h-3 ${s.color} mb-1`} />
                          <p className={`text-xs font-semibold ${s.color}`}>{node.label}</p>
                          <p className="text-xs mt-0.5 text-slate-500">{node.sub}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Traceability */}
      {activeTab === 'trace' && (
        <div className="space-y-5">
          <Card>
            <CardContent className="pt-5 pb-5">
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Cari Lot / Produk</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    value={lotSearch}
                    onChange={e => setLotSearch(e.target.value)}
                    placeholder="Masukkan nomor lot, kode produk, SO, WO..."
                    onKeyDown={e => e.key === 'Enter' && handleTrace()}
                  />
                </div>
                <button onClick={handleTrace} disabled={searching}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-all">
                  <Search className="w-4 h-4" />
                  {searching ? 'Mencari...' : 'Telusuri'}
                </button>
              </div>
            </CardContent>
          </Card>

          {traceData && (
            <div className="space-y-5">
              {/* Header */}
              <Card>
                <CardContent className="pt-5 pb-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Nomor Lot</p>
                      <p className="font-mono font-bold text-indigo-600">{traceData.lot_number}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Produk</p>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{traceData.product_name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Qty Batch</p>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{traceData.batch_qty} unit</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Status</p>
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        {traceData.status}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitMerge className="w-4 h-4 text-indigo-500" />
                    Genealogi Produk — Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />
                    <div className="space-y-6">
                      {(traceData.timeline || []).map((item, i) => {
                        const Icon = TRACE_ICONS[item.icon] || Package
                        return (
                          <div key={i} className="relative flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 z-10 shadow">
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-surface-2)', borderColor: 'var(--border-color)' }}>
                              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-indigo-600">Step {item.step}</span>
                                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.stage}</span>
                                </div>
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.date}</span>
                              </div>
                              <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{item.details}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.actor}</span>
                                {item.attachments.map(ref => (
                                  <span key={ref} className="px-2 py-0.5 rounded text-xs font-mono bg-indigo-50 text-indigo-700">{ref}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Supplier Scorecard */}
      {activeTab === 'scorecard' && scorecardData && (
        <div className="space-y-5">
          {/* Vendor selector + radar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader><CardTitle>Peringkat Vendor</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {vendors.map(v => (
                    <button key={v.id} onClick={() => setSelectedVendor(v)}
                      className={`w-full flex items-center gap-4 p-3 rounded-xl border-2 transition-all text-left ${activeVendor?.id === v.id ? 'border-indigo-400 bg-indigo-50' : 'border-transparent hover:border-slate-200'}`}
                      style={activeVendor?.id !== v.id ? { backgroundColor: 'var(--bg-surface-2)' } : {}}>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black ${GRADE_COLORS[v.grade]}`}>{v.grade}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{v.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{v.category} · {v.total_pos} PO · {fmt(v.total_value)}</p>
                        {v.issues.length > 0 && (
                          <p className="text-xs text-rose-500 mt-0.5">⚠ {v.issues[0]}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black" style={{ color: v.score >= 80 ? '#10b981' : v.score >= 70 ? '#f59e0b' : '#ef4444' }}>{v.score}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>/ 100</p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {activeVendor && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    {activeVendor.name} — Detail Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                      <Radar name="Score" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
                    </RadarChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {[
                      { key: 'on_time_delivery', label: 'On-Time Delivery' },
                      { key: 'quality_rate', label: 'Kualitas' },
                      { key: 'price_compliance', label: 'Harga' },
                      { key: 'responsiveness', label: 'Responsiveness' },
                    ].map(m => {
                      const val = activeVendor.metrics[m.key]
                      return (
                        <div key={m.key} className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-surface-3)' }}>
                          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{m.label}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-200">
                              <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: val >= 90 ? '#10b981' : val >= 75 ? '#f59e0b' : '#ef4444' }} />
                            </div>
                            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{val}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {/* Trend */}
                  <p className="text-xs font-semibold mt-4 mb-2" style={{ color: 'var(--text-muted)' }}>TREN SCORE 6 BULAN</p>
                  <ResponsiveContainer width="100%" height={90}>
                    <LineChart data={activeVendor.trend}>
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis domain={[50, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Risk Dashboard */}
      {activeTab === 'risk' && riskData && (
        <div className="space-y-5">
          {/* Risk score */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card>
              <CardContent className="pt-6 pb-6 flex flex-col items-center text-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black mb-3 ${
                  riskData.risk_level === 'low' ? 'bg-emerald-100 text-emerald-600' :
                  riskData.risk_level === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
                }`}>
                  {riskData.risk_score}
                </div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Skor Risiko Supply Chain</p>
                <p className="text-xs capitalize mt-1 px-3 py-1 rounded-full font-medium" style={{ color: 'var(--text-muted)' }}>
                  Level: <strong>{riskData.risk_level}</strong>
                </p>
              </CardContent>
            </Card>

            <div className="md:col-span-2">
              <Card>
                <CardHeader><CardTitle>Kategori Risiko</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(riskData.categories || []).map((cat, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span style={{ color: 'var(--text-primary)' }} className="font-medium">{cat.category}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{cat.score}/100</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface-3)' }}>
                          <div className="h-full rounded-full transition-all" style={{
                            width: `${cat.score}%`,
                            backgroundColor: cat.score >= 50 ? '#f59e0b' : cat.score >= 70 ? '#ef4444' : '#10b981'
                          }} />
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{cat.desc}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Risk items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                Item Risiko & Mitigasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(riskData.risk_items || []).map(item => (
                  <div key={item.id} className={`rounded-xl border p-4 ${RISK_SEV_COLORS[item.severity]}`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold uppercase">{item.severity}</span>
                          <span className="text-xs opacity-70">·</span>
                          <span className="text-xs opacity-70">{item.type.replace('_', ' ')}</span>
                        </div>
                        <p className="text-sm font-semibold">{item.item}</p>
                        <p className="text-xs mt-1 opacity-80">Mitigasi: {item.mitigation}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs opacity-70">Target</p>
                        <p className="text-xs font-bold">{item.deadline}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Risk trend */}
          <Card>
            <CardHeader><CardTitle>Tren Skor Risiko 6 Bulan</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={riskData.monthly_risk_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" name="Risk Score" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
