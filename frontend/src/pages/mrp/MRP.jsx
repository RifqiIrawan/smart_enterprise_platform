import { useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DataTable from '@/components/ui/DataTable'
import StatCard from '@/components/ui/StatCard'
import {
  GitBranch, PlayCircle, AlertTriangle, CheckCircle2, Clock,
  Plus, Trash2, Pencil, Package, Layers, ListChecks, BarChart3
} from 'lucide-react'
import { mrpApi } from '@/api'
import { useApi, useSubmit } from '@/hooks/useApi'
import { formatCurrency } from '@/utils/format'
import toast from 'react-hot-toast'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SHIFT_OPTIONS = [
  { value: 'pagi',  label: 'Pagi (07:00–15:00)' },
  { value: 'sore',  label: 'Sore (15:00–23:00)' },
  { value: 'malam', label: 'Malam (23:00–07:00)' },
]

const SCHEDULE_STATUS = [
  { value: 'planned',     label: 'Direncanakan' },
  { value: 'in_progress', label: 'Berjalan' },
  { value: 'completed',   label: 'Selesai' },
  { value: 'cancelled',   label: 'Dibatalkan' },
]

const LOT_STATUS = [
  { value: 'available', label: 'Tersedia' },
  { value: 'consumed',  label: 'Terpakai' },
  { value: 'rejected',  label: 'Ditolak' },
  { value: 'on_hold',   label: 'On Hold' },
]

function schedBadge(s) {
  return {
    planned:     <Badge variant="info">Direncanakan</Badge>,
    in_progress: <Badge variant="warning">Berjalan</Badge>,
    completed:   <Badge variant="success">Selesai</Badge>,
    cancelled:   <Badge variant="default">Dibatalkan</Badge>,
  }[s] || <Badge>{s}</Badge>
}

function lotBadge(s) {
  return {
    available: <Badge variant="success">Tersedia</Badge>,
    consumed:  <Badge variant="default">Terpakai</Badge>,
    rejected:  <Badge variant="danger">Ditolak</Badge>,
    on_hold:   <Badge variant="warning">On Hold</Badge>,
  }[s] || <Badge>{s}</Badge>
}

function severityBadge(s) {
  if (s === 'critical') return <Badge variant="danger">Kritis</Badge>
  return <Badge variant="warning">Warning</Badge>
}

// ─── Tab: MRP Engine ──────────────────────────────────────────────────────────

function MRPTab() {
  const today = new Date().toISOString().split('T')[0]
  const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  const [form, setForm] = useState({ period_start: today, period_end: nextMonth, notes: '', auto_create_pr: false })
  const [selectedRun, setSelectedRun] = useState(null)
  const { submit, loading } = useSubmit()

  const { data: runsData, refetch: refetchRuns } = useApi(() => mrpApi.getRuns())
  const runs = runsData?.value || []

  const { data: resultsData, refetch: refetchResults } = useApi(
    () => mrpApi.getResults(selectedRun ? { run_id: selectedRun } : {}),
    [selectedRun]
  )
  const results = resultsData?.value || []

  const { data: excData } = useApi(() => mrpApi.getExceptions())
  const exceptions = excData?.value || []

  const needOrder = results.filter(r => r.net_req > 0).length
  const sufficient = results.filter(r => r.net_req <= 0).length

  const handleRun = async () => {
    const res = await submit(() => mrpApi.runMRP(form))
    if (res) {
      toast.success(`MRP selesai: ${res.summary?.need_order || 0} item perlu dipesan`)
      refetchRuns()
      setSelectedRun(res.run_id)
    }
  }

  const resultColumns = [
    { key: 'item_name', label: 'Material', sortable: true, render: v => <span className="font-medium">{v}</span> },
    { key: 'unit', label: 'Satuan' },
    { key: 'gross_req', label: 'Keb. Kotor', render: v => <span>{Number(v).toLocaleString('id-ID')}</span> },
    { key: 'stock_on_hand', label: 'Stok Tersedia', render: v => <span className="text-emerald-700">{Number(v).toLocaleString('id-ID')}</span> },
    {
      key: 'net_req', label: 'Keb. Bersih', sortable: true,
      render: v => v > 0
        ? <span className="font-semibold text-rose-600">{Number(v).toLocaleString('id-ID')}</span>
        : <span className="text-slate-500">—</span>
    },
    { key: 'order_date', label: 'Tgl Order', render: v => v || '—' },
    { key: 'lead_time_days', label: 'Lead Time', render: v => `${v} hari` },
    {
      key: 'auto_pr_created', label: 'PR',
      render: v => v ? <Badge variant="success">Dibuat</Badge> : <Badge variant="default">—</Badge>
    },
  ]

  return (
    <div className="space-y-6">
      {/* Run MRP */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-slate-600 mb-4 flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-indigo-600" />
            Jalankan MRP Engine
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Periode Mulai</label>
              <input type="date" value={form.period_start}
                onChange={e => setForm(p => ({ ...p, period_start: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Periode Akhir</label>
              <input type="date" value={form.period_end}
                onChange={e => setForm(p => ({ ...p, period_end: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Keterangan</label>
              <input type="text" value={form.notes} placeholder="Opsional..."
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs text-slate-400 mt-4 cursor-pointer">
                <input type="checkbox" checked={form.auto_create_pr}
                  onChange={e => setForm(p => ({ ...p, auto_create_pr: e.target.checked }))}
                  className="rounded" />
                Auto buat Purchase Request
              </label>
              <Button onClick={handleRun} loading={loading} icon={PlayCircle}>
                Jalankan MRP
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exceptions */}
      {exceptions.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              Exception Report — Item Perlu Segera Dipesan
            </h3>
            <div className="space-y-2">
              {exceptions.map((e, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-gray-100 border border-slate-200">
                  {severityBadge(e.severity)}
                  <span className="font-medium text-slate-700 flex-1">{e.item_name}</span>
                  <span className="text-sm text-slate-400">Keb: <strong className="text-rose-600">{Number(e.net_req).toLocaleString('id-ID')}</strong></span>
                  <span className="text-sm text-slate-400">Order: <strong className="text-slate-800">{e.order_date || '—'}</strong></span>
                  <span className="text-sm text-slate-400">Lead time: <strong>{e.lead_time_days}h</strong></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Material" value={results.length} icon={Package} />
          <StatCard label="Perlu Dipesan" value={needOrder} icon={AlertTriangle} />
          <StatCard label="Stok Cukup" value={sufficient} icon={CheckCircle2} />
        </div>
      )}

      {/* Riwayat Run + Results */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Riwayat MRP</p>
              <div className="space-y-1">
                {runs.map(r => (
                  <button key={r.id} onClick={() => setSelectedRun(r.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      selectedRun === r.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                    }`}>
                    <p className="font-medium">{r.run_date}</p>
                    <p className="text-xs opacity-70 truncate">{r.notes || 'MRP Run'}</p>
                  </button>
                ))}
                {runs.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">Belum ada run</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="col-span-9">
          <Card>
            <CardContent className="p-4">
              <DataTable
                columns={resultColumns}
                fetchFn={() => mrpApi.getResults(selectedRun ? { run_id: selectedRun } : {})}
                searchPlaceholder="Cari material..."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Jadwal Produksi ─────────────────────────────────────────────────────

function JadwalTab() {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ wo_number: '', machine_name: '', shift: 'pagi', planned_start: '', planned_end: '', notes: '' })
  const tableRef = useRef()
  const { submit, loading } = useSubmit()

  const { data, refetch } = useApi(() => mrpApi.getSchedules())
  const schedules = data?.value || []
  const planned = schedules.filter(s => s.status === 'planned').length
  const running = schedules.filter(s => s.status === 'in_progress').length
  const done = schedules.filter(s => s.status === 'completed').length

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.wo_number || !form.machine_name) { toast.error('No. WO dan mesin wajib diisi'); return }
    const ok = await submit(() => mrpApi.createSchedule(form))
    if (ok) { toast.success('Jadwal ditambahkan'); setShowModal(false); setForm({ wo_number: '', machine_name: '', shift: 'pagi', planned_start: '', planned_end: '', notes: '' }); refetch() }
  }

  const handleStatus = async (row, status) => {
    const ok = await submit(() => mrpApi.updateScheduleStatus(row.id, status))
    if (ok) { toast.success('Status diperbarui'); refetch() }
  }

  const handleDelete = async (row) => {
    if (!confirm(`Hapus jadwal ${row.wo_number}?`)) return
    const ok = await submit(() => mrpApi.deleteSchedule(row.id))
    if (ok) { toast.success('Jadwal dihapus'); refetch() }
  }

  const columns = [
    { key: 'wo_number', label: 'No. WO', sortable: true, render: v => <span className="font-mono font-semibold text-indigo-600">{v}</span> },
    { key: 'machine_name', label: 'Mesin', sortable: true, render: v => <span className="font-medium">{v}</span> },
    { key: 'shift', label: 'Shift', render: v => <Badge variant="info">{v}</Badge> },
    { key: 'planned_start', label: 'Mulai', render: v => v ? new Date(v).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '—' },
    { key: 'planned_end', label: 'Selesai', render: v => v ? new Date(v).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '—' },
    { key: 'status', label: 'Status', sortable: true, render: v => schedBadge(v) },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <div className="flex gap-1">
          {row.status === 'planned' && (
            <button onClick={() => handleStatus(row, 'in_progress')}
              className="px-2 py-1 text-xs rounded bg-amber-500/20 text-amber-700 hover:bg-amber-500/30 transition-all">
              Mulai
            </button>
          )}
          {row.status === 'in_progress' && (
            <button onClick={() => handleStatus(row, 'completed')}
              className="px-2 py-1 text-xs rounded bg-emerald-500/20 text-emerald-700 hover:bg-emerald-500/30 transition-all">
              Selesai
            </button>
          )}
          <button onClick={() => handleDelete(row)} className="p-1.5 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-400/10 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <StatCard label="Direncanakan" value={planned} icon={Clock} />
          <StatCard label="Berjalan" value={running} icon={PlayCircle} />
          <StatCard label="Selesai" value={done} icon={CheckCircle2} />
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>Tambah Jadwal</Button>
      </div>

      <Card>
        <CardContent className="p-5">
          <DataTable
            ref={tableRef}
            columns={columns}
            fetchFn={() => mrpApi.getSchedules()}
            searchPlaceholder="Cari WO / mesin..."
          />
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Tambah Jadwal Produksi"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Batal</Button>
            <Button onClick={handleSave} loading={loading}>Simpan</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="No. Work Order *" value={form.wo_number} onChange={e => f('wo_number', e.target.value)} placeholder="WO/2026/0001" />
          <Input label="Nama Mesin *" value={form.machine_name} onChange={e => f('machine_name', e.target.value)} placeholder="CNC Milling #1" />
          <Select label="Shift" value={form.shift} onChange={e => f('shift', e.target.value)} options={SHIFT_OPTIONS} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Mulai (Rencana)</label>
              <input type="datetime-local" value={form.planned_start} onChange={e => f('planned_start', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Selesai (Rencana)</label>
              <input type="datetime-local" value={form.planned_end} onChange={e => f('planned_end', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <Input label="Keterangan" value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Opsional..." />
        </div>
      </Modal>
    </div>
  )
}

// ─── Tab: Routing ─────────────────────────────────────────────────────────────

function RoutingTab() {
  const [showModal, setShowModal] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const blankForm = { product_name: '', sequence: 1, process_name: '', machine_name: '', std_time_minutes: 30, description: '' }
  const [form, setForm] = useState(blankForm)
  const tableRef = useRef()
  const { submit, loading } = useSubmit()

  const { refetch } = useApi(() => mrpApi.getRoutings())
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const openEdit = (row) => {
    setEditRow(row)
    setForm({ product_name: row.product_name, sequence: row.sequence, process_name: row.process_name, machine_name: row.machine_name, std_time_minutes: row.std_time_minutes, description: row.description || '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.product_name || !form.process_name) { toast.error('Nama produk dan proses wajib diisi'); return }
    const payload = { ...form, sequence: Number(form.sequence), std_time_minutes: Number(form.std_time_minutes) }
    const ok = editRow
      ? await submit(() => mrpApi.updateRouting(editRow.id, payload))
      : await submit(() => mrpApi.createRouting(payload))
    if (ok) {
      toast.success(editRow ? 'Routing diperbarui' : 'Routing ditambahkan')
      setShowModal(false); setEditRow(null); setForm(blankForm); refetch()
    }
  }

  const handleDelete = async (row) => {
    if (!confirm(`Hapus routing ${row.process_name}?`)) return
    const ok = await submit(() => mrpApi.deleteRouting(row.id))
    if (ok) { toast.success('Dihapus'); refetch() }
  }

  const columns = [
    { key: 'product_name', label: 'Produk', sortable: true, render: v => <span className="font-medium text-slate-700">{v}</span> },
    { key: 'sequence', label: 'Seq', render: v => <Badge variant="info">#{v}</Badge> },
    { key: 'process_name', label: 'Proses', render: v => <span className="font-medium">{v}</span> },
    { key: 'machine_name', label: 'Mesin' },
    { key: 'std_time_minutes', label: 'Std. Waktu', render: v => `${v} menit` },
    { key: 'description', label: 'Keterangan', render: v => <span className="text-slate-500 text-xs">{v || '—'}</span> },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <div className="flex gap-1">
          <button onClick={() => openEdit(row)} className="p-1.5 rounded text-slate-500 hover:text-indigo-600 hover:bg-indigo-400/10 transition-all">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleDelete(row)} className="p-1.5 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-400/10 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button icon={Plus} onClick={() => { setEditRow(null); setForm(blankForm); setShowModal(true) }}>
          Tambah Routing
        </Button>
      </div>
      <Card>
        <CardContent className="p-5">
          <DataTable
            ref={tableRef}
            columns={columns}
            fetchFn={() => mrpApi.getRoutings()}
            searchPlaceholder="Cari produk / proses..."
          />
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={editRow ? 'Edit Routing' : 'Tambah Routing'}
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Batal</Button>
            <Button onClick={handleSave} loading={loading}>Simpan</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Nama Produk *" value={form.product_name} onChange={e => f('product_name', e.target.value)} placeholder="Bracket Assembly" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Urutan (Sequence)" type="number" value={form.sequence} onChange={e => f('sequence', e.target.value)} />
            <Input label="Std. Waktu (menit)" type="number" value={form.std_time_minutes} onChange={e => f('std_time_minutes', e.target.value)} />
          </div>
          <Input label="Nama Proses *" value={form.process_name} onChange={e => f('process_name', e.target.value)} placeholder="Cutting / Welding / Assembly..." />
          <Input label="Nama Mesin" value={form.machine_name} onChange={e => f('machine_name', e.target.value)} placeholder="CNC Milling #1" />
          <Input label="Keterangan" value={form.description} onChange={e => f('description', e.target.value)} placeholder="Detail proses..." />
        </div>
      </Modal>
    </div>
  )
}

// ─── Tab: Lot Tracking ────────────────────────────────────────────────────────

function LotTab() {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ item_name: '', qty: '', manufactured_date: '', expiry_date: '', wo_number: '' })
  const tableRef = useRef()
  const { submit, loading } = useSubmit()

  const { data, refetch } = useApi(() => mrpApi.getLots())
  const lots = data?.value || []
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.item_name || !form.qty) { toast.error('Nama item dan qty wajib diisi'); return }
    const ok = await submit(() => mrpApi.createLot({ ...form, qty: Number(form.qty) }))
    if (ok) {
      toast.success('Lot number dibuat')
      setShowModal(false)
      setForm({ item_name: '', qty: '', manufactured_date: '', expiry_date: '', wo_number: '' })
      refetch()
    }
  }

  const handleDelete = async (row) => {
    if (!confirm(`Hapus lot ${row.lot_number}?`)) return
    const ok = await submit(() => mrpApi.deleteLot(row.id))
    if (ok) { toast.success('Dihapus'); refetch() }
  }

  const isExpiringSoon = (dateStr) => {
    if (!dateStr) return false
    const exp = new Date(dateStr)
    const diff = (exp - Date.now()) / 86400000
    return diff > 0 && diff <= 90
  }

  const columns = [
    { key: 'lot_number', label: 'No. Lot', sortable: true, render: v => <span className="font-mono font-semibold text-indigo-600">{v}</span> },
    { key: 'item_name', label: 'Item / Material', sortable: true, render: v => <span className="font-medium">{v}</span> },
    { key: 'qty', label: 'Qty', render: v => <span className="font-semibold">{Number(v).toLocaleString('id-ID')}</span> },
    { key: 'manufactured_date', label: 'Tgl Produksi', render: v => v || '—' },
    {
      key: 'expiry_date', label: 'Kadaluarsa',
      render: v => {
        if (!v) return <span className="text-slate-500">—</span>
        if (isExpiringSoon(v)) return <span className="text-amber-700 font-medium">⚠ {v}</span>
        return <span>{v}</span>
      }
    },
    { key: 'wo_number', label: 'No. WO', render: v => v ? <span className="text-slate-600">{v}</span> : <span className="text-slate-600">—</span> },
    { key: 'status', label: 'Status', render: v => lotBadge(v) },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <button onClick={() => handleDelete(row)} className="p-1.5 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-400/10 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )
    },
  ]

  const expiringSoon = lots.filter(l => isExpiringSoon(l.expiry_date)).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <StatCard label="Total Lot" value={lots.length} icon={Layers} />
          <StatCard label="Tersedia" value={lots.filter(l => l.status === 'available').length} icon={CheckCircle2} />
          {expiringSoon > 0 && <StatCard label="Kadaluarsa ≤ 90 Hari" value={expiringSoon} icon={AlertTriangle} />}
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>Buat Lot Number</Button>
      </div>

      <Card>
        <CardContent className="p-5">
          <DataTable
            ref={tableRef}
            columns={columns}
            fetchFn={() => mrpApi.getLots()}
            searchPlaceholder="Cari lot / item..."
          />
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Buat Lot Number Baru"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Batal</Button>
            <Button onClick={handleSave} loading={loading}>Simpan</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Nama Item / Material *" value={form.item_name} onChange={e => f('item_name', e.target.value)} placeholder="Baja Plat 2mm" />
          <Input label="Qty *" type="number" value={form.qty} onChange={e => f('qty', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tgl Produksi</label>
              <input type="date" value={form.manufactured_date} onChange={e => f('manufactured_date', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tgl Kadaluarsa</label>
              <input type="date" value={form.expiry_date} onChange={e => f('expiry_date', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <Input label="No. Work Order" value={form.wo_number} onChange={e => f('wo_number', e.target.value)} placeholder="WO/2026/0001 (opsional)" />
        </div>
      </Modal>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'mrp',     label: 'MRP Engine',       icon: BarChart3 },
  { id: 'jadwal',  label: 'Jadwal Produksi',  icon: ListChecks },
  { id: 'routing', label: 'Routing',           icon: GitBranch },
  { id: 'lot',     label: 'Lot Tracking',      icon: Layers },
]

export default function MRP() {
  const [activeTab, setActiveTab] = useState('mrp')

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'mrp'     && <MRPTab />}
      {activeTab === 'jadwal'  && <JadwalTab />}
      {activeTab === 'routing' && <RoutingTab />}
      {activeTab === 'lot'     && <LotTab />}
    </div>
  )
}
