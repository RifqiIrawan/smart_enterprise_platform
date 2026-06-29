import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    // In production, send to error reporting service (Sentry, etc.)
    if (import.meta.env.PROD) {
      console.error('[SEP Error]', error, errorInfo)
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Terjadi Kesalahan</h1>
          <p className="text-slate-500 text-sm mb-6">
            Komponen ini mengalami error yang tidak terduga. Silakan muat ulang halaman atau kembali ke
            dashboard.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-left text-xs bg-slate-900 text-red-300 rounded-xl p-4 mb-6 overflow-auto max-h-32">
              {this.state.error.toString()}
              {this.state.errorInfo?.componentStack}
            </pre>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Coba Lagi
            </button>
            <button
              onClick={() => { window.location.href = '/dashboard' }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
            >
              <Home className="w-4 h-4" /> Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }
}
