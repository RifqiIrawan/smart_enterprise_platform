import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'
import Input from '@/components/ui/Input'
import {
  Eye, EyeOff, Sparkles, ArrowRight, Zap, Shield, BarChart3, Fingerprint,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { isWebAuthnSupported, authenticatePasskey } from '@/utils/pwa'

const features = [
  { icon: Zap, label: 'Real-time IoT & OEE' },
  { icon: Shield, label: 'Enterprise Security' },
  { icon: BarChart3, label: 'AI-Powered Analytics' },
]

export default function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)
  const [webAuthnAvailable, setWebAuthnAvailable] = useState(false)

  useEffect(() => {
    setWebAuthnAvailable(isWebAuthnSupported())
  }, [])

  const submit = async (email, password) => {
    setLoading(true)
    try {
      const res = await authApi.login({ email, password })
      setAuth(res.data.user, res.data.token, res.data.company)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err?.message || 'Login gagal. Periksa email dan password.')
    } finally {
      setLoading(false)
    }
  }

  const handleBiometric = async () => {
    if (!webAuthnAvailable) {
      toast.error('Perangkat ini tidak mendukung biometrik')
      return
    }
    setBiometricLoading(true)
    try {
      await authenticatePasskey()
      // In production: send assertion to backend for verification
      // For demo, proceed as admin
      toast.success('Autentikasi biometrik berhasil!')
      await submit('admin@sep.id', 'admin123')
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        toast.error('Autentikasi dibatalkan')
      } else if (err.name === 'NotSupportedError') {
        toast.error('Passkey belum terdaftar. Login dengan email terlebih dahulu.')
      } else {
        toast.error('Autentikasi biometrik gagal. Gunakan login email.')
      }
    } finally {
      setBiometricLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)' }}
      >
        {/* Mesh gradient blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
          <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl" />
        </div>

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm tracking-tight">Smart Enterprise</p>
            <p className="text-indigo-400 text-[10px] font-semibold uppercase tracking-widest">Platform</p>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Kelola Bisnis
            <br />
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Lebih Cerdas
            </span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-10 max-w-xs">
            Platform ERP terintegrasi dengan AI, IoT real-time, dan analytics canggih untuk perusahaan
            modern.
          </p>
          <div className="space-y-3">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <span className="text-sm text-slate-300 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom badge */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400 font-medium">12 Modul · 248 Karyawan · 89.2% OEE</span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <p className="text-slate-800 font-bold">Smart Enterprise Platform</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Selamat datang kembali</h2>
            <p className="text-slate-500 text-sm mt-1">Masuk ke dashboard Anda</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit(form.email, form.password)
            }}
            className="space-y-4"
          >
            <Input
              label="Email"
              type="email"
              placeholder="admin@perusahaan.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <div className="relative">
              <Input
                label="Password"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 bottom-2.5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-150 active:scale-[0.98] disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
            >
              {loading ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <>
                  Masuk <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Biometric login */}
          {webAuthnAvailable && (
            <button
              type="button"
              onClick={handleBiometric}
              disabled={biometricLoading || loading}
              className="mt-3 w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-sm border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all duration-150 active:scale-[0.98] disabled:opacity-60"
            >
              {biometricLoading ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <Fingerprint className="w-4 h-4 text-indigo-500" />
              )}
              Masuk dengan Biometrik / Passkey
            </button>
          )}

          {/* Demo login */}
          <div className="mt-6">
            <div className="relative flex items-center gap-3 my-4">
              <div className="flex-1 border-t border-slate-200" />
              <span className="text-xs text-slate-400 font-medium">atau gunakan demo</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>
            <button
              type="button"
              onClick={() => submit('admin@sep.id', 'admin123')}
              disabled={loading}
              className="w-full flex items-center gap-4 px-5 py-4 bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 rounded-2xl transition-all duration-150 group disabled:opacity-60"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                A
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-slate-800">Admin Demo</p>
                <p className="text-xs text-slate-400">admin@sep.id · admin123</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>

          <p className="text-center text-slate-400 text-xs mt-8">
            © 2026 Smart Enterprise Platform · All rights reserved
          </p>
        </div>
      </div>
    </div>
  )
}
