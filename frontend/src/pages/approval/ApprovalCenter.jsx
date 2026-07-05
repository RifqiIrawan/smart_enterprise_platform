import { useRef, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DataTable from '@/components/ui/DataTable'
import { CheckCircle, XCircle, Plus, Trash2, Pencil, ShieldCheck } from 'lucide-react'
import { approvalApi } from '@/api'
import { useSubmit } from '@/hooks/useApi'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency } from '@/utils/format'
import toast from 'react-hot-toast'

const ROLES = ['manager', 'admin', 'superadmin', 'finance', 'hr', 'purchasing', 'sales']

const DOC_TYPES = [
  { module: 'purchasing', doc_type: 'pr', label: 'Purchase Request' },
  { module: 'purchasing', doc_type: 'po', label: 'Purchase Order' },
  { module: 'sales', doc_type: 'so', label: 'Sales Order' },
  { module: 'hris', doc_type: 'cuti', label: 'Cuti / Leave' },
  { module: 'finance', doc_type: 'jurnal', label: 'Jurnal Penyesuaian' },
]

const docTypeLabel = (module, docType) =>
  DOC_TYPES.find((d) => d.module === module && d.doc_type === docType)?.label || `${module}/${docType}`

const statusBadge = (s) => ({
  pending: <Badge variant="warning">Menunggu</Badge>,
  approved: <Badge variant="success">Disetujui</Badge>,
  rejected: <Badge variant="danger">Ditolak</Badge>,
})[s] || <Badge variant="secondary">{s}</Badge>

const emptyRule = { module: DOC_TYPES[0].module, doc_type: DOC_TYPES[0].doc_type, min_amount: '', levels: [{ level: 1, approver_role: 'manager' }], is_active: true }

const TABS = [
  { id: 'pending', label: 'Menunggu Persetujuan' },
  { id: 'history', label: 'Riwayat' },
  { id: 'rules', label: 'Konfigurasi Rule' },
]

