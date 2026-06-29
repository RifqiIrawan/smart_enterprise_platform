import { useRef, useState, useCallback } from 'react'
import StatCard from '@/components/ui/StatCard'
import { Card, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DataTable from '@/components/ui/DataTable'
import {
  Landmark, CreditCard, TrendingDown, TrendingUp, Plus, Pencil, Trash2,
  ArrowDownCircle, ArrowUpCircle, Clock, RefreshCw, Lock, Wallet, Upload,
  CheckCircle2, AlertTriangle, ChevronLeft, Banknote
} from 'lucide-react'
import { financeApi, salesApi, purchasingApi, bankReconApi } from '@/api'
import { useApi, useSubmit } from '@/hooks/useApi'
import { formatCurrency, formatDate } from '@/utils/format'
import toast from 'react-hot-toast'

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const BANK_OPTIONS = [
  { value: 'BCA', label: 'BCA â€” Bank Central Asia' },
  { value: 'Mandiri', label: 'Bank Mandiri' },
  { value: 'BNI', label: 'BNI â€” Bank Negara Indonesia' },
  { value: 'BRI', label: 'BRI â€” Bank Rakyat Indonesia' },
  { value: 'CIMB Niaga', label: 'CIMB Niaga' },
  { value: 'Danamon', label: 'Bank Danamon' },
  { value: 'Permata', label: 'Bank Permata' },
  { value: 'Lainnya', label: 'Lainnya' },
]

const PAYMENT_METHODS = [
  { value: 'transfer', label: 'Transfer Bank' },
  { value: 'giro', label: 'Giro' },
  { value: 'tunai', label: 'Tunai' },
  { value: 'cek', label: 'Cek' },
]

const AGING_ORDER = ['current', '1-30', '31-60', '61-90', '>90']

const agingBadge = (bucket) => ({
  current: <Badge variant="success">Current</Badge>,
  '1-30':  <Badge variant="info">1-30 hari</Badge>,
  '31-60': <Badge variant="warning">31-60 hari</Badge>,
  '61-90': <Badge variant="danger">61-90 hari</Badge>,
  '>90':   <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-900/80 text-rose-100">&gt;90 hari</span>,
})[bucket] || <Badge>{bucket}</Badge>

const viStatusBadge = (s) => ({
  unpaid:    <Badge variant="warning">Belum Bayar</Badge>,
  partial:   <Badge variant="info">Parsial</Badge>,
  paid:      <Badge variant="success">Lunas</Badge>,
  cancelled: <Badge variant="default">Dibatalkan</Badge>,
})[s] || <Badge>{s}</Badge>

const invStatusBadge = (s) => ({
  draft:    <Badge variant="default">Draft</Badge>,
  unpaid:   <Badge variant="warning">Belum Bayar</Badge>,
  partial:  <Badge variant="info">Parsial</Badge>,
  paid:     <Badge variant="success">Lunas</Badge>,
  overdue:  <Badge variant="danger">Jatuh Tempo</Badge>,
})[s] || <Badge>{s}</Badge>

// â”€â”€â”€ Column Definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const bankColumns = [
  { key: 'name', label: 'Nama Rekening', sortable: true, render: v => <span className="font-medium">{v}</span> },
  { key: 'bank_name', label: 'Bank', sortable: true, render: v => <Badge variant="info">{v}</Badge> },
  { key: 'account_number', label: 'No. Rekening', render: v => <span className="font-mono text-sm">{v}</span> },
  { key: 'branch', label: 'Cabang' },
  { key: 'currency', label: 'Mata Uang' },
  { key: 'balance', label: 'Saldo', sortable: true, render: v => <span className="font-semibold text-emerald-600">{formatCurrency(v)}</span> },
  { key: 'is_active', label: 'Status', render: v => v ? <Badge variant="success">Aktif</Badge> : <Badge variant="default">Nonaktif</Badge> },
]

const viColumns = [
  { key: 'vi_number', label: 'No. VI', sortable: true, render: v => <span className="font-mono font-semibold text-indigo-600">{v}</span> },
  { key: 'vendor_name', label: 'Vendor', sortable: true },
  { key: 'vendor_inv_number', label: 'No. Inv Vendor' },
  { key: 'inv_date', label: 'Tgl Invoice', render: v => v ? formatDate(v) : 'â€”' },
  { key: 'due_date', label: 'Jatuh Tempo', render: v => v ? formatDate(v) : 'â€”' },
  { key: 'total', label: 'Total', sortable: true, render: v => <span className="font-semibold">{formatCurrency(v)}</span> },
  { key: 'paid_amount', label: 'Dibayar', render: v => formatCurrency(v) },
  { key: 'status', label: 'Status', render: v => viStatusBadge(v) },
]

const payOutColumns = [
  { key: 'vendor_name', label: 'Vendor', sortable: true },
  { key: 'vi_number', label: 'No. VI' },
  { key: 'bank_name', label: 'Rekening', render: v => v ? <Badge variant="info">{v}</Badge> : 'â€”' },
  { key: 'payment_date', label: 'Tgl Bayar', sortable: true, render: v => v ? formatDate(v) : 'â€”' },
  { key: 'amount', label: 'Jumlah', sortable: true, render: v => <span className="font-semibold text-rose-600">{formatCurrency(v)}</span> },
  { key: 'method', label: 'Metode', render: v => <Badge variant="default">{v}</Badge> },
  { key: 'reference', label: 'Referensi' },
]

const arColumns = [
  { key: 'inv_number', label: 'No. Invoice', sortable: true, render: v => <span className="font-mono font-semibold text-indigo-600">{v}</span> },
  { key: 'customer_name', label: 'Customer', sortable: true },
  { key: 'date', label: 'Tgl Invoice', render: v => v ? formatDate(v) : 'â€”' },
  { key: 'due_date', label: 'Jatuh Tempo', render: v => v ? formatDate(v) : 'â€”' },
  { key: 'total', label: 'Total', sortable: true, render: v => <span className="font-semibold">{formatCurrency(v)}</span> },
  { key: 'paid_amount', label: 'Diterima', render: v => formatCurrency(v) },
  { key: 'status', label: 'Status', render: v => invStatusBadge(v) },
]

