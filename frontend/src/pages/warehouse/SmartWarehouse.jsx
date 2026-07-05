import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import StatCard from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DataTable from '@/components/ui/DataTable'
import { Warehouse, Package, ArrowDownLeft, ArrowUpRight, AlertTriangle, Plus, Pencil, Trash2, MoveRight, ClipboardList, CheckSquare } from 'lucide-react'
import { warehouseApi } from '@/api'
import { useApi, useSubmit } from '@/hooks/useApi'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

const statusBadge = (s) => ({
  ok: <Badge variant="success">Normal</Badge>,
  low: <Badge variant="warning">Low Stock</Badge>,
  out: <Badge variant="danger">Habis</Badge>,
  checked: <Badge variant="success">Selesai</Badge>,
  pending: <Badge variant="warning">Belum</Badge>,
})[s] || <Badge>{s}</Badge>

const emptyItem = { sku: '', name: '', category: '', location: '', qty: '', unit: 'pcs', min_stock: '' }
const emptyMove = { type: 'in', item_name: '', qty: '', unit: 'pcs', reference: '', notes: '' }
const emptyTransfer = { inventory_id: '', from_location: '', to_location: '', qty: '', notes: '' }

const inventoryColumns = [
  { key: 'sku', label: 'SKU', sortable: true, render: (v) => <span className="font-mono text-xs text-blue-600 font-semibold">{v}</span> },
  { key: 'name', label: 'Nama Item', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
  { key: 'category', label: 'Kategori', sortable: true },
  { key: 'location', label: 'Lokasi' },
  {
    key: 'qty', label: 'Qty', sortable: true, render: (v, row) => (
      <span className="font-semibold">{v} <span className="text-xs text-gray-400 font-normal">{row.unit}</span></span>
    )
  },
  { key: 'min_stock', label: 'Min. Stok' },
  { key: 'status', label: 'Status', render: (v) => statusBadge(v) },
]

const movementColumns = [
  {
    key: 'type', label: 'Tipe', render: (v) => ({
      in: <Badge variant="success">Masuk</Badge>,
      out: <Badge variant="danger">Keluar</Badge>,
      transfer: <Badge variant="info">Transfer</Badge>,
      adjustment: <Badge variant="warning">Opname</Badge>,
    })[v] || <Badge>{v}</Badge>
  },
  { key: 'item_name', label: 'Item', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
  { key: 'qty', label: 'Qty', sortable: true },
  { key: 'reference', label: 'Referensi', render: (v) => v ? <span className="font-mono text-xs text-blue-600">{v}</span> : '—' },
  { key: 'notes', label: 'Keterangan', tdClassName: 'text-gray-500 text-xs' },
]

const alertColumns = [
  { key: 'sku', label: 'SKU', render: (v) => <span className="font-mono text-xs text-blue-600 font-semibold">{v}</span> },
  { key: 'name', label: 'Nama Item', render: (v) => <span className="font-medium">{v}</span> },
  { key: 'location', label: 'Lokasi' },
  {
    key: 'qty', label: 'Qty Saat Ini', render: (v, row) => (
      <span className="font-semibold text-red-600">{v} <span className="text-xs font-normal">{row.unit}</span></span>
    )
  },
  { key: 'min_stock', label: 'Min. Stok' },
  { key: 'status', label: 'Status', render: (v) => statusBadge(v) },
]

const opnameColumns = [
  { key: 'sku', label: 'SKU', render: (v) => <span className="font-mono text-xs text-blue-600 font-semibold">{v}</span> },
  { key: 'name', label: 'Nama Item', sortable: true, render: (v) => <span className="font-medium">{v}</span> },
  { key: 'location', label: 'Lokasi' },
  { key: 'system_qty', label: 'Qty Sistem', render: (v, row) => `${v} ${row.unit}` },
  { key: 'physical_qty', label: 'Qty Fisik', render: (v, row) => `${v} ${row.unit}` },
  {
    key: 'difference', label: 'Selisih',
    render: (v) => (
      <span className={v !== 0 ? 'font-semibold text-amber-600' : 'text-gray-400'}>
        {v >= 0 ? '+' : ''}{v}
      </span>
    )
  },
  { key: 'status', label: 'Status', render: (v) => statusBadge(v) },
]

const VALID_WAREHOUSE_TABS = ['inventory', 'movements', 'alerts', 'opname']

export default function SmartWarehouse() {
  const { tab } = useParams()
  const navigate = useNavigate()
  const activeTab = VALID_WAREHOUSE_TABS.includes(tab) ? tab : 'inventory'
  useEffect(() => {
    if (!VALID_WAREHOUSE_TABS.includes(tab)) navigate('/warehouse/inventory', { replace: true })
  }, [tab])
  const { canDo } = useAuthStore()
  const menuKey = `warehouse.${activeTab}`
  const canAdd = canDo(menuKey, 'add')
  const canEdit = canDo(menuKey, 'edit')
  const canDelete = canDo(menuKey, 'delete')
  const [showItemModal, setShowItemModal] = useState(false)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showOpnameModal, setShowOpnameModal] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [deleteRow, setDeleteRow] = useState(null)
  const [itemForm, setItemForm] = useState(emptyItem)
  const [moveForm, setMoveForm] = useState(emptyMove)
  const [transferForm, setTransferForm] = useState(emptyTransfer)
  const [opnameItems, setOpnameItems] = useState([])
  const invRef = useRef(null)
  const moveRef = useRef(null)

  const { data: statsRaw } = useApi(warehouseApi.getInventory)
  const { data: alertsData } = useApi(warehouseApi.getAlerts)
  const { data: opnameData, refetch: refetchOpname } = useApi(warehouseApi.getOpname)
  const stats = Array.isArray(statsRaw?.value) ? statsRaw.value : []
  const alerts = Array.isArray(alertsData?.data) ? alertsData.data : []
  const opnameList = Array.isArray(opnameData?.data) ? opnameData.data : []

  const alertsFetchFn = useCallback(async (params = {}) => {
    let filtered = [...alerts]
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
  }, [alerts])

  const opnameFetchFn = useCallback(async (params = {}) => {
    let filtered = [...opnameList]
    const search = params['$search']?.toLowerCase()
    if (search) filtered = filtered.filter(row => Object.values(row).some(v => String(v ?? '').toLowerCase().includes(search)))
    const top = params['$top'] ?? 10, skip = params['$skip'] ?? 0
    return { '@odata.count': filtered.length, value: filtered.slice(skip, skip + top) }
  }, [opnameList])

  const { submit: submitItem, loading: savingItem } = useSubmit(warehouseApi.createInventory, {
    successMsg: 'Item berhasil ditambahkan',
    onSuccess: () => { setShowItemModal(false); setItemForm(emptyItem); invRef.current?.refetch() },
  })

  const { submit: updateItem, loading: updatingItem } = useSubmit(
    (data) => warehouseApi.updateInventory(editRow?.id, data),
    {
      successMsg: 'Item berhasil diperbarui',
      onSuccess: () => { setEditRow(null); invRef.current?.refetch() },
    }
  )

  const { submit: submitMove, loading: savingMove } = useSubmit(warehouseApi.createMovement, {
    successMsg: 'Mutasi berhasil dicatat',
    onSuccess: () => { setShowMoveModal(false); setMoveForm(emptyMove); moveRef.current?.refetch(); invRef.current?.refetch() },
  })

  const { submit: submitTransfer, loading: savingTransfer } = useSubmit(warehouseApi.createTransfer, {
    successMsg: 'Transfer stok berhasil',
    onSuccess: () => { setShowTransferModal(false); setTransferForm(emptyTransfer); invRef.current?.refetch(); moveRef.current?.refetch() },
  })

  const { submit: submitOpname, loading: savingOpname } = useSubmit(warehouseApi.submitOpname, {
    successMsg: 'Stock opname berhasil disimpan',
    onSuccess: () => { setShowOpnameModal(false); refetchOpname(); invRef.current?.refetch() },
  })

  const handleDelete = async () => {
    try {
      await warehouseApi.deleteInventory(deleteRow.id)
      toast.success('Item berhasil dihapus')
      setDeleteRow(null)
      invRef.current?.refetch()
    } catch {
      toast.error('Gagal menghapus item')
    }
  }

  const openEdit = (row) => {
    setEditRow(row)
    setItemForm({ sku: row.sku, name: row.name, category: row.category || '', location: row.location, qty: String(row.qty), unit: row.unit, min_stock: String(row.min_stock) })
  }

  const openOpname = () => {
    setOpnameItems(opnameList.map(i => ({ ...i, physical_qty: i.system_qty, notes: '' })))
    setShowOpnameModal(true)
  }

  const lowCount = stats.filter(i => i.status === 'low').length
  const outCount = stats.filter(i => i.status === 'out').length

  const sectionTitle = {
    inventory: 'Inventori', movements: 'Mutasi', alerts: 'Reorder Alert', opname: 'Stock Opname',
  }[activeTab]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-semibold text-slate-800">{sectionTitle}</h1>
        <div className="flex gap-2">
          {activeTab === 'inventory' && (
            <>
              {canEdit && <Button variant="secondary" size="sm" icon={<MoveRight />} onClick={() => setShowTransferModal(true)}>Transfer</Button>}
              {canAdd && <Button size="sm" icon={<Plus />} onClick={() => { setEditRow(null); setItemForm(emptyItem); setShowItemModal(true) }}>Tambah Item</Button>}
            </>
          )}
          {canAdd && activeTab === 'movements' && (
            <Button size="sm" icon={<Plus />} onClick={() => setShowMoveModal(true)}>Catat Mutasi</Button>
          )}
          {canAdd && activeTab === 'opname' && (
            <Button size="sm" icon={<ClipboardList />} onClick={openOpname}>Mulai Opname</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Item" value={String(statsRaw?.['@odata.count'] ?? stats.length)} icon={Package} color="blue" />
        <StatCard title="Low Stock" value={String(lowCount)} subtitle="perlu reorder" icon={Warehouse} color="amber" />
        <StatCard title="Stok Habis" value={String(outCount)} subtitle="butuh segera" icon={ArrowUpRight} color="red" />
        <StatCard title="Normal" value={String(stats.filter(i => i.status === 'ok').length)} icon={ArrowDownLeft} color="emerald" />
      </div>

      {activeTab === 'inventory' && (
        <Card>
          <CardHeader><CardTitle>Daftar Inventori</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              ref={invRef}
              columns={inventoryColumns}
              fetchFn={warehouseApi.getInventory}
              searchPlaceholder="Cari item, SKU, lokasi..."
              defaultPageSize={10}
              toolbar={canAdd && <Button size="sm" icon={<Plus />} onClick={() => { setEditRow(null); setItemForm(emptyItem); setShowItemModal(true) }}>Tambah Item</Button>}
              actions={(row) => (
                <div className="flex gap-1">
                  {canEdit && (
                    <button onClick={() => openEdit(row)}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-blue-600 hover:bg-blue-50 transition-colors font-medium">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => setDeleteRow(row)}
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

      {activeTab === 'movements' && (
        <Card>
          <CardHeader><CardTitle>Riwayat Mutasi Stok</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              ref={moveRef}
              columns={movementColumns}
              fetchFn={warehouseApi.getMovements}
              searchPlaceholder="Cari item, referensi..."
              defaultPageSize={10}
              toolbar={canAdd && <Button size="sm" icon={<Plus />} onClick={() => setShowMoveModal(true)}>Catat Mutasi</Button>}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'alerts' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Reorder Alert — Stok Di Bawah Minimum
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              fetchFn={alertsFetchFn}
              columns={alertColumns}
              searchPlaceholder="Cari SKU, item..."
              actions={(row) => canDo('warehouse.movements', 'add') && (
                <Button size="sm" variant="secondary" onClick={() => { setShowMoveModal(true); setMoveForm({ ...emptyMove, type: 'in', item_name: row.name }) }}>
                  + Restock
                </Button>
              )}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'opname' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Stock Opname</CardTitle>
              {canAdd && <Button size="sm" icon={<ClipboardList />} onClick={openOpname}>Mulai Opname</Button>}
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              fetchFn={opnameFetchFn}
              columns={opnameColumns}
              searchPlaceholder="Cari SKU, nama item, lokasi..."
            />
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Item Modal */}
      <Modal
        open={showItemModal || !!editRow}
        onClose={() => { setShowItemModal(false); setEditRow(null); setItemForm(emptyItem) }}
        title={editRow ? 'Edit Item Inventori' : 'Tambah Item Inventori'}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowItemModal(false); setEditRow(null) }}>Batal</Button>
            <Button
              loading={savingItem || updatingItem}
              onClick={() => {
                const payload = { ...itemForm, qty: parseInt(itemForm.qty) || 0, min_stock: parseInt(itemForm.min_stock) || 0 }
                editRow ? updateItem(payload) : submitItem(payload)
              }}
            >
              Simpan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="SKU" placeholder="RAW-001" value={itemForm.sku} onChange={e => setItemForm({ ...itemForm, sku: e.target.value })} disabled={!!editRow} />
            <Input label="Nama Item" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Kategori" placeholder="Bahan Baku" value={itemForm.category} onChange={e => setItemForm({ ...itemForm, category: e.target.value })} />
            <Input label="Lokasi" placeholder="Gudang A-1" value={itemForm.location} onChange={e => setItemForm({ ...itemForm, location: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Qty" type="number" value={itemForm.qty} onChange={e => setItemForm({ ...itemForm, qty: e.target.value })} />
            <Input label="Min. Stok" type="number" value={itemForm.min_stock} onChange={e => setItemForm({ ...itemForm, min_stock: e.target.value })} />
            <Select label="Satuan" value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })}
              options={['pcs', 'kg', 'liter', 'meter', 'lembar', 'batang', 'roll'].map(u => ({ value: u, label: u }))} />
          </div>
        </div>
      </Modal>

      {/* Mutation Modal */}
      <Modal open={showMoveModal} onClose={() => setShowMoveModal(false)} title="Catat Mutasi Stok"
        footer={<><Button variant="secondary" onClick={() => setShowMoveModal(false)}>Batal</Button><Button loading={savingMove} onClick={() => submitMove({ ...moveForm, qty: parseInt(moveForm.qty) || 0 })}>Simpan</Button></>}>
        <div className="space-y-4">
          <Select label="Tipe" value={moveForm.type} onChange={e => setMoveForm({ ...moveForm, type: e.target.value })}
            options={[{ value: 'in', label: 'Barang Masuk' }, { value: 'out', label: 'Barang Keluar' }]} />
          <Input label="Nama Item" value={moveForm.item_name} onChange={e => setMoveForm({ ...moveForm, item_name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Jumlah" type="number" value={moveForm.qty} onChange={e => setMoveForm({ ...moveForm, qty: e.target.value })} />
            <Select label="Satuan" value={moveForm.unit} onChange={e => setMoveForm({ ...moveForm, unit: e.target.value })}
              options={['pcs', 'kg', 'liter', 'meter', 'lembar', 'batang'].map(u => ({ value: u, label: u }))} />
          </div>
          <Input label="Referensi (WO/PO)" placeholder="WO-2847 / PO-1234" value={moveForm.reference} onChange={e => setMoveForm({ ...moveForm, reference: e.target.value })} />
          <Input label="Keterangan" value={moveForm.notes} onChange={e => setMoveForm({ ...moveForm, notes: e.target.value })} />
        </div>
      </Modal>

      {/* Transfer Modal (WH-03) */}
      <Modal open={showTransferModal} onClose={() => { setShowTransferModal(false); setTransferForm(emptyTransfer) }} title="Transfer Stok Antar Lokasi"
        footer={<><Button variant="secondary" onClick={() => setShowTransferModal(false)}>Batal</Button><Button loading={savingTransfer} onClick={() => submitTransfer({ ...transferForm, qty: parseInt(transferForm.qty) || 0 })}>Transfer</Button></>}>
        <div className="space-y-4">
          <Input label="ID Item Inventori" placeholder="ID item" value={transferForm.inventory_id} onChange={e => setTransferForm({ ...transferForm, inventory_id: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Dari Lokasi" placeholder="Gudang A-1" value={transferForm.from_location} onChange={e => setTransferForm({ ...transferForm, from_location: e.target.value })} />
            <Input label="Ke Lokasi" placeholder="Gudang B-2" value={transferForm.to_location} onChange={e => setTransferForm({ ...transferForm, to_location: e.target.value })} />
          </div>
          <Input label="Qty" type="number" value={transferForm.qty} onChange={e => setTransferForm({ ...transferForm, qty: e.target.value })} />
          <Input label="Catatan" value={transferForm.notes} onChange={e => setTransferForm({ ...transferForm, notes: e.target.value })} />
        </div>
      </Modal>

      {/* Stock Opname Modal (WH-04) */}
      <Modal open={showOpnameModal} onClose={() => setShowOpnameModal(false)} title="Input Stock Opname Fisik"
        footer={<><Button variant="secondary" onClick={() => setShowOpnameModal(false)}>Batal</Button><Button loading={savingOpname} onClick={() => submitOpname({ items: opnameItems.map(i => ({ inventory_id: i.id, physical_qty: parseInt(i.physical_qty) || 0, notes: i.notes || '' })) })}>Simpan Opname</Button></>}>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {opnameItems.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{item.name}</div>
                <div className="text-xs text-gray-500">{item.sku} · {item.location}</div>
                <div className="text-xs text-gray-400">Sistem: {item.system_qty} {item.unit}</div>
              </div>
              <div className="w-28 shrink-0">
                <Input
                  label="Qty Fisik"
                  type="number"
                  value={String(item.physical_qty)}
                  onChange={e => {
                    const updated = [...opnameItems]
                    updated[idx] = { ...updated[idx], physical_qty: parseInt(e.target.value) || 0 }
                    setOpnameItems(updated)
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteRow} onClose={() => setDeleteRow(null)} title="Konfirmasi Hapus"
        footer={<><Button variant="secondary" onClick={() => setDeleteRow(null)}>Batal</Button><Button variant="danger" onClick={handleDelete}>Hapus</Button></>}>
        <p className="text-sm text-gray-600">
          Hapus item <strong>{deleteRow?.name}</strong> dari inventori? Tindakan ini tidak dapat dibatalkan.
        </p>
      </Modal>
    </div>
  )
}
