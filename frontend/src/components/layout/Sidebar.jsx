import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard, Factory, Warehouse, Wrench, Users, ShoppingCart,
  Network, Building2, Car, Shield, Bot, Settings, ChevronLeft, ChevronRight, ChevronDown,
  Zap, BarChart3, BookOpen, Sparkles, TrendingUp, Landmark, Receipt, GitBranch, ClipboardCheck, Calculator, PiggyBank, FolderOpen, Printer, Plug2, Store, Cpu, GitMerge, Crown, CheckSquare
} from 'lucide-react'

const navItems = [
  {
    path: '/executive', label: 'Executive', icon: Crown, badge: 'CEO', permission: 'executive.view',
    children: [
      { path: '/executive/overview', label: 'Overview', menuKey: 'executive.overview' },
      { path: '/executive/report', label: 'Management Report', menuKey: 'executive.report' },
      { path: '/executive/targets', label: 'Target KPI', menuKey: 'executive.targets' },
    ],
  },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    path: '/approval', label: 'Approval Center', icon: CheckSquare, badge: 'NEW', permission: 'approval.view',
    children: [
      { path: '/approval/pending', label: 'Menunggu Persetujuan', menuKey: 'approval.pending' },
      { path: '/approval/history', label: 'Riwayat', menuKey: 'approval.history' },
      { path: '/approval/rules', label: 'Konfigurasi Rule', menuKey: 'approval.rules' },
    ],
  },
  { path: '/ai', label: 'AI Assistant', icon: Bot, badge: 'AI' },
  { divider: true, label: 'Operasional' },
  {
    path: '/factory', label: 'Smart Factory', icon: Factory, permission: 'factory.view',
    children: [
      { path: '/factory/overview', label: 'Overview', menuKey: 'factory.overview' },
      { path: '/factory/workorder', label: 'Work Order', menuKey: 'factory.workorder' },
      { path: '/factory/machines', label: 'Mesin', menuKey: 'factory.machines' },
      { path: '/factory/bom', label: 'BOM', menuKey: 'factory.bom' },
      { path: '/factory/downtime', label: 'Downtime', menuKey: 'factory.downtime' },
      { path: '/factory/workcenters', label: 'Work Center', menuKey: 'factory.workcenters' },
      { path: '/factory/routing', label: 'Routing', menuKey: 'factory.routing' },
      { path: '/factory/oee', label: 'OEE Real', menuKey: 'factory.oee' },
      { path: '/factory/scrap', label: 'Scrap/Rework', menuKey: 'factory.scrap' },
      { path: '/factory/capacity', label: 'Kapasitas', menuKey: 'factory.capacity' },
      { path: '/factory/report', label: 'Laporan', menuKey: 'factory.report' },
    ],
  },
  {
    path: '/warehouse', label: 'Smart Warehouse', icon: Warehouse, permission: 'warehouse.view',
    children: [
      { path: '/warehouse/inventory', label: 'Inventori', menuKey: 'warehouse.inventory' },
      { path: '/warehouse/movements', label: 'Mutasi', menuKey: 'warehouse.movements' },
      { path: '/warehouse/alerts', label: 'Reorder Alert', menuKey: 'warehouse.alerts' },
      { path: '/warehouse/opname', label: 'Stock Opname', menuKey: 'warehouse.opname' },
    ],
  },
  {
    path: '/asset', label: 'Asset & CMMS', icon: Wrench, badge: 'CMMS', permission: 'asset.view',
    children: [
      { path: '/asset/assets', label: 'Daftar Aset', menuKey: 'asset.assets' },
      { path: '/asset/maintenance', label: 'Jadwal Maintenance', menuKey: 'asset.maintenance' },
      { path: '/asset/pm', label: 'PM Schedule', menuKey: 'asset.pm' },
      { path: '/asset/spareparts', label: 'Spare Parts', menuKey: 'asset.spareparts' },
      { path: '/asset/depreciation', label: 'Depresiasi & Disposal', menuKey: 'asset.depreciation' },
    ],
  },
  {
    path: '/hris', label: 'Smart HRIS', icon: Users, permission: 'hris.view',
    children: [
      { path: '/hris/hrdashboard', label: 'HR Dashboard', menuKey: 'hris.hrdashboard' },
      { path: '/hris/employee', label: 'Karyawan', menuKey: 'hris.employee' },
      { path: '/hris/attendance', label: 'Absensi', menuKey: 'hris.attendance' },
      { path: '/hris/leave', label: 'Cuti & Izin', menuKey: 'hris.leave' },
      { path: '/hris/payroll', label: 'Payroll', menuKey: 'hris.payroll' },
      { path: '/hris/payslip', label: 'Slip Gaji', menuKey: 'hris.payslip' },
      { path: '/hris/recruitment', label: 'Rekrutmen', menuKey: 'hris.recruitment' },
      { path: '/hris/training', label: 'Training', menuKey: 'hris.training' },
      { path: '/hris/kpi', label: 'KPI', menuKey: 'hris.kpi' },
      { path: '/hris/overtime', label: 'Shift & Lembur', menuKey: 'hris.overtime' },
      { path: '/hris/orgchart', label: 'Organigram', menuKey: 'hris.orgchart' },
    ],
  },
  {
    path: '/purchasing', label: 'Purchasing', icon: ShoppingCart, permission: 'purchasing.view',
    children: [
      { path: '/purchasing/pr', label: 'Purchase Request', menuKey: 'purchasing.pr' },
      { path: '/purchasing/po', label: 'Purchase Order', menuKey: 'purchasing.po' },
      { path: '/purchasing/rfq', label: 'RFQ / Tender', menuKey: 'purchasing.rfq' },
      { path: '/purchasing/grn', label: 'GRN', menuKey: 'purchasing.grn' },
      { path: '/purchasing/vendor', label: 'Vendor', menuKey: 'purchasing.vendor' },
    ],
  },
  {
    path: '/sales', label: 'Sales', icon: TrendingUp, permission: 'sales.view',
    children: [
      { path: '/sales/so', label: 'Sales Order', menuKey: 'sales.so' },
      { path: '/sales/do', label: 'Delivery', menuKey: 'sales.do' },
      { path: '/sales/invoice', label: 'Invoice', menuKey: 'sales.invoice' },
      { path: '/sales/quotation', label: 'Quotation', menuKey: 'sales.quotation' },
      { path: '/sales/retur', label: 'Retur', menuKey: 'sales.retur' },
      { path: '/sales/crm', label: 'CRM', menuKey: 'sales.crm' },
      { path: '/sales/customer', label: 'Customer', menuKey: 'sales.customer' },
    ],
  },
  {
    path: '/mrp', label: 'MRP & Produksi', icon: GitBranch, permission: 'mrp.view',
    children: [
      { path: '/mrp/engine', label: 'MRP Engine', menuKey: 'mrp.engine' },
      { path: '/mrp/jadwal', label: 'Jadwal Produksi', menuKey: 'mrp.jadwal' },
      { path: '/mrp/routing', label: 'Routing', menuKey: 'mrp.routing' },
      { path: '/mrp/lot', label: 'Lot Tracking', menuKey: 'mrp.lot' },
    ],
  },
  {
    path: '/qms', label: 'Quality (QMS)', icon: ClipboardCheck, permission: 'qms.view',
    children: [
      { path: '/qms/inspeksi', label: 'Inspeksi QC', menuKey: 'qms.inspeksi' },
      { path: '/qms/ncr', label: 'NCR', menuKey: 'qms.ncr' },
      { path: '/qms/capa', label: 'CAPA', menuKey: 'qms.capa' },
      { path: '/qms/kalibrasi', label: 'Kalibrasi', menuKey: 'qms.kalibrasi' },
    ],
  },
  { divider: true, label: 'Keuangan & Laporan' },
  {
    path: '/accounting', label: 'Accounting', icon: BookOpen, permission: 'accounting.view',
    children: [
      { path: '/accounting/dashboard', label: 'Laporan', menuKey: 'accounting.dashboard' },
      { path: '/accounting/journal', label: 'Jurnal', menuKey: 'accounting.journal' },
      { path: '/accounting/coa', label: 'COA', menuKey: 'accounting.coa' },
      { path: '/accounting/gl', label: 'Buku Besar', menuKey: 'accounting.gl' },
      { path: '/accounting/trial-balance', label: 'Neraca Saldo', menuKey: 'accounting.trial-balance' },
      { path: '/accounting/cashflow', label: 'Arus Kas', menuKey: 'accounting.cashflow' },
      { path: '/accounting/closing', label: 'Closing', menuKey: 'accounting.closing' },
      { path: '/accounting/comparative', label: 'Perbandingan', menuKey: 'accounting.comparative' },
    ],
  },
  {
    path: '/finance', label: 'Finance (AP/AR)', icon: Landmark, permission: 'finance.view',
    children: [
      { path: '/finance/bank', label: 'Bank & Kas', menuKey: 'finance.bank' },
      { path: '/finance/ap', label: 'Hutang (AP)', menuKey: 'finance.ap' },
      { path: '/finance/ar', label: 'Piutang (AR)', menuKey: 'finance.ar' },
      { path: '/finance/aging-ap', label: 'Aging AP', menuKey: 'finance.aging-ap' },
      { path: '/finance/aging-ar', label: 'Aging AR', menuKey: 'finance.aging-ar' },
      { path: '/finance/recon', label: 'Rekonsiliasi', menuKey: 'finance.recon' },
      { path: '/finance/petty-cash', label: 'Petty Cash', menuKey: 'finance.petty-cash' },
    ],
  },
  {
    path: '/tax', label: 'Tax & Pajak', icon: Receipt, permission: 'tax.view',
    children: [
      { path: '/tax/ppn', label: 'PPN', menuKey: 'tax.ppn' },
      { path: '/tax/pph21', label: 'PPh 21', menuKey: 'tax.pph21' },
      { path: '/tax/pph23', label: 'PPh 23', menuKey: 'tax.pph23' },
      { path: '/tax/bpjs', label: 'BPJS', menuKey: 'tax.bpjs' },
      { path: '/tax/nsfp', label: 'NSFP', menuKey: 'tax.nsfp' },
      { path: '/tax/efaktur', label: 'e-Faktur', menuKey: 'tax.efaktur' },
      { path: '/tax/spt-ppn', label: 'SPT PPN', menuKey: 'tax.spt-ppn' },
      { path: '/tax/config', label: 'Konfigurasi', menuKey: 'tax.config' },
    ],
  },
  {
    path: '/cost', label: 'Cost Accounting', icon: Calculator, permission: 'cost.view',
    children: [
      { path: '/cost/centers', label: 'Cost Center', menuKey: 'cost.centers' },
      { path: '/cost/wo', label: 'Biaya WO', menuKey: 'cost.wo' },
      { path: '/cost/std', label: 'Standard Cost', menuKey: 'cost.std' },
      {
        path: '/cost/laporan', label: 'Laporan & Analisis',
        children: [
          { path: '/cost/laporan', label: 'Analisis Varians', menuKey: 'cost.laporan' },
          { path: '/cost/cogs', label: 'COGS Report', menuKey: 'cost.cogs' },
          { path: '/cost/profitability', label: 'Profitabilitas Produk', menuKey: 'cost.profitability' },
          { path: '/cost/center-report', label: 'Cost Center Report', menuKey: 'cost.centerreport' },
        ],
      },
    ],
  },
  {
    path: '/budget', label: 'Budget & Planning', icon: PiggyBank, permission: 'budget.view',
    children: [
      { path: '/budget/master', label: 'Master Anggaran', menuKey: 'budget.master' },
      { path: '/budget/vsactual', label: 'Budget vs Aktual', menuKey: 'budget.vsactual' },
      { path: '/budget/alerts', label: 'Peringatan', menuKey: 'budget.alerts' },
      { path: '/budget/forecast', label: 'Forecast', menuKey: 'budget.forecast' },
      { path: '/budget/scenarios', label: 'Skenario', menuKey: 'budget.scenarios' },
    ],
  },
  {
    path: '/analytics', label: 'Analytics', icon: BarChart3, permission: 'analytics.view',
    children: [
      { path: '/analytics/executive', label: 'Executive', menuKey: 'analytics.executive' },
      { path: '/analytics/operational', label: 'Operasional', menuKey: 'analytics.operational' },
      { path: '/analytics/hr', label: 'HRIS', menuKey: 'analytics.hr' },
      { path: '/analytics/module', label: 'Kesehatan Modul', menuKey: 'analytics.module' },
      { path: '/analytics/comparison', label: 'Perbandingan', menuKey: 'analytics.comparison' },
      { path: '/analytics/forecast', label: 'Demand Forecast', menuKey: 'analytics.forecast' },
      { path: '/analytics/predictive', label: 'Predictive Maint.', menuKey: 'analytics.predictive' },
      { path: '/analytics/anomalies', label: 'Anomali', menuKey: 'analytics.anomalies' },
      { path: '/analytics/price', label: 'Rekomendasi Harga', menuKey: 'analytics.price' },
      { path: '/analytics/custom', label: 'Custom Report', menuKey: 'analytics.custom' },
    ],
  },
  { path: '/print', label: 'Print Center', icon: Printer, badge: 'PDF' },
  {
    path: '/integration', label: 'Integrasi & API', icon: Plug2, badge: 'API', permission: 'integration.view',
    children: [
      { path: '/integration/import', label: 'Import Data', menuKey: 'integration.import' },
      { path: '/integration/export', label: 'Export Data', menuKey: 'integration.export' },
      { path: '/integration/api-keys', label: 'API Keys', menuKey: 'integration.apikeys' },
      { path: '/integration/webhooks', label: 'Webhooks', menuKey: 'integration.webhooks' },
    ],
  },
  { divider: true, label: 'Infrastruktur' },
  {
    path: '/network', label: 'Network NOC', icon: Network, permission: 'network.view',
    children: [
      { path: '/network/devices', label: 'Perangkat', menuKey: 'network.devices' },
      { path: '/network/traffic', label: 'Traffic', menuKey: 'network.traffic' },
      { path: '/network/snmp', label: 'Live Poll (IOT-02)', menuKey: 'network.snmp' },
    ],
  },
  {
    path: '/building', label: 'Smart Building', icon: Building2, permission: 'building.view',
    children: [
      { path: '/building/overview', label: 'Overview', menuKey: 'building.overview' },
      { path: '/building/hvac', label: 'HVAC', menuKey: 'building.hvac' },
      { path: '/building/energy', label: 'Energi', menuKey: 'building.energy' },
    ],
  },
  { path: '/energy', label: 'Smart Energy', icon: Zap },
  {
    path: '/vehicle', label: 'Smart Vehicle', icon: Car, permission: 'vehicle.view',
    children: [
      { path: '/vehicle/fleet', label: 'Armada', menuKey: 'vehicle.fleet' },
      { path: '/vehicle/fuel', label: 'Log BBM', menuKey: 'vehicle.fuel' },
    ],
  },
  {
    path: '/security', label: 'Smart Security', icon: Shield, permission: 'security.view',
    children: [
      { path: '/security/visitor', label: 'Tamu', menuKey: 'security.visitor' },
      { path: '/security/incident', label: 'Insiden', menuKey: 'security.incident' },
      { path: '/security/access', label: 'Akses Pintu', menuKey: 'security.access' },
    ],
  },
  { divider: true, label: '' },
  { divider: true, label: 'Marketplace & IoT' },
  {
    path: '/marketplace', label: 'Marketplace', icon: Store, badge: 'NEW', permission: 'marketplace.view',
    children: [
      { path: '/marketplace/overview', label: 'Ringkasan', menuKey: 'marketplace.overview' },
      { path: '/marketplace/channels', label: 'Channel', menuKey: 'marketplace.channels' },
      { path: '/marketplace/orders', label: 'Pesanan', menuKey: 'marketplace.orders' },
      { path: '/marketplace/listings', label: 'Listing Produk', menuKey: 'marketplace.listings' },
    ],
  },
  {
    path: '/iot-hub', label: 'IoT Hub', icon: Cpu, badge: 'NEW', permission: 'iot.view',
    children: [
      { path: '/iot-hub/live', label: 'Live Monitor', menuKey: 'iot.live' },
      { path: '/iot-hub/devices', label: 'Perangkat', menuKey: 'iot.devices' },
      { path: '/iot-hub/alerts', label: 'Alert Rules', menuKey: 'iot.alerts' },
      { path: '/iot-hub/history', label: 'Riwayat Alert', menuKey: 'iot.history' },
    ],
  },
  {
    path: '/supply-chain', label: 'Supply Chain', icon: GitMerge, badge: 'NEW', permission: 'supplychain.view',
    children: [
      { path: '/supply-chain/map', label: 'Peta Rantai Pasok', menuKey: 'supplychain.map' },
      { path: '/supply-chain/trace', label: 'Traceability', menuKey: 'supplychain.trace' },
      { path: '/supply-chain/scorecard', label: 'Supplier Scorecard', menuKey: 'supplychain.scorecard' },
      { path: '/supply-chain/risk', label: 'Risk Dashboard', menuKey: 'supplychain.risk' },
    ],
  },
  { divider: true, label: 'Portal Eksternal' },
  {
    path: '/portal/customer', label: 'Customer Portal', icon: Store, badge: 'NEW', permission: 'customerportal.view',
    children: [
      { path: '/portal/customer/dashboard', label: 'Dashboard', menuKey: 'customerportal.dashboard' },
      { path: '/portal/customer/orders', label: 'Pesanan Saya', menuKey: 'customerportal.orders' },
      { path: '/portal/customer/invoices', label: 'Invoice', menuKey: 'customerportal.invoices' },
      { path: '/portal/customer/delivery', label: 'Pengiriman', menuKey: 'customerportal.delivery' },
    ],
  },
  {
    path: '/portal/vendor', label: 'Vendor Portal', icon: Building2, badge: 'NEW', permission: 'vendorportal.view',
    children: [
      { path: '/portal/vendor/dashboard', label: 'Dashboard', menuKey: 'vendorportal.dashboard' },
      { path: '/portal/vendor/pos', label: 'Purchase Order', menuKey: 'vendorportal.pos' },
      { path: '/portal/vendor/invoices', label: 'Invoice Saya', menuKey: 'vendorportal.invoices' },
      { path: '/portal/vendor/payments', label: 'Pembayaran', menuKey: 'vendorportal.payments' },
    ],
  },
  { divider: true, label: '' },
  { path: '/documents', label: 'Dokumen', icon: FolderOpen },
  {
    path: '/settings', label: 'Settings', icon: Settings, permission: 'settings.view',
    children: [
      { path: '/settings/company', label: 'Perusahaan', menuKey: 'settings.company' },
      { path: '/settings/users', label: 'Users', menuKey: 'settings.users' },
      { path: '/settings/company-access', label: 'Akses Perusahaan', menuKey: 'settings.company_access' },
      { path: '/settings/roles', label: 'Role & Permission', menuKey: 'settings.roles' },
      { path: '/settings/logs', label: 'Akses Log', menuKey: 'settings.logs' },
      { path: '/settings/currency', label: 'Mata Uang', menuKey: 'settings.currency' },
      { path: '/settings/notifications', label: 'Notifikasi', menuKey: 'settings.notifications' },
      { path: '/settings/2fa', label: '2FA', menuKey: 'settings.2fa' },
      { path: '/settings/sessions', label: 'Sessions', menuKey: 'settings.sessions' },
      { path: '/settings/audit', label: 'Audit Trail', menuKey: 'settings.audit' },
      { path: '/settings/security', label: 'Kebijakan', menuKey: 'settings.security' },
    ],
  },
]

