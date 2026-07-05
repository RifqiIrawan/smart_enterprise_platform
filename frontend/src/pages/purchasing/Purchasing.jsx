import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import StatCard from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DataTable from '@/components/ui/DataTable'
import { ShoppingCart, FileText, CheckCircle, Clock, Plus, Check, X, Pencil, Trash2, ArrowRight, PackageCheck, Send, ClipboardList, Trophy } from 'lucide-react'
import { purchasingApi } from '@/api'
import { useApi, useSubmit } from '@/hooks/useApi'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/utils/format'
import toast from 'react-hot-toast'

const statusBadge = (s) => ({
  approved: <Badge variant="success">Approved</Badge>,
  pending: <Badge variant="warning">Pending</Badge>,
  pending_approval: <Badge variant="info">Menunggu Approval</Badge>,
  review: <Badge variant="info">Review</Badge>,
  rejected: <Badge variant="danger">Rejected</Badge>,
  converted: <Badge variant="primary">→ PO</Badge>,
  confirmed: <Badge variant="success">Confirmed</Badge>,
  processing: <Badge variant="info">Processing</Badge>,
  delivered: <Badge variant="primary">Delivered</Badge>,
  draft: <Badge>Draft</Badge>,
  sent: <Badge variant="info">Terkirim</Badge>,
  offers_received: <Badge variant="warning">Penawaran Masuk</Badge>,
  closed: <Badge variant="success">Closed</Badge>,
})[s] || <Badge>{s}</Badge>

const conditionBadge = (c) => ({
  good: <Badge variant="success">Baik</Badge>,
  partial: <Badge variant="warning">Sebagian</Badge>,
  damaged: <Badge variant="danger">Rusak</Badge>,
})[c] || <Badge>{c}</Badge>

const emptyPR = { pr_number: '', item_name: '', requester: '', department: '', qty: '', unit: 'pcs', estimated_price: '', notes: '' }
const emptyPO = { po_number: '', vendor_name: '', total_amount: '', delivery_date: '', notes: '' }
const emptyVendor = { name: '', category: '', contact: '', email: '', address: '', rating: '' }
const emptyGRN = { po_id: '', received_qty: '', received_date: '', condition: 'good', received_by: '', notes: '', inventory_id: '' }
const emptyConvert = { vendor_name: '', vendor_id: '', unit_price: '', delivery_date: '', notes: '' }
const emptyRFQ = { rfq_number: '', pr_id: '', item_name: '', qty: '', unit: 'pcs', description: '', notes: '' }
const emptyOffer = { vendor_id: '', vendor_name: '', price: '', lead_time_days: '', payment_term: 'NET30', notes: '' }
const deptOptions = ['Produksi', 'HR', 'IT', 'Finance', 'Marketing', 'Operasional'].map(d => ({ value: d, label: d }))

const prColumns = [
  { key: 'pr_number', label: 'No. PR', sortable: true, render: (v) => <span className="font-mono text-xs text-blue-600 font-semibold">{v}</span> },
  { key: 'item_name', label: 'Item', sortable: true },
  { key: 'requester', label: 'Pemohon', sortable: true },
  { key: 'department', label: 'Dept', sortable: true },
  { key: 'estimated_price', label: 'Estimasi', render: (v) => <span className="font-medium">{formatCurrency(v || 0)}</span> },
  { key: 'status', label: 'Status', sortable: true, render: (v) => statusBadge(v) },
]

