import { useRef, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import { FolderOpen, Upload, FileText, Image, File, Paperclip, Trash2, ExternalLink, Filter } from 'lucide-react'
import { documentApi } from '@/api'
import toast from 'react-hot-toast'

const REF_TYPES = ['Semua', 'SO', 'PO', 'GRN', 'INV', 'QC', 'ASSET', 'HR']
const ALLOWED_TYPES = '.pdf,.jpg,.jpeg,.png,.xlsx,.xls,.docx'

function FileIcon({ mimeType, size = 4 }) {
  const cls = `w-${size} h-${size}`
  if (mimeType?.startsWith('image/')) return <Image className={`${cls} text-emerald-500`} />
  if (mimeType === 'application/pdf') return <FileText className={`${cls} text-red-500`} />
  return <File className={`${cls} text-blue-500`} />
}

function formatBytes(bytes) {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const refTypeBadge = (t) => ({
  SO: <Badge variant="primary">SO</Badge>,
  PO: <Badge variant="warning">PO</Badge>,
  GRN: <Badge variant="success">GRN</Badge>,
  INV: <Badge variant="info">INV</Badge>,
  QC: <Badge variant="purple">QC</Badge>,
  ASSET: <Badge variant="secondary">ASSET</Badge>,
  HR: <Badge variant="default">HR</Badge>,
})[t] || <Badge variant="default">{t}</Badge>

export default function Documents() {
  const tableRef = useRef(null)
  const uploadRef = useRef(null)
  const [filterType, setFilterType] = useState('Semua')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState({ ref_type: 'SO', ref_id: '', file: null })
  const [stats, setStats] = useState({ total: 8, size: '2.3 MB', types: { pdf: 5, image: 1, excel: 2 } })

  const fetchFn = (params) => {
    const p = { ...params }
    if (filterType !== 'Semua') p.ref_type = filterType
    return documentApi.getAll(p)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) setUploadForm(prev => ({ ...prev, file }))
  }

  const handleUpload = async () => {
    if (!uploadForm.file) { toast.error('Pilih file terlebih dahulu'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', uploadForm.file)
      fd.append('ref_type', uploadForm.ref_type)
      fd.append('ref_id', uploadForm.ref_id)
      await documentApi.upload(fd)
      toast.success('File berhasil diupload')
      setShowUploadModal(false)
      setUploadForm({ ref_type: 'SO', ref_id: '', file: null })
      tableRef.current?.refetch()
    } catch (err) {
      toast.error(err?.message || 'Gagal mengupload')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Hapus file "${name}"?`)) return
    try {
      await documentApi.remove(id)
      toast.success('File dihapus')
      tableRef.current?.refetch()
    } catch { toast.error('Gagal menghapus') }
  }

  const columns = [
    {
      key: 'name', label: 'Nama File', sortable: true,
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <FileIcon mimeType={row.mime_type} size={5} />
          <div>
            <p className="text-sm font-medium text-slate-800">{v}</p>
            <p className="text-xs text-slate-400">{formatBytes(row.size)}</p>
          </div>
        </div>
      )
    },
    {
      key: 'ref_type', label: 'Tipe Referensi',
      render: (v) => refTypeBadge(v)
    },
    { key: 'ref_id', label: 'ID Referensi', tdClassName: 'font-mono text-xs text-slate-600' },
    { key: 'uploaded_by', label: 'Diupload Oleh', sortable: true },
    { key: 'created_at', label: 'Tanggal', sortable: true, tdClassName: 'text-xs text-slate-500 whitespace-nowrap' },
  ]

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Dokumen', value: stats.total, icon: <Paperclip className="w-5 h-5 text-indigo-500" />, bg: 'bg-indigo-50' },
          { label: 'Total Ukuran', value: stats.size, icon: <FolderOpen className="w-5 h-5 text-emerald-500" />, bg: 'bg-emerald-50' },
          { label: 'File PDF', value: stats.types.pdf, icon: <FileText className="w-5 h-5 text-red-500" />, bg: 'bg-red-50' },
          { label: 'Gambar & Lainnya', value: stats.types.image + stats.types.excel, icon: <File className="w-5 h-5 text-amber-500" />, bg: 'bg-amber-50' },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Manajemen Dokumen</CardTitle>
            <div className="flex items-center gap-2">
              {/* Filter by ref_type */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                {REF_TYPES.map(t => (
                  <button key={t} onClick={() => { setFilterType(t); setTimeout(() => tableRef.current?.refetch(), 0) }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${filterType === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <Button size="sm" icon={<Upload className="w-3.5 h-3.5" />} onClick={() => setShowUploadModal(true)}>
                Upload
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            ref={tableRef}
            columns={columns}
            fetchFn={fetchFn}
            searchPlaceholder="Cari nama file, referensi..."
            actions={(row) => (
              <div className="flex gap-1">
                <a
                  href={`/api/v1/documents/${row.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-blue-600 hover:bg-blue-50 font-medium"
                >
                  <ExternalLink className="w-3 h-3" /> Buka
                </a>
                <button
                  onClick={() => handleDelete(row.id, row.name)}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-red-500 hover:bg-red-50 font-medium"
                >
                  <Trash2 className="w-3 h-3" /> Hapus
                </button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <Modal open={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Dokumen">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Tipe Referensi"
              value={uploadForm.ref_type}
              onChange={e => setUploadForm(prev => ({ ...prev, ref_type: e.target.value }))}
              options={['SO', 'PO', 'GRN', 'INV', 'QC', 'ASSET', 'HR'].map(t => ({ value: t, label: t }))}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ID Referensi</label>
              <input
                value={uploadForm.ref_id}
                onChange={e => setUploadForm(prev => ({ ...prev, ref_id: e.target.value }))}
                placeholder="Contoh: SO/2026/001"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
              />
            </div>
          </div>

          {/* File drop zone */}
          <div
            className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
            onClick={() => uploadRef.current?.click()}
          >
            {uploadForm.file ? (
              <div className="flex items-center justify-center gap-2">
                <FileIcon mimeType={uploadForm.file.type} size={5} />
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-700">{uploadForm.file.name}</p>
                  <p className="text-xs text-slate-400">{formatBytes(uploadForm.file.size)}</p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600 font-medium">Klik untuk pilih file</p>
                <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG, XLSX, DOCX — maks. 10 MB</p>
              </>
            )}
            <input ref={uploadRef} type="file" accept={ALLOWED_TYPES} className="hidden" onChange={handleFileSelect} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowUploadModal(false)}>Batal</Button>
            <Button loading={uploading} icon={<Upload className="w-4 h-4" />} onClick={handleUpload}>Upload</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
