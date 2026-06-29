import { useRef, useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import DataTable from '@/components/ui/DataTable'
import {
  Settings, Users, Building2, Shield, Bell, Plus, Save,
  Key, UserCheck, UserX, RefreshCw, Building, ClipboardList,
  CheckCircle2, DollarSign, Mail, MessageSquare, Send, Edit2, Trash2,
  Smartphone, Monitor, Lock, ShieldCheck, ShieldOff, AlertTriangle,
  Download, Eye, EyeOff, Copy, LogOut, Globe, Laptop, Clock, XCircle,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'
import { rbacApi, currencyApi, notifConfigApi, securityAdvApi } from '@/api'
import { useApi, useSubmit } from '@/hooks/useApi'
import toast from 'react-hot-toast'

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES_LIST = ['superadmin','admin','finance','hr','warehouse','sales','purchasing','operator','manager','viewer']

const MODULE_PERMISSIONS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'sales', label: 'Sales' },
  { key: 'purchasing', label: 'Purchasing' },
  { key: 'warehouse', label: 'Warehouse' },
  { key: 'factory', label: 'Smart Factory' },
  { key: 'hris', label: 'Smart HRIS' },
  { key: 'accounting', label: 'Accounting' },
  { key: 'finance', label: 'Finance AP/AR' },
  { key: 'tax', label: 'Tax & Pajak' },
  { key: 'cost', label: 'Cost Accounting' },
  { key: 'budget', label: 'Budget & Planning' },
  { key: 'mrp', label: 'MRP & Produksi' },
  { key: 'qms', label: 'Quality (QMS)' },
  { key: 'asset', label: 'Asset & CMMS' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'settings', label: 'Settings & Admin' },
]

const notifDefaults = [
  { key: 'oee_alert', label: 'Alert Produksi', desc: 'Notifikasi saat OEE di bawah target', enabled: true },
  { key: 'stock_low', label: 'Stock Low', desc: 'Peringatan stok mendekati minimum', enabled: true },
  { key: 'maintenance', label: 'Maintenance Due', desc: 'Pengingat jadwal maintenance', enabled: true },
  { key: 'approval', label: 'Approval Request', desc: 'Notifikasi permintaan approval', enabled: true },
  { key: 'budget_alert', label: 'Budget Alert', desc: 'Peringatan anggaran mendekati batas', enabled: true },
  { key: 'security', label: 'Security Alert', desc: 'Alert dari modul keamanan', enabled: false },
  { key: 'system', label: 'System Update', desc: 'Informasi update sistem', enabled: false },
]

const roleBadge = (r) => ({
  superadmin: <Badge variant="purple">Super Admin</Badge>,
  admin: <Badge variant="primary">Admin</Badge>,
  finance: <Badge variant="warning">Finance</Badge>,
  hr: <Badge variant="info">HR</Badge>,
  warehouse: <Badge variant="success">Warehouse</Badge>,
  sales: <Badge variant="info">Sales</Badge>,
  purchasing: <Badge variant="warning">Purchasing</Badge>,
  operator: <Badge variant="default">Operator</Badge>,
  manager: <Badge variant="secondary">Manager</Badge>,
  viewer: <Badge variant="default">Viewer</Badge>,
})[r] || <Badge variant="default">{r}</Badge>

