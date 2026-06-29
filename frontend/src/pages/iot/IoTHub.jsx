import { useState, useEffect, useCallback, useRef } from 'react'
import { iotHubApi } from '@/api'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import {
  Cpu, Wifi, WifiOff, AlertTriangle, Activity, Bell, Plus, Trash2,
  Thermometer, Gauge, Zap, Droplets, Wind, Camera, MapPin, RefreshCw
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const DEVICE_ICONS = {
  temperature: Thermometer,
  vibration:   Activity,
  humidity:    Droplets,
  energy:      Zap,
  camera:      Camera,
  gps:         MapPin,
  pressure:    Gauge,
  air_quality: Wind,
}

const STATUS_STYLE = {
  online:  { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Online' },
  offline: { bg: 'bg-slate-100',   text: 'text-slate-500',   dot: 'bg-slate-400',   label: 'Offline' },
  warning: { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Warning' },
}

const SEVERITY_COLORS = {
  critical: 'bg-rose-100 text-rose-700',
  warning:  'bg-amber-100 text-amber-700',
}

function DeviceBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.offline
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse`} />
      {s.label}
    </span>
  )
}

function GaugeBar({ value, min, max, warn, crit, unit }) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
  const warnPct = ((warn - min) / (max - min)) * 100
  const color = value >= crit ? '#ef4444' : value >= warn ? '#f59e0b' : '#10b981'
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
        <span>{min}{unit}</span>
        <span className="font-bold text-sm" style={{ color }}>{value}{unit}</span>
        <span>{max}{unit}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface-3)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

const TABS = [
  { id: 'live',    label: 'Live Monitor', icon: Activity },
  { id: 'devices', label: 'Perangkat', icon: Cpu },
  { id: 'alerts',  label: 'Alert Rules', icon: Bell },
  { id: 'history', label: 'Riwayat Alert', icon: AlertTriangle },
]

const DEFAULT_DEVICE = { name: '', type: 'temperature', location: '', ip: '', protocol: 'MQTT', firmware: 'v1.0.0' }
const DEFAULT_RULE = { device_id: '', metric: 'temperature', operator: '>', threshold: '', severity: 'warning', action: 'notify' }

export default function IoTHub() {
  const [activeTab, setActiveTab] = useState('live')
  const [readings, setReadings] = useState(null)
  const [liveInterval, setLiveIntervalId] = useState(null)
  const [showDeviceModal, setShowDeviceModal] = useState(false)
  const [deviceForm, setDeviceForm] = useState(DEFAULT_DEVICE)
  const [editDevice, setEditDevice] = useState(null)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [ruleForm, setRuleForm] = useState(DEFAULT_RULE)
  const [submitting, setSubmitting] = useState(false)
  const devicesRef = useRef()
  const rulesRef = useRef()
  const histRef = useRef()

  const fetchReadings = useCallback(() => {
    iotHubApi.getReadings().then(r => setReadings(r?.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (activeTab === 'live') {
      fetchReadings()
      const id = setInterval(fetchReadings, 8000)
      setLiveIntervalId(id)
      return () => clearInterval(id)
    }
  }, [activeTab, fetchReadings])

  const devicesFetch = useCallback(p => iotHubApi.getDevices(p), [])
  const rulesFetch = useCallback(p => iotHubApi.getAlertRules(p), [])
  const histFetch = useCallback(p => iotHubApi.getAlertHistory(p), [])

  const handleSaveDevice = async () => {
    setSubmitting(true)
    try {
      if (editDevice) await iotHubApi.updateDevice(editDevice.id, deviceForm)
      else await iotHubApi.createDevice(deviceForm)
      setShowDeviceModal(false)
      setDeviceForm(DEFAULT_DEVICE)
      setEditDevice(null)
      devicesRef.current?.refetch()
    } catch (e) { console.error(e) }
    finally { setSubmitting(false) }
  }

  const handleDeleteDevice = async (row) => {
    if (!confirm(`Hapus device "${row.name}"?`)) return
    await iotHubApi.deleteDevice(row.id)
    devicesRef.current?.refetch()
  }

  const handleSaveRule = async () => {
    setSubmitting(true)
    try {
      await iotHubApi.createAlertRule({ ...ruleForm, threshold: Number(ruleForm.threshold) })
      setShowRuleModal(false)
      setRuleForm(DEFAULT_RULE)
      rulesRef.current?.refetch()
    } catch (e) { console.error(e) }
    finally { setSubmitting(false) }
  }

  const sensors = readings?.sensors || []

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>IoT Hub</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Manajemen perangkat IoT & monitoring real-time</p>
        </div>
        {activeTab === 'live' && (
          <button onClick={fetchReadings}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all hover:bg-slate-50"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        )}
        {activeTab === 'devices' && (
          <button onClick={() => { setEditDevice(null); setDeviceForm(DEFAULT_DEVICE); setShowDeviceModal(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-all shadow-md shadow-indigo-200">
            <Plus className="w-4 h-4" />
            Tambah Device
          </button>
        )}
        {activeTab === 'alerts' && (
          <button onClick={() => setShowRuleModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-all">
            <Bell className="w-4 h-4" />
            Tambah Rule
          </button>
        )}
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

      {/* Live Monitor */}
      {activeTab === 'live' && readings && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live — diperbarui otomatis setiap 8 detik · {readings.timestamp}
          </div>

          {/* Sensor gauge cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sensors.map(s => {
              const Icon = DEVICE_ICONS[s.type] || Cpu
              const isWarn = s.status === 'warning'
              const isCrit = s.status === 'critical'
              return (
                <Card key={s.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isWarn || isCrit ? 'bg-amber-100' : 'bg-indigo-100'}`}>
                        <Icon className={`w-4 h-4 ${isWarn || isCrit ? 'text-amber-600' : 'text-indigo-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                        {(isWarn || isCrit) && (
                          <p className="text-xs text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Melebihi threshold
                          </p>
                        )}
                      </div>
                    </div>
                    <GaugeBar
                      value={parseFloat(s.value.toFixed(1))}
                      min={s.min} max={s.max}
                      warn={s.threshold_warning}
                      crit={s.threshold_critical}
                      unit={s.unit}
                    />
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Trend chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-500" />
                Tren Sensor 1 Jam Terakhir
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={readings.trend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="temp" name="Suhu (°C)" stroke="#ef4444" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="vibration" name="Getaran (mm/s)" stroke="#f59e0b" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="pressure" name="Tekanan (bar)" stroke="#6366f1" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Devices */}
      {activeTab === 'devices' && (
        <DataTable
          ref={devicesRef}
          fetchFn={devicesFetch}
          columns={[
            { key: 'id', label: 'ID', render: v => <span className="font-mono text-xs">{v}</span> },
            { key: 'name', label: 'Nama Device' },
            { key: 'type', label: 'Tipe', render: v => {
              const Icon = DEVICE_ICONS[v] || Cpu
              return <span className="flex items-center gap-1.5"><Icon className="w-3.5 h-3.5 text-indigo-500" />{v}</span>
            }},
            { key: 'location', label: 'Lokasi' },
            { key: 'protocol', label: 'Protokol', render: v => <span className="font-mono text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">{v}</span> },
            { key: 'ip', label: 'IP', render: v => <span className="font-mono text-xs">{v}</span> },
            { key: 'firmware', label: 'Firmware', render: v => <span className="font-mono text-xs text-slate-500">{v}</span> },
            { key: 'battery', label: 'Baterai', render: v => v === -1 ? <span className="text-slate-400 text-xs">AC</span> : <span className={v < 20 ? 'text-rose-500 font-semibold' : v < 50 ? 'text-amber-500' : 'text-emerald-600'}>{v}%</span> },
            { key: 'status', label: 'Status', render: v => <DeviceBadge status={v} /> },
            { key: 'last_seen', label: 'Last Seen', render: v => <span className="text-xs">{v}</span> },
          ]}
          actions={(row) => (
            <div className="flex items-center gap-1 justify-end">
              <button onClick={() => { setEditDevice(row); setDeviceForm({ name: row.name, type: row.type, location: row.location, ip: row.ip, protocol: row.protocol, firmware: row.firmware }); setShowDeviceModal(true) }}
                className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-xs font-medium transition-all">
                Edit
              </button>
              <button onClick={() => handleDeleteDevice(row)}
                className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-medium transition-all">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
          searchable
        />
      )}

      {/* Alert Rules */}
      {activeTab === 'alerts' && (
        <DataTable
          ref={rulesRef}
          fetchFn={rulesFetch}
          columns={[
            { key: 'device_name', label: 'Device' },
            { key: 'metric', label: 'Metrik' },
            { key: 'operator', label: 'Op', render: v => <span className="font-mono font-bold">{v}</span> },
            { key: 'threshold', label: 'Threshold' },
            { key: 'severity', label: 'Severity', render: v => <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[v] || 'bg-slate-100 text-slate-600'}`}>{v}</span> },
            { key: 'action', label: 'Aksi', render: v => <span className="font-mono text-xs">{v}</span> },
            { key: 'trigger_count', label: 'Trigger', render: v => <span className={`font-semibold ${v > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{v}×</span> },
            { key: 'enabled', label: 'Aktif', render: v => <span className={`text-xs font-semibold ${v ? 'text-emerald-600' : 'text-slate-400'}`}>{v ? 'Ya' : 'Tidak'}</span> },
          ]}
          actions={(row) => (
            <button onClick={() => iotHubApi.deleteAlertRule(row.id).then(() => rulesRef.current?.refetch())}
              className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-medium transition-all">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        />
      )}

      {/* Alert History */}
      {activeTab === 'history' && (
        <DataTable
          ref={histRef}
          fetchFn={histFetch}
          columns={[
            { key: 'id', label: 'ID', render: v => <span className="font-mono text-xs">{v}</span> },
            { key: 'device', label: 'Device' },
            { key: 'metric', label: 'Metrik' },
            { key: 'value', label: 'Nilai', render: v => <span className="font-semibold text-amber-600">{v}</span> },
            { key: 'threshold', label: 'Threshold' },
            { key: 'severity', label: 'Severity', render: v => <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[v] || 'bg-slate-100 text-slate-600'}`}>{v}</span> },
            { key: 'timestamp', label: 'Waktu' },
            { key: 'duration', label: 'Durasi' },
            { key: 'resolved', label: 'Resolved', render: v => v
              ? <span className="flex items-center gap-1 text-emerald-600 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Ya</span>
              : <span className="flex items-center gap-1 text-amber-600 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />Aktif</span>
            },
          ]}
          searchable
        />
      )}

      {/* Device Modal */}
      <Modal
        open={showDeviceModal}
        onClose={() => { setShowDeviceModal(false); setDeviceForm(DEFAULT_DEVICE); setEditDevice(null) }}
        title={editDevice ? `Edit Device: ${editDevice.id}` : 'Tambah Perangkat IoT'}
        footer={
          <>
            <button onClick={() => { setShowDeviceModal(false); setDeviceForm(DEFAULT_DEVICE); setEditDevice(null) }}
              className="px-4 py-2 rounded-xl border text-sm font-medium hover:bg-slate-50 transition-all"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
              Batal
            </button>
            <button onClick={handleSaveDevice} disabled={submitting}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-all">
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Nama Device" value={deviceForm.name} onChange={e => setDeviceForm(f => ({...f, name: e.target.value}))} placeholder="cth: Sensor Suhu Mesin B1" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>Tipe Sensor</label>
            <select value={deviceForm.type} onChange={e => setDeviceForm(f => ({...f, type: e.target.value}))}
              className="w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}>
              {['temperature','vibration','humidity','energy','camera','gps','pressure','air_quality'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>Protokol</label>
            <select value={deviceForm.protocol} onChange={e => setDeviceForm(f => ({...f, protocol: e.target.value}))}
              className="w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}>
              {['MQTT','Modbus','Zigbee','RTSP','LTE','WiFi','BLE'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <Input label="Lokasi" value={deviceForm.location} onChange={e => setDeviceForm(f => ({...f, location: e.target.value}))} placeholder="cth: Lantai Produksi 2" />
          </div>
          <div>
            <Input label="IP Address" value={deviceForm.ip} onChange={e => setDeviceForm(f => ({...f, ip: e.target.value}))} placeholder="cth: 192.168.10.15" />
          </div>
          <div>
            <Input label="Firmware" value={deviceForm.firmware} onChange={e => setDeviceForm(f => ({...f, firmware: e.target.value}))} placeholder="cth: v2.3.1" />
          </div>
        </div>
      </Modal>

      {/* Alert Rule Modal */}
      <Modal
        open={showRuleModal}
        onClose={() => { setShowRuleModal(false); setRuleForm(DEFAULT_RULE) }}
        title="Tambah Alert Rule"
        footer={
          <>
            <button onClick={() => { setShowRuleModal(false); setRuleForm(DEFAULT_RULE) }}
              className="px-4 py-2 rounded-xl border text-sm font-medium hover:bg-slate-50 transition-all"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
              Batal
            </button>
            <button onClick={handleSaveRule} disabled={submitting}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium transition-all">
              {submitting ? 'Menyimpan...' : 'Simpan Rule'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Device ID" value={ruleForm.device_id} onChange={e => setRuleForm(f => ({...f, device_id: e.target.value}))} placeholder="cth: DEV-001" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>Metrik</label>
            <select value={ruleForm.metric} onChange={e => setRuleForm(f => ({...f, metric: e.target.value}))}
              className="w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}>
              {['temperature','vibration','humidity','energy','pressure'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>Operator</label>
            <select value={ruleForm.operator} onChange={e => setRuleForm(f => ({...f, operator: e.target.value}))}
              className="w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}>
              {['>','<','>=','<=','=='].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <Input label="Threshold" type="number" value={ruleForm.threshold} onChange={e => setRuleForm(f => ({...f, threshold: e.target.value}))} placeholder="cth: 85" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>Severity</label>
            <select value={ruleForm.severity} onChange={e => setRuleForm(f => ({...f, severity: e.target.value}))}
              className="w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>Aksi Notifikasi</label>
            <select value={ruleForm.action} onChange={e => setRuleForm(f => ({...f, action: e.target.value}))}
              className="w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}>
              <option value="notify">Notifikasi saja</option>
              <option value="notify+email">Notifikasi + Email</option>
              <option value="notify+shutdown">Notifikasi + Matikan Mesin</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}
