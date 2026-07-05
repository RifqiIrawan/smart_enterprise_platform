import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import StatCard from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import DataTable from '@/components/ui/DataTable'
import { Network, Wifi, AlertCircle, RefreshCw, Power, Activity } from 'lucide-react'
import { networkApi } from '@/api'
import { useApi } from '@/hooks/useApi'
import { useAuthStore } from '@/store/authStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'

const statusBadge = (s) => s === 'online'
  ? <Badge variant="success" dot>Online</Badge>
  : <Badge variant="danger" dot>Offline</Badge>

const deviceColumns = [
  { key: 'name', label: 'Nama Perangkat', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
  { key: 'type', label: 'Tipe', sortable: true },
  { key: 'ip', label: 'IP Address', render: (v) => <span className="font-mono text-xs text-blue-600">{v}</span> },
  { key: 'location', label: 'Lokasi', sortable: true },
  { key: 'uptime', label: 'Uptime' },
  {
    key: 'cpu_pct', label: 'CPU', sortable: true, render: (v) => (
      <div className="flex items-center gap-2 min-w-[70px]">
        <div className="w-12 bg-gray-100 rounded-full h-1.5">
          <div className={`h-1.5 rounded-full ${v > 80 ? 'bg-red-500' : v > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${v}%` }} />
        </div>
        <span className="text-xs">{v}%</span>
      </div>
    )
  },
  { key: 'bandwidth_mbps', label: 'Bandwidth', sortable: true, render: (v) => <span className="text-xs">{v} Mbps</span> },
  { key: 'status', label: 'Status', sortable: true, render: (v) => statusBadge(v) },
]

const pollColumns = [
  { key: 'name', label: 'Perangkat', render: (v) => <span className="font-medium">{v}</span> },
  { key: 'ip', label: 'IP', render: (v) => <span className="font-mono text-xs text-blue-600">{v}</span> },
  { key: 'cpu_pct', label: 'CPU %', render: (v) => (
    <span className={`font-semibold ${v > 80 ? 'text-red-500' : v > 50 ? 'text-amber-500' : 'text-emerald-600'}`}>{v}%</span>
  )},
  { key: 'bandwidth_mbps', label: 'BW (Mbps)', render: (v) => <span className="font-semibold">{v}</span> },
  { key: 'latency_ms', label: 'Latency', render: (v) => <span className="text-xs">{v} ms</span> },
  { key: 'packet_loss', label: 'Packet Loss', render: (v) => (
    <span className={`text-xs font-medium ${v > 5 ? 'text-red-500' : 'text-emerald-600'}`}>{v}%</span>
  )},
  { key: 'status', label: 'Status', render: (v) => statusBadge(v) },
]

const VALID_TABS = ['devices', 'traffic', 'snmp']
const SECTION_TITLE = { devices: 'Perangkat', traffic: 'Traffic', snmp: 'Live Poll (IOT-02)' }

