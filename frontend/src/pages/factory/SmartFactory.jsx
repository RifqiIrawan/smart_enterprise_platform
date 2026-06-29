import { useCallback, useRef, useState, useEffect } from 'react'
import StatCard from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DataTable from '@/components/ui/DataTable'
import Tabs from '@/components/ui/Tabs'
import {
  Factory, AlertTriangle, Clock, Plus, Activity, Pencil, Wrench, List,
  BarChart2, Target, TrendingDown, TrendingUp, CheckCircle, XCircle,
  ChevronRight, Gauge, Layers, RotateCcw, Download, Settings,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, LineChart, Line,
} from 'recharts'
import { factoryApi } from '@/api'
import { useApi, useSubmit } from '@/hooks/useApi'
import toast from 'react-hot-toast'

const oeeData = [
  { time: '06:00', oee: 82 }, { time: '08:00', oee: 88 }, { time: '10:00', oee: 91 },
  { time: '12:00', oee: 87 }, { time: '14:00', oee: 89 }, { time: '16:00', oee: 93 }, { time: 'Now', oee: 90 },
]

const statusBadge = (s) => ({
  running: <Badge variant="success" dot>Running</Badge>,
  idle: <Badge variant="default" dot>Idle</Badge>,
  maintenance: <Badge variant="warning" dot>Maintenance</Badge>,
  stopped: <Badge variant="danger" dot>Stopped</Badge>,
  done: <Badge variant="primary" dot>Selesai</Badge>,
  pending: <Badge variant="default" dot>Pending</Badge>,
  breakdown: <Badge variant="danger">Breakdown</Badge>,
  planned: <Badge variant="info">Planned</Badge>,
})[s] || <Badge>{s}</Badge>

const emptyWO = { wo_number: '', product_name: '', target_qty: '', machine_id: '', eta: '' }
const emptyMachine = { machine_code: '', name: '', location: '', status: 'idle' }
const emptyBOM = { product_name: '', material_id: '', material_name: '', quantity: '', unit: 'pcs' }
const emptyDowntime = { machine_id: '', reason: '', category: 'breakdown', notes: '' }
const emptyQtyUpdate = { actual_qty: '', status: 'running' }

const woColumns = [
  { key: 'wo_number', label: 'No. WO', sortable: true, render: (v) => <span className="font-mono text-blue-600 font-medium text-xs">{v}</span> },
  { key: 'product_name', label: 'Produk', sortable: true, render: (v) => <span className="font-medium text-sm">{v}</span> },
  { key: 'machine_id', label: 'Mesin' },
  { key: 'target_qty', label: 'Target', sortable: true },
  { key: 'actual_qty', label: 'Aktual', sortable: true },
  {
    key: 'actual_qty', label: 'Progress', render: (v, row) => {
      const pct = row.target_qty > 0 ? Math.min(100, Math.round(((v || 0) / row.target_qty) * 100)) : 0
      return (
        <div className="flex items-center gap-2 min-w-[90px]">
          <div className="w-16 bg-gray-100 rounded-full h-1.5 flex-shrink-0">
            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-gray-500">{pct}%</span>
        </div>
      )
    }
  },
  { key: 'status', label: 'Status', sortable: true, render: (v) => statusBadge(v) },
]

