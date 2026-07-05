import StatCard from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { Zap, TrendingDown, Thermometer, Droplets } from 'lucide-react'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { formatNumber } from '@/utils/format'

const hourlyData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, '0')}:00`,
  kWh: i < 6 ? 35 + Math.random() * 20 : i < 20 ? 150 + Math.random() * 100 : 60 + Math.random() * 30,
}))

const monthlyData = [
  { month: 'Jan', kWh: 38500, cost: 57750000 },
  { month: 'Feb', kWh: 36200, cost: 54300000 },
  { month: 'Mar', kWh: 41000, cost: 61500000 },
  { month: 'Apr', kWh: 39800, cost: 59700000 },
  { month: 'Mei', kWh: 42500, cost: 63750000 },
  { month: 'Jun', kWh: 37200, cost: 55800000 },
]

const meterData = [
  { name: 'Produksi Panel A', kWh: 485, status: 'normal', trend: -2.1 },
  { name: 'Produksi Panel B', kWh: 312, status: 'normal', trend: 1.5 },
  { name: 'HVAC Utama', kWh: 198, status: 'high', trend: 8.3 },
  { name: 'Lighting Lantai 1-3', kWh: 85, status: 'normal', trend: -4.2 },
  { name: 'Utility & Lain', kWh: 160, status: 'normal', trend: 0.8 },
]

export default function SmartEnergy() {
  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div />
        <Badge variant="success" dot>IoT Meters Online: 18/20</Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Konsumsi Hari Ini" value="1,240 kWh" trend={-5.2} icon={Zap} color="purple" />
        <StatCard title="Biaya Hari Ini" value="Rp 1.86 jt" subtitle="Rp 1.500/kWh" icon={TrendingDown} color="emerald" />
        <StatCard title="Suhu Rata-rata" value="25.3°C" icon={Thermometer} color="amber" />
        <StatCard title="Kelembaban" value="62%" icon={Droplets} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Konsumsi Energi Hari Ini (kWh/jam)</CardTitle>
              <Badge variant="success" dot>Live</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="energyG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${v.toFixed(0)} kWh`} />
                <Area dataKey="kWh" stroke="#8b5cf6" fill="url(#energyG)" strokeWidth={2} name="kWh" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Konsumsi per Bulan</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v, name) => name === 'kWh' ? `${formatNumber(v)} kWh` : `Rp ${formatNumber(v)}`} />
                <Bar dataKey="kWh" fill="#8b5cf6" name="kWh" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Status Smart Meter</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {meterData.map((m, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-700">{m.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{m.kWh} kWh</span>
                      <span className={`text-xs ${m.trend < 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {m.trend > 0 ? '+' : ''}{m.trend}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${m.status === 'high' ? 'bg-amber-500' : 'bg-purple-500'}`}
                      style={{ width: `${(m.kWh / 500) * 100}%` }}
                    />
                  </div>
                </div>
                {m.status === 'high' && <Badge variant="warning">High</Badge>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
