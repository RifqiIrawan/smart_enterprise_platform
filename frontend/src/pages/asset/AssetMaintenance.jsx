import { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import StatCard from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DataTable from '@/components/ui/DataTable'
import { Wrench, AlertTriangle, CheckCircle, Clock, Plus, Check, Pencil, Trash2, Calculator, Package, Calendar, TrendingDown } from 'lucide-react'
import { assetApi } from '@/api'
import { useApi, useSubmit } from '@/hooks/useApi'
import { useAuthStore } from '@/store/authStore'
import { formatDate, formatCurrency } from '@/utils/format'
import toast from 'react-hot-toast'

const conditionBadge = (c) => ({
  good: <Badge variant="success">Baik</Badge>,
  fair: <Badge variant="warning">Cukup</Badge>,
  poor: <Badge variant="danger">Buruk</Badge>,
})[c] || <Badge>{c}</Badge>

const maintStatusBadge = (s) => ({
  scheduled: <Badge variant="info">Terjadwal</Badge>,
  urgent: <Badge variant="danger">Urgent</Badge>,
  done: <Badge variant="success">Selesai</Badge>,
  in_progress: <Badge variant="warning">Berlangsung</Badge>,
})[s] || <Badge>{s}</Badge>

const pmStatusBadge = (s) => ({
  upcoming: <Badge variant="info">Mendatang</Badge>,
  due: <Badge variant="warning">Jatuh Tempo</Badge>,
  overdue: <Badge variant="danger">Terlambat</Badge>,
  done: <Badge variant="success">Selesai</Badge>,
})[s] || <Badge>{s}</Badge>

const spBadge = (s) => ({
  ok: <Badge variant="success">Cukup</Badge>,
  low: <Badge variant="danger">Stok Rendah</Badge>,
})[s] || <Badge>{s}</Badge>

const disposalTypeBadge = (t) => ({
  sale: <Badge variant="info">Penjualan</Badge>,
  write_off: <Badge variant="danger">Hapus Buku</Badge>,
  transfer: <Badge variant="warning">Transfer</Badge>,
})[t] || <Badge>{t}</Badge>

const methodLabel = { straight_line: 'Garis Lurus', double_declining: 'Saldo Menurun Ganda' }

const emptyAsset = { asset_number: '', name: '', category: '', location: '', value: '', condition: 'good', next_maintenance: '' }
const emptyMaint = { asset_id: '', type: 'Preventive', scheduled_date: '', technician: '', notes: '' }
const emptyPM = { asset_id: '', asset_name: '', name: '', type: 'calendar', interval_days: 30, last_done: '', technician: '' }
const emptySP = { asset_id: '', asset_name: '', part_code: '', name: '', qty: '', unit: 'pcs', unit_cost: '', min_stock: '' }
const emptyDisposal = { asset_id: '', asset_name: '', disposal_type: 'sale', sale_price: '', book_value: '', disposal_date: '', notes: '' }
const emptyCalc = { period: new Date().toISOString().slice(0, 7), method: 'straight_line' }

const maintColumns = [
  { key: 'asset_name', label: 'Aset', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
  { key: 'type', label: 'Tipe', sortable: true },
  { key: 'scheduled_date', label: 'Tgl Jadwal', sortable: true, render: (v) => v ? formatDate(v) : '—' },
  { key: 'technician', label: 'Teknisi' },
  { key: 'notes', label: 'Catatan', tdClassName: 'text-xs text-gray-500' },
  { key: 'status', label: 'Status', sortable: true, render: (v) => maintStatusBadge(v) },
]

const pmColumns = [
  { key: 'asset_name', label: 'Aset', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
  { key: 'name', label: 'Pekerjaan PM', sortable: true },
  { key: 'type', label: 'Tipe', render: (v) => v === 'calendar' ? 'Kalender' : 'Meter' },
  { key: 'interval_days', label: 'Interval', render: (v) => `${v} hari` },
  { key: 'last_done', label: 'Terakhir', render: (v) => v ? formatDate(v) : '—' },
  { key: 'next_due', label: 'Jatuh Tempo', sortable: true, render: (v) => v ? formatDate(v) : '—' },
  { key: 'technician', label: 'Teknisi' },
  { key: 'status', label: 'Status', sortable: true, render: (v) => pmStatusBadge(v) },
]

const spColumns = [
  { key: 'part_code', label: 'Kode Part', render: (v) => <span className="font-mono text-xs text-blue-600 font-semibold">{v}</span> },
  { key: 'name', label: 'Nama Part', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
  { key: 'asset_name', label: 'Aset', sortable: true },
  { key: 'qty', label: 'Stok', render: (v) => <span className="font-semibold">{v}</span> },
  { key: 'unit', label: 'Satuan' },
  { key: 'unit_cost', label: 'Harga/Unit', render: (v) => formatCurrency(v) },
  { key: 'min_stock', label: 'Min. Stok' },
  { key: 'status', label: 'Status', render: (v) => spBadge(v) },
]

const disposalColumns = [
  { key: 'asset_name', label: 'Aset', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
  { key: 'disposal_type', label: 'Tipe', render: (v) => disposalTypeBadge(v) },
  { key: 'disposal_date', label: 'Tanggal', sortable: true, render: (v) => v ? formatDate(v) : '—' },
  { key: 'sale_price', label: 'Harga Jual', render: (v) => formatCurrency(v) },
  { key: 'book_value', label: 'Nilai Buku', render: (v) => formatCurrency(v) },
  {
    key: 'gain_loss', label: 'Gain / Loss',
    render: (v) => <span className={v >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
      {v >= 0 ? '+' : ''}{formatCurrency(v)}
    </span>
  },
  { key: 'notes', label: 'Catatan', tdClassName: 'text-xs text-gray-500' },
]

const depreciationColumns = [
  { key: 'asset_name', label: 'Nama Aset', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
  { key: 'acquisition_date', label: 'Tgl Perolehan', sortable: true, render: (v) => v ? formatDate(v) : '—' },
  { key: 'acquisition_value', label: 'Nilai Perolehan', tdClassName: 'text-right', render: (v) => formatCurrency(v) },
  { key: 'method', label: 'Metode', render: (v) => <Badge variant="info" className="text-xs">{methodLabel[v] || v}</Badge> },
  { key: 'years_owned', label: 'Thn Dimiliki', render: (v) => `${v} thn` },
  { key: 'annual_depreciation', label: 'Penyusutan/Thn', tdClassName: 'text-right', render: (v) => <span className="text-amber-700">{formatCurrency(v)}</span> },
  { key: 'accumulated_depreciation', label: 'Akum. Penyusutan', tdClassName: 'text-right', render: (v) => <span className="text-red-600">{formatCurrency(v)}</span> },
  { key: 'book_value', label: 'Nilai Buku', tdClassName: 'text-right', render: (v) => <span className="font-bold text-emerald-700">{formatCurrency(v)}</span> },
]

const VALID_TABS = ['assets', 'maintenance', 'pm', 'spareparts', 'depreciation']
const SECTION_TITLE = {
  assets: 'Daftar Aset', maintenance: 'Jadwal Maintenance', pm: 'PM Schedule',
  spareparts: 'Spare Parts', depreciation: 'Depresiasi & Disposal',
}

export default function AssetMaintenance() {
  const { tab } = useParams()
  const navigate = useNavigate()
  const activeTab = VALID_TABS.includes(tab) ? tab : 'assets'
  useEffect(() => {
    if (!VALID_TABS.includes(tab)) navigate('/asset/assets', { replace: true })
  }, [tab])
  const { canDo } = useAuthStore()
  const menuKey = `asset.${activeTab}`
  const canAdd = canDo(menuKey, 'add')
  const canEdit = canDo(menuKey, 'edit')
  const canDelete = canDo(menuKey, 'delete')
  const [showModal, setShowModal] = useState(false)
  const [editAsset, setEditAsset] = useState(null)
  const [editSP, setEditSP] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [assetForm, setAssetForm] = useState(emptyAsset)
  const [maintForm, setMaintForm] = useState(emptyMaint)
  const [pmForm, setPmForm] = useState(emptyPM)
  const [spForm, setSpForm] = useState(emptySP)
  const [disposalForm, setDisposalForm] = useState(emptyDisposal)
  const [calcForm, setCalcForm] = useState(emptyCalc)
  const [showCalcModal, setShowCalcModal] = useState(false)
  const [showDisposalModal, setShowDisposalModal] = useState(false)

  const assetRef = useRef(null)
  const maintRef = useRef(null)
  const pmRef = useRef(null)
  const spRef = useRef(null)
  const disposalRef = useRef(null)

  const { data: statsRaw } = useApi(assetApi.getAssets)
  const stats = Array.isArray(statsRaw?.value) ? statsRaw.value : []

  const { data: deprRaw, refetch: refetchDepr } = useApi(assetApi.getDepreciation)
  const deprList = Array.isArray(deprRaw?.value) ? deprRaw.value : []

  const deprFetchFn = useCallback(async (params = {}) => {
    let filtered = [...deprList]
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
  }, [deprList])

  const { data: spRaw } = useApi(assetApi.getSpareParts)
  const spList = Array.isArray(spRaw?.value) ? spRaw.value : []
  const lowStockCount = spList.filter(s => s.status === 'low').length

  // Asset CRUD
  const { submit: submitAsset, loading: savingAsset } = useSubmit(assetApi.createAsset, {
    successMsg: 'Aset berhasil ditambahkan',
    onSuccess: () => { setShowModal(false); setAssetForm(emptyAsset); assetRef.current?.refetch() },
  })
  const { submit: updateAssetFn, loading: updatingAsset } = useSubmit(
    (data) => assetApi.updateAsset(editAsset?.id, data),
    { successMsg: 'Data aset diperbarui', onSuccess: () => { setEditAsset(null); assetRef.current?.refetch() } }
  )

  // Maintenance
  const { submit: submitMaint, loading: savingMaint } = useSubmit(assetApi.createMaintenance, {
    successMsg: 'Jadwal maintenance berhasil dibuat',
    onSuccess: () => { setShowModal(false); setMaintForm(emptyMaint); maintRef.current?.refetch() },
  })

  // PM Schedules
  const { submit: submitPM, loading: savingPM } = useSubmit(assetApi.createPMSchedule, {
    successMsg: 'PM Schedule berhasil dibuat',
    onSuccess: () => { setShowModal(false); setPmForm(emptyPM); pmRef.current?.refetch() },
  })

  // Spare Parts
  const { submit: submitSP, loading: savingSP } = useSubmit(assetApi.createSparePart, {
    successMsg: 'Spare part berhasil ditambahkan',
    onSuccess: () => { setShowModal(false); setSpForm(emptySP); setEditSP(null); spRef.current?.refetch() },
  })
  const { submit: updateSPFn, loading: updatingSP } = useSubmit(
    (data) => assetApi.updateSparePart(editSP?.id, data),
    { successMsg: 'Spare part diperbarui', onSuccess: () => { setEditSP(null); setShowModal(false); spRef.current?.refetch() } }
  )

  // Disposal
  const { submit: submitDisposal, loading: savingDisposal } = useSubmit(assetApi.createDisposal, {
    successMsg: 'Disposal aset berhasil dicatat',
    onSuccess: () => { setShowDisposalModal(false); setDisposalForm(emptyDisposal); disposalRef.current?.refetch() },
  })

  // Calculate depreciation
  const { submit: submitCalc, loading: calculating } = useSubmit(assetApi.calculateDepreciation, {
    successMsg: 'Depresiasi berhasil dihitung',
    onSuccess: () => { setShowCalcModal(false); refetchDepr() },
  })

  const handleDone = async (id) => {
    try { await assetApi.updateMaintenanceStatus(id, 'done'); toast.success('Maintenance selesai'); maintRef.current?.refetch() }
    catch { toast.error('Gagal update status') }
  }

  const handlePMDone = async (row) => {
    try { await assetApi.updatePMSchedule(row.id, { last_done: new Date().toISOString().slice(0, 10) }); toast.success('PM ditandai selesai'); pmRef.current?.refetch() }
    catch { toast.error('Gagal update PM') }
  }

  const handleDeleteAsset = async () => {
    try { await assetApi.deleteAsset(deleteItem.id); toast.success('Aset berhasil dihapus'); setDeleteItem(null); assetRef.current?.refetch() }
    catch { toast.error('Gagal menghapus aset') }
  }

  const handleDeletePM = async (row) => {
    try { await assetApi.deletePMSchedule(row.id); toast.success('PM Schedule dihapus'); pmRef.current?.refetch() }
    catch { toast.error('Gagal menghapus PM') }
  }

  const handleDeleteSP = async (row) => {
    try { await assetApi.deleteSparePart(row.id); toast.success('Spare part dihapus'); spRef.current?.refetch() }
    catch { toast.error('Gagal menghapus spare part') }
  }

  const openEditSP = (row) => {
    setEditSP(row)
    setSpForm({ asset_id: row.asset_id, asset_name: row.asset_name, part_code: row.part_code, name: row.name, qty: String(row.qty), unit: row.unit, unit_cost: String(row.unit_cost), min_stock: String(row.min_stock) })
    setShowModal(true)
  }

  const openEditAsset = (row) => {
    setEditAsset(row)
    setAssetForm({ asset_number: row.asset_number, name: row.name, category: row.category, location: row.location, value: String(row.value), condition: row.condition, next_maintenance: row.next_maintenance || '' })
  }

  const assetColumns = [
    { key: 'asset_number', label: 'No. Aset', sortable: true, render: (v) => <span className="font-mono text-xs text-blue-600 font-semibold">{v}</span> },
    { key: 'name', label: 'Nama Aset', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
    { key: 'category', label: 'Kategori', sortable: true },
    { key: 'location', label: 'Lokasi' },
    { key: 'value', label: 'Nilai', sortable: true, render: (v) => <span className="text-xs font-medium">{formatCurrency(v)}</span> },
    { key: 'condition', label: 'Kondisi', sortable: true, render: (v) => conditionBadge(v) },
    { key: 'next_maintenance', label: 'Maintenance Berikutnya', render: (v) => v ? formatDate(v) : '—' },
  ]

  const openModal = () => {
    if (activeTab === 'assets') { setEditAsset(null); setAssetForm(emptyAsset) }
    if (activeTab === 'pm') setPmForm(emptyPM)
    if (activeTab === 'spareparts') { setEditSP(null); setSpForm(emptySP) }
    setShowModal(true)
  }

  const addLabel = { assets: 'Tambah Aset', maintenance: 'Buat Jadwal', pm: 'Tambah PM', spareparts: 'Tambah Part' }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-semibold text-slate-800">{SECTION_TITLE[activeTab]}</h1>
        {canAdd && ['assets', 'maintenance', 'pm', 'spareparts'].includes(activeTab) && (
          <Button size="sm" icon={<Plus />} onClick={openModal}>{addLabel[activeTab]}</Button>
        )}
        {canAdd && activeTab === 'depreciation' && (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" icon={<TrendingDown />} onClick={() => setShowDisposalModal(true)}>Catat Disposal</Button>
            <Button size="sm" icon={<Calculator />} onClick={() => setShowCalcModal(true)}>Hitung Depresiasi</Button>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Aset" value={String(statsRaw?.['@odata.count'] ?? stats.length)} icon={Wrench} color="blue" />
        <StatCard title="Kondisi Baik" value={String(stats.filter(a => a.condition === 'good').length)} icon={CheckCircle} color="emerald" />
        <StatCard title="Perlu Perhatian" value={String(stats.filter(a => a.condition === 'fair').length)} icon={AlertTriangle} color="amber" />
        <StatCard title="Spare Part Low Stock" value={String(lowStockCount)} icon={Package} color="red" />
      </div>

      {/* ── Daftar Aset ── */}
      {activeTab === 'assets' && (
        <Card>
          <CardHeader><CardTitle>Daftar Aset</CardTitle></CardHeader>
          <CardContent>
            <DataTable ref={assetRef} columns={assetColumns} fetchFn={assetApi.getAssets}
              searchPlaceholder="Cari aset, kategori, lokasi..." defaultPageSize={10}
              toolbar={canAdd && <Button size="sm" icon={<Plus />} onClick={openModal}>Tambah Aset</Button>}
              actions={(row) => (
                <div className="flex gap-1">
                  {canEdit && <button onClick={() => openEditAsset(row)} className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-blue-600 hover:bg-blue-50 transition-colors font-medium"><Pencil className="w-3.5 h-3.5" /> Edit</button>}
                  {canDelete && <button onClick={() => setDeleteItem(row)} className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-red-500 hover:bg-red-50 transition-colors font-medium"><Trash2 className="w-3.5 h-3.5" /> Hapus</button>}
                </div>
              )}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Jadwal Maintenance ── */}
      {activeTab === 'maintenance' && (
        <Card>
          <CardHeader><CardTitle>Jadwal Maintenance</CardTitle></CardHeader>
          <CardContent>
            <DataTable ref={maintRef} columns={maintColumns} fetchFn={assetApi.getMaintenance}
              searchPlaceholder="Cari aset, teknisi..." defaultPageSize={10}
              toolbar={canAdd && <Button size="sm" icon={<Plus />} onClick={openModal}>Buat Jadwal</Button>}
              actions={(row) => canEdit && row.status !== 'done' && (
                <button onClick={() => handleDone(row.id)} className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors font-medium">
                  <Check className="w-3.5 h-3.5" /> Selesai
                </button>
              )}
            />
          </CardContent>
        </Card>
      )}

      {/* ── PM Schedule ── */}
      {activeTab === 'pm' && (
        <Card>
          <CardHeader>
            <CardTitle>PM Schedule — Preventive Maintenance Berkala</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable ref={pmRef} columns={pmColumns} fetchFn={assetApi.getPMSchedules}
              searchPlaceholder="Cari aset, pekerjaan, teknisi..." defaultPageSize={10}
              toolbar={canAdd && <Button size="sm" icon={<Plus />} onClick={openModal}>Tambah PM</Button>}
              actions={(row) => (
                <div className="flex gap-1">
                  {canEdit && row.status !== 'done' && (
                    <button onClick={() => handlePMDone(row)} className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors font-medium">
                      <Check className="w-3.5 h-3.5" /> Selesai
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => handleDeletePM(row)} className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-red-500 hover:bg-red-50 transition-colors font-medium">
                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                    </button>
                  )}
                </div>
              )}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Spare Parts ── */}
      {activeTab === 'spareparts' && (
        <Card>
          <CardHeader><CardTitle>Inventori Spare Parts</CardTitle></CardHeader>
          <CardContent>
            <DataTable ref={spRef} columns={spColumns} fetchFn={assetApi.getSpareParts}
              searchPlaceholder="Cari kode part, nama, aset..." defaultPageSize={10}
              toolbar={canAdd && <Button size="sm" icon={<Plus />} onClick={openModal}>Tambah Part</Button>}
              actions={(row) => (
                <div className="flex gap-1">
                  {canEdit && <button onClick={() => openEditSP(row)} className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-blue-600 hover:bg-blue-50 transition-colors font-medium"><Pencil className="w-3.5 h-3.5" /> Edit</button>}
                  {canDelete && <button onClick={() => handleDeleteSP(row)} className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-red-500 hover:bg-red-50 transition-colors font-medium"><Trash2 className="w-3.5 h-3.5" /> Hapus</button>}
                </div>
              )}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Depresiasi & Disposal ── */}
      {activeTab === 'depreciation' && (
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Nilai Buku Aset (Book Value)</CardTitle>
                {canAdd && <Button size="sm" icon={<Calculator />} onClick={() => setShowCalcModal(true)}>Hitung Depresiasi</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                fetchFn={deprFetchFn}
                columns={depreciationColumns}
                searchPlaceholder="Cari nama aset, metode..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Riwayat Disposal Aset</CardTitle>
                {canAdd && <Button size="sm" variant="secondary" icon={<TrendingDown />} onClick={() => setShowDisposalModal(true)}>Catat Disposal</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <DataTable ref={disposalRef} columns={disposalColumns} fetchFn={assetApi.getDisposals}
                searchPlaceholder="Cari nama aset, tipe disposal..." defaultPageSize={10} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══ MODAL: Tambah/Edit Aset ══ */}
      <Modal open={(showModal && activeTab === 'assets') || !!editAsset}
        onClose={() => { setShowModal(false); setEditAsset(null); setAssetForm(emptyAsset) }}
        title={editAsset ? 'Edit Aset' : 'Tambah Aset Baru'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="No. Aset" placeholder="AST-006" value={assetForm.asset_number}
              onChange={e => setAssetForm({ ...assetForm, asset_number: e.target.value })} disabled={!!editAsset} />
            <Input label="Nama Aset" value={assetForm.name}
              onChange={e => setAssetForm({ ...assetForm, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Kategori" value={assetForm.category}
              onChange={e => setAssetForm({ ...assetForm, category: e.target.value })} />
            <Input label="Lokasi" value={assetForm.location}
              onChange={e => setAssetForm({ ...assetForm, location: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nilai (Rp)" type="number" value={assetForm.value}
              onChange={e => setAssetForm({ ...assetForm, value: e.target.value })} />
            <Select label="Kondisi" value={assetForm.condition}
              onChange={e => setAssetForm({ ...assetForm, condition: e.target.value })}
              options={[{ value: 'good', label: 'Baik' }, { value: 'fair', label: 'Cukup' }, { value: 'poor', label: 'Buruk' }]} />
          </div>
          <Input label="Jadwal Maintenance Berikutnya" type="date" value={assetForm.next_maintenance}
            onChange={e => setAssetForm({ ...assetForm, next_maintenance: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowModal(false); setEditAsset(null) }}>Batal</Button>
            <Button loading={savingAsset || updatingAsset}
              onClick={() => {
                const payload = { ...assetForm, value: parseInt(assetForm.value) || 0 }
                editAsset ? updateAssetFn(payload) : submitAsset(payload)
              }}>Simpan</Button>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL: Buat Jadwal Maintenance ══ */}
      <Modal open={showModal && activeTab === 'maintenance'}
        onClose={() => { setShowModal(false); setMaintForm(emptyMaint) }}
        title="Buat Jadwal Maintenance">
        <div className="space-y-4">
          <Input label="ID Aset" placeholder="AST-001" value={maintForm.asset_id}
            onChange={e => setMaintForm({ ...maintForm, asset_id: e.target.value })} />
          <Select label="Tipe Maintenance" value={maintForm.type}
            onChange={e => setMaintForm({ ...maintForm, type: e.target.value })}
            options={['Preventive', 'Corrective', 'Inspection', 'Overhaul'].map(t => ({ value: t, label: t }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tanggal Dijadwalkan" type="date" value={maintForm.scheduled_date}
              onChange={e => setMaintForm({ ...maintForm, scheduled_date: e.target.value })} />
            <Input label="Teknisi" placeholder="Nama teknisi" value={maintForm.technician}
              onChange={e => setMaintForm({ ...maintForm, technician: e.target.value })} />
          </div>
          <Input label="Catatan" placeholder="Deskripsi pekerjaan" value={maintForm.notes}
            onChange={e => setMaintForm({ ...maintForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button>
            <Button loading={savingMaint} onClick={() => submitMaint(maintForm)}>Simpan</Button>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL: Tambah PM Schedule ══ */}
      <Modal open={showModal && activeTab === 'pm'}
        onClose={() => { setShowModal(false); setPmForm(emptyPM) }}
        title="Tambah PM Schedule">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="ID Aset" placeholder="1" value={pmForm.asset_id}
              onChange={e => setPmForm({ ...pmForm, asset_id: e.target.value })} />
            <Input label="Nama Aset" placeholder="Mesin CNC Milling" value={pmForm.asset_name}
              onChange={e => setPmForm({ ...pmForm, asset_name: e.target.value })} />
          </div>
          <Input label="Nama Pekerjaan PM" placeholder="Ganti Oli Spindle" value={pmForm.name}
            onChange={e => setPmForm({ ...pmForm, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Tipe Interval" value={pmForm.type}
              onChange={e => setPmForm({ ...pmForm, type: e.target.value })}
              options={[{ value: 'calendar', label: 'Kalender (hari)' }, { value: 'meter', label: 'Meter / Jam Operasi' }]} />
            <Input label="Interval (hari)" type="number" value={pmForm.interval_days}
              onChange={e => setPmForm({ ...pmForm, interval_days: parseInt(e.target.value) || 30 })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Terakhir Dikerjakan" type="date" value={pmForm.last_done}
              onChange={e => setPmForm({ ...pmForm, last_done: e.target.value })} />
            <Input label="Teknisi PIC" placeholder="Nama teknisi" value={pmForm.technician}
              onChange={e => setPmForm({ ...pmForm, technician: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button>
            <Button loading={savingPM} onClick={() => submitPM(pmForm)}>Simpan</Button>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL: Tambah/Edit Spare Part ══ */}
      <Modal open={showModal && activeTab === 'spareparts'}
        onClose={() => { setShowModal(false); setEditSP(null); setSpForm(emptySP) }}
        title={editSP ? 'Edit Spare Part' : 'Tambah Spare Part'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="ID Aset" placeholder="1" value={spForm.asset_id}
              onChange={e => setSpForm({ ...spForm, asset_id: e.target.value })} />
            <Input label="Nama Aset" placeholder="Mesin CNC Milling" value={spForm.asset_name}
              onChange={e => setSpForm({ ...spForm, asset_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Kode Part" placeholder="SP-006" value={spForm.part_code}
              onChange={e => setSpForm({ ...spForm, part_code: e.target.value })} />
            <Input label="Nama Part" placeholder="Bearing 6205-2RS" value={spForm.name}
              onChange={e => setSpForm({ ...spForm, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Stok" type="number" value={spForm.qty}
              onChange={e => setSpForm({ ...spForm, qty: e.target.value })} />
            <Select label="Satuan" value={spForm.unit}
              onChange={e => setSpForm({ ...spForm, unit: e.target.value })}
              options={['pcs', 'set', 'ltr', 'kg', 'm', 'roll'].map(u => ({ value: u, label: u }))} />
            <Input label="Min. Stok" type="number" value={spForm.min_stock}
              onChange={e => setSpForm({ ...spForm, min_stock: e.target.value })} />
          </div>
          <Input label="Harga/Unit (Rp)" type="number" value={spForm.unit_cost}
            onChange={e => setSpForm({ ...spForm, unit_cost: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowModal(false); setEditSP(null) }}>Batal</Button>
            <Button loading={savingSP || updatingSP}
              onClick={() => {
                const payload = { ...spForm, qty: parseInt(spForm.qty) || 0, unit_cost: parseFloat(spForm.unit_cost) || 0, min_stock: parseInt(spForm.min_stock) || 0 }
                editSP ? updateSPFn(payload) : submitSP(payload)
              }}>Simpan</Button>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL: Hitung Depresiasi ══ */}
      <Modal open={showCalcModal} onClose={() => setShowCalcModal(false)} title="Hitung Depresiasi Bulanan">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Hitung dan posting depresiasi untuk semua aset aktif pada periode yang dipilih.</p>
          <Input label="Periode (bulan)" type="month" value={calcForm.period}
            onChange={e => setCalcForm({ ...calcForm, period: e.target.value })} />
          <Select label="Metode Depresiasi" value={calcForm.method}
            onChange={e => setCalcForm({ ...calcForm, method: e.target.value })}
            options={[
              { value: 'straight_line', label: 'Garis Lurus (Straight Line)' },
              { value: 'double_declining', label: 'Saldo Menurun Ganda (DDB)' },
            ]} />
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
            <strong>Asumsi:</strong> Umur ekonomis 10 tahun, nilai residu 10% dari nilai perolehan.
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCalcModal(false)}>Batal</Button>
            <Button loading={calculating} icon={<Calculator />} onClick={() => submitCalc(calcForm)}>Hitung & Posting</Button>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL: Catat Disposal ══ */}
      <Modal open={showDisposalModal} onClose={() => setShowDisposalModal(false)} title="Catat Disposal Aset">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="ID Aset" placeholder="1" value={disposalForm.asset_id}
              onChange={e => setDisposalForm({ ...disposalForm, asset_id: e.target.value })} />
            <Input label="Nama Aset" placeholder="Printer HP LaserJet" value={disposalForm.asset_name}
              onChange={e => setDisposalForm({ ...disposalForm, asset_name: e.target.value })} />
          </div>
          <Select label="Tipe Disposal" value={disposalForm.disposal_type}
            onChange={e => setDisposalForm({ ...disposalForm, disposal_type: e.target.value })}
            options={[
              { value: 'sale', label: 'Penjualan' },
              { value: 'write_off', label: 'Hapus Buku (Write-off)' },
              { value: 'transfer', label: 'Transfer / Hibah' },
            ]} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Harga Jual (Rp)" type="number" value={disposalForm.sale_price}
              onChange={e => setDisposalForm({ ...disposalForm, sale_price: e.target.value })} />
            <Input label="Nilai Buku (Rp)" type="number" value={disposalForm.book_value}
              onChange={e => setDisposalForm({ ...disposalForm, book_value: e.target.value })} />
          </div>
          {(disposalForm.sale_price || disposalForm.book_value) && (
            <div className={`rounded-lg px-4 py-3 text-sm font-semibold ${(parseFloat(disposalForm.sale_price || 0) - parseFloat(disposalForm.book_value || 0)) >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {(parseFloat(disposalForm.sale_price || 0) - parseFloat(disposalForm.book_value || 0)) >= 0 ? 'Keuntungan' : 'Kerugian'}: {formatCurrency(Math.abs(parseFloat(disposalForm.sale_price || 0) - parseFloat(disposalForm.book_value || 0)))}
            </div>
          )}
          <Input label="Tanggal Disposal" type="date" value={disposalForm.disposal_date}
            onChange={e => setDisposalForm({ ...disposalForm, disposal_date: e.target.value })} />
          <Input label="Catatan" placeholder="Keterangan disposal" value={disposalForm.notes}
            onChange={e => setDisposalForm({ ...disposalForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowDisposalModal(false)}>Batal</Button>
            <Button loading={savingDisposal}
              onClick={() => submitDisposal({
                ...disposalForm,
                sale_price: parseFloat(disposalForm.sale_price) || 0,
                book_value: parseFloat(disposalForm.book_value) || 0,
              })}>Catat Disposal</Button>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL: Konfirmasi Hapus Aset ══ */}
      <Modal open={!!deleteItem} onClose={() => setDeleteItem(null)} title="Konfirmasi Hapus Aset">
        <p className="text-sm text-gray-600 mb-4">
          Hapus aset <strong>{deleteItem?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteItem(null)}>Batal</Button>
          <Button variant="danger" onClick={handleDeleteAsset}>Hapus</Button>
        </div>
      </Modal>
    </div>
  )
}
