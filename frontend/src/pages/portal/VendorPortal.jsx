import { useState, useEffect, useCallback } from 'react'
import { portalApi } from '@/api'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import {
  ClipboardList, FileText, CreditCard, LayoutDashboard, TrendingUp,
  Clock, CheckCircle, Building2, ChevronDown, Phone, Mail, Plus,
  Package, AlertCircle, DollarSign, Send
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const fmt = (n) => 'Rp ' + Number(n).toLocaleString('id-ID')

const STATUS_COLORS = {
  confirmed: 'bg-indigo-100 text-indigo-700',
  received:  'bg-emerald-100 text-emerald-700',
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-blue-100 text-blue-700',
  paid:      'bg-emerald-100 text-emerald-700',
  done:      'bg-emerald-100 text-emerald-700',
}

const STATUS_LABELS = {
  confirmed:'Dikonfirmasi', received:'Diterima', pending:'Menunggu',
  approved:'Disetujui', paid:'Dibayar', done:'Selesai',
}

function Badge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-600'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pos',       label: 'Purchase Order', icon: ClipboardList },
  { id: 'invoices',  label: 'Invoice Saya', icon: FileText },
  { id: 'payments',  label: 'Pembayaran', icon: CreditCard },
]

const DEFAULT_INVOICE = { po_ref: '', amount: '', description: '' }

