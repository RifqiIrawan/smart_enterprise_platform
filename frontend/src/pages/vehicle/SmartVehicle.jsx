import { useRef, useState } from 'react'
import StatCard from '@/components/ui/StatCard'
import Tabs from '@/components/ui/Tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import DataTable from '@/components/ui/DataTable'
import { Truck, MapPin, Fuel, Wrench, Plus } from 'lucide-react'
import { vehicleApi } from '@/api'
import { useApi, useSubmit } from '@/hooks/useApi'
import { formatCurrency } from '@/utils/format'

const statusBadge = (s) => ({
  available: <Badge variant="success" dot>Tersedia</Badge>,
  on_trip: <Badge variant="info" dot>Dalam Perjalanan</Badge>,
  maintenance: <Badge variant="warning" dot>Maintenance</Badge>,
})[s] || <Badge>{s}</Badge>

const emptyFuelLog = { vehicle_plate: '', liters: '', price_per_liter: '', odometer: '', station: '', filled_by: '', date: '' }

const fleetColumns = [
  { key: 'plate', label: 'Plat Nomor', sortable: true, render: (v) => <span className="font-mono text-sm font-bold text-gray-900">{v}</span> },
  { key: 'name', label: 'Kendaraan', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
  { key: 'type', label: 'Tipe', sortable: true },
  { key: 'driver', label: 'Pengemudi', render: (v) => v || <span className="text-gray-400 text-xs">—</span> },
  {
    key: 'fuel_pct', label: 'BBM', sortable: true, render: (v) => (
      <div className="flex items-center gap-2 min-w-[80px]">
        <div className="w-14 bg-gray-100 rounded-full h-1.5">
          <div className={`h-1.5 rounded-full ${v < 30 ? 'bg-red-500' : v < 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${v}%` }} />
        </div>
        <span className="text-xs text-gray-600">{v}%</span>
      </div>
    )
  },
  { key: 'odometer', label: 'Odometer', sortable: true, render: (v) => <span className="text-xs">{v?.toLocaleString('id-ID')} km</span> },
  { key: 'status', label: 'Status', sortable: true, render: (v) => statusBadge(v) },
]

const fuelColumns = [
  { key: 'vehicle_plate', label: 'Plat Nomor', sortable: true, render: (v) => <span className="font-mono text-sm font-bold">{v}</span> },
  { key: 'vehicle_name', label: 'Kendaraan', sortable: true },
  { key: 'liters', label: 'Liter', sortable: true, render: (v) => `${v} L` },
  { key: 'price_per_liter', label: 'Harga/L', render: (v) => formatCurrency(v) },
  { key: 'total_cost', label: 'Total', sortable: true, render: (v) => <span className="font-semibold">{formatCurrency(v)}</span> },
  { key: 'station', label: 'SPBU', tdClassName: 'text-xs text-gray-500' },
  { key: 'filled_by', label: 'Petugas' },
  { key: 'date', label: 'Tanggal', sortable: true },
]

export default function SmartVehicle() {
  const [activeTab, setActiveTab] = useState('fleet')
  const [showModal, setShowModal] = useState(false)
  const [fuelForm, setFuelForm] = useState(emptyFuelLog)
  const fuelRef = useRef(null)

  const { data: statsRaw } = useApi(vehicleApi.getFleet)
  const stats = Array.isArray(statsRaw?.value) ? statsRaw.value : []

  const { submit: submitFuel, loading: savingFuel } = useSubmit(vehicleApi.createFuelLog, {
    successMsg: 'Log BBM berhasil dicatat',
    onSuccess: () => { setShowModal(false); setFuelForm(emptyFuelLog); fuelRef.current?.refetch() },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {[{ id: 'fleet', label: 'Armada' }, { id: 'fuel', label: 'Log BBM' }].map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {activeTab === 'fuel' && (
          <Button size="sm" icon={<Plus />} onClick={() => setShowModal(true)}>Catat BBM</Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Armada" value={String(statsRaw?.['@odata.count'] ?? stats.length)} icon={Truck} color="blue" />
        <StatCard title="Dalam Perjalanan" value={String(stats.filter(v => v.status === 'on_trip').length)} icon={MapPin} color="emerald" />
        <StatCard title="Tersedia" value={String(stats.filter(v => v.status === 'available').length)} icon={Fuel} color="amber" />
        <StatCard title="Maintenance" value={String(stats.filter(v => v.status === 'maintenance').length)} icon={Wrench} color="red" />
      </div>

      {activeTab === 'fleet' && (
        <Card>
          <CardHeader><CardTitle>Daftar Armada Kendaraan</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              columns={fleetColumns}
              fetchFn={vehicleApi.getFleet}
              searchPlaceholder="Cari plat nomor, kendaraan, pengemudi..."
              defaultPageSize={10}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'fuel' && (
        <Card>
          <CardHeader><CardTitle>Log Pengisian BBM</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              ref={fuelRef}
              columns={fuelColumns}
              fetchFn={vehicleApi.getFuelLogs}
              searchPlaceholder="Cari kendaraan, SPBU, petugas..."
              defaultPageSize={10}
              toolbar={<Button size="sm" icon={<Plus />} onClick={() => setShowModal(true)}>Catat BBM</Button>}
            />
          </CardContent>
        </Card>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setFuelForm(emptyFuelLog) }} title="Catat Pengisian BBM"
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button><Button loading={savingFuel} onClick={() => submitFuel({ ...fuelForm, liters: parseFloat(fuelForm.liters) || 0, price_per_liter: parseInt(fuelForm.price_per_liter) || 0, odometer: parseInt(fuelForm.odometer) || 0 })}>Simpan</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Plat Nomor" placeholder="B 1234 SEP" value={fuelForm.vehicle_plate} onChange={e => setFuelForm({ ...fuelForm, vehicle_plate: e.target.value })} />
            <Input label="Nama Pengisi" value={fuelForm.filled_by} onChange={e => setFuelForm({ ...fuelForm, filled_by: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Volume (Liter)" type="number" value={fuelForm.liters} onChange={e => setFuelForm({ ...fuelForm, liters: e.target.value })} />
            <Input label="Harga/Liter (Rp)" type="number" value={fuelForm.price_per_liter} onChange={e => setFuelForm({ ...fuelForm, price_per_liter: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Odometer (km)" type="number" value={fuelForm.odometer} onChange={e => setFuelForm({ ...fuelForm, odometer: e.target.value })} />
            <Input label="Tanggal" type="date" value={fuelForm.date} onChange={e => setFuelForm({ ...fuelForm, date: e.target.value })} />
          </div>
          <Input label="Nama SPBU" value={fuelForm.station} onChange={e => setFuelForm({ ...fuelForm, station: e.target.value })} />
        </div>
      </Modal>
    </div>
  )
}
