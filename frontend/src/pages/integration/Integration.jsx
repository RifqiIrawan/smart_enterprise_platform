import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import DataTable from '@/components/ui/DataTable'
import { useApi, useSubmit } from '@/hooks/useApi'
import { integrationApi } from '@/api'
import { useAuthStore } from '@/store/authStore'
import {
  Upload, Download, Key, Webhook, Package, Users, BookOpen,
  Warehouse, FileText, CheckCircle2, XCircle, AlertTriangle,
  Plus, Trash2, Eye, RefreshCw, Copy, Activity, Clock, Globe,
  ArrowRight, ChevronRight, Shield, Zap, BarChart3,
} from 'lucide-react'

// ─── Import Tab ──────────────────────────────────────────────────────────────

const IMPORT_ICONS = {
  package: Package,
  users: Users,
  'book-open': BookOpen,
  warehouse: Warehouse,
  'file-text': FileText,
}

function ImportTab() {
  const { canDo } = useAuthStore()
  const canExecute = canDo('integration.import', 'add')
  const [step, setStep] = useState('select') // select | preview | done
  const [selectedType, setSelectedType] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)

  const { data: templates } = useApi(() => integrationApi.getImportTemplates())
  const { submit: runPreview, loading: previewing } = useSubmit(
    () => integrationApi.previewImport({ type: selectedType?.type }),
    { onSuccess: (data) => { setPreview(data); setStep('preview') } }
  )
  const { submit: runExecute, loading: executing } = useSubmit(
    () => integrationApi.executeImport({ type: selectedType?.type }),
    { onSuccess: (data) => { setResult(data); setStep('done') } }
  )

  const downloadTemplate = async (type) => {
    try {
      const res = await integrationApi.downloadTemplate(type)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url; a.download = `template_import_${type}.csv`; a.click()
      URL.revokeObjectURL(url)
    } catch {}
  }

  const tpl = templates?.value ?? []

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold">Import Berhasil</h3>
        <p className="text-muted-foreground text-center max-w-md">{result?.message}</p>
        <div className="flex gap-6 mt-2">
          <div className="text-center"><div className="text-2xl font-bold text-green-600">{result?.imported}</div><div className="text-xs text-muted-foreground">Diimport</div></div>
          <div className="text-center"><div className="text-2xl font-bold text-amber-600">{result?.warnings}</div><div className="text-xs text-muted-foreground">Peringatan</div></div>
          <div className="text-center"><div className="text-2xl font-bold text-red-600">{result?.skipped}</div><div className="text-xs text-muted-foreground">Dilewati</div></div>
        </div>
        <Button onClick={() => { setStep('select'); setSelectedType(null); setPreview(null); setResult(null) }}>
          Import Data Lain
        </Button>
      </div>
    )
  }

  if (step === 'preview' && preview) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setStep('select')}>&larr; Kembali</Button>
          <span className="text-sm text-muted-foreground">Preview: {selectedType?.name}</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Baris', value: preview.total_rows, color: 'text-foreground' },
            { label: 'Valid', value: preview.valid_rows, color: 'text-green-600' },
            { label: 'Peringatan', value: preview.warning_rows, color: 'text-amber-600' },
            { label: 'Error', value: preview.error_rows, color: 'text-red-600' },
          ].map(s => (
            <Card key={s.label} className="text-center p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Detail Preview</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-64 overflow-y-auto">
              {(preview.preview ?? []).map(row => (
                <div key={row.row} className="flex items-start gap-3 px-4 py-2 text-sm">
                  <span className="text-muted-foreground w-10 shrink-0">Brs {row.row}</span>
                  {row.status === 'valid' && <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />}
                  {row.status === 'error' && <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
                  {row.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs text-muted-foreground">
                      {Object.entries(row.data ?? {}).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </div>
                    {row.error && <div className="text-xs text-red-600 mt-0.5">{row.error}</div>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {preview.error_rows > 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {preview.error_rows} baris akan dilewati. Hanya baris valid yang akan diimport.
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setStep('select')}>Batal</Button>
          {canExecute && (
            <Button onClick={runExecute} disabled={executing || preview.valid_rows === 0}>
              {executing ? 'Mengimport...' : `Import ${preview.valid_rows} Baris Valid`}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-1">Pilih Tipe Data</h3>
        <p className="text-sm text-muted-foreground">Download template CSV, isi data, lalu upload untuk diproses</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tpl.map(t => {
          const Icon = IMPORT_ICONS[t.icon] ?? FileText
          const isSelected = selectedType?.type === t.type
          return (
            <div
              key={t.type}
              onClick={() => setSelectedType(t)}
              className={`border rounded-xl p-4 cursor-pointer transition-all hover:border-primary ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted"><Icon className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.description}</div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm" variant="outline"
                      className="h-7 text-xs"
                      onClick={(e) => { e.stopPropagation(); downloadTemplate(t.type) }}
                    >
                      <Download className="w-3 h-3 mr-1" /> Template
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedType && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="font-medium text-sm">Import {selectedType.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Upload file CSV dengan format template · Field: {selectedType.fields?.join(', ')}
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx" className="hidden" />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-1" /> Pilih File
              </Button>
              <Button size="sm" onClick={runPreview} disabled={previewing}>
                {previewing ? 'Memproses...' : <>Preview <ChevronRight className="w-4 h-4 ml-1" /></>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ImportHistorySection />
    </div>
  )
}

function ImportHistorySection() {
  const [version, setVersion] = useState(0)
  const tableRef = useRef(null)
  const fetchHistory = useCallback(
    (params) => integrationApi.getImportHistory(params),
    [version]
  )
  const columns = [
    { key: 'type_label', header: 'Tipe Data', sortable: true },
    { key: 'total_rows', header: 'Total', sortable: true },
    {
      key: 'imported', header: 'Diimport',
      render: (v, r) => <span className={r.status === 'success' ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>{v}</span>
    },
    { key: 'skipped', header: 'Dilewati', render: v => <span className="text-red-600">{v}</span> },
    {
      key: 'status', header: 'Status',
      render: v => (
        <Badge variant={v === 'success' ? 'default' : v === 'partial' ? 'secondary' : 'destructive'}>
          {v === 'success' ? 'Sukses' : v === 'partial' ? 'Parsial' : 'Gagal'}
        </Badge>
      )
    },
    { key: 'created_by', header: 'Oleh' },
    { key: 'created_at', header: 'Waktu', render: v => new Date(v).toLocaleString('id-ID') },
  ]

  return (
    <div>
      <h3 className="font-semibold mb-3">Riwayat Import</h3>
      <DataTable
        ref={tableRef}
        fetchFn={fetchHistory}
        columns={columns}
        searchPlaceholder="Cari riwayat..."
      />
    </div>
  )
}

// ─── Export Tab ──────────────────────────────────────────────────────────────

const EXPORT_TYPES = [
  { type: 'products', label: 'Master Produk', icon: Package, description: 'Semua data produk aktif termasuk harga dan stok' },
  { type: 'employees', label: 'Master Karyawan', icon: Users, description: 'Data karyawan aktif dengan informasi gaji dan jabatan' },
  { type: 'coa', label: 'Chart of Accounts', icon: BookOpen, description: 'Semua akun beserta hierarki dan saldo terakhir' },
  { type: 'inventory', label: 'Stok Saat Ini', icon: Warehouse, description: 'Posisi stok per gudang dengan nilai inventory' },
  { type: 'journals', label: 'Jurnal Transaksi', icon: FileText, description: 'Semua jurnal dalam rentang periode yang dipilih' },
  { type: 'sales-orders', label: 'Sales Orders', icon: FileText, description: 'Daftar SO dengan status dan nilai per periode' },
  { type: 'purchase-orders', label: 'Purchase Orders', icon: FileText, description: 'Daftar PO dengan status dan nilai per periode' },
  { type: 'ar-aging', label: 'Aging Piutang', icon: BarChart3, description: 'Laporan aging piutang per customer' },
  { type: 'ap-aging', label: 'Aging Hutang', icon: BarChart3, description: 'Laporan aging hutang per vendor' },
]

function ExportTab() {
  const [exporting, setExporting] = useState(null)
  const [period, setPeriod] = useState({ from: '2026-01-01', to: '2026-06-30' })

  const doExport = async (type, label) => {
    setExporting(type)
    try {
      const res = await integrationApi.exportData(type, period)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url; a.download = `export_${type}_${period.from}_${period.to}.csv`; a.click()
      URL.revokeObjectURL(url)
    } catch {}
    setExporting(null)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> Filter Periode</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="text-xs mb-1 block">Dari</Label>
              <Input type="date" value={period.from} onChange={e => setPeriod(p => ({ ...p, from: e.target.value }))} className="h-8 text-sm" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground mt-4 shrink-0" />
            <div className="flex-1">
              <Label className="text-xs mb-1 block">Sampai</Label>
              <Input type="date" value={period.to} onChange={e => setPeriod(p => ({ ...p, to: e.target.value }))} className="h-8 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXPORT_TYPES.map(({ type, label, icon: Icon, description }) => (
          <div key={type} className="border rounded-xl p-4 hover:border-primary/50 transition-all group">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
                <Button
                  size="sm" variant="outline" className="h-7 text-xs mt-2"
                  onClick={() => doExport(type, label)}
                  disabled={exporting === type}
                >
                  {exporting === type
                    ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Mengekspor...</>
                    : <><Download className="w-3 h-3 mr-1" /> Export CSV</>
                  }
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── API Keys Tab ─────────────────────────────────────────────────────────────

const ALL_PERMISSIONS = [
  { value: 'products.read', label: 'Produk — Baca' },
  { value: 'inventory.read', label: 'Inventori — Baca' },
  { value: 'orders.write', label: 'Order — Tulis' },
  { value: 'sales.read', label: 'Penjualan — Baca' },
  { value: 'finance.read', label: 'Keuangan — Baca' },
  { value: 'reports.read', label: 'Laporan — Baca' },
  { value: 'analytics.read', label: 'Analitik — Baca' },
  { value: 'webhooks.read', label: 'Webhook — Baca' },
]

function APIKeysTab() {
  const { canDo } = useAuthStore()
  const canAdd = canDo('integration.apikeys', 'add')
  const canDelete = canDo('integration.apikeys', 'delete')
  const { data, loading, refetch } = useApi(() => integrationApi.getAPIKeys())
  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState(null)
  const [form, setForm] = useState({ name: '', permissions: [] })
  const [activeKeyTab, setActiveKeyTab] = useState('keys') // keys | logs
  const logsRef = useRef(null)
  const [logsVersion, setLogsVersion] = useState(0)

  const { submit: create, loading: creating } = useSubmit(
    () => integrationApi.createAPIKey(form),
    { onSuccess: (d) => { setNewKey(d); setShowCreate(false); setForm({ name: '', permissions: [] }); refetch() } }
  )
  const { submit: revoke } = useSubmit(
    (id) => integrationApi.revokeAPIKey(id),
    { onSuccess: () => refetch() }
  )

  const fetchLogs = useCallback((params) => integrationApi.getAPIUsageLogs(params), [logsVersion])

  const logColumns = [
    { key: 'api_key_name', header: 'API Key', sortable: true },
    { key: 'endpoint', header: 'Endpoint', render: v => <code className="text-xs bg-muted px-1 py-0.5 rounded">{v}</code> },
    {
      key: 'status', header: 'Status',
      render: v => <Badge variant={v < 400 ? 'default' : 'destructive'} className="text-xs">{v}</Badge>
    },
    { key: 'latency_ms', header: 'Latensi', render: v => `${v}ms` },
    { key: 'ip', header: 'IP' },
    { key: 'timestamp', header: 'Waktu', render: v => new Date(v).toLocaleString('id-ID') },
  ]

  const keys = data?.value ?? []

  return (
    <div className="space-y-4">
      {newKey && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2 font-medium text-green-800"><Shield className="w-4 h-4" /> API Key Berhasil Dibuat</div>
          <p className="text-xs text-green-700">Simpan key ini sekarang — tidak akan ditampilkan lagi!</p>
          <div className="flex items-center gap-2 bg-white border border-green-300 rounded-lg px-3 py-2">
            <code className="text-xs flex-1 break-all select-all font-mono">{newKey.key}</code>
            <Button size="sm" variant="ghost" className="h-7 shrink-0" onClick={() => navigator.clipboard.writeText(newKey.key)}>
              <Copy className="w-3 h-3" />
            </Button>
          </div>
          <Button size="sm" variant="ghost" className="text-green-700" onClick={() => setNewKey(null)}>Tutup</Button>
        </div>
      )}

      <div className="flex gap-4 border-b">
        {[{ id: 'keys', label: 'API Keys' }, { id: 'logs', label: 'Usage Logs' }].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveKeyTab(t.id)}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeKeyTab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeKeyTab === 'keys' && (
        <>
          {canAdd && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> Buat API Key</Button>
            </div>
          )}

          {showCreate && canAdd && (
            <Card className="border-primary/40">
              <CardHeader className="pb-2"><CardTitle className="text-sm">API Key Baru</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs mb-1 block">Nama / Label</Label>
                  <Input
                    placeholder="cth: Integration Shopee, BI Dashboard"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-2 block">Izin Akses</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_PERMISSIONS.map(p => (
                      <label key={p.value} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.permissions.includes(p.value)}
                          onChange={e => setForm(f => ({
                            ...f,
                            permissions: e.target.checked
                              ? [...f.permissions, p.value]
                              : f.permissions.filter(x => x !== p.value)
                          }))}
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Batal</Button>
                  <Button size="sm" onClick={create} disabled={creating || !form.name}>
                    {creating ? 'Membuat...' : 'Buat Key'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {loading && <div className="text-center py-8 text-muted-foreground text-sm">Memuat...</div>}
            {keys.map(k => (
              <div key={k.id} className="border rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted"><Key className="w-4 h-4" /></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{k.name}</span>
                        <Badge variant={k.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {k.status === 'active' ? 'Aktif' : 'Direvoke'}
                        </Badge>
                      </div>
                      <code className="text-xs text-muted-foreground mt-0.5 block">{k.key_masked}</code>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(k.permissions ?? []).map(p => (
                          <span key={p} className="text-xs bg-muted px-1.5 py-0.5 rounded">{p}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground">Hari ini: <span className="font-medium text-foreground">{k.calls_today}</span> calls</div>
                    <div className="text-xs text-muted-foreground">Bulan ini: <span className="font-medium text-foreground">{k.calls_month}</span> calls</div>
                    <div className="text-xs text-muted-foreground mt-1">Terakhir: {k.last_used}</div>
                    {k.status === 'active' && canDelete && (
                      <Button
                        size="sm" variant="ghost"
                        className="h-6 text-xs text-red-600 hover:text-red-700 mt-1"
                        onClick={() => revoke(k.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeKeyTab === 'logs' && (
        <DataTable
          ref={logsRef}
          fetchFn={fetchLogs}
          columns={logColumns}
          searchPlaceholder="Cari log..."
        />
      )}
    </div>
  )
}

// ─── Webhooks Tab ─────────────────────────────────────────────────────────────

function WebhooksTab() {
  const { canDo } = useAuthStore()
  const canAdd = canDo('integration.webhooks', 'add')
  const canDelete = canDo('integration.webhooks', 'delete')
  const { data, loading, refetch } = useApi(() => integrationApi.getWebhooks())
  const { data: eventsData } = useApi(() => integrationApi.getWebhookEvents())
  const [showCreate, setShowCreate] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState(null)
  const [form, setForm] = useState({ name: '', url: '', events: [] })
  const logsRef = useRef(null)
  const [logsVersion, setLogsVersion] = useState(0)

  const { submit: create, loading: creating } = useSubmit(
    () => integrationApi.createWebhook(form),
    { onSuccess: () => { setShowCreate(false); setForm({ name: '', url: '', events: [] }); refetch() } }
  )
  const { submit: del } = useSubmit(
    (id) => integrationApi.deleteWebhook(id),
    { onSuccess: () => refetch() }
  )

  const fetchLogs = useCallback(
    (params) => integrationApi.getWebhookLogs(selectedWebhook?.id, params),
    [selectedWebhook?.id, logsVersion]
  )

  const allEvents = eventsData?.value?.map(e => e.value) ?? []
  const webhooks = data?.value ?? []

  const logColumns = [
    { key: 'event', header: 'Event', render: v => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{v}</code> },
    {
      key: 'status', header: 'Status',
      render: v => (
        <Badge variant={v === 'success' ? 'default' : 'destructive'} className="text-xs">
          {v === 'success' ? 'Sukses' : 'Gagal'}
        </Badge>
      )
    },
    { key: 'http_status', header: 'HTTP', render: v => <span className={v < 400 ? 'text-green-600' : 'text-red-600'}>{v}</span> },
    { key: 'latency_ms', header: 'Latensi', render: v => `${v}ms` },
    { key: 'error', header: 'Error', render: v => v ? <span className="text-xs text-red-600">{v}</span> : '—' },
    { key: 'timestamp', header: 'Waktu', render: v => new Date(v).toLocaleString('id-ID') },
  ]

  if (selectedWebhook) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedWebhook(null)}>&larr; Kembali</Button>
          <span className="text-sm font-medium">{selectedWebhook.name}</span>
          <span className="text-xs text-muted-foreground">— Log Pengiriman</span>
        </div>
        <DataTable
          ref={logsRef}
          fetchFn={fetchLogs}
          columns={logColumns}
          searchPlaceholder="Cari log..."
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {canAdd && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> Tambah Webhook</Button>
        </div>
      )}

      {showCreate && canAdd && (
        <Card className="border-primary/40">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Webhook Baru</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs mb-1 block">Nama</Label>
              <Input placeholder="cth: Notifikasi SO ke ERP Cabang" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">URL Endpoint</Label>
              <Input placeholder="https://..." value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} className="h-8 text-sm font-mono text-xs" />
            </div>
            <div>
              <Label className="text-xs mb-2 block">Events</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {allEvents.map(ev => (
                  <label key={ev} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.events.includes(ev)}
                      onChange={e => setForm(f => ({
                        ...f,
                        events: e.target.checked ? [...f.events, ev] : f.events.filter(x => x !== ev)
                      }))}
                    />
                    <code className="text-xs">{ev}</code>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Batal</Button>
              <Button size="sm" onClick={create} disabled={creating || !form.name || !form.url}>
                {creating ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {loading && <div className="text-center py-8 text-muted-foreground text-sm">Memuat...</div>}
        {webhooks.map(wh => (
          <div key={wh.id} className="border rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted"><Globe className="w-4 h-4" /></div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{wh.name}</span>
                    <Badge variant={wh.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {wh.status === 'active' ? 'Aktif' : 'Dijeda'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Globe className="w-3 h-3 text-muted-foreground" />
                    <code className="text-xs text-muted-foreground">{wh.url}</code>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(wh.events ?? []).map(ev => (
                      <span key={ev} className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{ev}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <div className="text-xs"><span className="text-green-600 font-medium">{wh.success_count}</span> sukses</div>
                <div className="text-xs"><span className={wh.fail_count > 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>{wh.fail_count}</span> gagal</div>
                <div className="flex gap-1 justify-end mt-1">
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setSelectedWebhook(wh)}>
                    <Activity className="w-3 h-3 mr-1" /> Log
                  </Button>
                  {canDelete && (
                    <Button size="sm" variant="ghost" className="h-6 text-xs text-red-600" onClick={() => del(wh.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const VALID_TABS = ['import', 'export', 'api-keys', 'webhooks']

export default function Integration() {
  const navigate = useNavigate()
  const { tab } = useParams()
  const activeTab = VALID_TABS.includes(tab) ? tab : 'import'
  useEffect(() => {
    if (!VALID_TABS.includes(tab)) navigate('/integration/import', { replace: true })
  }, [tab])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Import Berhasil', value: '12', sub: 'Total import', icon: Upload, color: 'text-green-600 bg-green-50' },
          { label: 'Export Diunduh', value: '34', sub: 'Total export', icon: Download, color: 'text-blue-600 bg-blue-50' },
          { label: 'API Keys Aktif', value: '2', sub: 'dari 3 total', icon: Key, color: 'text-purple-600 bg-purple-50' },
          { label: 'API Calls / Hari', value: '169', sub: 'Rata-rata 7 hari', icon: Activity, color: 'text-amber-600 bg-amber-50' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.color}`}><s.icon className="w-4 h-4" /></div>
                <div>
                  <div className="text-xl font-bold">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {activeTab === 'import' && <ImportTab />}
          {activeTab === 'export' && <ExportTab />}
          {activeTab === 'api-keys' && <APIKeysTab />}
          {activeTab === 'webhooks' && <WebhooksTab />}
        </CardContent>
      </Card>
    </div>
  )
}