export default function VendorPortal() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [vendors, setVendors] = useState([])
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [dashData, setDashData] = useState(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState(DEFAULT_INVOICE)
  const [submitting, setSubmitting] = useState(false)
  const [invoiceRefresh, setInvoiceRefresh] = useState(0)

  useEffect(() => {
    portalApi.getVendors().then(r => {
      const list = r?.value || []
      setVendors(list)
      if (list.length > 0) setSelectedVendor(list[0])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedVendor) return
    portalApi.getVendorDashboard(selectedVendor.id).then(r => {
      setDashData(r?.data || null)
    }).catch(() => {})
  }, [selectedVendor])

  const posFetch = useCallback(p => portalApi.getVendorPOs(p), [])
  const invoicesFetch = useCallback(p => portalApi.getVendorInvoices(p), [invoiceRefresh])
  const paymentsFetch = useCallback(p => portalApi.getVendorPayments(p), [])

  const handleSubmitInvoice = async () => {
    if (!invoiceForm.po_ref || !invoiceForm.amount) return
    setSubmitting(true)
    try {
      await portalApi.createVendorInvoice({ ...invoiceForm, amount: Number(invoiceForm.amount) })
      setShowInvoiceModal(false)
      setInvoiceForm(DEFAULT_INVOICE)
      setInvoiceRefresh(r => r + 1)
      setActiveTab('invoices')
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  const kpi = dashData?.kpi || {}
  const dash = dashData || {}

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Vendor Portal</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Self-service portal untuk vendor/supplier
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Submit Invoice button */}
          <button onClick={() => setShowInvoiceModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-all shadow-md shadow-indigo-200">
            <Plus className="w-4 h-4" />
            Kirim Invoice
          </button>
          {/* Vendor switcher */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            >
              <Building2 className="w-4 h-4 text-emerald-500" />
              {selectedVendor?.name || 'Pilih Vendor'}
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            {showDropdown && (
              <div className="absolute right-0 top-full mt-1 w-72 rounded-xl border shadow-lg z-20 overflow-hidden"
                style={{ backgroundColor: 'var(--dropdown-bg)', borderColor: 'var(--border-color)' }}>
                {vendors.map(v => (
                  <button key={v.id} onClick={() => { setSelectedVendor(v); setShowDropdown(false) }}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{v.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{v.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vendor Info Bar */}
      {selectedVendor && (
        <div className="rounded-2xl border p-4 flex flex-wrap gap-4 items-center"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{selectedVendor.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Vendor sejak {dashData?.since || '-'}</p>
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selectedVendor.phone}</span>
            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{selectedVendor.email}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-surface-3)' }}>
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === t.id
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total PO', value: kpi.total_pos, sub: `${kpi.active_pos} aktif`, icon: ClipboardList, color: 'indigo' },
              { label: 'Invoice', value: kpi.total_invoices, sub: `${kpi.unpaid_invoices} belum dibayar`, icon: FileText, color: 'amber' },
              { label: 'Piutang', value: fmt(kpi.outstanding_amount), sub: 'belum cair', icon: AlertCircle, color: 'rose' },
              { label: 'On-Time Delivery', value: `${kpi.on_time_delivery}%`, sub: 'ketepatan waktu', icon: CheckCircle, color: 'emerald' },
            ].map(c => {
              const Icon = c.icon
              const colors = { indigo:'from-indigo-500 to-blue-600', amber:'from-amber-400 to-orange-500', rose:'from-rose-400 to-pink-600', emerald:'from-emerald-400 to-teal-600' }
              return (
                <Card key={c.label}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[c.color]} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
                        <p className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>{c.value}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.sub}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Pendapatan 6 Bulan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dash.monthly_revenue || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={v => `${(v/1e6).toFixed(0)}jt`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={v => [fmt(v), 'Pendapatan']} />
                    <Bar dataKey="amount" fill="#10b981" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Aktivitas Terbaru
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(dash.recent_activity || []).map((a, i) => {
                    const icons = { po: ClipboardList, payment: DollarSign, invoice: FileText, grn: Package }
                    const colors2 = { po: 'bg-indigo-100 text-indigo-600', payment: 'bg-emerald-100 text-emerald-600', invoice: 'bg-amber-100 text-amber-600', grn: 'bg-blue-100 text-blue-600' }
                    const Icon2 = icons[a.type] || Package
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colors2[a.type] || 'bg-slate-100 text-slate-600'}`}>
                          <Icon2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.desc} · <span className="font-mono text-xs">{a.ref}</span></p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.date}</p>
                        </div>
                        {a.amount > 0 && <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(a.amount)}</p>}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* POs */}
      {activeTab === 'pos' && (
        <DataTable
          title="Purchase Order Diterima"
          fetchFn={posFetch}
          columns={[
            { key: 'id', label: 'No. PO', render: v => <span className="font-mono font-semibold text-emerald-600">{v}</span> },
            { key: 'date', label: 'Tgl. PO' },
            { key: 'items_summary', label: 'Item' },
            { key: 'total', label: 'Nilai PO', render: v => fmt(v) },
            { key: 'delivery_deadline', label: 'Deadline Kirim' },
            { key: 'status', label: 'Status PO', render: v => <Badge status={v} /> },
            { key: 'grn_status', label: 'GRN', render: v => <Badge status={v} /> },
          ]}
          searchable
        />
      )}

      {/* Vendor Invoices */}
      {activeTab === 'invoices' && (
        <DataTable
          title="Invoice yang Dikirim"
          fetchFn={invoicesFetch}
          columns={[
            { key: 'id', label: 'No. Invoice', render: v => <span className="font-mono font-semibold text-emerald-600">{v}</span> },
            { key: 'po_ref', label: 'Ref. PO', render: v => <span className="font-mono text-xs">{v}</span> },
            { key: 'date', label: 'Tgl. Invoice' },
            { key: 'due_date', label: 'Jatuh Tempo' },
            { key: 'amount', label: 'Nilai Invoice', render: v => fmt(v) },
            { key: 'paid', label: 'Terbayar', render: v => <span className="text-emerald-600 font-medium">{fmt(v)}</span> },
            { key: 'status', label: 'Status', render: v => <Badge status={v} /> },
          ]}
          searchable
          toolbar={
            <button onClick={() => setShowInvoiceModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-all">
              <Plus className="w-3.5 h-3.5" />
              Kirim Invoice
            </button>
          }
        />
      )}

      {/* Payments */}
      {activeTab === 'payments' && (
        <DataTable
          title="Riwayat Pembayaran"
          fetchFn={paymentsFetch}
          columns={[
            { key: 'id', label: 'No. Bayar', render: v => <span className="font-mono font-semibold text-emerald-600">{v}</span> },
            { key: 'vi_ref', label: 'Ref. Invoice', render: v => <span className="font-mono text-xs">{v}</span> },
            { key: 'date', label: 'Tgl. Bayar' },
            { key: 'amount', label: 'Nominal', render: v => <span className="font-semibold text-emerald-600">{fmt(v)}</span> },
            { key: 'method', label: 'Metode' },
            { key: 'bank', label: 'Bank' },
            { key: 'ref', label: 'Ref. Transaksi', render: v => <span className="font-mono text-xs">{v}</span> },
          ]}
          searchable
        />
      )}

      {/* Submit Invoice Modal */}
      <Modal
        open={showInvoiceModal}
        onClose={() => { setShowInvoiceModal(false); setInvoiceForm(DEFAULT_INVOICE) }}
        title="Kirim Invoice ke Perusahaan"
        size="md"
        footer={
          <>
            <button onClick={() => { setShowInvoiceModal(false); setInvoiceForm(DEFAULT_INVOICE) }}
              className="px-4 py-2 rounded-xl border text-sm font-medium hover:bg-slate-50 transition-all"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
              Batal
            </button>
            <button onClick={handleSubmitInvoice} disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium transition-all">
              <Send className="w-4 h-4" />
              {submitting ? 'Mengirim...' : 'Kirim Invoice'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
            <p className="text-xs text-blue-700">Invoice akan dikirim ke tim Finance perusahaan untuk diverifikasi dan dibayar.</p>
          </div>
          <Input
            label="Referensi PO"
            placeholder="cth: PO-3041"
            value={invoiceForm.po_ref}
            onChange={e => setInvoiceForm(f => ({ ...f, po_ref: e.target.value }))}
          />
          <Input
            label="Nominal Invoice (Rp)"
            type="number"
            placeholder="cth: 45000000"
            value={invoiceForm.amount}
            onChange={e => setInvoiceForm(f => ({ ...f, amount: e.target.value }))}
          />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Keterangan
            </label>
            <textarea
              rows={3}
              placeholder="Keterangan invoice..."
              value={invoiceForm.description}
              onChange={e => setInvoiceForm(f => ({ ...f, description: e.target.value }))}
              className="w-full rounded-xl border px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-all"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