const machineColumns = [
  { key: 'machine_code', label: 'Kode', sortable: true, render: (v) => <span className="font-mono text-blue-600 font-semibold text-xs">{v}</span> },
  { key: 'name', label: 'Nama Mesin', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
  { key: 'location', label: 'Lokasi' },
  { key: 'oee', label: 'OEE', render: (v) => v ? <span className="font-semibold">{v}%</span> : <span className="text-gray-400">—</span> },
  { key: 'status', label: 'Status', render: (v) => statusBadge(v) },
]

const bomColumns = [
  { key: 'product_name', label: 'Produk', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
  { key: 'material_name', label: 'Material', sortable: true },
  { key: 'quantity', label: 'Qty per Unit', render: (v) => <span className="font-semibold">{v}</span> },
  { key: 'unit', label: 'Satuan' },
]

const downtimeColumns = [
  { key: 'machine_code', label: 'Kode Mesin', render: (v) => <span className="font-mono text-xs text-blue-600 font-semibold">{v}</span> },
  { key: 'machine_name', label: 'Mesin', render: (v) => <span className="font-medium">{v}</span> },
  { key: 'reason', label: 'Penyebab', sortable: true },
  { key: 'category', label: 'Kategori', render: (v) => statusBadge(v) },
  { key: 'duration_min', label: 'Durasi (mnt)', sortable: true, render: (v) => <span className="font-semibold">{v}</span> },
]

export default function SmartFactory() {
  const [activeTab, setActiveTab] = useState('overview')
  const [showModal, setShowModal] = useState(false)
  const [showMachineModal, setShowMachineModal] = useState(false)
  const [showBOMModal, setShowBOMModal] = useState(false)
  const [showDowntimeModal, setShowDowntimeModal] = useState(false)
  const [editMachine, setEditMachine] = useState(null)
  const [qtyUpdateWO, setQtyUpdateWO] = useState(null)
  const [form, setForm] = useState(emptyWO)
  const [machineForm, setMachineForm] = useState(emptyMachine)
  const [bomForm, setBOMForm] = useState(emptyBOM)
  const [downtimeForm, setDowntimeForm] = useState(emptyDowntime)
  const [qtyForm, setQtyForm] = useState(emptyQtyUpdate)
  const woRef = useRef(null)
  const machineRef = useRef(null)
  const bomRef = useRef(null)
  const downtimeRef = useRef(null)
  const wcRef = useRef(null)
  const routingRef = useRef(null)
  const scrapRef = useRef(null)

  const [showWCModal, setShowWCModal] = useState(false)
  const [editWC, setEditWC] = useState(null)
  const [wcForm, setWCForm] = useState({ code: '', name: '', type: 'machine', capacity: '', efficiency: '' })
  const [showRoutingModal, setShowRoutingModal] = useState(false)
  const [routingForm, setRoutingForm] = useState({ product_code: '', product_name: '' })
  const [showScrapModal, setShowScrapModal] = useState(false)
  const [scrapForm, setScrapForm] = useState({ wo_number: '', product_name: '', type: 'scrap', qty: '', reason: '', work_center: '', cost: '' })
  const [oeePeriod, setOeePeriod] = useState('month')
  const [reportPeriod, setReportPeriod] = useState('month')
  const [capacityMonth, setCapacityMonth] = useState(new Date().toISOString().slice(0, 7))
  const [oeeData2, setOeeData2] = useState(null)
  const [reportData, setReportData] = useState(null)
  const [capacityData, setCapacityData] = useState(null)
  const [loadingOee, setLoadingOee] = useState(false)
  const [loadingReport, setLoadingReport] = useState(false)
  const [loadingCapacity, setLoadingCapacity] = useState(false)

  const { data: statsRaw } = useApi(factoryApi.getWorkOrders)
  const { data: machinesData } = useApi(factoryApi.getMachines)
  const stats = Array.isArray(statsRaw?.value) ? statsRaw.value : []
  const machineList = Array.isArray(machinesData?.value) ? machinesData.value : []

  const { submit: submitWO, loading: savingWO } = useSubmit(factoryApi.createWorkOrder, {
    successMsg: 'Work Order berhasil dibuat',
    onSuccess: () => { setShowModal(false); setForm(emptyWO); woRef.current?.refetch() },
  })
  const { submit: submitMachine, loading: savingMachine } = useSubmit(factoryApi.createMachine, {
    successMsg: 'Mesin berhasil ditambahkan',
    onSuccess: () => { setShowMachineModal(false); setMachineForm(emptyMachine); machineRef.current?.refetch() },
  })
  const { submit: updateMachineFn, loading: updatingMachine } = useSubmit(
    (data) => factoryApi.updateMachine(editMachine?.id, data),
    {
      successMsg: 'Data mesin diperbarui',
      onSuccess: () => { setEditMachine(null); machineRef.current?.refetch() },
    }
  )
  const { submit: submitBOM, loading: savingBOM } = useSubmit(factoryApi.createBOM, {
    successMsg: 'BOM berhasil ditambahkan',
    onSuccess: () => { setShowBOMModal(false); setBOMForm(emptyBOM); bomRef.current?.refetch() },
  })
  const { submit: submitDowntime, loading: savingDowntime } = useSubmit(factoryApi.createDowntime, {
    successMsg: 'Downtime berhasil dicatat',
    onSuccess: () => { setShowDowntimeModal(false); setDowntimeForm(emptyDowntime); downtimeRef.current?.refetch() },
  })
  const { submit: updateQty, loading: savingQty } = useSubmit(
    (data) => factoryApi.updateWorkOrderQty(qtyUpdateWO?.id, data),
    {
      successMsg: 'Qty work order diperbarui',
      onSuccess: () => { setQtyUpdateWO(null); woRef.current?.refetch() },
    }
  )

  const { submit: submitWC, loading: savingWC } = useSubmit(factoryApi.createWorkCenter, {
    successMsg: 'Work Center berhasil ditambahkan',
    onSuccess: () => { setShowWCModal(false); setWCForm({ code: '', name: '', type: 'machine', capacity: '', efficiency: '' }); wcRef.current?.refetch() },
  })
  const { submit: updateWCFn, loading: updatingWC } = useSubmit(
    (data) => factoryApi.updateWorkCenter(editWC?.id, data),
    { successMsg: 'Work Center diperbarui', onSuccess: () => { setEditWC(null); wcRef.current?.refetch() } }
  )
  const { submit: submitScrap, loading: savingScrap } = useSubmit(factoryApi.createScrapRework, {
    successMsg: 'Data scrap/rework berhasil dicatat',
    onSuccess: () => { setShowScrapModal(false); setScrapForm({ wo_number: '', product_name: '', type: 'scrap', qty: '', reason: '', work_center: '', cost: '' }); scrapRef.current?.refetch() },
  })
  const { submit: submitRouting, loading: savingRouting } = useSubmit(factoryApi.createProductRouting, {
    successMsg: 'Routing berhasil ditambahkan',
    onSuccess: () => { setShowRoutingModal(false); setRoutingForm({ product_code: '', product_name: '' }); routingRef.current?.refetch() },
  })

  useEffect(() => {
    if (activeTab !== 'oee') return
    setLoadingOee(true)
    factoryApi.getOEEReal(oeePeriod)
      .then(r => setOeeData2(r.data ?? r))
      .finally(() => setLoadingOee(false))
  }, [activeTab, oeePeriod])

  useEffect(() => {
    if (activeTab !== 'report') return
    setLoadingReport(true)
    factoryApi.getProductionReport(reportPeriod)
      .then(r => setReportData(r.data ?? r))
      .finally(() => setLoadingReport(false))
  }, [activeTab, reportPeriod])

  useEffect(() => {
    if (activeTab !== 'capacity') return
    setLoadingCapacity(true)
    factoryApi.getCapacityPlan(capacityMonth)
      .then(r => setCapacityData(r.data ?? r))
      .finally(() => setLoadingCapacity(false))
  }, [activeTab, capacityMonth])

  const openEditMachine = (row) => {
    setEditMachine(row)
    setMachineForm({ machine_code: row.machine_code, name: row.name, location: row.location, status: row.status })
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'workorder', label: 'Work Order' },
    { id: 'machines', label: 'Mesin' },
    { id: 'bom', label: 'BOM' },
    { id: 'downtime', label: 'Downtime' },
    { id: 'workcenters', label: 'Work Center' },
    { id: 'routing', label: 'Routing' },
    { id: 'oee', label: 'OEE Real' },
    { id: 'scrap', label: 'Scrap/Rework' },
    { id: 'capacity', label: 'Kapasitas' },
    { id: 'report', label: 'Laporan' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
        <div className="flex gap-2">
          {activeTab === 'workorder' && <Button icon={<Plus />} size="sm" onClick={() => setShowModal(true)}>Work Order Baru</Button>}
          {activeTab === 'machines' && <Button icon={<Plus />} size="sm" onClick={() => { setEditMachine(null); setMachineForm(emptyMachine); setShowMachineModal(true) }}>Tambah Mesin</Button>}
          {activeTab === 'bom' && <Button icon={<Plus />} size="sm" onClick={() => setShowBOMModal(true)}>Tambah BOM</Button>}
          {activeTab === 'downtime' && <Button icon={<Plus />} size="sm" onClick={() => setShowDowntimeModal(true)}>Catat Downtime</Button>}
          {activeTab === 'workcenters' && <Button icon={<Plus />} size="sm" onClick={() => setShowWCModal(true)}>Tambah Work Center</Button>}
          {activeTab === 'routing' && <Button icon={<Plus />} size="sm" onClick={() => setShowRoutingModal(true)}>Tambah Routing</Button>}
          {activeTab === 'scrap' && <Button icon={<Plus />} size="sm" onClick={() => setShowScrapModal(true)}>Catat Scrap/Rework</Button>}
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="OEE Rata-rata" value="89.4%" trend={1.2} icon={Activity} color="blue" />
            <StatCard title="WO Aktif" value={String(stats.filter(w => w.status === 'running').length)} subtitle="sedang berjalan" icon={Clock} color="amber" />
            <StatCard title="Mesin Running" value={String(machineList.filter(m => m.status === 'running').length) + '/' + String(machineList.length || 6)} icon={Factory} color="emerald" />
            <StatCard title="Reject Rate" value="1.8%" trend={-0.3} icon={AlertTriangle} color="red" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>OEE Real-time</CardTitle>
                  <Badge variant="success" dot>Live</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={oeeData}>
                    <defs>
                      <linearGradient id="oeeG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[60, 100]} />
                    <Tooltip />
                    <Area dataKey="oee" stroke="#3b82f6" fill="url(#oeeG)" strokeWidth={2} name="OEE %" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Status Mesin</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {(machineList.length > 0 ? machineList : [
                    { machine_code: 'CNC-01', name: 'CNC Turning 01', status: 'running', oee: 87.5 },
                    { machine_code: 'CNC-02', name: 'CNC Milling 02', status: 'idle', oee: 72.3 },
                    { machine_code: 'AS-01', name: 'Assembly Station 01', status: 'running', oee: 91.2 },
                    { machine_code: 'AS-02', name: 'Assembly Station 02', status: 'maintenance', oee: 0 },
                  ]).slice(0, 6).map((m) => (
                    <div key={m.machine_code} className="p-3 border border-gray-100 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-700">{m.machine_code}</span>
                        {statusBadge(m.status)}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{m.name}</p>
                      {m.status === 'running' && (
                        <>
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>OEE</span><span className="font-medium">{m.oee}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${m.oee}%` }} />
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {activeTab === 'workorder' && (
        <Card>
          <CardHeader><CardTitle>Daftar Work Order</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              ref={woRef}
              columns={woColumns}
              fetchFn={factoryApi.getWorkOrders}
              searchPlaceholder="Cari nomor WO, produk..."
              defaultPageSize={10}
              toolbar={<Button size="sm" icon={<Plus />} onClick={() => setShowModal(true)}>Tambah WO</Button>}
              actions={(row) => (
                <button
                  onClick={() => { setQtyUpdateWO(row); setQtyForm({ actual_qty: String(row.actual_qty || 0), status: row.status }) }}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-blue-600 hover:bg-blue-50 transition-colors font-medium"
                >
                  <Pencil className="w-3.5 h-3.5" /> Update Qty
                </button>
              )}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'machines' && (
        <Card>
          <CardHeader><CardTitle>Master Mesin</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              ref={machineRef}
              columns={machineColumns}
              fetchFn={factoryApi.getMachines}
              searchPlaceholder="Cari kode, nama mesin..."
              defaultPageSize={10}
              toolbar={<Button size="sm" icon={<Plus />} onClick={() => { setEditMachine(null); setMachineForm(emptyMachine); setShowMachineModal(true) }}>Tambah Mesin</Button>}
              actions={(row) => (
                <div className="flex gap-1">
                  <button onClick={() => openEditMachine(row)}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-blue-600 hover:bg-blue-50 transition-colors font-medium">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => { setShowDowntimeModal(true); setDowntimeForm({ ...emptyDowntime, machine_id: row.id }) }}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-amber-600 hover:bg-amber-50 transition-colors font-medium">
                    <Wrench className="w-3.5 h-3.5" /> Downtime
                  </button>
                </div>
              )}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'bom' && (
        <Card>
          <CardHeader><CardTitle>Bill of Materials (BOM)</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              ref={bomRef}
              columns={bomColumns}
              fetchFn={factoryApi.getBOM}
              searchPlaceholder="Cari produk, material..."
              defaultPageSize={10}
              toolbar={<Button size="sm" icon={<Plus />} onClick={() => setShowBOMModal(true)}>Tambah BOM</Button>}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'downtime' && (
        <Card>
          <CardHeader><CardTitle>Log Downtime</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              ref={downtimeRef}
              columns={downtimeColumns}
              fetchFn={factoryApi.getDowntime}
              searchPlaceholder="Cari mesin, penyebab..."
              defaultPageSize={10}
              toolbar={<Button size="sm" icon={<Plus />} onClick={() => setShowDowntimeModal(true)}>Catat Downtime</Button>}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Tab: Work Centers ── */}
      {activeTab === 'workcenters' && (
        <Card>
          <CardHeader><CardTitle>Master Work Center / Stasiun Kerja</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              ref={wcRef}
              fetchFn={factoryApi.getWorkCenters}
              searchPlaceholder="Cari work center..."
              columns={[
                { key: 'code', header: 'Kode', render: v => <span className="font-mono text-blue-600 text-xs font-medium">{v}</span> },
                { key: 'name', header: 'Nama', render: v => <span className="font-medium">{v}</span> },
                { key: 'type', header: 'Tipe', render: v => <Badge variant="secondary">{v}</Badge> },
                { key: 'capacity', header: 'Kapasitas (mnt/hari)', render: v => `${v} mnt` },
                { key: 'efficiency', header: 'Efisiensi', render: v => (
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full">
                      <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${v}%` }} />
                    </div>
                    <span className="text-xs">{v}%</span>
                  </div>
                )},
                { key: 'machines', header: 'Mesin', render: v => <span className="font-medium">{v}</span> },
                { key: 'operators', header: 'Operator', render: v => <span className="font-medium">{v}</span> },
                { key: 'status', header: 'Status', render: v => statusBadge(v) },
              ]}
              actions={(row) => (
                <div className="flex gap-1">
                  <Button size="xs" variant="ghost" onClick={() => { setEditWC(row); setWCForm({ code: row.code, name: row.name, type: row.type, capacity: row.capacity, efficiency: row.efficiency }); setShowWCModal(true) }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="xs" variant="ghost" className="text-red-500" onClick={async () => { await factoryApi.deleteWorkCenter(row.id); toast.success('Work Center dihapus'); wcRef.current?.refetch() }}>
                    <XCircle className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Tab: Routing ── */}
      {activeTab === 'routing' && (
        <div className="space-y-4">
          <DataTable
            ref={routingRef}
            fetchFn={factoryApi.getProductRoutings}
            searchPlaceholder="Cari produk, kode..."
            columns={[
              { key: 'product_code', header: 'Kode Produk', render: v => <span className="font-mono text-blue-600 text-xs font-medium">{v}</span> },
              { key: 'product_name', header: 'Produk', render: v => <span className="font-medium">{v}</span> },
              { key: 'total_steps', header: 'Jumlah Step', render: v => <Badge variant="primary">{v} step</Badge> },
              {
                key: 'steps', header: 'Alur Proses', render: (steps) => (
                  <div className="flex items-center gap-1 flex-wrap">
                    {(steps || []).map((s, i) => (
                      <span key={i} className="flex items-center gap-1 text-xs">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600">{s.operation}</span>
                        {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-slate-400" />}
                      </span>
                    ))}
                  </div>
                )
              },
            ]}
            actions={(row) => (
              <Button size="xs" variant="ghost" className="text-red-500" onClick={async () => { await factoryApi.deleteProductRouting(row.id); toast.success('Routing dihapus'); routingRef.current?.refetch() }}>
                <XCircle className="w-3.5 h-3.5" />
              </Button>
            )}
          />
        </div>
      )}

      {/* ── Tab: OEE Real ── */}
      {activeTab === 'oee' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Periode:</span>
            {['week', 'month', 'year'].map(p => (
              <button key={p} onClick={() => setOeePeriod(p)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${oeePeriod === p ? 'bg-primary text-primary-foreground border-primary' : 'border-slate-200 text-slate-600 hover:border-primary'}`}>
                {p === 'week' ? 'Minggu' : p === 'month' ? 'Bulan' : 'Tahun'}
              </button>
            ))}
          </div>

          {loadingOee ? <div className="py-20 text-center text-sm text-muted-foreground">Memuat data OEE...</div> : oeeData2 && (
            <>
              {/* Gauge cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'OEE Keseluruhan', value: oeeData2.overall_oee, target: oeeData2.target_oee, color: oeeData2.overall_oee >= oeeData2.target_oee ? 'text-green-600' : 'text-amber-600' },
                  { label: 'Availability', value: oeeData2.availability, color: 'text-blue-600' },
                  { label: 'Performance', value: oeeData2.performance, color: 'text-purple-600' },
                  { label: 'Quality', value: oeeData2.quality, color: 'text-green-600' },
                ].map(({ label, value, target, color }) => (
                  <Card key={label}>
                    <CardContent className="pt-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{label}</p>
                      <p className={`text-3xl font-bold ${color}`}>{value}<span className="text-base font-normal">%</span></p>
                      {target && <p className="text-xs text-muted-foreground mt-1">Target: {target}%</p>}
                      <div className="mt-2 h-1.5 bg-slate-100 rounded-full">
                        <div className="h-1.5 rounded-full bg-current transition-all" style={{ width: `${value}%`, color: undefined, backgroundColor: color.replace('text-', '').includes('green') ? '#16a34a' : color.includes('blue') ? '#2563eb' : color.includes('purple') ? '#9333ea' : '#d97706' }} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Trend chart */}
              <Card>
                <CardHeader><CardTitle>Tren OEE 6 Bulan Terakhir</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={oeeData2.trend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="oee" stroke="#6366f1" strokeWidth={2} name="OEE" dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="availability" stroke="#3b82f6" strokeWidth={1.5} name="Availability" strokeDasharray="4 2" />
                      <Line type="monotone" dataKey="performance" stroke="#8b5cf6" strokeWidth={1.5} name="Performance" strokeDasharray="4 2" />
                      <Line type="monotone" dataKey="quality" stroke="#22c55e" strokeWidth={1.5} name="Quality" strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* OEE per Work Center */}
                <Card>
                  <CardHeader><CardTitle>OEE per Work Center</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(oeeData2.by_work_center || []).map(wc => (
                        <div key={wc.work_center}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium">{wc.work_center}</span>
                            <span className={wc.oee >= 85 ? 'text-green-600 font-semibold' : wc.oee >= 75 ? 'text-amber-600 font-semibold' : 'text-red-600 font-semibold'}>{wc.oee}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full">
                            <div className="h-2 rounded-full" style={{ width: `${wc.oee}%`, backgroundColor: wc.oee >= 85 ? '#22c55e' : wc.oee >= 75 ? '#f59e0b' : '#ef4444' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Downtime by Category */}
                <Card>
                  <CardHeader><CardTitle>Downtime per Kategori</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={oeeData2.downtime_by_category || []} dataKey="minutes" nameKey="category" cx="50%" cy="50%" outerRadius={75} label={({ category, pct }) => `${pct}%`}>
                          {(oeeData2.downtime_by_category || []).map((_, i) => (
                            <Cell key={i} fill={['#6366f1','#f59e0b','#3b82f6','#ef4444','#22c55e'][i % 5]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => `${v} mnt`} />
                        <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tab: Scrap/Rework ── */}
      {activeTab === 'scrap' && (
        <Card>
          <CardHeader><CardTitle>Catatan Scrap & Rework</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              ref={scrapRef}
              fetchFn={factoryApi.getScrapRework}
              searchPlaceholder="Cari WO, produk, alasan..."
              columns={[
                { key: 'date', header: 'Tanggal', render: v => <span className="text-xs text-muted-foreground">{v}</span> },
                { key: 'wo_number', header: 'No. WO', render: v => <span className="font-mono text-blue-600 text-xs">{v}</span> },
                { key: 'product_name', header: 'Produk', render: v => <span className="font-medium text-sm">{v}</span> },
                { key: 'type', header: 'Tipe', render: v => <Badge variant={v === 'scrap' ? 'danger' : 'warning'}>{v === 'scrap' ? 'Scrap' : 'Rework'}</Badge> },
                { key: 'qty', header: 'Qty', render: v => <span className="font-semibold">{v}</span> },
                { key: 'work_center', header: 'Work Center', render: v => <Badge variant="secondary">{v}</Badge> },
                { key: 'reason', header: 'Penyebab' },
                { key: 'cost', header: 'Kerugian (Rp)', render: v => v ? `Rp ${Number(v).toLocaleString('id')}` : '—' },
              ]}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Tab: Kapasitas ── */}
      {activeTab === 'capacity' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Bulan:</span>
            <Input type="month" value={capacityMonth} onChange={e => setCapacityMonth(e.target.value)} className="w-40 h-8 text-sm" />
          </div>

          {loadingCapacity ? <div className="py-20 text-center text-sm text-muted-foreground">Memuat data...</div> : capacityData && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Kapasitas', value: `${(capacityData.summary?.total_capacity / 60).toFixed(0)} jam` },
                  { label: 'Total Digunakan', value: `${(capacityData.summary?.total_used / 60).toFixed(0)} jam` },
                  { label: 'Utilisasi', value: `${capacityData.summary?.utilization}%` },
                  { label: 'Over Capacity', value: capacityData.summary?.over_capacity > 0 ? `${capacityData.summary.over_capacity} WC` : 'Tidak Ada' },
                ].map(({ label, value }) => (
                  <Card key={label}><CardContent className="pt-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold mt-1">{value}</p></CardContent></Card>
                ))}
              </div>

              <Card>
                <CardHeader><CardTitle>Utilisasi per Work Center</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={capacityData.by_work_center || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="work_center" tick={{ fontSize: 11 }} width={120} />
                      <Tooltip formatter={v => `${v}%`} />
                      <Bar dataKey="utilization" name="Utilisasi" radius={[0, 4, 4, 0]}>
                        {(capacityData.by_work_center || []).map((wc, i) => (
                          <Cell key={i} fill={wc.utilization >= 90 ? '#ef4444' : wc.utilization >= 70 ? '#f59e0b' : '#22c55e'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> &lt;70% (low)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500 inline-block" /> 70-89% (normal)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> ≥90% (high)</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Beban Kerja Mingguan</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={capacityData.weekly_load || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={v => `${v / 60}j`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={v => `${v} mnt (${(v / 60).toFixed(1)} jam)`} />
                      <Legend />
                      <Bar dataKey="capacity" name="Kapasitas" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="load" name="Beban" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── Tab: Laporan Produksi ── */}
      {activeTab === 'report' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Periode:</span>
            {['week', 'month', 'year'].map(p => (
              <button key={p} onClick={() => setReportPeriod(p)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${reportPeriod === p ? 'bg-primary text-primary-foreground border-primary' : 'border-slate-200 text-slate-600 hover:border-primary'}`}>
                {p === 'week' ? 'Minggu' : p === 'month' ? 'Bulan' : 'Tahun'}
              </button>
            ))}
          </div>

          {loadingReport ? <div className="py-20 text-center text-sm text-muted-foreground">Memuat laporan...</div> : reportData && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Work Order Selesai', value: `${reportData.kpi?.completed_wo}/${reportData.kpi?.total_wo}`, sub: `${reportData.kpi?.completion_rate}% completion rate` },
                  { label: 'Total Produksi', value: reportData.kpi?.total_produced?.toLocaleString('id'), sub: `Target: ${reportData.kpi?.target_produced?.toLocaleString('id')}` },
                  { label: 'Yield Rate', value: `${reportData.kpi?.yield_rate}%`, sub: `Scrap: ${reportData.kpi?.scrap_qty} unit` },
                  { label: 'On-Time Delivery', value: `${reportData.kpi?.on_time_delivery}%`, sub: `Delayed: ${reportData.kpi?.delayed_wo} WO` },
                ].map(({ label, value, sub }) => (
                  <Card key={label}>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-2xl font-bold mt-1">{value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader><CardTitle>Produksi per Produk</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2.5">
                    {(reportData.by_product || []).map(p => (
                      <div key={p.product}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium">{p.product}</span>
                          <span className="text-muted-foreground">
                            <span className="font-semibold text-foreground">{p.actual?.toLocaleString('id')}</span> / {p.target?.toLocaleString('id')} unit
                            <span className="ml-2 font-semibold">{p.completion}%</span>
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full">
                          <div className="h-2 rounded-full" style={{ width: `${Math.min(100, p.completion)}%`, backgroundColor: p.completion >= 95 ? '#22c55e' : p.completion >= 80 ? '#6366f1' : '#f59e0b' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Tren Produksi Bulanan</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={reportData.monthly_trend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="target" name="Target" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="produced" name="Aktual" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="scrap" name="Scrap" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Work Order Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setForm(emptyWO) }} title="Tambah Work Order Baru"
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button><Button loading={savingWO} onClick={() => submitWO({ ...form, target_qty: parseInt(form.target_qty) })}>Simpan</Button></>}>
        <div className="space-y-4">
          <Input label="No. Work Order" placeholder="WO-2851" value={form.wo_number} onChange={e => setForm({ ...form, wo_number: e.target.value })} />
          <Input label="Nama Produk" placeholder="Komponen A-12" value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Target Qty" type="number" placeholder="500" value={form.target_qty} onChange={e => setForm({ ...form, target_qty: e.target.value })} />
            <Select label="Mesin" value={form.machine_id} onChange={e => setForm({ ...form, machine_id: e.target.value })}
              options={machineList.length > 0 ? machineList.map(m => ({ value: m.machine_code, label: m.machine_code })) : [
                { value: 'CNC-01', label: 'CNC-01' }, { value: 'CNC-02', label: 'CNC-02' },
                { value: 'AS-01', label: 'AS-01' }, { value: 'WL-01', label: 'WL-01' },
              ]} placeholder="Pilih mesin..." />
          </div>
          <Input label="ETA" type="date" value={form.eta} onChange={e => setForm({ ...form, eta: e.target.value })} />
        </div>
      </Modal>

      {/* Machine Add/Edit Modal */}
      <Modal
        open={showMachineModal || !!editMachine}
        onClose={() => { setShowMachineModal(false); setEditMachine(null); setMachineForm(emptyMachine) }}
        title={editMachine ? 'Edit Mesin' : 'Tambah Mesin Baru'}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowMachineModal(false); setEditMachine(null) }}>Batal</Button>
            <Button loading={savingMachine || updatingMachine}
              onClick={() => editMachine ? updateMachineFn(machineForm) : submitMachine(machineForm)}>
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Kode Mesin" placeholder="CNC-01" value={machineForm.machine_code} onChange={e => setMachineForm({ ...machineForm, machine_code: e.target.value })} disabled={!!editMachine} />
            <Input label="Nama Mesin" value={machineForm.name} onChange={e => setMachineForm({ ...machineForm, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Lokasi" value={machineForm.location} onChange={e => setMachineForm({ ...machineForm, location: e.target.value })} />
            <Select label="Status" value={machineForm.status} onChange={e => setMachineForm({ ...machineForm, status: e.target.value })}
              options={['idle', 'running', 'maintenance', 'stopped'].map(s => ({ value: s, label: s }))} />
          </div>
        </div>
      </Modal>

      {/* BOM Modal */}
      <Modal open={showBOMModal} onClose={() => setShowBOMModal(false)} title="Tambah Bill of Materials"
        footer={<><Button variant="secondary" onClick={() => setShowBOMModal(false)}>Batal</Button><Button loading={savingBOM} onClick={() => submitBOM({ ...bomForm, quantity: parseFloat(bomForm.quantity) || 0 })}>Simpan</Button></>}>
        <div className="space-y-4">
          <Input label="Nama Produk" placeholder="Komponen A-12" value={bomForm.product_name} onChange={e => setBOMForm({ ...bomForm, product_name: e.target.value })} />
          <Input label="Nama Material" value={bomForm.material_name} onChange={e => setBOMForm({ ...bomForm, material_name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Qty per Unit" type="number" step="0.01" value={bomForm.quantity} onChange={e => setBOMForm({ ...bomForm, quantity: e.target.value })} />
            <Select label="Satuan" value={bomForm.unit} onChange={e => setBOMForm({ ...bomForm, unit: e.target.value })}
              options={['pcs', 'kg', 'liter', 'meter', 'lembar', 'batang'].map(u => ({ value: u, label: u }))} />
          </div>
        </div>
      </Modal>

      {/* Downtime Modal */}
      <Modal open={showDowntimeModal} onClose={() => { setShowDowntimeModal(false); setDowntimeForm(emptyDowntime) }} title="Catat Downtime"
        footer={<><Button variant="secondary" onClick={() => setShowDowntimeModal(false)}>Batal</Button><Button loading={savingDowntime} onClick={() => submitDowntime(downtimeForm)}>Catat</Button></>}>
        <div className="space-y-4">
          <Input label="ID Mesin" placeholder="ID mesin dari tabel" value={downtimeForm.machine_id} onChange={e => setDowntimeForm({ ...downtimeForm, machine_id: e.target.value })} />
          <Select label="Kategori" value={downtimeForm.category} onChange={e => setDowntimeForm({ ...downtimeForm, category: e.target.value })}
            options={[{ value: 'breakdown', label: 'Breakdown (tidak terduga)' }, { value: 'planned', label: 'Planned Maintenance' }, { value: 'idle', label: 'Menunggu Material/Operator' }]} />
          <Input label="Penyebab" value={downtimeForm.reason} onChange={e => setDowntimeForm({ ...downtimeForm, reason: e.target.value })} />
          <Input label="Catatan" value={downtimeForm.notes} onChange={e => setDowntimeForm({ ...downtimeForm, notes: e.target.value })} />
        </div>
      </Modal>

      {/* Update WO Qty Modal */}
      <Modal open={!!qtyUpdateWO} onClose={() => setQtyUpdateWO(null)} title={`Update Qty: ${qtyUpdateWO?.wo_number}`}
        footer={<><Button variant="secondary" onClick={() => setQtyUpdateWO(null)}>Batal</Button><Button loading={savingQty} onClick={() => updateQty({ actual_qty: parseInt(qtyForm.actual_qty) || 0, status: qtyForm.status })}>Simpan</Button></>}>
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
            Produk: <strong>{qtyUpdateWO?.product_name}</strong> | Target: <strong>{qtyUpdateWO?.target_qty}</strong> | Aktual saat ini: <strong>{qtyUpdateWO?.actual_qty}</strong>
          </div>
          <Input label="Qty Aktual" type="number" value={qtyForm.actual_qty} onChange={e => setQtyForm({ ...qtyForm, actual_qty: e.target.value })} />
          <Select label="Status" value={qtyForm.status} onChange={e => setQtyForm({ ...qtyForm, status: e.target.value })}
            options={[{ value: 'pending', label: 'Pending' }, { value: 'running', label: 'Running' }, { value: 'done', label: 'Selesai' }]} />
        </div>
      </Modal>

      {/* Work Center Modal */}
      <Modal
        open={showWCModal}
        onClose={() => { setShowWCModal(false); setEditWC(null) }}
        title={editWC ? 'Edit Work Center' : 'Tambah Work Center'}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowWCModal(false); setEditWC(null) }}>Batal</Button>
            <Button loading={editWC ? updatingWC : savingWC} onClick={() => editWC ? updateWCFn(wcForm) : submitWC(wcForm)}>Simpan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Kode" placeholder="WC-CNC" value={wcForm.code} onChange={e => setWCForm({ ...wcForm, code: e.target.value })} />
            <Select label="Tipe" value={wcForm.type} onChange={e => setWCForm({ ...wcForm, type: e.target.value })}
              options={[
                { value: 'machine', label: 'Machine' }, { value: 'assembly', label: 'Assembly' },
                { value: 'welding', label: 'Welding' }, { value: 'inspection', label: 'Inspection' },
                { value: 'packaging', label: 'Packaging' },
              ]} />
          </div>
          <Input label="Nama Work Center" placeholder="CNC Machining" value={wcForm.name} onChange={e => setWCForm({ ...wcForm, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Kapasitas (mnt/hari)" type="number" placeholder="480" value={wcForm.capacity} onChange={e => setWCForm({ ...wcForm, capacity: e.target.value })} />
            <Input label="Efisiensi (%)" type="number" placeholder="85" value={wcForm.efficiency} onChange={e => setWCForm({ ...wcForm, efficiency: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Routing Modal */}
      <Modal
        open={showRoutingModal}
        onClose={() => setShowRoutingModal(false)}
        title="Tambah Routing Produk"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowRoutingModal(false)}>Batal</Button>
            <Button loading={savingRouting} onClick={() => submitRouting(routingForm)}>Simpan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Kode Produk" placeholder="KMP-A12" value={routingForm.product_code} onChange={e => setRoutingForm({ ...routingForm, product_code: e.target.value })} />
          <Input label="Nama Produk" placeholder="Komponen A-12" value={routingForm.product_name} onChange={e => setRoutingForm({ ...routingForm, product_name: e.target.value })} />
          <p className="text-xs text-muted-foreground">Routing steps dapat dikonfigurasi lebih lanjut setelah data tersimpan.</p>
        </div>
      </Modal>

      {/* Scrap/Rework Modal */}
      <Modal
        open={showScrapModal}
        onClose={() => setShowScrapModal(false)}
        title="Catat Scrap / Rework"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowScrapModal(false)}>Batal</Button>
            <Button loading={savingScrap} onClick={() => submitScrap({ ...scrapForm, qty: parseInt(scrapForm.qty) || 0, cost: parseInt(scrapForm.cost) || 0 })}>Simpan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="No. Work Order" placeholder="WO-2847" value={scrapForm.wo_number} onChange={e => setScrapForm({ ...scrapForm, wo_number: e.target.value })} />
            <Select label="Tipe" value={scrapForm.type} onChange={e => setScrapForm({ ...scrapForm, type: e.target.value })}
              options={[{ value: 'scrap', label: 'Scrap (buang)' }, { value: 'rework', label: 'Rework (proses ulang)' }]} />
          </div>
          <Input label="Nama Produk" value={scrapForm.product_name} onChange={e => setScrapForm({ ...scrapForm, product_name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Qty" type="number" value={scrapForm.qty} onChange={e => setScrapForm({ ...scrapForm, qty: e.target.value })} />
            <Input label="Work Center" placeholder="WC-CNC" value={scrapForm.work_center} onChange={e => setScrapForm({ ...scrapForm, work_center: e.target.value })} />
          </div>
          <Input label="Alasan / Penyebab" value={scrapForm.reason} onChange={e => setScrapForm({ ...scrapForm, reason: e.target.value })} />
          <Input label="Estimasi Kerugian (Rp)" type="number" placeholder="0" value={scrapForm.cost} onChange={e => setScrapForm({ ...scrapForm, cost: e.target.value })} />
        </div>
      </Modal>
    </div>
  )
}
