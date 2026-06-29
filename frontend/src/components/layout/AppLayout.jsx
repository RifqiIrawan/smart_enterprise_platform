import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import OfflineIndicator from '@/components/ui/OfflineIndicator'
import InstallPWA from '@/components/ui/InstallPWA'

const pageTitles = {
  '/dashboard': 'Dashboard Executive',
  '/ai': 'AI Assistant',
  '/factory': 'Smart Factory (MES)',
  '/warehouse': 'Smart Warehouse',
  '/asset': 'Asset & Maintenance',
  '/hris': 'Smart HRIS',
  '/purchasing': 'Purchasing',
  '/network': 'Network NOC',
  '/building': 'Smart Building',
  '/energy': 'Smart Energy',
  '/vehicle': 'Smart Vehicle',
  '/security': 'Smart Security',
  '/analytics': 'Analytics & Reports',
  '/accounting': 'Accounting',
  '/sales': 'Sales & CRM',
  '/finance': 'Finance AP/AR',
  '/tax': 'Tax & Pajak',
  '/mrp': 'MRP & Produksi',
  '/qms': 'Quality Management (QMS)',
  '/cost': 'Cost Accounting',
  '/budget': 'Budget & Financial Planning',
  '/print': 'Print & PDF Center',
  '/integration': 'Integrasi & API',
  '/documents': 'Manajemen Dokumen',
  '/settings': 'Pengaturan',
  '/403': 'Akses Ditolak',
  '/404': 'Halaman Tidak Ditemukan',
}

export default function AppLayout() {
  const location = useLocation()
  const base = '/' + location.pathname.split('/')[1]
  const title = pageTitles[base] || 'Smart Enterprise Platform'

  return (
    <>
      <OfflineIndicator />
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-app)' }}>
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header title={title} />
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <InstallPWA />
    </>
  )
}