const actionBadge = (a) => ({
  LOGIN: <Badge variant="success">LOGIN</Badge>,
  LOGIN_FAILED: <Badge variant="danger">LOGIN GAGAL</Badge>,
  CREATE: <Badge variant="info">CREATE</Badge>,
  UPDATE: <Badge variant="warning">UPDATE</Badge>,
  DELETE: <Badge variant="danger">DELETE</Badge>,
  VIEW: <Badge variant="default">VIEW</Badge>,
})[a] || <Badge variant="default">{a}</Badge>

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabUsers() {
  const usersRef = useRef(null)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'operator', department: '', password: '' })
  const [resetModal, setResetModal] = useState({ open: false, id: null, name: '', password: '' })

  const { submit: saveUser, loading: savingUser } = useSubmit(
    (data) => editUser ? rbacApi.updateUser(editUser.id, data) : rbacApi.createUser(data),
    {
      successMsg: editUser ? 'User berhasil diperbarui' : 'User berhasil ditambahkan',
      onSuccess: () => { setShowModal(false); setEditUser(null); usersRef.current?.refetch() },
    }
  )

  const openEdit = (row) => {
    setEditUser(row)
    setUserForm({ name: row.name, email: row.email, role: row.role, department: row.department || '', password: '' })
    setShowModal(true)
  }

  const handleToggleActive = async (row) => {
    try {
      await rbacApi.toggleActive(row.id, !row.is_active)
      toast.success(row.is_active ? 'User dinonaktifkan' : 'User diaktifkan')
      usersRef.current?.refetch()
    } catch { toast.error('Gagal mengubah status') }
  }

  const handleResetPassword = async () => {
    if (resetModal.password.length < 6) { toast.error('Password minimal 6 karakter'); return }
    try {
      await rbacApi.resetPassword(resetModal.id, resetModal.password)
      toast.success('Password berhasil direset')
      setResetModal({ open: false, id: null, name: '', password: '' })
    } catch { toast.error('Gagal reset password') }
  }

  const columns = [
    {
      key: 'name', label: 'Pengguna', sortable: true,
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${row.is_active ? 'bg-indigo-500' : 'bg-slate-300'}`}>
            {v[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-sm">{v}</p>
            <p className="text-xs text-slate-400">{row.email}</p>
          </div>
        </div>
      )
    },
    { key: 'role', label: 'Role', render: (v) => roleBadge(v) },
    { key: 'department', label: 'Departemen', sortable: true },
    { key: 'last_login', label: 'Login Terakhir', tdClassName: 'text-xs text-slate-500' },
    {
      key: 'is_active', label: 'Status',
      render: (v) => v
        ? <Badge variant="success" dot>Aktif</Badge>
        : <Badge variant="default" dot>Nonaktif</Badge>
    },
  ]

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Manajemen User</CardTitle>
            <Button size="sm" icon={<Plus />} onClick={() => { setEditUser(null); setUserForm({ name: '', email: '', role: 'operator', department: '', password: '' }); setShowModal(true) }}>
              Undang User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable ref={usersRef} columns={columns} fetchFn={rbacApi.getUsers}
            searchPlaceholder="Cari nama, email, role..."
            actions={(row) => (
              <div className="flex gap-1">
                <button onClick={() => openEdit(row)} className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-blue-600 hover:bg-blue-50 font-medium">
                  Edit
                </button>
                <button
                  onClick={() => setResetModal({ open: true, id: row.id, name: row.name, password: '' })}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-amber-600 hover:bg-amber-50 font-medium">
                  <Key className="w-3 h-3" /> Reset
                </button>
                <button onClick={() => handleToggleActive(row)}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg font-medium ${row.is_active ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                  {row.is_active ? <><UserX className="w-3 h-3" /> Nonaktifkan</> : <><UserCheck className="w-3 h-3" /> Aktifkan</>}
                </button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Modal Tambah/Edit User */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditUser(null) }}
        title={editUser ? 'Edit User' : 'Undang User Baru'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nama Lengkap" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} />
            <Input label="Email" type="email" value={userForm.email} disabled={!!editUser}
              onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Role" value={userForm.role}
              onChange={e => setUserForm({ ...userForm, role: e.target.value })}
              options={ROLES_LIST.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))} />
            <Input label="Departemen" value={userForm.department}
              onChange={e => setUserForm({ ...userForm, department: e.target.value })} />
          </div>
          {!editUser && (
            <Input label="Password Awal" type="password" placeholder="Min. 6 karakter" value={userForm.password}
              onChange={e => setUserForm({ ...userForm, password: e.target.value })} />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button>
            <Button loading={savingUser} onClick={() => saveUser(userForm)}>Simpan</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Reset Password */}
      <Modal open={resetModal.open} onClose={() => setResetModal({ open: false, id: null, name: '', password: '' })}
        title={`Reset Password — ${resetModal.name}`}>
        <div className="space-y-4">
          <Input label="Password Baru" type="password" placeholder="Min. 6 karakter" value={resetModal.password}
            onChange={e => setResetModal(prev => ({ ...prev, password: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setResetModal({ open: false, id: null, name: '', password: '' })}>Batal</Button>
            <Button icon={<Key className="w-4 h-4" />} onClick={handleResetPassword}>Reset Password</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

function TabRolePermission() {
  const { data: permData } = useApi(rbacApi.getPermissions)
  const rolePermsMap = permData?.roles || {}

  const [selectedRole, setSelectedRole] = useState('finance')
  const [permissions, setPermissions] = useState(null)
  const [saving, setSaving] = useState(false)

  const currentPerms = permissions ?? (rolePermsMap[selectedRole] || [])
  const isAll = currentPerms.includes('*')
  const isSystem = selectedRole === 'superadmin'

  const has = (perm) => isAll || currentPerms.includes(perm)

  const toggle = (perm) => {
    if (isSystem) return
    setPermissions(prev => {
      const base = prev ?? (rolePermsMap[selectedRole] || [])
      const mod = perm.split('.')[0]
      if (base.includes(perm)) {
        // If removing manage, also remove view
        if (perm.endsWith('.manage')) return base.filter(p => p !== perm)
        return base.filter(p => p !== perm && p !== `${mod}.manage`)
      } else {
        // If adding manage, also add view
        if (perm.endsWith('.manage')) return [...base.filter(p => p !== `${mod}.view`), `${mod}.view`, perm]
        return [...base, perm]
      }
    })
  }

  const handleSave = async () => {
    if (isSystem) return
    setSaving(true)
    try {
      await rbacApi.updateRolePermissions(selectedRole, currentPerms)
      toast.success(`Permission role ${selectedRole} berhasil disimpan`)
    } catch { toast.error('Gagal menyimpan') } finally { setSaving(false) }
  }

  const handleRoleChange = (role) => {
    setSelectedRole(role)
    setPermissions(null)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>Role & Permission Matrix</CardTitle>
            <div className="flex items-center gap-3">
              <Select value={selectedRole} onChange={e => handleRoleChange(e.target.value)}
                options={ROLES_LIST.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))} />
              {!isSystem && (
                <Button size="sm" loading={saving} icon={<Save className="w-4 h-4" />} onClick={handleSave}>
                  Simpan
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isSystem && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-2">
              <Shield className="w-4 h-4 flex-shrink-0" />
              Super Admin memiliki semua permission dan tidak dapat diubah.
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Modul</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600 w-28">
                    <span className="text-blue-600">View</span>
                    <span className="block text-[10px] text-slate-400 font-normal">Hanya lihat</span>
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600 w-28">
                    <span className="text-indigo-600">Manage</span>
                    <span className="block text-[10px] text-slate-400 font-normal">Lihat + Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {MODULE_PERMISSIONS.map((mod, i) => (
                  <tr key={mod.key} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    <td className="px-4 py-2.5 font-medium text-slate-700">{mod.label}</td>
                    <td className="px-4 py-2.5 text-center">
                      <PermToggle
                        active={has(`${mod.key}.view`) || has(`${mod.key}.manage`)}
                        disabled={isSystem}
                        color="blue"
                        onClick={() => toggle(`${mod.key}.view`)}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <PermToggle
                        active={has(`${mod.key}.manage`)}
                        disabled={isSystem}
                        color="indigo"
                        onClick={() => toggle(`${mod.key}.manage`)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PermToggle({ active, disabled, color, onClick }) {
  const colors = {
    blue: active ? 'bg-blue-500 border-blue-500' : 'bg-white border-slate-300',
    indigo: active ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-slate-300',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all mx-auto ${colors[color]} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'}`}
    >
      {active && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
    </button>
  )
}

function TabAccessLog() {
  const columns = [
    {
      key: 'user_name', label: 'Pengguna', sortable: true,
      render: (v, row) => (
        <div>
          <p className="font-medium text-sm">{v}</p>
          <p className="text-xs text-slate-400">{row.user_email}</p>
        </div>
      )
    },
    { key: 'action', label: 'Aksi', render: (v) => actionBadge(v) },
    { key: 'module', label: 'Modul', render: (v) => <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{v}</span> },
    { key: 'details', label: 'Detail', tdClassName: 'text-xs text-slate-600 max-w-xs truncate' },
    { key: 'ip', label: 'IP Address', tdClassName: 'font-mono text-xs text-slate-500' },
    { key: 'created_at', label: 'Waktu', sortable: true, tdClassName: 'text-xs text-slate-500 whitespace-nowrap' },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Log Akses Pengguna</CardTitle>
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Real-time audit trail</span>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} fetchFn={rbacApi.getAccessLogs}
          searchPlaceholder="Cari user, modul, aksi..." defaultPageSize={15} />
      </CardContent>
    </Card>
  )
}

