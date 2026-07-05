import { useCallback, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import StatCard from '@/components/ui/StatCard'
import Modal from '@/components/ui/Modal'
import {
  BarChart3, TrendingUp, DollarSign, Users, Download, FileText,
  Activity, Package, ShoppingCart, Wrench, CheckCircle, AlertTriangle,
  Brain, Zap, Target, Clock, RefreshCw, Plus, Calendar, Bell,
  TrendingDown, Minus, ChevronDown, ChevronRight,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'
import { analyticsApi, hrisApi, biApi } from '@/api'
import { useApi, useSubmit } from '@/hooks/useApi'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency } from '@/utils/format'
import toast from 'react-hot-toast'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']

const kpiRadar = [
  { metric: 'OEE', value: 89 }, { metric: 'On-Time', value: 92 },
  { metric: 'Quality', value: 98 }, { metric: 'Kehadiran', value: 97 },
  { metric: 'Stok Akurasi', value: 95 }, { metric: 'Safety', value: 88 },
]

// ─── Export helpers ────────────────────────────────────────────────────────────
function exportToExcel(data, filename) {
  import('xlsx').then(({ utils, writeFile }) => {
    const wb = utils.book_new()
    const ws = utils.json_to_sheet(data)
    utils.book_append_sheet(wb, ws, 'Data')
    writeFile(wb, `${filename}.xlsx`)
    toast.success('File Excel berhasil diunduh')
  })
}

function exportToPDF(filename) {
  import('jspdf').then(({ jsPDF }) => {
    const doc = new jsPDF('p', 'mm', 'a4')
    const now = new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })
    doc.setFontSize(16); doc.text('Smart Enterprise Platform — Analytics Report', 15, 20)
    doc.setFontSize(10); doc.text(`Digenerate: ${now}`, 15, 28)
    doc.setFontSize(12); doc.text('Executive KPI Summary', 15, 40)
    doc.save(`${filename}.pdf`)
    toast.success('PDF berhasil diunduh')
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RiskBadge({ level }) {
  const map = { HIGH: 'danger', MEDIUM: 'warning', LOW: 'success' }
  return <Badge variant={map[level] || 'default'}>{level}</Badge>
}

function SeverityBadge({ s }) {
  const map = { HIGH: 'danger', MEDIUM: 'warning', LOW: 'success' }
  return <Badge variant={map[s] || 'default'}>{s}</Badge>
}

function GrowthChip({ value }) {
  if (value > 0) return (
    <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
      <TrendingUp className="w-3 h-3" />+{value}%
    </span>
  )
  if (value < 0) return (
    <span className="flex items-center gap-0.5 text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
      <TrendingDown className="w-3 h-3" />{value}%
    </span>
  )
  return <span className="flex items-center gap-0.5 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full"><Minus className="w-3 h-3" />0%</span>
}

// ─── Tab: Demand Forecast ─────────────────────────────────────────────────────
function TabForecast() {
  const { data: fData, loading } = useApi(biApi.getDemandForecast)
  const [selected, setSelected] = useState(0)
  if (loading) return <div className="text-center py-12 text-slate-400 text-sm animate-pulse">Memuat model forecast...</div>

  const products = fData?.products || []
  const labels = fData?.labels || []
  const summary = fData?.summary || {}
  const prod = products[selected] || {}

  // Build chart data
  const chartData = labels.map((l, i) => ({
    label: l.replace(' (aktual)', '').replace(' (forecast)', ''),
    type: l.includes('forecast') ? 'forecast' : 'actual',
    actual: i < 6 ? (prod.actuals?.[i] ?? null) : null,
    forecast: i >= 5 ? (i === 5 ? prod.actuals?.[5] : (prod.forecast?.[i - 6] ?? null)) : null,
  }))

  const trendColor = { increasing: 'text-emerald-600', decreasing: 'text-red-500', stable: 'text-amber-600' }
  const trendIcon = { increasing: <TrendingUp className="w-4 h-4" />, decreasing: <TrendingDown className="w-4 h-4" />, stable: <Minus className="w-4 h-4" /> }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Produk Dianalisis', value: summary.total_products_analyzed || 18, icon: Package, color: 'bg-blue-50' },
          { label: 'Akurasi Model', value: summary.model_accuracy || '87.3%', icon: Target, color: 'bg-purple-50' },
          { label: 'Trend Meningkat', value: summary.products_increasing || 7, icon: TrendingUp, color: 'bg-emerald-50' },
          { label: 'Trend Menurun', value: summary.products_decreasing || 3, icon: TrendingDown, color: 'bg-red-50' },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i} className={`${s.color} rounded-xl p-4`}>
              <Icon className="w-5 h-5 text-slate-600 mb-2 opacity-60" />
              <p className="text-xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Product List */}
        <Card>
          <CardHeader><CardTitle>Produk</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {products.map((p, i) => (
                <button key={i} onClick={() => setSelected(i)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${selected === i ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.product}</p>
                    <span className={`flex items-center gap-1 text-xs font-semibold ${trendColor[p.trend]}`}>
                      {trendIcon[p.trend]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-slate-200 rounded-full h-1">
                      <div className="bg-indigo-500 h-1 rounded-full" style={{ width: `${p.confidence}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400">{p.confidence}%</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{prod.product}</CardTitle>
              <Badge variant={prod.trend === 'increasing' ? 'success' : prod.trend === 'decreasing' ? 'danger' : 'warning'}>
                {prod.trend}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="actual" stroke="#3b82f6" fill="url(#colorActual)" strokeWidth={2} name="Aktual" connectNulls />
                <Area type="monotone" dataKey="forecast" stroke="#8b5cf6" fill="url(#colorForecast)" strokeWidth={2} strokeDasharray="6 3" name="Forecast" connectNulls />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start gap-2">
              <Brain className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{prod.forecast_note}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Tab: Predictive Maintenance ──────────────────────────────────────────────
function TabPredictiveMaint() {
  const { data: pmData, loading } = useApi(biApi.getPredictiveMaintenance)
  const [expandedId, setExpandedId] = useState(null)
  if (loading) return <div className="text-center py-12 text-slate-400 text-sm animate-pulse">Memuat model prediksi...</div>

  const machines = pmData?.machines || []

  const riskColors = {
    HIGH: 'bg-red-500',
    MEDIUM: 'bg-amber-400',
    LOW: 'bg-emerald-500',
  }
  const riskBg = {
    HIGH: 'border-red-200 bg-red-50/30',
    MEDIUM: 'border-amber-200 bg-amber-50/30',
    LOW: 'border-emerald-200 bg-emerald-50/30',
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Risiko Tinggi', value: pmData?.high_risk || 2, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Risiko Sedang', value: pmData?.medium_risk || 2, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Risiko Rendah', value: pmData?.low_risk || 1, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-xl p-4 text-center`}>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Prediksi Risiko Mesin</CardTitle>
            <span className="text-xs text-slate-400">{pmData?.model_info}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {machines.map(m => (
              <div key={m.machine_id} className={`border rounded-xl overflow-hidden transition-all ${riskBg[m.risk_level]}`}>
                <button className="w-full p-4 flex items-center gap-4 text-left" onClick={() => setExpandedId(expandedId === m.machine_id ? null : m.machine_id)}>
                  {/* Risk score ring */}
                  <div className="relative w-14 h-14 flex-shrink-0">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="22" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                      <circle cx="28" cy="28" r="22" fill="none" stroke={m.risk_level === 'HIGH' ? '#ef4444' : m.risk_level === 'MEDIUM' ? '#f59e0b' : '#10b981'}
                        strokeWidth="5" strokeDasharray={`${(m.risk_score / 100) * 138.2} 138.2`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-700">{m.risk_score}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-slate-800">{m.name}</p>
                      <RiskBadge level={m.risk_level} />
                    </div>
                    <p className="text-xs text-slate-500">{m.location} · Komponen: {m.failure_component}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Prediksi kegagalan: <span className="font-semibold text-slate-700">{m.predicted_failure}</span></p>
                  </div>
                  {expandedId === m.machine_id ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                </button>
                {expandedId === m.machine_id && (
                  <div className="px-4 pb-4 border-t border-slate-200/50 pt-3 space-y-3">
                    <div className="p-3 bg-white/80 rounded-lg text-sm text-slate-700 flex gap-2">
                      <Brain className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                      <span>{m.recommendation}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {m.history?.map((h, i) => (
                        <div key={i} className="bg-white/80 rounded-lg p-3 text-center">
                          <p className="text-xs text-slate-400">{h.month}</p>
                          <p className="text-lg font-bold text-slate-700">{h.downtime_hours}h</p>
                          <p className="text-[10px] text-slate-400">downtime</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab: Anomaly Detection ───────────────────────────────────────────────────
function TabAnomalies() {
  const { data: aData, loading, refetch } = useApi(biApi.getAnomalies)
  if (loading) return <div className="text-center py-12 text-slate-400 text-sm animate-pulse">Memindai anomali...</div>

  const anomalies = aData?.anomalies || []
  const typeBadge = (t) => ({
    FINANCIAL: <Badge variant="danger">Keuangan</Badge>,
    INVENTORY: <Badge variant="warning">Inventori</Badge>,
    LOGIN: <Badge variant="info">Login</Badge>,
    PURCHASING: <Badge variant="danger">Pengadaan</Badge>,
    PAYROLL: <Badge variant="warning">Payroll</Badge>,
  })[t] || <Badge variant="default">{t}</Badge>

  const statusBadge = (s) => ({
    open: <Badge variant="danger" dot>Open</Badge>,
    investigating: <Badge variant="warning" dot>Investigasi</Badge>,
    resolved: <Badge variant="success" dot>Resolved</Badge>,
  })[s] || <Badge>{s}</Badge>

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Terdeteksi', value: anomalies.length, color: 'bg-slate-100' },
          { label: 'Risiko Tinggi', value: aData?.total_high || 2, color: 'bg-red-50' },
          { label: 'Risiko Sedang', value: aData?.total_medium || 2, color: 'bg-amber-50' },
          { label: 'False Positive Rate', value: aData?.false_positive_rate || '4.2%', color: 'bg-emerald-50' },
        ].map((s, i) => (
          <div key={i} className={`${s.color} rounded-xl p-4`}>
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Anomali Terdeteksi</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Model v{aData?.model_version} · Scan: {aData?.scanned_at}</span>
              <button onClick={refetch} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {anomalies.map(a => (
              <div key={a.id} className="p-4 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="font-mono text-xs text-slate-500">{a.id}</span>
                      {typeBadge(a.type)}
                      <SeverityBadge s={a.severity} />
                      {statusBadge(a.status)}
                    </div>
                    <p className="text-sm text-slate-800 font-medium mb-1">{a.description}</p>
                    <p className="text-xs text-slate-500">
                      {a.module} · Ref: {a.ref_id} · Terdeteksi: {a.detected_at}
                      {a.amount && ` · Nilai: ${formatCurrency(a.amount)}`}
                    </p>
                  </div>
                </div>
                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">{a.suggested_action}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab: Price Recommendation ────────────────────────────────────────────────
function TabPriceRecommendation() {
  const { data: prData, loading } = useApi(biApi.getPriceRecommendation)
  if (loading) return <div className="text-center py-12 text-slate-400 text-sm animate-pulse">Memuat model rekomendasi harga...</div>

  const recs = prData?.recommendations || []

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Rata-rata Margin Saat Ini', value: `${prData?.avg_margin_current || 12.74}%`, color: 'bg-slate-50' },
          { label: 'Rata-rata Margin Rekomendasi', value: `${prData?.avg_margin_recommended || 16.92}%`, color: 'bg-emerald-50' },
          { label: 'Potensi Revenue Uplift', value: prData?.potential_revenue_uplift || '8.3%', color: 'bg-blue-50' },
        ].map((s, i) => (
          <div key={i} className={`${s.color} rounded-xl p-4 text-center`}>
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Rekomendasi Harga Jual</CardTitle>
            <span className="text-xs text-slate-400">{prData?.methodology}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recs.map(r => {
              const priceDiff = r.recommended_price - r.current_price
              const marginDiff = r.recommended_margin - r.current_margin
              return (
                <div key={r.product_id} className="p-4 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-800">{r.product_name}</p>
                      <p className="text-xs text-slate-500">{r.product_id} · Satuan: {r.unit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <GrowthChip value={marginDiff.toFixed(1)} />
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Confidence</span>
                        <span className="text-sm font-bold text-indigo-600">{r.confidence}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-slate-400 mb-1">Harga Saat Ini</p>
                      <p className="font-bold text-slate-700">{formatCurrency(r.current_price)}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Margin {r.current_margin.toFixed(1)}%</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-emerald-600 mb-1 font-medium">Rekomendasi</p>
                      <p className="font-bold text-emerald-700">{formatCurrency(r.recommended_price)}</p>
                      <p className="text-[10px] text-emerald-600 mt-0.5">Margin {r.recommended_margin.toFixed(1)}%</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-slate-400 mb-1">Rata-rata Pasar</p>
                      <p className="font-bold text-slate-700">{formatCurrency(r.market_avg_price)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-slate-400 mb-1">Selisih Harga</p>
                      <p className={`font-bold ${priceDiff > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {priceDiff > 0 ? '+' : ''}{formatCurrency(priceDiff)}
                      </p>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-slate-500 italic">💡 {r.rationale}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab: Comparison ─────────────────────────────────────────────────────────
function TabComparison() {
  const { data: cData, loading } = useApi(biApi.getComparison)
  if (loading) return <div className="text-center py-12 text-slate-400 text-sm animate-pulse">Memuat data perbandingan...</div>

  const periods = cData?.periods || []
  const growth = cData?.growth || {}

  const metrics = [
    { key: 'revenue', label: 'Revenue', format: (v) => formatCurrency(v), unit: '' },
    { key: 'cost', label: 'Biaya', format: (v) => formatCurrency(v), unit: '' },
    { key: 'profit', label: 'Laba', format: (v) => formatCurrency(v), unit: '' },
    { key: 'margin', label: 'Margin', format: (v) => `${v}%`, unit: '' },
    { key: 'orders', label: 'Total Order', format: (v) => v, unit: ' SO' },
    { key: 'customers', label: 'Active Customer', format: (v) => v, unit: '' },
    { key: 'oee', label: 'OEE', format: (v) => `${v}%`, unit: '' },
    { key: 'attendance', label: 'Kehadiran', format: (v) => `${v}%`, unit: '' },
  ]

  const chartData = metrics.map(m => ({
    metric: m.label,
    ...Object.fromEntries(periods.map((p, i) => [p.label.split(' ')[0] + (i > 0 ? i : ''), p[m.key]])),
  }))

  return (
    <div className="space-y-4">
      {/* Growth chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Revenue MoM', value: growth.revenue_mom },
          { label: 'Revenue YoY', value: growth.revenue_yoy },
          { label: 'Laba MoM', value: growth.profit_mom },
          { label: 'Orders MoM', value: growth.orders_mom },
        ].map((g, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-2">{g.label}</p>
            <GrowthChip value={g.value} />
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <Card>
        <CardHeader><CardTitle>Perbandingan Periode</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Metrik</th>
                  {periods.map((p, i) => (
                    <th key={i} className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {p.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, mi) => (
                  <tr key={m.key} className={mi % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    <td className="px-4 py-3 font-medium text-slate-700">{m.label}</td>
                    {periods.map((p, pi) => {
                      const current = p[m.key]
                      const prev = periods[pi + 1]?.[m.key]
                      const isBetter = prev !== undefined ? current > prev : null
                      return (
                        <td key={pi} className="px-4 py-3 text-right">
                          <span className={`font-semibold ${pi === 0 && isBetter === true ? 'text-emerald-600' : pi === 0 && isBetter === false ? 'text-red-500' : 'text-slate-700'}`}>
                            {m.format(current)}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bar chart */}
      <Card>
        <CardHeader><CardTitle>Revenue & Laba — Perbandingan Visual</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={periods.map(p => ({ name: p.label.split(' ')[0], revenue: p.revenue, profit: p.profit }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1e9).toFixed(1)}M`} />
              <Tooltip formatter={v => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
              <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name="Laba" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab: Custom Report ───────────────────────────────────────────────────────
function TabCustomReport() {
  const { canDo } = useAuthStore()
  const canAdd = canDo('analytics.custom', 'add')
  const [form, setForm] = useState({ module: 'sales', limit: 20 })
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({ name: '', schedule: 'weekly', recipients: '', format: 'Excel' })

  const { data: schedsRaw } = useApi(biApi.getScheduledReports)
  const scheds = Array.isArray(schedsRaw?.value) ? schedsRaw.value : []

  const { submit: saveSchedule, loading: savingSchedule } = useSubmit(biApi.saveScheduledReport, {
    successMsg: 'Laporan terjadwal berhasil disimpan',
    onSuccess: () => setShowScheduleModal(false),
  })

  const handleRun = async () => {
    setLoading(true)
    try {
      const res = await biApi.getCustomReport(form)
      setResults(res)
    } catch { toast.error('Gagal menjalankan laporan') } finally { setLoading(false) }
  }

  const handleExport = () => {
    if (!results?.rows?.length) return
    exportToExcel(results.rows, `custom-report-${form.module}-${new Date().toISOString().slice(0, 10)}`)
  }

  const moduleOptions = [
    { value: 'sales', label: 'Sales Orders' },
    { value: 'purchasing', label: 'Purchase Orders' },
    { value: 'finance', label: 'Transaksi Keuangan' },
    { value: 'inventory', label: 'Inventori' },
  ]

  return (
    <div className="space-y-4">
      {/* Builder */}
      <Card>
        <CardHeader><CardTitle>Custom Report Builder</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-48">
              <Select label="Modul" value={form.module} onChange={e => setForm(p => ({ ...p, module: e.target.value }))}
                options={moduleOptions} />
            </div>
            <div className="w-28">
              <label className="block text-sm font-medium text-slate-700 mb-1">Maks. Baris</label>
              <input type="number" value={form.limit} min={5} max={200}
                onChange={e => setForm(p => ({ ...p, limit: parseInt(e.target.value) || 20 }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
            </div>
            <Button loading={loading} icon={<Zap className="w-4 h-4" />} onClick={handleRun}>Jalankan</Button>
            {results && (
              <>
                <Button variant="secondary" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport}>Export Excel</Button>
                {canAdd && <Button variant="secondary" size="sm" icon={<Calendar className="w-3.5 h-3.5" />} onClick={() => setShowScheduleModal(true)}>Jadwalkan</Button>}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{moduleOptions.find(m => m.value === results.module)?.label} — {results.total} baris</CardTitle>
              <span className="text-xs text-slate-400">Digenerate: {results.generated_at}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {results.rows[0] && Object.keys(results.rows[0]).map(k => (
                      <th key={k} className="px-3 py-2 text-left font-semibold text-slate-600 capitalize whitespace-nowrap">{k.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.rows.slice(0, 15).map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="px-3 py-1.5 text-slate-700 whitespace-nowrap">
                          {typeof v === 'number' && v > 100000 ? formatCurrency(v) : String(v ?? '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {results.rows.length > 15 && (
                <p className="text-xs text-slate-400 text-center py-2">... dan {results.rows.length - 15} baris lainnya. Export Excel untuk data lengkap.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scheduled Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Laporan Terjadwal</CardTitle>
            {canAdd && <Button size="sm" icon={<Plus />} onClick={() => setShowScheduleModal(true)}>Tambah Jadwal</Button>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {scheds.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-slate-800">{s.name}</p>
                    <Badge variant={s.status === 'active' ? 'success' : 'default'}>{s.status}</Badge>
                    <Badge variant="default">{s.format}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <Clock className="w-3 h-3 inline mr-1" />{s.schedule} · {s.recipients}
                  </p>
                </div>
                <span className="text-xs text-slate-400">Last: {s.last_run}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Modal */}
      <Modal open={showScheduleModal} onClose={() => setShowScheduleModal(false)} title="Jadwalkan Laporan">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Laporan</label>
            <input value={scheduleForm.name} onChange={e => setScheduleForm(p => ({ ...p, name: e.target.value }))}
              placeholder="cth: Weekly Sales Summary" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Jadwal" value={scheduleForm.schedule} onChange={e => setScheduleForm(p => ({ ...p, schedule: e.target.value }))}
              options={[{ value: 'daily', label: 'Harian' }, { value: 'weekly', label: 'Mingguan (Senin)' }, { value: 'monthly', label: 'Bulanan (Tgl 1)' }]} />
            <Select label="Format" value={scheduleForm.format} onChange={e => setScheduleForm(p => ({ ...p, format: e.target.value }))}
              options={[{ value: 'Excel', label: 'Excel (.xlsx)' }, { value: 'PDF', label: 'PDF' }, { value: 'Email', label: 'Email HTML' }]} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Penerima Email</label>
            <input value={scheduleForm.recipients} onChange={e => setScheduleForm(p => ({ ...p, recipients: e.target.value }))}
              placeholder="email1@sep.id, email2@sep.id" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowScheduleModal(false)}>Batal</Button>
            <Button loading={savingSchedule} icon={<Bell className="w-4 h-4" />} onClick={() => saveSchedule({ ...scheduleForm, module: form.module })}>
              Simpan Jadwal
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Main Analytics Page ──────────────────────────────────────────────────────
const periods = [
  { id: 'today', label: 'Hari Ini' },
  { id: 'week', label: 'Minggu Ini' },
  { id: 'month', label: 'Bulan Ini' },
  { id: 'year', label: 'Tahun Ini' },
]

const VALID_TABS = [
  'executive', 'operational', 'hr', 'module', 'comparison',
  'forecast', 'predictive', 'anomalies', 'price', 'custom',
]

export default function Analytics() {
  const { tab } = useParams()
  const navigate = useNavigate()
  const activeTab = VALID_TABS.includes(tab) ? tab : 'executive'
  useEffect(() => {
    if (!VALID_TABS.includes(tab)) navigate('/analytics/executive', { replace: true })
  }, [tab])
  const [period, setPeriod] = useState('month')
  const { user } = useAuthStore()

  const { data: summaryRaw, loading: loadingSummary } = useApi(
    useCallback(() => analyticsApi.getSummary(period), [period])
  )
  const { data: roleDash } = useApi(analyticsApi.getRoleDashboard)
  const { data: employeesRaw } = useApi(hrisApi.getEmployees)

  const summary = summaryRaw || {}
  const kpi = summary.kpi || {}
  const trends = Array.isArray(summary.trends) ? summary.trends : []
  const deptBreakdown = Array.isArray(summary.dept_breakdown) ? summary.dept_breakdown : []
  const moduleHealth = Array.isArray(summary.module_health) ? summary.module_health : []
  const employees = Array.isArray(employeesRaw?.value) ? employeesRaw.value : []

  const deptPie = employees.length > 0
    ? Object.entries(employees.reduce((acc, e) => { acc[e.department] = (acc[e.department] || 0) + 1; return acc }, {}))
        .map(([name, value]) => ({ name, value }))
    : deptBreakdown.map(d => ({ name: d.dept, value: d.employees }))

  const handleExportExcel = () => {
    exportToExcel([
      { Metrik: 'Total Karyawan', Nilai: kpi.total_employees || 248 },
      { Metrik: 'WO Aktif', Nilai: kpi.active_workorders || 8 },
      { Metrik: 'OEE (%)', Nilai: kpi.oee || 89.2 },
      { Metrik: 'Attendance Rate (%)', Nilai: kpi.attendance_rate || 97.2 },
    ], `analytics-${period}-${new Date().toISOString().slice(0, 10)}`)
  }

  const SECTION_TITLE = {
    executive: 'Executive', operational: 'Operasional', hr: 'HRIS', module: 'Kesehatan Modul',
    comparison: 'Perbandingan', forecast: 'Demand Forecast', predictive: 'Predictive Maint.',
    anomalies: 'Anomali', price: 'Rekomendasi Harga', custom: 'Custom Report',
  }
  const AI_TABS = ['forecast', 'predictive', 'anomalies', 'price']

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg flex-wrap">
          {periods.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${period === p.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          {loadingSummary && <span className="text-xs text-gray-400 animate-pulse">Memuat...</span>}
          <Badge variant="success" dot>Live</Badge>
          <Button variant="secondary" size="sm" icon={<Download />} onClick={handleExportExcel}>Excel</Button>
          <Button variant="secondary" size="sm" icon={<FileText />} onClick={() => exportToPDF(`laporan-analytics-${period}`)}>PDF</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Karyawan" value={String(kpi.total_employees || employees.length || 248)} trend={3.3} icon={Users} color="blue" />
        <StatCard title="WO Aktif" value={String(kpi.active_workorders || 8)} subtitle="sedang berjalan" icon={Activity} color="amber" />
        <StatCard title="OEE Produksi" value={`${kpi.oee || 89.2}%`} trend={1.2} icon={BarChart3} color="purple" />
        <StatCard title="Stok Alert" value={String(kpi.stock_low || 3)} subtitle="di bawah minimum" icon={AlertTriangle} color="red" />
      </div>

      <h1 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
        {AI_TABS.includes(activeTab) && <Brain className="w-4 h-4 text-purple-500" />}
        {SECTION_TITLE[activeTab]}
      </h1>

      {/* Tab content */}
      {activeTab === 'executive' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Tren Revenue & Biaya</CardTitle>
                  <Badge variant="info">{period}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {trends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1e9).toFixed(1)}M`} />
                      <Tooltip formatter={v => formatCurrency(v)} />
                      <Legend />
                      <Line dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" dot={false} />
                      <Line dataKey="cost" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" name="Biaya" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-60 flex items-center justify-center text-gray-400 text-sm">Memuat data tren...</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>KPI Radar Score</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={kpiRadar}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis domain={[60, 100]} tick={{ fontSize: 9 }} />
                    <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Score" />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Aset', value: kpi.total_assets || 42, unit: 'unit', color: 'bg-purple-50 text-purple-700', icon: Wrench },
              { label: 'PR Pending', value: kpi.pending_pr || 3, unit: 'PR', color: 'bg-amber-50 text-amber-700', icon: ShoppingCart },
              { label: 'Attendance Rate', value: `${kpi.attendance_rate || 97.2}%`, unit: '', color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle },
              { label: 'Total Vendor', value: kpi.total_vendors || 12, unit: 'vendor', color: 'bg-blue-50 text-blue-700', icon: Package },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} className={`rounded-xl p-4 ${item.color.split(' ')[0]}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium opacity-70">{item.label}</p>
                    <Icon className={`w-4 h-4 opacity-50 ${item.color.split(' ')[1]}`} />
                  </div>
                  <p className={`text-2xl font-bold ${item.color.split(' ')[1]}`}>
                    {item.value}<span className="text-sm font-normal ml-1">{item.unit}</span>
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'operational' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Performa per Departemen</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={deptBreakdown.length > 0 ? deptBreakdown : [
                  { dept: 'Produksi', score: 88 }, { dept: 'Warehouse', score: 92 },
                  { dept: 'HR', score: 85 }, { dept: 'Finance', score: 94 },
                  { dept: 'IT', score: 90 }, { dept: 'Marketing', score: 78 },
                ]} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="dept" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={v => `${v}/100`} />
                  <Bar dataKey="score" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Skor" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Work Orders per Periode</CardTitle></CardHeader>
            <CardContent>
              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#10b981" radius={[4, 4, 0, 0]} name="Work Orders" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-60 flex items-center justify-center text-gray-400 text-sm">Memuat data...</div>}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'hr' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Distribusi Karyawan per Departemen</CardTitle></CardHeader>
            <CardContent>
              {deptPie.length > 0 ? (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={deptPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {deptPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [`${v} orang`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {deptPie.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1 text-xs">
                        <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span>{d.name}: {d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <div className="h-60 flex items-center justify-center text-gray-400 text-sm">Memuat data...</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Ringkasan HRIS</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: 'Total Karyawan Aktif', value: kpi.total_employees || employees.length || 248, color: 'blue' },
                  { label: 'Attendance Rate', value: `${kpi.attendance_rate || 97.2}%`, color: 'emerald' },
                  { label: 'Departemen', value: deptPie.length || 7, color: 'purple' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600 font-medium">{item.label}</span>
                    <span className={`text-lg font-bold text-${item.color}-600`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'module' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(moduleHealth.length > 0 ? moduleHealth : [
              { module: 'Factory', status: 'good', score: 89 }, { module: 'Warehouse', status: 'warning', score: 72 },
              { module: 'HRIS', status: 'good', score: 97 }, { module: 'Purchasing', status: 'good', score: 85 },
              { module: 'Asset', status: 'good', score: 91 }, { module: 'Security', status: 'good', score: 88 },
              { module: 'Accounting', status: 'good', score: 80 }, { module: 'Analytics', status: 'good', score: 95 }, { module: 'Network', status: 'warning', score: 65 },
            ]).map(m => (
              <Card key={m.module}>
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-gray-800">{m.module}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${m.score >= 85 ? 'text-emerald-600 bg-emerald-50' : m.score >= 70 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'}`}>
                      {m.score >= 85 ? '✓ Baik' : m.score >= 70 ? '⚠ Perhatian' : '✗ Kritis'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${m.score >= 85 ? 'bg-emerald-500' : m.score >= 70 ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${m.score}%` }} />
                    </div>
                    <span className="text-sm font-bold text-gray-700 w-10 text-right">{m.score}%</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'comparison' && <TabComparison />}
      {activeTab === 'forecast' && <TabForecast />}
      {activeTab === 'predictive' && <TabPredictiveMaint />}
      {activeTab === 'anomalies' && <TabAnomalies />}
      {activeTab === 'price' && <TabPriceRecommendation />}
      {activeTab === 'custom' && <TabCustomReport />}
    </div>
  )
}
