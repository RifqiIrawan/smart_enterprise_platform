import { useState, useEffect, useCallback, forwardRef, useImperativeHandle, Fragment } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight, Plus, Minus } from 'lucide-react'
import EmptyState from './EmptyState'

const DataTable = forwardRef(function DataTable(
  { columns, fetchFn, actions, toolbar, searchPlaceholder = 'Cari...', defaultPageSize = 10 },
  ref
) {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [sortKey, setSortKey] = useState('')
  const [sortDir, setSortDir] = useState('asc')
  const [tick, setTick] = useState(0)
  const [expandedRows, setExpandedRows] = useState(new Set())

  useImperativeHandle(ref, () => ({ refetch: () => setTick((t) => t + 1) }))

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [search])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setExpandedRows(new Set())
    try {
      const params = { '$top': pageSize, '$skip': page * pageSize, '$count': true }
      if (debouncedSearch) params['$search'] = debouncedSearch
      if (sortKey) params['$orderby'] = `${sortKey} ${sortDir}`
      const res = await fetchFn(params)
      setData(res?.value ?? [])
      setTotal(res?.['@odata.count'] ?? 0)
    } catch {
      setData([]); setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [fetchFn, page, pageSize, debouncedSearch, sortKey, sortDir])

  useEffect(() => { fetchData() }, [fetchData, tick])

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(0)
  }

  const toggleExpand = (key) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const totalPages = Math.ceil(total / pageSize) || 1
  const from = total === 0 ? 0 : page * pageSize + 1
  const to = Math.min((page + 1) * pageSize, total)
  const colSpan = columns.length + (actions ? 1 : 0) + 1

  const pageNumbers = () => {
    const pages = []
    let start = Math.max(0, page - 2)
    let end = Math.min(totalPages - 1, start + 4)
    if (end - start < 4) start = Math.max(0, end - 4)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  const SortIcon = ({ col }) => {
    if (!col.sortable) return null
    if (sortKey !== col.key) return <ChevronsUpDown className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
    return sortDir === 'asc'
      ? <ChevronUp className="h-3.5 w-3.5 text-indigo-500" />
      : <ChevronDown className="h-3.5 w-3.5 text-indigo-500" />
  }

  return (
    <div className="space-y-3">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl w-56 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all placeholder:text-slate-400 shadow-sm"
          />
        </div>
        {/* Right controls */}
        <div className="flex items-center gap-2">
          {toolbar}
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }}
            className="text-xs border border-slate-200 rounded-xl px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 cursor-pointer text-slate-600 shadow-sm"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n} baris</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {/* Expand column */}
              <th className="w-8 px-2 py-2.5" />
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={[
                    'group px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap',
                    col.sortable ? 'cursor-pointer select-none hover:text-slate-800 hover:bg-slate-100/80 transition-all' : '',
                    col.className ?? '',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col} />
                  </div>
                </th>
              ))}
              {actions && (
                <th className="w-px px-3 py-2.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Aksi
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-slate-50/40' : ''}>
                  {Array.from({ length: colSpan }).map((_, j) => (
                    <td key={j} className="px-3 py-2.5">
                      <div className="skeleton h-3 rounded-md" style={{ width: `${50 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="py-16">
                  <EmptyState
                    title="Tidak ada data"
                    desc={debouncedSearch ? `Tidak ada hasil untuk "${debouncedSearch}"` : undefined}
                  />
                </td>
              </tr>
            ) : (
              data.map((row, i) => {
                const rowKey = row.id ?? i
                const isExpanded = expandedRows.has(rowKey)
                return (
                  <Fragment key={rowKey}>
                    {/* Data row */}
                    <tr
                      className={[
                        'border-t border-slate-100 transition-colors duration-150 group',
                        isExpanded
                          ? 'bg-blue-50/60'
                          : i % 2 === 1
                            ? 'bg-slate-50/40 hover:bg-blue-50/20'
                            : 'bg-white hover:bg-blue-50/20',
                      ].join(' ')}
                    >
                      {/* Expand toggle */}
                      <td className="w-8 px-2 py-2.5 text-center">
                        <button
                          onClick={() => toggleExpand(rowKey)}
                          className={[
                            'w-5 h-5 rounded-full flex items-center justify-center mx-auto transition-all duration-200',
                            isExpanded
                              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 scale-110'
                              : 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105',
                          ].join(' ')}
                          title={isExpanded ? 'Tutup detail' : 'Lihat detail'}
                        >
                          {isExpanded
                            ? <Minus className="w-2.5 h-2.5 stroke-[2.5]" />
                            : <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
                          }
                        </button>
                      </td>

                      {/* Data cells */}
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={['px-3 py-2.5 text-slate-700 max-w-[200px]', col.tdClassName ?? ''].join(' ')}
                        >
                          {col.render
                            ? col.render(row[col.key], row)
                            : (
                              <span
                                className="block truncate text-xs leading-snug"
                                title={String(row[col.key] ?? '')}
                              >
                                {row[col.key] ?? '—'}
                              </span>
                            )
                          }
                        </td>
                      ))}

                      {/* Actions cell */}
                      {actions && (
                        <td className="w-px px-3 py-2.5 text-right whitespace-nowrap">
                          {actions(row)}
                        </td>
                      )}
                    </tr>

                    {/* Expanded detail row */}
                    {isExpanded && (
                      <tr className="border-t border-blue-100 bg-blue-50/40">
                        {/* Left accent bar */}
                        <td className="w-8 p-0 relative">
                          <div className="absolute inset-y-0 right-0 w-[3px] bg-gradient-to-b from-blue-400 to-indigo-400 rounded-full" />
                        </td>
                        <td colSpan={columns.length + (actions ? 1 : 0)} className="px-5 py-3.5">
                          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3">
                            {columns.map((col) => (
                              <div key={col.key} className="min-w-0">
                                <dt className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">
                                  {col.label}
                                </dt>
                                <dd className="text-xs text-slate-700 break-words leading-relaxed">
                                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-1">
        {/* Row count info */}
        <p className="text-xs text-slate-400 font-medium">
          {total === 0
            ? 'Tidak ada data'
            : (
              <>
                Menampilkan{' '}
                <span className="text-slate-600 font-semibold">{from.toLocaleString()}–{to.toLocaleString()}</span>
                {' '}dari{' '}
                <span className="text-slate-600 font-semibold">{total.toLocaleString()}</span>
                {' '}data
              </>
            )
          }
        </p>

        {/* Page buttons */}
        <div className="flex items-center gap-1">
          <NavBtn onClick={() => setPage(0)} disabled={page === 0} icon={<ChevronLeft className="w-3 h-3" />} double />
          <NavBtn onClick={() => setPage((p) => p - 1)} disabled={page === 0} icon={<ChevronLeft className="w-3 h-3" />} />

          {pageNumbers().map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={[
                'w-7 h-7 rounded-lg text-[11px] font-semibold transition-all duration-150',
                p === page
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm shadow-indigo-400/30'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
              ].join(' ')}
            >
              {p + 1}
            </button>
          ))}

          <NavBtn onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1} icon={<ChevronRight className="w-3 h-3" />} />
          <NavBtn onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} icon={<ChevronRight className="w-3 h-3" />} double />
        </div>
      </div>

    </div>
  )
})

function NavBtn({ onClick, disabled, icon, double }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-150"
    >
      {double ? <span className="flex -space-x-1">{icon}{icon}</span> : icon}
    </button>
  )
}

export default DataTable
