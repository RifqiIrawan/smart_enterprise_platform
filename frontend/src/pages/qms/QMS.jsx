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
  ClipboardCheck, AlertTriangle, CheckCircle2, XCircle, Clock,
  Plus, Trash2, Wrench, BarChart3, Activity, Pencil
} from 'lucide-react'
import { qmsApi } from '@/api'
import { useApi, useSubmit } from '@/hooks/useApi'
import toast from 'react-hot-toast'

// ─── Constants ────────────────────────────────────────────────────────────────

const INSPECTION_TYPES = [
  { value: 'IQC',  label: 'IQC — Incoming Quality Control' },
  { value: 'IPQC', label: 'IPQC — In-Process Quality Control' },
  { value: 'FQC',  label: 'FQC — Final Quality Control' },
]

const RESULT_OPTIONS = [
  { value: 'accepted',    label: 'Accept' },
  { value: 'conditional', label: 'Conditional Accept' },
  { value: 'rejected',    label: 'Reject' },
  { value: 'pending',     label: 'Pending' },
]

const SEVERITY_OPTIONS = [
  { value: 'minor',    label: 'Minor' },
  { value: 'major',    label: 'Major' },
  { value: 'critical', label: 'Critical' },
]

const NCR_STATUS_OPTIONS = [
  { value: 'open',        label: 'Open' },
  { value: 'capa_issued', label: 'CAPA Issued' },
  { value: 'closed',      label: 'Closed' },
]

const REF_TYPE_OPTIONS = [
  { value: 'GRN', label: 'GRN (Goods Receipt)' },
  { value: 'WO',  label: 'Work Order' },
  { value: 'DO',  label: 'Delivery Order' },
  { value: 'Other', label: 'Lainnya' },
]

const TOOL_TYPES = [
  { value: 'Dimensional',  label: 'Dimensional (Caliper, Micrometer)' },
  { value: 'Mass',         label: 'Mass (Timbangan)' },
  { value: 'Temperature',  label: 'Temperature (Thermometer)' },
  { value: 'Pressure',     label: 'Pressure (Manometer)' },
  { value: 'Surface',      label: 'Surface (Roughness, Coating)' },
  { value: 'Mechanical',   label: 'Mechanical (Tensile, Hardness)' },
  { value: 'Electrical',   label: 'Electrical (Multimeter, Oscilloscope)' },
  { value: 'Other',        label: 'Lainnya' },
]

function resultBadge(r) {
  return {
    accepted:    <Badge variant="success">Accept</Badge>,
    conditional: <Badge variant="warning">Conditional</Badge>,
    rejected:    <Badge variant="danger">Reject</Badge>,
    pending:     <Badge variant="default">Pending</Badge>,
  }[r] || <Badge>{r}</Badge>
}

function severityBadge(s) {
  return {
    minor:    <Badge variant="info">Minor</Badge>,
    major:    <Badge variant="warning">Major</Badge>,
    critical: <Badge variant="danger">Critical</Badge>,
  }[s] || <Badge>{s}</Badge>
}

function ncrStatusBadge(s) {
  return {
    open:        <Badge variant="danger">Open</Badge>,
    capa_issued: <Badge variant="warning">CAPA Issued</Badge>,
    closed:      <Badge variant="success">Closed</Badge>,
  }[s] || <Badge>{s}</Badge>
}

function capaBadge(s) {
  return {
    open:   <Badge variant="warning">Open</Badge>,
    closed: <Badge variant="success">Closed</Badge>,
  }[s] || <Badge>{s}</Badge>
}

// ─── Tab: Inspeksi QC ─────────────────────────────────────────────────────────

