import { useState } from 'react'
import StatCard from '@/components/ui/StatCard'
import Tabs from '@/components/ui/Tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { Building2, Thermometer, Lightbulb, Droplets, Zap, Activity, Wind } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { iotApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { useWebSocket } from '@/hooks/useWebSocket'

const staticRooms = [
  { id: 'RM-001', name: 'Ruang Produksi A', floor: 'Lantai 1', temp: 24.5, humidity: 62, ac: 'on', lights: 'on', co2_ppm: 580, energy_kw: 85 },
  { id: 'RM-002', name: 'Office Lantai 3', floor: 'Lantai 3', temp: 22.8, humidity: 55, ac: 'on', lights: 'on', co2_ppm: 490, energy_kw: 15 },
  { id: 'RM-003', name: 'Server Room', floor: 'Lantai 2', temp: 18.5, humidity: 45, ac: 'on', lights: 'off', co2_ppm: 410, energy_kw: 12 },
  { id: 'RM-004', name: 'Ruang Meeting', floor: 'Lantai 3', temp: 25.1, humidity: 65, ac: 'off', lights: 'off', co2_ppm: 420, energy_kw: 0.5 },
  { id: 'RM-005', name: 'Gudang A', floor: 'Lantai 1', temp: 28.3, humidity: 70, ac: 'off', lights: 'on', co2_ppm: 460, energy_kw: 8 },
]

const tempData = [
  { time: '06:00', produksi: 26, office: 23, server: 18 },
  { time: '08:00', produksi: 27, office: 22, server: 18.5 },
  { time: '10:00', produksi: 28, office: 23, server: 18.2 },
  { time: '12:00', produksi: 29, office: 24, server: 18.8 },
  { time: '14:00', produksi: 28.5, office: 23.5, server: 18.5 },
  { time: '16:00', produksi: 27, office: 22.8, server: 18 },
  { time: 'Now', produksi: 26.5, office: 22.8, server: 18.5 },
]

const energyData = [
  { hour: '00', kWh: 45 },
  { hour: '04', kWh: 32 },
  { hour: '08', kWh: 180 },
  { hour: '12', kWh: 220 },
  { hour: '16', kWh: 195 },
  { hour: '20', kWh: 120 },
]

export default function SmartBuilding() {
  const [activeTab, setActiveTab] = useState('overview')
  const { data: sensorRaw } = useApi(iotApi.getBuildingSensors)
  const { data: wsData, connected: wsConnected } = useWebSocket()
  const rooms = Array.isArray(sensorRaw?.data) ? sensorRaw.data.map((z, i) => ({
    id: `RM-${i + 1}`, name: z.zone, floor: 'Auto',
    temp: z.temp, humidity: z.humidity, ac: z.ac_on, lights: z.lights_on,
    co2_ppm: z.co2_ppm, energy_kw: z.energy_kw,
  })) : staticRooms

  const totalEnergy = sensorRaw?.total_energy || rooms.reduce((s, r) => s + (r.energy_kw || 0), 0)

  const co2Color = (ppm) => ppm < 450 ? 'text-emerald-600 bg-emerald-50' : ppm < 600 ? 'text-blue-600 bg-blue-50' : ppm < 800 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'hvac', label: 'HVAC' },
            { id: 'energy', label: 'Energi' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Badge variant="success" dot>{wsConnected ? 'IoT + WS Live' : 'IoT Poll'}</Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Suhu Rata-rata" value={`${(rooms.reduce((s,r)=>s+r.temp,0)/rooms.length).toFixed(1)}°C`} subtitle="dari sensor IoT" icon={Thermometer} color="amber" />
        <StatCard title="AC Aktif" value={`${rooms.filter(r=>r.ac===true||r.ac==='on').length}/${rooms.length}`} icon={Building2} color="blue" />
        <StatCard title="Lampu Aktif" value={`${rooms.filter(r=>r.lights===true||r.lights==='on').length}/${rooms.length}`} icon={Lightbulb} color="amber" />
        <StatCard title="Total Konsumsi" value={`${totalEnergy.toFixed(1)} kW`} subtitle={wsConnected ? 'Realtime' : 'IoT Poll'} icon={Zap} color="purple" />
      </div>

      {/* WebSocket realtime bar */}
      {wsData && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(wsData.sensors || {}).map(([key, val]) => (
            <div key={key} className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2 text-sm">
              <span className="text-gray-400 capitalize text-xs">{key.replace(/_/g,' ')}</span>
              <span className="font-bold text-gray-800">{val}</span>
            </div>
          ))}
          {wsConnected && <Badge variant="success" dot className="self-center">WebSocket Live</Badge>}
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rooms.map((r) => {
            const acOn = r.ac === true || r.ac === 'on'
            const lightsOn = r.lights === true || r.lights === 'on'
            return (
              <Card key={r.id}>
                <CardContent className="pt-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                      <p className="text-xs text-gray-400">{r.floor}</p>
                    </div>
                    {r.co2_ppm && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${co2Color(r.co2_ppm)}`}>
                        CO₂ {r.co2_ppm} ppm
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2.5">
                      <Thermometer className="w-4 h-4 text-amber-500" />
                      <div>
                        <p className="text-[10px] text-gray-400">Suhu</p>
                        <p className="text-sm font-bold text-gray-800">{r.temp}°C</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2.5">
                      <Droplets className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="text-[10px] text-gray-400">Kelembaban</p>
                        <p className="text-sm font-bold text-gray-800">{r.humidity}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-2">
                    <div className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg border ${acOn ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                      <Wind className="w-3 h-3" /> AC {acOn ? 'ON' : 'OFF'}
                    </div>
                    <div className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg border ${lightsOn ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                      <Lightbulb className="w-3 h-3" /> Lampu {lightsOn ? 'ON' : 'OFF'}
                    </div>
                  </div>
                  {r.energy_kw && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Zap className="w-3 h-3 text-purple-400" />
                      <span>{r.energy_kw} kW</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {activeTab === 'hvac' && (
        <Card>
          <CardHeader><CardTitle>Monitoring Suhu per Area</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={tempData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[15, 32]} />
                <Tooltip formatter={(v) => `${v}°C`} />
                <Line dataKey="produksi" stroke="#f59e0b" strokeWidth={2} name="Produksi" dot={false} />
                <Line dataKey="office" stroke="#3b82f6" strokeWidth={2} name="Office" dot={false} />
                <Line dataKey="server" stroke="#10b981" strokeWidth={2} name="Server Room" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 'energy' && (
        <Card>
          <CardHeader><CardTitle>Konsumsi Energi Hari Ini (kWh)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={energyData}>
                <defs>
                  <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}:00`} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${v} kWh`} />
                <Area dataKey="kWh" stroke="#8b5cf6" fill="url(#energyGrad)" strokeWidth={2} name="Energi (kWh)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
