import { useRef, useState, useEffect, useCallback, Fragment } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import StatCard from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DataTable from '@/components/ui/DataTable'
import {
  Target, AlertTriangle, TrendingUp, Plus, Trash2, Pencil, BarChart3,
  ChevronDown, ChevronRight, Upload, Download, CheckCircle, XCircle, Send,
} from 'lucide-react'
import { budgetApi } from '@/api'
import { useApi, useSubmit } from '@/hooks/useApi'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency } from '@/utils/format'
import toast from 'react-hot-toast'

const statusBadge = (s) => ({
  draft: <Badge variant="secondary">Draft</Badge>,
  submitted: <Badge variant="warning">Menunggu Approval</Badge>,
  approved: <Badge variant="success">Disetujui</Badge>,
  rejected: <Badge variant="danger">Ditolak</Badge>,
})[s] || <Badge variant="secondary">{s}</Badge>

const severityBadge = (s) => ({
  over: <Badge variant="danger">Over Budget</Badge>,
  warning: <Badge variant="warning">Mendekati Batas</Badge>,
  ok: <Badge variant="success">On Track</Badge>,
})[s] || <Badge>{s}</Badge>

const scenarioTypeBadge = (t) => ({
  base: <Badge variant="info">Base Case</Badge>,
  best: <Badge variant="success">Best Case</Badge>,
  worst: <Badge variant="danger">Worst Case</Badge>,
})[t] || <Badge>{t}</Badge>

const DEPTS = ['Produksi', 'Marketing', 'HR', 'IT', 'Operasional', 'Finance', 'R&D', 'Logistik']
const ACCOUNTS = [
  'Biaya Bahan Baku', 'Biaya Tenaga Kerja Langsung', 'Biaya Pemasaran',
  'Biaya Gaji & Tunjangan', 'Biaya Infrastruktur IT', 'Biaya Maintenance',
  'Biaya Umum & Administrasi', 'Biaya Riset & Pengembangan', 'Biaya Logistik',
]

const emptyEntry = { department: '', account: '', period: new Date().toISOString().slice(0, 7), budget_amount: '', notes: '' }
const emptyScenario = { name: '', year: new Date().getFullYear(), description: '', scenario_type: 'base', total_revenue_budget: '', total_cost_budget: '' }

const VALID_TABS = ['master', 'vsactual', 'alerts', 'forecast', 'scenarios']
const SECTION_TITLE = {
  master: 'Master Anggaran', vsactual: 'Budget vs Aktual', alerts: 'Peringatan',
  forecast: 'Forecast', scenarios: 'Skenario',
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row = {}
    headers.forEach((h, i) => { row[h] = values[i] || '' })
    return row
  })
}

