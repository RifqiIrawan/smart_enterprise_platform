import { useRef, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import StatCard from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DataTable from '@/components/ui/DataTable'
import { Shield, UserCheck, AlertTriangle, Camera, Plus, DoorOpen, LogOut } from 'lucide-react'
import { securityApi } from '@/api'
import { useApi, useSubmit } from '@/hooks/useApi'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

const accessDoors = [
  { id: 'DOOR-001', name: 'Main Gate', location: 'Entrance', status: 'open', lastEvent: 'Ahmad Fauzi - IN', time: '09:00' },
  { id: 'DOOR-002', name: 'Plant A', location: 'Production', status: 'locked', lastEvent: 'Budi Santoso - IN', time: '08:15' },
  { id: 'DOOR-003', name: 'Server Room', location: 'IT Dept', status: 'locked', lastEvent: 'Andi Wijaya - IN', time: '08:30' },
  { id: 'DOOR-004', name: 'Warehouse Gate', location: 'Warehouse', status: 'open', lastEvent: 'Staff WH - IN', time: '08:00' },
  { id: 'DOOR-005', name: 'Gate B', location: 'Rear', status: 'locked', lastEvent: 'ALARM - Akses Gagal', time: '14:23' },
  { id: 'DOOR-006', name: 'Executive Floor', location: '5th Floor', status: 'locked', lastEvent: 'Dir. Utama - IN', time: '09:45' },
]

const severityBadge = (s) => ({
  high: <Badge variant="danger">High</Badge>,
  medium: <Badge variant="warning">Medium</Badge>,
  low: <Badge variant="info">Low</Badge>,
})[s]

const incidentStatusBadge = (s) => ({
  open: <Badge variant="danger">Open</Badge>,
  investigating: <Badge variant="warning">Investigasi</Badge>,
  resolved: <Badge variant="success">Selesai</Badge>,
  closed: <Badge variant="default">Closed</Badge>,
})[s] || <Badge>{s}</Badge>

const emptyVisitor = { name: '', company: '', purpose: '', host: '', badge: '' }
const emptyIncident = { incident_number: '', title: '', category: '', severity: 'medium', location: '', reported_by: '' }

const visitorColumns = [
  { key: 'badge', label: 'Badge', render: (v) => <span className="font-mono text-xs text-blue-600 font-semibold">{v}</span> },
  { key: 'name', label: 'Nama', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
  { key: 'company', label: 'Perusahaan', sortable: true },
  { key: 'purpose', label: 'Keperluan', tdClassName: 'text-xs text-gray-500' },
  { key: 'host', label: 'Host' },
  {
    key: 'status', label: 'Status', sortable: true, render: (v) =>
      v === 'active' ? <Badge variant="success" dot>Di Dalam</Badge> : <Badge variant="default">Sudah Keluar</Badge>
  },
]

const incidentColumns = [
  { key: 'incident_number', label: 'No. Insiden', sortable: true, render: (v) => <span className="font-mono text-xs text-red-600 font-semibold">{v}</span> },
  { key: 'title', label: 'Judul', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
  { key: 'category', label: 'Kategori', sortable: true },
  { key: 'severity', label: 'Severity', sortable: true, render: (v) => severityBadge(v) },
  { key: 'location', label: 'Lokasi' },
  { key: 'status', label: 'Status', sortable: true, render: (v) => incidentStatusBadge(v) },
]

const VALID_TABS = ['visitor', 'incident', 'access']
const SECTION_TITLE = { visitor: 'Tamu', incident: 'Insiden', access: 'Akses Pintu' }

export default function SmartSecurity() {
  const { tab } = useParams()
  const navigate = useNavigate()
  const activeTab = VALID_TABS.includes(tab) ? tab : 'visitor'
  useEffect(() => {
    if (!VALID_TABS.includes(tab)) navigate('/security/visitor', { replace: true })
  }, [tab])
  const { canDo } = useAuthStore()
  const canAddVisitor = canDo('security.visitor', 'add')
  const canEditVisitor = canDo('security.visitor', 'edit')
  const canAddIncident = canDo('security.incident', 'add')
  const [showModal, setShowModal] = useState(false)
  const [visitorForm, setVisitorForm] = useState(emptyVisitor)
  const [incidentForm, setIncidentForm] = useState(emptyIncident)
  const visitorRef = useRef(null)
  const incidentRef = useRef(null)

  const { data: statsRaw } = useApi(securityApi.getVisitors)
  const stats = Array.isArray(statsRaw?.value) ? statsRaw.value : []

  const { submit: submitVisitor, loading: savingVisitor } = useSubmit(securityApi.checkIn, {
    successMsg: 'Tamu berhasil check-in',
    onSuccess: () => { setShowModal(false); setVisitorForm(emptyVisitor); visitorRef.current?.refetch() },
  })
  const { submit: submitIncident, loading: savingIncident } = useSubmit(securityApi.createIncident, {
    successMsg: 'Insiden berhasil dilaporkan',
    onSuccess: () => { setShowModal(false); setIncidentForm(emptyIncident); incidentRef.current?.refetch() },
  })

  const handleCheckOut = async (id) => {
    try { await securityApi.checkOut(id); toast.success('Tamu check-out'); visitorRef.current?.refetch() }
    catch { toast.error('Gagal check-out') }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-semibold text-slate-800">{SECTION_TITLE[activeTab]}</h1>
        {activeTab === 'visitor' && canAddVisitor && (
          <Button size="sm" icon={<Plus />} onClick={() => setShowModal(true)}>Check-in Tamu</Button>
        )}
        {activeTab === 'incident' && canAddIncident && (
          <Button size="sm" icon={<Plus />} onClick={() => setShowModal(true)}>Laporkan Insiden</Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Tamu Aktif" value={String(stats.filter(v => v.status === 'active').length)} icon={UserCheck} color="blue" />
        <StatCard title="Total Tamu Hari Ini" value={String(statsRaw?.['@odata.count'] ?? stats.length)} icon={Shield} color="emerald" />
        <StatCard title="Insiden Bulan Ini" value="4" icon={AlertTriangle} color="amber" />
        <StatCard title="Kamera Aktif" value="12/16" icon={Camera} color="purple" />
      </div>

      {activeTab === 'visitor' && (
        <Card>
          <CardHeader><CardTitle>Daftar Tamu</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              ref={visitorRef}
              columns={visitorColumns}
              fetchFn={securityApi.getVisitors}
              searchPlaceholder="Cari nama tamu, perusahaan..."
              defaultPageSize={10}
              toolbar={canAddVisitor && <Button size="sm" icon={<Plus />} onClick={() => setShowModal(true)}>Check-in Tamu</Button>}
              actions={(row) => canEditVisitor && row.status === 'active' && (
                <button onClick={() => handleCheckOut(row.id)}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-gray-600 hover:bg-gray-100 transition-colors font-medium">
                  <LogOut className="w-3.5 h-3.5" /> Check-out
                </button>
              )}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'incident' && (
        <Card>
          <CardHeader><CardTitle>Laporan Insiden</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              ref={incidentRef}
              columns={incidentColumns}
              fetchFn={securityApi.getIncidents}
              searchPlaceholder="Cari insiden, kategori, lokasi..."
              defaultPageSize={10}
              toolbar={canAddIncident && <Button size="sm" icon={<Plus />} onClick={() => setShowModal(true)}>Laporkan Insiden</Button>}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'access' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accessDoors.map((d) => (
            <Card key={d.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{d.name}</p>
                    <p className="text-xs text-gray-500">{d.location}</p>
                  </div>
                  {d.status === 'open'
                    ? <Badge variant="success" dot>Open</Badge>
                    : <Badge variant="default" dot>Locked</Badge>}
                </div>
                <div className="p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400">Last Event</p>
                  <p className="text-xs font-medium text-gray-700 mt-0.5">{d.lastEvent}</p>
                  <p className="text-xs text-gray-400">{d.time}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'visitor' && (
        <Modal open={showModal} onClose={() => { setShowModal(false); setVisitorForm(emptyVisitor) }} title="Check-in Tamu Baru"
          footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button><Button loading={savingVisitor} onClick={() => submitVisitor(visitorForm)}>Check-in</Button></>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nama Tamu" value={visitorForm.name} onChange={e => setVisitorForm({ ...visitorForm, name: e.target.value })} />
              <Input label="Perusahaan" value={visitorForm.company} onChange={e => setVisitorForm({ ...visitorForm, company: e.target.value })} />
            </div>
            <Input label="Keperluan" value={visitorForm.purpose} onChange={e => setVisitorForm({ ...visitorForm, purpose: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Menemui (Host)" value={visitorForm.host} onChange={e => setVisitorForm({ ...visitorForm, host: e.target.value })} />
              <Input label="No. Badge" placeholder="V-001" value={visitorForm.badge} onChange={e => setVisitorForm({ ...visitorForm, badge: e.target.value })} />
            </div>
          </div>
        </Modal>
      )}
      {activeTab === 'incident' && (
        <Modal open={showModal} onClose={() => { setShowModal(false); setIncidentForm(emptyIncident) }} title="Laporkan Insiden"
          footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button><Button loading={savingIncident} onClick={() => submitIncident(incidentForm)}>Kirim Laporan</Button></>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="No. Insiden" placeholder="INC-005" value={incidentForm.incident_number} onChange={e => setIncidentForm({ ...incidentForm, incident_number: e.target.value })} />
              <Select label="Kategori" value={incidentForm.category} onChange={e => setIncidentForm({ ...incidentForm, category: e.target.value })}
                options={['Keamanan', 'K3', 'Fasilitas', 'IT', 'Lainnya'].map(c => ({ value: c, label: c }))} placeholder="Pilih kategori..." />
            </div>
            <Input label="Judul Insiden" value={incidentForm.title} onChange={e => setIncidentForm({ ...incidentForm, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Tingkat Keparahan" value={incidentForm.severity} onChange={e => setIncidentForm({ ...incidentForm, severity: e.target.value })}
                options={[{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]} />
              <Input label="Lokasi Kejadian" value={incidentForm.location} onChange={e => setIncidentForm({ ...incidentForm, location: e.target.value })} />
            </div>
            <Input label="Dilaporkan Oleh" value={incidentForm.reported_by} onChange={e => setIncidentForm({ ...incidentForm, reported_by: e.target.value })} />
          </div>
        </Modal>
      )}
    </div>
  )
}