export default function ApprovalCenter() {
  const { hasRole } = useAuthStore()
  const isAdmin = hasRole('superadmin', 'admin')
  const [activeTab, setActiveTab] = useState('pending')
  const [actionModal, setActionModal] = useState({ open: false, id: null, action: 'approve', note: '' })
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [editRule, setEditRule] = useState(null)
  const [ruleForm, setRuleForm] = useState(emptyRule)

  const pendingRef = useRef(null)
  const historyRef = useRef(null)
  const rulesRef = useRef(null)

  const { submit: doAction, loading: acting } = useSubmit(
    (data) => approvalApi.action(actionModal.id, data),
    {
      successMsg: actionModal.action === 'approve' ? 'Persetujuan berhasil dikirim' : 'Dokumen ditolak',
      onSuccess: () => { setActionModal({ open: false, id: null, action: 'approve', note: '' }); pendingRef.current?.refetch() },
    }
  )

  const { submit: submitRule, loading: savingRule } = useSubmit(approvalApi.createRule, {
    successMsg: 'Rule approval berhasil ditambahkan',
    onSuccess: () => { setShowRuleModal(false); setRuleForm(emptyRule); rulesRef.current?.refetch() },
  })
  const { submit: updateRuleFn, loading: updatingRule } = useSubmit(
    (data) => approvalApi.updateRule(editRule?.id, data),
    { successMsg: 'Rule approval diperbarui', onSuccess: () => { setShowRuleModal(false); setEditRule(null); rulesRef.current?.refetch() } }
  )

  const handleDeleteRule = async (row) => {
    try { await approvalApi.deleteRule(row.id); toast.success('Rule dihapus'); rulesRef.current?.refetch() }
    catch { toast.error('Gagal menghapus rule') }
  }

  const openEditRule = (row) => {
    setEditRule(row)
    setRuleForm({
      module: row.module, doc_type: row.doc_type,
      min_amount: row.min_amount != null ? String(row.min_amount) : '',
      levels: row.levels?.length ? row.levels : [{ level: 1, approver_role: 'manager' }],
      is_active: row.is_active,
    })
    setShowRuleModal(true)
  }

  const addLevel = () => setRuleForm((f) => ({ ...f, levels: [...f.levels, { level: f.levels.length + 1, approver_role: 'manager' }] }))
  const removeLevel = (idx) => setRuleForm((f) => ({
    ...f,
    levels: f.levels.filter((_, i) => i !== idx).map((l, i) => ({ ...l, level: i + 1 })),
  }))
  const updateLevelRole = (idx, role) => setRuleForm((f) => ({
    ...f,
    levels: f.levels.map((l, i) => (i === idx ? { ...l, approver_role: role } : l)),
  }))

  const pendingColumns = [
    { key: 'doc_number', label: 'Dokumen', sortable: true, render: (v, row) => (
      <div>
        <span className="font-medium">{v}</span>
        <div className="text-[10px] text-slate-400">{docTypeLabel(row.module, row.doc_type)}</div>
      </div>
    ) },
    { key: 'amount', label: 'Nilai', sortable: true, render: (v) => v > 0 ? <span className="font-semibold text-indigo-700">{formatCurrency(v)}</span> : <span className="text-slate-400">—</span> },
    { key: 'current_level', label: 'Level', render: (v, row) => <Badge variant="warning">Level {v}/{row.total_levels}</Badge> },
    { key: 'requested_by', label: 'Diajukan Oleh' },
    { key: 'created_at', label: 'Tanggal', render: (v) => new Date(v).toLocaleString('id-ID') },
  ]

  const historyColumns = [
    { key: 'doc_number', label: 'Dokumen', sortable: true, render: (v, row) => (
      <div>
        <span className="font-medium">{v}</span>
        <div className="text-[10px] text-slate-400">{docTypeLabel(row.module, row.doc_type)}</div>
      </div>
    ) },
    { key: 'amount', label: 'Nilai', render: (v) => v > 0 ? formatCurrency(v) : <span className="text-slate-400">—</span> },
    { key: 'status', label: 'Status', render: (v) => statusBadge(v) },
    { key: 'requested_by', label: 'Diajukan Oleh' },
    { key: 'updated_at', label: 'Diproses', render: (v) => new Date(v).toLocaleString('id-ID') },
  ]

  const rulesColumns = [
    { key: 'doc_type', label: 'Jenis Dokumen', render: (v, row) => <span className="font-medium">{docTypeLabel(row.module, v)}</span> },
    { key: 'min_amount', label: 'Min. Nilai', render: (v) => v != null ? formatCurrency(v) : <span className="text-slate-400">Selalu berlaku</span> },
    { key: 'levels', label: 'Level Approval', render: (v) => (
      <div className="flex gap-1 flex-wrap">
        {(v || []).map((l, i) => <Badge key={i} variant="secondary">{l.level}. {l.approver_role}</Badge>)}
      </div>
    ) },
    { key: 'is_active', label: 'Status', render: (v) => v ? <Badge variant="success">Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge> },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
          {TABS.filter(t => t.id !== 'rules' || isAdmin).map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {activeTab === 'rules' && isAdmin && (
          <Button size="sm" icon={<Plus />} onClick={() => { setEditRule(null); setRuleForm(emptyRule); setShowRuleModal(true) }}>Tambah Rule</Button>
        )}
      </div>

      {activeTab === 'pending' && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-500" /> Menunggu Persetujuan Anda</CardTitle></CardHeader>
          <CardContent>
            <DataTable ref={pendingRef} columns={pendingColumns} fetchFn={approvalApi.getPending}
              searchPlaceholder="Cari nomor dokumen..." defaultPageSize={15}
              actions={(row) => (
                <div className="flex gap-1 flex-wrap">
                  <button onClick={() => setActionModal({ open: true, id: row.id, action: 'approve', note: '' })}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors font-medium">
                    <CheckCircle className="w-3.5 h-3.5" /> Setujui
                  </button>
                  <button onClick={() => setActionModal({ open: true, id: row.id, action: 'reject', note: '' })}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-red-500 hover:bg-red-50 transition-colors font-medium">
                    <XCircle className="w-3.5 h-3.5" /> Tolak
                  </button>
                </div>
              )}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader><CardTitle>Riwayat Approval</CardTitle></CardHeader>
          <CardContent>
            <DataTable ref={historyRef} columns={historyColumns} fetchFn={approvalApi.getHistory}
              searchPlaceholder="Cari nomor dokumen..." defaultPageSize={15} />
          </CardContent>
        </Card>
      )}

      {activeTab === 'rules' && isAdmin && (
        <Card>
          <CardHeader><CardTitle>Konfigurasi Rule Approval</CardTitle></CardHeader>
          <CardContent>
            <DataTable ref={rulesRef} columns={rulesColumns} fetchFn={approvalApi.getRules}
              searchPlaceholder="Cari jenis dokumen..." defaultPageSize={15}
              actions={(row) => (
                <div className="flex gap-1 flex-wrap">
                  <button onClick={() => openEditRule(row)}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-blue-600 hover:bg-blue-50 transition-colors font-medium">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => handleDeleteRule(row)}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-red-500 hover:bg-red-50 transition-colors font-medium">
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                </div>
              )}
            />
          </CardContent>
        </Card>
      )}

      {/* ══ MODAL: Setujui/Tolak ══ */}
      <Modal open={actionModal.open} onClose={() => setActionModal({ open: false, id: null, action: 'approve', note: '' })}
        title={actionModal.action === 'approve' ? 'Setujui Dokumen' : 'Tolak Dokumen'}>
        <div className="space-y-4">
          <Input label="Catatan (opsional)" placeholder="Tambahkan catatan..." value={actionModal.note}
            onChange={e => setActionModal(prev => ({ ...prev, note: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setActionModal({ open: false, id: null, action: 'approve', note: '' })}>Batal</Button>
            <Button variant={actionModal.action === 'approve' ? 'primary' : 'danger'} loading={acting}
              onClick={() => doAction({ action: actionModal.action, note: actionModal.note })}>
              {actionModal.action === 'approve' ? 'Setujui' : 'Tolak'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL: Tambah/Edit Rule ══ */}
      <Modal open={showRuleModal} onClose={() => { setShowRuleModal(false); setEditRule(null); setRuleForm(emptyRule) }}
        title={editRule ? 'Edit Rule Approval' : 'Tambah Rule Approval'}>
        <div className="space-y-4">
          <Select label="Jenis Dokumen" value={`${ruleForm.module}|${ruleForm.doc_type}`} disabled={!!editRule}
            onChange={e => { const [module, doc_type] = e.target.value.split('|'); setRuleForm({ ...ruleForm, module, doc_type }) }}
            options={DOC_TYPES.map(d => ({ value: `${d.module}|${d.doc_type}`, label: d.label }))} />
          <Input label="Nilai Minimum (Rp) — kosongkan jika selalu berlaku" type="number" value={ruleForm.min_amount}
            onChange={e => setRuleForm({ ...ruleForm, min_amount: e.target.value })} />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Level Approval</label>
              <button onClick={addLevel} className="text-xs text-indigo-600 font-medium hover:underline">+ Tambah Level</button>
            </div>
            <div className="space-y-2">
              {ruleForm.levels.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 w-14">Level {l.level}</span>
                  <div className="flex-1">
                    <Select value={l.approver_role} onChange={e => updateLevelRole(i, e.target.value)}
                      options={ROLES.map(r => ({ value: r, label: r }))} />
                  </div>
                  {ruleForm.levels.length > 1 && (
                    <button onClick={() => removeLevel(i)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowRuleModal(false); setEditRule(null) }}>Batal</Button>
            <Button loading={savingRule || updatingRule}
              onClick={() => {
                const payload = {
                  module: ruleForm.module, doc_type: ruleForm.doc_type,
                  min_amount: ruleForm.min_amount === '' ? null : parseInt(ruleForm.min_amount, 10),
                  levels: ruleForm.levels, is_active: ruleForm.is_active,
                }
                editRule ? updateRuleFn(payload) : submitRule(payload)
              }}>Simpan Rule</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