export default function Budget() {
  const { tab } = useParams()
  const navigate = useNavigate()
  const activeTab = VALID_TABS.includes(tab) ? tab : 'master'
  useEffect(() => {
    if (!VALID_TABS.includes(tab)) navigate('/budget/master', { replace: true })
  }, [tab])
  const { canDo } = useAuthStore()
  const menuKey = `budget.${activeTab}`
  const canAdd = canDo(menuKey, 'add')
  const canEdit = canDo(menuKey, 'edit')
  const canDelete = canDo(menuKey, 'delete')
  const [showModal, setShowModal] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [entryForm, setEntryForm] = useState(emptyEntry)
  const [scenarioForm, setScenarioForm] = useState(emptyScenario)
  const [showScenarioModal, setShowScenarioModal] = useState(false)
  const [editScenario, setEditScenario] = useState(null)
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, reason: '' })

  const entryRef = useRef(null)
  const importRef = useRef(null)

  const { data: vsActualRaw } = useApi(budgetApi.getVsActual)
  const vsActualList = Array.isArray(vsActualRaw?.value) ? vsActualRaw.value : []

  const { data: alertsRaw } = useApi(budgetApi.getAlerts)
  const alertsList = Array.isArray(alertsRaw?.value) ? alertsRaw.value : []

  const { data: forecastRaw } = useApi(budgetApi.getForecast)
  const forecastList = Array.isArray(forecastRaw?.value) ? forecastRaw.value : []

  const { data: scenariosRaw, refetch: refetchScenarios } = useApi(budgetApi.getScenarios)
  const scenariosList = Array.isArray(scenariosRaw?.value) ? scenariosRaw.value : []

  const totalBudget = vsActualList.reduce((s, r) => s + (r.total_budget || 0), 0)
  const totalActual = vsActualList.reduce((s, r) => s + (r.total_actual || 0), 0)
  const overBudgetCount = alertsList.filter(a => a.severity === 'over').length

  const { submit: submitEntry, loading: savingEntry } = useSubmit(budgetApi.createEntry, {
    successMsg: 'Anggaran berhasil ditambahkan',
    onSuccess: () => { setShowModal(false); setEntryForm(emptyEntry); setEditEntry(null); entryRef.current?.refetch() },
  })
  const { submit: updateEntryFn, loading: updatingEntry } = useSubmit(
    (data) => budgetApi.updateEntry(editEntry?.id, data),
    { successMsg: 'Anggaran diperbarui', onSuccess: () => { setShowModal(false); setEditEntry(null); entryRef.current?.refetch() } }
  )
  const { submit: submitScenario, loading: savingScenario } = useSubmit(budgetApi.createScenario, {
    successMsg: 'Skenario berhasil ditambahkan',
    onSuccess: () => { setShowScenarioModal(false); setScenarioForm(emptyScenario); refetchScenarios() },
  })
  const { submit: updateScenarioFn, loading: updatingScenario } = useSubmit(
    (data) => budgetApi.updateScenario(editScenario?.id, data),
    { successMsg: 'Skenario diperbarui', onSuccess: () => { setShowScenarioModal(false); setEditScenario(null); refetchScenarios() } }
  )

  const handleDeleteEntry = async (row) => {
    try { await budgetApi.deleteEntry(row.id); toast.success('Anggaran dihapus'); entryRef.current?.refetch() }
    catch { toast.error('Gagal menghapus') }
  }
  const handleDeleteScenario = async (id) => {
    try { await budgetApi.deleteScenario(id); toast.success('Skenario dihapus'); refetchScenarios() }
    catch { toast.error('Gagal menghapus skenario') }
  }
  const openEditEntry = (row) => {
    setEditEntry(row)
    setEntryForm({ department: row.department, account: row.account, period: row.period, budget_amount: String(row.budget_amount), notes: row.notes || '' })
    setShowModal(true)
  }
  const openEditScenario = (s) => {
    setEditScenario(s)
    setScenarioForm({
      name: s.name, year: s.year, description: s.description || '',
      scenario_type: s.scenario_type,
      total_revenue_budget: String(s.total_revenue_budget),
      total_cost_budget: String(s.total_cost_budget),
    })
    setShowScenarioModal(true)
  }

  const handleSubmitApproval = async (id) => {
    try { await budgetApi.submitApproval(id); toast.success('Anggaran diajukan untuk persetujuan'); entryRef.current?.refetch() }
    catch { toast.error('Gagal mengajukan') }
  }
  const handleApprove = async (id) => {
    try { await budgetApi.approve(id); toast.success('Anggaran disetujui'); entryRef.current?.refetch() }
    catch { toast.error('Gagal menyetujui') }
  }
  const handleReject = async () => {
    try {
      await budgetApi.reject(rejectModal.id, { reason: rejectModal.reason })
      toast.success('Anggaran ditolak')
      setRejectModal({ open: false, id: null, reason: '' })
      entryRef.current?.refetch()
    } catch { toast.error('Gagal menolak') }
  }

  const handleImportCSV = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const text = await file.text()
    const rows = parseCSV(text)
    if (rows.length === 0) { toast.error('File CSV kosong atau format tidak valid'); return }
    const items = rows.map(r => ({
      department: r.department || '',
      account: r.account || '',
      period: r.period || '',
      budget_amount: parseFloat(r.budget_amount) || 0,
      notes: r.notes || '',
    })).filter(r => r.department && r.account && r.period)
    if (items.length === 0) { toast.error('Tidak ada baris valid dalam file CSV'); return }
    try {
      const res = await budgetApi.importEntries(items)
      toast.success(`${res.data?.imported ?? items.length} anggaran berhasil diimport`)
      entryRef.current?.refetch()
    } catch { toast.error('Gagal import data') }
  }, [])

  const handleDownloadTemplate = () => {
    const csv = [
      'department,account,period,budget_amount,notes',
      'Produksi,Biaya Bahan Baku,2026-01,850000000,Anggaran material Q1',
      'Produksi,Biaya Bahan Baku,2026-02,900000000,',
      'Marketing,Biaya Pemasaran,2026-01,120000000,Campaign Q1',
      'HR,Biaya Gaji & Tunjangan,2026-01,580000000,',
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'template_anggaran.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const toggleExpand = (idx) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  const overPct = totalBudget > 0 ? Math.round(totalActual / totalBudget * 100 * 10) / 10 : 0

  const entryColumns = [
    { key: 'department', label: 'Departemen', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
    { key: 'account', label: 'Akun Biaya', sortable: true },
    { key: 'period', label: 'Periode', sortable: true },
    { key: 'budget_amount', label: 'Anggaran', sortable: true, render: (v) => <span className="font-semibold text-indigo-700">{formatCurrency(v)}</span> },
    { key: 'status', label: 'Status', render: (v) => statusBadge(v) },
    { key: 'notes', label: 'Catatan', tdClassName: 'text-xs text-gray-500' },
  ]

  const alertColumns = [
    { key: 'department', label: 'Departemen', render: (v) => <span className="font-medium">{v}</span> },
    { key: 'account', label: 'Akun Biaya' },
    { key: 'period', label: 'Periode' },
    { key: 'budget', label: 'Anggaran', render: (v) => formatCurrency(v) },
    { key: 'actual', label: 'Realisasi', render: (v) => <span className="font-semibold">{formatCurrency(v)}</span> },
    { key: 'variance', label: 'Selisih', render: (v) => <span className={v < 0 ? 'text-red-600 font-semibold' : 'text-emerald-600'}>{formatCurrency(v)}</span> },
    { key: 'pct', label: '% Realisasi', render: (v) => <span className={v > 100 ? 'text-red-600 font-bold' : v > 90 ? 'text-amber-600 font-semibold' : 'text-emerald-600'}>{v}%</span> },
    { key: 'severity', label: 'Status', render: (v) => severityBadge(v) },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-semibold text-slate-800">{SECTION_TITLE[activeTab]}</h1>
        {activeTab === 'master' && (
          <div className="flex items-center gap-2 flex-wrap">
            <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
            <Button size="sm" variant="secondary" icon={<Download className="w-4 h-4" />} onClick={handleDownloadTemplate}>Template CSV</Button>
            {canAdd && <Button size="sm" variant="secondary" icon={<Upload className="w-4 h-4" />} onClick={() => importRef.current?.click()}>Import CSV</Button>}
            {canAdd && <Button size="sm" icon={<Plus />} onClick={() => { setEditEntry(null); setEntryForm(emptyEntry); setShowModal(true) }}>Tambah Anggaran</Button>}
          </div>
        )}
        {activeTab === 'scenarios' && canAdd && (
          <Button size="sm" icon={<Plus />} onClick={() => { setEditScenario(null); setScenarioForm(emptyScenario); setShowScenarioModal(true) }}>Tambah Skenario</Button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Anggaran YTD" value={formatCurrency(totalBudget)} icon={Target} color="blue" label="" />
        <StatCard title="Realisasi YTD" value={formatCurrency(totalActual)} icon={BarChart3} color="indigo" label="" />
        <StatCard title="% Realisasi" value={`${overPct}%`} icon={TrendingUp} color={overPct > 100 ? 'red' : overPct > 90 ? 'amber' : 'emerald'} label="" />
        <StatCard title="Item Over Budget" value={String(overBudgetCount)} icon={AlertTriangle} color="red" label="" />
      </div>

      {/* ── Master Anggaran ── */}
      {activeTab === 'master' && (
        <Card>
          <CardHeader><CardTitle>Master Anggaran per Departemen</CardTitle></CardHeader>
          <CardContent>
            <DataTable ref={entryRef} columns={entryColumns} fetchFn={budgetApi.getEntries}
              searchPlaceholder="Cari departemen, akun, periode..." defaultPageSize={15}
              actions={(row) => (
                <div className="flex gap-1 flex-wrap">
                  {canEdit && (
                    <button onClick={() => openEditEntry(row)}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-blue-600 hover:bg-blue-50 transition-colors font-medium">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                  {canEdit && row.status === 'draft' && (
                    <button onClick={() => handleSubmitApproval(row.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-amber-600 hover:bg-amber-50 transition-colors font-medium">
                      <Send className="w-3.5 h-3.5" /> Ajukan
                    </button>
                  )}
                  {canEdit && row.status === 'submitted' && (
                    <>
                      <button onClick={() => handleApprove(row.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors font-medium">
                        <CheckCircle className="w-3.5 h-3.5" /> Setujui
                      </button>
                      <button onClick={() => setRejectModal({ open: true, id: row.id, reason: '' })}
                        className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-red-500 hover:bg-red-50 transition-colors font-medium">
                        <XCircle className="w-3.5 h-3.5" /> Tolak
                      </button>
                    </>
                  )}
                  {canDelete && (
                    <button onClick={() => handleDeleteEntry(row)}
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

      {/* ── Budget vs Aktual ── */}
      {activeTab === 'vsactual' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Budget vs Realisasi Aktual</CardTitle>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Klik baris untuk detail bulanan</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-2 py-2 w-6"></th>
                    {['Departemen', 'Akun Biaya', 'Total Anggaran', 'Total Aktual', 'Selisih', '% Realisasi', 'Status'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vsActualList.map((row, i) => (
                    <Fragment key={i}>
                      <tr
                        className={`cursor-pointer hover:bg-blue-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                        onClick={() => toggleExpand(i)}>
                        <td className="px-2 py-2 text-slate-400">
                          {expandedRows.has(i)
                            ? <ChevronDown className="w-3.5 h-3.5" />
                            : <ChevronRight className="w-3.5 h-3.5" />}
                        </td>
                        <td className="px-3 py-2 font-medium">{row.department}</td>
                        <td className="px-3 py-2 text-slate-600">{row.account}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(row.total_budget)}</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatCurrency(row.total_actual)}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={row.variance >= 0 ? 'text-emerald-600' : 'text-red-600 font-semibold'}>
                            {row.variance >= 0 ? '+' : ''}{formatCurrency(row.variance)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${row.realization_pct > 100 ? 'bg-red-500' : row.realization_pct > 90 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(row.realization_pct, 100)}%` }} />
                            </div>
                            <span className={`text-xs font-semibold w-10 text-right ${row.realization_pct > 100 ? 'text-red-600' : row.realization_pct > 90 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {row.realization_pct}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2">{severityBadge(row.status)}</td>
                      </tr>
                      {expandedRows.has(i) && Array.isArray(row.months) && row.months.length > 0 && (
                        <tr>
                          <td colSpan={8} className="bg-blue-50/50 px-6 pt-1 pb-3">
                            <div className="border border-blue-100 rounded-lg overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-blue-100/70">
                                    {['Periode', 'Anggaran', 'Aktual', 'Selisih', '% Realisasi'].map(h => (
                                      <th key={h} className="px-3 py-1.5 text-left font-semibold text-blue-700">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.months.map((m, mi) => (
                                    <tr key={mi} className={mi % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}>
                                      <td className="px-3 py-1.5 font-medium">{m.period}</td>
                                      <td className="px-3 py-1.5 text-right">{formatCurrency(m.budget)}</td>
                                      <td className="px-3 py-1.5 text-right font-semibold">{formatCurrency(m.actual)}</td>
                                      <td className="px-3 py-1.5 text-right">
                                        <span className={m.variance >= 0 ? 'text-emerald-600' : 'text-red-600 font-semibold'}>
                                          {m.variance >= 0 ? '+' : ''}{formatCurrency(m.variance)}
                                        </span>
                                      </td>
                                      <td className="px-3 py-1.5">
                                        <span className={`font-semibold ${m.pct > 100 ? 'text-red-600' : m.pct > 90 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                          {m.pct}%
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {vsActualList.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">Tidak ada data</td></tr>
                  )}
                </tbody>
                {vsActualList.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                      <td className="px-3 py-2" colSpan={3}>TOTAL</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(totalBudget)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(totalActual)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={totalBudget - totalActual >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                          {totalBudget - totalActual >= 0 ? '+' : ''}{formatCurrency(totalBudget - totalActual)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center font-bold">{overPct}%</td>
                      <td className="px-3 py-2"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Peringatan Over Budget ── */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alertsList.filter(a => a.severity === 'over').length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-700 mb-1">
                {alertsList.filter(a => a.severity === 'over').length} item melebihi anggaran bulan ini
              </p>
              <p className="text-xs text-red-600">Segera lakukan review dan tindakan korektif.</p>
            </div>
          )}
          <Card>
            <CardHeader><CardTitle>Peringatan Anggaran</CardTitle></CardHeader>
            <CardContent>
              <DataTable columns={alertColumns} fetchFn={budgetApi.getAlerts}
                searchPlaceholder="Cari departemen, akun..." defaultPageSize={10} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Rolling Forecast ── */}
      {activeTab === 'forecast' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Rolling Forecast — Proyeksi Penuh Tahun</CardTitle>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                Berdasarkan tren realisasi YTD
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {['Departemen', 'Akun', 'YTD Anggaran', 'YTD Aktual', 'Spend Rate', 'Anggaran Setahun', 'Forecast Setahun', 'Proyeksi Selisih'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {forecastList.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="px-3 py-2 font-medium">{row.department}</td>
                      <td className="px-3 py-2 text-slate-600 text-xs">{row.account}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(row.ytd_budget)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(row.ytd_actual)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs font-bold ${row.spend_rate > 105 ? 'text-red-600' : row.spend_rate > 100 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {row.spend_rate}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">{formatCurrency(row.year_budget)}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        <span className={row.forecast_full_yr > row.year_budget ? 'text-red-600' : 'text-slate-800'}>
                          {formatCurrency(row.forecast_full_yr)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={row.forecast_variance >= 0 ? 'text-emerald-600' : 'text-red-600 font-semibold'}>
                          {row.forecast_variance >= 0 ? '+' : ''}{formatCurrency(row.forecast_variance)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {forecastList.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">Tidak ada data forecast</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Skenario Anggaran ── */}
      {activeTab === 'scenarios' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scenariosList.map(s => (
              <Card key={s.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{s.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {scenarioTypeBadge(s.scenario_type)}
                      {canEdit && (
                        <button onClick={() => openEditScenario(s)} className="p-1 text-slate-400 hover:text-blue-500 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDeleteScenario(s.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-slate-500">{s.description}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Target Pendapatan</span>
                      <span className="font-semibold text-emerald-700">{formatCurrency(s.total_revenue_budget)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Total Biaya</span>
                      <span className="font-semibold text-red-600">{formatCurrency(s.total_cost_budget)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                      <span className="font-semibold text-slate-700">EBITDA</span>
                      <span className={`font-bold text-base ${s.ebitda >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>{formatCurrency(s.ebitda)}</span>
                    </div>
                  </div>
                  <div className="bg-slate-100 rounded-lg px-3 py-1.5">
                    <span className="text-xs text-slate-500">Margin: </span>
                    <span className="text-xs font-bold">
                      {s.total_revenue_budget > 0 ? Math.round(s.ebitda / s.total_revenue_budget * 1000) / 10 : 0}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {scenariosList.length === 0 && (
              <div className="col-span-3 text-center py-12 text-slate-400">Belum ada skenario anggaran</div>
            )}
          </div>
        </div>
      )}

      {/* ══ MODAL: Tambah/Edit Anggaran ══ */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditEntry(null); setEntryForm(emptyEntry) }}
        title={editEntry ? 'Edit Anggaran' : 'Tambah Anggaran'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Departemen" value={entryForm.department}
              onChange={e => setEntryForm({ ...entryForm, department: e.target.value })}
              options={[{ value: '', label: '-- Pilih --' }, ...DEPTS.map(d => ({ value: d, label: d }))]} />
            <Select label="Akun Biaya" value={entryForm.account}
              onChange={e => setEntryForm({ ...entryForm, account: e.target.value })}
              options={[{ value: '', label: '-- Pilih --' }, ...ACCOUNTS.map(a => ({ value: a, label: a }))]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Periode" type="month" value={entryForm.period}
              onChange={e => setEntryForm({ ...entryForm, period: e.target.value })} />
            <Input label="Jumlah Anggaran (Rp)" type="number" value={entryForm.budget_amount}
              onChange={e => setEntryForm({ ...entryForm, budget_amount: e.target.value })} />
          </div>
          <Input label="Catatan" placeholder="Keterangan anggaran" value={entryForm.notes}
            onChange={e => setEntryForm({ ...entryForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowModal(false); setEditEntry(null) }}>Batal</Button>
            <Button loading={savingEntry || updatingEntry}
              onClick={() => {
                const payload = { ...entryForm, budget_amount: parseFloat(entryForm.budget_amount) || 0 }
                editEntry ? updateEntryFn(payload) : submitEntry(payload)
              }}>Simpan</Button>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL: Tambah/Edit Skenario ══ */}
      <Modal open={showScenarioModal} onClose={() => { setShowScenarioModal(false); setEditScenario(null); setScenarioForm(emptyScenario) }}
        title={editScenario ? 'Edit Skenario' : 'Tambah Skenario Anggaran'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nama Skenario" placeholder="Best Case 2026" value={scenarioForm.name}
              onChange={e => setScenarioForm({ ...scenarioForm, name: e.target.value })} />
            <Select label="Tipe Skenario" value={scenarioForm.scenario_type}
              onChange={e => setScenarioForm({ ...scenarioForm, scenario_type: e.target.value })}
              options={[{ value: 'base', label: 'Base Case' }, { value: 'best', label: 'Best Case' }, { value: 'worst', label: 'Worst Case' }]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tahun" type="number" value={scenarioForm.year}
              onChange={e => setScenarioForm({ ...scenarioForm, year: parseInt(e.target.value) })} />
            <Input label="Deskripsi Asumsi" placeholder="Pertumbuhan 8%, inflasi 4%" value={scenarioForm.description}
              onChange={e => setScenarioForm({ ...scenarioForm, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Target Pendapatan (Rp)" type="number" value={scenarioForm.total_revenue_budget}
              onChange={e => setScenarioForm({ ...scenarioForm, total_revenue_budget: e.target.value })} />
            <Input label="Total Biaya (Rp)" type="number" value={scenarioForm.total_cost_budget}
              onChange={e => setScenarioForm({ ...scenarioForm, total_cost_budget: e.target.value })} />
          </div>
          {(scenarioForm.total_revenue_budget || scenarioForm.total_cost_budget) && (
            <div className="bg-indigo-50 rounded-xl px-4 py-3 text-sm">
              <span className="text-slate-600">Proyeksi EBITDA: </span>
              <span className="font-bold text-indigo-700">
                {formatCurrency((parseFloat(scenarioForm.total_revenue_budget) || 0) - (parseFloat(scenarioForm.total_cost_budget) || 0))}
              </span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowScenarioModal(false); setEditScenario(null) }}>Batal</Button>
            <Button loading={savingScenario || updatingScenario}
              onClick={() => {
                const payload = {
                  ...scenarioForm,
                  total_revenue_budget: parseFloat(scenarioForm.total_revenue_budget) || 0,
                  total_cost_budget: parseFloat(scenarioForm.total_cost_budget) || 0,
                }
                editScenario ? updateScenarioFn(payload) : submitScenario(payload)
              }}>Simpan Skenario</Button>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL: Tolak Anggaran ══ */}
      <Modal open={rejectModal.open} onClose={() => setRejectModal({ open: false, id: null, reason: '' })}
        title="Tolak Anggaran">
        <div className="space-y-4">
          <Input label="Alasan Penolakan" placeholder="Masukkan alasan penolakan..." value={rejectModal.reason}
            onChange={e => setRejectModal(prev => ({ ...prev, reason: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejectModal({ open: false, id: null, reason: '' })}>Batal</Button>
            <Button variant="danger" onClick={handleReject}>Tolak Anggaran</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
