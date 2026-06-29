import { useRef, useState } from 'react'
import StatCard from '@/components/ui/StatCard'
import { Card, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DataTable from '@/components/ui/DataTable'
import {
  TrendingUp, Users, Truck, FileText, Plus, Check, X, Pencil,
  Trash2, PackageCheck, RotateCcw, Target, ArrowRight, RefreshCw,
  Phone, Mail, Calendar, MessageSquare, ClipboardList,
} from 'lucide-react'
import { salesApi, warehouseApi } from '@/api'
import { useApi, useSubmit } from '@/hooks/useApi'
import { formatCurrency, formatDate } from '@/utils/format'
import toast from 'react-hot-toast'

const today = () => new Date().toISOString().split('T')[0]

// ─── Status Badges ────────────────────────────────────────────────────────────

const soStatusBadge = (s) => ({
  draft:     <Badge variant="default">Draft</Badge>,
  confirmed: <Badge variant="info">Confirmed</Badge>,
  approved:  <Badge variant="warning">Approved</Badge>,
  delivered: <Badge variant="success">Delivered</Badge>,
  invoiced:  <Badge variant="success">Invoiced</Badge>,
  cancelled: <Badge variant="danger">Cancelled</Badge>,
})[s] || <Badge>{s}</Badge>

const doStatusBadge = (s) => ({
  draft:     <Badge variant="default">Draft</Badge>,
  confirmed: <Badge variant="success">Dikirim</Badge>,
})[s] || <Badge>{s}</Badge>

const invStatusBadge = (s) => ({
  draft:   <Badge variant="default">Draft</Badge>,
  unpaid:  <Badge variant="warning">Belum Bayar</Badge>,
  partial: <Badge variant="info">Parsial</Badge>,
  paid:    <Badge variant="success">Lunas</Badge>,
  overdue: <Badge variant="danger">Jatuh Tempo</Badge>,
})[s] || <Badge>{s}</Badge>

const quoStatusBadge = (s) => ({
  draft:     <Badge variant="default">Draft</Badge>,
  sent:      <Badge variant="info">Terkirim</Badge>,
  accepted:  <Badge variant="success">Diterima</Badge>,
  rejected:  <Badge variant="danger">Ditolak</Badge>,
  expired:   <Badge variant="default">Expired</Badge>,
  converted: <Badge variant="success">Converted</Badge>,
})[s] || <Badge>{s}</Badge>

const srStatusBadge = (s) => ({
  draft:     <Badge variant="default">Draft</Badge>,
  confirmed: <Badge variant="info">Confirmed</Badge>,
  processed: <Badge variant="success">Diproses</Badge>,
})[s] || <Badge>{s}</Badge>

// ─── Column Definitions ───────────────────────────────────────────────────────

const soColumns = [
  { key: 'so_number', label: 'No. SO', sortable: true, render: v => <span className="font-mono font-semibold text-indigo-600">{v}</span> },
  { key: 'customer_name', label: 'Customer', sortable: true },
  { key: 'date', label: 'Tanggal', sortable: true, render: v => v ? formatDate(v) : '—' },
  { key: 'delivery_date', label: 'Tgl Kirim', render: v => v ? formatDate(v) : '—' },
  { key: 'total', label: 'Total', sortable: true, render: v => <span className="font-semibold">{formatCurrency(v)}</span> },
  { key: 'status', label: 'Status', render: v => soStatusBadge(v) },
]

const doColumns = [
  { key: 'do_number', label: 'No. DO', sortable: true, render: v => <span className="font-mono font-semibold text-indigo-600">{v}</span> },
  { key: 'so_number', label: 'No. SO', sortable: true },
  { key: 'customer_name', label: 'Customer', sortable: true },
  { key: 'date', label: 'Tanggal', sortable: true, render: v => v ? formatDate(v) : '—' },
  { key: 'status', label: 'Status', render: v => doStatusBadge(v) },
]

const invColumns = [
  { key: 'inv_number', label: 'No. Invoice', sortable: true, render: v => <span className="font-mono font-semibold text-indigo-600">{v}</span> },
  { key: 'do_number', label: 'No. DO', sortable: true },
  { key: 'customer_name', label: 'Customer', sortable: true },
  { key: 'date', label: 'Tanggal', sortable: true, render: v => v ? formatDate(v) : '—' },
  { key: 'due_date', label: 'Jatuh Tempo', render: v => v ? formatDate(v) : '—' },
  { key: 'total', label: 'Total', sortable: true, render: v => <span className="font-semibold">{formatCurrency(v)}</span> },
  { key: 'status', label: 'Status', render: v => invStatusBadge(v) },
]

const customerColumns = [
  { key: 'code', label: 'Kode', sortable: true, render: v => <span className="font-mono text-xs">{v}</span> },
  { key: 'name', label: 'Nama Customer', sortable: true, render: v => <span className="font-medium">{v}</span> },
  { key: 'city', label: 'Kota', sortable: true },
  { key: 'phone', label: 'Telepon' },
  { key: 'email', label: 'Email', tdClassName: 'text-xs text-slate-500' },
  { key: 'category', label: 'Kategori', render: v => <Badge variant="info">{v}</Badge> },
  { key: 'credit_limit', label: 'Credit Limit', render: v => formatCurrency(v) },
  { key: 'payment_term', label: 'Term', render: v => `${v} hari` },
  { key: 'status', label: 'Status', render: v => v === 'active' ? <Badge variant="success">Aktif</Badge> : <Badge variant="default">Nonaktif</Badge> },
]

const quoColumns = [
  { key: 'quo_number', label: 'No. Quotation', sortable: true, render: v => <span className="font-mono font-semibold text-indigo-600">{v}</span> },
  { key: 'customer_name', label: 'Customer', sortable: true },
  { key: 'date', label: 'Tanggal', sortable: true, render: v => v ? formatDate(v) : '—' },
  { key: 'valid_until', label: 'Valid Hingga', render: v => v ? formatDate(v) : '—' },
  { key: 'total', label: 'Total', sortable: true, render: v => <span className="font-semibold">{formatCurrency(v)}</span> },
  { key: 'status', label: 'Status', render: v => quoStatusBadge(v) },
]

const srColumns = [
  { key: 'sr_number', label: 'No. Retur', sortable: true, render: v => <span className="font-mono font-semibold text-rose-600">{v}</span> },
  { key: 'so_number', label: 'No. SO', sortable: true },
  { key: 'customer_name', label: 'Customer', sortable: true },
  { key: 'date', label: 'Tanggal', sortable: true, render: v => v ? formatDate(v) : '—' },
  { key: 'total', label: 'Total Retur', render: v => formatCurrency(v) },
  { key: 'reason', label: 'Alasan', render: v => <span className="text-xs text-slate-500">{v}</span> },
  { key: 'status', label: 'Status', render: v => srStatusBadge(v) },
]

const activityColumns = [
  { key: 'lead_name', label: 'Lead / Perusahaan', sortable: true },
  { key: 'type', label: 'Tipe', render: v => {
    const icons = {
      call: <Phone className="w-3.5 h-3.5 text-emerald-500" />,
      email: <Mail className="w-3.5 h-3.5 text-blue-500" />,
      meeting: <Calendar className="w-3.5 h-3.5 text-purple-500" />,
      demo: <Target className="w-3.5 h-3.5 text-indigo-500" />,
      follow_up: <MessageSquare className="w-3.5 h-3.5 text-amber-500" />,
    }
    return <div className="flex items-center gap-1.5">{icons[v] || <MessageSquare className="w-3.5 h-3.5" />}<span className="capitalize text-xs">{v?.replace('_', ' ')}</span></div>
  }},
  { key: 'subject', label: 'Subjek', sortable: true },
  { key: 'date', label: 'Tanggal', sortable: true, render: v => v ? formatDate(v) : '—' },
  { key: 'result', label: 'Hasil', render: v => <span className="text-slate-500 text-xs">{v || '—'}</span> },
  { key: 'assigned_to', label: 'Sales', sortable: true },
]

// ─── Options ──────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: 'distributor', label: 'Distributor' }, { value: 'retailer', label: 'Retailer' },
  { value: 'regular', label: 'Regular' }, { value: 'export', label: 'Export' },
]
const STATUS_OPTIONS = [
  { value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' },
]
const UNIT_OPTIONS = [
  { value: 'pcs', label: 'pcs' }, { value: 'unit', label: 'unit' }, { value: 'kg', label: 'kg' },
  { value: 'ton', label: 'ton' }, { value: 'liter', label: 'liter' }, { value: 'm', label: 'm' },
  { value: 'm²', label: 'm²' }, { value: 'box', label: 'box' }, { value: 'set', label: 'set' },
]
const SO_STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Confirmed' }, { value: 'approved', label: 'Approved' }, { value: 'cancelled', label: 'Cancelled' },
]
const TERM_OPTIONS = [
  { value: '0', label: 'Cash (0 hari)' }, { value: '7', label: '7 hari' }, { value: '14', label: '14 hari' },
  { value: '30', label: '30 hari' }, { value: '45', label: '45 hari' }, { value: '60', label: '60 hari' },
]
const QUO_STATUS_OPTIONS = [
  { value: 'sent', label: 'Kirim ke Customer' }, { value: 'accepted', label: 'Diterima' },
  { value: 'rejected', label: 'Ditolak' }, { value: 'expired', label: 'Expired' },
]
const LEAD_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
const LEAD_STAGE_LABELS = {
  new: 'New', contacted: 'Contacted', qualified: 'Qualified',
  proposal: 'Proposal', negotiation: 'Negotiation', won: 'Won', lost: 'Lost',
}
const LEAD_STAGE_COLORS = {
  new: 'bg-slate-100 border-slate-300', contacted: 'bg-blue-50 border-blue-200',
  qualified: 'bg-cyan-50 border-cyan-200', proposal: 'bg-amber-50 border-amber-200',
  negotiation: 'bg-orange-50 border-orange-200', won: 'bg-emerald-50 border-emerald-200',
  lost: 'bg-rose-50 border-rose-200',
}
const LEAD_STAGE_HEADER = {
  new: 'bg-slate-200 text-slate-700', contacted: 'bg-blue-200 text-blue-800',
  qualified: 'bg-cyan-200 text-cyan-800', proposal: 'bg-amber-200 text-amber-800',
  negotiation: 'bg-orange-200 text-orange-800', won: 'bg-emerald-200 text-emerald-800',
  lost: 'bg-rose-200 text-rose-800',
}
const LEAD_SOURCE_OPTIONS = [
  { value: 'referral', label: 'Referral' }, { value: 'website', label: 'Website' },
  { value: 'cold_call', label: 'Cold Call' }, { value: 'exhibition', label: 'Exhibition' },
  { value: 'social_media', label: 'Social Media' }, { value: 'other', label: 'Lainnya' },
]
const ACTIVITY_TYPE_OPTIONS = [
  { value: 'call', label: 'Telepon' }, { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' }, { value: 'demo', label: 'Demo' },
  { value: 'follow_up', label: 'Follow Up' },
]
const emptyCustomer = { code: '', name: '', npwp: '', address: '', city: '', phone: '', email: '', credit_limit: '0', payment_term: '30', category: 'regular', status: 'active' }
const emptyLead = { name: '', contact: '', email: '', phone: '', value: '', stage: 'new', source: 'referral', assigned_to: '', notes: '' }
const emptyActivity = { lead_id: '', lead_name: '', type: 'call', subject: '', date: today(), result: '' }

// ─── Line Item Calculator ─────────────────────────────────────────────────────

const calcItem = (item, field, value) => {
  const updated = { ...item, [field]: value }
  const qty = parseFloat(updated.qty) || 0
  const price = parseFloat(updated.unit_price) || 0
  const disc = parseFloat(updated.discount) || 0
  updated.amount = Math.round(qty * price * (1 - disc / 100))
  return updated
}

// ─── TabQuotation ─────────────────────────────────────────────────────────────

function TabQuotation({ customerOptions, customers, productOptions }) {
  const quoRef = useRef(null)
  const [showQuoModal, setShowQuoModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [quoStatusTarget, setQuoStatusTarget] = useState({ id: '', status: '', quoNumber: '' })
  const [converting, setConverting] = useState(null)
  const [quoForm, setQuoForm] = useState({ customer_id: '', customer_name: '', date: today(), valid_until: '', notes: '' })
  const [quoItems, setQuoItems] = useState([{ product_name: '', qty: 1, unit: 'pcs', unit_price: 0, discount: 0, amount: 0 }])

  const { submit: submitQuo, loading: savingQuo } = useSubmit(salesApi.createQuotation, {
    successMsg: 'Quotation berhasil dibuat',
    onSuccess: () => {
      setShowQuoModal(false)
      setQuoForm({ customer_id: '', customer_name: '', date: today(), valid_until: '', notes: '' })
      setQuoItems([{ product_name: '', qty: 1, unit: 'pcs', unit_price: 0, discount: 0, amount: 0 }])
      quoRef.current?.refetch()
    },
  })

  const updateItem = (idx, field, value) => {
    setQuoItems(prev => prev.map((item, i) => i === idx ? calcItem(item, field, value) : item))
  }

  const subtotal = quoItems.reduce((a, i) => a + (parseFloat(i.amount) || 0), 0)
  const tax = Math.round(subtotal * 11 / 100)
  const total = subtotal + tax

  const handleUpdateStatus = async () => {
    try {
      await salesApi.updateQuotationStatus(quoStatusTarget.id, quoStatusTarget.status)
      toast.success('Status quotation diperbarui')
      setShowStatusModal(false)
      quoRef.current?.refetch()
    } catch { toast.error('Gagal update status') }
  }

  const handleConvert = async (row) => {
    setConverting(row.id)
    try {
      const res = await salesApi.convertQuotationToSO(row.id)
      toast.success(res?.data?.message || 'Dikonversi ke SO')
      quoRef.current?.refetch()
    } catch { toast.error('Gagal konversi ke SO') } finally { setConverting(null) }
  }

  return (
    <CardContent className="pt-4">
      <DataTable
        ref={quoRef}
        fetchFn={salesApi.getQuotations}
        columns={quoColumns}
        toolbar={
          <Button size="sm" onClick={() => setShowQuoModal(true)}>
            <Plus className="w-4 h-4 mr-1" /> Buat Quotation
          </Button>
        }
        actions={(row) => (
          <div className="flex gap-1">
            {row.status === 'draft' && (
              <button className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Kirim ke Customer"
                onClick={() => { setQuoStatusTarget({ id: row.id, status: 'sent', quoNumber: row.quo_number }); setShowStatusModal(true) }}>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {row.status === 'sent' && (
              <>
                <button className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Diterima"
                  onClick={() => { setQuoStatusTarget({ id: row.id, status: 'accepted', quoNumber: row.quo_number }); setShowStatusModal(true) }}>
                  <Check className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg" title="Ditolak"
                  onClick={() => { setQuoStatusTarget({ id: row.id, status: 'rejected', quoNumber: row.quo_number }); setShowStatusModal(true) }}>
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
            {row.status === 'accepted' && (
              <button className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Konversi ke SO"
                onClick={() => handleConvert(row)}>
                <RefreshCw className={`w-4 h-4 ${converting === row.id ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        )}
      />

      {/* Modal: Create Quotation */}
      <Modal open={showQuoModal} onClose={() => setShowQuoModal(false)} title="Buat Quotation" size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Customer *" placeholder="— Pilih Customer —" options={customerOptions}
              value={quoForm.customer_id}
              onChange={e => {
                const c = customers.find(x => x.id === e.target.value)
                if (c) setQuoForm(f => ({ ...f, customer_id: c.id, customer_name: c.name }))
              }} />
            <div className="flex flex-col gap-3">
              <Input label="Tanggal *" type="date" value={quoForm.date}
                onChange={e => setQuoForm(f => ({ ...f, date: e.target.value }))} />
              <Input label="Valid Hingga" type="date" value={quoForm.valid_until}
                onChange={e => setQuoForm(f => ({ ...f, valid_until: e.target.value }))} />
            </div>
          </div>
          <Input label="Catatan" value={quoForm.notes}
            onChange={e => setQuoForm(f => ({ ...f, notes: e.target.value }))} />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Item Penawaran *</label>
              <button className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                onClick={() => setQuoItems(p => [...p, { product_name: '', qty: 1, unit: 'pcs', unit_price: 0, discount: 0, amount: 0 }])}>
                <Plus className="w-3 h-3" /> Tambah Baris
              </button>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Produk</th>
                    <th className="px-3 py-2 text-right w-20">Qty</th>
                    <th className="px-3 py-2 text-left w-24">Satuan</th>
                    <th className="px-3 py-2 text-right w-36">Harga Satuan</th>
                    <th className="px-3 py-2 text-right w-20">Diskon%</th>
                    <th className="px-3 py-2 text-right w-36">Jumlah</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quoItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">
                        <select className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                          value={item.product_name} onChange={e => updateItem(idx, 'product_name', e.target.value)}>
                          <option value="">— Pilih Produk —</option>
                          {productOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          <option value="__custom__">Lainnya (ketik manual)</option>
                        </select>
                        {item.product_name === '__custom__' && (
                          <input className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none"
                            placeholder="Nama produk" onChange={e => updateItem(idx, 'product_name', e.target.value)} />
                        )}
                      </td>
                      <td className="px-3 py-2"><input type="number" min="0" className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-right focus:outline-none" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} /></td>
                      <td className="px-3 py-2">
                        <select className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none" value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)}>
                          {UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2"><input type="number" min="0" className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-right focus:outline-none" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} /></td>
                      <td className="px-3 py-2"><input type="number" min="0" max="100" className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-right focus:outline-none" value={item.discount} onChange={e => updateItem(idx, 'discount', e.target.value)} /></td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.amount || 0)}</td>
                      <td className="px-3 py-2">
                        {quoItems.length > 1 && <button className="text-rose-400 hover:text-rose-600" onClick={() => setQuoItems(p => p.filter((_, i) => i !== idx))}><X className="w-4 h-4" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-col items-end gap-1 text-sm">
              <div className="flex gap-8 text-slate-600"><span>Subtotal</span><span className="font-medium w-40 text-right">{formatCurrency(subtotal)}</span></div>
              <div className="flex gap-8 text-slate-600"><span>PPN 11%</span><span className="font-medium w-40 text-right">{formatCurrency(tax)}</span></div>
              <div className="flex gap-8 text-slate-800 font-bold border-t border-slate-200 pt-1"><span>Total</span><span className="w-40 text-right">{formatCurrency(total)}</span></div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowQuoModal(false)}>Batal</Button>
            <Button onClick={() => {
              if (!quoForm.customer_name) return toast.error('Pilih customer')
              if (quoItems.some(i => !i.product_name)) return toast.error('Nama produk wajib diisi')
              submitQuo({
                ...quoForm,
                items: quoItems.map(i => ({ ...i, qty: parseFloat(i.qty), unit_price: parseInt(i.unit_price), discount: parseFloat(i.discount || 0), amount: parseInt(i.amount) })),
              })
            }} loading={savingQuo}>Simpan Quotation</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Update Quo Status */}
      <Modal open={showStatusModal} onClose={() => setShowStatusModal(false)} title="Update Status Quotation">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Quotation <span className="font-semibold">{quoStatusTarget.quoNumber}</span></p>
          <Select label="Status Baru" options={QUO_STATUS_OPTIONS} value={quoStatusTarget.status}
            onChange={e => setQuoStatusTarget(s => ({ ...s, status: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowStatusModal(false)}>Batal</Button>
            <Button onClick={handleUpdateStatus}>Update</Button>
          </div>
        </div>
      </Modal>
    </CardContent>
  )
}

// ─── TabRetur ─────────────────────────────────────────────────────────────────

function TabRetur({ soList }) {
  const srRef = useRef(null)
  const [showSRModal, setShowSRModal] = useState(false)
  const [srForm, setSRForm] = useState({ so_id: '', so_number: '', customer_name: '', date: today(), reason: '' })
  const [srItems, setSRItems] = useState([{ product_name: '', qty_return: 1, unit: 'pcs' }])

  const soOptions = soList
    .filter(s => ['delivered', 'invoiced', 'approved'].includes(s.status))
    .map(s => ({ value: s.id, label: s.so_number + ' — ' + s.customer_name }))

  const { submit: submitSR, loading: savingSR } = useSubmit(salesApi.createSalesReturn, {
    successMsg: 'Retur berhasil dibuat',
    onSuccess: () => {
      setShowSRModal(false)
      setSRForm({ so_id: '', so_number: '', customer_name: '', date: today(), reason: '' })
      setSRItems([{ product_name: '', qty_return: 1, unit: 'pcs' }])
      srRef.current?.refetch()
    },
  })

  const handleConfirmSR = async (id) => {
    try {
      await salesApi.confirmSalesReturn(id)
      toast.success('Retur dikonfirmasi')
      srRef.current?.refetch()
    } catch { toast.error('Gagal konfirmasi retur') }
  }

  return (
    <CardContent className="pt-4">
      <DataTable
        ref={srRef}
        fetchFn={salesApi.getSalesReturns}
        columns={srColumns}
        toolbar={
          <Button size="sm" onClick={() => setShowSRModal(true)}>
            <Plus className="w-4 h-4 mr-1" /> Buat Retur
          </Button>
        }
        actions={(row) => (
          <div className="flex gap-1">
            {row.status === 'draft' && (
              <button className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Konfirmasi"
                onClick={() => handleConfirmSR(row.id)}>
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      />

      <Modal open={showSRModal} onClose={() => setShowSRModal(false)} title="Buat Retur Sales" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Sales Order *" placeholder="— Pilih SO —" options={soOptions}
              value={srForm.so_id}
              onChange={e => {
                const so = soList.find(s => s.id === e.target.value)
                if (so) setSRForm(f => ({ ...f, so_id: so.id, so_number: so.so_number, customer_name: so.customer_name }))
              }} />
            <Input label="Tanggal Retur *" type="date" value={srForm.date}
              onChange={e => setSRForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          {srForm.customer_name && (
            <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
              Customer: <span className="font-medium">{srForm.customer_name}</span>
            </div>
          )}
          <Input label="Alasan Retur *" value={srForm.reason}
            onChange={e => setSRForm(f => ({ ...f, reason: e.target.value }))}
            placeholder="Produk rusak / salah kirim / tidak sesuai spesifikasi" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Item Retur</label>
              <button className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                onClick={() => setSRItems(p => [...p, { product_name: '', qty_return: 1, unit: 'pcs' }])}>
                <Plus className="w-3 h-3" /> Tambah Baris
              </button>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Nama Produk</th>
                    <th className="px-3 py-2 text-right w-24">Qty Retur</th>
                    <th className="px-3 py-2 text-left w-24">Satuan</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {srItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">
                        <input className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none"
                          placeholder="Nama produk" value={item.product_name}
                          onChange={e => setSRItems(p => p.map((it, i) => i === idx ? { ...it, product_name: e.target.value } : it))} />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min="1" className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-right focus:outline-none"
                          value={item.qty_return}
                          onChange={e => setSRItems(p => p.map((it, i) => i === idx ? { ...it, qty_return: parseFloat(e.target.value) || 1 } : it))} />
                      </td>
                      <td className="px-3 py-2">
                        <select className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none"
                          value={item.unit} onChange={e => setSRItems(p => p.map((it, i) => i === idx ? { ...it, unit: e.target.value } : it))}>
                          {UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        {srItems.length > 1 && <button className="text-rose-400 hover:text-rose-600" onClick={() => setSRItems(p => p.filter((_, i) => i !== idx))}><X className="w-4 h-4" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowSRModal(false)}>Batal</Button>
            <Button onClick={() => {
              if (!srForm.so_id) return toast.error('Pilih Sales Order')
              if (!srForm.reason) return toast.error('Alasan retur wajib diisi')
              submitSR({ ...srForm, items: srItems })
            }} loading={savingSR}>Simpan Retur</Button>
          </div>
        </div>
      </Modal>
    </CardContent>
  )
}

// ─── TabCRM ───────────────────────────────────────────────────────────────────

function TabCRM() {
  const actRef = useRef(null)
  const [crmSub, setCrmSub] = useState('pipeline')
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [editLead, setEditLead] = useState(null)
  const [leadForm, setLeadForm] = useState(emptyLead)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [activityForm, setActivityForm] = useState(emptyActivity)

  const { data: leadsRaw, refetch: refetchLeads } = useApi(salesApi.getLeads)
  const leads = Array.isArray(leadsRaw?.value) ? leadsRaw.value : []
  const { data: stats } = useApi(salesApi.getCRMStats)

  const { submit: submitLead, loading: savingLead } = useSubmit(
    editLead ? (data) => salesApi.updateLead(editLead.id, data) : salesApi.createLead,
    {
      successMsg: editLead ? 'Lead diperbarui' : 'Lead ditambahkan',
      onSuccess: () => { setShowLeadModal(false); setEditLead(null); setLeadForm(emptyLead); refetchLeads() },
    }
  )

  const { submit: submitActivity, loading: savingActivity } = useSubmit(salesApi.createCRMActivity, {
    successMsg: 'Aktivitas berhasil dicatat',
    onSuccess: () => { setShowActivityModal(false); setActivityForm(emptyActivity); actRef.current?.refetch() },
  })

  const handleStageChange = async (lead, stage) => {
    try {
      await salesApi.updateLeadStage(lead.id, stage)
      toast.success(`${lead.name} → ${LEAD_STAGE_LABELS[stage]}`)
      refetchLeads()
    } catch { toast.error('Gagal update stage') }
  }

  const openEditLead = (lead) => {
    setEditLead(lead)
    setLeadForm({
      name: lead.name, contact: lead.contact, email: lead.email || '',
      phone: lead.phone || '', value: String(lead.value || ''),
      stage: lead.stage, source: lead.source || 'referral',
      assigned_to: lead.assigned_to || '', notes: lead.notes || '',
    })
    setShowLeadModal(true)
  }

  const leadsByStage = LEAD_STAGES.reduce((acc, s) => {
    acc[s] = leads.filter(l => l.stage === s)
    return acc
  }, {})

  return (
    <CardContent className="pt-4 space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-slate-100 pb-3">
        {[['pipeline', 'Pipeline Kanban'], ['activity', 'Log Aktivitas']].map(([id, label]) => (
          <button key={id} onClick={() => setCrmSub(id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${crmSub === id ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}>
            {label}
          </button>
        ))}
      </div>

      {crmSub === 'pipeline' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-indigo-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-indigo-700">{stats?.total_leads || 0}</p>
              <p className="text-xs text-slate-500">Total Lead</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-sm font-bold text-emerald-700">{formatCurrency(stats?.pipeline_value || 0)}</p>
              <p className="text-xs text-slate-500">Nilai Pipeline</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{stats?.won_this_month || 0}</p>
              <p className="text-xs text-slate-500">Won Bulan Ini</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{Number(stats?.conversion_rate || 0).toFixed(1)}%</p>
              <p className="text-xs text-slate-500">Conversion Rate</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditLead(null); setLeadForm(emptyLead); setShowLeadModal(true) }}>
              <Plus className="w-4 h-4 mr-1" /> Tambah Lead
            </Button>
          </div>

          {/* Kanban Board */}
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-3 min-w-max pb-4">
              {LEAD_STAGES.map(stage => (
                <div key={stage} className={`w-52 flex-shrink-0 rounded-xl border ${LEAD_STAGE_COLORS[stage]}`}>
                  <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl ${LEAD_STAGE_HEADER[stage]}`}>
                    <span className="text-xs font-semibold">{LEAD_STAGE_LABELS[stage]}</span>
                    <span className="text-xs font-bold bg-white/50 px-1.5 py-0.5 rounded-full">{leadsByStage[stage].length}</span>
                  </div>
                  <div className="p-2 space-y-2 min-h-[100px]">
                    {leadsByStage[stage].map(lead => (
                      <div key={lead.id} onClick={() => openEditLead(lead)}
                        className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <p className="font-semibold text-xs text-slate-800 leading-tight">{lead.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{lead.contact}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs font-bold text-emerald-600">{formatCurrency(lead.value || 0)}</span>
                          <button
                            onClick={e => { e.stopPropagation(); setActivityForm({ ...emptyActivity, lead_id: lead.id, lead_name: lead.name }); setShowActivityModal(true) }}
                            className="p-0.5 rounded text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                            title="Catat Aktivitas">
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{lead.assigned_to}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {crmSub === 'activity' && (
        <DataTable
          ref={actRef}
          fetchFn={salesApi.getCRMActivities}
          columns={activityColumns}
          toolbar={
            <Button size="sm" onClick={() => { setActivityForm(emptyActivity); setShowActivityModal(true) }}>
              <Plus className="w-4 h-4 mr-1" /> Catat Aktivitas
            </Button>
          }
        />
      )}

      {/* Modal: Add/Edit Lead */}
      <Modal open={showLeadModal} onClose={() => { setShowLeadModal(false); setEditLead(null) }}
        title={editLead ? 'Edit Lead' : 'Tambah Lead'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nama Perusahaan *" value={leadForm.name}
              onChange={e => setLeadForm(f => ({ ...f, name: e.target.value }))} />
            <Input label="Nama Kontak *" value={leadForm.contact}
              onChange={e => setLeadForm(f => ({ ...f, contact: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={leadForm.email}
              onChange={e => setLeadForm(f => ({ ...f, email: e.target.value }))} />
            <Input label="Telepon" value={leadForm.phone}
              onChange={e => setLeadForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Estimasi Nilai (Rp)" type="number" value={leadForm.value}
              onChange={e => setLeadForm(f => ({ ...f, value: e.target.value }))} />
            <Input label="Ditugaskan ke" value={leadForm.assigned_to}
              onChange={e => setLeadForm(f => ({ ...f, assigned_to: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Stage" options={LEAD_STAGES.map(s => ({ value: s, label: LEAD_STAGE_LABELS[s] }))}
              value={leadForm.stage} onChange={e => setLeadForm(f => ({ ...f, stage: e.target.value }))} />
            <Select label="Sumber" options={LEAD_SOURCE_OPTIONS}
              value={leadForm.source} onChange={e => setLeadForm(f => ({ ...f, source: e.target.value }))} />
          </div>
          <Input label="Catatan" value={leadForm.notes}
            onChange={e => setLeadForm(f => ({ ...f, notes: e.target.value }))} />
          {editLead && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">Pindah Stage</p>
              <div className="flex flex-wrap gap-1">
                {LEAD_STAGES.map(s => (
                  <button key={s} onClick={() => handleStageChange(editLead, s)}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                      editLead.stage === s
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}>{LEAD_STAGE_LABELS[s]}</button>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setShowLeadModal(false); setEditLead(null) }}>Batal</Button>
            <Button onClick={() => {
              if (!leadForm.name) return toast.error('Nama perusahaan wajib diisi')
              if (!leadForm.contact) return toast.error('Nama kontak wajib diisi')
              submitLead({ ...leadForm, value: parseFloat(leadForm.value) || 0 })
            }} loading={savingLead}>{editLead ? 'Update' : 'Simpan'}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Add Activity */}
      <Modal open={showActivityModal} onClose={() => setShowActivityModal(false)} title="Catat Aktivitas CRM">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Tipe Aktivitas" options={ACTIVITY_TYPE_OPTIONS}
              value={activityForm.type} onChange={e => setActivityForm(f => ({ ...f, type: e.target.value }))} />
            <Input label="Tanggal *" type="date" value={activityForm.date}
              onChange={e => setActivityForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <Input label="Lead / Perusahaan" value={activityForm.lead_name}
            onChange={e => setActivityForm(f => ({ ...f, lead_name: e.target.value }))}
            placeholder="Nama perusahaan lead" />
          <Input label="Subjek *" value={activityForm.subject}
            onChange={e => setActivityForm(f => ({ ...f, subject: e.target.value }))} />
          <Input label="Hasil / Catatan" value={activityForm.result}
            onChange={e => setActivityForm(f => ({ ...f, result: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowActivityModal(false)}>Batal</Button>
            <Button onClick={() => {
              if (!activityForm.subject) return toast.error('Subjek wajib diisi')
              submitActivity(activityForm)
            }} loading={savingActivity}>Simpan</Button>
          </div>
        </div>
      </Modal>
    </CardContent>
  )
}

// ─── Main Sales Component ─────────────────────────────────────────────────────

export default function Sales() {
  const [activeTab, setActiveTab] = useState('so')

  const soRef   = useRef(null)
  const doRef   = useRef(null)
  const invRef  = useRef(null)
  const custRef = useRef(null)

  const [showSOModal, setShowSOModal]         = useState(false)
  const [showDOModal, setShowDOModal]         = useState(false)
  const [showInvModal, setShowInvModal]       = useState(false)
  const [showCustModal, setShowCustModal]     = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [deleteItem, setDeleteItem]           = useState(null)
  const [editCustomer, setEditCustomer]       = useState(null)

  const [soForm, setSOForm]   = useState({ customer_id: '', customer_name: '', date: today(), delivery_date: '', notes: '' })
  const [soItems, setSOItems] = useState([{ product_name: '', qty: 1, unit: 'pcs', unit_price: 0, discount: 0, amount: 0 }])
  const [doForm, setDOForm]   = useState({ so_id: '', so_number: '', customer_id: '', customer_name: '', date: today(), notes: '' })
  const [doItems, setDOItems] = useState([])
  const [invForm, setInvForm] = useState({ do_id: '', do_number: '', so_id: '', customer_id: '', customer_name: '', date: today(), due_date: '', subtotal: 0, tax_amount: 0, total: 0, notes: '' })
  const [custForm, setCustForm]     = useState(emptyCustomer)
  const [statusTarget, setStatusTarget] = useState({ id: '', status: '', soNumber: '' })

  const { data: customersRaw } = useApi(salesApi.getCustomers)
  const customers = Array.isArray(customersRaw?.value) ? customersRaw.value : []
  const customerOptions = customers.map(c => ({ value: c.id, label: `${c.code ? c.code + ' - ' : ''}${c.name}` }))

  const { data: soRaw } = useApi(salesApi.getSalesOrders)
  const soList = Array.isArray(soRaw?.value) ? soRaw.value : []
  const approvedSOOptions = soList.filter(s => s.status === 'approved').map(s => ({ value: s.id, label: s.so_number + ' — ' + s.customer_name }))

  const { data: doRaw } = useApi(salesApi.getDeliveryOrders)
  const doList = Array.isArray(doRaw?.value) ? doRaw.value : []
  const confirmedDOOptions = doList.filter(d => d.status === 'confirmed').map(d => ({ value: d.id, label: d.do_number + ' — ' + d.customer_name }))

  const { data: inventoryRaw } = useApi(warehouseApi.getInventory)
  const inventoryItems = Array.isArray(inventoryRaw?.value) ? inventoryRaw.value : []
  const productOptions = inventoryItems.map(i => ({ value: i.name, label: `${i.sku ? i.sku + ' - ' : ''}${i.name} (Stok: ${i.qty} ${i.unit})` }))

  const totalSO   = soList.length
  const pendingSO = soList.filter(s => ['draft', 'confirmed'].includes(s.status)).reduce((a, s) => a + (s.total || 0), 0)
  const totalDO   = doList.length
  const invRaw2   = useApi(salesApi.getInvoices)
  const invList   = Array.isArray(invRaw2?.data?.value) ? invRaw2.data.value : []
  const unpaidInv = invList.filter(i => i.status === 'unpaid' || i.status === 'partial').reduce((a, i) => a + ((i.total || 0) - (i.paid_amount || 0)), 0)

  const { submit: submitSO, loading: savingSO } = useSubmit(salesApi.createSalesOrder, {
    successMsg: 'Sales Order berhasil dibuat',
    onSuccess: () => {
      setShowSOModal(false)
      setSOForm({ customer_id: '', customer_name: '', date: today(), delivery_date: '', notes: '' })
      setSOItems([{ product_name: '', qty: 1, unit: 'pcs', unit_price: 0, discount: 0, amount: 0 }])
      soRef.current?.refetch()
    },
  })

  const { submit: submitDO, loading: savingDO } = useSubmit(salesApi.createDelivery, {
    successMsg: 'Delivery Order berhasil dibuat',
    onSuccess: () => {
      setShowDOModal(false)
      setDOForm({ so_id: '', so_number: '', customer_id: '', customer_name: '', date: today(), notes: '' })
      setDOItems([])
      doRef.current?.refetch()
      soRef.current?.refetch()
    },
  })

  const { submit: submitInv, loading: savingInv } = useSubmit(salesApi.createInvoice, {
    successMsg: 'Invoice berhasil dibuat',
    onSuccess: () => {
      setShowInvModal(false)
      setInvForm({ do_id: '', do_number: '', so_id: '', customer_id: '', customer_name: '', date: today(), due_date: '', subtotal: 0, tax_amount: 0, total: 0, notes: '' })
      invRef.current?.refetch()
      soRef.current?.refetch()
    },
  })

  const { submit: submitCust, loading: savingCust } = useSubmit(
    editCustomer ? (data) => salesApi.updateCustomer(editCustomer.id, data) : salesApi.createCustomer,
    {
      successMsg: editCustomer ? 'Customer diperbarui' : 'Customer berhasil ditambahkan',
      onSuccess: () => { setShowCustModal(false); setCustForm(emptyCustomer); setEditCustomer(null); custRef.current?.refetch() },
    }
  )

  const updateSOItem = (idx, field, value) => {
    setSOItems(prev => prev.map((item, i) => i === idx ? calcItem(item, field, value) : item))
  }

  const soSubtotal = soItems.reduce((a, i) => a + (parseFloat(i.amount) || 0), 0)
  const soTax      = Math.round(soSubtotal * 11 / 100)
  const soTotal    = soSubtotal + soTax

  const handleSOSubmit = () => {
    if (!soForm.customer_name) return toast.error('Pilih customer')
    if (!soForm.date) return toast.error('Tanggal wajib diisi')
    if (soItems.some(i => !i.product_name)) return toast.error('Nama produk wajib diisi')
    submitSO({
      ...soForm,
      items: soItems.map(i => ({ ...i, qty: parseFloat(i.qty), unit_price: parseInt(i.unit_price), discount: parseFloat(i.discount || 0), amount: parseInt(i.amount) })),
    })
  }

  const handleSOForDO = (soId) => {
    const so = soList.find(s => s.id === soId)
    if (!so) return
    setDOForm(f => ({ ...f, so_id: soId, so_number: so.so_number, customer_id: so.customer_id || '', customer_name: so.customer_name }))
    salesApi.getSalesOrderDetail(soId).then(res => {
      const detail = res?.data || res
      setDOItems((detail?.items || []).map(i => ({ product_name: i.product_name, ordered_qty: i.qty, delivered_qty: i.qty, unit: i.unit })))
    }).catch(() => setDOItems([]))
  }

  const handleDOForInv = (doId) => {
    const doEntry = doList.find(d => d.id === doId)
    if (!doEntry) return
    const linked = soList.find(s => s.so_number === doEntry.so_number)
    const payTerm = customers.find(c => c.id === linked?.customer_id)?.payment_term || 30
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + payTerm)
    setInvForm(f => ({
      ...f, do_id: doId, do_number: doEntry.do_number, so_id: linked?.id || '',
      customer_id: doEntry.customer_id || '', customer_name: doEntry.customer_name,
      subtotal: linked?.subtotal || 0, tax_amount: linked?.tax_amount || 0, total: linked?.total || 0,
      due_date: dueDate.toISOString().split('T')[0],
    }))
  }

  const handleUpdateStatus = async () => {
    try {
      await salesApi.updateSOStatus(statusTarget.id, statusTarget.status)
      toast.success('Status berhasil diperbarui')
      setShowStatusModal(false)
      soRef.current?.refetch()
    } catch { toast.error('Gagal update status') }
  }

  const handleDeleteSO = async () => {
    try {
      await salesApi.deleteSalesOrder(deleteItem.id)
      toast.success('SO berhasil dihapus')
      setDeleteItem(null)
      soRef.current?.refetch()
    } catch (err) { toast.error(err?.message || 'Gagal menghapus') }
  }

  const handleDeleteCustomer = async () => {
    try {
      await salesApi.deleteCustomer(deleteItem.id)
      toast.success('Customer berhasil dihapus')
      setDeleteItem(null)
      custRef.current?.refetch()
    } catch { toast.error('Gagal menghapus customer') }
  }

  const openEditCustomer = (row) => {
    setEditCustomer(row)
    setCustForm({
      code: row.code || '', name: row.name, npwp: row.npwp || '',
      address: row.address || '', city: row.city || '', phone: row.phone || '',
      email: row.email || '', credit_limit: String(row.credit_limit || 0),
      payment_term: String(row.payment_term || 30), category: row.category || 'regular',
      status: row.status || 'active',
    })
    setShowCustModal(true)
  }

  const handleConfirmDO = async (doId) => {
    try {
      await salesApi.confirmDelivery(doId)
      toast.success('Pengiriman dikonfirmasi')
      doRef.current?.refetch()
      soRef.current?.refetch()
    } catch { toast.error('Gagal konfirmasi pengiriman') }
  }

  const tabs = [
    { id: 'so',        label: 'Sales Order', icon: TrendingUp },
    { id: 'do',        label: 'Delivery',    icon: Truck },
    { id: 'invoice',   label: 'Invoice',     icon: FileText },
    { id: 'quotation', label: 'Quotation',   icon: ClipboardList },
    { id: 'retur',     label: 'Retur',       icon: RotateCcw },
    { id: 'crm',       label: 'CRM',         icon: Target },
    { id: 'customer',  label: 'Customer',    icon: Users },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sales & CRM</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manajemen penjualan, quotation, retur, dan pipeline CRM</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total SO" value={totalSO} icon={TrendingUp} color="indigo" subtitle="Sales Order" />
        <StatCard title="Nilai Pending" value={formatCurrency(pendingSO)} icon={TrendingUp} color="amber" subtitle="Draft & Confirmed" />
        <StatCard title="Delivery Order" value={totalDO} icon={Truck} color="emerald" subtitle="Total DO" />
        <StatCard title="Invoice Outstanding" value={formatCurrency(unpaidInv)} icon={FileText} color="rose" subtitle="Belum lunas" />
      </div>

      <Card>
        <div className="border-b border-slate-200">
          <div className="flex gap-1 px-4 pt-2 overflow-x-auto">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-t-lg border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === t.id
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}>
                <t.icon className="w-4 h-4" />{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Sales Order ── */}
        {activeTab === 'so' && (
          <CardContent className="pt-4">
            <DataTable ref={soRef} fetchFn={salesApi.getSalesOrders} columns={soColumns}
              toolbar={<Button size="sm" onClick={() => setShowSOModal(true)}><Plus className="w-4 h-4 mr-1" /> Buat SO</Button>}
              actions={(row) => (
                <div className="flex gap-1">
                  {row.status === 'draft' && (
                    <button className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Konfirmasi"
                      onClick={() => { setStatusTarget({ id: row.id, status: 'confirmed', soNumber: row.so_number }); setShowStatusModal(true) }}>
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {row.status === 'confirmed' && (
                    <button className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Approve"
                      onClick={() => { setStatusTarget({ id: row.id, status: 'approved', soNumber: row.so_number }); setShowStatusModal(true) }}>
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {row.status === 'approved' && (
                    <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Buat DO"
                      onClick={() => { handleSOForDO(row.id); setShowDOModal(true) }}>
                      <Truck className="w-4 h-4" />
                    </button>
                  )}
                  {row.status === 'draft' && (
                    <button className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg" title="Hapus"
                      onClick={() => setDeleteItem({ id: row.id, label: row.so_number, type: 'so' })}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            />
          </CardContent>
        )}

        {/* ── Delivery Order ── */}
        {activeTab === 'do' && (
          <CardContent className="pt-4">
            <DataTable ref={doRef} fetchFn={salesApi.getDeliveryOrders} columns={doColumns}
              toolbar={<Button size="sm" onClick={() => setShowDOModal(true)}><Plus className="w-4 h-4 mr-1" /> Buat DO</Button>}
              actions={(row) => (
                <div className="flex gap-1">
                  {row.status === 'draft' && (
                    <button className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Konfirmasi Kirim"
                      onClick={() => handleConfirmDO(row.id)}>
                      <PackageCheck className="w-4 h-4" />
                    </button>
                  )}
                  {row.status === 'confirmed' && (
                    <button className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Buat Invoice"
                      onClick={() => {
                        const linked = soList.find(s => s.so_number === row.so_number)
                        const cust   = customers.find(c => c.id === row.customer_id || c.name === row.customer_name)
                        const payTerm = cust?.payment_term || 30
                        const dueDate = new Date()
                        dueDate.setDate(dueDate.getDate() + payTerm)
                        setInvForm({
                          do_id: row.id, do_number: row.do_number, so_id: linked?.id || '',
                          customer_id: row.customer_id || '', customer_name: row.customer_name,
                          date: today(), due_date: dueDate.toISOString().split('T')[0],
                          subtotal: linked?.subtotal || 0, tax_amount: linked?.tax_amount || 0,
                          total: linked?.total || 0, notes: '',
                        })
                        setActiveTab('invoice')
                        setShowInvModal(true)
                      }}>
                      <FileText className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            />
          </CardContent>
        )}

        {/* ── Invoice ── */}
        {activeTab === 'invoice' && (
          <CardContent className="pt-4">
            <DataTable ref={invRef} fetchFn={salesApi.getInvoices} columns={invColumns}
              toolbar={<Button size="sm" onClick={() => setShowInvModal(true)}><Plus className="w-4 h-4 mr-1" /> Buat Invoice</Button>}
            />
          </CardContent>
        )}

        {/* ── Quotation ── */}
        {activeTab === 'quotation' && (
          <TabQuotation customerOptions={customerOptions} customers={customers} productOptions={productOptions} />
        )}

        {/* ── Retur ── */}
        {activeTab === 'retur' && <TabRetur soList={soList} />}

        {/* ── CRM ── */}
        {activeTab === 'crm' && <TabCRM />}

        {/* ── Customer ── */}
        {activeTab === 'customer' && (
          <CardContent className="pt-4">
            <DataTable ref={custRef} fetchFn={salesApi.getCustomers} columns={customerColumns}
              toolbar={<Button size="sm" onClick={() => { setEditCustomer(null); setCustForm(emptyCustomer); setShowCustModal(true) }}><Plus className="w-4 h-4 mr-1" /> Tambah Customer</Button>}
              actions={(row) => (
                <div className="flex gap-1">
                  <button className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg" onClick={() => openEditCustomer(row)}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                    onClick={() => setDeleteItem({ id: row.id, label: row.name, type: 'customer' })}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            />
          </CardContent>
        )}
      </Card>

      {/* ══ MODAL: Create Sales Order ══ */}
      <Modal open={showSOModal} onClose={() => setShowSOModal(false)} title="Buat Sales Order" size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Customer *" placeholder="— Pilih Customer —" options={customerOptions}
              value={soForm.customer_id}
              onChange={e => {
                const c = customers.find(x => x.id === e.target.value)
                if (c) setSOForm(f => ({ ...f, customer_id: e.target.value, customer_name: c.name }))
              }} />
            <div className="flex flex-col gap-3">
              <Input label="Tanggal SO *" type="date" value={soForm.date}
                onChange={e => setSOForm(f => ({ ...f, date: e.target.value }))} />
              <Input label="Tanggal Pengiriman" type="date" value={soForm.delivery_date}
                onChange={e => setSOForm(f => ({ ...f, delivery_date: e.target.value }))} />
            </div>
          </div>
          <Input label="Catatan" value={soForm.notes}
            onChange={e => setSOForm(f => ({ ...f, notes: e.target.value }))} />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Item Produk *</label>
              <button className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                onClick={() => setSOItems(p => [...p, { product_name: '', qty: 1, unit: 'pcs', unit_price: 0, discount: 0, amount: 0 }])}>
                <Plus className="w-3 h-3" /> Tambah Baris
              </button>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Produk</th>
                    <th className="px-3 py-2 text-right w-20">Qty</th>
                    <th className="px-3 py-2 text-left w-24">Satuan</th>
                    <th className="px-3 py-2 text-right w-36">Harga Satuan</th>
                    <th className="px-3 py-2 text-right w-20">Diskon%</th>
                    <th className="px-3 py-2 text-right w-36">Jumlah</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {soItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">
                        <select className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                          value={item.product_name} onChange={e => updateSOItem(idx, 'product_name', e.target.value)}>
                          <option value="">— Pilih Produk —</option>
                          {productOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          <option value="__custom__">Lainnya (ketik manual)</option>
                        </select>
                        {item.product_name === '__custom__' && (
                          <input className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none"
                            placeholder="Nama produk" onChange={e => updateSOItem(idx, 'product_name', e.target.value)} />
                        )}
                      </td>
                      <td className="px-3 py-2"><input type="number" min="0" className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-right focus:outline-none" value={item.qty} onChange={e => updateSOItem(idx, 'qty', e.target.value)} /></td>
                      <td className="px-3 py-2">
                        <select className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none" value={item.unit} onChange={e => updateSOItem(idx, 'unit', e.target.value)}>
                          {UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2"><input type="number" min="0" className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-right focus:outline-none" value={item.unit_price} onChange={e => updateSOItem(idx, 'unit_price', e.target.value)} /></td>
                      <td className="px-3 py-2"><input type="number" min="0" max="100" className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 text-right focus:outline-none" value={item.discount} onChange={e => updateSOItem(idx, 'discount', e.target.value)} /></td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.amount || 0)}</td>
                      <td className="px-3 py-2">
                        {soItems.length > 1 && <button className="text-rose-400 hover:text-rose-600" onClick={() => setSOItems(p => p.filter((_, i) => i !== idx))}><X className="w-4 h-4" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-col items-end gap-1 text-sm">
              <div className="flex gap-8 text-slate-600"><span>Subtotal</span><span className="font-medium w-40 text-right">{formatCurrency(soSubtotal)}</span></div>
              <div className="flex gap-8 text-slate-600"><span>PPN 11%</span><span className="font-medium w-40 text-right">{formatCurrency(soTax)}</span></div>
              <div className="flex gap-8 text-slate-800 font-bold border-t border-slate-200 pt-1"><span>Total</span><span className="w-40 text-right">{formatCurrency(soTotal)}</span></div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowSOModal(false)}>Batal</Button>
            <Button onClick={handleSOSubmit} loading={savingSO}>Simpan SO</Button>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL: Update SO Status ══ */}
      <Modal open={showStatusModal} onClose={() => setShowStatusModal(false)} title="Update Status SO">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">SO <span className="font-semibold">{statusTarget.soNumber}</span></p>
          <Select label="Status Baru" options={SO_STATUS_OPTIONS} value={statusTarget.status}
            onChange={e => setStatusTarget(s => ({ ...s, status: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowStatusModal(false)}>Batal</Button>
            <Button onClick={handleUpdateStatus}>Update</Button>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL: Create Delivery Order ══ */}
      <Modal open={showDOModal} onClose={() => setShowDOModal(false)} title="Buat Delivery Order" size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Dari Sales Order *" placeholder="— Pilih SO —" options={approvedSOOptions}
              value={doForm.so_id} onChange={e => handleSOForDO(e.target.value)} />
            <Input label="Tanggal DO *" type="date" value={doForm.date}
              onChange={e => setDOForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          {doForm.customer_name && (
            <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
              Customer: <span className="font-medium">{doForm.customer_name}</span>
            </div>
          )}
          <Input label="Catatan" value={doForm.notes}
            onChange={e => setDOForm(f => ({ ...f, notes: e.target.value }))} />
          {doItems.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">Item Pengiriman</label>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Produk</th>
                      <th className="px-3 py-2 text-right">Qty Order</th>
                      <th className="px-3 py-2 text-right">Qty Kirim</th>
                      <th className="px-3 py-2 text-left w-24">Satuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {doItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-medium">{item.product_name}</td>
                        <td className="px-3 py-2 text-right text-slate-500">{item.ordered_qty}</td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" max={item.ordered_qty}
                            className="w-24 text-sm border border-slate-200 rounded-lg px-2 py-1 text-right focus:outline-none float-right"
                            value={item.delivered_qty}
                            onChange={e => setDOItems(p => p.map((it, i) => i === idx ? { ...it, delivered_qty: parseFloat(e.target.value) || 0 } : it))} />
                        </td>
                        <td className="px-3 py-2 text-slate-500">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDOModal(false)}>Batal</Button>
            <Button onClick={() => submitDO({ ...doForm, items: doItems })} loading={savingDO} disabled={!doForm.so_id}>
              Simpan DO
            </Button>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL: Create Invoice ══ */}
      <Modal open={showInvModal} onClose={() => setShowInvModal(false)} title="Buat Customer Invoice">
        <div className="space-y-4">
          <Select label="Dari Delivery Order (opsional)" placeholder="— Pilih DO —" options={confirmedDOOptions}
            value={invForm.do_id}
            onChange={e => {
              if (!e.target.value) setInvForm(f => ({ do_id: '', do_number: '', so_id: '', customer_id: '', customer_name: '', date: f.date, due_date: '', subtotal: 0, tax_amount: 0, total: 0, notes: f.notes }))
              else handleDOForInv(e.target.value)
            }} />
          {!invForm.do_id && (
            <Select label="Customer *" placeholder="— Pilih Customer —" options={customerOptions}
              value={invForm.customer_id}
              onChange={e => {
                const c = customers.find(x => x.id === e.target.value)
                if (c) setInvForm(f => ({ ...f, customer_id: c.id, customer_name: c.name }))
              }} />
          )}
          {invForm.customer_name && (
            <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
              Customer: <span className="font-medium">{invForm.customer_name}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tanggal Invoice *" type="date" value={invForm.date}
              onChange={e => setInvForm(f => ({ ...f, date: e.target.value }))} />
            <Input label="Jatuh Tempo" type="date" value={invForm.due_date}
              onChange={e => setInvForm(f => ({ ...f, due_date: e.target.value }))} />
          </div>
          {!invForm.do_id && (
            <Input label="Total Tagihan (Rp)" type="number" value={invForm.total || ''} placeholder="0"
              onChange={e => {
                const total = parseFloat(e.target.value) || 0
                const subtotal = Math.round(total / 1.11)
                setInvForm(f => ({ ...f, total, subtotal, tax_amount: total - subtotal }))
              }} />
          )}
          {invForm.total > 0 && (
            <div className="bg-indigo-50 rounded-xl p-4 space-y-1 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatCurrency(invForm.subtotal)}</span></div>
              <div className="flex justify-between text-slate-600"><span>PPN 11%</span><span>{formatCurrency(invForm.tax_amount)}</span></div>
              <div className="flex justify-between font-bold text-slate-800 border-t border-indigo-100 pt-1"><span>Total Tagihan</span><span>{formatCurrency(invForm.total)}</span></div>
            </div>
          )}
          <Input label="Catatan" value={invForm.notes}
            onChange={e => setInvForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowInvModal(false)}>Batal</Button>
            <Button onClick={() => {
              if (!invForm.customer_name) return toast.error('Pilih customer atau Delivery Order')
              if (!invForm.date) return toast.error('Tanggal invoice wajib diisi')
              submitInv(invForm)
            }} loading={savingInv}>Buat Invoice</Button>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL: Add / Edit Customer ══ */}
      <Modal open={showCustModal} onClose={() => { setShowCustModal(false); setEditCustomer(null) }}
        title={editCustomer ? 'Edit Customer' : 'Tambah Customer'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Kode Customer" value={custForm.code}
              onChange={e => setCustForm(f => ({ ...f, code: e.target.value }))} placeholder="CUST-001" />
            <Input label="Nama Customer *" value={custForm.name}
              onChange={e => setCustForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="NPWP" value={custForm.npwp}
              onChange={e => setCustForm(f => ({ ...f, npwp: e.target.value }))} />
            <Input label="Kota" value={custForm.city}
              onChange={e => setCustForm(f => ({ ...f, city: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Telepon" value={custForm.phone}
              onChange={e => setCustForm(f => ({ ...f, phone: e.target.value }))} />
            <Input label="Email" type="email" value={custForm.email}
              onChange={e => setCustForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <Input label="Alamat" value={custForm.address}
            onChange={e => setCustForm(f => ({ ...f, address: e.target.value }))} />
          <div className="grid grid-cols-3 gap-3">
            <Select label="Kategori" options={CATEGORY_OPTIONS} value={custForm.category}
              onChange={e => setCustForm(f => ({ ...f, category: e.target.value }))} />
            <Select label="Term Pembayaran" options={TERM_OPTIONS} value={custForm.payment_term}
              onChange={e => setCustForm(f => ({ ...f, payment_term: e.target.value }))} />
            <Select label="Status" options={STATUS_OPTIONS} value={custForm.status}
              onChange={e => setCustForm(f => ({ ...f, status: e.target.value }))} />
          </div>
          <Input label="Credit Limit (Rp)" type="number" value={custForm.credit_limit}
            onChange={e => setCustForm(f => ({ ...f, credit_limit: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setShowCustModal(false); setEditCustomer(null) }}>Batal</Button>
            <Button onClick={() => submitCust(custForm)} loading={savingCust}>
              {editCustomer ? 'Update' : 'Simpan'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL: Confirm Delete ══ */}
      <Modal open={!!deleteItem} onClose={() => setDeleteItem(null)} title="Konfirmasi Hapus">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Hapus <span className="font-semibold">{deleteItem?.label}</span>? Tindakan ini tidak bisa dibatalkan.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button variant="danger" onClick={deleteItem?.type === 'so' ? handleDeleteSO : handleDeleteCustomer}>
              Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