const roleColors = {
  superadmin: 'from-violet-500 to-purple-600',
  admin: 'from-indigo-500 to-blue-600',
  manager: 'from-cyan-500 to-teal-600',
  staff: 'from-emerald-500 to-green-600',
  finance: 'from-amber-500 to-orange-500',
}

// One level deeper than a normal submenu item — e.g. Cost Accounting >
// "Laporan & Analisis" > (Analisis Varians / COGS / Profitabilitas / Cost
// Center Report). Shares the parent Sidebar's `expanded` Set/toggleExpanded
// (paths are globally unique, so one Set safely tracks both nesting levels).
function NestedSubmenu({ child, expanded, toggleExpanded }) {
  const location = useLocation()
  const isOpen = expanded.has(child.path)
  const isActive = child.children.some(gc => location.pathname.startsWith(gc.path))

  return (
    <div>
      <button
        type="button"
        onClick={() => toggleExpanded(child.path)}
        className={cn(
          'w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150',
          isActive ? 'text-indigo-300' : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.05]'
        )}
      >
        <span className="truncate flex-1 text-left">{child.label}</span>
        <ChevronDown className={cn('w-3 h-3 flex-shrink-0 transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <div className="mt-0.5 ml-3 pl-2.5 border-l border-white/[0.08] space-y-0.5">
          {child.children.map(gc => (
            <NavLink
              key={gc.path}
              to={gc.path}
              className={({ isActive }) => cn(
                'block px-2.5 py-1 rounded-lg text-[12px] font-medium truncate transition-all duration-150',
                isActive
                  ? 'text-indigo-300 bg-indigo-500/10'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.05]'
              )}
            >
              {gc.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const { sidebarCollapsed, collapseSidebar } = useUIStore()
  const { user, hasPermission, canDo } = useAuthStore()
  const location = useLocation()
  const gradient = roleColors[user?.role] || roleColors.admin
  const [expanded, setExpanded] = useState(() => new Set())

  // Auto-expand the parent (and, for a nested submenu, the grandparent too) of
  // whichever submenu route is currently active.
  useEffect(() => {
    const toExpand = new Set()
    for (const item of navItems) {
      if (!item.children) continue
      for (const child of item.children) {
        if (child.children?.length) {
          if (child.children.some(gc => location.pathname.startsWith(gc.path))) {
            toExpand.add(item.path)
            toExpand.add(child.path)
          }
        } else if (location.pathname.startsWith(child.path)) {
          toExpand.add(item.path)
        }
      }
    }
    if (toExpand.size) setExpanded(prev => new Set([...prev, ...toExpand]))
  }, [location.pathname])

  const toggleExpanded = (path) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })
  }

  // Build visible items — hide permission-gated items, collapse empty sections
  const visibleItems = (() => {
    const result = []
    let pendingDivider = null
    for (const item of navItems) {
      if (item.divider) {
        pendingDivider = item
        continue
      }
      if (item.permission && !hasPermission(item.permission)) continue
      if (item.children?.length) {
        const visibleChildren = item.children
          .map(c => {
            if (c.children?.length) {
              const visibleGrandchildren = c.children.filter(gc => !gc.menuKey || canDo(gc.menuKey, 'view'))
              return visibleGrandchildren.length ? { ...c, children: visibleGrandchildren } : null
            }
            return (!c.menuKey || canDo(c.menuKey, 'view')) ? c : null
          })
          .filter(Boolean)
        if (!visibleChildren.length) continue
        if (pendingDivider) { result.push(pendingDivider); pendingDivider = null }
        result.push({ ...item, children: visibleChildren })
        continue
      }
      if (pendingDivider) { result.push(pendingDivider); pendingDivider = null }
      result.push(item)
    }
    return result
  })()

  return (
    <aside
      className={cn(
        'flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out select-none z-20',
        'bg-[#0c1120] border-r border-white/[0.06]',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center px-4 py-5 border-b border-white/[0.06]',
        sidebarCollapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0c1120]" />
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white tracking-tight leading-none">Smart Enterprise</p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium tracking-wider uppercase">Platform v2</p>
          </div>
        )}
        <button
          onClick={collapseSidebar}
          className="ml-auto flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/8 transition-all"
        >
          {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleItems.map((item, i) => {
          if (item.divider) {
            if (sidebarCollapsed) {
              return item.label
                ? <div key={i} className="my-2 mx-2 border-t border-white/[0.06]" />
                : null
            }
            return item.label ? (
              <p key={i} className="px-3 pt-5 pb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                {item.label}
              </p>
            ) : <div key={i} className="my-2 mx-1 border-t border-white/[0.06]" />
          }

          const Icon = item.icon

          if (item.children?.length) {
            const isOpen = expanded.has(item.path) && !sidebarCollapsed
            const isChildActive = item.children.some(c =>
              c.children?.length
                ? c.children.some(gc => location.pathname.startsWith(gc.path))
                : location.pathname.startsWith(c.path)
            )

            if (sidebarCollapsed) {
              return (
                <NavLink
                  key={item.path}
                  to={item.children[0].children?.[0]?.path || item.children[0].path}
                  title={item.label}
                  className={cn(
                    'group relative flex items-center justify-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                    isChildActive
                      ? 'bg-gradient-to-r from-indigo-500/20 to-violet-500/10 text-indigo-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                  )}
                >
                  <Icon className={cn('w-4 h-4 flex-shrink-0', isChildActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300')} />
                </NavLink>
              )
            }

            return (
              <div key={item.path}>
                <button
                  type="button"
                  onClick={() => toggleExpanded(item.path)}
                  className={cn(
                    'group relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 w-full',
                    sidebarCollapsed && 'justify-center',
                    isChildActive
                      ? 'bg-gradient-to-r from-indigo-500/20 to-violet-500/10 text-indigo-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                  )}
                >
                  {isChildActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-indigo-400" />
                  )}
                  <Icon className={cn(
                    'w-4 h-4 flex-shrink-0 transition-all',
                    isChildActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                  )} />
                  {!sidebarCollapsed && (
                    <>
                      <span className="truncate">{item.label}</span>
                      <ChevronDown className={cn('w-3.5 h-3.5 ml-auto flex-shrink-0 transition-transform', isOpen && 'rotate-180')} />
                    </>
                  )}
                </button>
                {isOpen && (
                  <div className="mt-0.5 ml-6 pl-2.5 border-l border-white/[0.08] space-y-0.5">
                    {item.children.map(child => (
                      child.children?.length ? (
                        <NestedSubmenu key={child.path} child={child} expanded={expanded} toggleExpanded={toggleExpanded} />
                      ) : (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          className={({ isActive }) => cn(
                            'block px-2.5 py-1.5 rounded-lg text-[13px] font-medium truncate transition-all duration-150',
                            isActive
                              ? 'text-indigo-300 bg-indigo-500/10'
                              : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.05]'
                          )}
                        >
                          {child.label}
                        </NavLink>
                      )
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={sidebarCollapsed ? item.label : undefined}
              className={({ isActive }) => cn(
                'group relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                sidebarCollapsed && 'justify-center',
                isActive
                  ? 'bg-gradient-to-r from-indigo-500/20 to-violet-500/10 text-indigo-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-indigo-400" />
                  )}
                  <Icon className={cn(
                    'w-4 h-4 flex-shrink-0 transition-all',
                    isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                  )} />
                  {!sidebarCollapsed && (
                    <>
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User profile */}
      <div className="border-t border-white/[0.06] p-3">
        <div className={cn(
          'flex items-center gap-3 px-1 py-1 rounded-xl',
          sidebarCollapsed && 'justify-center'
        )}>
          <div className={cn(
            'w-8 h-8 rounded-xl bg-gradient-to-br flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-lg',
            gradient
          )}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-slate-400 truncate capitalize">{user?.role || 'admin'}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