function InspeksiTab() {
  const [activeType, setActiveType] = useState('ALL')
  const [showModal, setShowModal] = useState(false)
  const [resultModal, setResultModal] = useState(null)
  const blank = { type: 'IQC', ref_number: '', ref_type: 'GRN', inspector: '', date: new Date().toISOString().split('T')[0], sample_size: '', defect_qty: 0, notes: '' }
  const [form, setForm] = useState(blank)
  const [resultForm, setResultForm] = useState({ result: 'accepted', defect_qty: 0, notes: '' })
  const tableRef = useRef()
  const { submit, loading } = useSubmit()

  const { data, refetch } = useApi(() => qmsApi.getInspections(activeType !== 'ALL' ? { type: activeType } : {}), [activeType])
  const list = data?.value || []
  const { data: statsData } = useApi(() => qmsApi.getStats())
  const stats = statsData || {}

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.ref_number || !form.inspector) { toast.error('No. Referensi dan inspektor wajib diisi'); return }
    const ok = await submit(() => qmsApi.createInspection({ ...form, sample_size: Number(form.sample_size), defect_qty: Number(form.defect_qty) }))
    if (ok) { toast.success('Inspeksi dicatat'); setShowModal(false); setForm(blank); refetch() }
  }

  const handleUpdateResult = async () => {
    const ok = await submit(() => qmsApi.updateInspectionResult(resultModal.id, { ...resultForm, defect_qty: Number(resultForm.defect_qty) }))
    if (ok) { toast.success('Hasil inspeksi diperbarui'); setResultModal(null); refetch() }
  }

  const handleDelete = async (row) => {
    if (!confirm('Hapus data inspeksi ini?')) return
    const ok = await submit(() => qmsApi.deleteInspection(row.id))
    if (ok) { toast.success('Dihapus'); refetch() }
  }

  const columns = [
    { key: 'type', label: 'Tipe', render: v => <Badge variant="info">{v}</Badge> },
    { key: 'ref_number', label: 'No. Referensi', sortable: true, render: v => <span className="font-mono font-semibold text-indigo-600">{v}</span> },
    { key: 'ref_type', label: 'Tipe Ref' },
    { key: 'inspector', label: 'Inspektor' },
    { key: 'date', label: 'Tanggal', sortable: true },
    { key: 'sample_size', label: 'Sample', render: v => <span>{v} pcs</span> },
    { key: 'defect_qty', label: 'Defect', render: (v, row) => {
      const rate = row.sample_size > 0 ? ((v / row.sample_size) * 100).toFixed(1) : 0
      return <span className={v > 0 ? 'text-rose-600 font-semibold' : 'text-slate-500'}>{v} ({rate}%)</span>
    }},
    { key: 'result', label: 'Hasil', render: v => resultBadge(v) },
    { key: 'actions', label: '',
      render: (_, row) => (
        <div className="flex gap-1">
          <button onClick={() => { setResultModal(row); setResultForm({ result: row.result, defect_qty: row.defect_qty, notes: row.notes || '' }) }}
            className="p-1.5 rounded text-slate-500 hover:text-indigo-600 hover:bg-indigo-400/10 transition-all">
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Inspeksi" value={stats.total_inspections || 0} icon={ClipboardCheck} />
        <StatCard label="Accept" value={stats.accepted || 0} icon={CheckCircle2} />
        <StatCard label="Reject" value={stats.rejected || 0} icon={XCircle} />
        <StatCard label="Defect Rate" value={`${(stats.defect_rate || 0).toFixed(1)}%`} icon={Activity} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-slate-200">
          {['ALL', 'IQC', 'IPQC', 'FQC'].map(t => (
            <button key={t} onClick={() => setActiveType(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeType === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}>
              {t}
            </button>
          ))}
        </div>
        <Button icon={Plus} onClick={() => { setForm(blank); setShowModal(true) }}>Tambah Inspeksi</Button>
      </div>

      <Card>
        <CardContent className="p-5">
          <DataTable ref={tableRef} columns={columns}
            fetchFn={() => qmsApi.getInspections(activeType !== 'ALL' ? { type: activeType } : {})}
            searchPlaceholder="Cari referensi / inspektor..." />
        </CardContent>
      </Card>

      {/* Add Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Tambah Inspeksi QC"
        footer={<div className="flex gap-3 justify-end"><Button variant="ghost" onClick={() => setShowModal(false)}>Batal</Button><Button onClick={handleSave} loading={loading}>Simpan</Button></div>}>
        <div className="space-y-4">
          <Select label="Tipe Inspeksi" value={form.type} onChange={e => f('type', e.target.value)} options={INSPECTION_TYPES} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="No. Referensi *" value={form.ref_number} onChange={e => f('ref_number', e.target.value)} placeholder="GRN/2026/0001" />
            <Select label="Tipe Referensi" value={form.ref_type} onChange={e => f('ref_type', e.target.value)} options={REF_TYPE_OPTIONS} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Inspektor *" value={form.inspector} onChange={e => f('inspector', e.target.value)} placeholder="Nama inspektor" />
            <div><label className="block text-xs text-slate-400 mb-1">Tanggal</label>
              <input type="date" value={form.date} onChange={e => f('date', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Jumlah Sample" type="number" value={form.sample_size} onChange={e => f('sample_size', e.target.value)} />
            <Input label="Qty Defect" type="number" value={form.defect_qty} onChange={e => f('defect_qty', e.target.value)} />
          </div>
          <Input label="Catatan" value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Temuan, kondisi, dsb..." />
        </div>
      </Modal>

      {/* Update Result Modal */}
      <Modal open={!!resultModal} onClose={() => setResultModal(null)} title={`Hasil Inspeksi — ${resultModal?.ref_number}`}
        footer={<div className="flex gap-3 justify-end"><Button variant="ghost" onClick={() => setResultModal(null)}>Batal</Button><Button onClick={handleUpdateResult} loading={loading}>Simpan</Button></div>}>
        {resultModal && (
          <div className="space-y-4">
            <Select label="Hasil" value={resultForm.result} onChange={e => setResultForm(p => ({ ...p, result: e.target.value }))} options={RESULT_OPTIONS} />
            <Input label="Qty Defect" type="number" value={resultForm.defect_qty} onChange={e => setResultForm(p => ({ ...p, defect_qty: e.target.value }))} />
            <Input label="Catatan / Temuan" value={resultForm.notes} onChange={e => setResultForm(p => ({ ...p, notes: e.target.value }))} placeholder="Detail temuan..." />
          </div>
        )}
      </Modal>
    </div>
  )
}

// ─── Tab: NCR ─────────────────────────────────────────────────────────────────

function NCRTab() {
  const [showModal, setShowModal] = useState(false)
  const [capaModal, setCapaModal] = useState(null)
  const [statusModal, setStatusModal] = useState(null)
  const blank = { ref_number: '', ref_type: 'GRN', description: '', severity: 'major', root_cause: '', reported_by: '' }
  const [form, setForm] = useState(blank)
  const [capaForm, setCapaForm] = useState({ action: '', pic: '', due_date: '', verification: '' })
  const tableRef = useRef()
  const { submit, loading } = useSubmit()
  const { data: statsData } = useApi(() => qmsApi.getStats())
  const stats = statsData || {}

  const { data, refetch } = useApi(() => qmsApi.getNCRs())
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.description) { toast.error('Deskripsi NCR wajib diisi'); return }
    const ok = await submit(() => qmsApi.createNCR(form))
    if (ok) { toast.success('NCR dibuat'); setShowModal(false); setForm(blank); refetch() }
  }

  const handleCreateCAPA = async () => {
    if (!capaForm.action || !capaForm.pic) { toast.error('Tindakan dan PIC wajib diisi'); return }
    const ok = await submit(() => qmsApi.createCAPA({ ...capaForm, ncr_id: capaModal.id }))
    if (ok) { toast.success('CAPA dibuat'); setCapaModal(null); setCapaForm({ action: '', pic: '', due_date: '', verification: '' }); refetch() }
  }

  const handleUpdateStatus = async (status) => {
    const ok = await submit(() => qmsApi.updateNCRStatus(statusModal.id, { status, root_cause: statusModal.root_cause || '' }))
    if (ok) { toast.success('Status NCR diperbarui'); setStatusModal(null); refetch() }
  }

  const handleDelete = async (row) => {
    if (!confirm(`Hapus NCR ${row.ncr_number}?`)) return
    const ok = await submit(() => qmsApi.deleteNCR(row.id))
    if (ok) { toast.success('NCR dihapus'); refetch() }
  }

  const columns = [
    { key: 'ncr_number', label: 'No. NCR', sortable: true, render: v => <span className="font-mono font-semibold text-rose-600">{v}</span> },
    { key: 'ref_number', label: 'Referensi', render: v => <span className="text-slate-600">{v || '—'}</span> },
    { key: 'description', label: 'Deskripsi', render: v => <span className="text-sm text-slate-600 line-clamp-2">{v}</span> },
    { key: 'severity', label: 'Severity', render: v => severityBadge(v) },
    { key: 'status', label: 'Status', render: v => ncrStatusBadge(v) },
    { key: 'reported_by', label: 'Dilaporkan Oleh' },
    { key: 'created_at', label: 'Tanggal' },
    { key: 'actions', label: '',
      render: (_, row) => (
        <div className="flex gap-1">
          <button onClick={() => setCapaModal(row)} title="Buat CAPA"
            className="p-1.5 rounded text-slate-500 hover:text-amber-700 hover:bg-amber-400/10 transition-all">
            <ClipboardCheck className="w-3.5 h-3.5" />
          </button>
          {row.status !== 'closed' && (
            <button onClick={() => setStatusModal(row)} title="Update Status"
              className="p-1.5 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-400/10 transition-all">
              <CheckCircle2 className="w-3.5 h-3.5" />
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
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total NCR" value={stats.total_ncr || 0} icon={AlertTriangle} />
        <StatCard label="NCR Open" value={stats.open_ncr || 0} icon={XCircle} />
        <StatCard label="CAPA Overdue" value={stats.overdue_capa || 0} icon={Clock} />
      </div>

      <div className="flex justify-end">
        <Button icon={Plus} onClick={() => { setForm(blank); setShowModal(true) }}>Buat NCR</Button>
      </div>

      <Card>
        <CardContent className="p-5">
          <DataTable ref={tableRef} columns={columns} fetchFn={() => qmsApi.getNCRs()} searchPlaceholder="Cari NCR / deskripsi..." />
        </CardContent>
      </Card>

      {/* Create NCR Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Buat Non-Conformance Report (NCR)"
        footer={<div className="flex gap-3 justify-end"><Button variant="ghost" onClick={() => setShowModal(false)}>Batal</Button><Button onClick={handleSave} loading={loading}>Buat NCR</Button></div>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="No. Referensi" value={form.ref_number} onChange={e => f('ref_number', e.target.value)} placeholder="GRN/2026/0002" />
            <Select label="Tipe Referensi" value={form.ref_type} onChange={e => f('ref_type', e.target.value)} options={REF_TYPE_OPTIONS} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Deskripsi Ketidaksesuaian *</label>
            <textarea value={form.description} onChange={e => f('description', e.target.value)} rows={3}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Jelaskan ketidaksesuaian yang ditemukan..." />
          </div>
          <Select label="Severity" value={form.severity} onChange={e => f('severity', e.target.value)} options={SEVERITY_OPTIONS} />
          <div>
            <label className="block text-xs text-slate-400 mb-1">Root Cause (opsional)</label>
            <textarea value={form.root_cause} onChange={e => f('root_cause', e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="5-Why / Fishbone analysis..." />
          </div>
          <Input label="Dilaporkan Oleh" value={form.reported_by} onChange={e => f('reported_by', e.target.value)} placeholder="Nama pelapor" />
        </div>
      </Modal>

      {/* CAPA Modal */}
      <Modal open={!!capaModal} onClose={() => setCapaModal(null)} title={`Buat CAPA — ${capaModal?.ncr_number}`}
        footer={<div className="flex gap-3 justify-end"><Button variant="ghost" onClick={() => setCapaModal(null)}>Batal</Button><Button onClick={handleCreateCAPA} loading={loading}>Buat CAPA</Button></div>}>
        {capaModal && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-sm text-slate-600">
              <span className="font-medium text-rose-600">{severityBadge(capaModal.severity)} </span>
              {capaModal.description}
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tindakan Perbaikan *</label>
              <textarea value={capaForm.action} onChange={e => setCapaForm(p => ({ ...p, action: e.target.value }))} rows={3}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Tindakan korektif / preventif yang akan dilakukan..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="PIC *" value={capaForm.pic} onChange={e => setCapaForm(p => ({ ...p, pic: e.target.value }))} placeholder="Penanggung jawab" />
              <div><label className="block text-xs text-slate-400 mb-1">Target Selesai</label>
                <input type="date" value={capaForm.due_date} onChange={e => setCapaForm(p => ({ ...p, due_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Status Modal */}
      <Modal open={!!statusModal} onClose={() => setStatusModal(null)} title={`Update Status NCR — ${statusModal?.ncr_number}`}
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setStatusModal(null)}>Batal</Button>
            {statusModal?.status === 'open' && <Button onClick={() => handleUpdateStatus('capa_issued')} loading={loading}>CAPA Issued</Button>}
            <Button variant="success" onClick={() => handleUpdateStatus('closed')} loading={loading}>Tutup NCR</Button>
          </div>
        }>
        {statusModal && <p className="text-sm text-slate-600">{statusModal.description}</p>}
      </Modal>
    </div>
  )
}

// ─── Tab: CAPA ────────────────────────────────────────────────────────────────

function CAPATab() {
  const [verifyModal, setVerifyModal] = useState(null)
  const [verifyText, setVerifyText] = useState('')
  const { submit, loading } = useSubmit()

  const { data, refetch } = useApi(() => qmsApi.getCAPAs())
  const list = data?.value || []
  const open = list.filter(c => c.status === 'open').length
  const closed = list.filter(c => c.status === 'closed').length
  const today = new Date().toISOString().split('T')[0]
  const overdue = list.filter(c => c.status === 'open' && c.due_date && c.due_date < today).length

  const handleClose = async () => {
    const ok = await submit(() => qmsApi.updateCAPAStatus(verifyModal.id, { status: 'closed', verification: verifyText }))
    if (ok) { toast.success('CAPA ditutup'); setVerifyModal(null); setVerifyText(''); refetch() }
  }

  const columns = [
    { key: 'ncr_id', label: 'NCR', render: v => <span className="font-mono text-xs text-rose-600">{v}</span> },
    { key: 'action', label: 'Tindakan', render: v => <span className="text-sm">{v}</span> },
    { key: 'pic', label: 'PIC', render: v => <span className="font-medium">{v}</span> },
    { key: 'due_date', label: 'Target', render: (v, row) => {
      if (!v) return '—'
      const overdue = row.status === 'open' && v < today
      return <span className={overdue ? 'text-rose-600 font-semibold' : ''}>{v}{overdue ? ' ⚠' : ''}</span>
    }},
    { key: 'actual_date', label: 'Tgl Selesai', render: v => v || '—' },
    { key: 'status', label: 'Status', render: v => capaBadge(v) },
    { key: 'verification', label: 'Verifikasi', render: v => <span className="text-slate-500 text-xs">{v || '—'}</span> },
    { key: 'actions', label: '',
      render: (_, row) => row.status === 'open' ? (
        <button onClick={() => { setVerifyModal(row); setVerifyText('') }}
          className="px-2 py-1 text-xs rounded bg-emerald-500/20 text-emerald-700 hover:bg-emerald-500/30 transition-all">
          Tutup
        </button>
      ) : null
    },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="CAPA Open" value={open} icon={Clock} />
        <StatCard label="CAPA Overdue" value={overdue} icon={AlertTriangle} />
        <StatCard label="CAPA Closed" value={closed} icon={CheckCircle2} />
      </div>
      <Card>
        <CardContent className="p-5">
          <DataTable columns={columns} fetchFn={() => qmsApi.getCAPAs()} searchPlaceholder="Cari CAPA / PIC..." />
        </CardContent>
      </Card>
      <Modal open={!!verifyModal} onClose={() => setVerifyModal(null)} title="Tutup CAPA — Verifikasi Efektifitas"
        footer={<div className="flex gap-3 justify-end"><Button variant="ghost" onClick={() => setVerifyModal(null)}>Batal</Button><Button onClick={handleClose} loading={loading}>Tutup CAPA</Button></div>}>
        {verifyModal && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-gray-100 border border-slate-200 text-sm text-slate-600">
              <p className="font-medium text-white mb-1">Tindakan:</p>
              <p>{verifyModal.action}</p>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Bukti Verifikasi *</label>
              <textarea value={verifyText} onChange={e => setVerifyText(e.target.value)} rows={3}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Jelaskan bukti bahwa tindakan efektif..." />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ─── Tab: Kalibrasi ───────────────────────────────────────────────────────────

function KalibrasiTab() {
  const [showModal, setShowModal] = useState(false)
  const [calibModal, setCalibModal] = useState(null)
  const [calibDate, setCalibDate] = useState(new Date().toISOString().split('T')[0])
  const blank = { tool_code: '', name: '', type: 'Dimensional', location: '', last_calibration: '', calibration_interval_days: 365 }
  const [form, setForm] = useState(blank)
  const tableRef = useRef()
  const { submit, loading } = useSubmit()
  const { data: statsData } = useApi(() => qmsApi.getStats())
  const stats = statsData || {}

  const { data, refetch } = useApi(() => qmsApi.getTools())
  const { data: alertsData } = useApi(() => qmsApi.getCalibrationAlerts())
  const alerts = alertsData?.value || []
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const today = new Date().toISOString().split('T')[0]

  const handleSave = async () => {
    if (!form.tool_code || !form.name) { toast.error('Kode alat dan nama wajib diisi'); return }
    const ok = await submit(() => qmsApi.createTool({ ...form, calibration_interval_days: Number(form.calibration_interval_days) }))
    if (ok) { toast.success('Alat ukur ditambahkan'); setShowModal(false); setForm(blank); refetch() }
  }

  const handleCalibrate = async () => {
    const ok = await submit(() => qmsApi.recordCalibration(calibModal.id, { calibration_date: calibDate }))
    if (ok) { toast.success('Kalibrasi dicatat'); setCalibModal(null); refetch() }
  }

  const handleDelete = async (row) => {
    if (!confirm(`Hapus alat ${row.name}?`)) return
    const ok = await submit(() => qmsApi.deleteTool(row.id))
    if (ok) { toast.success('Alat dihapus'); refetch() }
  }

  const columns = [
    { key: 'tool_code', label: 'Kode', render: v => <span className="font-mono font-semibold text-indigo-600">{v}</span> },
    { key: 'name', label: 'Nama Alat', sortable: true, render: v => <span className="font-medium">{v}</span> },
    { key: 'type', label: 'Tipe', render: v => <Badge variant="info">{v}</Badge> },
    { key: 'location', label: 'Lokasi' },
    { key: 'last_calibration', label: 'Kalibrasi Terakhir', render: v => v || '—' },
    { key: 'next_calibration', label: 'Kalibrasi Berikutnya', render: (v, row) => {
      if (!v) return '—'
      const isOverdue = v < today
      const soon = !isOverdue && v < new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]
      return <span className={isOverdue ? 'text-rose-600 font-semibold' : soon ? 'text-amber-700' : ''}>{v}{isOverdue ? ' ⚠ Overdue' : soon ? ' ⚠ Segera' : ''}</span>
    }},
    { key: 'calibration_interval_days', label: 'Interval', render: v => `${v} hari` },
    { key: 'actions', label: '',
      render: (_, row) => (
        <div className="flex gap-1">
          <button onClick={() => { setCalibModal(row); setCalibDate(today) }} title="Catat Kalibrasi"
            className="p-1.5 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-400/10 transition-all">
            <Wrench className="w-3.5 h-3.5" />
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
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Alat Ukur" value={(data?.value || []).length} icon={Wrench} />
        <StatCard label="Perlu Kalibrasi" value={stats.tools_due_calibration || 0} icon={AlertTriangle} />
        <StatCard label="Alert (≤90 hari)" value={alerts.length} icon={Clock} />
      </div>

      {alerts.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Alat Perlu Kalibrasi
            </h3>
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-sm">
                  <span className={`font-medium ${a.severity === 'overdue' ? 'text-rose-600' : 'text-amber-700'}`}>
                    {a.severity === 'overdue' ? '⚠ Overdue' : '○ Segera'}
                  </span>
                  <span className="font-mono text-slate-600">{a.tool_code}</span>
                  <span className="text-slate-700 flex-1">{a.name}</span>
                  <span className="text-slate-400">Next: {a.next_calibration}</span>
                  {a.days_overdue > 0 && <Badge variant="danger">{a.days_overdue} hari overdue</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button icon={Plus} onClick={() => { setForm(blank); setShowModal(true) }}>Tambah Alat Ukur</Button>
      </div>

      <Card>
        <CardContent className="p-5">
          <DataTable ref={tableRef} columns={columns} fetchFn={() => qmsApi.getTools()} searchPlaceholder="Cari alat / kode..." />
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Tambah Alat Ukur"
        footer={<div className="flex gap-3 justify-end"><Button variant="ghost" onClick={() => setShowModal(false)}>Batal</Button><Button onClick={handleSave} loading={loading}>Simpan</Button></div>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Kode Alat *" value={form.tool_code} onChange={e => f('tool_code', e.target.value)} placeholder="MT-007" />
            <Input label="Nama Alat *" value={form.name} onChange={e => f('name', e.target.value)} placeholder="Vernier Caliper 200mm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Tipe" value={form.type} onChange={e => f('type', e.target.value)} options={TOOL_TYPES} />
            <Input label="Lokasi" value={form.location} onChange={e => f('location', e.target.value)} placeholder="QC Lab" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-slate-400 mb-1">Kalibrasi Terakhir</label>
              <input type="date" value={form.last_calibration} onChange={e => f('last_calibration', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <Input label="Interval Kalibrasi (hari)" type="number" value={form.calibration_interval_days} onChange={e => f('calibration_interval_days', e.target.value)} />
          </div>
        </div>
      </Modal>

      <Modal open={!!calibModal} onClose={() => setCalibModal(null)} title={`Catat Kalibrasi — ${calibModal?.name}`}
        footer={<div className="flex gap-3 justify-end"><Button variant="ghost" onClick={() => setCalibModal(null)}>Batal</Button><Button onClick={handleCalibrate} loading={loading}>Catat</Button></div>}>
        {calibModal && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-gray-100 border border-slate-200 text-sm">
              <p className="text-slate-400">Interval: <span className="text-slate-800">{calibModal.calibration_interval_days} hari</span></p>
              <p className="text-slate-400 mt-1">Kalibrasi berikutnya akan dijadwalkan otomatis.</p>
            </div>
            <div><label className="block text-xs text-slate-400 mb-1">Tanggal Kalibrasi</label>
              <input type="date" value={calibDate} onChange={e => setCalibDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'inspeksi',  label: 'Inspeksi QC',  icon: ClipboardCheck },
  { id: 'ncr',       label: 'NCR',           icon: AlertTriangle },
  { id: 'capa',      label: 'CAPA',          icon: CheckCircle2 },
  { id: 'kalibrasi', label: 'Kalibrasi',     icon: Wrench },
]

export default function QMS() {
  const [activeTab, setActiveTab] = useState('inspeksi')

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'inspeksi'  && <InspeksiTab />}
      {activeTab === 'ncr'       && <NCRTab />}
      {activeTab === 'capa'      && <CAPATab />}
      {activeTab === 'kalibrasi' && <KalibrasiTab />}
    </div>
  )
}
