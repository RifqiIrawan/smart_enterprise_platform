import { Bell, Search, LogOut, User, ChevronDown, X, Command, Building2, Settings as SettingsIcon, BellOff, Sun, Moon, Globe } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { pushApi, searchApi } from '@/api'
import { timeAgo } from '@/utils/format'
import { subscribeToPush, unsubscribeFromPush, getPushSubscription } from '@/utils/pwa'
import { useTheme } from '@/contexts/ThemeContext'
import { useLang } from '@/contexts/LangContext'
import toast from 'react-hot-toast'

const MODULE_COLORS = {
  HRIS: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Warehouse: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Asset: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  Purchasing: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Factory: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Accounting: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  default: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

function GlobalSearchBox() {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const timer = useRef(null)
  const boxRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    clearTimeout(timer.current)
    if (query.length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    timer.current = setTimeout(async () => {
      try {
        const res = await searchApi.query(query)
        setResults(res.results || [])
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer.current)
  }, [query])

  useEffect(() => {
    const handler = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const go = (path) => { navigate(path); setOpen(false); setQuery('') }

  return (
    <div ref={boxRef} className="relative hidden md:block">
      <div className="relative flex items-center">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={t('search_placeholder')}
          className="pl-9 pr-10 py-2 text-sm bg-slate-100 border border-slate-200/80 rounded-xl w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 focus:bg-white transition-all placeholder:text-slate-400"
        />
        <div className="absolute right-2.5 flex items-center gap-1">
          {query ? (
            <button onClick={() => { setQuery(''); setOpen(false) }}
              className="text-slate-400 hover:text-slate-600 transition-colors p-0.5">
              <X className="w-3 h-3" />
            </button>
          ) : (
            <span className="hidden lg:flex items-center gap-0.5 text-[10px] text-slate-400 bg-slate-200 rounded px-1.5 py-0.5 font-mono">
              <Command className="w-2.5 h-2.5" />K
            </span>
          )}
        </div>
      </div>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 rounded-2xl shadow-xl border z-50 overflow-hidden animate-scale-in" style={{ backgroundColor: 'var(--dropdown-bg)', borderColor: 'var(--border-color)' }}>
          {loading ? (
            <div className="px-4 py-4 text-xs text-slate-400 text-center">Mencari...</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-4 text-xs text-slate-400 text-center">Tidak ditemukan untuk "{query}"</div>
          ) : (
            <>
              <div className="px-3 pt-3 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {results.length} hasil ditemukan
              </div>
              <ul className="max-h-64 overflow-y-auto pb-2">
                {results.map((r, i) => (
                  <li key={i}>
                    <button
                      onClick={() => go(r.path)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-left transition-colors"
                    >
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${MODULE_COLORS[r.module] || MODULE_COLORS.default}`}>
                        {r.module}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{r.title}</p>
                        <p className="text-xs text-slate-400 truncate">{r.sub}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function NotifBell({ unread, notifications, markRead }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const alertColors = { danger: 'bg-rose-500', warning: 'bg-amber-500', info: 'bg-indigo-500', success: 'bg-emerald-500' }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-xl border z-50 overflow-hidden animate-scale-in" style={{ backgroundColor: 'var(--dropdown-bg)', borderColor: 'var(--border-color)' }}>
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">{t('notifications')}</p>
            {unread > 0 && (
              <span className="text-xs bg-rose-50 text-rose-500 font-semibold px-2 py-0.5 rounded-full">
                {unread} baru
              </span>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">{t('no_notifications')}</p>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors flex gap-3 ${!n.read ? 'bg-indigo-50/40' : ''}`}
                >
                  <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${!n.read ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                  <div>
                    <p className="text-sm text-slate-700">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all"
    >
      {theme === 'dark'
        ? <Sun className="w-4 h-4 text-amber-500" />
        : <Moon className="w-4 h-4" />
      }
    </button>
  )
}

function LangToggle() {
  const { lang, setLang } = useLang()
  return (
    <button
      onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
      title={lang === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
      className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all text-[10px] font-bold"
    >
      {lang === 'id' ? 'EN' : 'ID'}
    </button>
  )
}

function PushNotifToggle() {
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const supported = 'Notification' in window && 'serviceWorker' in navigator

  useEffect(() => {
    if (!supported) return
    getPushSubscription().then((sub) => setSubscribed(!!sub))
  }, [supported])

  const toggle = async () => {
    if (!supported) { toast.error('Browser tidak mendukung push notification'); return }
    if (Notification.permission === 'denied') { toast.error('Izin notifikasi ditolak. Aktifkan di pengaturan browser.'); return }
    setLoading(true)
    try {
      if (subscribed) {
        await unsubscribeFromPush()
        await pushApi.unsubscribe()
        setSubscribed(false)
        toast.success('Push notification dinonaktifkan')
      } else {
        const { data } = await pushApi.getVapidKey()
        const sub = await subscribeToPush(data.public_key)
        await pushApi.subscribe(sub)
        setSubscribed(true)
        toast.success('Push notification diaktifkan')
      }
    } catch (err) {
      toast.error(err?.message || 'Gagal mengubah pengaturan notifikasi')
    } finally {
      setLoading(false)
    }
  }

  if (!supported) return null

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={subscribed ? 'Nonaktifkan push notifikasi' : 'Aktifkan push notifikasi'}
      className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all disabled:opacity-50 ${
        subscribed
          ? 'bg-indigo-100 hover:bg-indigo-200 text-indigo-600'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700'
      }`}
    >
      {subscribed ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
    </button>
  )
}

export default function Header({ title }) {
  const { user, logout } = useAuthStore()
  const { notifications, markRead } = useUIStore()
  const { t } = useLang()
  const navigate = useNavigate()
  const [showUser, setShowUser] = useState(false)
  const userRef = useRef(null)
  const unread = notifications.filter((n) => !n.read).length

  useEffect(() => {
    const h = (e) => { if (!userRef.current?.contains(e.target)) setShowUser(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleLogout = async () => {
    try { await authApi.logout() } catch {}
    logout()
    navigate('/login')
  }

  return (
    <header className="backdrop-blur-md border-b px-6 py-3 flex items-center gap-3 sticky top-0 z-30" style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--border-color)' }}>
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{title}</h1>
      </div>

      <GlobalSearchBox />

      <ThemeToggle />
      <LangToggle />
      <PushNotifToggle />
      <NotifBell unread={unread} notifications={notifications} markRead={markRead} />

      {/* User menu */}
      <div ref={userRef} className="relative">
        <button
          onClick={() => setShowUser(!showUser)}
          className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-slate-700 leading-none">{user?.name}</p>
            <p className="text-[10px] text-slate-400 capitalize mt-0.5">{user?.role}</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
        </button>

        {showUser && (
          <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl shadow-xl border z-50 overflow-hidden animate-scale-in" style={{ backgroundColor: 'var(--dropdown-bg)', borderColor: 'var(--border-color)' }}>
            <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-br from-indigo-50 to-violet-50">
              <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
              <span className="inline-block mt-1 text-[10px] font-semibold capitalize px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">
                {user?.role}
              </span>
            </div>
            {user?.company_name && (
              <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50/60">
                <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-600 truncate">{user.company_name}</span>
              </div>
            )}
            <button
              onClick={() => { navigate('/settings'); setShowUser(false) }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <User className="w-4 h-4 text-slate-400" /> {t('profile')}
            </button>
            {user?.role === 'superadmin' && (
              <button
                onClick={() => { navigate('/settings'); setShowUser(false) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <SettingsIcon className="w-4 h-4 text-slate-400" /> Kelola Perusahaan
              </button>
            )}
            <div className="border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" /> {t('logout')}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
