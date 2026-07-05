import { createContext, useContext, useState } from 'react'

const translations = {
  id: {
    // Navigation
    nav_dashboard: 'Dashboard',
    nav_factory: 'Smart Factory',
    nav_warehouse: 'Gudang',
    nav_hris: 'HRIS',
    nav_purchasing: 'Pembelian',
    nav_sales: 'Penjualan',
    nav_finance: 'Keuangan',
    nav_accounting: 'Akuntansi',
    nav_tax: 'Pajak',
    nav_mrp: 'MRP & Produksi',
    nav_qms: 'Manajemen Mutu',
    nav_cost: 'Akuntansi Biaya',
    nav_budget: 'Anggaran',
    nav_asset: 'Aset & Pemeliharaan',
    nav_analytics: 'Analitik & Laporan',
    nav_settings: 'Pengaturan',
    nav_integration: 'Integrasi & API',
    nav_documents: 'Dokumen',
    nav_print: 'Print Center',
    // Common
    save: 'Simpan',
    cancel: 'Batal',
    delete: 'Hapus',
    edit: 'Edit',
    add: 'Tambah',
    search: 'Cari',
    loading: 'Memuat...',
    actions: 'Aksi',
    status: 'Status',
    date: 'Tanggal',
    name: 'Nama',
    total: 'Total',
    yes: 'Ya',
    no: 'Tidak',
    confirm: 'Konfirmasi',
    close: 'Tutup',
    export: 'Ekspor',
    import: 'Impor',
    print: 'Cetak',
    download: 'Unduh',
    // Statuses
    active: 'Aktif',
    inactive: 'Nonaktif',
    pending: 'Menunggu',
    approved: 'Disetujui',
    rejected: 'Ditolak',
    draft: 'Draf',
    done: 'Selesai',
    // UI
    theme_light: 'Mode Terang',
    theme_dark: 'Mode Gelap',
    language: 'Bahasa',
    logout: 'Keluar',
    profile: 'Profil Saya',
    notifications: 'Notifikasi',
    no_notifications: 'Tidak ada notifikasi',
    search_placeholder: 'Cari di semua modul...',
    rows_per_page: 'Baris per halaman',
    of: 'dari',
    page: 'Halaman',
  },
  en: {
    // Navigation
    nav_dashboard: 'Dashboard',
    nav_factory: 'Smart Factory',
    nav_warehouse: 'Warehouse',
    nav_hris: 'HRIS',
    nav_purchasing: 'Purchasing',
    nav_sales: 'Sales',
    nav_finance: 'Finance',
    nav_accounting: 'Accounting',
    nav_tax: 'Tax',
    nav_mrp: 'MRP & Production',
    nav_qms: 'Quality Management',
    nav_cost: 'Cost Accounting',
    nav_budget: 'Budget Planning',
    nav_asset: 'Asset & Maintenance',
    nav_analytics: 'Analytics & Reports',
    nav_settings: 'Settings',
    nav_integration: 'Integration & API',
    nav_documents: 'Documents',
    nav_print: 'Print Center',
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    loading: 'Loading...',
    actions: 'Actions',
    status: 'Status',
    date: 'Date',
    name: 'Name',
    total: 'Total',
    yes: 'Yes',
    no: 'No',
    confirm: 'Confirm',
    close: 'Close',
    export: 'Export',
    import: 'Import',
    print: 'Print',
    download: 'Download',
    // Statuses
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    draft: 'Draft',
    done: 'Done',
    // UI
    theme_light: 'Light Mode',
    theme_dark: 'Dark Mode',
    language: 'Language',
    logout: 'Logout',
    profile: 'My Profile',
    notifications: 'Notifications',
    no_notifications: 'No notifications',
    search_placeholder: 'Search across all modules...',
    rows_per_page: 'Rows per page',
    of: 'of',
    page: 'Page',
  },
}

const LangContext = createContext({
  lang: 'id',
  t: (key) => key,
  setLang: () => {},
})

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('sep-lang') || 'id')

  const setLang = (l) => {
    setLangState(l)
    localStorage.setItem('sep-lang', l)
  }

  const t = (key) => translations[lang]?.[key] ?? translations['id']?.[key] ?? key

  return (
    <LangContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
export { translations }
