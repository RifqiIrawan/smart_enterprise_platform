import { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'

export default function UpdatePrompt() {
  const [show, setShow] = useState(false)
  const [worker, setWorker] = useState(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleControllerChange = () => {
      // A new SW has taken control — prompt user to reload
      setShow(true)
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    // Check for waiting SW on page load
    navigator.serviceWorker.ready.then((reg) => {
      if (reg.waiting) {
        setWorker(reg.waiting)
        setShow(true)
      }
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWorker(newWorker)
            setShow(true)
          }
        })
      })
    })

    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
  }, [])

  const handleUpdate = () => {
    if (worker) {
      worker.postMessage({ type: 'SKIP_WAITING' })
    }
    window.location.reload()
  }

  if (!show) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 bg-indigo-600 text-white rounded-2xl shadow-xl p-4 flex items-start gap-3 animate-slide-up">
      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
        <RefreshCw className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">Pembaruan Tersedia</p>
        <p className="text-indigo-200 text-xs mt-0.5 leading-relaxed">
          Versi baru SEP siap. Muat ulang untuk mendapatkan fitur terbaru.
        </p>
        <button
          onClick={handleUpdate}
          className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-white text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-50 transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Muat Ulang Sekarang
        </button>
      </div>
      <button
        onClick={() => setShow(false)}
        className="text-indigo-300 hover:text-white transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
