import { useRef, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DataTable from '@/components/ui/DataTable'
import StatCard from '@/components/ui/StatCard'
import {
  Receipt, FileText, Users, Shield, Settings, Plus, Trash2, Calculator,
  TrendingUp, TrendingDown, Minus, Hash, FileCheck, Send, Download,
  Cloud, CheckCircle2, XCircle, AlertTriangle, RefreshCw
} from 'lucide-react'
import { taxApi, taxEfakturApi } from '@/api'
import { useApi, useSubmit } from '@/hooks/useApi'
import { formatCurrency } from '@/utils/format'
import toast from 'react-hot-toast'

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PTKP_OPTIONS = [
  { value: 'TK/0', label: 'TK/0 â€” Tidak Kawin, 0 Tanggungan (Rp 54 jt)' },
  { value: 'TK/1', label: 'TK/1 â€” Tidak Kawin, 1 Tanggungan (Rp 58,5 jt)' },
  { value: 'TK/2', label: 'TK/2 â€” Tidak Kawin, 2 Tanggungan (Rp 63 jt)' },
  { value: 'TK/3', label: 'TK/3 â€” Tidak Kawin, 3 Tanggungan (Rp 67,5 jt)' },
  { value: 'K/0',  label: 'K/0  â€” Kawin, 0 Tanggungan (Rp 58,5 jt)' },
  { value: 'K/1',  label: 'K/1  â€” Kawin, 1 Tanggungan (Rp 63 jt)' },
  { value: 'K/2',  label: 'K/2  â€” Kawin, 2 Tanggungan (Rp 67,5 jt)' },
  { value: 'K/3',  label: 'K/3  â€” Kawin, 3 Tanggungan (Rp 72 jt)' },
]

const JENIS_PENGHASILAN = [
  { value: 'Jasa Teknik', label: 'Jasa Teknik' },
  { value: 'Jasa Manajemen', label: 'Jasa Manajemen' },
  { value: 'Jasa Konsultasi', label: 'Jasa Konsultasi' },
  { value: 'Sewa', label: 'Sewa' },
  { value: 'Bunga', label: 'Bunga' },
  { value: 'Dividen', label: 'Dividen' },
  { value: 'Lainnya', label: 'Lainnya' },
]

const TARIF_PPH23 = [
  { value: '2', label: '2% â€” Jasa' },
  { value: '15', label: '15% â€” Dividen / Bunga / Royalti' },
]

const thisMonth = () => new Date().toISOString().slice(0, 7)

function statusBadge(s) {
  if (s === 'paid') return <Badge variant="success">Lunas</Badge>
  if (s === 'partial') return <Badge variant="info">Parsial</Badge>
  if (s === 'unpaid') return <Badge variant="warning">Belum Bayar</Badge>
  return <Badge>{s}</Badge>
}

// â”€â”€â”€ Tab: PPN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PPNTab() {
  const [period, setPeriod] = useState(thisMonth())
  const keluaranRef = useRef()
  const masukanRef = useRef()

  const { data: rekapData } = useApi(() => taxApi.getRekapPPN({ period }), [period])
  const rekap = rekapData?.selisih !== undefined ? rekapData : (rekapData?.value?.[0] || null)

  const fkColumns = [
    { key: 'inv_number', label: 'No. Invoice', sortable: true, render: v => <span className="font-mono font-semibold text-indigo-600">{v}</span> },
    { key: 'customer_name', label: 'Customer', sortable: true },
    { key: 'date', label: 'Tanggal', sortable: true },
    { key: 'subtotal', label: 'DPP', render: v => formatCurrency(v) },
    { key: 'tax_amount', label: 'PPN', render: v => <span className="font-semibold text-emerald-700">{formatCurrency(v)}</span> },
    { key: 'total', label: 'Total', render: v => <span className="font-semibold">{formatCurrency(v)}</span> },
    { key: 'status', label: 'Status', render: v => statusBadge(v) },
  ]

  const fmColumns = [
    { key: 'vi_number', label: 'No. VI', sortable: true, render: v => <span className="font-mono font-semibold text-violet-600">{v}</span> },
    { key: 'vendor_name', label: 'Vendor', sortable: true },
    { key: 'inv_date', label: 'Tanggal', sortable: true },
    { key: 'subtotal', label: 'DPP', render: v => formatCurrency(v) },
    { key: 'tax_amount', label: 'PPN Masukan', render: v => <span className="font-semibold text-amber-700">{formatCurrency(v)}</span> },
    { key: 'total', label: 'Total', render: v => <span className="font-semibold">{formatCurrency(v)}</span> },
    { key: 'status', label: 'Status', render: v => statusBadge(v) },
  ]

  const selisih = rekap ? rekap.selisih ?? (rekap.total_pk - rekap.total_pm) : 0
  const isLebih = selisih < 0

  return (
    <div className="space-y-6">
      {/* Period picker + rekap */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Periode:</label>
              <input
                type="month"
                value={period}
                onChange={e => setPeriod(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            {rekap && (
              <div className="flex flex-wrap gap-4 ml-auto text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-700" />
                  <span className="text-slate-400">PPN Keluaran:</span>
                  <span className="font-semibold text-emerald-700">{formatCurrency(rekap.total_pk)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-amber-700" />
                  <span className="text-slate-400">PPN Masukan:</span>
                  <span className="font-semibold text-amber-700">{formatCurrency(rekap.total_pm)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Minus className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400">Selisih:</span>
                  <span className={`font-bold ${isLebih ? 'text-blue-600' : 'text-rose-600'}`}>
                    {formatCurrency(Math.abs(selisih))}
                  </span>
                  {isLebih
                    ? <Badge variant="info">Lebih Bayar</Badge>
                    : <Badge variant="danger">Kurang Bayar</Badge>}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Faktur Keluaran */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-700" />
            Faktur Pajak Keluaran (ke Customer)
          </h3>
          <DataTable
            ref={keluaranRef}
            columns={fkColumns}
            fetchFn={() => taxApi.getFakturKeluaran()}
            searchPlaceholder="Cari invoice..."
          />
        </CardContent>
      </Card>

      {/* Faktur Masukan */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-amber-700" />
            Faktur Pajak Masukan (dari Vendor)
          </h3>
          <DataTable
            ref={masukanRef}
            columns={fmColumns}
            fetchFn={() => taxApi.getFakturMasukan()}
            searchPlaceholder="Cari vendor invoice..."
          />
        </CardContent>
      </Card>
    </div>
  )
}

// â”€â”€â”€ Tab: PPh 21 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PPh21Tab() {
  const [period, setPeriod] = useState(thisMonth())
  const [ptkpDefault, setPtkpDefault] = useState('TK/0')
  const tableRef = useRef()
  const { submit, loading } = useSubmit()

  const { data, refetch } = useApi(() => taxApi.getPPh21({ period }), [period])
  const list = data?.value || []
  const totalPPh21 = list.reduce((s, r) => s + (r.pph21_sebulan || 0), 0)

  const handleGenerate = async () => {
    const ok = await submit(() => taxApi.generatePPh21({ period, ptkp_default: ptkpDefault }))
    if (ok) {
      toast.success('PPh 21 berhasil dihitung')
      refetch()
    }
  }

  const handleDelete = async (row) => {
    if (!confirm(`Hapus PPh 21 ${row.employee_name}?`)) return
    const ok = await submit(() => taxApi.deletePPh21(row.id))
    if (ok) { toast.success('Dihapus'); refetch() }
  }

  const columns = [
    { key: 'employee_name', label: 'Nama Karyawan', sortable: true, render: v => <span className="font-medium">{v}</span> },
    { key: 'bruto_gaji', label: 'Gaji Bruto/bln', render: v => formatCurrency(v) },
    { key: 'ptkp_status', label: 'PTKP', render: v => <Badge variant="info">{v}</Badge> },
    { key: 'ptkp_amount', label: 'Nilai PTKP/thn', render: v => formatCurrency(v) },
    { key: 'pkp', label: 'PKP/thn', render: v => formatCurrency(v) },
    { key: 'pph21_sebulan', label: 'PPh 21/bln', sortable: true, render: v => <span className="font-semibold text-rose-600">{formatCurrency(v)}</span> },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <button onClick={() => handleDelete(row)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-400/10 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )
    },
  ]

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Periode</label>
              <input
                type="month"
                value={period}
                onChange={e => setPeriod(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="min-w-[280px]">
              <label className="block text-xs text-slate-400 mb-1">PTKP Default</label>
              <Select
                value={ptkpDefault}
                onChange={e => setPtkpDefault(e.target.value)}
                options={PTKP_OPTIONS}
              />
            </div>
            <Button onClick={handleGenerate} loading={loading} icon={Calculator}>
              Hitung PPh 21
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <DataTable
            ref={tableRef}
            columns={columns}
            fetchFn={() => taxApi.getPPh21({ period })}
            searchPlaceholder="Cari karyawan..."
          />
          {list.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
              <div className="text-sm text-slate-400">
                Total PPh 21 disetor:&nbsp;
                <span className="font-bold text-rose-600 text-base">{formatCurrency(totalPPh21)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// â”€â”€â”€ Tab: PPh 23 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PPh23Tab() {
  const [period, setPeriod] = useState(thisMonth())
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ vendor_name: '', npwp: '', period: thisMonth(), jenis_penghasilan: 'Jasa Teknik', bruto: '', tarif: '2', notes: '' })
  const tableRef = useRef()
  const { submit, loading } = useSubmit()

  const { data, refetch } = useApi(() => taxApi.getPPh23({ period }), [period])
  const list = data?.value || []
  const totalPPh23 = list.reduce((s, r) => s + (r.pph23 || 0), 0)
  const totalBruto = list.reduce((s, r) => s + (r.bruto || 0), 0)

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const pph23Preview = Math.round(Number(form.bruto || 0) * Number(form.tarif) / 100)

  const handleSave = async () => {
    if (!form.vendor_name || !form.bruto) { toast.error('Nama vendor dan bruto wajib diisi'); return }
    const ok = await submit(() => taxApi.createPPh23({ ...form, bruto: Number(form.bruto), tarif: Number(form.tarif) }))
    if (ok) {
      toast.success('PPh 23 dicatat')
      setShowModal(false)
      setForm({ vendor_name: '', npwp: '', period: thisMonth(), jenis_penghasilan: 'Jasa Teknik', bruto: '', tarif: '2', notes: '' })
      refetch()
    }
  }

  const handleDelete = async (row) => {
    if (!confirm(`Hapus PPh 23 ${row.bukti_number}?`)) return
    const ok = await submit(() => taxApi.deletePPh23(row.id))
    if (ok) { toast.success('Dihapus'); refetch() }
  }

  const columns = [
    { key: 'bukti_number', label: 'Bukti Potong', sortable: true, render: v => <span className="font-mono font-semibold text-indigo-600">{v}</span> },
    { key: 'vendor_name', label: 'Vendor', sortable: true },
    { key: 'npwp', label: 'NPWP', render: v => <span className="font-mono text-xs">{v || 'â€”'}</span> },
    { key: 'period', label: 'Periode' },
    { key: 'jenis_penghasilan', label: 'Jenis Penghasilan' },
    { key: 'bruto', label: 'Bruto', render: v => formatCurrency(v) },
    { key: 'tarif', label: 'Tarif', render: v => <Badge variant="info">{v}%</Badge> },
    { key: 'pph23', label: 'PPh 23', render: v => <span className="font-semibold text-rose-600">{formatCurrency(v)}</span> },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <button onClick={() => handleDelete(row)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-400/10 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-600">Periode:</label>
          <input
            type="month"
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>Tambah Pemotongan</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Transaksi" value={list.length} icon={FileText} />
        <StatCard label="Total Bruto" value={formatCurrency(totalBruto)} icon={TrendingUp} />
        <StatCard label="Total PPh 23 Dipotong" value={formatCurrency(totalPPh23)} icon={Receipt} />
      </div>

      <Card>
        <CardContent className="p-5">
          <DataTable
            ref={tableRef}
            columns={columns}
            fetchFn={() => taxApi.getPPh23({ period })}
            searchPlaceholder="Cari vendor / bukti potong..."
          />
        </CardContent>
      </Card>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Tambah Pemotongan PPh 23"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Batal</Button>
            <Button onClick={handleSave} loading={loading}>Simpan</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Nama Vendor *" value={form.vendor_name} onChange={e => f('vendor_name', e.target.value)} placeholder="PT Konsultan Teknologi" />
          <Input label="NPWP Vendor" value={form.npwp} onChange={e => f('npwp', e.target.value)} placeholder="01.234.567.8-901.000" />
          <div>
            <label className="block text-xs text-slate-400 mb-1">Periode *</label>
            <input
              type="month"
              value={form.period}
              onChange={e => f('period', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <Select
            label="Jenis Penghasilan"
            value={form.jenis_penghasilan}
            onChange={e => f('jenis_penghasilan', e.target.value)}
            options={JENIS_PENGHASILAN}
          />
          <Input
            label="Bruto (Rp) *"
            type="number"
            value={form.bruto}
            onChange={e => f('bruto', e.target.value)}
            placeholder="10000000"
          />
          <Select
            label="Tarif PPh 23"
            value={form.tarif}
            onChange={e => f('tarif', e.target.value)}
            options={TARIF_PPH23}
          />
          {form.bruto && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <p className="text-xs text-slate-400">PPh 23 yang dipotong:</p>
              <p className="text-lg font-bold text-rose-600">{formatCurrency(pph23Preview)}</p>
              <p className="text-xs text-slate-500 mt-1">{formatCurrency(Number(form.bruto))} Ã— {form.tarif}%</p>
            </div>
          )}
          <Input label="Catatan" value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Keterangan tambahan..." />
        </div>
      </Modal>
    </div>
  )
}

// â”€â”€â”€ Tab: BPJS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function BPJSTab() {
  const [period, setPeriod] = useState(thisMonth())
  const tableRef = useRef()
  const { submit, loading } = useSubmit()

  const { data, refetch } = useApi(() => taxApi.getBPJS({ period }), [period])
  const list = data?.value || []
  const totalEE = list.reduce((s, r) => s + (r.total_potongan_employee || 0), 0)
  const totalER = list.reduce((s, r) => s + (r.total_iuran_company || 0), 0)

  const handleGenerate = async () => {
    const ok = await submit(() => taxApi.generateBPJS({ period }))
    if (ok) { toast.success('BPJS berhasil dihitung'); refetch() }
  }

  const handleDelete = async (row) => {
    if (!confirm(`Hapus BPJS ${row.employee_name}?`)) return
    const ok = await submit(() => taxApi.deleteBPJS(row.id))
    if (ok) { toast.success('Dihapus'); refetch() }
  }

  const columns = [
    { key: 'employee_name', label: 'Nama Karyawan', sortable: true, render: v => <span className="font-medium">{v}</span> },
    { key: 'gaji_pokok', label: 'Gaji Pokok', render: v => formatCurrency(v) },
    {
      key: 'jht_employee', label: 'JHT (EE/ER)',
      render: (v, row) => <span className="text-xs">{formatCurrency(v)} / {formatCurrency(row.jht_company)}</span>
    },
    {
      key: 'jp_employee', label: 'JP (EE/ER)',
      render: (v, row) => <span className="text-xs">{formatCurrency(v)} / {formatCurrency(row.jp_company)}</span>
    },
    { key: 'jkk', label: 'JKK', render: v => <span className="text-xs">{formatCurrency(v)}</span> },
    { key: 'jkm', label: 'JKM', render: v => <span className="text-xs">{formatCurrency(v)}</span> },
    {
      key: 'kesehatan_employee', label: 'Kesehatan (EE/ER)',
      render: (v, row) => <span className="text-xs">{formatCurrency(v)} / {formatCurrency(row.kesehatan_company)}</span>
    },
    { key: 'total_potongan_employee', label: 'Total Potongan', sortable: true, render: v => <span className="font-semibold text-rose-600">{formatCurrency(v)}</span> },
    { key: 'total_iuran_company', label: 'Iuran Perusahaan', render: v => <span className="font-semibold text-amber-700">{formatCurrency(v)}</span> },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <button onClick={() => handleDelete(row)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-400/10 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )
    },
  ]

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Periode</label>
              <input
                type="month"
                value={period}
                onChange={e => setPeriod(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <Button onClick={handleGenerate} loading={loading} icon={Calculator}>
              Hitung BPJS
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Karyawan" value={list.length} icon={Users} />
        <StatCard label="Total Potongan Karyawan" value={formatCurrency(totalEE)} icon={TrendingDown} />
        <StatCard label="Total Iuran Perusahaan" value={formatCurrency(totalER)} icon={Shield} />
      </div>

      <Card>
        <CardContent className="p-5">
          <DataTable
            ref={tableRef}
            columns={columns}
            fetchFn={() => taxApi.getBPJS({ period })}
            searchPlaceholder="Cari karyawan..."
          />
          {list.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap gap-6 justify-end text-sm text-slate-400">
              <span>Total Potongan Karyawan: <strong className="text-rose-600">{formatCurrency(totalEE)}</strong></span>
              <span>Total Iuran Perusahaan: <strong className="text-amber-700">{formatCurrency(totalER)}</strong></span>
              <span>Grand Total BPJS: <strong className="text-slate-800">{formatCurrency(totalEE + totalER)}</strong></span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// â”€â”€â”€ Tab: Konfigurasi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// ─── Tab: NSFP ────────────────────────────────────────────────────────────────

function statusBadgeNSFP(s) {
  return ({ active: <Badge variant="success">Aktif</Badge>, ready: <Badge variant="info">Siap Pakai</Badge>, exhausted: <Badge variant="default">Habis</Badge> })[s] || <Badge>{s}</Badge>
}

const nsfpBlockColumns = [
  { key: 'prefix', label: 'Prefix', render: v => <span className="font-mono font-semibold text-indigo-600">{v}</span> },
  { key: 'from_number', label: 'Nomor Awal', render: v => <span className="font-mono text-xs">{v}</span> },
  { key: 'to_number', label: 'Nomor Akhir', render: v => <span className="font-mono text-xs">{v}</span> },
  {
    key: 'used', label: 'Terpakai',
    render: (v, row) => (
      <div className="flex items-center gap-2">
        <div className="w-16 bg-slate-100 rounded-full h-1.5">
          <div className="h-1.5 rounded-full bg-indigo-400" style={{ width: `${row.remaining === 0 ? 100 : Math.round((v / (v + row.remaining)) * 100)}%` }} />
        </div>
        <span className="text-xs text-slate-500">{v}</span>
      </div>
    )
  },
  {
    key: 'remaining', label: 'Tersisa',
    render: v => <span className={`font-semibold ${v === 0 ? 'text-slate-400' : v < 20 ? 'text-amber-600' : 'text-emerald-600'}`}>{v}</span>
  },
  { key: 'year', label: 'Tahun' },
  { key: 'status', label: 'Status', render: v => statusBadgeNSFP(v) },
  { key: 'last_assigned', label: 'Terakhir Diassign', render: v => <span className="font-mono text-xs text-slate-500">{v || '—'}</span> },
]

function NSFPTab() {
  const { data: nsfpRaw, refetch } = useApi(taxEfakturApi.getNSFP)
  const blocks = nsfpRaw?.value || []
  const totalRemaining = nsfpRaw?.total_remaining || 0
  const currentNSFP = nsfpRaw?.current_nsfp || '—'
  const nextNSFP = nsfpRaw?.next_nsfp || '—'
  const alertThreshold = nsfpRaw?.alert_threshold || 20
  const isLow = totalRemaining <= alertThreshold

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ prefix: '010', from_number: '', to_number: '', year: new Date().getFullYear().toString() })

  const { submit, loading: importing } = useSubmit(taxEfakturApi.importNSFP, {
    successMsg: 'NSFP berhasil diimport',
    onSuccess: () => { setShowModal(false); setForm({ prefix: '010', from_number: '', to_number: '', year: new Date().getFullYear().toString() }); refetch() },
  })

  const blocksFetchFn = useCallback(async (params = {}) => {
    let filtered = [...blocks]
    const search = params['$search']?.toLowerCase()
    if (search) filtered = filtered.filter(row => Object.values(row).some(v => String(v ?? '').toLowerCase().includes(search)))
    const top = params['$top'] ?? 10, skip = params['$skip'] ?? 0
    return { '@odata.count': filtered.length, value: filtered.slice(skip, skip + top) }
  }, [blocks])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`rounded-xl border p-4 ${isLow ? 'border-amber-200 bg-amber-50' : 'border-emerald-100 bg-emerald-50'}`}>
          <div className={`text-2xl font-bold ${isLow ? 'text-amber-600' : 'text-emerald-700'}`}>{totalRemaining}</div>
          <div className={`text-xs font-medium mt-0.5 ${isLow ? 'text-amber-600' : 'text-emerald-600'}`}>
            NSFP Tersisa {isLow && <span className="ml-1 text-amber-500">⚠ Hampir Habis</span>}
          </div>
        </div>
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="text-sm font-bold font-mono text-indigo-700 truncate">{currentNSFP}</div>
          <div className="text-xs text-indigo-500 mt-0.5">Terakhir Digunakan</div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="text-sm font-bold font-mono text-slate-700 truncate">{nextNSFP}</div>
          <div className="text-xs text-slate-500 mt-0.5">NSFP Berikutnya</div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex flex-col justify-between">
          <div className="text-xs text-slate-500">Alert threshold: {alertThreshold} NSFP</div>
          <Button size="sm" onClick={() => setShowModal(true)} className="mt-2">
            <Plus className="w-3.5 h-3.5 mr-1" /> Import NSFP
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-slate-700 mb-4">Blok NSFP dari DJP</h3>
          <DataTable
            fetchFn={blocksFetchFn}
            columns={nsfpBlockColumns}
            searchPlaceholder="Cari prefix, nomor, tahun..."
          />
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Import NSFP dari DJP"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button>
            <Button onClick={() => {
              if (!form.from_number || !form.to_number) return toast.error('Nomor awal dan akhir wajib diisi')
              submit(form)
            }} disabled={importing}>{importing ? 'Mengimport...' : 'Import'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
            NSFP (Nomor Seri Faktur Pajak) diperoleh dari DJP melalui portal Coretax. Masukkan range nomor yang diberikan DJP.
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Prefix Kode Jenis Transaksi" value={form.prefix}
              onChange={e => setForm(f => ({ ...f, prefix: e.target.value }))} placeholder="010" />
            <Input label="Tahun Pajak" value={form.year}
              onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nomor Awal *" value={form.from_number} placeholder="00000201"
              onChange={e => setForm(f => ({ ...f, from_number: e.target.value }))} />
            <Input label="Nomor Akhir *" value={form.to_number} placeholder="00000300"
              onChange={e => setForm(f => ({ ...f, to_number: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Tab: e-Faktur ────────────────────────────────────────────────────────────

function EFakturTab() {
  const efakturRef = useRef(null)
  const [uploading, setUploading] = useState(null)
  const [period, setPeriod] = useState('2026-06')

  const statusBadgeEF = (s) => ({
    draft:    <Badge variant="default">Draft</Badge>,
    uploaded: <Badge variant="info">Diupload</Badge>,
    accepted: <Badge variant="success"><CheckCircle2 className="w-3 h-3 inline mr-1" />Diterima</Badge>,
    rejected: <Badge variant="danger"><XCircle className="w-3 h-3 inline mr-1" />Ditolak</Badge>,
  })[s] || <Badge>{s}</Badge>

  const handleUpload = async (id) => {
    setUploading(id)
    try {
      const res = await taxEfakturApi.uploadCoretax(id)
      toast.success(res.data.message)
      efakturRef.current?.refetch()
    } catch { toast.error('Gagal upload ke Coretax') }
    setUploading(null)
  }

  const handleDownloadXML = async (id, invNum) => {
    try {
      const res = await taxEfakturApi.getEFakturXML(id)
      const blob = new Blob([res.data], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const a = window.document.createElement('a')
      a.href = url; a.download = `efaktur_${invNum}.xml`; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Gagal download XML') }
  }

  const handleExportCSV = async () => {
    try {
      const res = await taxEfakturApi.exportEFakturCSV({ period })
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = window.document.createElement('a')
      a.href = url; a.download = `efaktur_${period.replace('-','_')}.csv`; a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV e-Faktur berhasil diexport')
    } catch { toast.error('Gagal export CSV') }
  }

  const columns = [
    { key: 'nsfp', label: 'NSFP', render: v => <span className="font-mono text-xs text-indigo-600 font-semibold">{v}</span> },
    { key: 'inv_number', label: 'No. Invoice', render: v => <span className="font-mono text-xs font-semibold">{v}</span> },
    { key: 'customer_name', label: 'Customer', sortable: true },
    { key: 'customer_npwp', label: 'NPWP Customer', render: v => <span className="font-mono text-xs">{v}</span> },
    { key: 'date', label: 'Tanggal', sortable: true },
    { key: 'dpp', label: 'DPP', render: v => <span className="text-xs">{formatCurrency(v)}</span> },
    { key: 'ppn', label: 'PPN', render: v => <span className="font-semibold text-emerald-700 text-xs">{formatCurrency(v)}</span> },
    { key: 'status', label: 'Status', render: v => statusBadgeEF(v) },
    { key: 'coretax_ref', label: 'Ref. Coretax', render: v => v ? <span className="font-mono text-xs text-slate-500">{v}</span> : <span className="text-slate-300">—</span> },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-slate-700">Faktur Pajak Keluaran</h3>
          <input type="month" value={period} onChange={e => setPeriod(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <Button variant="secondary" size="sm" onClick={handleExportCSV}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export CSV e-Faktur 3.2
        </Button>
      </div>
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <div>
          <strong>Format e-Faktur 3.2</strong> — CSV export kompatibel dengan aplikasi e-Faktur Desktop (fallback) dan upload langsung ke Coretax DJP.
          NSFP di-assign otomatis secara urut dari blok aktif.
        </div>
      </div>
      <Card>
        <CardContent className="p-5">
          <DataTable
            ref={efakturRef}
            fetchFn={taxEfakturApi.getEFaktur}
            columns={columns}
            actions={(row) => (
              <div className="flex gap-1">
                <button onClick={() => handleDownloadXML(row.id, row.inv_number)}
                  title="Download XML" className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                  <Download className="w-3.5 h-3.5" />
                </button>
                {(row.status === 'draft' || row.status === 'rejected') && (
                  <button onClick={() => handleUpload(row.id)} disabled={uploading === row.id}
                    title="Upload ke Coretax" className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                    {uploading === row.id
                      ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      : <Cloud className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab: SPT PPN ─────────────────────────────────────────────────────────────

function SPTPPNTab() {
  const [period, setPeriod] = useState('2026-06')
  const [sptData, setSptData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadSPT = async () => {
    setLoading(true)
    try {
      const res = await taxEfakturApi.getSPTPPN({ period })
      setSptData(res.data)
    } catch {}
    setLoading(false)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await taxEfakturApi.submitSPTPPN({ period })
      toast.success(res.data.message)
      setSptData(d => d ? { ...d, status: 'submitted', coretax_ref: res.data.coretax_ref } : d)
    } catch { toast.error('Gagal submit SPT') }
    setSubmitting(false)
  }

  const statusBadgeSPT = (s) => ({
    draft:     <Badge variant="default">Draft</Badge>,
    submitted: <Badge variant="info"><Cloud className="w-3 h-3 inline mr-1" />Disubmit</Badge>,
    accepted:  <Badge variant="success"><CheckCircle2 className="w-3 h-3 inline mr-1" />Diterima DJP</Badge>,
  })[s] || <Badge>{s}</Badge>

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-600">Masa Pajak:</label>
          <input type="month" value={period} onChange={e => setPeriod(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <Button size="sm" onClick={loadSPT} disabled={loading}>
          {loading ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Calculator className="w-3.5 h-3.5 mr-1" />}
          {loading ? 'Menghitung...' : 'Hitung SPT'}
        </Button>
      </div>

      {sptData && (
        <>
          {/* Status bar */}
          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <span className="text-sm font-semibold text-slate-700">SPT Masa PPN — {sptData.period}</span>
              {sptData.coretax_ref && <span className="ml-2 text-xs font-mono text-slate-400">{sptData.coretax_ref}</span>}
            </div>
            <div className="flex items-center gap-3">
              {statusBadgeSPT(sptData.status)}
              {sptData.status === 'draft' && (
                <Button size="sm" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                  {submitting ? 'Mensubmit...' : 'Submit ke Coretax DJP'}
                </Button>
              )}
            </div>
          </div>

          {/* PK vs PM summary */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: sptData.pk?.label, data: sptData.pk, color: 'border-emerald-200 bg-emerald-50', valueColor: 'text-emerald-700' },
              { label: sptData.pm?.label, data: sptData.pm, color: 'border-amber-200 bg-amber-50', valueColor: 'text-amber-700' },
            ].map(block => (
              <div key={block.label} className={`rounded-xl border p-5 ${block.color}`}>
                <h4 className="font-semibold text-slate-700 mb-3">{block.label}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Jumlah Faktur</span>
                    <span className="font-semibold">{block.data?.total_faktur}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total DPP</span>
                    <span className="font-semibold">{formatCurrency(block.data?.total_dpp)}</span>
                  </div>
                  <div className={`flex justify-between text-base font-bold pt-2 border-t border-current/20 ${block.valueColor}`}>
                    <span>Total PPN</span>
                    <span>{formatCurrency(block.data?.total_ppn)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Net PPN */}
          <div className={`p-5 rounded-xl border-2 ${sptData.ppn_kurang_bayar > 0 ? 'border-rose-300 bg-rose-50' : 'border-blue-300 bg-blue-50'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-lg font-black ${sptData.ppn_kurang_bayar > 0 ? 'text-rose-700' : 'text-blue-700'}`}>
                  {sptData.ppn_kurang_bayar > 0 ? 'PPN Kurang Bayar' : 'PPN Lebih Bayar (Kompensasi)'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">PPN Keluaran − PPN Masukan{sptData.kompensasi > 0 ? ' − Kompensasi' : ''}</p>
              </div>
              <p className={`text-3xl font-black ${sptData.ppn_kurang_bayar > 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                {formatCurrency(sptData.ppn_kurang_bayar || sptData.ppn_lebih_bayar)}
              </p>
            </div>
            {sptData.ppn_kurang_bayar > 0 && (
              <p className="text-xs text-rose-600 mt-2">
                Setor ke kas negara paling lambat tanggal 15 bulan berikutnya.
              </p>
            )}
          </div>

          {/* Detail table */}
          <Card>
            <CardContent className="p-5">
              <h4 className="font-semibold text-slate-700 mb-3">Rincian Faktur</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 text-slate-500 font-medium text-xs">Jenis</th>
                    <th className="text-left py-2 px-3 text-slate-500 font-medium text-xs">Referensi</th>
                    <th className="text-left py-2 px-3 text-slate-500 font-medium text-xs">Nama</th>
                    <th className="text-right py-2 px-3 text-slate-500 font-medium text-xs">DPP</th>
                    <th className="text-right py-2 px-3 text-slate-500 font-medium text-xs">PPN</th>
                  </tr>
                </thead>
                <tbody>
                  {sptData.detail?.map((r, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3">
                        {r.type === 'pk'
                          ? <Badge variant="success" size="sm">Keluaran</Badge>
                          : <Badge variant="warning" size="sm">Masukan</Badge>}
                      </td>
                      <td className="py-2 px-3 font-mono text-xs text-indigo-600">{r.nsfp || r.ref}</td>
                      <td className="py-2 px-3 text-slate-700">{r.customer || r.vendor}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(r.dpp)}</td>
                      <td className={`py-2 px-3 text-right font-semibold ${r.type === 'pk' ? 'text-emerald-600' : 'text-amber-600'}`}>{formatCurrency(r.ppn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {!sptData && !loading && (
        <div className="text-center py-12 text-slate-400">
          <Send className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Pilih masa pajak dan klik "Hitung SPT" untuk melihat rekap</p>
        </div>
      )}
    </div>
  )
}

function KonfigurasiTab() {
  const { data, refetch } = useApi(() => taxApi.getConfigs())
  const configs = data?.value || []
  const [edits, setEdits] = useState({})
  const { submit, loading } = useSubmit()

  const getValue = (key, defaultVal) => {
    if (edits[key] !== undefined) return edits[key]
    const cfg = configs.find(c => c.config_key === key)
    return cfg ? String(cfg.config_value) : String(defaultVal)
  }

  const CONFIG_ROWS = [
    { key: 'ppn_rate', label: 'Tarif PPN', desc: 'Pajak Pertambahan Nilai', default: 12 },
    { key: 'pph23_jasa', label: 'PPh 23 Jasa', desc: 'Pemotongan PPh 23 untuk Jasa', default: 2 },
    { key: 'pph23_dividen', label: 'PPh 23 Dividen/Bunga', desc: 'Pemotongan PPh 23 untuk Dividen & Bunga', default: 15 },
    { key: 'bpjs_jht_ee', label: 'BPJS JHT Karyawan', desc: 'Iuran Jaminan Hari Tua â€” Karyawan', default: 2 },
    { key: 'bpjs_jht_er', label: 'BPJS JHT Perusahaan', desc: 'Iuran Jaminan Hari Tua â€” Perusahaan', default: 3.7 },
    { key: 'bpjs_jp_ee', label: 'BPJS JP Karyawan', desc: 'Iuran Jaminan Pensiun â€” Karyawan', default: 1 },
    { key: 'bpjs_jp_er', label: 'BPJS JP Perusahaan', desc: 'Iuran Jaminan Pensiun â€” Perusahaan', default: 2 },
    { key: 'bpjs_jkk', label: 'BPJS JKK', desc: 'Jaminan Kecelakaan Kerja â€” Perusahaan', default: 0.24 },
    { key: 'bpjs_jkm', label: 'BPJS JKM', desc: 'Jaminan Kematian â€” Perusahaan', default: 0.3 },
    { key: 'bpjs_kes_ee', label: 'BPJS Kesehatan Karyawan', desc: 'Iuran BPJS Kesehatan â€” Karyawan', default: 1 },
    { key: 'bpjs_kes_er', label: 'BPJS Kesehatan Perusahaan', desc: 'Iuran BPJS Kesehatan â€” Perusahaan', default: 4 },
  ]

  const handleSave = async (row) => {
    const val = getValue(row.key, row.default)
    const ok = await submit(() => taxApi.upsertConfig({ config_key: row.key, config_value: Number(val), description: row.desc }))
    if (ok) { toast.success(`${row.label} disimpan`); refetch() }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="text-base font-semibold text-slate-700 mb-4">Konfigurasi Tarif Pajak & BPJS</h3>
        <div className="space-y-3">
          {CONFIG_ROWS.map(row => (
            <div key={row.key} className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700">{row.label}</p>
                <p className="text-xs text-slate-500">{row.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    value={getValue(row.key, row.default)}
                    onChange={e => setEdits(p => ({ ...p, [row.key]: e.target.value }))}
                    className="w-20 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-slate-400 text-sm">%</span>
                </div>
                <Button size="sm" onClick={() => handleSave(row)} loading={loading}>
                  Simpan
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TABS = [
  { id: 'ppn',     label: 'PPN',          icon: FileText },
  { id: 'pph21',   label: 'PPh 21',       icon: Users },
  { id: 'pph23',   label: 'PPh 23',       icon: Receipt },
  { id: 'bpjs',    label: 'BPJS',         icon: Shield },
  { id: 'nsfp',    label: 'NSFP',         icon: Hash },
  { id: 'efaktur', label: 'e-Faktur',     icon: FileCheck },
  { id: 'spt-ppn', label: 'SPT PPN',      icon: Send },
  { id: 'config',  label: 'Konfigurasi',  icon: Settings },
]

export default function Tax() {
  const [activeTab, setActiveTab] = useState('ppn')

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tax & Compliance</h1>
          <p className="text-sm text-slate-400 mt-0.5">PPN â€¢ PPh 21 â€¢ PPh 23 â€¢ BPJS Ketenagakerjaan & Kesehatan</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
          <Shield className="w-3.5 h-3.5" />
          Regulasi Indonesia 2024
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-slate-200 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'ppn'     && <PPNTab />}
      {activeTab === 'pph21'   && <PPh21Tab />}
      {activeTab === 'pph23'   && <PPh23Tab />}
      {activeTab === 'bpjs'    && <BPJSTab />}
      {activeTab === 'nsfp'    && <NSFPTab />}
      {activeTab === 'efaktur' && <EFakturTab />}
      {activeTab === 'spt-ppn' && <SPTPPNTab />}
      {activeTab === 'config'  && <KonfigurasiTab />}
    </div>
  )
}