const poColumns = [
  { key: 'po_number', label: 'No. PO', sortable: true, render: (v) => <span className="font-mono text-xs text-blue-600 font-semibold">{v}</span> },
  { key: 'vendor_name', label: 'Vendor', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
  { key: 'total_amount', label: 'Nilai', sortable: true, render: (v) => <span className="font-medium">{formatCurrency(v || 0)}</span> },
  { key: 'order_date', label: 'Tgl Order', sortable: true, render: (v) => v ? formatDate(v) : '—' },
  { key: 'delivery_date', label: 'Delivery', sortable: true, render: (v) => v ? formatDate(v) : '—' },
  { key: 'status', label: 'Status', sortable: true, render: (v) => statusBadge(v) },
]

const vendorColumns = [
  { key: 'name', label: 'Nama Vendor', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
  { key: 'category', label: 'Kategori', sortable: true },
  { key: 'email', label: 'Email', tdClassName: 'text-xs text-gray-500' },
  { key: 'contact', label: 'Telepon', tdClassName: 'text-xs' },
  { key: 'rating', label: 'Rating', sortable: true, render: (v) => v ? <span className="text-amber-600 font-semibold">⭐ {v}</span> : '—' },
  { key: 'status', label: 'Status', render: () => <Badge variant="success" dot>Aktif</Badge> },
]

const rfqColumns = [
  { key: 'rfq_number', label: 'No. RFQ', sortable: true, render: (v) => <span className="font-mono text-xs text-blue-600 font-semibold">{v}</span> },
  { key: 'item_name', label: 'Item', sortable: true },
  { key: 'qty', label: 'Qty', render: (v, row) => <span>{v} {row.unit}</span> },
  { key: 'status', label: 'Status', sortable: true, render: (v) => statusBadge(v) },
]

const grnColumns = [
  { key: 'po_number', label: 'No. PO', sortable: true, render: (v) => <span className="font-mono text-xs text-blue-600 font-semibold">{v}</span> },
  { key: 'vendor_name', label: 'Vendor', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
  { key: 'received_qty', label: 'Qty Diterima', sortable: true, render: (v) => <span className="font-semibold">{v}</span> },
  { key: 'received_date', label: 'Tgl Terima', sortable: true, render: (v) => v ? formatDate(v) : '—' },
  { key: 'condition', label: 'Kondisi', render: (v) => conditionBadge(v) },
  { key: 'received_by', label: 'Diterima Oleh' },
  { key: 'notes', label: 'Catatan', tdClassName: 'text-xs text-gray-500' },
]

const VALID_TABS = ['pr', 'po', 'rfq', 'grn', 'vendor']

export default function Purchasing() {
  const { tab } = useParams()
  const navigate = useNavigate()
  const activeTab = VALID_TABS.includes(tab) ? tab : 'pr'
  useEffect(() => {
    if (!VALID_TABS.includes(tab)) navigate('/purchasing/pr', { replace: true })
  }, [tab])
  const { canDo } = useAuthStore()
  const menuKey = `purchasing.${activeTab}`
  const canAdd = canDo(menuKey, 'add')
  const canEdit = canDo(menuKey, 'edit')
  const canDelete = canDo(menuKey, 'delete')
  const [showModal, setShowModal] = useState(false)
  const [editVendor, setEditVendor] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [deleteType, setDeleteType] = useState('')
  const [convertPR, setConvertPR] = useState(null)
  const [prForm, setPRForm] = useState(emptyPR)
  const [poForm, setPOForm] = useState(emptyPO)
  const [vendorForm, setVendorForm] = useState(emptyVendor)
  const [grnForm, setGRNForm] = useState(emptyGRN)
  const [convertForm, setConvertForm] = useState(emptyConvert)
  const [rfqForm, setRFQForm] = useState(emptyRFQ)
  const [sendRFQItem, setSendRFQItem] = useState(null)
  const [selectedVendorIds, setSelectedVendorIds] = useState([])
  const [offersRFQItem, setOffersRFQItem] = useState(null)
  const [rfqOffers, setRFQOffers] = useState([])
  const [offerForm, setOfferForm] = useState(emptyOffer)
  const [winnerDelivery, setWinnerDelivery] = useState('')
  const prRef = useRef(null)
  const poRef = useRef(null)
  const vendorRef = useRef(null)
  const grnRef = useRef(null)
  const rfqRef = useRef(null)

  const { data: statsRaw } = useApi(purchasingApi.getPR)
  const stats = Array.isArray(statsRaw?.value) ? statsRaw.value : []
  const approvedPRs = stats.filter(p => p.status === 'approved')
  const { data: vendorsRaw } = useApi(purchasingApi.getVendors)
  const vendorList = Array.isArray(vendorsRaw?.value) ? vendorsRaw.value : []

  const fetchRFQOffers = async (rfqId) => {
    try { const res = await purchasingApi.getRFQOffers(rfqId); setRFQOffers(res?.data || []) }
    catch { setRFQOffers([]) }
  }

  useEffect(() => {
    if (offersRFQItem) fetchRFQOffers(offersRFQItem.id)
    else setRFQOffers([])
  }, [offersRFQItem])

  const { submit: submitPR, loading: savingPR } = useSubmit(purchasingApi.createPR, {
    successMsg: 'Purchase Request berhasil dibuat',
    onSuccess: () => { setShowModal(false); setPRForm(emptyPR); prRef.current?.refetch() },
  })
  const { submit: submitPO, loading: savingPO } = useSubmit(purchasingApi.createPO, {
    successMsg: 'Purchase Order berhasil dibuat',
    onSuccess: () => { setShowModal(false); setPOForm(emptyPO); poRef.current?.refetch() },
  })
  const { submit: submitVendor, loading: savingVendor } = useSubmit(purchasingApi.createVendor, {
    successMsg: 'Vendor berhasil ditambahkan',
    onSuccess: () => { setShowModal(false); setVendorForm(emptyVendor); vendorRef.current?.refetch() },
  })
  const { submit: updateVendorFn, loading: updatingVendor } = useSubmit(
    (data) => purchasingApi.updateVendor(editVendor?.id, data),
    {
      successMsg: 'Data vendor diperbarui',
      onSuccess: () => { setEditVendor(null); vendorRef.current?.refetch() },
    }
  )
  const { submit: submitGRN, loading: savingGRN } = useSubmit(purchasingApi.createGRN, {
    successMsg: 'GRN berhasil dicatat & stok diperbarui',
    onSuccess: () => { setShowModal(false); setGRNForm(emptyGRN); grnRef.current?.refetch() },
  })
  const { submit: submitConvert, loading: converting } = useSubmit(
    (data) => purchasingApi.convertPRtoPO(convertPR?.id, data),
    {
      successMsg: 'PR berhasil dikonversi menjadi PO',
      onSuccess: () => { setConvertPR(null); prRef.current?.refetch(); poRef.current?.refetch() },
    }
  )
  const { submit: submitRFQ, loading: savingRFQ } = useSubmit(purchasingApi.createRFQ, {
    successMsg: 'RFQ berhasil dibuat',
    onSuccess: () => { setShowModal(false); setRFQForm(emptyRFQ); rfqRef.current?.refetch() },
  })
  const { submit: submitSendRFQ, loading: sendingRFQ } = useSubmit(
    (data) => purchasingApi.sendRFQ(sendRFQItem?.id, data),
    {
      successMsg: 'RFQ dikirim ke vendor terpilih',
      onSuccess: () => { setSendRFQItem(null); setSelectedVendorIds([]); rfqRef.current?.refetch() },
    }
  )
  const { submit: submitOffer, loading: savingOffer } = useSubmit(
    (data) => purchasingApi.submitRFQOffer(offersRFQItem?.id, data),
    {
      successMsg: 'Penawaran vendor dicatat',
      onSuccess: () => { setOfferForm(emptyOffer); fetchRFQOffers(offersRFQItem.id); rfqRef.current?.refetch() },
    }
  )
  const { submit: submitSelectWinner, loading: selectingWinner } = useSubmit(
    (data) => purchasingApi.selectRFQWinner(offersRFQItem?.id, data),
    {
      successMsg: 'Vendor pemenang dipilih & PO otomatis dibuat',
      onSuccess: () => { setOffersRFQItem(null); setWinnerDelivery(''); rfqRef.current?.refetch(); poRef.current?.refetch() },
    }
  )

  const handleApprove = async (id) => {
    try { await purchasingApi.updatePRStatus(id, 'approved'); toast.success('PR diapprove'); prRef.current?.refetch() }
    catch { toast.error('Gagal approve') }
  }
  const handleReject = async (id) => {
    try { await purchasingApi.updatePRStatus(id, 'rejected'); toast.success('PR ditolak'); prRef.current?.refetch() }
    catch { toast.error('Gagal menolak') }
  }

  const handleDelete = async () => {
    try {
      if (deleteType === 'pr') await purchasingApi.deletePR(deleteItem.id)
      else if (deleteType === 'po') await purchasingApi.deletePO(deleteItem.id)
      else if (deleteType === 'vendor') await purchasingApi.deleteVendor(deleteItem.id)
      else if (deleteType === 'rfq') await purchasingApi.deleteRFQ(deleteItem.id)
      toast.success('Berhasil dihapus')
      setDeleteItem(null)
      if (deleteType === 'pr') prRef.current?.refetch()
      else if (deleteType === 'po') poRef.current?.refetch()
      else if (deleteType === 'rfq') rfqRef.current?.refetch()
      else vendorRef.current?.refetch()
    } catch { toast.error('Gagal menghapus') }
  }

  const openEditVendor = (row) => {
    setEditVendor(row)
    setVendorForm({ name: row.name, category: row.category, contact: row.contact || '', email: row.email || '', address: row.address || '', rating: String(row.rating || '') })
  }

  const toggleVendorSelection = (vendorId) => {
    setSelectedVendorIds(ids => ids.includes(vendorId) ? ids.filter(v => v !== vendorId) : [...ids, vendorId])
  }

  const sectionTitle = {
    pr: 'Purchase Request', po: 'Purchase Order', rfq: 'RFQ / Tender', grn: 'GRN', vendor: 'Vendor',
  }[activeTab]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-semibold text-slate-800">{sectionTitle}</h1>
        {canAdd && activeTab !== 'rfq' && (
          <Button size="sm" icon={<Plus />} onClick={() => { setEditVendor(null); setShowModal(true) }}>
            {activeTab === 'pr' ? 'Buat PR' : activeTab === 'po' ? 'Buat PO' : activeTab === 'grn' ? 'Catat GRN' : 'Tambah Vendor'}
          </Button>
        )}
        {canAdd && activeTab === 'rfq' && (
          <Button size="sm" icon={<Plus />} onClick={() => { setRFQForm(emptyRFQ); setShowModal(true) }}>Buat RFQ</Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="PR Bulan Ini" value={String(statsRaw?.['@odata.count'] ?? stats.length)} trend={12.5} icon={FileText} color="blue" />
        <StatCard title="PR Pending" value={String(stats.filter(p => p.status === 'pending').length)} subtitle="menunggu approval" icon={Clock} color="amber" />
        <StatCard title="PO Aktif" value="3" icon={ShoppingCart} color="purple" />
        <StatCard title="Vendor Aktif" value={String(vendorList.length)} icon={CheckCircle} color="emerald" />
      </div>

      {activeTab === 'pr' && (
        <Card>
          <CardHeader><CardTitle>Daftar Purchase Request</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              ref={prRef}
              columns={prColumns}
              fetchFn={purchasingApi.getPR}
              searchPlaceholder="Cari nomor PR, item, dept..."
              defaultPageSize={10}
              toolbar={canAdd && <Button size="sm" icon={<Plus />} onClick={() => setShowModal(true)}>Buat PR</Button>}
              actions={(row) => (
                <div className="flex gap-1">
                  {canEdit && row.status === 'pending' && (
                    <>
                      <button onClick={() => handleApprove(row.id)} title="Approve"
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"><Check className="w-4 h-4" /></button>
                      <button onClick={() => handleReject(row.id)} title="Reject"
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"><X className="w-4 h-4" /></button>
                    </>
                  )}
                  {canEdit && row.status === 'approved' && (
                    <button onClick={() => { setConvertPR(row); setConvertForm(emptyConvert) }}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-purple-600 hover:bg-purple-50 transition-colors font-medium">
                      <ArrowRight className="w-3.5 h-3.5" /> → PO
                    </button>
                  )}
                  {canDelete && row.status === 'pending' && (
                    <button onClick={() => { setDeleteItem(row); setDeleteType('pr') }}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              )}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'po' && (
        <Card>
          <CardHeader><CardTitle>Daftar Purchase Order</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              ref={poRef}
              columns={poColumns}
              fetchFn={purchasingApi.getPO}
              searchPlaceholder="Cari nomor PO, vendor..."
              defaultPageSize={10}
              toolbar={canAdd && <Button size="sm" icon={<Plus />} onClick={() => setShowModal(true)}>Buat PO</Button>}
              actions={(row) => canDelete && row.status === 'pending' && (
                <button onClick={() => { setDeleteItem(row); setDeleteType('po') }}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-red-500 hover:bg-red-50 transition-colors font-medium">
                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                </button>
              )}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'rfq' && (
        <Card>
          <CardHeader><CardTitle>RFQ / Tender</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              ref={rfqRef}
              columns={rfqColumns}
              fetchFn={purchasingApi.getRFQ}
              searchPlaceholder="Cari nomor RFQ, item..."
              defaultPageSize={10}
              toolbar={canAdd && <Button size="sm" icon={<Plus />} onClick={() => { setRFQForm(emptyRFQ); setShowModal(true) }}>Buat RFQ</Button>}
              actions={(row) => (
                <div className="flex gap-1">
                  {canEdit && row.status === 'draft' && (
                    <button onClick={() => { setSendRFQItem(row); setSelectedVendorIds([]) }}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-blue-600 hover:bg-blue-50 transition-colors font-medium">
                      <Send className="w-3.5 h-3.5" /> Kirim
                    </button>
                  )}
                  {(row.status === 'sent' || row.status === 'offers_received') && (
                    <button onClick={() => { setOffersRFQItem(row); setOfferForm(emptyOffer) }}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-purple-600 hover:bg-purple-50 transition-colors font-medium">
                      <ClipboardList className="w-3.5 h-3.5" /> Penawaran
                    </button>
                  )}
                  {row.status === 'closed' && (
                    <button onClick={() => { setOffersRFQItem(row) }}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-gray-500 hover:bg-gray-100 transition-colors font-medium">
                      <ClipboardList className="w-3.5 h-3.5" /> Lihat
                    </button>
                  )}
                  {canDelete && row.status === 'draft' && (
                    <button onClick={() => { setDeleteItem(row); setDeleteType('rfq') }}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              )}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'grn' && (
        <Card>
          <CardHeader><CardTitle>Goods Receipt Notes (GRN)</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              ref={grnRef}
              columns={grnColumns}
              fetchFn={purchasingApi.getGRN}
              searchPlaceholder="Cari nomor PO, vendor..."
              defaultPageSize={10}
              toolbar={canAdd && <Button size="sm" icon={<PackageCheck />} onClick={() => setShowModal(true)}>Catat GRN</Button>}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'vendor' && (
        <Card>
          <CardHeader><CardTitle>Daftar Vendor</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              ref={vendorRef}
              columns={vendorColumns}
              fetchFn={purchasingApi.getVendors}
              searchPlaceholder="Cari nama vendor, kategori..."
              defaultPageSize={10}
              toolbar={canAdd && <Button size="sm" icon={<Plus />} onClick={() => { setEditVendor(null); setVendorForm(emptyVendor); setShowModal(true) }}>Tambah Vendor</Button>}
              actions={(row) => (
                <div className="flex gap-1">
                  {canEdit && (
                    <button onClick={() => openEditVendor(row)}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-blue-600 hover:bg-blue-50 transition-colors font-medium">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => { setDeleteItem(row); setDeleteType('vendor') }}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-red-500 hover:bg-red-50 transition-colors font-medium">
                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                    </button>
                  )}
                </div>
              )}
            />
          </CardContent>
        </Card>
      )}

      {/* PR Modal */}
      {activeTab === 'pr' && (
        <Modal open={showModal} onClose={() => { setShowModal(false); setPRForm(emptyPR) }} title="Buat Purchase Request"
          footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button><Button loading={savingPR} onClick={() => submitPR({ ...prForm, estimated_price: parseInt(prForm.estimated_price) || 0, qty: parseInt(prForm.qty) || 0 })}>Simpan</Button></>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="No. PR" placeholder="PR-2030" value={prForm.pr_number} onChange={e => setPRForm({ ...prForm, pr_number: e.target.value })} />
              <Input label="Pemohon" value={prForm.requester} onChange={e => setPRForm({ ...prForm, requester: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Departemen" value={prForm.department} onChange={e => setPRForm({ ...prForm, department: e.target.value })} options={deptOptions} placeholder="Pilih dept..." />
              <Input label="Nama Item" value={prForm.item_name} onChange={e => setPRForm({ ...prForm, item_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Qty" type="number" value={prForm.qty} onChange={e => setPRForm({ ...prForm, qty: e.target.value })} />
              <Select label="Satuan" value={prForm.unit} onChange={e => setPRForm({ ...prForm, unit: e.target.value })}
                options={['pcs', 'kg', 'liter', 'meter', 'lembar', 'unit'].map(u => ({ value: u, label: u }))} />
              <Input label="Estimasi Harga (Rp)" type="number" value={prForm.estimated_price} onChange={e => setPRForm({ ...prForm, estimated_price: e.target.value })} />
            </div>
            <Input label="Catatan" value={prForm.notes} onChange={e => setPRForm({ ...prForm, notes: e.target.value })} />
          </div>
        </Modal>
      )}

      {/* PO Modal */}
      {activeTab === 'po' && (
        <Modal open={showModal} onClose={() => { setShowModal(false); setPOForm(emptyPO) }} title="Buat Purchase Order"
          footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button><Button loading={savingPO} onClick={() => submitPO({ ...poForm, total_amount: parseInt(poForm.total_amount) || 0 })}>Simpan</Button></>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="No. PO" placeholder="PO-1210" value={poForm.po_number} onChange={e => setPOForm({ ...poForm, po_number: e.target.value })} />
              <Input label="Nama Vendor" value={poForm.vendor_name} onChange={e => setPOForm({ ...poForm, vendor_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Total Nilai (Rp)" type="number" value={poForm.total_amount} onChange={e => setPOForm({ ...poForm, total_amount: e.target.value })} />
              <Input label="Tanggal Delivery" type="date" value={poForm.delivery_date} onChange={e => setPOForm({ ...poForm, delivery_date: e.target.value })} />
            </div>
            <Input label="Catatan" value={poForm.notes} onChange={e => setPOForm({ ...poForm, notes: e.target.value })} />
          </div>
        </Modal>
      )}

      {/* RFQ Create Modal */}
      {activeTab === 'rfq' && (
        <Modal open={showModal} onClose={() => { setShowModal(false); setRFQForm(emptyRFQ) }} title="Buat RFQ / Tender"
          footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button><Button loading={savingRFQ} onClick={() => submitRFQ({ ...rfqForm, qty: parseInt(rfqForm.qty) || 0 })}>Simpan</Button></>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="No. RFQ" placeholder="RFQ-2026-005" value={rfqForm.rfq_number} onChange={e => setRFQForm({ ...rfqForm, rfq_number: e.target.value })} />
              <Select label="Dari PR (opsional)" value={rfqForm.pr_id} placeholder="Manual / tanpa PR"
                onChange={e => {
                  const pr = approvedPRs.find(p => p.id === e.target.value)
                  setRFQForm({
                    ...rfqForm, pr_id: e.target.value,
                    item_name: pr ? pr.item_name : rfqForm.item_name,
                    qty: pr ? String(pr.qty) : rfqForm.qty,
                    unit: pr ? pr.unit : rfqForm.unit,
                  })
                }}
                options={approvedPRs.map(p => ({ value: p.id, label: `${p.pr_number} — ${p.item_name}` }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Nama Item" className="col-span-2" value={rfqForm.item_name} onChange={e => setRFQForm({ ...rfqForm, item_name: e.target.value })} />
              <Input label="Qty" type="number" value={rfqForm.qty} onChange={e => setRFQForm({ ...rfqForm, qty: e.target.value })} />
            </div>
            <Select label="Satuan" value={rfqForm.unit} onChange={e => setRFQForm({ ...rfqForm, unit: e.target.value })}
              options={['pcs', 'kg', 'liter', 'meter', 'lembar', 'unit', 'batang', 'paket'].map(u => ({ value: u, label: u }))} />
            <Input label="Deskripsi / Spesifikasi" value={rfqForm.description} onChange={e => setRFQForm({ ...rfqForm, description: e.target.value })} />
            <Input label="Catatan" value={rfqForm.notes} onChange={e => setRFQForm({ ...rfqForm, notes: e.target.value })} />
          </div>
        </Modal>
      )}

      {/* Send RFQ Modal */}
      <Modal open={!!sendRFQItem} onClose={() => setSendRFQItem(null)} title={`Kirim RFQ: ${sendRFQItem?.rfq_number}`}
        footer={<>
          <Button variant="secondary" onClick={() => setSendRFQItem(null)}>Batal</Button>
          <Button loading={sendingRFQ} disabled={!selectedVendorIds.length}
            onClick={() => submitSendRFQ({ vendors: vendorList.filter(v => selectedVendorIds.includes(v.id)).map(v => ({ vendor_id: v.id, vendor_name: v.name })) })}>
            Kirim ke {selectedVendorIds.length} Vendor
          </Button>
        </>}>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          <p className="text-xs text-gray-500 mb-2">Pilih vendor yang akan menerima permintaan penawaran ini:</p>
          {vendorList.map(v => (
            <label key={v.id} className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer text-sm">
              <input type="checkbox" checked={selectedVendorIds.includes(v.id)} onChange={() => toggleVendorSelection(v.id)} />
              <span className="font-medium">{v.name}</span>
              <span className="text-xs text-gray-400">{v.category}</span>
            </label>
          ))}
        </div>
      </Modal>

      {/* RFQ Offers / Compare Modal */}
      <Modal open={!!offersRFQItem} onClose={() => setOffersRFQItem(null)} title={`Penawaran Vendor: ${offersRFQItem?.rfq_number}`}
        footer={<Button variant="secondary" onClick={() => setOffersRFQItem(null)}>Tutup</Button>}>
        <div className="space-y-5">
          {offersRFQItem?.status !== 'closed' && canDo('purchasing.rfq', 'add') && (
            <div className="p-3 bg-gray-50 rounded-lg space-y-3">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Input Penawaran Vendor</p>
              <div className="grid grid-cols-2 gap-3">
                <Select label="Vendor" value={offerForm.vendor_id} placeholder="Pilih vendor..."
                  onChange={e => {
                    const v = vendorList.find(x => x.id === e.target.value)
                    setOfferForm({ ...offerForm, vendor_id: e.target.value, vendor_name: v?.name || '' })
                  }}
                  options={vendorList.map(v => ({ value: v.id, label: v.name }))} />
                <Input label="Harga Penawaran (Rp)" type="number" value={offerForm.price} onChange={e => setOfferForm({ ...offerForm, price: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Lead Time (hari)" type="number" value={offerForm.lead_time_days} onChange={e => setOfferForm({ ...offerForm, lead_time_days: e.target.value })} />
                <Input label="Syarat Bayar" value={offerForm.payment_term} onChange={e => setOfferForm({ ...offerForm, payment_term: e.target.value })} />
              </div>
              <Input label="Catatan" value={offerForm.notes} onChange={e => setOfferForm({ ...offerForm, notes: e.target.value })} />
              <Button size="sm" loading={savingOffer} disabled={!offerForm.vendor_id || !offerForm.price}
                onClick={() => submitOffer({ ...offerForm, price: parseFloat(offerForm.price) || 0, lead_time_days: parseInt(offerForm.lead_time_days) || 0 })}>
                Catat Penawaran
              </Button>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Perbandingan Penawaran</p>
            {rfqOffers.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Belum ada penawaran masuk.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase border-b">
                      <th className="py-2 pr-2">Vendor</th>
                      <th className="py-2 pr-2">Harga</th>
                      <th className="py-2 pr-2">Lead Time</th>
                      <th className="py-2 pr-2">Syarat Bayar</th>
                      <th className="py-2 pr-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfqOffers.map(o => (
                      <tr key={o.id} className="border-b border-gray-50">
                        <td className="py-2 pr-2 font-medium">{o.vendor_name}{o.is_winner && <Badge variant="success" className="ml-2">Pemenang</Badge>}</td>
                        <td className="py-2 pr-2">{formatCurrency(o.price || 0)}</td>
                        <td className="py-2 pr-2">{o.lead_time_days} hari</td>
                        <td className="py-2 pr-2">{o.payment_term}</td>
                        <td className="py-2 pr-2">
                          {offersRFQItem?.status !== 'closed' && canDo('purchasing.rfq', 'edit') && (
                            <button onClick={() => submitSelectWinner({ offer_id: o.id, delivery_date: winnerDelivery })}
                              disabled={selectingWinner}
                              className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-amber-600 hover:bg-amber-50 transition-colors font-medium">
                              <Trophy className="w-3.5 h-3.5" /> Pilih Pemenang
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {offersRFQItem?.status !== 'closed' && rfqOffers.length > 0 && (
              <Input label="Tanggal Delivery (untuk PO pemenang)" type="date" value={winnerDelivery} onChange={e => setWinnerDelivery(e.target.value)} className="mt-3" />
            )}
          </div>
        </div>
      </Modal>

      {/* GRN Modal */}
      {activeTab === 'grn' && (
        <Modal open={showModal} onClose={() => { setShowModal(false); setGRNForm(emptyGRN) }} title="Catat Penerimaan Barang (GRN)"
          footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button><Button loading={savingGRN} onClick={() => submitGRN({ ...grnForm, received_qty: parseInt(grnForm.received_qty) || 0 })}>Simpan & Update Stok</Button></>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="ID Purchase Order" placeholder="ID PO" value={grnForm.po_id} onChange={e => setGRNForm({ ...grnForm, po_id: e.target.value })} />
              <Input label="Qty Diterima" type="number" value={grnForm.received_qty} onChange={e => setGRNForm({ ...grnForm, received_qty: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Tanggal Terima" type="date" value={grnForm.received_date} onChange={e => setGRNForm({ ...grnForm, received_date: e.target.value })} />
              <Select label="Kondisi Barang" value={grnForm.condition} onChange={e => setGRNForm({ ...grnForm, condition: e.target.value })}
                options={[{ value: 'good', label: 'Baik' }, { value: 'partial', label: 'Sebagian' }, { value: 'damaged', label: 'Rusak' }]} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Diterima Oleh" value={grnForm.received_by} onChange={e => setGRNForm({ ...grnForm, received_by: e.target.value })} />
              <Input label="ID Inventori (auto-update stok)" placeholder="Opsional" value={grnForm.inventory_id} onChange={e => setGRNForm({ ...grnForm, inventory_id: e.target.value })} />
            </div>
            <Input label="Catatan" value={grnForm.notes} onChange={e => setGRNForm({ ...grnForm, notes: e.target.value })} />
          </div>
        </Modal>
      )}

      {/* Vendor Add/Edit Modal */}
      {activeTab === 'vendor' && (
        <Modal
          open={showModal || !!editVendor}
          onClose={() => { setShowModal(false); setEditVendor(null); setVendorForm(emptyVendor) }}
          title={editVendor ? 'Edit Vendor' : 'Tambah Vendor Baru'}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShowModal(false); setEditVendor(null) }}>Batal</Button>
              <Button loading={savingVendor || updatingVendor}
                onClick={() => editVendor ? updateVendorFn({ ...vendorForm, rating: parseFloat(vendorForm.rating) || 0 }) : submitVendor({ ...vendorForm, rating: parseFloat(vendorForm.rating) || 0 })}>
                Simpan
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input label="Nama Vendor" value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Kategori" value={vendorForm.category} onChange={e => setVendorForm({ ...vendorForm, category: e.target.value })} />
              <Input label="Rating (0-5)" type="number" step="0.1" max="5" value={vendorForm.rating} onChange={e => setVendorForm({ ...vendorForm, rating: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Email" type="email" value={vendorForm.email} onChange={e => setVendorForm({ ...vendorForm, email: e.target.value })} />
              <Input label="Telepon" value={vendorForm.contact} onChange={e => setVendorForm({ ...vendorForm, contact: e.target.value })} />
            </div>
            <Input label="Alamat" value={vendorForm.address} onChange={e => setVendorForm({ ...vendorForm, address: e.target.value })} />
          </div>
        </Modal>
      )}

      {/* PR → PO Conversion Modal */}
      <Modal
        open={!!convertPR}
        onClose={() => setConvertPR(null)}
        title={`Konversi PR → PO: ${convertPR?.pr_number}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConvertPR(null)}>Batal</Button>
            <Button loading={converting} onClick={() => submitConvert({ ...convertForm, unit_price: parseFloat(convertForm.unit_price) || 0 })}>
              Buat PO
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
            <strong>Item:</strong> {convertPR?.item_name} | <strong>Qty:</strong> {convertPR?.qty} {convertPR?.unit} | <strong>Estimasi:</strong> {formatCurrency(convertPR?.estimated_price || 0)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nama Vendor" value={convertForm.vendor_name} onChange={e => setConvertForm({ ...convertForm, vendor_name: e.target.value })} />
            <Input label="Harga Satuan (Rp)" type="number" value={convertForm.unit_price} onChange={e => setConvertForm({ ...convertForm, unit_price: e.target.value })} />
          </div>
          <Input label="Tanggal Delivery" type="date" value={convertForm.delivery_date} onChange={e => setConvertForm({ ...convertForm, delivery_date: e.target.value })} />
          <Input label="Catatan" value={convertForm.notes} onChange={e => setConvertForm({ ...convertForm, notes: e.target.value })} />
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteItem} onClose={() => setDeleteItem(null)} title="Konfirmasi Hapus"
        footer={<><Button variant="secondary" onClick={() => setDeleteItem(null)}>Batal</Button><Button variant="danger" onClick={handleDelete}>Hapus</Button></>}>
        <p className="text-sm text-gray-600">
          Hapus <strong>{deleteItem?.pr_number || deleteItem?.po_number || deleteItem?.rfq_number || deleteItem?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
        </p>
      </Modal>
    </div>
  )
}
