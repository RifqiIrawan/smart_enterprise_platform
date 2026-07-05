import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import StatCard from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import DataTable from '@/components/ui/DataTable'
import { TrendingUp, DollarSign, ArrowUpRight, ArrowDownLeft, Plus, CheckCircle, XCircle, Lock, Unlock, RefreshCw } from 'lucide-react'
import { accountingApi, financeGlApi } from '@/api'
import { useApi, useSubmit } from '@/hooks/useApi'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/utils/format'

// ─── Constants ────────────────────────────────────────────────────
const MONTHS = [
  { value: '01', label: 'Januari' }, { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' }, { value: '04', label: 'April' },
  { value: '05', label: 'Mei' }, { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' }, { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' }, { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' }, { value: '12', label: 'Desember' },
]
const YEARS = ['2024', '2025', '2026'].map(y => ({ value: y, label: y }))
const MONTH_LABEL = Object.fromEntries(MONTHS.map(m => [m.value, m.label]))

const COA_OPTIONS = [
  { value: '1-1100', label: '1-1100 Kas & Bank' },
  { value: '1-1200', label: '1-1200 Piutang Usaha' },
  { value: '1-1300', label: '1-1300 Persediaan Barang' },
  { value: '1-1400', label: '1-1400 Biaya Dibayar Dimuka' },
  { value: '1-2200', label: '1-2200 Bangunan & Peralatan' },
  { value: '2-1100', label: '2-1100 Hutang Usaha' },
  { value: '3-2000', label: '3-2000 Laba Ditahan' },
  { value: '4-1000', label: '4-1000 Pendapatan Penjualan' },
  { value: '5-1000', label: '5-1000 Beban Bahan Baku' },
  { value: '5-2000', label: '5-2000 Beban Gaji' },
]

// ─── Badge helpers ────────────────────────────────────────────────
const typeBadge = (t) => ({
  header: <Badge variant="default">Header</Badge>,
  account: <Badge variant="primary">Akun</Badge>,
  revenue: <Badge variant="success">Pendapatan</Badge>,
  expense: <Badge variant="danger">Beban</Badge>,
})[t] || <Badge>{t}</Badge>

const refTypeBadge = (t) => ({
  PO: <Badge variant="purple">PO</Badge>,
  PAYROLL: <Badge variant="info">Payroll</Badge>,
  INVOICE: <Badge variant="success">Invoice</Badge>,
  MANUAL: <Badge variant="default">Manual</Badge>,
})[t] || <Badge>{t}</Badge>

const periodStatusBadge = (s) => ({
  open: <Badge variant="success">Open</Badge>,
  closed: <Badge variant="default">Closed</Badge>,
  future: <Badge variant="info">Future</Badge>,
})[s] || <Badge>{s}</Badge>

// ─── Sub-component: Buku Besar ─────────────────────────────────────
function TabGL() {
  const [filters, setFilters] = useState({ account_code: '1-1100', month: '06', year: '2026' })
  const [version, setVersion] = useState(0)

  const glColumns = [
    { key: 'date', label: 'Tanggal', sortable: true, render: v => formatDate(v) },
    { key: 'ref', label: 'Ref', render: v => <span className="font-mono text-xs text-blue-600 font-semibold">{v}</span> },
    { key: 'description', label: 'Keterangan', render: v => <span className="font-medium">{v}</span> },
    { key: 'debit', label: 'Debit', render: v => v > 0 ? <span className="text-emerald-600 font-medium">{formatCurrency(v)}</span> : <span className="text-gray-300">—</span> },
    { key: 'credit', label: 'Kredit', render: v => v > 0 ? <span className="text-red-500 font-medium">{formatCurrency(v)}</span> : <span className="text-gray-300">—</span> },
    { key: 'balance', label: 'Saldo', render: v => <span className="font-semibold text-gray-800">{formatCurrency(v)}</span> },
  ]

  // useCallback keyed on version so DataTable re-fetches when version increments
  const fetchGL = useCallback(
    (p) => financeGlApi.getGeneralLedger({ ...p, account_code: filters.account_code, month: filters.month, year: filters.year }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version]
  )

  const coaLabel = COA_OPTIONS.find(o => o.value === filters.account_code)?.label || filters.account_code

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-60">
              <Select label="Akun" value={filters.account_code}
                onChange={e => setFilters(f => ({ ...f, account_code: e.target.value }))}
                options={COA_OPTIONS} />
            </div>
            <Select label="Bulan" value={filters.month}
              onChange={e => setFilters(f => ({ ...f, month: e.target.value }))} options={MONTHS} />
            <Select label="Tahun" value={filters.year}
              onChange={e => setFilters(f => ({ ...f, year: e.target.value }))} options={YEARS} />
            <Button onClick={() => setVersion(v => v + 1)} icon={<RefreshCw size={14} />}>Tampilkan</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Buku Besar — {coaLabel} — {MONTH_LABEL[filters.month]} {filters.year}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            key={version}
            columns={glColumns}
            fetchFn={fetchGL}
            defaultPageSize={15}
            searchPlaceholder="Cari ref, keterangan..."
          />
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Sub-component: Neraca Saldo ───────────────────────────────────
function TabTrialBalance() {
  const [period, setPeriod] = useState({ month: '06', year: '2026' })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await financeGlApi.getTrialBalance({ month: period.month, year: period.year })
      setData(res.data)
    } catch {}
    setLoading(false)
  }

  const accounts = data?.accounts || []
  const isBalanced = data?.is_balanced ?? true

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <Select label="Bulan" value={period.month}
              onChange={e => setPeriod(p => ({ ...p, month: e.target.value }))} options={MONTHS} />
            <Select label="Tahun" value={period.year}
              onChange={e => setPeriod(p => ({ ...p, year: e.target.value }))} options={YEARS} />
            <Button loading={loading} onClick={load} icon={<RefreshCw size={14} />}>Tampilkan</Button>
            {data && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${isBalanced ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {isBalanced ? <CheckCircle size={14} /> : <XCircle size={14} />}
                {isBalanced ? 'Saldo Balance' : 'Saldo Tidak Balance'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Neraca Saldo — {MONTH_LABEL[period.month]} {period.year}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-24">Kode</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Nama Akun</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 w-36">Saldo Awal</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-emerald-600 w-36">Mutasi Debit</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-red-500 w-36">Mutasi Kredit</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 w-36">Saldo Akhir</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a, i) => (
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-blue-600 font-semibold">{a.code}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{a.name}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(Math.abs(a.opening_balance))}</td>
                    <td className="px-3 py-2 text-right text-emerald-600">
                      {a.debit_mutations > 0 ? formatCurrency(a.debit_mutations) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-red-500">
                      {a.credit_mutations > 0 ? formatCurrency(a.credit_mutations) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-800">{formatCurrency(Math.abs(a.closing_balance))}</td>
                  </tr>
                ))}
                {accounts.length > 0 && (
                  <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold">
                    <td colSpan={3} className="px-3 py-2 text-sm text-gray-700">Total</td>
                    <td className="px-3 py-2 text-right text-emerald-700">{formatCurrency(data?.total_debit || 0)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{formatCurrency(data?.total_credit || 0)}</td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
            {accounts.length === 0 && (
              <p className="text-center text-gray-400 py-10 text-sm">Pilih periode dan klik Tampilkan untuk memuat data</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Sub-component: Arus Kas ───────────────────────────────────────
function TabCashFlow() {
  const [period, setPeriod] = useState({ month: '06', year: '2026' })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await financeGlApi.getCashFlow({ month: period.month, year: period.year })
      setData(res.data)
    } catch {}
    setLoading(false)
  }

  const CashSection = ({ section, headerClass }) => (
    <div className="space-y-0.5">
      <div className={`flex justify-between py-2 border-b font-semibold text-sm ${headerClass}`}>
        <span>{section?.label}</span>
        <span>{formatCurrency(section?.total || 0)}</span>
      </div>
      {(section?.items || []).map((item, i) =>
        item.is_header
          ? <div key={i} className="py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide pl-2 mt-1">{item.label}</div>
          : <div key={i} className="flex justify-between py-1 pl-4 text-sm">
              <span className="text-gray-600">{item.label}</span>
              {item.amount !== null && item.amount !== 0
                ? <span className={item.amount < 0 ? 'text-red-500' : 'text-gray-700'}>{formatCurrency(item.amount)}</span>
                : <span className="text-gray-300">—</span>}
            </div>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <Select label="Bulan" value={period.month}
              onChange={e => setPeriod(p => ({ ...p, month: e.target.value }))} options={MONTHS} />
            <Select label="Tahun" value={period.year}
              onChange={e => setPeriod(p => ({ ...p, year: e.target.value }))} options={YEARS} />
            <Button loading={loading} onClick={load} icon={<RefreshCw size={14} />}>Tampilkan</Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Laporan Arus Kas — {data?.period || `${MONTH_LABEL[period.month]} ${period.year}`}</CardTitle>
          </CardHeader>
          <CardContent>
            {data ? (
              <div className="space-y-4">
                <CashSection section={data.operating} headerClass="text-emerald-700 border-emerald-200" />
                <CashSection section={data.investing} headerClass="text-blue-700 border-blue-200" />
                <CashSection section={data.financing} headerClass="text-purple-700 border-purple-200" />
                <div className="border-t-2 border-gray-300 pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Kas Awal Periode</span>
                    <span className="font-medium">{formatCurrency(data.beginning_cash || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Kenaikan / (Penurunan) Kas Bersih</span>
                    <span className={`font-medium ${(data.net_change || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {formatCurrency(data.net_change || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
                    <span className="text-gray-800">Kas Akhir Periode</span>
                    <span className="text-blue-600">{formatCurrency(data.ending_cash || 0)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-400 py-10 text-sm">Pilih periode dan klik Tampilkan</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Ringkasan Aktivitas</CardTitle></CardHeader>
          <CardContent>
            {data ? (
              <div className="space-y-5">
                {[
                  { label: 'Operasi', val: data.operating?.total || 0, bg: 'bg-emerald-100', fill: 'bg-emerald-500' },
                  { label: 'Investasi', val: data.investing?.total || 0, bg: 'bg-blue-100', fill: 'bg-blue-500' },
                  { label: 'Pendanaan', val: data.financing?.total || 0, bg: 'bg-purple-100', fill: 'bg-purple-500' },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-gray-700">{s.label}</span>
                      <span className={`font-semibold ${s.val >= 0 ? 'text-gray-800' : 'text-red-500'}`}>
                        {s.val < 0 ? `(${formatCurrency(Math.abs(s.val))})` : formatCurrency(s.val)}
                      </span>
                    </div>
                    <div className={`h-2.5 rounded-full ${s.bg}`}>
                      {s.val !== 0 && (
                        <div className={`h-2.5 rounded-full ${s.fill}`}
                          style={{ width: `${Math.min(100, Math.abs(s.val) / 2000000)}%` }} />
                      )}
                    </div>
                  </div>
                ))}
                <div className={`flex justify-between py-3 px-4 rounded-xl text-sm font-bold mt-2 ${(data.net_change || 0) >= 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
                  <span>Net Perubahan Kas</span>
                  <span>{(data.net_change || 0) < 0 ? `(${formatCurrency(Math.abs(data.net_change))})` : formatCurrency(data.net_change || 0)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-400 mb-1">Kas Awal</div>
                    <div className="font-semibold text-sm text-gray-700">{formatCurrency(data.beginning_cash || 0)}</div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3">
                    <div className="text-xs text-blue-400 mb-1">Kas Akhir</div>
                    <div className="font-semibold text-sm text-blue-700">{formatCurrency(data.ending_cash || 0)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-400 py-10 text-sm">Data belum dimuat</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Sub-component: Closing Periode ───────────────────────────────
function TabClosing() {
  const { canDo } = useAuthStore()
  const canEdit = canDo('accounting.closing', 'edit')
  const { data, refetch } = useApi(financeGlApi.getPeriods)
  const periods = data?.value || []

  const { submit: doClose, loading: closing } = useSubmit(financeGlApi.closePeriod, {
    successMsg: 'Periode berhasil ditutup',
    onSuccess: refetch,
  })
  const { submit: doReopen, loading: reopening } = useSubmit(financeGlApi.reopenPeriod, {
    successMsg: 'Periode berhasil dibuka kembali',
    onSuccess: refetch,
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
          <div className="text-2xl font-bold text-emerald-700">{periods.filter(p => p.status === 'closed').length}</div>
          <div className="text-xs text-emerald-600 mt-1 font-medium">Periode Closed</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
          <div className="text-2xl font-bold text-blue-700">{periods.filter(p => p.status === 'open').length}</div>
          <div className="text-xs text-blue-600 mt-1 font-medium">Periode Open</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200">
          <div className="text-2xl font-bold text-gray-500">{periods.filter(p => p.status === 'future').length}</div>
          <div className="text-xs text-gray-400 mt-1 font-medium">Periode Future</div>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Manajemen Periode Akuntansi</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {periods.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-gray-200 bg-white">
                <div className="flex items-center gap-3 min-w-0">
                  {periodStatusBadge(p.status)}
                  <span className="font-semibold text-sm text-gray-800">{p.period}</span>
                  {p.closed_by && (
                    <span className="text-xs text-gray-400 hidden sm:inline">
                      Ditutup oleh {p.closed_by} &bull; {p.closed_at}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canEdit && p.status === 'open' && (
                    <Button size="sm" icon={<Lock size={12} />} loading={closing} onClick={() => doClose(p.id)}>
                      Tutup Periode
                    </Button>
                  )}
                  {canEdit && p.status === 'closed' && (
                    <Button size="sm" variant="secondary" icon={<Unlock size={12} />} loading={reopening} onClick={() => doReopen(p.id)}>
                      Buka Kembali
                    </Button>
                  )}
                  {p.status === 'future' && <span className="text-xs text-gray-400 italic pr-1">Belum aktif</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-xs text-amber-700 leading-relaxed">
              <strong>Perhatian:</strong> Menutup periode akan mengunci semua jurnal pada periode tersebut.
              Membuka kembali periode yang sudah ditutup akan dicatat dalam audit log dan memerlukan persetujuan Superadmin.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Sub-component: Laporan Perbandingan ──────────────────────────
function TabComparative() {
  const [subTab, setSubTab] = useState('income')
  const { data: incData } = useApi(financeGlApi.getComparativeIncome)
  const { data: bsData } = useApi(financeGlApi.getComparativeBalance)

  const periods = incData?.periods || []
  const bsDates = bsData?.dates || []

  const varBadge = (cur, prev) => {
    if (prev == null || prev === 0) return null
    const pct = ((cur - prev) / Math.abs(prev) * 100).toFixed(1)
    const pos = parseFloat(pct) >= 0
    return <span className={`text-xs font-semibold ${pos ? 'text-emerald-600' : 'text-red-500'}`}>{pos ? '+' : ''}{pct}%</span>
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[{ id: 'income', label: 'Laba Rugi' }, { id: 'balance', label: 'Neraca' }].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${subTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'income' && (
        <Card>
          <CardHeader><CardTitle>Laporan Laba Rugi — Perbandingan</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 min-w-48">Keterangan</th>
                    {periods.map((p, i) => <th key={i} className="px-3 py-2 text-right text-xs font-semibold text-gray-500 min-w-36">{p}</th>)}
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-400 w-20">vs Bln Lalu</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-gray-50">
                    <td colSpan={periods.length + 2} className="px-3 py-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide">PENDAPATAN</td>
                  </tr>
                  {(incData?.revenue || []).map((r, i) => (
                    <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2 pl-6 text-gray-700">{r.account}</td>
                      {(r.values || []).map((v, j) => <td key={j} className="px-3 py-2 text-right text-gray-700">{formatCurrency(v)}</td>)}
                      <td className="px-3 py-2 text-right">{varBadge(r.values?.[0], r.values?.[1])}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-gray-200 bg-emerald-50 font-semibold">
                    <td className="px-3 py-2 text-gray-800">Total Pendapatan</td>
                    {(incData?.revenue_totals || []).map((v, i) => <td key={i} className="px-3 py-2 text-right text-emerald-700">{formatCurrency(v)}</td>)}
                    <td className="px-3 py-2 text-right">{varBadge(incData?.revenue_totals?.[0], incData?.revenue_totals?.[1])}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td colSpan={periods.length + 2} className="px-3 py-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide">BEBAN</td>
                  </tr>
                  {(incData?.expenses || []).map((e, i) => (
                    <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2 pl-6 text-gray-700">{e.account}</td>
                      {(e.values || []).map((v, j) => <td key={j} className="px-3 py-2 text-right text-red-500">({formatCurrency(v)})</td>)}
                      <td className="px-3 py-2 text-right">{varBadge(e.values?.[0], e.values?.[1])}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-gray-200 bg-red-50 font-semibold">
                    <td className="px-3 py-2 text-gray-800">Total Beban</td>
                    {(incData?.expense_totals || []).map((v, i) => <td key={i} className="px-3 py-2 text-right text-red-600">({formatCurrency(v)})</td>)}
                    <td className="px-3 py-2 text-right">{varBadge(incData?.expense_totals?.[0], incData?.expense_totals?.[1])}</td>
                  </tr>
                  <tr className="border-t-2 border-gray-300 bg-blue-50">
                    <td className="px-3 py-3 font-bold text-gray-800 text-base">LABA BERSIH</td>
                    {(incData?.net_profit || []).map((v, i) => <td key={i} className="px-3 py-3 text-right font-bold text-base text-blue-700">{formatCurrency(v)}</td>)}
                    <td className="px-3 py-3 text-right">{varBadge(incData?.net_profit?.[0], incData?.net_profit?.[1])}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {subTab === 'balance' && (
        <Card>
          <CardHeader><CardTitle>Neraca — Perbandingan</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 min-w-56">Keterangan</th>
                    {bsDates.map((d, i) => <th key={i} className="px-3 py-2 text-right text-xs font-semibold text-gray-500 min-w-36">{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-gray-50"><td colSpan={3} className="px-3 py-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide">AKTIVA LANCAR</td></tr>
                  {(bsData?.assets?.current || []).map((a, i) => (
                    <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2 pl-6 text-gray-700">{a.account}</td>
                      {(a.values || []).map((v, j) => <td key={j} className="px-3 py-2 text-right text-gray-700">{formatCurrency(v)}</td>)}
                    </tr>
                  ))}
                  <tr className="border-t border-gray-200 bg-blue-50 font-semibold">
                    <td className="px-3 py-2 pl-4 text-gray-800">Total Aktiva Lancar</td>
                    {(bsData?.assets?.current_totals || []).map((v, i) => <td key={i} className="px-3 py-2 text-right text-blue-700">{formatCurrency(v)}</td>)}
                  </tr>
                  <tr className="bg-gray-50"><td colSpan={3} className="px-3 py-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide">AKTIVA TETAP</td></tr>
                  {(bsData?.assets?.fixed || []).map((a, i) => (
                    <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2 pl-6 text-gray-700">{a.account}</td>
                      {(a.values || []).map((v, j) => (
                        <td key={j} className={`px-3 py-2 text-right ${v < 0 ? 'text-red-500' : 'text-gray-700'}`}>
                          {v < 0 ? `(${formatCurrency(Math.abs(v))})` : formatCurrency(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t border-gray-200 bg-blue-50 font-semibold">
                    <td className="px-3 py-2 pl-4 text-gray-800">Total Aktiva Tetap</td>
                    {(bsData?.assets?.fixed_totals || []).map((v, i) => <td key={i} className="px-3 py-2 text-right text-blue-700">{formatCurrency(v)}</td>)}
                  </tr>
                  <tr className="border-t-2 border-gray-300 bg-blue-100">
                    <td className="px-3 py-2 font-bold text-gray-800">TOTAL AKTIVA</td>
                    {(bsData?.assets?.total || []).map((v, i) => <td key={i} className="px-3 py-2 text-right font-bold text-blue-800">{formatCurrency(v)}</td>)}
                  </tr>
                  <tr className="bg-gray-50"><td colSpan={3} className="px-3 py-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide">KEWAJIBAN</td></tr>
                  {(bsData?.liabilities?.current || []).map((a, i) => (
                    <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2 pl-6 text-gray-700">{a.account}</td>
                      {(a.values || []).map((v, j) => <td key={j} className="px-3 py-2 text-right text-gray-700">{formatCurrency(v)}</td>)}
                    </tr>
                  ))}
                  <tr className="border-t border-gray-200 bg-orange-50 font-semibold">
                    <td className="px-3 py-2 pl-4 text-gray-800">Total Kewajiban</td>
                    {(bsData?.liabilities?.total || []).map((v, i) => <td key={i} className="px-3 py-2 text-right text-orange-700">{formatCurrency(v)}</td>)}
                  </tr>
                  <tr className="bg-gray-50"><td colSpan={3} className="px-3 py-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide">EKUITAS</td></tr>
                  {(bsData?.equity?.items || []).map((a, i) => (
                    <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2 pl-6 text-gray-700">{a.account}</td>
                      {(a.values || []).map((v, j) => <td key={j} className="px-3 py-2 text-right text-gray-700">{formatCurrency(v)}</td>)}
                    </tr>
                  ))}
                  <tr className="border-t border-gray-200 bg-orange-50 font-semibold">
                    <td className="px-3 py-2 pl-4 text-gray-800">Total Ekuitas</td>
                    {(bsData?.equity?.total || []).map((v, i) => <td key={i} className="px-3 py-2 text-right text-orange-700">{formatCurrency(v)}</td>)}
                  </tr>
                  <tr className="border-t-2 border-gray-300 bg-orange-100">
                    <td className="px-3 py-2 font-bold text-gray-800">TOTAL KEWAJIBAN + EKUITAS</td>
                    {(bsData?.liab_equity_total || []).map((v, i) => <td key={i} className="px-3 py-2 text-right font-bold text-orange-800">{formatCurrency(v)}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Static definitions (columns, initial state) ──────────────────
const emptyCOA = { code: '', name: '', type: 'account' }
const emptyJE = { ref: '', date: '', description: '', ref_type: 'MANUAL', lines: [{ account_name: '', debit: '', credit: '', description: '' }] }

const coaColumns = [
  { key: 'code', label: 'Kode', sortable: true, render: (v) => <span className="font-mono text-xs text-blue-600 font-semibold">{v}</span> },
  { key: 'name', label: 'Nama Akun', sortable: true, render: (v, row) => (
    <span className={row.type === 'header' ? 'font-bold text-gray-800' : 'font-medium'}>{v}</span>
  )},
  { key: 'type', label: 'Tipe', render: (v) => typeBadge(v) },
]

const journalColumns = [
  { key: 'ref', label: 'Ref', sortable: true, render: (v) => <span className="font-mono text-xs text-blue-600 font-semibold">{v}</span> },
  { key: 'date', label: 'Tanggal', sortable: true, render: (v) => v ? formatDate(v) : '—' },
  { key: 'description', label: 'Keterangan', render: (v) => <span className="font-medium">{v}</span> },
  { key: 'ref_type', label: 'Sumber', render: (v) => refTypeBadge(v) },
  { key: 'total_debit', label: 'Debit', render: (v) => <span className="font-medium text-emerald-600">{formatCurrency(v || 0)}</span> },
  { key: 'total_credit', label: 'Kredit', render: (v) => <span className="font-medium text-red-500">{formatCurrency(v || 0)}</span> },
]

const VALID_ACCOUNTING_TABS = ['dashboard', 'journal', 'coa', 'gl', 'trial-balance', 'cashflow', 'closing', 'comparative']

// ─── Main Component ────────────────────────────────────────────────
export default function Accounting() {
  const { tab } = useParams()
  const navigate = useNavigate()
  const activeTab = VALID_ACCOUNTING_TABS.includes(tab) ? tab : 'dashboard'
  useEffect(() => {
    if (!VALID_ACCOUNTING_TABS.includes(tab)) navigate('/accounting/dashboard', { replace: true })
  }, [tab])
  const { canDo } = useAuthStore()
  const menuKey = `accounting.${activeTab}`
  const canAdd = canDo(menuKey, 'add')
  const [showCOAModal, setShowCOAModal] = useState(false)
  const [showJEModal, setShowJEModal] = useState(false)
  const [coaForm, setCOAForm] = useState(emptyCOA)
  const [jeForm, setJEForm] = useState(emptyJE)
  const coaRef = useRef(null)
  const jeRef = useRef(null)

  const { data: plData } = useApi(accountingApi.getPL)
  const { data: bsData } = useApi(accountingApi.getBalanceSheet)
  const pl = plData || {}
  const bs = bsData || {}

  const { submit: submitCOA, loading: savingCOA } = useSubmit(accountingApi.createCOA, {
    successMsg: 'Akun berhasil ditambahkan',
    onSuccess: () => { setShowCOAModal(false); setCOAForm(emptyCOA); coaRef.current?.refetch() },
  })
  const { submit: submitJE, loading: savingJE } = useSubmit(accountingApi.createJournal, {
    successMsg: 'Jurnal berhasil disimpan',
    onSuccess: () => { setShowJEModal(false); setJEForm(emptyJE); jeRef.current?.refetch() },
  })

  const addLine = () => setJEForm(f => ({ ...f, lines: [...f.lines, { account_name: '', debit: '', credit: '', description: '' }] }))
  const updateLine = (idx, field, val) => setJEForm(f => {
    const lines = [...f.lines]
    lines[idx] = { ...lines[idx], [field]: val }
    return { ...f, lines }
  })
  const removeLine = (idx) => setJEForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }))

  const totalDebit = jeForm.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
  const totalCredit = jeForm.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit

  const sectionTitle = {
    dashboard: 'Laporan', journal: 'Jurnal', coa: 'COA', gl: 'Buku Besar', 'trial-balance': 'Neraca Saldo',
    cashflow: 'Arus Kas', closing: 'Closing', comparative: 'Perbandingan',
  }[activeTab]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-semibold text-slate-800">{sectionTitle}</h1>
        {canAdd && activeTab === 'coa' && <Button size="sm" icon={<Plus />} onClick={() => setShowCOAModal(true)}>Tambah Akun</Button>}
        {canAdd && activeTab === 'journal' && <Button size="sm" icon={<Plus />} onClick={() => setShowJEModal(true)}>Buat Jurnal</Button>}
      </div>

      {/* ── Laporan Dashboard ── */}
      {activeTab === 'dashboard' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Pendapatan Bulan Ini" value={formatCurrency(pl.revenue?.total || 497500000)} trend={8.3} icon={ArrowDownLeft} color="emerald" />
            <StatCard title="Total Beban" value={formatCurrency(pl.expenses?.total || 305500000)} trend={3.1} icon={ArrowUpRight} color="red" />
            <StatCard title="Laba Bersih" value={formatCurrency(pl.net_profit || 192000000)} trend={14.7} icon={TrendingUp} color="blue" />
            <StatCard title="Total Aset" value={formatCurrency(bs.assets?.total || 1302500000)} icon={DollarSign} color="purple" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Laporan Laba Rugi — Juni 2026</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="font-semibold text-gray-700">PENDAPATAN</span>
                    <span className="font-semibold">{formatCurrency(pl.revenue?.total || 497500000)}</span>
                  </div>
                  {[
                    { label: 'Pendapatan Penjualan', val: pl.revenue?.pendapatan_penjualan || 485000000 },
                    { label: 'Pendapatan Lain-lain', val: pl.revenue?.pendapatan_lain || 12500000 },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-1.5 text-sm pl-4">
                      <span className="text-gray-600">{r.label}</span>
                      <span>{formatCurrency(r.val)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 border-t border-gray-100 mt-2">
                    <span className="font-semibold text-gray-700">BEBAN</span>
                    <span className="font-semibold text-red-600">({formatCurrency(pl.expenses?.total || 305500000)})</span>
                  </div>
                  {[
                    { label: 'Beban Gaji', val: pl.expenses?.beban_gaji || 72000000 },
                    { label: 'Beban Bahan Baku', val: pl.expenses?.beban_bahan_baku || 180000000 },
                    { label: 'Beban Operasional', val: pl.expenses?.beban_operasional || 45000000 },
                    { label: 'Beban Penyusutan', val: pl.expenses?.beban_penyusutan || 8500000 },
                  ].map(e => (
                    <div key={e.label} className="flex justify-between py-1.5 text-sm pl-4">
                      <span className="text-gray-600">{e.label}</span>
                      <span className="text-red-500">({formatCurrency(e.val)})</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-3 border-t-2 border-gray-200 mt-1">
                    <span className="font-bold text-gray-800">LABA BERSIH</span>
                    <span className="font-bold text-blue-600 text-lg">{formatCurrency(pl.net_profit || 192000000)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Neraca — Per 28 Juni 2026</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="font-semibold text-gray-700">AKTIVA</span>
                    <span className="font-semibold">{formatCurrency(bs.assets?.total || 1302500000)}</span>
                  </div>
                  {[
                    { label: 'Kas & Bank', val: bs.assets?.kas || 157000000 },
                    { label: 'Piutang Usaha', val: bs.assets?.piutang || 85000000 },
                    { label: 'Persediaan', val: bs.assets?.persediaan || 210000000 },
                    { label: 'Aset Tetap (Neto)', val: bs.assets?.aset_tetap || 841500000 },
                  ].map(a => (
                    <div key={a.label} className="flex justify-between py-1.5 text-sm pl-4">
                      <span className="text-gray-600">{a.label}</span>
                      <span>{formatCurrency(a.val)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 border-t border-gray-100 mt-2">
                    <span className="font-semibold text-gray-700">KEWAJIBAN + EKUITAS</span>
                    <span className="font-semibold">{formatCurrency((bs.liabilities?.total || 106000000) + (bs.equity?.total || 1196500000))}</span>
                  </div>
                  {[
                    { label: 'Hutang Usaha', val: bs.liabilities?.hutang_usaha || 95000000 },
                    { label: 'Hutang Pajak', val: bs.liabilities?.hutang_pajak || 11000000 },
                    { label: 'Modal Disetor', val: bs.equity?.modal || 800000000 },
                    { label: 'Laba Ditahan & Berjalan', val: bs.equity?.laba || 396500000 },
                  ].map(l => (
                    <div key={l.label} className="flex justify-between py-1.5 text-sm pl-4">
                      <span className="text-gray-600">{l.label}</span>
                      <span>{formatCurrency(l.val)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ── Jurnal Umum ── */}
      {activeTab === 'journal' && (
        <Card>
          <CardHeader><CardTitle>Jurnal Umum</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              ref={jeRef}
              columns={journalColumns}
              fetchFn={accountingApi.getJournal}
              searchPlaceholder="Cari ref, keterangan..."
              defaultPageSize={10}
              toolbar={canAdd && <Button size="sm" icon={<Plus />} onClick={() => setShowJEModal(true)}>Buat Jurnal</Button>}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Chart of Accounts ── */}
      {activeTab === 'coa' && (
        <Card>
          <CardHeader><CardTitle>Chart of Accounts</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              ref={coaRef}
              columns={coaColumns}
              fetchFn={accountingApi.getCOA}
              searchPlaceholder="Cari kode atau nama akun..."
              defaultPageSize={20}
              toolbar={canAdd && <Button size="sm" icon={<Plus />} onClick={() => setShowCOAModal(true)}>Tambah Akun</Button>}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Phase 25 Tabs ── */}
      {activeTab === 'gl' && <TabGL />}
      {activeTab === 'trial-balance' && <TabTrialBalance />}
      {activeTab === 'cashflow' && <TabCashFlow />}
      {activeTab === 'closing' && <TabClosing />}
      {activeTab === 'comparative' && <TabComparative />}

      {/* ── COA Modal ── */}
      <Modal open={showCOAModal} onClose={() => setShowCOAModal(false)} title="Tambah Akun Baru"
        footer={<><Button variant="secondary" onClick={() => setShowCOAModal(false)}>Batal</Button><Button loading={savingCOA} onClick={() => submitCOA(coaForm)}>Simpan</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Kode Akun" placeholder="1-1100" value={coaForm.code} onChange={e => setCOAForm({ ...coaForm, code: e.target.value })} />
            <Select label="Tipe" value={coaForm.type} onChange={e => setCOAForm({ ...coaForm, type: e.target.value })}
              options={[{ value: 'header', label: 'Header' }, { value: 'account', label: 'Akun' }]} />
          </div>
          <Input label="Nama Akun" value={coaForm.name} onChange={e => setCOAForm({ ...coaForm, name: e.target.value })} />
        </div>
      </Modal>

      {/* ── Journal Entry Modal ── */}
      <Modal open={showJEModal} onClose={() => setShowJEModal(false)} title="Buat Jurnal Umum" size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowJEModal(false)}>Batal</Button>
            <Button
              loading={savingJE}
              disabled={!isBalanced}
              onClick={() => submitJE({ ...jeForm, lines: jeForm.lines.map(l => ({ ...l, debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0 })) })}
            >
              {isBalanced ? 'Simpan Jurnal' : `Belum Balance (${formatCurrency(Math.abs(totalDebit - totalCredit))})`}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nomor Referensi" placeholder="JE-005" value={jeForm.ref} onChange={e => setJEForm({ ...jeForm, ref: e.target.value })} />
            <Input label="Tanggal" type="date" value={jeForm.date} onChange={e => setJEForm({ ...jeForm, date: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Keterangan" value={jeForm.description} onChange={e => setJEForm({ ...jeForm, description: e.target.value })} />
            <Select label="Tipe Sumber" value={jeForm.ref_type} onChange={e => setJEForm({ ...jeForm, ref_type: e.target.value })}
              options={['MANUAL', 'PO', 'PAYROLL', 'INVOICE', 'GRN'].map(t => ({ value: t, label: t }))} />
          </div>
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Nama Akun</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 w-32">Debit</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 w-32">Kredit</th>
                  <th className="px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {jeForm.lines.map((line, idx) => (
                  <tr key={idx} className="border-t border-gray-50">
                    <td className="px-2 py-1.5">
                      <input className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="Nama akun..." value={line.account_name} onChange={e => updateLine(idx, 'account_name', e.target.value)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <input className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                        type="number" placeholder="0" value={line.debit} onChange={e => updateLine(idx, 'debit', e.target.value)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <input className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                        type="number" placeholder="0" value={line.credit} onChange={e => updateLine(idx, 'credit', e.target.value)} />
                    </td>
                    <td className="px-1 py-1.5">
                      {jeForm.lines.length > 2 && (
                        <button onClick={() => removeLine(idx)} className="text-gray-300 hover:text-red-400 text-xs px-1">✕</button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td className="px-3 py-2 text-xs font-semibold text-gray-500">Total</td>
                  <td className="px-3 py-2 text-right text-xs font-semibold text-emerald-600">{formatCurrency(totalDebit)}</td>
                  <td className="px-3 py-2 text-right text-xs font-semibold text-red-500">{formatCurrency(totalCredit)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
          <Button variant="secondary" size="sm" onClick={addLine}>+ Tambah Baris</Button>
        </div>
      </Modal>
    </div>
  )
}
