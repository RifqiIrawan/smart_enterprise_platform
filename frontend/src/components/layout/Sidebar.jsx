import { NavLink } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard, Factory, Warehouse, Wrench, Users, ShoppingCart,
  Network, Building2, Car, Shield, Bot, Settings, ChevronLeft, ChevronRight,
  Zap, BarChart3, BookOpen, Sparkles, TrendingUp, Landmark, Receipt, GitBranch, ClipboardCheck, Calculator, PiggyBank, FolderOpen, Printer, Plug2, Store, Cpu, GitMerge, Crown
} from 'lucide-react'

const navItems = [
  { path: '/executive', label: 'Executive', icon: Crown, badge: 'CEO' },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { path: '/ai', label: 'AI Assistant', icon: Bot, badge: 'AI' },
  { divider: true, label: 'Operasional' },
  { path: '/factory', label: 'Smart Factory', icon: Factory, permission: 'factory.view' },
  { path: '/warehouse', label: 'Smart Warehouse', icon: Warehouse, permission: 'warehouse.view' },
  { path: '/asset', label: 'Asset & CMMS', icon: Wrench, badge: 'CMMS', permission: 'asset.view' },
  { path: '/hris', label: 'Smart HRIS', icon: Users, permission: 'hris.view' },
  { path: '/purchasing', label: 'Purchasing', icon: ShoppingCart, permission: 'purchasing.view' },
  { path: '/sales', label: 'Sales', icon: TrendingUp, permission: 'sales.view' },
  { path: '/mrp', label: 'MRP & Produksi', icon: GitBranch, permission: 'mrp.view' },
  { path: '/qms', label: 'Quality (QMS)', icon: ClipboardCheck, permission: 'qms.view' },
  { divider: true, label: 'Keuangan & Laporan' },
  { path: '/accounting', label: 'Accounting', icon: BookOpen, permission: 'accounting.view' },
  { path: '/finance', label: 'Finance (AP/AR)', icon: Landmark, permission: 'finance.view' },
  { path: '/tax', label: 'Tax & Pajak', icon: Receipt, permission: 'tax.view' },
  { path: '/cost', label: 'Cost Accounting', icon: Calculator, permission: 'cost.view' },
  { path: '/budget', label: 'Budget & Planning', icon: PiggyBank, permission: 'budget.view' },
  { path: '/analytics', label: 'Analytics', icon: BarChart3, permission: 'analytics.view' },
  { path: '/print', label: 'Print Center', icon: Printer, badge: 'PDF' },
  { path: '/integration', label: 'Integrasi & API', icon: Plug2, badge: 'API' },
  { divider: true, label: 'Infrastruktur' },
  { path: '/network', label: 'Network NOC', icon: Network },
  { path: '/building', label: 'Smart Building', icon: Building2 },
  { path: '/energy', label: 'Smart Energy', icon: Zap },
  { path: '/vehicle', label: 'Smart Vehicle', icon: Car },
  { path: '/security', label: 'Smart Security', icon: Shield },
  { divider: true, label: '' },
  { divider: true, label: 'Marketplace & IoT' },
  { path: '/marketplace', label: 'Marketplace', icon: Store, badge: 'NEW' },
  { path: '/iot-hub', label: 'IoT Hub', icon: Cpu, badge: 'NEW' },
  { path: '/supply-chain', label: 'Supply Chain', icon: GitMerge, badge: 'NEW' },
  { divider: true, label: 'Portal Eksternal' },
  { path: '/portal/customer', label: 'Customer Portal', icon: Store, badge: 'NEW' },
  { path: '/portal/vendor', label: 'Vendor Portal', icon: Building2, badge: 'NEW' },
  { divider: true, label: '' },
  { path: '/documents', label: 'Dokumen', icon: FolderOpen },
  { path: '/settings', label: 'Settings', icon: Settings, permission: 'settings.view' },
]

const roleColors = {
  superadmin: 'from-violet-500 to-purple-600',
  admin: 'from-indigo-500 to-blue-600',
  manager: 'from-cyan-500 to-teal-600',
  staff: 'from-emerald-500 to-green-600',
  finance: 'from-amber-500 to-orange-500',
}

export default function Sidebar() {
  const { sidebarCollapsed, collapseSidebar } = useUIStore()
  const { user, hasPermission } = useAuthStore()
  const gradient = roleColors[user?.role] || roleColors.admin

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
                        <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
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