const payInColumns = [
  { key: 'customer_name', label: 'Customer', sortable: true },
  { key: 'inv_number', label: 'No. Invoice' },
  { key: 'bank_name', label: 'Rekening', render: v => v ? <Badge variant="info">{v}</Badge> : 'â€”' },
  { key: 'payment_date', label: 'Tgl Terima', sortable: true, render: v => v ? formatDate(v) : 'â€”' },
  { key: 'amount', label: 'Jumlah', sortable: true, render: v => <span className="font-semibold text-emerald-600">{formatCurrency(v)}</span> },
  { key: 'method', label: 'Metode', render: v => <Badge variant="default">{v}</Badge> },
  { key: 'reference', label: 'Referensi' },
]

// â”€â”€â”€ Empty States â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const emptyBank = { name: '', bank_name: 'BCA', account_number: '', branch: '', currency: 'IDR', balance: 0 }
const emptyVI = { vendor_id: '', vendor_name: '', vendor_inv_number: '', po_id: '', inv_date: new Date().toISOString().split('T')[0], due_date: '', subtotal: 0, tax_amount: 0, total: 0, notes: '' }
const emptyPayOut = { bank_account_id: '', vendor_invoice_id: '', vendor_name: '', payment_date: new Date().toISOString().split('T')[0], amount: 0, method: 'transfer', reference: '', notes: '' }
const emptyPayIn = { bank_account_id: '', customer_invoice_id: '', customer_name: '', payment_date: new Date().toISOString().split('T')[0], amount: 0, method: 'transfer', reference: '', notes: '' }

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function Finance() {
  const [activeTab, setActiveTab] = useState('bank')

  // DataTable refs
  const bankRef = useRef(null)
  const viRef = useRef(null)
  const payOutRef = useRef(null)
  const arRef = useRef(null)
  const payInRef = useRef(null)

  // Modal states
  const [showBankModal, setShowBankModal] = useState(false)
  const [showVIModal, setShowVIModal] = useState(false)
  const [showPayOutModal, setShowPayOutModal] = useState(false)
  const [showPayInModal, setShowPayInModal] = useState(false)
  const [editBank, setEditBank] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)

  // Form states
  const [bankForm, setBankForm] = useState(emptyBank)
  const [viForm, setVIForm] = useState(emptyVI)
  const [payOutForm, setPayOutForm] = useState(emptyPayOut)
  const [payInForm, setPayInForm] = useState(emptyPayIn)

  // Master data
  const { data: bankRaw } = useApi(financeApi.getBankAccounts)
  const bankAccounts = Array.isArray(bankRaw?.value) ? bankRaw.value : []
  const bankOptions = bankAccounts.filter(b => b.is_active).map(b => ({ value: b.id, label: `${b.bank_name} - ${b.name} (${formatCurrency(b.balance)})` }))

  const { data: vendorRaw } = useApi(purchasingApi.getVendors)
  const vendors = Array.isArray(vendorRaw?.value) ? vendorRaw.value : []
  const vendorOptions = vendors.map(v => ({ value: v.id, label: v.name }))

  const { data: poRaw } = useApi(purchasingApi.getPO)
  const poList = Array.isArray(poRaw?.value) ? poRaw.value : []
  const poOptions = poList.map(p => ({ value: p.id, label: `${p.po_number} â€” ${p.vendor_name}` }))

  const { data: viRaw } = useApi(financeApi.getVendorInvoices)
  const viList = Array.isArray(viRaw?.value) ? viRaw.value : []
  const unpaidVIOptions = viList.filter(v => v.status !== 'paid' && v.status !== 'cancelled')
    .map(v => ({ value: v.id, label: `${v.vi_number} â€” ${v.vendor_name} (Sisa: ${formatCurrency(v.total - v.paid_amount)})` }))

  const { data: arRaw } = useApi(salesApi.getInvoices)
  const arList = Array.isArray(arRaw?.value) ? arRaw.value : []
  const unpaidAROptions = arList.filter(i => i.status !== 'paid' && i.status !== 'cancelled')
    .map(i => ({ value: i.id, label: `${i.inv_number} â€” ${i.customer_name} (Sisa: ${formatCurrency(i.total - i.paid_amount)})` }))

  // Cash position stats
  const { data: cashPos } = useApi(financeApi.getCashPosition)
  const totalBalance = cashPos?.total_balance || 0
  const totalPayables = cashPos?.total_payables || 0
  const totalReceivables = cashPos?.total_receivables || 0

  // Aging data
  const { data: agingAPRaw } = useApi(financeApi.getAgingAP)
  const agingAP = Array.isArray(agingAPRaw?.value) ? agingAPRaw.value : []
  const { data: agingARRaw } = useApi(financeApi.getAgingAR)
  const agingAR = Array.isArray(agingARRaw?.value) ? agingARRaw.value : []

  // â”€â”€â”€ Submits â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const { submit: submitBank, loading: savingBank } = useSubmit(
    editBank ? (data) => financeApi.updateBankAccount(editBank.id, data) : financeApi.createBankAccount,
    {
      successMsg: editBank ? 'Bank account diperbarui' : 'Bank account ditambahkan',
      onSuccess: () => { setShowBankModal(false); setBankForm(emptyBank); setEditBank(null); bankRef.current?.refetch() },
    }
  )

  const { submit: submitVI, loading: savingVI } = useSubmit(financeApi.createVendorInvoice, {
    successMsg: 'Vendor invoice berhasil dibuat',
    onSuccess: () => { setShowVIModal(false); setVIForm(emptyVI); viRef.current?.refetch() },
  })

  const { submit: submitPayOut, loading: savingPayOut } = useSubmit(financeApi.createPaymentOut, {
    successMsg: 'Pembayaran keluar dicatat',
    onSuccess: () => { setShowPayOutModal(false); setPayOutForm(emptyPayOut); payOutRef.current?.refetch(); viRef.current?.refetch(); bankRef.current?.refetch() },
  })

  const { submit: submitPayIn, loading: savingPayIn } = useSubmit(financeApi.createPaymentIn, {
    successMsg: 'Penerimaan pembayaran dicatat',
    onSuccess: () => { setShowPayInModal(false); setPayInForm(emptyPayIn); payInRef.current?.refetch(); arRef.current?.refetch(); bankRef.current?.refetch() },
  })

  // â”€â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleVendorChange = (vendorId) => {
    const v = vendors.find(x => x.id === vendorId)
    setVIForm(f => ({ ...f, vendor_id: vendorId, vendor_name: v?.name || '' }))
  }

  const handleVISubtotalChange = (val) => {
    const sub = parseInt(val) || 0
    const tax = Math.round(sub * 11 / 100)
    setVIForm(f => ({ ...f, subtotal: sub, tax_amount: tax, total: sub + tax }))
  }

  const openEditBank = (row) => {
    setEditBank(row)
    setBankForm({ name: row.name, bank_name: row.bank_name, account_number: row.account_number, branch: row.branch || '', currency: row.currency, balance: row.balance })
    setShowBankModal(true)
  }

  const handleDeleteBank = async () => {
    try {
      await financeApi.deleteBankAccount(deleteItem.id)
      toast.success('Bank account dihapus')
      setDeleteItem(null)
      bankRef.current?.refetch()
    } catch (err) { toast.error(err?.response?.data?.error || 'Gagal menghapus') }
  }

  const prefillPayOut = (row) => {
    setPayOutForm(f => ({
      ...f, vendor_invoice_id: row.id, vendor_name: row.vendor_name,
      amount: row.total - row.paid_amount,
    }))
    setShowPayOutModal(true)
  }

  const prefillPayIn = (row) => {
    setPayInForm(f => ({
      ...f, customer_invoice_id: row.id, customer_name: row.customer_name,
      amount: row.total - row.paid_amount,
    }))
    setShowPayInModal(true)
  }

  // Aging summary
  const agingSummary = (data, nameKey) => {
    const buckets = {}
    AGING_ORDER.forEach(b => { buckets[b] = 0 })
    data.forEach(r => { buckets[r.aging_bucket] = (buckets[r.aging_bucket] || 0) + r.outstanding })
    return buckets
  }

  // â”€â”€â”€ Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const tabs = [
    { id: 'bank', label: 'Bank & Kas', icon: Landmark },
    { id: 'ap', label: 'Hutang (AP)', icon: TrendingDown },
    { id: 'ar', label: 'Piutang (AR)', icon: TrendingUp },
    { id: 'aging-ap', label: 'Aging AP', icon: Clock },
    { id: 'aging-ar', label: 'Aging AR', icon: Clock },
    { id: 'recon', label: 'Rekonsiliasi', icon: CheckCircle2 },
    { id: 'petty-cash', label: 'Petty Cash', icon: Wallet },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Finance â€” AP/AR & Cash</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manajemen hutang, piutang, dan kas perusahaan</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Kas & Bank" value={formatCurrency(totalBalance)} icon={Landmark} color="emerald" subtitle="Semua rekening aktif" />
        <StatCard title="Total Hutang (AP)" value={formatCurrency(totalPayables)} icon={TrendingDown} color="rose" subtitle="Belum lunas" />
        <StatCard title="Total Piutang (AR)" value={formatCurrency(totalReceivables)} icon={TrendingUp} color="indigo" subtitle="Belum diterima" />
      </div>

      {/* Tabs */}
      <Card>
        <div className="border-b border-slate-200">
          <div className="flex gap-1 px-4 pt-2 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === t.id
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* â”€â”€ Bank & Kas Tab â”€â”€ */}
        {activeTab === 'bank' && (
          <CardContent className="pt-4">
            <DataTable
              ref={bankRef}
              fetchFn={financeApi.getBankAccounts}
              columns={bankColumns}
              toolbar={
                <Button size="sm" onClick={() => { setEditBank(null); setBankForm(emptyBank); setShowBankModal(true) }}>
                  <Plus className="w-4 h-4 mr-1" /> Tambah Rekening
                </Button>
              }
              actions={(row) => (
                <div className="flex gap-1">
                  <button className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Edit" onClick={() => openEditBank(row)}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg" title="Hapus"
                    onClick={() => setDeleteItem({ id: row.id, label: row.name, type: 'bank' })}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            />
          </CardContent>
        )}

        {/* â”€â”€ Hutang (AP) Tab â”€â”€ */}
        {activeTab === 'ap' && (
          <CardContent className="pt-4 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-700">Tagihan Vendor (AP)</h3>
                <Button size="sm" onClick={() => setShowVIModal(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Buat Tagihan
                </Button>
              </div>
              <DataTable
                ref={viRef}
                fetchFn={financeApi.getVendorInvoices}
                columns={viColumns}
                actions={(row) => (
                  <div className="flex gap-1">
                    {row.status !== 'paid' && row.status !== 'cancelled' && (
                      <button className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Bayar"
                        onClick={() => prefillPayOut(row)}>
                        <ArrowUpCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-700">Riwayat Pembayaran Keluar</h3>
                <Button size="sm" variant="secondary" onClick={() => setShowPayOutModal(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Catat Bayar
                </Button>
              </div>
              <DataTable
                ref={payOutRef}
                fetchFn={financeApi.getPaymentsOut}
                columns={payOutColumns}
              />
            </div>
          </CardContent>
        )}

        {/* â”€â”€ Piutang (AR) Tab â”€â”€ */}
        {activeTab === 'ar' && (
          <CardContent className="pt-4 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-700">Invoice Customer (AR)</h3>
              </div>
              <DataTable
                ref={arRef}
                fetchFn={salesApi.getInvoices}
                columns={arColumns}
                actions={(row) => (
                  <div className="flex gap-1">
                    {row.status !== 'paid' && row.status !== 'cancelled' && (
                      <button className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Terima Pembayaran"
                        onClick={() => prefillPayIn(row)}>
                        <ArrowDownCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-700">Riwayat Penerimaan</h3>
                <Button size="sm" variant="secondary" onClick={() => setShowPayInModal(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Catat Terima
                </Button>
              </div>
              <DataTable
                ref={payInRef}
                fetchFn={financeApi.getPaymentsIn}
                columns={payInColumns}
              />
            </div>
          </CardContent>
        )}

        {/* â”€â”€ Aging AP Tab â”€â”€ */}
        {activeTab === 'aging-ap' && (
          <CardContent className="pt-4">
            <AgingTable data={agingAP} nameKey="vendor_name" numberKey="vi_number" title="Hutang ke Vendor" colorScheme="rose" />
          </CardContent>
        )}

        {/* â”€â”€ Aging AR Tab â”€â”€ */}
        {activeTab === 'aging-ar' && (
          <CardContent className="pt-4">
            <AgingTable data={agingAR} nameKey="customer_name" numberKey="inv_number" title="Piutang dari Customer" colorScheme="indigo" />
          </CardContent>
        )}

        {activeTab === 'recon' && (
          <CardContent className="pt-4">
            <TabRecon />
          </CardContent>
        )}

        {activeTab === 'petty-cash' && (
          <CardContent className="pt-4">
            <TabPettyCash />
          </CardContent>
        )}
      </Card>

      {/* â”€â”€â”€ Bank Account Modal â”€â”€â”€ */}
      <Modal
        open={showBankModal}
        onClose={() => { setShowBankModal(false); setEditBank(null); setBankForm(emptyBank) }}
        title={editBank ? 'Edit Bank Account' : 'Tambah Rekening Bank'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowBankModal(false); setEditBank(null); setBankForm(emptyBank) }}>Batal</Button>
            <Button onClick={() => submitBank(bankForm)} disabled={savingBank}>{savingBank ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Nama Rekening *" placeholder="e.g. Kas Operasional BCA" value={bankForm.name} onChange={e => setBankForm(f => ({ ...f, name: e.target.value }))} />
          <Select label="Bank *" options={BANK_OPTIONS} value={bankForm.bank_name} onChange={v => setBankForm(f => ({ ...f, bank_name: v }))} />
          <Input label="Nomor Rekening *" placeholder="000-000-0000" value={bankForm.account_number} onChange={e => setBankForm(f => ({ ...f, account_number: e.target.value }))} />
          <Input label="Cabang" placeholder="e.g. Jakarta Selatan" value={bankForm.branch} onChange={e => setBankForm(f => ({ ...f, branch: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Mata Uang" options={[{ value: 'IDR', label: 'IDR' }, { value: 'USD', label: 'USD' }]} value={bankForm.currency} onChange={v => setBankForm(f => ({ ...f, currency: v }))} />
            <Input label="Saldo Awal (Rp)" type="number" value={bankForm.balance} onChange={e => setBankForm(f => ({ ...f, balance: parseInt(e.target.value) || 0 }))} />
          </div>
        </div>
      </Modal>

      {/* â”€â”€â”€ Vendor Invoice Modal â”€â”€â”€ */}
      <Modal
        open={showVIModal}
        onClose={() => { setShowVIModal(false); setVIForm(emptyVI) }}
        title="Buat Tagihan Vendor (AP)"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowVIModal(false); setVIForm(emptyVI) }}>Batal</Button>
            <Button onClick={() => {
              if (!viForm.vendor_name) return toast.error('Pilih vendor')
              if (!viForm.inv_date) return toast.error('Tanggal invoice wajib diisi')
              if (!viForm.total) return toast.error('Total wajib diisi')
              submitVI(viForm)
            }} disabled={savingVI}>{savingVI ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select label="Vendor *" options={vendorOptions} value={viForm.vendor_id}
            onChange={v => handleVendorChange(v)}
            placeholder="Pilih vendor..." />
          <Select label="PO Terkait (opsional)" options={poOptions} value={viForm.po_id}
            onChange={v => setVIForm(f => ({ ...f, po_id: v }))}
            placeholder="Pilih PO..." />
          <Input label="No. Invoice Vendor" placeholder="INV-VENDOR-001" value={viForm.vendor_inv_number} onChange={e => setVIForm(f => ({ ...f, vendor_inv_number: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tgl Invoice *" type="date" value={viForm.inv_date} onChange={e => setVIForm(f => ({ ...f, inv_date: e.target.value }))} />
            <Input label="Jatuh Tempo" type="date" value={viForm.due_date} onChange={e => setVIForm(f => ({ ...f, due_date: e.target.value }))} />
          </div>
          <Input label="Subtotal (Rp) *" type="number" value={viForm.subtotal}
            onChange={e => handleVISubtotalChange(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="PPN 11% (Rp)" type="number" value={viForm.tax_amount} readOnly className="bg-slate-50" />
            <Input label="Total (Rp)" type="number" value={viForm.total} readOnly className="bg-slate-50 font-semibold" />
          </div>
          <Input label="Catatan" placeholder="Keterangan tambahan..." value={viForm.notes} onChange={e => setVIForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
      </Modal>

      {/* â”€â”€â”€ Payment Out Modal â”€â”€â”€ */}
      <Modal
        open={showPayOutModal}
        onClose={() => { setShowPayOutModal(false); setPayOutForm(emptyPayOut) }}
        title="Catat Pembayaran ke Vendor"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowPayOutModal(false); setPayOutForm(emptyPayOut) }}>Batal</Button>
            <Button onClick={() => {
              if (!payOutForm.vendor_name) return toast.error('Nama vendor wajib diisi')
              if (!payOutForm.amount || payOutForm.amount <= 0) return toast.error('Jumlah bayar harus lebih dari 0')
              submitPayOut(payOutForm)
            }} disabled={savingPayOut}>{savingPayOut ? 'Menyimpan...' : 'Bayar'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select label="Rekening Bank *" options={bankOptions} value={payOutForm.bank_account_id}
            onChange={v => setPayOutForm(f => ({ ...f, bank_account_id: v }))}
            placeholder="Pilih rekening..." />
          <Select label="Invoice Vendor" options={unpaidVIOptions} value={payOutForm.vendor_invoice_id}
            onChange={v => {
              const vi = viList.find(x => x.id === v)
              setPayOutForm(f => ({ ...f, vendor_invoice_id: v, vendor_name: vi?.vendor_name || f.vendor_name, amount: vi ? vi.total - vi.paid_amount : f.amount }))
            }}
            placeholder="Pilih invoice vendor..." />
          <Input label="Nama Vendor *" value={payOutForm.vendor_name} onChange={e => setPayOutForm(f => ({ ...f, vendor_name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tanggal Bayar *" type="date" value={payOutForm.payment_date} onChange={e => setPayOutForm(f => ({ ...f, payment_date: e.target.value }))} />
            <Input label="Jumlah (Rp) *" type="number" value={payOutForm.amount} onChange={e => setPayOutForm(f => ({ ...f, amount: parseInt(e.target.value) || 0 }))} />
          </div>
          <Select label="Metode Pembayaran" options={PAYMENT_METHODS} value={payOutForm.method}
            onChange={v => setPayOutForm(f => ({ ...f, method: v }))} />
          <Input label="Referensi" placeholder="No. bukti/TRF/cek" value={payOutForm.reference} onChange={e => setPayOutForm(f => ({ ...f, reference: e.target.value }))} />
        </div>
      </Modal>

      {/* â”€â”€â”€ Payment In Modal â”€â”€â”€ */}
      <Modal
        open={showPayInModal}
        onClose={() => { setShowPayInModal(false); setPayInForm(emptyPayIn) }}
        title="Terima Pembayaran dari Customer"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowPayInModal(false); setPayInForm(emptyPayIn) }}>Batal</Button>
            <Button onClick={() => {
              if (!payInForm.customer_name) return toast.error('Nama customer wajib diisi')
              if (!payInForm.amount || payInForm.amount <= 0) return toast.error('Jumlah harus lebih dari 0')
              submitPayIn(payInForm)
            }} disabled={savingPayIn}>{savingPayIn ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select label="Rekening Bank *" options={bankOptions} value={payInForm.bank_account_id}
            onChange={v => setPayInForm(f => ({ ...f, bank_account_id: v }))}
            placeholder="Pilih rekening..." />
          <Select label="Invoice Customer" options={unpaidAROptions} value={payInForm.customer_invoice_id}
            onChange={v => {
              const inv = arList.find(x => x.id === v)
              setPayInForm(f => ({ ...f, customer_invoice_id: v, customer_name: inv?.customer_name || f.customer_name, amount: inv ? inv.total - inv.paid_amount : f.amount }))
            }}
            placeholder="Pilih invoice customer..." />
          <Input label="Nama Customer *" value={payInForm.customer_name} onChange={e => setPayInForm(f => ({ ...f, customer_name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tanggal Terima *" type="date" value={payInForm.payment_date} onChange={e => setPayInForm(f => ({ ...f, payment_date: e.target.value }))} />
            <Input label="Jumlah (Rp) *" type="number" value={payInForm.amount} onChange={e => setPayInForm(f => ({ ...f, amount: parseInt(e.target.value) || 0 }))} />
          </div>
          <Select label="Metode Penerimaan" options={PAYMENT_METHODS} value={payInForm.method}
            onChange={v => setPayInForm(f => ({ ...f, method: v }))} />
          <Input label="Referensi" placeholder="No. bukti transfer" value={payInForm.reference} onChange={e => setPayInForm(f => ({ ...f, reference: e.target.value }))} />
        </div>
      </Modal>

      {/* â”€â”€â”€ Delete Confirm â”€â”€â”€ */}
      <Modal
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        title="Hapus Rekening?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button variant="danger" onClick={handleDeleteBank}>Hapus</Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">Hapus rekening <strong>{deleteItem?.label}</strong>? Aksi ini tidak bisa dibatalkan.</p>
      </Modal>
    </div>
  )
}

// â”€â”€â”€ Aging Table Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// ─── Tab Rekonsiliasi ──────────────────────────────────────────────────────────
function TabRecon() {
  const { data: sessionsRaw, loading: loadingSessions, refetch: refetchSessions } = useApi(bankReconApi.getSessions)
  const sessions = sessionsRaw?.value || []

  const sessionsFetchFn = useCallback(async (params = {}) => {
    let filtered = [...sessions]
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
  }, [sessions])

  const sessionColumns = [
    { key: 'bank_account', label: 'Rekening Bank', sortable: true, render: v => <span className="font-medium">{v}</span> },
    { key: 'period', label: 'Periode', sortable: true },
    { key: 'matched', label: 'Cocok', render: (v, row) => <span><span className="text-emerald-600 font-semibold">{v}</span>/{row.bank_items}</span> },
    {
      key: 'unmatched_bank', label: 'Selisih',
      render: (v, row) => {
        const total = (v || 0) + (row.unmatched_system || 0)
        return total > 0
          ? <span className="text-amber-600 font-semibold">{total}</span>
          : <span className="text-emerald-500 text-xs">Nihil</span>
      }
    },
    {
      key: 'difference', label: 'Perbedaan', tdClassName: 'text-right',
      render: v => <span className={v === 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>
        {v === 0 ? 'Seimbang' : formatCurrency(Math.abs(v))}
      </span>
    },
    {
      key: 'status', label: 'Status',
      render: v => v === 'locked'
        ? <Badge variant="success"><Lock className="w-3 h-3 inline mr-1" />Terkunci</Badge>
        : <Badge variant="warning">Proses</Badge>
    },
  ]

  const [view, setView] = useState('list')
  const [selectedSession, setSelectedSession] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [autoMatching, setAutoMatching] = useState(false)
  const [locking, setLocking] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newForm, setNewForm] = useState({ bank_account: '', period_month: '06', period_year: '2026' })

  const loadDetail = async (session) => {
    setSelectedSession(session)
    setLoadingDetail(true)
    setView('detail')
    try { const res = await bankReconApi.getDetail(session.id); setDetail(res.data) } catch {}
    setLoadingDetail(false)
  }

  const handleAutoMatch = async () => {
    setAutoMatching(true)
    try {
      const res = await bankReconApi.autoMatch(selectedSession.id)
      toast.success(res.data.message)
      await loadDetail(selectedSession)
      refetchSessions()
    } catch {}
    setAutoMatching(false)
  }

  const handleLock = async () => {
    setLocking(true)
    try {
      const res = await bankReconApi.lockSession(selectedSession.id)
      toast.success(res.data.message)
      setView('list'); setSelectedSession(null); setDetail(null); refetchSessions()
    } catch {}
    setLocking(false)
  }

  const { submit: submitNew, loading: savingNew } = useSubmit(bankReconApi.createSession, {
    successMsg: 'Sesi rekonsiliasi baru dibuat',
    onSuccess: () => { setShowNewModal(false); refetchSessions() },
  })

  if (view === 'detail') {
    const bankItems = detail?.bank_items || []
    const systemItems = detail?.system_items || []
    const summary = detail?.summary || {}
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <button onClick={() => { setView('list'); setSelectedSession(null); setDetail(null) }}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 font-medium">
            <ChevronLeft className="w-4 h-4" /> Kembali
          </button>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-800">{selectedSession?.bank_account} — {selectedSession?.period}</h3>
          </div>
          {selectedSession?.status === 'open' && (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={handleAutoMatch} disabled={autoMatching}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${autoMatching ? 'animate-spin' : ''}`} />
                {autoMatching ? 'Mencocokkan...' : 'Auto-Match'}
              </Button>
              <Button size="sm" onClick={handleLock} disabled={locking}>
                <Lock className="w-3.5 h-3.5 mr-1" />{locking ? 'Mengunci...' : 'Kunci Rekon'}
              </Button>
            </div>
          )}
        </div>
        {loadingDetail ? (
          <div className="text-center py-8 text-slate-400">Memuat data rekonsiliasi...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Cocok', value: summary.matched || 0, unit: 'item', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                { label: 'Selisih Bank', value: summary.unmatched_bank || 0, unit: 'item', color: 'bg-amber-50 text-amber-700 border-amber-100' },
                { label: 'Selisih Sistem', value: summary.unmatched_system || 0, unit: 'item', color: 'bg-amber-50 text-amber-700 border-amber-100' },
                { label: 'Perbedaan Saldo', value: formatCurrency(Math.abs(summary.difference || 0)), unit: '', color: summary.difference === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border p-3 ${s.color}`}>
                  <div className="text-xl font-bold">{s.value}{s.unit && <span className="text-sm font-normal ml-1">{s.unit}</span>}</div>
                  <div className="text-xs font-medium mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { title: 'Transaksi Bank', items: bankItems },
                { title: 'Transaksi Sistem', items: systemItems },
              ].map(side => (
                <div key={side.title} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 font-semibold text-sm text-slate-700">{side.title}</div>
                  <div className="overflow-auto max-h-72">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-white border-b border-slate-100">
                        <tr>
                          <th className="text-left px-3 py-2 text-slate-500 font-medium">Tgl</th>
                          <th className="text-left px-3 py-2 text-slate-500 font-medium">Keterangan</th>
                          <th className="text-right px-3 py-2 text-slate-500 font-medium">Jumlah</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {side.items.map(item => (
                          <tr key={item.id} className={`border-b border-slate-50 ${item.status === 'matched' ? 'bg-emerald-50/30' : 'bg-amber-50/40'}`}>
                            <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{item.date}</td>
                            <td className="px-3 py-2 max-w-[140px] truncate" title={item.description}>{item.description}</td>
                            <td className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${item.type === 'credit' ? 'text-emerald-600' : 'text-slate-700'}`}>
                              {item.type === 'credit' ? '+' : '−'}{formatCurrency(item.amount)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {item.status === 'matched'
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />
                                : <AlertTriangle className="w-3.5 h-3.5 text-amber-400 inline" />}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-700">Bank Statement Rekonsiliasi</h3>
          <p className="text-xs text-slate-400 mt-0.5">Cocokkan transaksi bank dengan catatan sistem secara otomatis</p>
        </div>
        <Button size="sm" onClick={() => setShowNewModal(true)}>
          <Plus className="w-4 h-4 mr-1" /> Mulai Rekon Baru
        </Button>
      </div>
      <DataTable
        fetchFn={sessionsFetchFn}
        columns={sessionColumns}
        searchPlaceholder="Cari rekening, periode..."
        actions={(row) => (
          <button onClick={() => loadDetail(row)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 hover:bg-indigo-50 rounded-lg">
            Detail
          </button>
        )}
      />
      <Modal open={showNewModal} onClose={() => setShowNewModal(false)} title="Mulai Rekonsiliasi Baru"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowNewModal(false)}>Batal</Button>
            <Button onClick={() => submitNew(newForm)} disabled={savingNew}>{savingNew ? 'Membuat...' : 'Mulai'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Rekening Bank *" placeholder="e.g. BCA — Kas Operasional" value={newForm.bank_account}
            onChange={e => setNewForm(f => ({ ...f, bank_account: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Bulan" value={newForm.period_month} onChange={v => setNewForm(f => ({ ...f, period_month: v }))}
              options={['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => ({ value: m, label: m }))} />
            <Input label="Tahun" type="number" value={newForm.period_year}
              onChange={e => setNewForm(f => ({ ...f, period_year: e.target.value }))} />
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
            <Upload className="w-3.5 h-3.5 inline mr-1" />
            Upload file CSV rekening koran BCA/Mandiri/BNI/BRI tersedia setelah sesi dibuat.
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Tab Petty Cash ────────────────────────────────────────────────────────────
const PC_CATEGORIES = [
  { value: 'Office Supplies', label: 'Alat Tulis & ATK' },
  { value: 'Transport', label: 'Transportasi' },
  { value: 'Meals', label: 'Konsumsi & Makan' },
  { value: 'Maintenance', label: 'Perbaikan Kecil' },
  { value: 'Communication', label: 'Komunikasi' },
  { value: 'Other', label: 'Lainnya' },
]

const pcTxColumns = [
  { key: 'date', label: 'Tanggal', sortable: true },
  { key: 'department', label: 'Departemen', render: v => <Badge variant="info">{v}</Badge> },
  { key: 'category', label: 'Kategori', render: v => <Badge variant="default">{v}</Badge> },
  { key: 'description', label: 'Keterangan' },
  { key: 'amount', label: 'Jumlah', sortable: true, render: (v, row) => (
    <span className={`font-semibold ${row.type === 'credit' ? 'text-emerald-600' : 'text-slate-700'}`}>
      {row.type === 'credit' ? '+' : '−'}{formatCurrency(v)}
    </span>
  )},
  { key: 'created_by', label: 'Oleh' },
]

function TabPettyCash() {
  const pcTxRef = useRef(null)
  const { data: pcRaw, refetch: refetchPC } = useApi(bankReconApi.getPettyCash)
  const accounts = pcRaw?.value || []
  const totalLimit = pcRaw?.total_limit || 0
  const totalBalance = pcRaw?.total_balance || 0
  const lowCount = pcRaw?.low_count || 0

  const [showTxModal, setShowTxModal] = useState(false)
  const [showReplModal, setShowReplModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [showNewAccModal, setShowNewAccModal] = useState(false)

  const emptyTx = { petty_cash_id: '', department: '', description: '', category: 'Office Supplies', amount: 0, date: new Date().toISOString().split('T')[0] }
  const emptyRepl = { petty_cash_id: '', amount: 0, notes: '' }
  const emptyAcc = { department: '', custodian: '', limit: 0 }

  const [txForm, setTxForm] = useState(emptyTx)
  const [replForm, setReplForm] = useState(emptyRepl)
  const [accForm, setAccForm] = useState(emptyAcc)

  const { submit: submitTx, loading: savingTx } = useSubmit(bankReconApi.createPettyCashTransaction, {
    successMsg: 'Pengeluaran kas kecil dicatat',
    onSuccess: () => { setShowTxModal(false); setTxForm(emptyTx); pcTxRef.current?.refetch(); refetchPC() },
  })

  const { submit: submitAcc, loading: savingAcc } = useSubmit(bankReconApi.createPettyCash, {
    successMsg: 'Kas kecil baru ditambahkan',
    onSuccess: () => { setShowNewAccModal(false); setAccForm(emptyAcc); refetchPC() },
  })

  const openReplenish = (acc) => {
    setSelectedAccount(acc)
    setReplForm({ petty_cash_id: acc.id, amount: acc.limit - acc.balance, notes: '' })
    setShowReplModal(true)
  }

  const handleReplenish = async () => {
    if (!replForm.amount || replForm.amount <= 0) return toast.error('Jumlah harus > 0')
    try {
      const { petty_cash_id, ...data } = replForm
      const res = await bankReconApi.replenish(petty_cash_id, data)
      toast.success(res.data.message)
      setShowReplModal(false); setReplForm(emptyRepl)
      pcTxRef.current?.refetch(); refetchPC()
    } catch { toast.error('Gagal mengisi ulang') }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">Kas Kecil (Petty Cash)</h3>
        <Button size="sm" onClick={() => setShowNewAccModal(true)}>
          <Plus className="w-4 h-4 mr-1" /> Tambah Kas Kecil
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Saldo Aktual', value: formatCurrency(totalBalance), sub: `Limit: ${formatCurrency(totalLimit)}`, color: 'border-indigo-100 bg-indigo-50 text-indigo-700' },
          { label: 'Kas Kecil Aktif', value: accounts.length, sub: 'Departemen terdaftar', color: 'border-emerald-100 bg-emerald-50 text-emerald-700' },
          { label: 'Hampir Habis', value: lowCount, sub: 'Perlu isi ulang', color: lowCount > 0 ? 'border-amber-100 bg-amber-50 text-amber-600' : 'border-slate-100 bg-slate-50 text-slate-500' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs font-medium mt-0.5">{s.label}</div>
            <div className="text-xs opacity-60 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {accounts.map(acc => {
          const pct = Math.round((acc.balance / acc.limit) * 100)
          const isLow = acc.status === 'low' || pct < 20
          return (
            <div key={acc.id} className={`border rounded-xl p-4 ${isLow ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLow ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  <Banknote className="w-4 h-4" />
                </div>
                {isLow && <AlertTriangle className="w-4 h-4 text-amber-500" />}
              </div>
              <p className="font-semibold text-sm text-slate-800">{acc.department}</p>
              <p className="text-xs text-slate-400 mt-0.5">{acc.custodian}</p>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Saldo</span>
                  <span className={`font-semibold ${isLow ? 'text-amber-600' : 'text-emerald-600'}`}>{pct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${isLow ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-sm font-semibold text-slate-800 mt-2">{formatCurrency(acc.balance)}</p>
                <p className="text-xs text-slate-400">dari {formatCurrency(acc.limit)}</p>
              </div>
              <div className="mt-3 flex gap-1">
                <button onClick={() => { setTxForm(f => ({ ...f, petty_cash_id: acc.id, department: acc.department })); setShowTxModal(true) }}
                  className="flex-1 text-xs py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium">
                  Catat
                </button>
                <button onClick={() => openReplenish(acc)}
                  className={`flex-1 text-xs py-1.5 rounded-lg font-medium ${isLow ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}>
                  Isi Ulang
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div>
        <h4 className="font-semibold text-slate-700 mb-3">Riwayat Transaksi Kas Kecil</h4>
        <DataTable ref={pcTxRef} fetchFn={bankReconApi.getPettyCashTransactions} columns={pcTxColumns}
          toolbar={<Button size="sm" onClick={() => setShowTxModal(true)}><Plus className="w-4 h-4 mr-1" /> Catat Pengeluaran</Button>}
        />
      </div>

      <Modal open={showTxModal} onClose={() => { setShowTxModal(false); setTxForm(emptyTx) }}
        title="Catat Pengeluaran Kas Kecil"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowTxModal(false); setTxForm(emptyTx) }}>Batal</Button>
            <Button onClick={() => {
              if (!txForm.description) return toast.error('Keterangan wajib diisi')
              if (!txForm.amount || txForm.amount <= 0) return toast.error('Jumlah harus > 0')
              submitTx(txForm)
            }} disabled={savingTx}>{savingTx ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Departemen" placeholder="e.g. Operasional" value={txForm.department}
            onChange={e => setTxForm(f => ({ ...f, department: e.target.value }))} />
          <Select label="Kategori" options={PC_CATEGORIES} value={txForm.category}
            onChange={v => setTxForm(f => ({ ...f, category: v }))} />
          <Input label="Keterangan *" placeholder="Jelaskan pengeluaran..." value={txForm.description}
            onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tanggal *" type="date" value={txForm.date}
              onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} />
            <Input label="Jumlah (Rp) *" type="number" value={txForm.amount}
              onChange={e => setTxForm(f => ({ ...f, amount: parseInt(e.target.value) || 0 }))} />
          </div>
        </div>
      </Modal>

      <Modal open={showReplModal} onClose={() => { setShowReplModal(false); setReplForm(emptyRepl) }}
        title={`Pengisian Ulang — ${selectedAccount?.department}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowReplModal(false); setReplForm(emptyRepl) }}>Batal</Button>
            <Button onClick={handleReplenish}>Ajukan</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg text-sm">
            <p className="text-slate-500">Saldo saat ini: <strong className="text-slate-800">{formatCurrency(selectedAccount?.balance || 0)}</strong></p>
            <p className="text-slate-500">Limit: <strong className="text-slate-800">{formatCurrency(selectedAccount?.limit || 0)}</strong></p>
          </div>
          <Input label="Jumlah Pengisian (Rp) *" type="number" value={replForm.amount}
            onChange={e => setReplForm(f => ({ ...f, amount: parseInt(e.target.value) || 0 }))} />
          <Input label="Catatan" placeholder="Alasan pengisian ulang..." value={replForm.notes}
            onChange={e => setReplForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
      </Modal>

      <Modal open={showNewAccModal} onClose={() => { setShowNewAccModal(false); setAccForm(emptyAcc) }}
        title="Tambah Kas Kecil Baru"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowNewAccModal(false); setAccForm(emptyAcc) }}>Batal</Button>
            <Button onClick={() => {
              if (!accForm.department) return toast.error('Departemen wajib diisi')
              if (!accForm.custodian) return toast.error('Pemegang kas wajib diisi')
              if (!accForm.limit || accForm.limit <= 0) return toast.error('Limit harus > 0')
              submitAcc(accForm)
            }} disabled={savingAcc}>{savingAcc ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Departemen *" placeholder="e.g. Marketing" value={accForm.department}
            onChange={e => setAccForm(f => ({ ...f, department: e.target.value }))} />
          <Input label="Pemegang Kas *" placeholder="Nama karyawan" value={accForm.custodian}
            onChange={e => setAccForm(f => ({ ...f, custodian: e.target.value }))} />
          <Input label="Limit Kas Kecil (Rp) *" type="number" value={accForm.limit}
            onChange={e => setAccForm(f => ({ ...f, limit: parseInt(e.target.value) || 0 }))} />
        </div>
      </Modal>
    </div>
  )
}

function AgingTable({ data, nameKey, numberKey, title, colorScheme }) {
  const buckets = {}
  AGING_ORDER.forEach(b => { buckets[b] = { items: [], total: 0 } })
  data.forEach(r => {
    const b = r.aging_bucket || 'current'
    if (!buckets[b]) buckets[b] = { items: [], total: 0 }
    buckets[b].items.push(r)
    buckets[b].total += r.outstanding || 0
  })

  const grandTotal = data.reduce((a, r) => a + (r.outstanding || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">{title}</h3>
        <span className="text-sm font-semibold text-slate-600">Total: <span className="text-indigo-600">{formatCurrency(grandTotal)}</span></span>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-5 gap-2">
        {AGING_ORDER.map(bucket => (
          <div key={bucket} className="text-center p-3 rounded-lg border border-slate-100 bg-slate-50">
            <div className="text-xs text-slate-500 mb-1">{bucket === 'current' ? 'Belum Jatuh' : bucket + ' hari'}</div>
            <div className="font-semibold text-sm">{formatCurrency(buckets[bucket]?.total || 0)}</div>
            <div className="text-xs text-slate-400">{buckets[bucket]?.items?.length || 0} item</div>
          </div>
        ))}
      </div>

      {/* Detail table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-3 text-slate-500 font-medium">Nama</th>
              <th className="text-left py-2 px-3 text-slate-500 font-medium">No. Dokumen</th>
              <th className="text-left py-2 px-3 text-slate-500 font-medium">Tgl Invoice</th>
              <th className="text-left py-2 px-3 text-slate-500 font-medium">Jatuh Tempo</th>
              <th className="text-right py-2 px-3 text-slate-500 font-medium">Outstanding</th>
              <th className="text-center py-2 px-3 text-slate-500 font-medium">Aging</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">Tidak ada data outstanding</td></tr>
            ) : (
              data.map((r, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-medium">{r[nameKey]}</td>
                  <td className="py-2.5 px-3 font-mono text-xs text-indigo-600">{r[numberKey]}</td>
                  <td className="py-2.5 px-3">{r.inv_date ? formatDate(r.inv_date) : 'â€”'}</td>
                  <td className="py-2.5 px-3">{r.due_date ? formatDate(r.due_date) : 'â€”'}</td>
                  <td className="py-2.5 px-3 text-right font-semibold">{formatCurrency(r.outstanding)}</td>
                  <td className="py-2.5 px-3 text-center">{agingBadge(r.aging_bucket)}</td>
                </tr>
              ))
            )}
          </tbody>
          {data.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={4} className="py-2.5 px-3 font-semibold text-slate-700">Total</td>
                <td className="py-2.5 px-3 text-right font-bold text-indigo-700">{formatCurrency(grandTotal)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
