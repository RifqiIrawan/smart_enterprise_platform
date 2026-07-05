import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Building2, Package, TrendingDown, TrendingUp, Plus, Trash2, RefreshCw, Save, AlertTriangle } from 'lucide-react'
import { useApi, useSubmit } from '@/hooks/useApi'
import { costApi } from '@/api'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0)
const fmtNum = (n) => new Intl.NumberFormat('id-ID').format(n || 0)
const thisPeriod = () => new Date().toISOString().slice(0, 7)

// ─── Cost Center Tab ──────────────────────────────────────────────────────────
function CostCenterTab() {
  const { canDo } = useAuthStore()
  const canAdd = canDo('cost.centers', 'add')
  const canEdit = canDo('cost.centers', 'edit')
  const canDelete = canDo('cost.centers', 'delete')
  const tableRef = useRef()
  const [showModal, setShowModal] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [form, setForm] = useState({ code: '', name: '', department: '', overhead_rate: '', description: '' })

  const { submit: save, loading: saving } = useSubmit(
    (data) => editRow ? costApi.updateCostCenter(editRow.id, data) : costApi.createCostCenter(data),
    {
      onSuccess: () => { setShowModal(false); tableRef.current?.refetch() },
      successMessage: editRow ? 'Cost center diperbarui' : 'Cost center ditambahkan',
    }
  )
  const { submit: del } = useSubmit((id) => costApi.deleteCostCenter(id), {
    onSuccess: () => tableRef.current?.refetch(),
    successMessage: 'Cost center dihapus',
  })

  const openEdit = (row) => {
    setEditRow(row)
    setForm({ code: row.code, name: row.name, department: row.department, overhead_rate: row.overhead_rate, description: row.description || '' })
    setShowModal(true)
  }
  const openNew = () => { setEditRow(null); setForm({ code: '', name: '', department: '', overhead_rate: '', description: '' }); setShowModal(true) }

  const columns = [
    { key: 'code', label: 'Kode', width: 120 },
    { key: 'name', label: 'Nama Cost Center' },
    { key: 'department', label: 'Departemen', width: 150 },
    { key: 'overhead_rate', label: 'Overhead Rate', width: 130, render: (v) => `${(v * 100).toFixed(1)}%` },
    { key: 'status', label: 'Status', width: 100, render: (v) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-500/15 text-slate-400'}`}>
        {v === 'active' ? 'Aktif' : 'Nonaktif'}
      </span>
    )},
  ]

  return (
    <div className="space-y-4">
      <DataTable
        ref={tableRef}
        fetchFn={() => costApi.getCostCenters()}
        columns={columns}
        toolbar={canAdd && <button onClick={openNew} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-semibold shadow-md transition-all"><Plus className="w-3.5 h-3.5" />Tambah</button>}
        actions={(row) => (
          <div className="flex gap-1">
            {canEdit && <button onClick={() => openEdit(row)} className="px-2 py-1 rounded text-xs text-blue-600 hover:bg-blue-500/10 transition-colors">Edit</button>}
            {canDelete && <button onClick={() => del(row.id)} className="px-2 py-1 rounded text-xs text-red-600 hover:bg-red-500/10 transition-colors"><Trash2 className="w-3 h-3" /></button>}
          </div>
        )}
      />
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editRow ? 'Edit Cost Center' : 'Tambah Cost Center'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1 font-medium">Kode</label>
              <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value}))} placeholder="CC-MFG-01" />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1 font-medium">Overhead Rate (%)</label>
              <input type="number" step="0.01" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.overhead_rate} onChange={e => setForm(f => ({...f, overhead_rate: e.target.value}))} placeholder="0.35" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1 font-medium">Nama Cost Center</label>
            <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Produksi Line A" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1 font-medium">Departemen</label>
            <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.department} onChange={e => setForm(f => ({...f, department: e.target.value}))}>
              <option value="">-- Pilih --</option>
              {['Manufacturing', 'QC', 'Warehouse', 'Administration', 'R&D', 'Engineering'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1 font-medium">Deskripsi</label>
            <textarea className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" rows={2} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
          </div>
          <button onClick={() => save({ ...form, overhead_rate: parseFloat(form.overhead_rate) || 0, status: editRow?.status || 'active' })} disabled={saving} className="w-full py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-semibold transition-all disabled:opacity-50">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

// ─── WO Cost Tab ──────────────────────────────────────────────────────────────
function WOCostTab() {
  const { canDo } = useAuthStore()
  const canAdd = canDo('cost.wo', 'add')
  const canDelete = canDo('cost.wo', 'delete')
  const tableRef = useRef()
  const [period, setPeriod] = useState(thisPeriod())
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ wo_number: '', product_name: '', period: thisPeriod(), material_cost: '', labor_cost: '', overhead_rate: '0.35', std_cost: '', notes: '' })

  const overhead = Math.round((Number(form.material_cost) + Number(form.labor_cost)) * Number(form.overhead_rate))
  const total = Number(form.material_cost) + Number(form.labor_cost) + overhead
  const variance = total - Number(form.std_cost)

  const { submit: save, loading: saving } = useSubmit(
    (data) => costApi.createWOCost(data),
    { onSuccess: () => { setShowModal(false); tableRef.current?.refetch() }, successMessage: 'Biaya WO dicatat' }
  )
  const { submit: del } = useSubmit((id) => costApi.deleteWOCost(id), {
    onSuccess: () => tableRef.current?.refetch(),
    successMessage: 'Data dihapus',
  })

  const columns = [
    { key: 'wo_number', label: 'No WO', width: 140 },
    { key: 'product_name', label: 'Produk' },
    { key: 'material_cost', label: 'Material', width: 130, render: fmt },
    { key: 'labor_cost', label: 'Tenaga Kerja', width: 130, render: fmt },
    { key: 'overhead_cost', label: 'Overhead', width: 130, render: fmt },
    { key: 'total_cost', label: 'Total Aktual', width: 140, render: (v) => <span className="font-semibold text-slate-800">{fmt(v)}</span> },
    { key: 'std_cost', label: 'Std Cost', width: 130, render: fmt },
    { key: 'variance', label: 'Varians', width: 120, render: (v) => (
      <span className={`font-medium ${v > 0 ? 'text-red-600' : v < 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
        {v > 0 ? '+' : ''}{fmt(v)}
      </span>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Periode</label>
          <input type="month" className="bg-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500" value={period} onChange={e => setPeriod(e.target.value)} />
        </div>
        <button onClick={() => tableRef.current?.refetch()} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-100 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
        {canAdd && (
          <div className="ml-auto">
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" />Input Biaya WO
            </button>
          </div>
        )}
      </div>
      <DataTable
        ref={tableRef}
        fetchFn={() => costApi.getWOCosts({ period })}
        columns={columns}
        actions={(row) => canDelete && (
          <button onClick={() => del(row.id)} className="p-1 rounded text-red-600 hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
        )}
      />
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Input Biaya Work Order">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1 font-medium">No WO</label>
              <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.wo_number} onChange={e => setForm(f => ({...f, wo_number: e.target.value}))} placeholder="WO/2026/0001" />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1 font-medium">Periode</label>
              <input type="month" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.period} onChange={e => setForm(f => ({...f, period: e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1 font-medium">Nama Produk</label>
            <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.product_name} onChange={e => setForm(f => ({...f, product_name: e.target.value}))} placeholder="Bracket Assembly A" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1 font-medium">Biaya Material (Rp)</label>
              <input type="number" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.material_cost} onChange={e => setForm(f => ({...f, material_cost: e.target.value}))} />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1 font-medium">Biaya Tenaga Kerja (Rp)</label>
              <input type="number" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.labor_cost} onChange={e => setForm(f => ({...f, labor_cost: e.target.value}))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1 font-medium">Overhead Rate (desimal, mis. 0.35)</label>
              <input type="number" step="0.01" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.overhead_rate} onChange={e => setForm(f => ({...f, overhead_rate: e.target.value}))} />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1 font-medium">Standard Cost (Rp)</label>
              <input type="number" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.std_cost} onChange={e => setForm(f => ({...f, std_cost: e.target.value}))} />
            </div>
          </div>
          {/* Preview */}
          {(form.material_cost || form.labor_cost) && (
            <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-center">
                <p className="text-xs text-slate-400">Overhead</p>
                <p className="text-sm font-semibold text-slate-800">{fmt(overhead)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">Total Aktual</p>
                <p className="text-sm font-semibold text-indigo-600">{fmt(total)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">Varians</p>
                <p className={`text-sm font-semibold ${variance > 0 ? 'text-red-600' : 'text-emerald-700'}`}>{variance > 0 ? '+' : ''}{fmt(variance)}</p>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs text-slate-600 mb-1 font-medium">Catatan</label>
            <textarea className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" rows={2} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
          </div>
          <button onClick={() => save({ ...form, material_cost: Number(form.material_cost), labor_cost: Number(form.labor_cost), overhead_rate: Number(form.overhead_rate), std_cost: Number(form.std_cost) })} disabled={saving} className="w-full py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-semibold transition-all disabled:opacity-50">
            {saving ? 'Menyimpan...' : 'Catat Biaya WO'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

// ─── Standard Cost Tab ────────────────────────────────────────────────────────
function StandardCostTab() {
  const { canDo } = useAuthStore()
  const canAdd = canDo('cost.std', 'add')
  const canDelete = canDo('cost.std', 'delete')
  const tableRef = useRef()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ product_name: '', material_std: '', labor_std: '', overhead_std: '', effective_date: '', notes: '' })

  const totalStd = Number(form.material_std) + Number(form.labor_std) + Number(form.overhead_std)

  const { submit: save, loading: saving } = useSubmit(
    (data) => costApi.upsertStandardCost(data),
    { onSuccess: () => { setShowModal(false); tableRef.current?.refetch() }, successMessage: 'Standard cost disimpan' }
  )
  const { submit: del } = useSubmit((id) => costApi.deleteStandardCost(id), {
    onSuccess: () => tableRef.current?.refetch(),
    successMessage: 'Standard cost dihapus',
  })

  const columns = [
    { key: 'product_name', header: 'Nama Produk' },
    { key: 'material_std', header: 'Material Std', width: 140, render: fmt },
    { key: 'labor_std', header: 'TK Std', width: 120, render: fmt },
    { key: 'overhead_std', header: 'Overhead Std', width: 130, render: fmt },
    { key: 'total_std', header: 'Total Std', width: 140, render: (v) => <span className="font-semibold text-slate-800">{fmt(v)}</span> },
    { key: 'effective_date', header: 'Efektif', width: 110, render: (v) => v ? new Date(v).toLocaleDateString('id-ID') : '-' },
  ]

  return (
    <div className="space-y-4">
      <DataTable
        ref={tableRef}
        fetchFn={() => costApi.getStandardCosts()}
        columns={columns}
        toolbar={canAdd && <button onClick={() => { setForm({ product_name: '', material_std: '', labor_std: '', overhead_std: '', effective_date: '', notes: '' }); setShowModal(true) }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"><Plus className="w-3.5 h-3.5" />Tambah / Update</button>}
        actions={(row) => canDelete && (
          <button onClick={() => del(row.id)} className="p-1 rounded text-red-600 hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
        )}
      />
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Standard Cost Produk">
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-600 mb-1 font-medium">Nama Produk</label>
            <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.product_name} onChange={e => setForm(f => ({...f, product_name: e.target.value}))} placeholder="Bracket Assembly A" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[['material_std', 'Material Std (Rp)'], ['labor_std', 'TK Langsung (Rp)'], ['overhead_std', 'Overhead (Rp)']].map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs text-slate-600 mb-1 font-medium">{label}</label>
                <input type="number" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form[key]} onChange={e => setForm(f => ({...f, [key]: e.target.value}))} />
              </div>
            ))}
          </div>
          {totalStd > 0 && (
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-center">
              <p className="text-xs text-slate-400">Total Standard Cost</p>
              <p className="text-lg font-bold text-indigo-600">{fmt(totalStd)}</p>
            </div>
          )}
          <div>
            <label className="block text-xs text-slate-600 mb-1 font-medium">Tanggal Efektif</label>
            <input type="date" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" value={form.effective_date} onChange={e => setForm(f => ({...f, effective_date: e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1 font-medium">Catatan</label>
            <textarea className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" rows={2} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
          </div>
          <button onClick={() => save({ ...form, material_std: Number(form.material_std), labor_std: Number(form.labor_std), overhead_std: Number(form.overhead_std) })} disabled={saving} className="w-full py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-semibold transition-all disabled:opacity-50">
            {saving ? 'Menyimpan...' : 'Simpan Standard Cost'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

// ─── Report Columns ───────────────────────────────────────────────────────────
const varianceColumns = [
  { key: 'product_name', label: 'Produk' },
  { key: 'total_cost', label: 'Total Aktual', render: v => <span className="text-slate-600">{fmt(v)}</span> },
  { key: 'std_cost', label: 'Std Cost', render: v => <span className="text-slate-600">{fmt(v)}</span> },
  { key: 'variance', label: 'Varians', render: v => <span className={`font-medium ${v > 0 ? 'text-red-600' : 'text-emerald-700'}`}>{v > 0 ? '+' : ''}{fmt(v)}</span> },
  { key: 'variance_pct', label: 'Varians %', render: v => <span className="text-slate-400">{Number(v).toFixed(2)}%</span> },
  { key: 'status', label: 'Status', render: v => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v === 'unfavorable' ? 'bg-red-500/15 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
      {v === 'unfavorable' ? 'Tidak Menguntungkan' : 'Menguntungkan'}
    </span>
  )},
]

const cogsColumns = [
  { key: 'category', label: 'Kategori Biaya' },
  { key: 'amount', label: 'Jumlah', render: v => <span className="text-slate-600">{fmt(v)}</span> },
  { key: 'pct', label: '% dari COGS', render: v => (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-200 rounded-full h-1.5 min-w-[60px]">
        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${v}%` }} />
      </div>
      <span className="text-xs text-slate-400">{v}%</span>
    </div>
  )},
]

