import { useCallback, useEffect, useRef, useState } from 'react'
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
  Users, UserCheck, UserX, Clock, Plus, Download, Pencil, Trash2,
  LogIn, LogOut, Check, X, CreditCard, RefreshCw,
  BarChart2, TrendingUp, TrendingDown, Award, ChevronDown, ChevronRight,
  Building2, Printer, FileText, CalendarDays,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Legend, LineChart, Line,
} from 'recharts'
import { hrisApi } from '@/api'
import { useApi, useSubmit } from '@/hooks/useApi'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/utils/format'
import toast from 'react-hot-toast'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#64748b']

const deptOptions = ['Produksi', 'HR', 'IT', 'Finance', 'Marketing', 'Operasional', 'Logistik', 'Semua'].map(d => ({ value: d, label: d }))
const leaveTypes = ['Cuti Tahunan', 'Izin Sakit', 'Cuti Melahirkan', 'Cuti Penting', 'Izin Khusus'].map(t => ({ value: t, label: t }))
const candidateStages = ['Melamar', 'Screening', 'Interview', 'Offering', 'Hired', 'Rejected'].map(s => ({ value: s, label: s }))
const kpiPeriods = ['Semester', 'Tahunan', 'Kuartalan'].map(p => ({ value: p, label: p }))
const shiftTypes = [{ value: 'regular', label: 'Reguler' }, { value: 'night', label: 'Malam' }, { value: 'split', label: 'Split' }]

// --- Badge helpers ---
const statusBadgeAtt = (s) => ({ present: <Badge variant="success" dot>Hadir</Badge>, late: <Badge variant="warning" dot>Terlambat</Badge>, absent: <Badge variant="danger" dot>Absen</Badge>, leave: <Badge variant="info" dot>Cuti</Badge> })[s] || <Badge>{s}</Badge>
const leaveStatusBadge = (s) => ({ pending: <Badge variant="warning">Pending</Badge>, pending_approval: <Badge variant="info">Menunggu Approval</Badge>, approved: <Badge variant="success">Disetujui</Badge>, rejected: <Badge variant="danger">Ditolak</Badge> })[s] || <Badge>{s}</Badge>
const payrollStatusBadge = (s) => ({ paid: <Badge variant="success">Sudah Dibayar</Badge>, draft: <Badge variant="warning">Draft</Badge>, processing: <Badge variant="info">Proses</Badge> })[s] || <Badge>{s}</Badge>
const jobStatusBadge = (s) => ({ open: <Badge variant="success" dot>Buka</Badge>, closed: <Badge variant="danger" dot>Tutup</Badge>, draft: <Badge variant="warning" dot>Draft</Badge> })[s] || <Badge>{s}</Badge>
const stageBadge = (s) => {
  const map = { Melamar: 'default', Screening: 'info', Interview: 'warning', Offering: 'success', Hired: 'success', Rejected: 'danger' }
  return <Badge variant={map[s] || 'default'}>{s}</Badge>
}
const trainingStatusBadge = (s) => ({ scheduled: <Badge variant="info">Terjadwal</Badge>, ongoing: <Badge variant="warning">Berlangsung</Badge>, completed: <Badge variant="success">Selesai</Badge>, cancelled: <Badge variant="danger">Dibatalkan</Badge> })[s] || <Badge>{s}</Badge>
const kpiStatusBadge = (s) => ({ self_review: <Badge variant="info">Self Review</Badge>, manager_review: <Badge variant="warning">Review Atasan</Badge>, completed: <Badge variant="success">Selesai</Badge> })[s] || <Badge>{s}</Badge>
const overtimeStatusBadge = (s) => ({ pending: <Badge variant="warning">Pending</Badge>, approved: <Badge variant="success">Disetujui</Badge>, rejected: <Badge variant="danger">Ditolak</Badge> })[s] || <Badge>{s}</Badge>

