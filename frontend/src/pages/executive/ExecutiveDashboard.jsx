import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { executiveApi } from '@/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import {
  TrendingUp, Factory, Users, Package, ShieldCheck, Truck,
  AlertTriangle, AlertCircle, Info, CheckCircle, Target, Download,
  Settings2, Maximize2, Minimize2
} from 'lucide-react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'

const fmt = (n) => {
  if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(2)}M`
  if (n >= 1e6) return `Rp ${(n / 1e6).toFixed(0)}jt`
  return 'Rp ' + Number(n).toLocaleString('id-ID')
}

const fmtPct = (n) => `${Number(n).toFixed(1)}%`

const VALID_TABS = ['overview', 'report', 'targets']

const ALERT_STYLES = {
  critical: { bg: 'bg-rose-50 border-rose-200', icon: AlertCircle, color: 'text-rose-600', dot: 'bg-rose-500' },
  warning:  { bg: 'bg-amber-50 border-amber-200', icon: AlertTriangle, color: 'text-amber-600', dot: 'bg-amber-500' },
  info:     { bg: 'bg-blue-50 border-blue-100', icon: Info, color: 'text-blue-600', dot: 'bg-blue-400' },
}

const STATUS_COLORS = { good: 'text-emerald-600', warning: 'text-amber-600', critical: 'text-rose-600' }
const STATUS_BAR    = { good: '#10b981', warning: '#f59e0b', critical: '#ef4444' }

function ScoreGauge({ score, level }) {
  const color = level === 'good' ? '#10b981' : level === 'warning' ? '#f59e0b' : '#ef4444'
  const label = level === 'good' ? 'BAIK' : level === 'warning' ? 'PERHATIAN' : 'KRITIS'
  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bg-surface-3)" strokeWidth="10" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${score * 2.51} 251`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black" style={{ color }}>{score}</span>
          <span className="text-xs font-bold" style={{ color }}>{label}</span>
        </div>
      </div>
      <p className="text-xs mt-2 font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Health Score</p>
    </div>
  )
}

function KPICard({ title, actual, target, pct, icon: Icon, color, unit = '' }) {
  const gradients = {
    indigo: 'from-indigo-500 to-blue-600',
    emerald: 'from-emerald-400 to-teal-600',
    amber: 'from-amber-400 to-orange-500',
    violet: 'from-violet-500 to-purple-600',
    rose: 'from-rose-400 to-pink-600',
    cyan: 'from-cyan-400 to-blue-500',
  }
  const ok = pct >= 95
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradients[color]} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{title}</p>
            <p className="text-lg font-black truncate" style={{ color: 'var(--text-primary)' }}>{actual}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface-3)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: ok ? '#10b981' : pct >= 85 ? '#f59e0b' : '#ef4444' }} />
              </div>
              <span className={`text-xs font-bold ${ok ? 'text-emerald-600' : pct >= 85 ? 'text-amber-600' : 'text-rose-600'}`}>{fmtPct(pct)}</span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Target: {target}{unit}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ReportSection({ section }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{section.title}</h3>
      <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-surface-3)' }}>
              <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Indikator</th>
              <th className="px-4 py-2 text-right text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Aktual</th>
              <th className="px-4 py-2 text-right text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Target</th>
              <th className="px-4 py-2 text-right text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Capaian</th>
              <th className="px-4 py-2 text-center text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {section.metrics.map((m, i) => (
              <tr key={i} style={{ backgroundColor: 'var(--bg-surface)' }}>
                <td className="px-4 py-2.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.label}</td>
                <td className="px-4 py-2.5 text-right text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{m.actual}</td>
                <td className="px-4 py-2.5 text-right text-sm" style={{ color: 'var(--text-muted)' }}>{m.target}</td>
                <td className="px-4 py-2.5 text-right">
                  <span className={`text-xs font-bold ${STATUS_COLORS[m.status] || 'text-slate-600'}`}>{m.pct > 0 ? fmtPct(m.pct) : '-'}</span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  {m.status === 'good' && <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />}
                  {m.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" />}
                  {m.status === 'critical' && <AlertCircle className="w-4 h-4 text-rose-500 mx-auto" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs italic px-1" style={{ color: 'var(--text-muted)' }}>📌 {section.note}</p>
    </div>
  )
}

