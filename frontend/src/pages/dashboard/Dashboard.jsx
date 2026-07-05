import { useEffect, useState } from 'react'
import StatCard from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { Factory, Users, Zap, TrendingUp, AlertTriangle, Activity, Package, ShoppingCart, Cpu, ArrowUpRight } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { dashboardApi } from '@/api'
import { formatCurrency, timeAgo } from '@/utils/format'
import { useAuthStore } from '@/store/authStore'

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e']

const energyData = [
  { name: 'Produksi', value: 45 },
  { name: 'HVAC', value: 30 },
  { name: 'Lighting', value: 15 },
  { name: 'Lainnya', value: 10 },
]

const revenueData = [
  { month: 'Jan', value: 4200000000 }, { month: 'Feb', value: 3800000000 },
  { month: 'Mar', value: 5100000000 }, { month: 'Apr', value: 4700000000 },
  { month: 'Mei', value: 5400000000 }, { month: 'Jun', value: 4900000000 },
]

const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl px-3 py-2.5 shadow-lg text-xs">
      <p className="font-semibold text-slate-600 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const [kpi, setKpi] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [oee, setOee] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      dashboardApi.kpi().catch(() => ({ data: {} })),
      dashboardApi.alerts().catch(() => ({ data: [] })),
      dashboardApi.oee().catch(() => ({ data: [] })),
    ]).then(([kpiRes, alertsRes, oeeRes]) => {
      setKpi(kpiRes.data || kpiRes)
      setAlerts(Array.isArray(alertsRes.data ?? alertsRes) ? (alertsRes.data ?? alertsRes) : [])
      setOee(Array.isArray(oeeRes.data ?? oeeRes) ? (oeeRes.data ?? oeeRes) : [])
    }).finally(() => setLoading(false))
  }, [])

  const moduleStatus = [
    { name: 'Smart Factory', metric: `OEE ${kpi?.oee ?? 89.2}%`, status: 'success', path: '/factory' },
    { name: 'Warehouse', metric: `${kpi?.stock_low ?? 5} low stock`, status: kpi?.stock_out > 0 ? 'danger' : 'warning', path: '/warehouse' },
    { name: 'Smart HRIS', metric: `${kpi?.employees ?? 248} karyawan`, status: 'success', path: '/hris' },
    { name: 'Purchasing', metric: `${kpi?.pending_pr ?? 8} PR pending`, status: 'warning', path: '/purchasing' },
    { name: 'Network NOC', metric: '24 devices online', status: 'success', path: '/network' },
    { name: 'Smart Security', metric: `${kpi?.incidents ?? 2} insiden`, status: kpi?.incidents > 0 ? 'danger' : 'success', path: '/security' },
  ]

  const statusColors = {
    success: { dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    warning: { dot: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-600' },
    danger:  { dot: 'bg-rose-400', bg: 'bg-rose-50', text: 'text-rose-600' },
  }

  const alertBadge = { danger: 'danger', warning: 'warning', info: 'primary', success: 'success' }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 11) return 'Selamat pagi'
    if (h < 15) return 'Selamat siang'
    if (h < 18) return 'Selamat sore'
    return 'Selamat malam'
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl p-6"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-8 -right-8 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-violet-500/15 rounded-full blur-3xl" />
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-indigo-300 text-sm font-medium">{greeting()},</p>
            <h2 className="text-white text-xl font-bold mt-0.5">{user?.name || 'Administrator'} 👋</h2>
            <p className="text-indigo-300/80 text-xs mt-1.5">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-3">
            {alerts.filter(a => a.type === 'danger').length > 0 && (
              <div className="bg-rose-500/20 border border-rose-500/30 rounded-xl px-4 py-2 text-center">
                <p className="text-rose-300 text-lg font-bold">{alerts.filter(a => a.type === 'danger').length}</p>
                <p className="text-rose-400/80 text-[10px] font-medium">Critical Alert</p>
              </div>
            )}
            <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-center">
              <p className="text-white text-lg font-bold">{kpi?.oee ?? '89.2'}%</p>
              <p className="text-indigo-300/80 text-[10px] font-medium">OEE Hari Ini</p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-center">
              <p className="text-white text-lg font-bold">{kpi?.employees ?? '248'}</p>
              <p className="text-indigo-300/80 text-[10px] font-medium">Karyawan Aktif</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="OEE Produksi" value={`${kpi?.oee ?? '—'}%`} subtitle="Target: 90%" trend={2.4} icon={Factory} color="indigo" />
        <StatCard title="Pendapatan Bulan Ini" value={formatCurrency(kpi?.revenue ?? 4900000000)} subtitle="vs bulan lalu" trend={4.1} icon={TrendingUp} color="emerald" />
        <StatCard title="Total Karyawan" value={kpi?.employees ?? '—'} subtitle="8 baru bulan ini" trend={3.3} icon={Users} color="purple" />
        <StatCard title="Konsumsi Energi" value={`${kpi?.energy_kwh ?? '—'} kWh`} subtitle="Hari ini" trend={-5.2} icon={Zap} color="amber" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tren OEE Produksi</CardTitle>
                  <p className="text-xs text-slate-400 mt-0.5">Data real-time hari ini</p>
                </div>
                <Badge variant="success" dot pulse>Live</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {oee.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={oee} margin={{ left: -10 }}>
                    <defs>
                      <linearGradient id="oeeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[70, 100]} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
                    <Area type="monotone" dataKey="oee" stroke="#6366f1" fill="url(#oeeGrad)" strokeWidth={2.5} name="OEE %" dot={false} activeDot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-56 flex flex-col gap-2 justify-center">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="skeleton h-3 rounded-lg" style={{ width: `${60 + Math.random() * 40}%` }} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Distribusi Energi</CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">Konsumsi per area</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={155}>
              <PieChart>
                <Pie data={energyData} cx="50%" cy="50%" innerRadius={46} outerRadius={68} dataKey="value" paddingAngle={3}>
                  {energyData.map((_, i) => <Cell key={i} fill={PALETTE[i]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {energyData.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PALETTE[i] }} />
                    <span className="text-slate-600">{item.name}</span>
                  </div>
                  <span className="font-semibold text-slate-700">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pendapatan 6 Bulan</CardTitle>
                  <p className="text-xs text-slate-400 mt-0.5">Trend revenue tahunan</p>
                </div>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  +4.1% YTD
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenueData} margin={{ left: -10 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `${(v / 1e9).toFixed(1)}M`} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                  <Bar dataKey="value" fill="url(#revenueGrad)" radius={[6, 6, 0, 0]} name="Pendapatan" maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Alert Aktif</CardTitle>
              {alerts.length > 0 && (
                <Badge variant="danger" dot>{alerts.length}</Badge>
              )}
            </div>
          </CardHeader>
          <div className="divide-y divide-slate-50 max-h-[264px] overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">Tidak ada alert aktif</p>
            ) : alerts.map((a) => (
              <div key={a.id} className="px-5 py-3 flex gap-3 hover:bg-slate-50/60 transition-colors">
                <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  a.type === 'danger' ? 'bg-rose-500 animate-pulse' : a.type === 'warning' ? 'bg-amber-500' : 'bg-indigo-500'
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-700 leading-relaxed">{a.message}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant={alertBadge[a.type] || 'primary'} className="text-[9px] px-1.5 py-0">
                      {a.module}
                    </Badge>
                    <span className="text-[10px] text-slate-400">{a.created_at ? timeAgo(a.created_at) : ''}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Module status grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Status Modul</CardTitle>
            <p className="text-xs text-slate-400">Semua sistem operasional</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {moduleStatus.map((m) => {
              const c = statusColors[m.status] || statusColors.success
              return (
                <div key={m.name}
                  className="flex flex-col gap-2 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                    <ArrowUpRight className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 leading-tight">{m.name}</p>
                    <p className={`text-[10px] font-medium mt-0.5 ${c.text}`}>{m.metric}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
