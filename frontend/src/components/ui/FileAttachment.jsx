import { useRef, useState } from 'react'
import { Paperclip, Upload, Trash2, FileText, Image, File, ExternalLink } from 'lucide-react'
import { documentApi } from '@/api'
import toast from 'react-hot-toast'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const MAX_SIZE_MB = 10

function FileIcon({ mimeType }) {
  if (mimeType?.startsWith('image/')) return <Image className="w-4 h-4 text-emerald-500" />
  if (mimeType === 'application/pdf') return <FileText className="w-4 h-4 text-red-500" />
  return <File className="w-4 h-4 text-blue-500" />
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function FileAttachment({ refType, refId, attachments = [], onUploaded, readOnly = false }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState(attachments)

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Tipe file tidak didukung. Gunakan PDF, JPG, PNG, XLSX, atau DOCX.')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Ukuran file maksimal ${MAX_SIZE_MB} MB`)
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('ref_type', refType || '')
      fd.append('ref_id', refId || '')
      const result = await documentApi.upload(fd)
      const newFile = { id: result.id, name: result.name || file.name, size: file.size, mime_type: file.type, created_at: new Date().toLocaleString('id-ID') }
      setFiles(prev => [...prev, newFile])
      onUploaded?.(newFile)
      toast.success('File berhasil diupload')
    } catch (err) {
      toast.error(err?.message || 'Gagal mengupload file')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (id) => {
    try {
      await documentApi.remove(id)
      setFiles(prev => prev.filter(f => f.id !== id))
      toast.success('File dihapus')
    } catch {
      toast.error('Gagal menghapus file')
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
          <Paperclip className="w-3.5 h-3.5" />
          Lampiran ({files.length})
        </span>
        {!readOnly && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
          >
            <Upload className="w-3 h-3" />
            {uploading ? 'Mengupload...' : 'Upload File'}
          </button>
        )}
        <input ref={inputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.docx" onChange={handleUpload} />
      </div>

      {files.length === 0 ? (
        <p className="text-xs text-slate-400 py-2">Belum ada lampiran</p>
      ) : (
        <ul className="space-y-1">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
              <FileIcon mimeType={f.mime_type} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">{f.name}</p>
                <p className="text-[10px] text-slate-400">{formatBytes(f.size)} · {f.created_at}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <a
                  href={`/api/v1/documents/${f.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Download"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                {!readOnly && (
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
