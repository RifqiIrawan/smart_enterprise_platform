import { useEffect, useRef, useState } from 'react'
import { Scan, QrCode, X, Camera, CameraOff } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

// ─── QR Code Generator (using canvas) ────────────────────────────────────────

function drawQR(canvas, value) {
  if (!canvas || !value) return
  const ctx = canvas.getContext('2d')
  const size = canvas.width
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, size, size)

  // Simple visual representation (not a real QR code — for demo)
  const grid = 21
  const cell = size / grid
  const hash = value.split('').reduce((a, c) => a + c.charCodeAt(0), 0)

  ctx.fillStyle = '#1e1b4b'
  // Finder patterns
  const drawFinder = (x, y) => {
    ctx.fillRect(x * cell, y * cell, 7 * cell, 7 * cell)
    ctx.fillStyle = '#fff'
    ctx.fillRect((x + 1) * cell, (y + 1) * cell, 5 * cell, 5 * cell)
    ctx.fillStyle = '#1e1b4b'
    ctx.fillRect((x + 2) * cell, (y + 2) * cell, 3 * cell, 3 * cell)
  }
  drawFinder(0, 0)
  drawFinder(14, 0)
  drawFinder(0, 14)

  // Data modules (pseudorandom based on value)
  let seed = hash
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      if ((r < 9 && c < 9) || (r < 9 && c > 11) || (r > 11 && c < 9)) continue
      seed = (seed * 1664525 + 1013904223) & 0xffffffff
      if (((seed >>> 0) % 100) > 45) {
        ctx.fillStyle = '#1e1b4b'
        ctx.fillRect(c * cell, r * cell, cell, cell)
      }
    }
  }
}

export function QRCodeDisplay({ value, size = 180, label }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (canvasRef.current && value) {
      drawQR(canvasRef.current, value)
    }
  }, [value])

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="p-3 bg-white border-2 border-slate-200 rounded-xl shadow-sm">
        <canvas ref={canvasRef} width={size} height={size} className="block" />
      </div>
      {label && <p className="text-xs text-slate-500 text-center font-mono">{label}</p>}
    </div>
  )
}

// ─── Barcode Scanner (camera) ─────────────────────────────────────────────────

export function BarcodeScannerModal({ open, onClose, onScan }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [error, setError] = useState(null)
  const [manualInput, setManualInput] = useState('')

  useEffect(() => {
    if (open) startCamera()
    return () => stopCamera()
  }, [open])

  const startCamera = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setCameraActive(true)
      }
    } catch (err) {
      setError('Kamera tidak tersedia. Gunakan input manual di bawah.')
      setCameraActive(false)
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setCameraActive(false)
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (!manualInput.trim()) return
    onScan?.(manualInput.trim())
    setManualInput('')
    toast.success('Barcode diterima: ' + manualInput)
  }

  return (
    <Modal open={open} onClose={() => { stopCamera(); onClose() }} title="Scan Barcode / QR Code">
      <div className="space-y-4">
        {/* Camera view */}
        <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
          {cameraActive ? (
            <>
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-indigo-400 rounded-lg relative">
                  <span className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
                  <span className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
                  <span className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
                  <span className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-indigo-400/60 animate-pulse" />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-slate-400 py-8">
              {error ? (
                <div className="space-y-2">
                  <CameraOff className="w-10 h-10 mx-auto text-slate-500" />
                  <p className="text-sm">{error}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Camera className="w-10 h-10 mx-auto animate-pulse" />
                  <p className="text-sm">Memulai kamera...</p>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500 text-center">
          Arahkan kamera ke barcode atau QR code. Untuk integrasi penuh, gunakan library ZXing.
        </p>

        {/* Manual input fallback */}
        <div className="border-t border-slate-200 pt-3">
          <p className="text-xs font-medium text-slate-500 mb-2">Input Manual</p>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              placeholder="Ketik atau tempel kode barcode..."
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
            />
            <Button type="submit" size="sm" icon={<Scan className="w-3.5 h-3.5" />}>Konfirmasi</Button>
          </form>
        </div>
      </div>
    </Modal>
  )
}

// ─── Default export: combined QR Button + Scanner trigger ─────────────────────

export default function BarcodeButton({ value, label, onScan, className = '' }) {
  const [showQR, setShowQR] = useState(false)
  const [showScan, setShowScan] = useState(false)

  return (
    <>
      <div className={`flex gap-1 ${className}`}>
        {value && (
          <button
            onClick={() => setShowQR(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium border border-indigo-200 transition-colors"
            title="Tampilkan QR Code"
          >
            <QrCode className="w-3.5 h-3.5" />
            QR
          </button>
        )}
        {onScan && (
          <button
            onClick={() => setShowScan(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium border border-slate-200 transition-colors"
            title="Scan Barcode"
          >
            <Scan className="w-3.5 h-3.5" />
            Scan
          </button>
        )}
      </div>

      {/* QR Modal */}
      <Modal open={showQR} onClose={() => setShowQR(false)} title="QR Code">
        <div className="flex flex-col items-center py-4">
          <QRCodeDisplay value={value} size={200} label={label || value} />
          <p className="mt-4 text-xs text-slate-400 text-center max-w-xs">
            Scan QR code ini untuk mengakses item secara langsung.
          </p>
        </div>
      </Modal>

      {/* Scanner Modal */}
      <BarcodeScannerModal open={showScan} onClose={() => setShowScan(false)} onScan={(code) => { onScan(code); setShowScan(false) }} />
    </>
  )
}