const profitColumns = [
  { key: 'product_name', label: 'Produk', render: v => <span className="font-medium text-slate-800">{v}</span> },
  { key: 'revenue', label: 'Revenue', render: v => <span className="text-slate-600">{fmt(v)}</span> },
  { key: 'cogs', label: 'COGS', render: v => <span className="text-slate-600">{fmt(v)}</span> },
  { key: 'gross_profit', label: 'Gross Profit', render: v => <span className="font-medium text-emerald-700">{fmt(v)}</span> },
  { key: 'margin_pct', label: 'Margin %', render: v => (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-slate-200 rounded-full h-1.5">
        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(v, 100)}%` }} />
      </div>
      <span className="text-xs font-medium text-emerald-700">{Number(v).toFixed(1)}%</span>
    </div>
  )},
]

const centerReportColumns = [
  { key: 'cost_center', label: 'Cost Center', render: v => <span className="font-medium text-slate-800">{v}</span> },
  { key: 'department', label: 'Departemen', render: v => <span className="text-slate-400">{v}</span> },
  { key: 'actual_cost', label: 'Biaya Aktual', render: v => fmt(v) },
  { key: 'allocated', label: 'Alokasi', render: v => <span className="text-indigo-600">{fmt(v)}</span> },
  { key: 'overhead_rate', label: 'Overhead Rate', render: v => `${(Number(v) * 100).toFixed(1)}%` },
]

// ─── Reports Tab ──────────────────────────────────────────────────────────────
function LaporanTab() {
  const [period, setPeriod] = useState(thisPeriod())
  const [activeReport, setActiveReport] = useState('variance')

  const { data: summary } = useApi(() => costApi.getCostSummary({ period }), [period])
  const { data: variance } = useApi(() => costApi.getCostVariance({ period }), [period, activeReport === 'variance'])
  const { data: cogs } = useApi(() => costApi.getCOGSReport({ period }), [period, activeReport === 'cogs'])
  const { data: profitability } = useApi(() => costApi.getProfitabilityReport({ period }), [period, activeReport === 'profitability'])
  const { data: centerReport } = useApi(() => costApi.getCostCenterReport({ period }), [period, activeReport === 'centers'])

  const sumData = summary?.data || {}

  const varianceItems = variance?.data?.value || []
  const cogsItems = cogs?.data?.cogs_detail || []
  const profitItems = profitability?.data?.value || []
  const centerItems = centerReport?.data?.value || []

  const mkFetchFn = (items) => async (params = {}) => {
    let filtered = [...items]
    const search = params['$search']?.toLowerCase()
    if (search) filtered = filtered.filter(row => Object.values(row).some(v => String(v ?? '').toLowerCase().includes(search)))
    if (params['$orderby']) {
      const [key, dir] = params['$orderby'].split(' ')
      filtered = [...filtered].sort((a, b) => dir === 'desc'
        ? String(b[key] ?? '').localeCompare(String(a[key] ?? ''), undefined, { numeric: true })
        : String(a[key] ?? '').localeCompare(String(b[key] ?? ''), undefined, { numeric: true }))
    }
    const top = params['$top'] ?? 10, skip = params['$skip'] ?? 0
    return { '@odata.count': filtered.length, value: filtered.slice(skip, skip + top) }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const varianceFetchFn = useCallback(mkFetchFn(varianceItems), [varianceItems])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cogsFetchFn = useCallback(mkFetchFn(cogsItems), [cogsItems])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const profitFetchFn = useCallback(mkFetchFn(profitItems), [profitItems])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const centerFetchFn = useCallback(mkFetchFn(centerItems), [centerItems])

  const statCards = [
    { label: 'Total Biaya Produksi', value: fmt(sumData.total_production), sub: `${sumData.wo_count || 0} WO`, icon: Package, color: 'indigo' },
    { label: 'Varians vs Standard', value: fmt(sumData.total_variance), sub: `${sumData.variance_pct || 0}%`, icon: sumData.total_variance >= 0 ? TrendingUp : TrendingDown, color: (sumData.total_variance || 0) > 0 ? 'red' : 'emerald' },
    { label: 'Biaya Material', value: fmt(sumData.total_material), sub: `${sumData.total_production ? ((sumData.total_material / sumData.total_production) * 100).toFixed(1) : 0}% dari total`, icon: Package, color: 'blue' },
    { label: 'Cost Centers Aktif', value: sumData.cost_centers || 0, sub: 'departemen', icon: Building2, color: 'violet' },
  ]

  const colorMap = { indigo: 'from-indigo-500/20 to-indigo-600/10 border-indigo-200 text-indigo-600', red: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-300', emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-200 text-emerald-300', blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-300', violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/30 text-violet-300' }

  const reports = [
    { key: 'variance', label: 'Analisis Varians' },
    { key: 'cogs', label: 'COGS Report' },
    { key: 'profitability', label: 'Profitabilitas Produk' },
    { key: 'centers', label: 'Cost Center Report' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <label className="text-xs text-slate-400">Periode:</label>
        <input type="month" className="bg-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500" value={period} onChange={e => setPeriod(e.target.value)} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon
          const cls = colorMap[card.color]
          return (
            <div key={card.label} className={`rounded-xl border bg-gradient-to-br ${cls} p-4`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400">{card.label}</p>
                  <p className="text-lg font-bold text-white mt-0.5">{card.value}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{card.sub}</p>
                </div>
                <Icon className={`w-8 h-8 opacity-20`} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Report Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-50 border border-slate-200">
        {reports.map(r => (
          <button key={r.key} onClick={() => setActiveReport(r.key)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${activeReport === r.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>
            {r.label}
          </button>
        ))}
      </div>

      {/* Variance Report */}
      {activeReport === 'variance' && (
        <div>
          {variance?.data?.summary && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Total Aktual', value: fmt(variance.data.summary.total_actual) },
                { label: 'Total Standard', value: fmt(variance.data.summary.total_std) },
                { label: 'Total Varians', value: `${variance.data.summary.total_variance > 0 ? '+' : ''}${fmt(variance.data.summary.total_variance)}`, cls: variance.data.summary.total_variance > 0 ? 'text-red-600' : 'text-emerald-700' },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm text-center">
                  <p className="text-xs text-slate-400">{s.label}</p>
                  <p className={`text-base font-bold ${s.cls || 'text-white'}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}
          <DataTable fetchFn={varianceFetchFn} columns={varianceColumns} searchPlaceholder="Cari produk..." />
        </div>
      )}

      {/* COGS Report */}
      {activeReport === 'cogs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total COGS', value: fmt(cogs?.data?.total_cogs), cls: 'text-white' },
              { label: 'Gross Revenue', value: fmt(cogs?.data?.gross_revenue), cls: 'text-white' },
              { label: 'Gross Profit', value: fmt(cogs?.data?.gross_profit), cls: (cogs?.data?.gross_profit || 0) >= 0 ? 'text-emerald-700' : 'text-red-600' },
              { label: 'Gross Margin', value: `${Number(cogs?.data?.gross_margin_pct || 0).toFixed(1)}%`, cls: 'text-indigo-600' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm text-center">
                <p className="text-xs text-slate-600 mb-1 font-medium">{s.label}</p>
                <p className={`text-base font-bold ${s.cls}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <DataTable fetchFn={cogsFetchFn} columns={cogsColumns} searchPlaceholder="Cari kategori..." />
        </div>
      )}

      {/* Profitability Report */}
      {activeReport === 'profitability' && (
        <DataTable fetchFn={profitFetchFn} columns={profitColumns} searchPlaceholder="Cari produk..." />
      )}

      {/* Cost Center Report */}
      {activeReport === 'centers' && (
        <DataTable fetchFn={centerFetchFn} columns={centerReportColumns} searchPlaceholder="Cari cost center, departemen..." />
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const VALID_TABS = ['centers', 'wo', 'std', 'laporan']
const SECTION_TITLE = {
  centers: 'Cost Center', wo: 'Biaya WO', std: 'Standard Cost', laporan: 'Laporan & Analisis',
}

export default function Cost() {
  const { tab: tabParam } = useParams()
  const navigate = useNavigate()
  const tab = VALID_TABS.includes(tabParam) ? tabParam : 'centers'
  useEffect(() => {
    if (!VALID_TABS.includes(tabParam)) navigate('/cost/centers', { replace: true })
  }, [tabParam])

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-slate-800">{SECTION_TITLE[tab]}</h1>

      {tab === 'centers' && <CostCenterTab />}
      {tab === 'wo' && <WOCostTab />}
      {tab === 'std' && <StandardCostTab />}
      {tab === 'laporan' && <LaporanTab />}
    </div>
  )
}