function TabCurrency() {
  const ratesRef = useRef(null)
  const [showCurrModal, setShowCurrModal] = useState(false)
  const [showRateModal, setShowRateModal] = useState(false)
  const [currForm, setCurrForm] = useState({ code: '', name: '', symbol: '' })
  const [rateForm, setRateForm] = useState({ from_currency: 'USD', to_currency: 'IDR', rate: '', date: new Date().toISOString().slice(0, 10) })
  const [savingRate, setSavingRate] = useState(false)

  const { data: currData, refetch: refetchCurr } = useApi(currencyApi.getList)
  const currencies = Array.isArray(currData?.value) ? currData.value : []

  const { submit: createCurr, loading: creatingCurr } = useSubmit(currencyApi.create, {
    successMsg: 'Mata uang berhasil ditambahkan',
    onSuccess: () => { setShowCurrModal(false); setCurrForm({ code: '', name: '', symbol: '' }); refetchCurr() },
  })

  const handleSaveRate = async () => {
    if (!rateForm.rate || isNaN(rateForm.rate)) { toast.error('Kurs tidak valid'); return }
    setSavingRate(true)
    try {
      await currencyApi.setRate({ ...rateForm, rate: parseFloat(rateForm.rate) })
      toast.success('Kurs berhasil disimpan')
      setShowRateModal(false)
      ratesRef.current?.refetch()
    } catch { toast.error('Gagal menyimpan kurs') } finally { setSavingRate(false) }
  }

  const rateColumns = [
    { key: 'from_currency', label: 'Dari', render: v => <span className="font-bold text-indigo-600">{v}</span> },
    { key: 'to_currency', label: 'Ke', render: v => <span className="font-semibold">{v}</span> },
    { key: 'rate', label: 'Kurs', render: v => <span className="font-mono font-semibold">{Number(v).toLocaleString('id-ID', { minimumFractionDigits: 2 })}</span> },
    { key: 'date', label: 'Tanggal', sortable: true },
    { key: 'source', label: 'Sumber', render: v => <Badge variant="default">{v}</Badge> },
  ]

  const activeCurrencies = currencies.filter(c => !c.is_base && c.is_active).map(c => ({ value: c.code, label: `${c.code} — ${c.name}` }))

  return (
    <div className="space-y-4">
      {/* Currency List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Master Mata Uang</CardTitle>
            <Button size="sm" icon={<Plus />} onClick={() => setShowCurrModal(true)}>Tambah</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {currencies.map(c => (
              <div key={c.id} className={`flex items-center justify-between p-3 border rounded-xl ${c.is_base ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${c.is_base ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {c.symbol}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{c.code}</span>
                      <span className="text-sm text-slate-500">{c.name}</span>
                      {c.is_base && <Badge variant="primary">Base Currency</Badge>}
                      {!c.is_active && <Badge variant="default">Nonaktif</Badge>}
                    </div>
                  </div>
                </div>
                {!c.is_base && (
                  <button
                    onClick={() => { setRateForm(prev => ({ ...prev, from_currency: c.code })); setShowRateModal(true) }}
                    className="text-xs text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg font-medium border border-indigo-200 transition-colors"
                  >
                    Set Kurs
                  </button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Exchange Rates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Kurs Nilai Tukar</CardTitle>
            <Button size="sm" variant="secondary" icon={<DollarSign className="w-3.5 h-3.5" />} onClick={() => setShowRateModal(true)}>Input Kurs</Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable ref={ratesRef} columns={rateColumns} fetchFn={currencyApi.getRates}
            searchPlaceholder="Cari mata uang..." />
        </CardContent>
      </Card>

      {/* Modal Tambah Mata Uang */}
      <Modal open={showCurrModal} onClose={() => setShowCurrModal(false)} title="Tambah Mata Uang">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Kode (ISO 4217)" placeholder="cth: SGD" value={currForm.code}
              onChange={e => setCurrForm({ ...currForm, code: e.target.value.toUpperCase() })} />
            <Input label="Simbol" placeholder="cth: S$" value={currForm.symbol}
              onChange={e => setCurrForm({ ...currForm, symbol: e.target.value })} />
          </div>
          <Input label="Nama Mata Uang" placeholder="cth: Singapore Dollar" value={currForm.name}
            onChange={e => setCurrForm({ ...currForm, name: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCurrModal(false)}>Batal</Button>
            <Button loading={creatingCurr} onClick={() => createCurr(currForm)}>Simpan</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Input Kurs */}
      <Modal open={showRateModal} onClose={() => setShowRateModal(false)} title="Input Kurs Nilai Tukar">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Mata Uang Asing" value={rateForm.from_currency}
              onChange={e => setRateForm(prev => ({ ...prev, from_currency: e.target.value }))}
              options={activeCurrencies.length > 0 ? activeCurrencies : [{ value: 'USD', label: 'USD — US Dollar' }, { value: 'EUR', label: 'EUR — Euro' }, { value: 'SGD', label: 'SGD — Singapore Dollar' }]} />
            <Input label="Ke (Base)" value="IDR" disabled />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={`1 ${rateForm.from_currency} = ... IDR`} type="number" placeholder="cth: 16250" value={rateForm.rate}
              onChange={e => setRateForm(prev => ({ ...prev, rate: e.target.value }))} />
            <Input label="Tanggal" type="date" value={rateForm.date}
              onChange={e => setRateForm(prev => ({ ...prev, date: e.target.value }))} />
          </div>
          <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
            Kurs akan digunakan untuk konversi nilai dalam transaksi berdenominasi mata uang asing.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowRateModal(false)}>Batal</Button>
            <Button loading={savingRate} icon={<Save className="w-4 h-4" />} onClick={handleSaveRate}>Simpan Kurs</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function TabEmailConfig() {
  const { data: config, loading } = useApi(notifConfigApi.get)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testEmail, setTestEmail] = useState('')

  const cfg = form ?? config ?? {}

  const handleSave = async () => {
    setSaving(true)
    try {
      await notifConfigApi.save(cfg)
      toast.success('Konfigurasi notifikasi disimpan')
    } catch { toast.error('Gagal menyimpan') } finally { setSaving(false) }
  }

  const handleTest = async () => {
    if (!testEmail) { toast.error('Masukkan email tujuan'); return }
    setTesting(true)
    try {
      const res = await notifConfigApi.testEmail(testEmail)
      toast.success(res.message || 'Email test terkirim')
    } catch { toast.error('Gagal kirim test email') } finally { setTesting(false) }
  }

  const set = (key, val) => setForm(prev => ({ ...(prev ?? config ?? {}), [key]: val }))

  if (loading) return null

  return (
    <Card>
      <CardHeader><CardTitle>Konfigurasi Notifikasi Email & WhatsApp</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Email / SMTP */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500" />
                <p className="font-semibold text-slate-700">Email (SMTP)</p>
              </div>
              <button onClick={() => set('email_enabled', !cfg.email_enabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${cfg.email_enabled ? 'bg-blue-600' : 'bg-gray-200'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${cfg.email_enabled ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
            <div className={`space-y-3 transition-opacity ${cfg.email_enabled ? '' : 'opacity-50 pointer-events-none'}`}>
              <div className="grid grid-cols-2 gap-3">
                <Input label="SMTP Host" placeholder="smtp.gmail.com" value={cfg.smtp_host || ''} onChange={e => set('smtp_host', e.target.value)} />
                <Input label="Port" type="number" placeholder="587" value={cfg.smtp_port || 587} onChange={e => set('smtp_port', parseInt(e.target.value))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Username / Email" placeholder="noreply@perusahaan.com" value={cfg.smtp_user || ''} onChange={e => set('smtp_user', e.target.value)} />
                <Input label="Password / App Password" type="password" placeholder="••••••••" value={cfg.smtp_password || ''} onChange={e => set('smtp_password', e.target.value)} />
              </div>
              <Input label="From Email" placeholder="SEP System <noreply@sep.id>" value={cfg.smtp_from || ''} onChange={e => set('smtp_from', e.target.value)} />
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="ssl" checked={!!cfg.smtp_ssl} onChange={e => set('smtp_ssl', e.target.checked)} className="w-4 h-4 rounded" />
                  <label htmlFor="ssl" className="text-sm text-slate-600">Gunakan SSL/TLS</label>
                </div>
              </div>
              {/* Test email */}
              <div className="flex gap-2 pt-1">
                <input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="Email untuk test..." type="email"
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                <Button size="sm" variant="secondary" loading={testing} icon={<Send className="w-3.5 h-3.5" />} onClick={handleTest}>
                  Kirim Test
                </Button>
              </div>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-500" />
                <p className="font-semibold text-slate-700">WhatsApp (Fonnte / Wablas)</p>
              </div>
              <button onClick={() => set('wa_enabled', !cfg.wa_enabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${cfg.wa_enabled ? 'bg-green-500' : 'bg-gray-200'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${cfg.wa_enabled ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
            <div className={`space-y-3 transition-opacity ${cfg.wa_enabled ? '' : 'opacity-50 pointer-events-none'}`}>
              <div className="grid grid-cols-2 gap-3">
                <Select label="Provider" value={cfg.wa_provider || 'fonnte'}
                  onChange={e => set('wa_provider', e.target.value)}
                  options={[{ value: 'fonnte', label: 'Fonnte' }, { value: 'wablas', label: 'Wablas' }, { value: 'waha', label: 'WAHA (Self-hosted)' }]} />
                <Input label="API Token" type="password" placeholder="Token dari provider" value={cfg.wa_token || ''} onChange={e => set('wa_token', e.target.value)} />
              </div>
              <Input label="Nomor WhatsApp Pengirim" placeholder="6281234567890" value={cfg.wa_from_number || ''} onChange={e => set('wa_from_number', e.target.value)} />
            </div>
          </div>

          <Button loading={saving} icon={<Save className="w-4 h-4" />} onClick={handleSave}>
            Simpan Konfigurasi
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function TabCompany({ user }) {
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [companyForm, setCompanyForm] = useState({ name: '', npwp: '', city: '', email: '', phone: '' })

  const { data: companiesRaw, refetch: refetchCompanies } = useApi(rbacApi.getCompanies)
  const companies = Array.isArray(companiesRaw?.value) ? companiesRaw.value : []

  const { submit: createCompany, loading: creatingCompany } = useSubmit(rbacApi.createCompany, {
    successMsg: 'Perusahaan berhasil ditambahkan',
    onSuccess: () => { setShowCompanyModal(false); setCompanyForm({ name: '', npwp: '', city: '', email: '', phone: '' }); refetchCompanies() },
  })

  return (
    <div className="space-y-4">
      {/* Company List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daftar Perusahaan</CardTitle>
            {user?.role === 'superadmin' && (
              <Button size="sm" icon={<Plus />} onClick={() => setShowCompanyModal(true)}>Tambah Perusahaan</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {companies.map(co => (
              <div key={co.id} className={`flex items-center justify-between p-4 border rounded-xl transition-colors ${co.current ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${co.current ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                    <Building className={`w-5 h-5 ${co.current ? 'text-white' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800">{co.name}</p>
                      {co.current && <Badge variant="primary">Aktif</Badge>}
                      {!co.is_active && <Badge variant="default">Nonaktif</Badge>}
                    </div>
                    <p className="text-xs text-slate-500">NPWP: {co.npwp} · {co.city} · {co.user_count} user</p>
                  </div>
                </div>
                {!co.current && co.is_active && (
                  <Button size="sm" variant="secondary" icon={<RefreshCw className="w-3.5 h-3.5" />}
                    onClick={() => toast('Switch company: re-login diperlukan di mode production')}>
                    Switch
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal Tambah Perusahaan */}
      <Modal open={showCompanyModal} onClose={() => setShowCompanyModal(false)} title="Tambah Perusahaan Baru">
        <div className="space-y-4">
          <Input label="Nama Perusahaan" value={companyForm.name} onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="NPWP" value={companyForm.npwp} onChange={e => setCompanyForm({ ...companyForm, npwp: e.target.value })} />
            <Input label="Kota" value={companyForm.city} onChange={e => setCompanyForm({ ...companyForm, city: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={companyForm.email} onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })} />
            <Input label="Telepon" value={companyForm.phone} onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCompanyModal(false)}>Batal</Button>
            <Button loading={creatingCompany} onClick={() => createCompany(companyForm)}>Simpan</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Tab 2FA ─────────────────────────────────────────────────────────────────

const ACTION_VARIANT = {
  LOGIN: 'success', CREATE: 'info', UPDATE: 'warning',
  DELETE: 'danger', LOGIN_FAILED: 'danger',
}

function Tab2FA() {
  const [status, setStatus] = useState(null)
  const [setup, setSetup] = useState(null)
  const [step, setStep] = useState('idle') // idle | setup | verify | backup | disable
  const [code, setCode] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [backupCodes, setBackupCodes] = useState([])
  const [showCodes, setShowCodes] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState('')

  const fetchStatus = useCallback(async () => {
    try { const r = await securityAdvApi.get2FAStatus(); setStatus(r) } catch {}
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const handleSetup = async () => {
    setLoading(true)
    try { const r = await securityAdvApi.setup2FA(); setSetup(r); setStep('setup') }
    catch { toast.error('Gagal memulai setup 2FA') } finally { setLoading(false) }
  }

  const handleEnable = async () => {
    if (code.length !== 6) { toast.error('Masukkan kode 6 digit'); return }
    setLoading(true)
    try {
      const r = await securityAdvApi.enable2FA(code)
      setBackupCodes(r.backup_codes || [])
      setStep('backup')
      fetchStatus()
      toast.success('2FA berhasil diaktifkan!')
    } catch (e) { toast.error(e?.response?.data?.message || 'Kode tidak valid') }
    finally { setLoading(false) }
  }

  const handleDisable = async () => {
    setLoading(true)
    try {
      await securityAdvApi.disable2FA(disableCode)
      toast.success('2FA dinonaktifkan')
      setStep('idle'); setDisableCode(''); fetchStatus()
    } catch (e) { toast.error(e?.response?.data?.message || 'Kode tidak valid') }
    finally { setLoading(false) }
  }

  const handleRegenerate = async () => {
    setLoading(true)
    try {
      const r = await securityAdvApi.regenerateBackupCodes()
      setBackupCodes(r.backup_codes || [])
      setShowCodes(true)
      toast.success('Backup codes baru dibuat')
    } catch { toast.error('Gagal regenerate') } finally { setLoading(false) }
  }

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(() => setCopied(''), 2000)
    toast.success('Disalin!')
  }

  if (!status) return <div className="py-12 text-center text-sm text-muted-foreground">Memuat...</div>

  // ── Backup Codes view ──
  if (step === 'backup') return (
    <div className="max-w-lg space-y-4">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-800 text-sm">Simpan backup codes ini sekarang!</p>
          <p className="text-xs text-amber-700 mt-0.5">Kode ini hanya ditampilkan sekali. Gunakan saat kehilangan akses ke authenticator.</p>
        </div>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Backup Codes (10 kode)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5">
                <code className="text-xs font-mono flex-1">{code}</code>
                <button onClick={() => copyText(code, `bc-${i}`)} className="text-slate-400 hover:text-slate-600">
                  {copied === `bc-${i}` ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
          <Button className="mt-4 w-full" variant="secondary" onClick={() => copyText(backupCodes.join('\n'), 'all')}>
            <Copy className="w-4 h-4 mr-2" /> Salin Semua Kode
          </Button>
        </CardContent>
      </Card>
      <Button onClick={() => setStep('idle')}>Selesai, Saya Sudah Menyimpan</Button>
    </div>
  )

  // ── Setup + Verify view ──
  if (step === 'setup' || step === 'verify') return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => setStep('idle')} className="text-muted-foreground hover:text-foreground">&larr; Kembali</button>
        <span className="text-muted-foreground">/</span>
        <span>Setup Two-Factor Authentication</span>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">1</div>
            <div className="flex-1">
              <p className="font-medium text-sm">Install Authenticator App</p>
              <p className="text-xs text-muted-foreground mt-0.5">Google Authenticator, Authy, atau Microsoft Authenticator</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">2</div>
            <div className="flex-1">
              <p className="font-medium text-sm">Tambahkan akun secara manual</p>
              <p className="text-xs text-muted-foreground mb-2">Buka app → Tambah akun → Masukkan manual → Paste kode berikut:</p>
              {setup && (
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Secret Key:</p>
                    <div className="flex items-center gap-2 bg-slate-50 border rounded-lg px-3 py-2">
                      <code className="text-sm font-mono flex-1 break-all">{setup.secret}</code>
                      <button onClick={() => copyText(setup.secret, 'secret')} className="text-slate-400 hover:text-slate-600 shrink-0">
                        {copied === 'secret' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Atau salin URL lengkap untuk import:</p>
                    <div className="flex items-center gap-2 bg-slate-50 border rounded-lg px-3 py-2">
                      <code className="text-xs font-mono flex-1 break-all text-slate-500 line-clamp-2">{setup.otpauth_url}</code>
                      <button onClick={() => copyText(setup.otpauth_url, 'url')} className="text-slate-400 hover:text-slate-600 shrink-0">
                        {copied === 'url' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Akun: SEP, Email: {setup.email}, Periode: 30 detik</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">3</div>
            <div className="flex-1">
              <p className="font-medium text-sm">Masukkan kode 6 digit dari app</p>
              <div className="mt-2 flex gap-3">
                <Input
                  placeholder="123456"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-36 text-center text-lg font-mono tracking-widest"
                  maxLength={6}
                />
                <Button onClick={handleEnable} loading={loading} disabled={code.length !== 6}>
                  Aktifkan 2FA
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // ── Default status view ──
  return (
    <div className="max-w-lg space-y-4">
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${status.enabled ? 'bg-green-100' : 'bg-slate-100'}`}>
              {status.enabled
                ? <ShieldCheck className="w-6 h-6 text-green-600" />
                : <ShieldOff className="w-6 h-6 text-slate-400" />}
            </div>
            <div className="flex-1">
              <p className="font-semibold">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {status.enabled ? 'Aktif — akun Anda dilindungi 2FA' : 'Nonaktif — aktifkan untuk keamanan lebih'}
              </p>
            </div>
            <Badge variant={status.enabled ? 'success' : 'default'} dot>
              {status.enabled ? 'Aktif' : 'Nonaktif'}
            </Badge>
          </div>

          <div className="mt-4 flex gap-2 flex-wrap">
            {!status.enabled && (
              <Button onClick={handleSetup} loading={loading}>
                <Smartphone className="w-4 h-4 mr-2" /> Setup 2FA
              </Button>
            )}
            {status.enabled && (
              <>
                <Button variant="secondary" onClick={handleRegenerate} loading={loading}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Regenerate Backup Codes
                </Button>
                <Button variant="danger" onClick={() => setStep('disable')}>
                  <ShieldOff className="w-4 h-4 mr-2" /> Nonaktifkan 2FA
                </Button>
              </>
            )}
          </div>

          {status.enabled && status.backup_codes_count > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {status.backup_codes_count} backup code tersisa
            </p>
          )}
        </CardContent>
      </Card>

      {showCodes && backupCodes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm">Backup Codes Baru</CardTitle>
              <button onClick={() => setShowCodes(false)} className="text-slate-400 hover:text-slate-600"><XCircle className="w-4 h-4" /></button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((c, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5">
                  <code className="text-xs font-mono flex-1">{c}</code>
                  <button onClick={() => copyText(c, `nb-${i}`)}><Copy className="w-3 h-3 text-slate-400" /></button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4">
          <p className="text-sm font-medium mb-3">Cara Kerja 2FA</p>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /> Saat login, Anda memasukkan password + kode 6 digit dari app</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /> Kode berubah setiap 30 detik menggunakan standar TOTP (RFC 6238)</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /> Backup codes bisa digunakan sekali jika kehilangan akses ke authenticator</li>
          </ul>
        </CardContent>
      </Card>

      <Modal open={step === 'disable'} onClose={() => setStep('idle')} title="Nonaktifkan 2FA">
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            Menonaktifkan 2FA mengurangi keamanan akun Anda.
          </div>
          <Input label="Masukkan kode OTP saat ini (opsional)" placeholder="123456"
            value={disableCode} onChange={e => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStep('idle')}>Batal</Button>
            <Button variant="danger" loading={loading} onClick={handleDisable}>Nonaktifkan</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Tab Sessions ─────────────────────────────────────────────────────────────

function TabSessions() {
  const [sessions, setSessions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [revoking, setRevoking] = useState(null)

  const fetchSessions = useCallback(async () => {
    try { const r = await securityAdvApi.getSessions(); setSessions(r.value || []) } catch {}
  }, [])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const handleRevoke = async (id) => {
    setRevoking(id)
    try {
      await securityAdvApi.revokeSession(id)
      toast.success('Session berhasil dihapus')
      fetchSessions()
    } catch { toast.error('Gagal menghapus session') } finally { setRevoking(null) }
  }

  const handleRevokeAll = async () => {
    setLoading(true)
    try {
      await securityAdvApi.revokeAllSessions()
      toast.success('Semua session lain berhasil dihapus')
      fetchSessions()
    } catch { toast.error('Gagal') } finally { setLoading(false) }
  }

  const deviceIcon = (device) => {
    if (/mobile|iphone|android/i.test(device)) return <Smartphone className="w-4 h-4" />
    return <Laptop className="w-4 h-4" />
  }

  const timeSince = (iso) => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Baru saja'
    if (mins < 60) return `${mins} menit lalu`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} jam lalu`
    return `${Math.floor(hrs / 24)} hari lalu`
  }

  if (!sessions) return <div className="py-12 text-center text-sm text-muted-foreground">Memuat...</div>

  const others = sessions.filter(s => !s.current)

  return (
    <div className="max-w-xl space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-semibold">Sesi Aktif</p>
          <p className="text-xs text-muted-foreground mt-0.5">{sessions.length} sesi — {sessions.filter(s => s.current).length} sesi ini</p>
        </div>
        {others.length > 0 && (
          <Button size="sm" variant="danger" loading={loading} onClick={handleRevokeAll}>
            <LogOut className="w-3.5 h-3.5 mr-1.5" /> Logout Semua Perangkat Lain
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {sessions.map(s => (
          <Card key={s.id} className={s.current ? 'border-primary/40 bg-primary/5' : ''}>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${s.current ? 'bg-primary/10' : 'bg-slate-100'}`}>
                  {deviceIcon(s.device)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{s.device}</p>
                    {s.current && <Badge variant="primary" className="text-xs">Sesi Ini</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Globe className="w-3 h-3" /> {s.ip}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Monitor className="w-3 h-3" /> {s.location}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {timeSince(s.last_active)}
                    </span>
                  </div>
                </div>
                {!s.current && (
                  <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 shrink-0"
                    loading={revoking === s.id} onClick={() => handleRevoke(s.id)}>
                    <LogOut className="w-3.5 h-3.5 mr-1" /> Logout
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="py-4">
          <p className="text-xs font-medium mb-2 text-muted-foreground">INFO KEAMANAN</p>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-start gap-2"><Shield className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" /> Jika ada sesi mencurigakan, logout segera dan ubah password</li>
            <li className="flex items-start gap-2"><Shield className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" /> Sesi kadaluarsa otomatis setelah tidak aktif (sesuai kebijakan)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab Audit Trail ──────────────────────────────────────────────────────────

const AUDIT_MODULES = ['', 'Auth', 'Sales', 'Purchasing', 'Finance', 'Accounting', 'HRIS', 'Warehouse', 'Factory', 'Settings', 'QMS', 'MRP']
const AUDIT_ACTIONS = ['', 'LOGIN', 'LOGIN_FAILED', 'CREATE', 'UPDATE', 'DELETE']

function TabAuditTrail() {
  const auditRef = useRef(null)
  const [filters, setFilters] = useState({ module: '', action: '' })
  const [diffModal, setDiffModal] = useState(null)
  const [exporting, setExporting] = useState(false)

  const fetchAudit = useCallback(
    (params) => securityAdvApi.getAuditTrail({ ...params, module: filters.module, action: filters.action }),
    [filters]
  )

  useEffect(() => { auditRef.current?.refetch() }, [filters])

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await securityAdvApi.exportAuditTrail()
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url; a.download = 'audit_trail.csv'; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Gagal export') } finally { setExporting(false) }
  }

  const actionBadge2 = (a) => {
    const v = ACTION_VARIANT[a] || 'default'
    return <Badge variant={v} className="text-xs">{a}</Badge>
  }

  const columns = [
    {
      key: 'timestamp', header: 'Waktu', sortable: true,
      render: v => <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(v).toLocaleString('id-ID')}</span>
    },
    {
      key: 'user_name', header: 'User',
      render: (v, row) => (
        <div>
          <p className="text-sm font-medium">{v}</p>
          <p className="text-xs text-muted-foreground">{row.user_email}</p>
        </div>
      )
    },
    { key: 'action', header: 'Aksi', render: v => actionBadge2(v) },
    { key: 'module', header: 'Modul', render: v => <Badge variant="secondary" className="text-xs">{v}</Badge> },
    { key: 'description', header: 'Deskripsi', render: v => <span className="text-sm">{v}</span> },
    { key: 'ip', header: 'IP', render: v => <code className="text-xs text-muted-foreground">{v}</code> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filters.module}
            onChange={e => setFilters(f => ({ ...f, module: e.target.value }))}
            className="h-8 text-xs border border-slate-200 rounded-lg px-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {AUDIT_MODULES.map(m => <option key={m} value={m}>{m || 'Semua Modul'}</option>)}
          </select>
          <select
            value={filters.action}
            onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
            className="h-8 text-xs border border-slate-200 rounded-lg px-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {AUDIT_ACTIONS.map(a => <option key={a} value={a}>{a || 'Semua Aksi'}</option>)}
          </select>
          {(filters.module || filters.action) && (
            <button onClick={() => setFilters({ module: '', action: '' })}
              className="text-xs text-primary hover:underline">Reset</button>
          )}
        </div>
        <Button size="sm" variant="secondary" loading={exporting} onClick={handleExport}>
          <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
        </Button>
      </div>

      <DataTable
        ref={auditRef}
        fetchFn={fetchAudit}
        columns={columns}
        searchPlaceholder="Cari user, modul, deskripsi..."
        actions={(row) => (row.old_data || row.new_data) ? (
          <button
            onClick={() => setDiffModal(row)}
            className="text-xs text-primary hover:underline px-2 py-1 rounded hover:bg-primary/5"
          >
            Diff
          </button>
        ) : null}
      />

      <Modal open={!!diffModal} onClose={() => setDiffModal(null)}
        title={`Detail Perubahan — ${diffModal?.description?.slice(0, 50)}...`}>
        {diffModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-red-600 mb-2 uppercase tracking-wide">Sebelum</p>
                {diffModal.old_data
                  ? <pre className="text-xs bg-red-50 border border-red-100 rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                      {typeof diffModal.old_data === 'string'
                        ? diffModal.old_data
                        : JSON.stringify(diffModal.old_data, null, 2)}
                    </pre>
                  : <p className="text-xs text-muted-foreground italic">— (data baru)</p>
                }
              </div>
              <div>
                <p className="text-xs font-semibold text-green-600 mb-2 uppercase tracking-wide">Sesudah</p>
                {diffModal.new_data
                  ? <pre className="text-xs bg-green-50 border border-green-100 rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                      {typeof diffModal.new_data === 'string'
                        ? diffModal.new_data
                        : JSON.stringify(diffModal.new_data, null, 2)}
                    </pre>
                  : <p className="text-xs text-muted-foreground italic">— (data dihapus)</p>
                }
              </div>
            </div>
            <div className="text-xs text-muted-foreground pt-2 border-t space-y-1">
              <p>Waktu: {diffModal.timestamp ? new Date(diffModal.timestamp).toLocaleString('id-ID') : '—'}</p>
              <p>User: {diffModal.user_name} ({diffModal.user_email})</p>
              <p>IP: {diffModal.ip}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ─── Tab Security Policy ──────────────────────────────────────────────────────

function TabSecurityPolicy() {
  const { data: savedPolicy } = useApi(securityAdvApi.getPolicy)
  const [policy, setPolicy] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (savedPolicy && !policy) setPolicy(savedPolicy) }, [savedPolicy])

  const p = policy ?? savedPolicy ?? {}
  const set = (key, val) => setPolicy(prev => ({ ...(prev ?? savedPolicy ?? {}), [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await securityAdvApi.updatePolicy(p)
      toast.success('Kebijakan keamanan disimpan')
    } catch { toast.error('Gagal menyimpan') } finally { setSaving(false) }
  }

  return (
    <div className="max-w-xl space-y-4">
      <Card>
        <CardHeader><CardTitle>Kebijakan Password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Panjang Minimum</label>
              <Input type="number" min={6} max={32} value={p.min_password_length || 8}
                onChange={e => set('min_password_length', +e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Expiry (hari, 0 = tidak kedaluwarsa)</label>
              <Input type="number" min={0} max={365} value={p.password_expiry_days ?? 90}
                onChange={e => set('password_expiry_days', +e.target.value)} />
            </div>
          </div>
          {[
            { key: 'require_uppercase', label: 'Wajib huruf kapital (A-Z)' },
            { key: 'require_number', label: 'Wajib angka (0-9)' },
            { key: 'require_special', label: 'Wajib karakter khusus (!@#$...)' },
          ].map(opt => (
            <div key={opt.key} className="flex items-center justify-between py-1">
              <span className="text-sm">{opt.label}</span>
              <button onClick={() => set(opt.key, !p[opt.key])}
                className={`relative w-10 h-5 rounded-full transition-colors ${p[opt.key] ? 'bg-primary' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${p[opt.key] ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Keamanan Login</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Maks. percobaan login gagal</label>
              <Input type="number" min={3} max={20} value={p.max_login_attempts ?? 5}
                onChange={e => set('max_login_attempts', +e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Durasi lockout (menit)</label>
              <Input type="number" min={5} max={1440} value={p.lockout_minutes ?? 30}
                onChange={e => set('lockout_minutes', +e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Auto-logout setelah tidak aktif (menit)</label>
            <Input type="number" min={15} max={480} value={p.session_timeout_min ?? 120}
              onChange={e => set('session_timeout_min', +e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Kebijakan 2FA</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium">Wajibkan 2FA untuk semua user</p>
              <p className="text-xs text-muted-foreground">User yang belum setup 2FA akan dipaksa setup saat login</p>
            </div>
            <button onClick={() => set('enforce_2fa', !p.enforce_2fa)}
              className={`relative w-10 h-5 rounded-full transition-colors ${p.enforce_2fa ? 'bg-primary' : 'bg-slate-200'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${p.enforce_2fa ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        </CardContent>
      </Card>

      <Button loading={saving} onClick={handleSave} icon={<Save className="w-4 h-4" />}>
        Simpan Kebijakan
      </Button>
    </div>
  )
}

// ─── Main Settings Page ────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company')
  const [notifSettings, setNotifSettings] = useState(notifDefaults)
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [savingPwd, setSavingPwd] = useState(false)
  const [savingCompany, setSavingCompany] = useState(false)
  const { user } = useAuthStore()

  const tabs = [
    { id: 'company', label: 'Perusahaan', icon: Building2 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'roles', label: 'Role & Permission', icon: Shield },
    { id: 'logs', label: 'Akses Log', icon: ClipboardList },
    { id: 'currency', label: 'Mata Uang', icon: DollarSign },
    { id: 'notifications', label: 'Notifikasi', icon: Bell },
    { id: '2fa', label: '2FA', icon: Smartphone },
    { id: 'sessions', label: 'Sessions', icon: Monitor },
    { id: 'audit', label: 'Audit Trail', icon: Shield },
    { id: 'security', label: 'Kebijakan', icon: Lock },
  ]

  const toggleNotif = (key) => setNotifSettings(prev => prev.map(n => n.key === key ? { ...n, enabled: !n.enabled } : n))

  const handleSaveNotif = () => toast.success('Preferensi notifikasi berhasil disimpan')

  const handleSaveCompany = async () => {
    setSavingCompany(true)
    await new Promise(r => setTimeout(r, 600))
    setSavingCompany(false)
    toast.success('Data perusahaan berhasil disimpan')
  }

  const handleChangePassword = async () => {
    if (pwdForm.newPassword !== pwdForm.confirmPassword) { toast.error('Konfirmasi password tidak cocok'); return }
    if (pwdForm.newPassword.length < 6) { toast.error('Password baru minimal 6 karakter'); return }
    setSavingPwd(true)
    try {
      await authApi.changePassword({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword })
      toast.success('Password berhasil diubah')
      setShowPwdModal(false)
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch { toast.error('Password lama tidak sesuai') } finally { setSavingPwd(false) }
  }

  return (
    <div className="space-y-5">
      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab: Perusahaan ── */}
      {activeTab === 'company' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Profil Perusahaan</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                <Input label="Nama Perusahaan" defaultValue="PT. Smart Enterprise Indonesia" />
                <Input label="No. NPWP" defaultValue="01.234.567.8-901.000" />
                <Input label="Alamat" defaultValue="Jl. Sudirman No. 123, Jakarta" />
                <Input label="Kota" defaultValue="Jakarta Selatan" />
                <Input label="Email" defaultValue="info@sep.id" />
                <Input label="Telepon" defaultValue="+62-21-1234-5678" />
                <Select label="Industri" defaultValue="manufacturing"
                  options={[{ value: 'manufacturing', label: 'Manufaktur' }, { value: 'trading', label: 'Perdagangan' }, { value: 'services', label: 'Jasa' }]} />
                <Select label="Zona Waktu" defaultValue="WIB"
                  options={[{ value: 'WIB', label: 'WIB (UTC+7)' }, { value: 'WITA', label: 'WITA (UTC+8)' }, { value: 'WIT', label: 'WIT (UTC+9)' }]} />
              </div>
              <Button className="mt-6" loading={savingCompany} icon={<Save className="w-4 h-4" />} onClick={handleSaveCompany}>
                Simpan Perubahan
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Akun Saya</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-4">
                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg font-bold">
                  {user?.name?.[0] || 'A'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{user?.name || 'Admin'}</p>
                  <p className="text-sm text-gray-500 mb-1">{user?.email}</p>
                  {roleBadge(user?.role)}
                </div>
              </div>
              <Button variant="secondary" icon={<Key className="w-4 h-4" />} onClick={() => setShowPwdModal(true)}>
                Ubah Password
              </Button>
            </CardContent>
          </Card>

          <TabCompany user={user} />
        </div>
      )}

      {/* ── Tab: Users ── */}
      {activeTab === 'users' && <TabUsers />}

      {/* ── Tab: Role & Permission ── */}
      {activeTab === 'roles' && <TabRolePermission />}

      {/* ── Tab: Access Log ── */}
      {activeTab === 'logs' && <TabAccessLog />}

      {/* ── Tab: Mata Uang ── */}
      {activeTab === 'currency' && <TabCurrency />}

      {/* ── Tab: Notifikasi ── */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {/* Email Config */}
          <TabEmailConfig />
          {/* In-app toggles */}
          <Card>
            <CardHeader><CardTitle>Preferensi Notifikasi In-App</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-lg">
                {notifSettings.map((n) => (
                  <div key={n.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{n.label}</p>
                      <p className="text-xs text-gray-400">{n.desc}</p>
                    </div>
                    <button onClick={() => toggleNotif(n.key)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${n.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${n.enabled ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
              <Button className="mt-6" icon={<Save className="w-4 h-4" />} onClick={handleSaveNotif}>
                Simpan Preferensi
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tab: 2FA ── */}
      {activeTab === '2fa' && <Tab2FA />}

      {/* ── Tab: Sessions ── */}
      {activeTab === 'sessions' && <TabSessions />}

      {/* ── Tab: Audit Trail ── */}
      {activeTab === 'audit' && <TabAuditTrail />}

      {/* ── Tab: Security Policy ── */}
      {activeTab === 'security' && <TabSecurityPolicy />}

      {/* Modal Ubah Password */}
      <Modal open={showPwdModal} onClose={() => { setShowPwdModal(false); setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' }) }}
        title="Ubah Password">
        <div className="space-y-4">
          <Input label="Password Saat Ini" type="password" placeholder="••••••••" value={pwdForm.currentPassword}
            onChange={e => setPwdForm({ ...pwdForm, currentPassword: e.target.value })} />
          <Input label="Password Baru" type="password" placeholder="Min. 6 karakter" value={pwdForm.newPassword}
            onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })} />
          <Input label="Konfirmasi Password Baru" type="password" placeholder="Ulangi password baru" value={pwdForm.confirmPassword}
            onChange={e => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowPwdModal(false)}>Batal</Button>
            <Button loading={savingPwd} onClick={handleChangePassword}>Simpan Password</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
