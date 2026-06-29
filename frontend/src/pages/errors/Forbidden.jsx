import { useNavigate } from 'react-router-dom'
import { ShieldOff, ArrowLeft } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function Forbidden() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShieldOff className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">403 — Akses Ditolak</h1>
        <p className="text-slate-500 mb-2">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
        <p className="text-sm text-slate-400 mb-8">
          Hubungi administrator sistem jika Anda memerlukan akses ke modul ini.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>
            Kembali
          </Button>
          <Button onClick={() => navigate('/dashboard')}>
            Ke Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