export default function NetworkNOC() {
  const { tab } = useParams()
  const navigate = useNavigate()
  const activeTab = VALID_TABS.includes(tab) ? tab : 'devices'
  useEffect(() => {
    if (!VALID_TABS.includes(tab)) navigate('/network/devices', { replace: true })
  }, [tab])
  const { canDo } = useAuthStore()
  const canEdit = canDo('network.devices', 'edit')
  const [pollData, setPollData] = useState(null)
  const [polledAt, setPolledAt] = useState(null)
  const pollIntervalRef = useRef(null)
  const { data: statsRaw, refetch } = useApi(networkApi.getDevices)
  const { data: trafficRaw } = useApi(networkApi.getTraffic)
  const { data: wsData, connected: wsConnected } = useWebSocket()
  const stats = Array.isArray(statsRaw?.value) ? statsRaw.value : []
  const trafficData = Array.isArray(trafficRaw?.data) ? trafficRaw.data.slice(-12) : []

  const doPoll = async () => {
    try {
      const res = await networkApi.pollDevices()
      setPollData(res.data)
      setPolledAt(new Date())
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (activeTab === 'snmp') {
      doPoll()
      pollIntervalRef.current = setInterval(doPoll, 5000)
    }
    return () => clearInterval(pollIntervalRef.current)
  }, [activeTab])

  const handleToggle = async (id) => {
    try { await networkApi.toggleDevice(id); refetch(); toast.success('Status perangkat diubah') }
    catch { toast.error('Gagal mengubah status') }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-semibold text-slate-800">{SECTION_TITLE[activeTab]}</h1>
        <div className="flex gap-2 items-center">
          {wsConnected
            ? <Badge variant="success" dot>WebSocket Live</Badge>
            : <Badge variant="warning" dot>WS Offline</Badge>
          }
          <Button variant="secondary" size="sm" icon={<RefreshCw />} onClick={refetch}>Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Perangkat" value={String(statsRaw?.['@odata.count'] ?? stats.length)} icon={Network} color="blue" />
        <StatCard title="Online" value={String(pollData?.online ?? stats.filter(d => d.status === 'online').length)} icon={Wifi} color="emerald" />
        <StatCard title="Offline" value={String(pollData?.offline ?? stats.filter(d => d.status === 'offline').length)} icon={AlertCircle} color="red" />
        <StatCard title="Avg CPU" value={pollData ? `${pollData.avg_cpu?.toFixed(1)}%` : '—'} subtitle="dari last poll" icon={Activity} color="purple" />
      </div>

      {/* WebSocket realtime indicator */}
      {wsData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(wsData.sensors || {}).map(([key, val]) => (
            <div key={key} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
              <span className="font-semibold text-sm text-gray-800">{val}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'devices' && (
        <Card>
          <CardHeader><CardTitle>Monitoring Perangkat Jaringan</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              columns={deviceColumns}
              fetchFn={networkApi.getDevices}
              searchPlaceholder="Cari nama, IP, tipe, lokasi..."
              defaultPageSize={10}
              actions={(row) => canEdit && (
                <button onClick={() => handleToggle(row.id)}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors font-medium ${row.status === 'online' ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                  <Power className="w-3.5 h-3.5" />
                  {row.status === 'online' ? 'Disable' : 'Enable'}
                </button>
              )}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'traffic' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Traffic Jaringan 24 Jam (Mbps)</CardTitle>
              <Badge variant="success" dot>Live</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={trafficData.length > 0 ? trafficData : [
                { time: '00:00', in_mbps: 120, out_mbps: 80 }, { time: '04:00', in_mbps: 60, out_mbps: 40 },
                { time: '08:00', in_mbps: 340, out_mbps: 280 }, { time: '12:00', in_mbps: 480, out_mbps: 380 },
                { time: '16:00', in_mbps: 710, out_mbps: 590 }, { time: 'Now', in_mbps: 850, out_mbps: 680 },
              ]}>
                <defs>
                  <linearGradient id="inG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area dataKey="in_mbps" stroke="#3b82f6" fill="url(#inG)" strokeWidth={2} name="Inbound" />
                <Area dataKey="out_mbps" stroke="#10b981" fill="url(#outG)" strokeWidth={2} name="Outbound" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* IOT-02: Live SNMP-like polling */}
      {activeTab === 'snmp' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                Network Polling — Live (refresh 5s)
              </CardTitle>
              <div className="flex items-center gap-3">
                {polledAt && <span className="text-xs text-gray-400">Poll: {polledAt.toLocaleTimeString('id-ID')}</span>}
                <Badge variant="success" dot>Auto Poll</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {pollData ? (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500">Online</p>
                    <p className="text-2xl font-bold text-emerald-600">{pollData.online}</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500">Offline</p>
                    <p className="text-2xl font-bold text-red-500">{pollData.offline}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500">Avg BW</p>
                    <p className="text-2xl font-bold text-blue-600">{pollData.avg_bw?.toFixed(0)} Mbps</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {pollColumns.map(col => (
                          <th key={col.key} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{col.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(pollData.data) ? pollData.data : []).map(row => (
                        <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          {pollColumns.map(col => (
                            <td key={col.key} className="px-3 py-2.5">
                              {col.render ? col.render(row[col.key], row) : row[col.key]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Activity className="w-10 h-10 mx-auto mb-3 animate-pulse" />
                <p>Polling perangkat jaringan...</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