export default function ExecutiveDashboard() {
  const navigate = useNavigate()
  const { tab } = useParams()
  const activeTab = VALID_TABS.includes(tab) ? tab : 'overview'
  useEffect(() => {
    if (!VALID_TABS.includes(tab)) navigate('/executive/overview', { replace: true })
  }, [tab])
  const [period, setPeriod] = useState('thisMonth')
  const [dashData, setDashData] = useState(null)
  const [reportData, setReportData] = useState(null)
  const [targets, setTargets] = useState([])
  const [presentMode, setPresentMode] = useState(false)
  const printRef = useRef()

  useEffect(() => {
    executiveApi.getDashboard(period).then(r => setDashData(r?.data)).catch(() => {})
  }, [period])

  useEffect(() => {
    if (activeTab === 'report' && !reportData) {
      executiveApi.getManagementReport().then(r => setReportData(r?.data)).catch(() => {})
    }
    if (activeTab === 'targets' && targets.length === 0) {
      executiveApi.getKPITargets().then(r => setTargets(r?.data || [])).catch(() => {})
    }
  }, [activeTab])

  const handlePrint = () => window.print()

  const d = dashData || {}
  const fin = d.finance || {}
  const sales = d.sales || {}
  const prod = d.production || {}
  const qual = d.quality || {}
  const sc = d.supply_chain || {}
  const hr = d.hr || {}

  return (
    <div className={`${presentMode ? 'fixed inset-0 z-50 overflow-auto' : 'p-6 space-y-5'}`}
      style={presentMode ? { backgroundColor: '#0f172a', padding: '2rem' } : {}}>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: presentMode ? '#f1f5f9' : 'var(--text-primary)' }}>
            Executive Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: presentMode ? '#94a3b8' : 'var(--text-muted)' }}>
            {d.as_of ? `Per ${d.as_of}` : 'Ringkasan Kinerja Perusahaan'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select value={period} onChange={e => setPeriod(e.target.value)}
            className="text-sm border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all"
            style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}>
            <option value="thisMonth">Bulan Ini</option>
            <option value="lastMonth">Bulan Lalu</option>
            <option value="thisQuarter">Kuartal Ini</option>
            <option value="ytd">YTD 2026</option>
          </select>
          <button onClick={() => setPresentMode(p => !p)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all hover:bg-slate-50"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
            {presentMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            {presentMode ? 'Normal' : 'Presentasi'}
          </button>
          {activeTab === 'report' && (
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-all">
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          )}
        </div>
      </div>

      {/* ── OVERVIEW ── */}
      {(activeTab === 'overview' || presentMode) && (
        <div className="space-y-5">
          {/* Top row: score + alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            <Card className={presentMode ? 'bg-slate-800 border-slate-700' : ''}>
              <CardContent className="pt-2 pb-2">
                <ScoreGauge score={d.health_score} level={d.health_level} />
              </CardContent>
            </Card>
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Perhatian Manajemen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(d.alerts || []).map((a, i) => {
                      const s = ALERT_STYLES[a.level] || ALERT_STYLES.info
                      const Icon2 = s.icon
                      return (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${s.bg}`}>
                          <Icon2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${s.color}`} />
                          <div>
                            <span className={`text-xs font-bold ${s.color}`}>{a.module}</span>
                            <span className="text-xs mx-1.5 text-slate-300">·</span>
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{a.msg}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <KPICard title="Revenue" actual={fmt(fin.revenue)} target={fmt(fin.revenue_target)} pct={fin.revenue_vs_target} icon={TrendingUp} color="indigo" />
            <KPICard title="Gross Margin" actual={fmtPct(fin.gross_margin)} target="32%" pct={fin.gross_margin / 32 * 100} icon={TrendingUp} color="emerald" />
            <KPICard title="OEE Produksi" actual={fmtPct(prod.oee)} target={fmtPct(prod.oee_target)} pct={prod.oee / prod.oee_target * 100} icon={Factory} color="amber" />
            <KPICard title="Output vs Target" actual={`${prod.output_units?.toLocaleString('id-ID')} unit`} target={`${prod.output_target?.toLocaleString('id-ID')} unit`} pct={prod.output_vs_target} icon={Package} color="violet" />
            <KPICard title="On-Time Delivery" actual={fmtPct(sc.otd_rate)} target={fmtPct(sc.otd_target)} pct={sc.otd_rate / sc.otd_target * 100} icon={Truck} color="cyan" />
            <KPICard title="Defect Rate" actual={fmtPct(qual.defect_rate)} target={fmtPct(qual.defect_rate_target)} pct={qual.defect_rate_target / qual.defect_rate * 100} icon={ShieldCheck} color="rose" />
            <KPICard title="Attendance Rate" actual={fmtPct(hr.attendance_rate)} target="97%" pct={hr.attendance_rate / 97 * 100} icon={Users} color="emerald" />
            <KPICard title="Customer Retention" actual={fmtPct(sales.customer_retention)} target="90%" pct={sales.customer_retention / 90 * 100} icon={TrendingUp} color="indigo" />
            <KPICard title="Supply Risk" actual={`Score ${sc.supply_risk_score}`} target="< 30" pct={30 / sc.supply_risk_score * 100} icon={AlertTriangle} color="amber" />
          </div>

          {/* Revenue chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                Revenue & Profit 6 Bulan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={fin.trend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tickFormatter={v => `${(v/1e6).toFixed(0)}jt`} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${(v/1e6).toFixed(0)}jt`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v, n) => [fmt(v), n]} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4,4,0,0]} />
                  <Line yAxisId="right" type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Module summary row */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              { label: 'Orders', value: sales.total_orders, sub: `target ${sales.orders_target}`, icon: TrendingUp, color: 'indigo' },
              { label: 'WO Done', value: `${prod.work_orders_done}/${prod.work_orders_total}`, sub: 'work orders', icon: Factory, color: 'amber' },
              { label: 'NCR Open', value: qual.ncr_open, sub: 'non-conformance', icon: ShieldCheck, color: 'rose' },
              { label: 'PO Overdue', value: sc.po_overdue, sub: `dari ${sc.po_open} open`, icon: Truck, color: 'orange' },
              { label: 'Headcount', value: hr.headcount, sub: `${hr.new_hires} hire baru`, icon: Users, color: 'emerald' },
              { label: 'Cash', value: fmt(fin.cash_position), sub: 'posisi kas', icon: TrendingUp, color: 'cyan' },
            ].map((item, i) => {
              const Icon = item.icon
              const bgs = { indigo:'bg-indigo-50', amber:'bg-amber-50', rose:'bg-rose-50', orange:'bg-orange-50', emerald:'bg-emerald-50', cyan:'bg-cyan-50' }
              const txts = { indigo:'text-indigo-600', amber:'text-amber-600', rose:'text-rose-600', orange:'text-orange-600', emerald:'text-emerald-600', cyan:'text-cyan-600' }
              return (
                <div key={i} className="rounded-xl border p-3 text-center" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                  <div className={`w-8 h-8 rounded-lg ${bgs[item.color]} flex items-center justify-center mx-auto mb-2`}>
                    <Icon className={`w-4 h-4 ${txts[item.color]}`} />
                  </div>
                  <p className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{item.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.sub}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── MANAGEMENT REPORT ── */}
      {activeTab === 'report' && reportData && (
        <div className="space-y-6" ref={printRef}>
          {/* Report header */}
          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="text-center mb-4">
                <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>MANAGEMENT REPORT</h2>
                <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{reportData.company}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Periode: {reportData.period} · Disiapkan: {reportData.generated}</p>
              </div>
              <div className="rounded-xl p-4 border-l-4 border-indigo-400" style={{ backgroundColor: 'var(--bg-surface-2)' }}>
                <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Ringkasan Eksekutif</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{reportData.executive_summary}</p>
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          {(reportData.sections || []).map((sec, i) => (
            <Card key={i}>
              <CardContent className="pt-5 pb-5">
                <ReportSection section={sec} />
              </CardContent>
            </Card>
          ))}

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-500" />
                Rekomendasi Manajemen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(reportData.recommendations || []).map((r, i) => (
                  <div key={i} className="flex items-start gap-4 p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-surface-2)', borderColor: 'var(--border-color)' }}>
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">{r.priority}</div>
                    <div>
                      <span className="text-xs font-bold text-indigo-600">{r.area}</span>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>{r.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── KPI TARGETS ── */}
      {activeTab === 'targets' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-indigo-500" />
              Konfigurasi Target KPI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-surface-3)' }}>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>KPI</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Target Saat Ini</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                  {targets.map((t, i) => (
                    <tr key={i} style={{ backgroundColor: 'var(--bg-surface)' }}>
                      <td className="px-4 py-3 text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
                        {t.key.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono font-semibold text-indigo-600">{t.target}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
              Target KPI dapat diperbarui melalui API PUT /executive/kpi-targets
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