// --- Column definitions ---
const attendanceColumns = [
  { key: 'emp_number', label: 'NIK', sortable: true, render: (v) => <span className="font-mono text-xs text-blue-600 font-semibold">{v}</span> },
  { key: 'name', label: 'Nama', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
  { key: 'department', label: 'Departemen', sortable: true },
  { key: 'check_in', label: 'Check-In', render: (v) => v ? <span className="font-mono text-xs">{v}</span> : <span className="text-gray-400">—</span> },
  { key: 'check_out', label: 'Check-Out', render: (v) => v ? <span className="font-mono text-xs">{v}</span> : <span className="text-gray-400">—</span> },
  { key: 'work_hours', label: 'Jam Kerja', tdClassName: 'text-xs text-gray-500' },
  { key: 'status', label: 'Status', sortable: true, render: (v) => statusBadgeAtt(v) },
]

const leaveColumns = [
  { key: 'emp_number', label: 'NIK', sortable: true, render: (v) => <span className="font-mono text-xs text-blue-600 font-semibold">{v}</span> },
  { key: 'employee_name', label: 'Karyawan', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
  { key: 'department', label: 'Dept', sortable: true },
  { key: 'type', label: 'Jenis', sortable: true },
  { key: 'start_date', label: 'Mulai', sortable: true, render: (v) => v ? formatDate(v) : '—' },
  { key: 'end_date', label: 'Selesai', sortable: true, render: (v) => v ? formatDate(v) : '—' },
  { key: 'days', label: 'Hari', render: (v) => <span className="font-semibold">{v}h</span> },
  { key: 'status', label: 'Status', sortable: true, render: (v) => leaveStatusBadge(v) },
]

const payrollColumns = [
  { key: 'emp_number', label: 'NIK', sortable: true, render: (v) => <span className="font-mono text-xs text-blue-600 font-semibold">{v}</span> },
  { key: 'employee_name', label: 'Karyawan', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
  { key: 'department', label: 'Dept', sortable: true },
  { key: 'basic_salary', label: 'Gaji Pokok', sortable: true, render: (v) => formatCurrency(v) },
  { key: 'allowances', label: 'Tunjangan', render: (v) => <span className="text-emerald-600">{formatCurrency(v)}</span> },
  { key: 'deductions', label: 'Potongan', render: (v) => <span className="text-red-500">-{formatCurrency(v)}</span> },
  { key: 'net_salary', label: 'Gaji Bersih', sortable: true, render: (v) => <span className="font-bold text-blue-700">{formatCurrency(v)}</span> },
  { key: 'status', label: 'Status', sortable: true, render: (v) => payrollStatusBadge(v) },
]

const jobColumns = [
  { key: 'title', label: 'Posisi', sortable: true, render: (v) => <span className="font-semibold">{v}</span> },
  { key: 'department', label: 'Departemen', sortable: true },
  { key: 'open_date', label: 'Buka', render: (v) => v ? formatDate(v) : '—' },
  { key: 'close_date', label: 'Tutup', render: (v) => v ? formatDate(v) : '—' },
  { key: 'applicants', label: 'Pelamar', render: (v) => <span className="font-bold text-indigo-600">{v}</span> },
  { key: 'status', label: 'Status', render: (v) => jobStatusBadge(v) },
]

const candidateColumns = [
  { key: 'name', label: 'Nama', sortable: true, render: (v) => <span className="font-semibold">{v}</span> },
  { key: 'job_title', label: 'Posisi', sortable: true },
  { key: 'email', label: 'Email', tdClassName: 'text-xs text-gray-500' },
  { key: 'phone', label: 'Telepon', tdClassName: 'text-xs' },
  { key: 'applied_date', label: 'Tanggal', render: (v) => v ? formatDate(v) : '—' },
  { key: 'stage', label: 'Tahap', render: (v) => stageBadge(v) },
]

const trainingProgramColumns = [
  { key: 'title', label: 'Program', sortable: true, render: (v) => <span className="font-semibold">{v}</span> },
  { key: 'category', label: 'Kategori', sortable: true },
  { key: 'trainer', label: 'Trainer' },
  { key: 'duration_hours', label: 'Durasi (Jam)', render: (v) => <span className="font-medium">{v} jam</span> },
  { key: 'description', label: 'Deskripsi', tdClassName: 'text-xs text-gray-500' },
]

const trainingScheduleColumns = [
  { key: 'program_title', label: 'Program', sortable: true, render: (v) => <span className="font-semibold">{v}</span> },
  { key: 'start_date', label: 'Mulai', render: (v) => v ? formatDate(v) : '—' },
  { key: 'end_date', label: 'Selesai', render: (v) => v ? formatDate(v) : '—' },
  { key: 'location', label: 'Lokasi' },
  { key: 'participants', label: 'Peserta', render: (v) => <span className="font-bold text-indigo-600">{v}</span> },
  { key: 'score', label: 'Skor', render: (v) => v > 0 ? <span className="font-bold text-emerald-600">{v}</span> : <span className="text-gray-400">—</span> },
  { key: 'status', label: 'Status', render: (v) => trainingStatusBadge(v) },
]

const kpiTemplateColumns = [
  { key: 'title', label: 'Template', sortable: true, render: (v) => <span className="font-semibold">{v}</span> },
  { key: 'department', label: 'Departemen', sortable: true },
  { key: 'period', label: 'Periode', sortable: true },
  { key: 'description', label: 'Deskripsi', tdClassName: 'text-xs text-gray-500' },
]

const kpiReviewColumns = [
  { key: 'employee_name', label: 'Karyawan', sortable: true, render: (v) => <span className="font-semibold">{v}</span> },
  { key: 'template_title', label: 'Template', sortable: true },
  { key: 'period', label: 'Periode', sortable: true },
  { key: 'self_score', label: 'Self', render: (v) => <span className="font-medium text-indigo-600">{v || '—'}</span> },
  { key: 'manager_score', label: 'Atasan', render: (v) => <span className="font-medium text-violet-600">{v || '—'}</span> },
  { key: 'final_score', label: 'Final', render: (v) => v > 0 ? <span className="font-bold text-emerald-600">{v}</span> : <span className="text-gray-400">—</span> },
  { key: 'status', label: 'Status', render: (v) => kpiStatusBadge(v) },
]

const shiftColumns = [
  { key: 'name', label: 'Shift', sortable: true, render: (v) => <span className="font-semibold">{v}</span> },
  { key: 'start_time', label: 'Mulai', render: (v) => <span className="font-mono font-medium">{v}</span> },
  { key: 'end_time', label: 'Selesai', render: (v) => <span className="font-mono font-medium">{v}</span> },
  { key: 'type', label: 'Tipe', render: (v) => v === 'night' ? <Badge variant="info">Malam</Badge> : <Badge variant="default">Reguler</Badge> },
]

const overtimeColumns = [
  { key: 'employee_name', label: 'Karyawan', sortable: true, render: (v) => <span className="font-semibold">{v}</span> },
  { key: 'department', label: 'Dept', sortable: true },
  { key: 'date', label: 'Tanggal', render: (v) => v ? formatDate(v) : '—' },
  { key: 'hours', label: 'Jam', render: (v) => <span className="font-medium">{v}j</span> },
  { key: 'reason', label: 'Alasan', tdClassName: 'text-xs text-gray-500' },
  { key: 'rate_multiplier', label: 'Multiplier', render: (v) => <span className="text-xs font-medium">×{v}</span> },
  { key: 'amount', label: 'Upah Lembur', render: (v) => <span className="font-bold text-emerald-600">{formatCurrency(v)}</span> },
  { key: 'status', label: 'Status', render: (v) => overtimeStatusBadge(v) },
]

function OrgNode({ node, expandedNodes, setExpandedNodes, depth = 0 }) {
  if (!node) return null
  const key = node.name
  const isExpanded = expandedNodes.has(key)
  const hasChildren = node.children && node.children.length > 0
  const toggle = () => setExpandedNodes(prev => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  const deptColors = {
    Produksi: 'border-blue-300 bg-blue-50', HR: 'border-purple-300 bg-purple-50',
    Finance: 'border-green-300 bg-green-50', IT: 'border-cyan-300 bg-cyan-50',
    Marketing: 'border-orange-300 bg-orange-50', Direksi: 'border-slate-300 bg-slate-50',
    Logistik: 'border-amber-300 bg-amber-50', Operasional: 'border-teal-300 bg-teal-50',
  }
  const nodeColor = deptColors[node.dept] || 'border-slate-200 bg-white'

  return (
    <div className={`flex flex-col items-center ${depth > 0 ? 'mt-4' : ''}`}>
      <div className={`border-2 rounded-xl px-4 py-2.5 text-center min-w-[140px] max-w-[180px] shadow-sm cursor-pointer transition-all hover:shadow-md ${nodeColor}`}
        onClick={hasChildren ? toggle : undefined}>
        <p className="font-semibold text-sm truncate">{node.name}</p>
        <p className="text-xs text-muted-foreground truncate">{node.title}</p>
        {node.headcount && <p className="text-xs text-blue-600 mt-0.5">{node.headcount} orang</p>}
        {hasChildren && (
          <div className="mt-1 text-slate-400">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 mx-auto" /> : <ChevronRight className="w-3.5 h-3.5 mx-auto" />}
          </div>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div className="flex flex-wrap justify-center gap-6 mt-0 relative">
          {/* Connector line */}
          <div className="absolute top-0 left-1/2 w-px h-4 bg-slate-300 -translate-x-1/2" />
          <div className="flex flex-wrap justify-center gap-4 mt-4 relative">
            {node.children.map((child, i) => (
              <OrgNode key={i} node={child} expandedNodes={expandedNodes} setExpandedNodes={setExpandedNodes} depth={depth + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const VALID_HRIS_TABS = ['hrdashboard', 'employee', 'attendance', 'leave', 'payroll', 'payslip', 'recruitment', 'training', 'kpi', 'overtime', 'orgchart']

export default function SmartHRIS() {
  const { tab } = useParams()
  const navigate = useNavigate()
  const activeTab = VALID_HRIS_TABS.includes(tab) ? tab : 'employee'
  useEffect(() => {
    if (!VALID_HRIS_TABS.includes(tab)) navigate('/hris/employee', { replace: true })
  }, [tab])
  const { canDo } = useAuthStore()
  const menuKey = `hris.${activeTab}`
  const canAdd = canDo(menuKey, 'add')
  const canEdit = canDo(menuKey, 'edit')
  const canDelete = canDo(menuKey, 'delete')
  const [showModal, setShowModal] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [deleteRow, setDeleteRow] = useState(null)
  const [form, setForm] = useState({ emp_number: '', name: '', email: '', department: '', position: '', salary: '', join_date: '', status: 'active' })
  const [leaveForm, setLeaveForm] = useState({ employee_id: '', type: 'Cuti Tahunan', start_date: '', end_date: '', reason: '' })
  const [jobForm, setJobForm] = useState({ title: '', department: '', description: '', requirements: '', open_date: '', close_date: '' })
  const [candidateForm, setCandidateForm] = useState({ job_id: '', name: '', email: '', phone: '', notes: '', applied_date: '' })
  const [stageForm, setStageForm] = useState({ stage: '', notes: '' })
  const [stageTarget, setStageTarget] = useState(null)
  const [trainingProgramForm, setTrainingProgramForm] = useState({ title: '', category: '', trainer: '', duration_hours: '', description: '' })
  const [trainingScheduleForm, setTrainingScheduleForm] = useState({ program_id: '', start_date: '', end_date: '', location: '', participants: '' })
  const [kpiTemplateForm, setKpiTemplateForm] = useState({ title: '', department: '', period: 'Semester', description: '' })
  const [kpiReviewForm, setKpiReviewForm] = useState({ employee_id: '', template_id: '', period: '', self_score: '', notes: '' })
  const [shiftForm, setShiftForm] = useState({ name: '', start_time: '', end_time: '', type: 'regular' })
  const [overtimeForm, setOvertimeForm] = useState({ employee_id: '', date: '', hours: '', reason: '', rate_multiplier: '1.5' })

  const tableRef = useRef(null)
  const leaveRef = useRef(null)
  const payrollRef = useRef(null)
  const jobRef = useRef(null)
  const candidateRef = useRef(null)
  const trainingProgramRef = useRef(null)
  const trainingScheduleRef = useRef(null)
  const kpiTemplateRef = useRef(null)
  const kpiReviewRef = useRef(null)
  const shiftRef = useRef(null)
  const overtimeRef = useRef(null)

  const { data: statsData } = useApi(hrisApi.getEmployees)
  const stats = Array.isArray(statsData?.value) ? statsData.value : []
  const { data: programsData } = useApi(hrisApi.getTrainingPrograms)
  const programs = Array.isArray(programsData?.value) ? programsData.value : []
  const { data: kpiTemplatesData } = useApi(hrisApi.getKPITemplates)
  const kpiTemplates = Array.isArray(kpiTemplatesData?.value) ? kpiTemplatesData.value : []
  const { data: jobsData } = useApi(hrisApi.getJobs)
  const jobs = Array.isArray(jobsData?.value) ? jobsData.value : []

  const { submit: createEmp, loading: creating } = useSubmit(hrisApi.createEmployee, { successMsg: 'Karyawan berhasil ditambahkan', onSuccess: () => { setShowModal(false); setForm({ emp_number: '', name: '', email: '', department: '', position: '', salary: '', join_date: '', status: 'active' }); tableRef.current?.refetch() } })
  const { submit: updateEmp, loading: updating } = useSubmit((data) => hrisApi.updateEmployee(editRow?.id, data), { successMsg: 'Data karyawan diperbarui', onSuccess: () => { setEditRow(null); tableRef.current?.refetch() } })
  const { submit: createLeave, loading: savingLeave } = useSubmit(hrisApi.createLeave, { successMsg: 'Pengajuan cuti berhasil dikirim', onSuccess: () => { setShowModal(false); setLeaveForm({ employee_id: '', type: 'Cuti Tahunan', start_date: '', end_date: '', reason: '' }); leaveRef.current?.refetch() } })
  const { submit: createJob, loading: savingJob } = useSubmit(hrisApi.createJob, { successMsg: 'Lowongan berhasil dibuat', onSuccess: () => { setShowModal(false); setJobForm({ title: '', department: '', description: '', requirements: '', open_date: '', close_date: '' }); jobRef.current?.refetch() } })
  const { submit: createCandidate, loading: savingCandidate } = useSubmit(hrisApi.createCandidate, { successMsg: 'Kandidat berhasil ditambahkan', onSuccess: () => { setShowModal(false); setCandidateForm({ job_id: '', name: '', email: '', phone: '', notes: '', applied_date: '' }); candidateRef.current?.refetch() } })
  const { submit: createTrainingProgram, loading: savingProgram } = useSubmit(hrisApi.createTrainingProgram, { successMsg: 'Program training berhasil dibuat', onSuccess: () => { setShowModal(false); setTrainingProgramForm({ title: '', category: '', trainer: '', duration_hours: '', description: '' }); trainingProgramRef.current?.refetch() } })
  const { submit: createTrainingSchedule, loading: savingSchedule } = useSubmit(hrisApi.createTrainingSchedule, { successMsg: 'Jadwal training berhasil dibuat', onSuccess: () => { setShowModal(false); setTrainingScheduleForm({ program_id: '', start_date: '', end_date: '', location: '', participants: '' }); trainingScheduleRef.current?.refetch() } })
  const { submit: createKPITemplate, loading: savingKPITemplate } = useSubmit(hrisApi.createKPITemplate, { successMsg: 'Template KPI berhasil dibuat', onSuccess: () => { setShowModal(false); setKpiTemplateForm({ title: '', department: '', period: 'Semester', description: '' }); kpiTemplateRef.current?.refetch() } })
  const { submit: createKPIReview, loading: savingKPIReview } = useSubmit(hrisApi.createKPIReview, { successMsg: 'Review KPI berhasil disimpan', onSuccess: () => { setShowModal(false); setKpiReviewForm({ employee_id: '', template_id: '', period: '', self_score: '', notes: '' }); kpiReviewRef.current?.refetch() } })
  const { submit: createShift, loading: savingShift } = useSubmit(hrisApi.createShift, { successMsg: 'Shift berhasil ditambahkan', onSuccess: () => { setShowModal(false); setShiftForm({ name: '', start_time: '', end_time: '', type: 'regular' }); shiftRef.current?.refetch() } })
  const { submit: createOvertime, loading: savingOvertime } = useSubmit(hrisApi.createOvertime, { successMsg: 'Lembur berhasil dicatat', onSuccess: () => { setShowModal(false); setOvertimeForm({ employee_id: '', date: '', hours: '', reason: '', rate_multiplier: '1.5' }); overtimeRef.current?.refetch() } })

  const handleDelete = async () => {
    try {
      await hrisApi.deleteEmployee(deleteRow.id)
      toast.success('Karyawan berhasil dihapus')
      setDeleteRow(null)
      tableRef.current?.refetch()
    } catch { toast.error('Gagal menghapus karyawan') }
  }

  const handleLeaveApprove = async (id, status) => {
    try {
      await hrisApi.updateLeaveStatus(id, status)
      toast.success(status === 'approved' ? 'Cuti disetujui' : 'Cuti ditolak')
      leaveRef.current?.refetch()
    } catch { toast.error('Gagal update status') }
  }

  const handlePayrollStatus = async (id, status) => {
    try {
      await hrisApi.updatePayrollStatus(id, status)
      toast.success('Status payroll diperbarui')
      payrollRef.current?.refetch()
    } catch { toast.error('Gagal update status') }
  }

  const handleGeneratePayroll = async () => {
    try {
      const period = new Date().toISOString().substring(0, 7)
      await hrisApi.generatePayroll(period)
      toast.success(`Payroll ${period} berhasil digenerate`)
      payrollRef.current?.refetch()
    } catch { toast.error('Gagal generate payroll') }
  }

  const handleUpdateStage = async () => {
    try {
      await hrisApi.updateCandidateStage(stageTarget.id, stageForm)
      toast.success('Status kandidat diperbarui')
      setStageTarget(null)
      candidateRef.current?.refetch()
    } catch { toast.error('Gagal update status') }
  }

  const handleOvertimeApprove = async (id, status) => {
    try {
      await hrisApi.updateOvertimeStatus(id, status)
      toast.success(status === 'approved' ? 'Lembur disetujui' : 'Lembur ditolak')
      overtimeRef.current?.refetch()
    } catch { toast.error('Gagal update status') }
  }

  const openEdit = (row) => {
    setEditRow(row)
    setForm({ emp_number: row.emp_number, name: row.name, email: row.email || '', department: row.department, position: row.position, salary: String(row.salary), join_date: row.join_date || '', status: row.status })
  }

  const deptCount = stats.reduce((acc, e) => { acc[e.department] = (acc[e.department] || 0) + 1; return acc }, {})
  const deptData = Object.entries(deptCount).map(([name, value]) => ({ name, value }))

  const empColumns = [
    { key: 'emp_number', label: 'NIK', sortable: true, render: (v) => <span className="font-mono text-xs text-indigo-600 font-semibold">{v}</span> },
    { key: 'name', label: 'Nama', sortable: true, render: (v) => <div className="flex items-center gap-2.5"><div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0 shadow-sm">{v?.[0]}</div><span className="font-semibold text-slate-800 text-sm">{v}</span></div> },
    { key: 'department', label: 'Departemen', sortable: true },
    { key: 'position', label: 'Jabatan', tdClassName: 'text-gray-500 text-xs' },
    { key: 'salary', label: 'Gaji', sortable: true, render: (v) => <span className="text-xs font-medium">{formatCurrency(v)}</span> },
    { key: 'status', label: 'Status', render: (v) => v === 'active' ? <Badge variant="success" dot>Aktif</Badge> : <Badge variant="warning" dot>Cuti</Badge> },
  ]

  const [hrDashData, setHrDashData] = useState(null)
  const [orgChartData, setOrgChartData] = useState(null)
  const [orgDept, setOrgDept] = useState('')
  const [expandedNodes, setExpandedNodes] = useState(new Set(['CEO']))
  const [payslipModal, setPayslipModal] = useState(null)
  const [calMonth, setCalMonth] = useState(new Date().toISOString().slice(0, 7))
  const [calEmpId, setCalEmpId] = useState('EMP-001')
  const [calData, setCalData] = useState(null)

  useEffect(() => {
    if (activeTab !== 'hrdashboard') return
    hrisApi.getHRDashboard().then(r => setHrDashData(r.data ?? r)).catch(() => {})
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== 'orgchart') return
    hrisApi.getOrgChart(orgDept).then(r => setOrgChartData(r.data ?? r)).catch(() => {})
  }, [activeTab, orgDept])

  useEffect(() => {
    if (activeTab !== 'attendance') return
    hrisApi.getAttendanceCalendar(calMonth, calEmpId).then(r => setCalData(r.data ?? r)).catch(() => {})
  }, [activeTab, calMonth, calEmpId])

  const sectionTitle = {
    hrdashboard: 'HR Dashboard', employee: 'Karyawan', attendance: 'Absensi', leave: 'Cuti & Izin',
    payroll: 'Payroll', payslip: 'Slip Gaji', recruitment: 'Rekrutmen', training: 'Training',
    kpi: 'KPI', overtime: 'Shift & Lembur', orgchart: 'Organigram',
  }[activeTab]

  const empOptions = stats.map(e => ({ value: e.id, label: `${e.emp_number} — ${e.name}` }))
  const programOptions = programs.map(p => ({ value: p.id, label: p.title }))
  const kpiTemplateOptions = kpiTemplates.map(t => ({ value: t.id, label: t.title }))
  const jobOptions = jobs.map(j => ({ value: j.id, label: j.title }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-semibold text-slate-800">{sectionTitle}</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Download />}>Export</Button>
          {canAdd && activeTab === 'employee' && <Button size="sm" icon={<Plus />} onClick={() => { setEditRow(null); setForm({ emp_number: '', name: '', email: '', department: '', position: '', salary: '', join_date: '', status: 'active' }); setShowModal(true) }}>Tambah Karyawan</Button>}
          {canAdd && activeTab === 'leave' && <Button size="sm" icon={<Plus />} onClick={() => setShowModal(true)}>Ajukan Cuti</Button>}
          {canAdd && activeTab === 'payroll' && <Button size="sm" icon={<RefreshCw />} onClick={handleGeneratePayroll}>Generate Payroll</Button>}
          {canAdd && activeTab === 'recruitment' && <Button size="sm" icon={<Plus />} onClick={() => setShowModal(true)}>Buat Lowongan</Button>}
          {canAdd && activeTab === 'training' && <Button size="sm" icon={<Plus />} onClick={() => setShowModal(true)}>Tambah Program</Button>}
          {canAdd && activeTab === 'kpi' && <Button size="sm" icon={<Plus />} onClick={() => setShowModal(true)}>Buat Template KPI</Button>}
          {canAdd && activeTab === 'overtime' && <Button size="sm" icon={<Plus />} onClick={() => setShowModal(true)}>Tambah Shift</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Karyawan" value={String(statsData?.['@odata.count'] ?? stats.length)} trend={3.3} icon={Users} color="blue" />
        <StatCard title="Karyawan Aktif" value={String(stats.filter(e => e.status === 'active').length)} icon={UserCheck} color="emerald" />
        <StatCard title="Sedang Cuti" value={String(stats.filter(e => e.status === 'leave').length)} icon={Clock} color="amber" />
        <StatCard title="Resign Bulan Ini" value="2" trend={-50} icon={UserX} color="red" />
      </div>

      {/* ========== HR DASHBOARD ========== */}
      {activeTab === 'hrdashboard' && (
        <div className="space-y-4">
          {!hrDashData ? <div className="py-20 text-center text-sm text-muted-foreground">Memuat dashboard...</div> : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Karyawan', value: hrDashData.kpi?.total_employees, sub: `${hrDashData.kpi?.active_employees} aktif`, icon: Users, color: 'text-blue-600 bg-blue-50' },
                  { label: 'Rekrut Bulan Ini', value: `+${hrDashData.kpi?.new_hires_month}`, sub: `${hrDashData.kpi?.resignations_month} resign`, icon: UserCheck, color: 'text-green-600 bg-green-50' },
                  { label: 'Turnover Rate', value: `${hrDashData.kpi?.turnover_rate}%`, sub: 'YTD', icon: TrendingDown, color: 'text-amber-600 bg-amber-50' },
                  { label: 'Tingkat Kehadiran', value: `${hrDashData.kpi?.avg_attendance_rate}%`, sub: 'rata-rata bulan ini', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50' },
                ].map(({ label, value, sub, icon: Icon, color }) => (
                  <Card key={label}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${color.split(' ')[1]}`}>
                          <Icon className={`w-5 h-5 ${color.split(' ')[0]}`} />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="text-2xl font-bold">{value}</p>
                          <p className="text-xs text-muted-foreground">{sub}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Headcount by Dept */}
                <Card>
                  <CardHeader><CardTitle>Headcount per Departemen</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={hrDashData.headcount_by_dept || []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="dept" tick={{ fontSize: 11 }} width={80} />
                        <Tooltip />
                        <Bar dataKey="count" name="Karyawan" fill="#6366f1" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Headcount Trend */}
                <Card>
                  <CardHeader><CardTitle>Tren Headcount 6 Bulan</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={hrDashData.headcount_trend || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="headcount" stroke="#6366f1" strokeWidth={2} name="Headcount" dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="hired" stroke="#22c55e" strokeWidth={1.5} name="Masuk" dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="resigned" stroke="#ef4444" strokeWidth={1.5} name="Keluar" dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Attendance Summary */}
                <Card>
                  <CardHeader><CardTitle>Rekap Kehadiran Bulan Ini</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { label: 'Hadir', value: hrDashData.attendance_summary?.hadir, color: '#22c55e' },
                        { label: 'Terlambat', value: hrDashData.attendance_summary?.terlambat, color: '#f59e0b' },
                        { label: 'Absen', value: hrDashData.attendance_summary?.absen, color: '#ef4444' },
                        { label: 'Cuti', value: hrDashData.attendance_summary?.cuti, color: '#6366f1' },
                      ].map(({ label, value, color }) => {
                        const total = Object.values(hrDashData.attendance_summary || {}).reduce((a, b) => a + b, 0)
                        const pct = total ? Math.round(value / total * 100) : 0
                        return (
                          <div key={label}>
                            <div className="flex justify-between text-xs mb-1">
                              <span>{label}</span>
                              <span className="font-medium">{value} ({pct}%)</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full">
                              <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Age Distribution */}
                <Card>
                  <CardHeader><CardTitle>Distribusi Usia</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={hrDashData.age_distribution || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Top Performers */}
                <Card>
                  <CardHeader><CardTitle>Top 5 Karyawan (KPI)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2.5">
                      {(hrDashData.top_performers || []).map((emp, i) => (
                        <div key={emp.emp_number} className="flex items-center gap-2.5">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : 'bg-amber-700'}`}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">{emp.dept}</p>
                          </div>
                          <span className="text-sm font-bold text-green-600">{emp.kpi_score}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========== KARYAWAN ========== */}
      {activeTab === 'employee' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader><CardTitle>Daftar Karyawan</CardTitle></CardHeader>
              <CardContent>
                <DataTable ref={tableRef} columns={empColumns} fetchFn={hrisApi.getEmployees} searchPlaceholder="Cari nama, NIK, departemen..." defaultPageSize={10}
                  toolbar={canAdd && <Button size="sm" icon={<Plus />} onClick={() => { setEditRow(null); setShowModal(true) }}>Tambah</Button>}
                  actions={(row) => (
                    <div className="flex gap-1">
                      {canEdit && <button onClick={() => openEdit(row)} className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-blue-600 hover:bg-blue-50 transition-colors font-medium"><Pencil className="w-3.5 h-3.5" /> Edit</button>}
                      {canDelete && <button onClick={() => setDeleteRow(row)} className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-red-500 hover:bg-red-50 transition-colors font-medium"><Trash2 className="w-3.5 h-3.5" /> Hapus</button>}
                    </div>
                  )}
                />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Distribusi Departemen</CardTitle></CardHeader>
            <CardContent>
              {deptData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart><Pie data={deptData} cx="50%" cy="50%" outerRadius={75} dataKey="value">{deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {deptData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><span className="text-gray-600">{d.name}</span></div>
                        <span className="font-semibold text-gray-800">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <div className="h-40 flex items-center justify-center"><p className="text-sm text-gray-400">Belum ada data</p></div>}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========== ABSENSI ========== */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Absensi Hari Ini — {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardTitle></CardHeader>
            <CardContent>
              <DataTable columns={attendanceColumns} fetchFn={hrisApi.getAttendance} searchPlaceholder="Cari nama, NIK..." defaultPageSize={10}
                actions={(row) => canEdit && (
                  <div className="flex gap-1">
                    {!row.check_in && <button className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors font-medium"><LogIn className="w-3.5 h-3.5" /> Check-in</button>}
                    {row.check_in && !row.check_out && <button className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-blue-600 hover:bg-blue-50 transition-colors font-medium"><LogOut className="w-3.5 h-3.5" /> Check-out</button>}
                  </div>
                )}
              />
            </CardContent>
          </Card>

          {/* Kalender Absensi */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle>Kalender Absensi</CardTitle>
                <div className="flex items-center gap-2">
                  <Input type="text" placeholder="EMP-001" value={calEmpId} onChange={e => setCalEmpId(e.target.value)} className="w-28 h-8 text-xs" />
                  <Input type="month" value={calMonth} onChange={e => setCalMonth(e.target.value)} className="w-36 h-8 text-xs" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {calData ? (
                <>
                  <div className="flex gap-4 mb-4 text-xs flex-wrap">
                    {[
                      { label: 'Hadir', count: calData.summary?.present, color: 'bg-green-500' },
                      { label: 'Terlambat', count: calData.summary?.late, color: 'bg-amber-500' },
                      { label: 'Absen', count: calData.summary?.absent, color: 'bg-red-500' },
                      { label: 'Cuti', count: calData.summary?.leave, color: 'bg-blue-500' },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <span className={`w-3 h-3 rounded ${color}`} />
                        <span>{label}: <strong>{count}</strong></span>
                      </div>
                    ))}
                    <span className="text-muted-foreground">| Hari Kerja: {calData.summary?.working_days}</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-xs">
                    {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
                      <div key={d} className="text-center font-semibold text-muted-foreground py-1">{d}</div>
                    ))}
                    {/* Empty cells before first day */}
                    {(() => {
                      const firstDate = new Date(calData.days?.[0]?.date)
                      const firstDow = firstDate.getDay()
                      return Array.from({ length: firstDow }).map((_, i) => <div key={`empty-${i}`} />)
                    })()}
                    {(calData.days || []).map(day => {
                      const colorMap = { present: 'bg-green-100 text-green-700 border-green-200', late: 'bg-amber-100 text-amber-700 border-amber-200', absent: 'bg-red-100 text-red-700 border-red-200', leave: 'bg-blue-100 text-blue-700 border-blue-200', weekend: 'bg-slate-50 text-slate-300 border-slate-100' }
                      const d = new Date(day.date).getDate()
                      return (
                        <div key={day.date} title={day.check_in ? `${day.check_in}–${day.check_out}` : day.status}
                          className={`border rounded-lg p-1.5 text-center cursor-default ${colorMap[day.status] || 'bg-white border-slate-200'}`}>
                          <span className="font-medium">{d}</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : <div className="py-8 text-center text-sm text-muted-foreground">Memuat kalender...</div>}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========== CUTI ========== */}
      {activeTab === 'leave' && (
        <Card>
          <CardHeader><CardTitle>Daftar Cuti & Izin</CardTitle></CardHeader>
          <CardContent>
            <DataTable ref={leaveRef} columns={leaveColumns} fetchFn={hrisApi.getLeaves} searchPlaceholder="Cari nama, departemen..." defaultPageSize={10}
              toolbar={canAdd && <Button size="sm" icon={<Plus />} onClick={() => setShowModal(true)}>Ajukan Cuti</Button>}
              actions={(row) => canEdit && row.status === 'pending' && (
                <div className="flex gap-1">
                  <button onClick={() => handleLeaveApprove(row.id, 'approved')} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors" title="Setujui"><Check className="w-4 h-4" /></button>
                  <button onClick={() => handleLeaveApprove(row.id, 'rejected')} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors" title="Tolak"><X className="w-4 h-4" /></button>
                </div>
              )}
            />
          </CardContent>
        </Card>
      )}

      {/* ========== PAYROLL ========== */}
      {activeTab === 'payroll' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Payroll — {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</CardTitle>
              {canAdd && <Button size="sm" icon={<RefreshCw />} onClick={handleGeneratePayroll}>Generate</Button>}
            </div>
          </CardHeader>
          <CardContent>
            <DataTable ref={payrollRef} columns={payrollColumns} fetchFn={hrisApi.getPayroll} searchPlaceholder="Cari nama, NIK..." defaultPageSize={10}
              actions={(row) => canEdit && row.status === 'draft' && (
                <button onClick={() => handlePayrollStatus(row.id, 'paid')} className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors font-medium"><CreditCard className="w-3.5 h-3.5" /> Bayar</button>
              )}
            />
          </CardContent>
        </Card>
      )}

      {/* ========== REKRUTMEN ========== */}
      {activeTab === 'recruitment' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Lowongan Pekerjaan</CardTitle>
                {canAdd && <Button size="sm" icon={<Plus />} onClick={() => { setShowModal(true) }}>Buat Lowongan</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <DataTable ref={jobRef} columns={jobColumns} fetchFn={hrisApi.getJobs} searchPlaceholder="Cari posisi, departemen..." defaultPageSize={5}
                actions={(row) => (
                  <div className="flex gap-1">
                    {canEdit && row.status === 'open' && <button onClick={async () => { await hrisApi.updateJobStatus(row.id, 'closed'); jobRef.current?.refetch() }} className="px-2 py-1 text-xs rounded-lg text-orange-500 hover:bg-orange-50 font-medium">Tutup</button>}
                    {canDelete && <button onClick={async () => { await hrisApi.deleteJob(row.id); jobRef.current?.refetch() }} className="px-2 py-1 text-xs rounded-lg text-red-500 hover:bg-red-50 font-medium"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                )}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Pipeline Kandidat</CardTitle>
                {canAdd && <Button size="sm" icon={<Plus />} onClick={() => { setShowModal(true) }}>Tambah Kandidat</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <DataTable ref={candidateRef} columns={candidateColumns} fetchFn={hrisApi.getCandidates} searchPlaceholder="Cari nama, posisi..." defaultPageSize={8}
                actions={(row) => (
                  <div className="flex gap-1">
                    {canEdit && <button onClick={() => { setStageTarget(row); setStageForm({ stage: row.stage, notes: row.notes || '' }) }} className="px-2 py-1 text-xs rounded-lg text-blue-600 hover:bg-blue-50 font-medium">Update Tahap</button>}
                    {canDelete && <button onClick={async () => { await hrisApi.deleteCandidate(row.id); candidateRef.current?.refetch() }} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========== TRAINING ========== */}
      {activeTab === 'training' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Program Training</CardTitle>
                {canAdd && <Button size="sm" icon={<Plus />} onClick={() => setShowModal(true)}>Tambah Program</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <DataTable ref={trainingProgramRef} columns={trainingProgramColumns} fetchFn={hrisApi.getTrainingPrograms} searchPlaceholder="Cari program, kategori..." defaultPageSize={5}
                actions={(row) => canDelete && <button onClick={async () => { await hrisApi.deleteTrainingProgram(row.id); trainingProgramRef.current?.refetch() }} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Jadwal Training</CardTitle>
                {canAdd && <Button size="sm" icon={<Plus />} onClick={() => setShowModal(true)}>Buat Jadwal</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <DataTable ref={trainingScheduleRef} columns={trainingScheduleColumns} fetchFn={hrisApi.getTrainingSchedules} searchPlaceholder="Cari program, lokasi..." defaultPageSize={8}
                actions={(row) => canEdit && row.status === 'scheduled' && (
                  <button onClick={async () => { await hrisApi.updateTrainingStatus(row.id, { status: 'completed', score: 85 }); trainingScheduleRef.current?.refetch() }} className="px-2 py-1 text-xs rounded-lg text-emerald-600 hover:bg-emerald-50 font-medium"><Check className="w-3.5 h-3.5" /></button>
                )}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========== KPI ========== */}
      {activeTab === 'kpi' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Template KPI</CardTitle>
                {canAdd && <Button size="sm" icon={<Plus />} onClick={() => setShowModal(true)}>Buat Template</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <DataTable ref={kpiTemplateRef} columns={kpiTemplateColumns} fetchFn={hrisApi.getKPITemplates} searchPlaceholder="Cari template, departemen..." defaultPageSize={5}
                actions={(row) => canDelete && <button onClick={async () => { await hrisApi.deleteKPITemplate(row.id); kpiTemplateRef.current?.refetch() }} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Penilaian KPI Karyawan</CardTitle>
                {canAdd && <Button size="sm" icon={<Plus />} onClick={() => setShowModal(true)}>Input Penilaian</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <DataTable ref={kpiReviewRef} columns={kpiReviewColumns} fetchFn={hrisApi.getKPIReviews} searchPlaceholder="Cari karyawan, periode..." defaultPageSize={8} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========== SHIFT & LEMBUR ========== */}
      {activeTab === 'overtime' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Master Shift</CardTitle>
                {canAdd && <Button size="sm" icon={<Plus />} onClick={() => setShowModal(true)}>Tambah Shift</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <DataTable ref={shiftRef} columns={shiftColumns} fetchFn={hrisApi.getShifts} searchPlaceholder="Cari shift..." defaultPageSize={5}
                actions={(row) => canDelete && <button onClick={async () => { await hrisApi.deleteShift(row.id); shiftRef.current?.refetch() }} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Catatan Lembur</CardTitle>
                {canAdd && <Button size="sm" icon={<Plus />} onClick={() => setShowModal(true)}>Catat Lembur</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <DataTable ref={overtimeRef} columns={overtimeColumns} fetchFn={hrisApi.getOvertime} searchPlaceholder="Cari karyawan, departemen..." defaultPageSize={10}
                actions={(row) => canEdit && row.status === 'pending' && (
                  <div className="flex gap-1">
                    <button onClick={() => handleOvertimeApprove(row.id, 'approved')} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50" title="Setujui"><Check className="w-4 h-4" /></button>
                    <button onClick={() => handleOvertimeApprove(row.id, 'rejected')} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50" title="Tolak"><X className="w-4 h-4" /></button>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========== SLIP GAJI ========== */}
      {activeTab === 'payslip' && (
        <Card>
          <CardHeader><CardTitle>Riwayat Slip Gaji</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              fetchFn={hrisApi.getPayslipHistory}
              columns={[
                { key: 'emp_number', header: 'NIK', render: v => <span className="font-mono text-xs text-blue-600 font-medium">{v}</span> },
                { key: 'employee_name', header: 'Karyawan', render: v => <span className="font-medium">{v}</span> },
                { key: 'department', header: 'Departemen' },
                { key: 'period', header: 'Periode', render: v => <Badge variant="secondary">{v}</Badge> },
                { key: 'basic_salary', header: 'Gaji Pokok', render: v => <span className="text-sm">{formatCurrency(v)}</span> },
                { key: 'net_salary', header: 'Gaji Bersih', render: v => <span className="font-bold text-green-600">{formatCurrency(v)}</span> },
                { key: 'status', header: 'Status', render: v => <Badge variant={v === 'paid' ? 'success' : 'warning'} dot>{v === 'paid' ? 'Dibayar' : 'Pending'}</Badge> },
              ]}
              searchPlaceholder="Cari karyawan, periode..."
              actions={row => (
                <Button size="xs" variant="ghost" onClick={async () => {
                  try {
                    const r = await hrisApi.getPayslip(row.id)
                    setPayslipModal(r.data ?? r)
                  } catch { toast.error('Gagal memuat slip') }
                }}>
                  <FileText className="w-3.5 h-3.5 mr-1" /> Lihat
                </Button>
              )}
            />
          </CardContent>
        </Card>
      )}

      {/* ========== ORGANIGRAM ========== */}
      {activeTab === 'orgchart' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">Filter Departemen:</span>
            {['', 'Produksi', 'HR', 'Finance', 'IT', 'Marketing'].map(d => (
              <button key={d} onClick={() => setOrgDept(d)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${orgDept === d ? 'bg-primary text-primary-foreground border-primary' : 'border-slate-200 text-slate-600 hover:border-primary'}`}>
                {d || 'Semua'}
              </button>
            ))}
          </div>

          {!orgChartData ? <div className="py-20 text-center text-sm text-muted-foreground">Memuat organigram...</div> : (
            <Card>
              <CardContent className="pt-5 overflow-auto">
                {orgDept && orgChartData.employees ? (
                  // Flat dept view
                  <div>
                    <p className="text-sm font-semibold mb-4 flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Departemen: {orgChartData.dept}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {(orgChartData.employees || []).map(emp => (
                        <div key={emp.emp_number} className={`border rounded-xl p-3 ${emp.level === 'manager' ? 'border-primary/40 bg-primary/5' : 'border-slate-200'}`}>
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-sm flex items-center justify-center font-bold">
                              {emp.name?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{emp.name}</p>
                              <p className="text-xs text-muted-foreground">{emp.title}</p>
                            </div>
                          </div>
                          {emp.emp_number && <p className="text-xs text-muted-foreground mt-1.5 font-mono">{emp.emp_number}</p>}
                          <Badge variant={emp.level === 'manager' ? 'primary' : emp.level === 'supervisor' ? 'warning' : 'default'} className="mt-2 text-xs">
                            {emp.level}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Tree view
                  <OrgNode node={orgChartData.ceo} expandedNodes={expandedNodes} setExpandedNodes={setExpandedNodes} />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ===== MODALS ===== */}

      {/* Slip Gaji Modal */}
      <Modal open={!!payslipModal} onClose={() => setPayslipModal(null)} title={`Slip Gaji — ${payslipModal?.period}`}>
        {payslipModal && (
          <div className="space-y-4" id="payslip-print-area">
            <div className="border rounded-xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4">
                <p className="font-bold text-lg">{payslipModal.company_name}</p>
                <p className="text-xs opacity-80">{payslipModal.company_address}</p>
                <p className="font-semibold mt-2">SLIP GAJI — {payslipModal.period?.toUpperCase()}</p>
              </div>
              {/* Employee */}
              <div className="p-4 bg-slate-50 border-b grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground text-xs">Nama</span><p className="font-semibold">{payslipModal.employee_name}</p></div>
                <div><span className="text-muted-foreground text-xs">NIK</span><p className="font-mono">{payslipModal.emp_number}</p></div>
                <div><span className="text-muted-foreground text-xs">Departemen</span><p>{payslipModal.department}</p></div>
                <div><span className="text-muted-foreground text-xs">Jabatan</span><p>{payslipModal.position}</p></div>
              </div>
              {/* Income & Deductions */}
              <div className="grid grid-cols-2 divide-x">
                <div className="p-4">
                  <p className="text-xs font-semibold text-green-700 mb-2 uppercase tracking-wide">Penghasilan</p>
                  <div className="space-y-1.5">
                    {(payslipModal.income_items || []).map(item => (
                      <div key={item.label} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-1.5 flex justify-between text-sm font-bold">
                      <span>Total Penghasilan</span>
                      <span className="text-green-600">{formatCurrency(payslipModal.total_income)}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold text-red-700 mb-2 uppercase tracking-wide">Potongan</p>
                  <div className="space-y-1.5">
                    {(payslipModal.deduction_items || []).map(item => (
                      <div key={item.label} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-1.5 flex justify-between text-sm font-bold">
                      <span>Total Potongan</span>
                      <span className="text-red-600">{formatCurrency(payslipModal.total_deduction)}</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Net */}
              <div className="bg-primary/5 p-4 border-t flex justify-between items-center">
                <span className="font-bold text-lg">GAJI BERSIH</span>
                <span className="font-bold text-2xl text-primary">{formatCurrency(payslipModal.net_salary)}</span>
              </div>
              {/* Footer */}
              <div className="px-4 pb-4 pt-2 text-xs text-muted-foreground flex justify-between">
                <span>Dibayarkan: {payslipModal.paid_date} via {payslipModal.bank_name} {payslipModal.account_no}</span>
                <span>Status: <Badge variant="success">Lunas</Badge></span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPayslipModal(null)}>Tutup</Button>
              <Button onClick={() => window.print()} icon={<Printer className="w-4 h-4" />}>Print / PDF</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Karyawan Create/Edit */}
      <Modal open={(activeTab === 'employee') && (showModal || !!editRow)} onClose={() => { setShowModal(false); setEditRow(null) }} title={editRow ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
        footer={<><Button variant="secondary" onClick={() => { setShowModal(false); setEditRow(null) }}>Batal</Button><Button loading={creating || updating} onClick={() => { const payload = { ...form, salary: parseInt(form.salary) || 0 }; editRow ? updateEmp(payload) : createEmp(payload) }}>Simpan</Button></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="ID Karyawan" placeholder="EMP-007" value={form.emp_number} onChange={e => setForm({ ...form, emp_number: e.target.value })} disabled={!!editRow} />
            <Input label="Nama Lengkap" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Departemen" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} options={deptOptions.filter(d => d.value !== 'Semua')} placeholder="Pilih departemen..." />
            <Input label="Jabatan" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Gaji Pokok" type="number" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} />
            {editRow ? <Select label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} options={[{ value: 'active', label: 'Aktif' }, { value: 'leave', label: 'Cuti' }, { value: 'inactive', label: 'Tidak Aktif' }]} /> : <Input label="Tanggal Bergabung" type="date" value={form.join_date} onChange={e => setForm({ ...form, join_date: e.target.value })} />}
          </div>
        </div>
      </Modal>

      {/* Cuti */}
      <Modal open={activeTab === 'leave' && showModal} onClose={() => setShowModal(false)} title="Ajukan Cuti / Izin"
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button><Button loading={savingLeave} onClick={() => createLeave(leaveForm)}>Kirim</Button></>}
      >
        <div className="space-y-4">
          <Input label="ID Karyawan" placeholder="Masukkan ID karyawan" value={leaveForm.employee_id} onChange={e => setLeaveForm({ ...leaveForm, employee_id: e.target.value })} />
          <Select label="Jenis Cuti / Izin" value={leaveForm.type} onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value })} options={leaveTypes} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tanggal Mulai" type="date" value={leaveForm.start_date} onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })} />
            <Input label="Tanggal Selesai" type="date" value={leaveForm.end_date} onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })} />
          </div>
          <Input label="Alasan" placeholder="Jelaskan alasan pengajuan..." value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
        </div>
      </Modal>

      {/* Lowongan */}
      <Modal open={activeTab === 'recruitment' && showModal && !stageTarget} onClose={() => setShowModal(false)} title="Buat Lowongan Pekerjaan"
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button><Button loading={savingJob} onClick={() => createJob(jobForm)}>Simpan</Button></>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Posisi / Jabatan" value={jobForm.title} onChange={e => setJobForm({ ...jobForm, title: e.target.value })} />
            <Select label="Departemen" value={jobForm.department} onChange={e => setJobForm({ ...jobForm, department: e.target.value })} options={deptOptions.filter(d => d.value !== 'Semua')} placeholder="Pilih departemen..." />
          </div>
          <Input label="Deskripsi Pekerjaan" value={jobForm.description} onChange={e => setJobForm({ ...jobForm, description: e.target.value })} />
          <Input label="Kualifikasi / Requirements" value={jobForm.requirements} onChange={e => setJobForm({ ...jobForm, requirements: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tanggal Buka" type="date" value={jobForm.open_date} onChange={e => setJobForm({ ...jobForm, open_date: e.target.value })} />
            <Input label="Tanggal Tutup" type="date" value={jobForm.close_date} onChange={e => setJobForm({ ...jobForm, close_date: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Kandidat */}
      <Modal open={activeTab === 'recruitment' && showModal && !candidateRef} onClose={() => setShowModal(false)} title="Tambah Kandidat"
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button><Button loading={savingCandidate} onClick={() => createCandidate(candidateForm)}>Simpan</Button></>}
      >
        <div className="space-y-4">
          <Select label="Posisi Dilamar" value={candidateForm.job_id} onChange={e => setCandidateForm({ ...candidateForm, job_id: e.target.value })} options={jobOptions} placeholder="Pilih posisi..." />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nama Kandidat" value={candidateForm.name} onChange={e => setCandidateForm({ ...candidateForm, name: e.target.value })} />
            <Input label="Email" type="email" value={candidateForm.email} onChange={e => setCandidateForm({ ...candidateForm, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Telepon" value={candidateForm.phone} onChange={e => setCandidateForm({ ...candidateForm, phone: e.target.value })} />
            <Input label="Tanggal Melamar" type="date" value={candidateForm.applied_date} onChange={e => setCandidateForm({ ...candidateForm, applied_date: e.target.value })} />
          </div>
          <Input label="Catatan" value={candidateForm.notes} onChange={e => setCandidateForm({ ...candidateForm, notes: e.target.value })} />
        </div>
      </Modal>

      {/* Update Tahap Kandidat */}
      <Modal open={!!stageTarget} onClose={() => setStageTarget(null)} title={`Update Tahap — ${stageTarget?.name}`}
        footer={<><Button variant="secondary" onClick={() => setStageTarget(null)}>Batal</Button><Button onClick={handleUpdateStage}>Update</Button></>}
      >
        <div className="space-y-4">
          <Select label="Tahap Rekrutmen" value={stageForm.stage} onChange={e => setStageForm({ ...stageForm, stage: e.target.value })} options={candidateStages} />
          <Input label="Catatan" placeholder="Catatan hasil interview, dll..." value={stageForm.notes} onChange={e => setStageForm({ ...stageForm, notes: e.target.value })} />
        </div>
      </Modal>

      {/* Program Training */}
      <Modal open={activeTab === 'training' && showModal} onClose={() => setShowModal(false)} title="Tambah Program Training"
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button><Button loading={savingProgram || savingSchedule} onClick={() => createTrainingProgram({ ...trainingProgramForm, duration_hours: parseInt(trainingProgramForm.duration_hours) || 8 })}>Simpan</Button></>}
      >
        <div className="space-y-4">
          <Input label="Nama Program" value={trainingProgramForm.title} onChange={e => setTrainingProgramForm({ ...trainingProgramForm, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Kategori" placeholder="Safety, Produksi, IT..." value={trainingProgramForm.category} onChange={e => setTrainingProgramForm({ ...trainingProgramForm, category: e.target.value })} />
            <Input label="Trainer / Fasilitator" value={trainingProgramForm.trainer} onChange={e => setTrainingProgramForm({ ...trainingProgramForm, trainer: e.target.value })} />
          </div>
          <Input label="Durasi (Jam)" type="number" value={trainingProgramForm.duration_hours} onChange={e => setTrainingProgramForm({ ...trainingProgramForm, duration_hours: e.target.value })} />
          <Input label="Deskripsi" value={trainingProgramForm.description} onChange={e => setTrainingProgramForm({ ...trainingProgramForm, description: e.target.value })} />
        </div>
      </Modal>

      {/* Template KPI */}
      <Modal open={activeTab === 'kpi' && showModal} onClose={() => setShowModal(false)} title="Buat Template KPI"
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button><Button loading={savingKPITemplate || savingKPIReview} onClick={() => createKPITemplate(kpiTemplateForm)}>Simpan</Button></>}
      >
        <div className="space-y-4">
          <Input label="Nama Template" placeholder="KPI Operator Produksi..." value={kpiTemplateForm.title} onChange={e => setKpiTemplateForm({ ...kpiTemplateForm, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Departemen" value={kpiTemplateForm.department} onChange={e => setKpiTemplateForm({ ...kpiTemplateForm, department: e.target.value })} options={deptOptions} placeholder="Pilih departemen..." />
            <Select label="Periode Penilaian" value={kpiTemplateForm.period} onChange={e => setKpiTemplateForm({ ...kpiTemplateForm, period: e.target.value })} options={kpiPeriods} />
          </div>
          <Input label="Deskripsi Indikator" placeholder="Produktivitas, kualitas, kedisiplinan..." value={kpiTemplateForm.description} onChange={e => setKpiTemplateForm({ ...kpiTemplateForm, description: e.target.value })} />
        </div>
      </Modal>

      {/* Shift */}
      <Modal open={activeTab === 'overtime' && showModal} onClose={() => setShowModal(false)} title="Tambah Shift"
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button><Button loading={savingShift || savingOvertime} onClick={() => createShift(shiftForm)}>Simpan</Button></>}
      >
        <div className="space-y-4">
          <Input label="Nama Shift" placeholder="Shift Pagi..." value={shiftForm.name} onChange={e => setShiftForm({ ...shiftForm, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Jam Mulai" type="time" value={shiftForm.start_time} onChange={e => setShiftForm({ ...shiftForm, start_time: e.target.value })} />
            <Input label="Jam Selesai" type="time" value={shiftForm.end_time} onChange={e => setShiftForm({ ...shiftForm, end_time: e.target.value })} />
          </div>
          <Select label="Tipe Shift" value={shiftForm.type} onChange={e => setShiftForm({ ...shiftForm, type: e.target.value })} options={shiftTypes} />
        </div>
      </Modal>

      {/* Delete Karyawan */}
      <Modal open={!!deleteRow} onClose={() => setDeleteRow(null)} title="Konfirmasi Hapus"
        footer={<><Button variant="secondary" onClick={() => setDeleteRow(null)}>Batal</Button><Button variant="danger" onClick={handleDelete}>Hapus</Button></>}
      >
        <p className="text-sm text-gray-600">Hapus karyawan <strong>{deleteRow?.name}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
      </Modal>
    </div>
  )
}
