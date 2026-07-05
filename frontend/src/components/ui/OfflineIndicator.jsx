import { useState, useEffect } from 'react'
import { WifiOff, Wifi } from 'lucide-react'

export default function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine)
  const [justCameBack, setJustCameBack] = useState(false)

  useEffect(() => {
    let timer
    const handleOnline = () => {
      setOnline(true)
      setJustCameBack(true)
      timer = setTimeout(() => setJustCameBack(false), 3000)
    }
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (online && !justCameBack) return null

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2 text-sm font-semibold transition-all duration-300 ${
        online ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
      }`}
    >
      {online ? (
        <>
          <Wifi className="w-4 h-4" />
          <span>Koneksi internet kembali</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Tidak ada koneksi · Mode offline aktif — data mungkin tidak terbaru</span>
        </>
      )}
    </div>
  )
}
