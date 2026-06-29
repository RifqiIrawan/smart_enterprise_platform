import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X, FileText, ShoppingBag, Users, BookOpen, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/utils/format'

// ─── Company Letterhead Data ──────────────────────────────────────
const COMPANY = {
  name: 'PT SMART ENTERPRISE MANUFAKTUR',
  address: 'Jl. Industri No. 1, Kawasan MM2100, Bekasi 17520',
  npwp: '01.234.567.8-999.000',
  phone: '(021) 8998-1234',
  email: 'finance@sep.co.id',
  bank: 'Bank BCA',
  account: '123-456-7890',
  account_name: 'PT Smart Enterprise Manufaktur',
}

// ─── Demo Documents ────────────────────────────────────────────────
const DEMO = {
  quotation: {
    quo_number: 'QUO/2026/0001',
    date: '2026-06-25',
    valid_until: '2026-07-25',
    customer: { name: 'PT Maju Jaya Abadi', address: 'Jl. Sudirman No. 45, Jakarta Pusat', npwp: '99.888.777.6-555.000' },
    items: [
      { no: 1, name: 'Mesin Produksi Seri A-100', qty: 2, unit: 'unit', price: 125000000, disc: 5, amount: 237500000 },
      { no: 2, name: 'Spare Part Kit B (Set Lengkap)', qty: 10, unit: 'set', price: 3500000, disc: 0, amount: 35000000 },
      { no: 3, name: 'Jasa Instalasi & Commissioning', qty: 1, unit: 'ls', price: 15000000, disc: 0, amount: 15000000 },
    ],
    subtotal: 287500000, ppn: 34500000, total: 322000000,
    notes: 'Harga belum termasuk ongkos kirim ke luar Jawa. Garansi mesin 12 bulan. Pembayaran: 30% DP, 70% sebelum pengiriman.',
  },
  so: {
    so_number: 'SO/2026/0018',
    date: '2026-06-28',
    delivery_date: '2026-07-15',
    customer: { name: 'PT Sinar Abadi Makmur', address: 'Jl. Raya Bogor Km. 30, Depok 16430', npwp: '55.321.987.6-789.000' },
    items: [
      { no: 1, name: 'Mesin Presisi X-300', qty: 1, unit: 'unit', price: 350000000, amount: 350000000 },
      { no: 2, name: 'Tooling Set Khusus (3 Pcs)', qty: 3, unit: 'set', price: 12000000, amount: 36000000 },
    ],
    subtotal: 386000000, ppn: 46320000, total: 432320000,
    payment_terms: '30% DP sebelum produksi, 70% NET 30 setelah DO',
    status: 'APPROVED',
  },
  delivery: {
    do_number: 'DO/2026/0023',
    so_number: 'SO/2026/0015',
    date: '2026-06-27',
    customer: { name: 'PT Maju Jaya Abadi', address: 'Kawasan Industri MM2100 Blok A-12, Bekasi' },
    driver: 'Budi Santoso',
    vehicle: 'B 9876 XY / Truk Engkel',
    items: [
      { no: 1, name: 'Mesin Produksi A-100', qty: 2, unit: 'unit', weight: '850 kg/unit' },
      { no: 2, name: 'Spare Part Kit B', qty: 10, unit: 'set', weight: '2.5 kg/set' },
      { no: 3, name: 'Tooling Instalasi', qty: 1, unit: 'set', weight: '12 kg' },
    ],
    notes: 'Harap periksa kondisi barang saat penerimaan. Konfirmasi penerimaan dalam 24 jam ke nomor (021) 8998-1234.',
  },
  invoice: {
    inv_number: 'INV/2026/0012',
    date: '2026-06-25',
    due_date: '2026-07-25',
    customer: { name: 'PT Cahaya Terang Tbk', address: 'Jl. Gatot Subroto Kav. 89, Jakarta Selatan 12930', npwp: '01.456.789.0-111.000' },
    items: [
      { no: 1, name: 'Mesin Produksi X-200 (sesuai SO/2026/0012)', qty: 1, unit: 'unit', price: 485000000, amount: 485000000 },
      { no: 2, name: 'Biaya Pengiriman & Asuransi', qty: 1, unit: 'ls', price: 12500000, amount: 12500000 },
    ],
    subtotal: 497500000, ppn: 59700000, total: 557200000,
    do_number: 'DO/2026/0020',
  },
  po: {
    po_number: 'PO/2026/0045',
    date: '2026-06-20',
    delivery_date: '2026-07-10',
    vendor: { name: 'CV Bahan Prima Sejahtera', address: 'Jl. Industri Raya No. 12, Tangerang 15710', npwp: '72.345.678.9-432.000' },
    payment_terms: 'NET 30 setelah penerimaan barang (GRN)',
    items: [
      { no: 1, name: 'Baja Plat 2mm Hot Roll (Coil)', qty: 5000, unit: 'kg', price: 18500, amount: 92500000 },
      { no: 2, name: 'Baja Plat 3mm Hot Roll (Coil)', qty: 3000, unit: 'kg', price: 19800, amount: 59400000 },
      { no: 3, name: 'Elektroda Las E6013 Ø 3.2mm', qty: 200, unit: 'kg', price: 45000, amount: 9000000 },
    ],
    subtotal: 160900000, ppn: 19308000, total: 180208000,
    notes: 'Barang harus disertai sertifikat material (Mill Certificate). Pengiriman ke gudang utama Jl. Industri No. 1 Bekasi.',
  },
  slipgaji: {
    month: 'Juni 2026',
    name: 'Ahmad Fauzi',
    nik: 'EMP-0042',
    department: 'Divisi Produksi',
    position: 'Supervisor Produksi',
    npwp: '86.420.135.7-123.000',
    status_pajak: 'K/2',
    bank: 'Bank BCA No. 9876543210',
    earnings: [
      { label: 'Gaji Pokok', amount: 8000000 },
      { label: 'Tunjangan Jabatan', amount: 1500000 },
      { label: 'Tunjangan Transport', amount: 500000 },
      { label: 'Tunjangan Makan', amount: 600000 },
      { label: 'Uang Lembur (15 jam)', amount: 750000 },
    ],
    deductions: [
      { label: 'BPJS Kesehatan (1%)', amount: 80000 },
      { label: 'BPJS Ketenagakerjaan JHT (2%)', amount: 160000 },
      { label: 'BPJS JP (1%)', amount: 80000 },
      { label: 'Pajak PPh 21', amount: 105000 },
    ],
    gross: 11350000,
    total_deductions: 425000,
    net_pay: 10925000,
  },
}

// ─── Shared: Company Header ────────────────────────────────────────
function CompanyHeader() {
  return (
    <div className="flex items-start justify-between pb-5 mb-6 border-b-2 border-gray-900">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-indigo-700 flex items-center justify-center text-white font-black text-lg tracking-tight">
          SEP
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-black text-gray-900 tracking-wide">{COMPANY.name}</p>
        <p className="text-xs text-gray-600 mt-0.5">{COMPANY.address}</p>
        <p className="text-xs text-gray-600">NPWP: {COMPANY.npwp}</p>
        <p className="text-xs text-gray-600">Telp: {COMPANY.phone} | {COMPANY.email}</p>
      </div>
    </div>
  )
}

// ─── Shared: Line Items Table ──────────────────────────────────────
function ItemsTable({ columns, rows }) {
  return (
    <table className="w-full text-sm border-collapse mt-4">
      <thead>
        <tr className="bg-gray-900 text-white">
          {columns.map((c, i) => (
            <th key={i} className={`px-3 py-2 text-xs font-semibold ${c.right ? 'text-right' : 'text-left'}`}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-gray-200">
            {row.map((cell, j) => (
              <td key={j} className={`px-3 py-2 ${columns[j]?.right ? 'text-right' : 'text-left'} ${columns[j]?.bold ? 'font-semibold' : ''}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TotalsBlock({ rows }) {
  return (
    <div className="flex justify-end mt-3">
      <table className="text-sm min-w-64">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={r.total ? 'border-t-2 border-gray-900 font-bold text-base' : ''}>
              <td className="py-1 pr-6 text-gray-600 text-right">{r.label}</td>
              <td className={`py-1 text-right font-semibold min-w-32 ${r.total ? 'text-gray-900 text-base' : 'text-gray-800'}`}>{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SignatureBox({ labels }) {
  return (
    <div className="flex justify-between mt-10 text-sm">
      {labels.map((l, i) => (
        <div key={i} className="text-center min-w-36">
          <p className="text-gray-600">{l}</p>
          <div className="h-14 mt-2 mb-1 border-b border-gray-300" />
          <p className="text-gray-800 font-medium">( _________________ )</p>
        </div>
      ))}
    </div>
  )
}

// ─── Template: Quotation ──────────────────────────────────────────
function TplQuotation() {
  const d = DEMO.quotation
  return (
    <div className="font-sans text-gray-900 bg-white p-12">
      <CompanyHeader />
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-widest">PENAWARAN HARGA</h2>
          <p className="text-lg font-mono text-indigo-700 mt-1">{d.quo_number}</p>
        </div>
        <div className="text-sm text-right">
          <div className="inline-block bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <p><span className="text-gray-500">Tanggal:</span> <strong>{d.date}</strong></p>
            <p><span className="text-gray-500">Berlaku hingga:</span> <strong>{d.valid_until}</strong></p>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Kepada Yth.</p>
        <p className="font-bold text-gray-900">{d.customer.name}</p>
        <p className="text-gray-600">{d.customer.address}</p>
        <p className="text-gray-600">NPWP: {d.customer.npwp}</p>
      </div>
      <ItemsTable
        columns={[
          { label: 'No.', right: false },
          { label: 'Keterangan' },
          { label: 'Qty', right: true },
          { label: 'Satuan' },
          { label: 'Harga Satuan', right: true },
          { label: 'Diskon', right: true },
          { label: 'Jumlah', right: true },
        ]}
        rows={d.items.map(it => [
          it.no, it.name, it.qty, it.unit,
          formatCurrency(it.price),
          it.disc ? `${it.disc}%` : '—',
          formatCurrency(it.amount),
        ])}
      />
      <TotalsBlock rows={[
        { label: 'Sub Total', value: formatCurrency(d.subtotal) },
        { label: 'PPN 12%', value: formatCurrency(d.ppn) },
        { label: 'TOTAL', value: formatCurrency(d.total), total: true },
      ]} />
      {d.notes && (
        <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-gray-700">
          <strong>Catatan:</strong> {d.notes}
        </div>
      )}
      <SignatureBox labels={['Hormat kami,', 'Disetujui oleh,']} />
      <p className="text-center text-xs text-gray-400 mt-8 pt-4 border-t border-gray-200">
        Dokumen ini diterbitkan secara elektronik oleh {COMPANY.name} — {COMPANY.email}
      </p>
    </div>
  )
}

// ─── Template: Sales Order Confirmation ──────────────────────────
function TplSalesOrder() {
  const d = DEMO.so
  return (
    <div className="font-sans text-gray-900 bg-white p-12">
      <CompanyHeader />
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-widest">ORDER KONFIRMASI</h2>
          <p className="text-lg font-mono text-indigo-700 mt-1">{d.so_number}</p>
        </div>
        <div>
          <span className="inline-block bg-emerald-100 text-emerald-800 font-bold text-xs px-3 py-1 rounded-full border border-emerald-300">
            ✓ {d.status}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Pelanggan</p>
          <p className="font-bold">{d.customer.name}</p>
          <p className="text-gray-600">{d.customer.address}</p>
          <p className="text-gray-600">NPWP: {d.customer.npwp}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Detail Order</p>
          <p><span className="text-gray-500">Tanggal SO:</span> <strong>{d.date}</strong></p>
          <p><span className="text-gray-500">Target Pengiriman:</span> <strong>{d.delivery_date}</strong></p>
          <p><span className="text-gray-500">Pembayaran:</span> {d.payment_terms}</p>
        </div>
      </div>
      <ItemsTable
        columns={[
          { label: 'No.' }, { label: 'Keterangan' }, { label: 'Qty', right: true },
          { label: 'Satuan' }, { label: 'Harga Satuan', right: true }, { label: 'Total', right: true },
        ]}
        rows={d.items.map(it => [it.no, it.name, it.qty, it.unit, formatCurrency(it.price), formatCurrency(it.amount)])}
      />
      <TotalsBlock rows={[
        { label: 'Sub Total', value: formatCurrency(d.subtotal) },
        { label: 'PPN 12%', value: formatCurrency(d.ppn) },
        { label: 'TOTAL', value: formatCurrency(d.total), total: true },
      ]} />
      <SignatureBox labels={['Sales Manager', 'Pelanggan / Customer']} />
    </div>
  )
}

// ─── Template: Surat Jalan (Delivery Order) ───────────────────────
function TplSuratJalan() {
  const d = DEMO.delivery
  return (
    <div className="font-sans text-gray-900 bg-white p-12">
      <CompanyHeader />
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-widest">SURAT JALAN</h2>
          <p className="text-lg font-mono text-indigo-700 mt-1">{d.do_number}</p>
        </div>
        <div className="text-sm text-right bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <p><span className="text-gray-500">Tanggal:</span> <strong>{d.date}</strong></p>
          <p><span className="text-gray-500">Ref. SO:</span> <strong>{d.so_number}</strong></p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Dikirim Kepada</p>
          <p className="font-bold">{d.customer.name}</p>
          <p className="text-gray-600">{d.customer.address}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Info Pengiriman</p>
          <p><span className="text-gray-500">Pengemudi:</span> <strong>{d.driver}</strong></p>
          <p><span className="text-gray-500">Kendaraan:</span> <strong>{d.vehicle}</strong></p>
        </div>
      </div>
      <ItemsTable
        columns={[
          { label: 'No.' }, { label: 'Nama Barang' }, { label: 'Qty', right: true },
          { label: 'Satuan' }, { label: 'Berat' },
        ]}
        rows={d.items.map(it => [it.no, it.name, it.qty, it.unit, it.weight])}
      />
      {d.notes && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-gray-700">
          <strong>Catatan:</strong> {d.notes}
        </div>
      )}
      <div className="mt-8 grid grid-cols-3 gap-6 text-sm text-center">
        {['Pengirim', 'Pengemudi', 'Penerima'].map(l => (
          <div key={l}>
            <p className="text-gray-600 mb-1">{l}</p>
            <div className="h-16 border-b border-gray-300 mb-1" />
            <p className="text-gray-500 text-xs">( _________________ )</p>
            <p className="text-xs text-gray-400 mt-1">Tanggal: ___________</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Template: Customer Invoice ────────────────────────────────────
function TplInvoice() {
  const d = DEMO.invoice
  return (
    <div className="font-sans text-gray-900 bg-white p-12">
      <CompanyHeader />
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-widest">FAKTUR / INVOICE</h2>
          <p className="text-lg font-mono text-indigo-700 mt-1">{d.inv_number}</p>
        </div>
        <div className="text-sm text-right bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <p><span className="text-gray-500">Tanggal Faktur:</span> <strong>{d.date}</strong></p>
          <p><span className="text-gray-500">Jatuh Tempo:</span> <strong className="text-red-600">{d.due_date}</strong></p>
          <p><span className="text-gray-500">Ref. DO:</span> {d.do_number}</p>
        </div>
      </div>
      <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Tagihan Kepada</p>
        <p className="font-bold text-gray-900">{d.customer.name}</p>
        <p className="text-gray-600">{d.customer.address}</p>
        <p className="text-gray-600">NPWP: {d.customer.npwp}</p>
      </div>
      <ItemsTable
        columns={[
          { label: 'No.' }, { label: 'Keterangan' }, { label: 'Qty', right: true },
          { label: 'Satuan' }, { label: 'Harga Satuan', right: true }, { label: 'Jumlah', right: true },
        ]}
        rows={d.items.map(it => [it.no, it.name, it.qty, it.unit, formatCurrency(it.price), formatCurrency(it.amount)])}
      />
      <TotalsBlock rows={[
        { label: 'Sub Total', value: formatCurrency(d.subtotal) },
        { label: 'PPN 12%', value: formatCurrency(d.ppn) },
        { label: 'TOTAL TAGIHAN', value: formatCurrency(d.total), total: true },
      ]} />
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <p className="font-semibold text-blue-800 mb-2">Informasi Pembayaran</p>
        <p className="text-blue-700">{COMPANY.bank} &bull; No. Rekening: <strong>{COMPANY.account}</strong></p>
        <p className="text-blue-700">a/n: {COMPANY.account_name}</p>
        <p className="text-blue-600 text-xs mt-1">Harap cantumkan nomor invoice {d.inv_number} pada keterangan transfer.</p>
      </div>
      <SignatureBox labels={['Dibuat oleh,', 'Diketahui,']} />
      <p className="text-center text-xs text-gray-400 mt-8 pt-4 border-t border-gray-200">
        Invoice ini sah dan berlaku tanpa tanda tangan basah sesuai PKS yang berlaku.
      </p>
    </div>
  )
}

// ─── Template: Purchase Order ──────────────────────────────────────
function TplPurchaseOrder() {
  const d = DEMO.po
  return (
    <div className="font-sans text-gray-900 bg-white p-12">
      <CompanyHeader />
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-widest">PURCHASE ORDER</h2>
          <p className="text-lg font-mono text-indigo-700 mt-1">{d.po_number}</p>
        </div>
        <div className="text-sm text-right bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <p><span className="text-gray-500">Tanggal PO:</span> <strong>{d.date}</strong></p>
          <p><span className="text-gray-500">Tgl. Pengiriman:</span> <strong>{d.delivery_date}</strong></p>
          <p><span className="text-gray-500">Termin:</span> {d.payment_terms}</p>
        </div>
      </div>
      <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Kepada Vendor</p>
        <p className="font-bold text-gray-900">{d.vendor.name}</p>
        <p className="text-gray-600">{d.vendor.address}</p>
        <p className="text-gray-600">NPWP: {d.vendor.npwp}</p>
      </div>
      <ItemsTable
        columns={[
          { label: 'No.' }, { label: 'Keterangan' }, { label: 'Qty', right: true },
          { label: 'Satuan' }, { label: 'Harga Satuan', right: true }, { label: 'Total', right: true },
        ]}
        rows={d.items.map(it => [it.no, it.name, it.qty.toLocaleString('id'), it.unit, formatCurrency(it.price), formatCurrency(it.amount)])}
      />
      <TotalsBlock rows={[
        { label: 'Sub Total', value: formatCurrency(d.subtotal) },
        { label: 'PPN 12%', value: formatCurrency(d.ppn) },
        { label: 'TOTAL PO', value: formatCurrency(d.total), total: true },
      ]} />
      {d.notes && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-gray-700">
          <strong>Syarat & Ketentuan:</strong> {d.notes}
        </div>
      )}
      <SignatureBox labels={['Purchasing Manager', 'Disetujui oleh,', 'Vendor / Supplier']} />
    </div>
  )
}

// ─── Template: Slip Gaji ───────────────────────────────────────────
function TplSlipGaji() {
  const d = DEMO.slipgaji
  return (
    <div className="font-sans text-gray-900 bg-white p-12">
      <CompanyHeader />
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-widest">SLIP GAJI</h2>
          <p className="text-base font-semibold text-indigo-700 mt-1">Periode: {d.month}</p>
        </div>
        <div className="text-xs text-right bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <p className="font-semibold text-gray-800">RAHASIA / CONFIDENTIAL</p>
          <p className="text-gray-500 mt-1">Dokumen ini bersifat pribadi</p>
        </div>
      </div>
      <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm grid grid-cols-2 gap-x-8 gap-y-1">
        <div><span className="text-gray-500">Nama Karyawan:</span> <strong>{d.name}</strong></div>
        <div><span className="text-gray-500">NIK:</span> <strong>{d.nik}</strong></div>
        <div><span className="text-gray-500">Jabatan:</span> <strong>{d.position}</strong></div>
        <div><span className="text-gray-500">Departemen:</span> <strong>{d.department}</strong></div>
        <div><span className="text-gray-500">NPWP:</span> {d.npwp}</div>
        <div><span className="text-gray-500">Status Pajak:</span> {d.status_pajak}</div>
        <div className="col-span-2"><span className="text-gray-500">Rekening:</span> {d.bank}</div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 pb-1 border-b border-gray-200">KOMPONEN PENGHASILAN</p>
          <table className="w-full text-sm">
            <tbody>
              {d.earnings.map((e, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-700">{e.label}</td>
                  <td className="py-1.5 text-right font-medium">{formatCurrency(e.amount)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 font-bold text-emerald-700">
                <td className="py-2">Total Penghasilan</td>
                <td className="py-2 text-right">{formatCurrency(d.gross)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 pb-1 border-b border-gray-200">POTONGAN</p>
          <table className="w-full text-sm">
            <tbody>
              {d.deductions.map((e, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-700">{e.label}</td>
                  <td className="py-1.5 text-right font-medium text-red-600">({formatCurrency(e.amount)})</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 font-bold text-red-600">
                <td className="py-2">Total Potongan</td>
                <td className="py-2 text-right">({formatCurrency(d.total_deductions)})</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-4 p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl flex justify-between items-center">
        <p className="text-base font-black text-indigo-900 uppercase tracking-wide">Gaji Bersih (Take-Home Pay)</p>
        <p className="text-2xl font-black text-indigo-700">{formatCurrency(d.net_pay)}</p>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-6 text-sm text-center">
        <div>
          <p className="text-gray-600">Dibuat oleh HRD,</p>
          <div className="h-12 mt-2 mb-1 border-b border-gray-300" />
          <p className="text-gray-500 text-xs">( _________________ )</p>
        </div>
        <div>
          <p className="text-gray-600">Diterima oleh Karyawan,</p>
          <div className="h-12 mt-2 mb-1 border-b border-gray-300" />
          <p className="text-gray-500 text-xs">( {d.name} )</p>
        </div>
      </div>
      <p className="text-center text-xs text-gray-400 mt-6 pt-4 border-t border-gray-200">
        Slip gaji ini diterbitkan secara elektronik dan sah tanpa tanda tangan basah.
      </p>
    </div>
  )
}

// ─── Print Preview Overlay ─────────────────────────────────────────
function PrintPreview({ title, docComponent, onClose }) {
  useEffect(() => {
    const style = window.document.createElement('style')
    style.id = 'sep-print-styles'
    style.textContent = `
      @media print {
        #root { display: none !important; }
        #sep-print-portal .no-print { display: none !important; }
        #sep-print-portal {
          position: static !important; overflow: visible !important;
          background: white !important;
        }
      }
    `
    window.document.head.appendChild(style)
    window.document.body.style.overflow = 'hidden'
    return () => {
      window.document.getElementById('sep-print-styles')?.remove()
      window.document.body.style.overflow = ''
    }
  }, [])

  return createPortal(
    <div id="sep-print-portal" className="fixed inset-0 bg-gray-300 z-[9999] overflow-auto">
      {/* Toolbar */}
      <div className="no-print sticky top-0 bg-white border-b border-gray-200 shadow-sm z-10 px-6 py-3 flex items-center gap-4">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors"
        >
          <X size={15} /> Tutup Preview
        </button>
        <div className="h-4 w-px bg-gray-200" />
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-gray-400 hidden sm:block">Ctrl+P untuk shortcut</span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Printer size={14} /> Print / Simpan PDF
          </button>
        </div>
      </div>
      {/* Document */}
      <div className="no-print text-center py-3 text-xs text-gray-500">
        A4 Preview — Gunakan browser Print Dialog untuk simpan sebagai PDF
      </div>
      <div className="max-w-[794px] mx-auto mb-12 shadow-2xl">
        {docComponent}
      </div>
    </div>,
    window.document.body
  )
}

// ─── Document Catalog ──────────────────────────────────────────────
const CATALOG = [
  {
    tab: 'sales',
    title: 'Penawaran Harga',
    subtitle: 'Quotation / Penawaran',
    number: DEMO.quotation.quo_number,
    customer: DEMO.quotation.customer.name,
    amount: DEMO.quotation.total,
    component: <TplQuotation />,
  },
  {
    tab: 'sales',
    title: 'Order Konfirmasi',
    subtitle: 'Sales Order',
    number: DEMO.so.so_number,
    customer: DEMO.so.customer.name,
    amount: DEMO.so.total,
    component: <TplSalesOrder />,
  },
  {
    tab: 'sales',
    title: 'Surat Jalan',
    subtitle: 'Delivery Order',
    number: DEMO.delivery.do_number,
    customer: DEMO.delivery.customer.name,
    amount: null,
    component: <TplSuratJalan />,
  },
  {
    tab: 'sales',
    title: 'Faktur / Invoice',
    subtitle: 'Customer Invoice',
    number: DEMO.invoice.inv_number,
    customer: DEMO.invoice.customer.name,
    amount: DEMO.invoice.total,
    component: <TplInvoice />,
  },
  {
    tab: 'purchasing',
    title: 'Purchase Order',
    subtitle: 'Surat Pesanan Pembelian',
    number: DEMO.po.po_number,
    customer: DEMO.po.vendor.name,
    amount: DEMO.po.total,
    component: <TplPurchaseOrder />,
  },
  {
    tab: 'hr',
    title: 'Slip Gaji',
    subtitle: `${DEMO.slipgaji.name} — ${DEMO.slipgaji.month}`,
    number: DEMO.slipgaji.nik,
    customer: `${DEMO.slipgaji.position} · ${DEMO.slipgaji.department}`,
    amount: DEMO.slipgaji.net_pay,
    component: <TplSlipGaji />,
  },
]

const TABS = [
  { id: 'all', label: 'Semua', icon: FileText },
  { id: 'sales', label: 'Penjualan', icon: ShoppingBag },
  { id: 'purchasing', label: 'Pembelian', icon: ShoppingBag },
  { id: 'hr', label: 'HR & Payroll', icon: Users },
]

// ─── Main Component ────────────────────────────────────────────────
export default function PrintCenter() {
  const [activeTab, setActiveTab] = useState('all')
  const [preview, setPreview] = useState(null)

  const filtered = activeTab === 'all' ? CATALOG : CATALOG.filter(d => d.tab === activeTab)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Print Center</h1>
          <p className="text-sm text-gray-500 mt-0.5">Preview dan cetak semua dokumen transaksi dalam format siap kirim</p>
        </div>
        <div className="text-xs text-gray-400 bg-gray-100 rounded-lg px-3 py-2">
          <Printer size={12} className="inline mr-1" />
          Simpan sebagai PDF via browser print dialog
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Dokumen Penjualan', count: CATALOG.filter(d => d.tab === 'sales').length, color: 'bg-blue-50 text-blue-700 border-blue-100' },
          { label: 'Dokumen Pembelian', count: CATALOG.filter(d => d.tab === 'purchasing').length, color: 'bg-purple-50 text-purple-700 border-purple-100' },
          { label: 'Dokumen HR', count: CATALOG.filter(d => d.tab === 'hr').length, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          { label: 'Total Template', count: CATALOG.length, color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <div className="text-2xl font-bold">{s.count}</div>
            <div className="text-xs font-medium mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Document cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((doc, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <FileText size={18} />
              </div>
              <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{doc.number}</span>
            </div>
            <h3 className="font-bold text-gray-900">{doc.title}</h3>
            <p className="text-xs text-indigo-600 font-medium mb-2">{doc.subtitle}</p>
            <p className="text-sm text-gray-600 truncate">{doc.customer}</p>
            {doc.amount && (
              <p className="text-sm font-semibold text-gray-800 mt-1">{formatCurrency(doc.amount)}</p>
            )}
            <button
              onClick={() => setPreview({ title: `${doc.title} — ${doc.number}`, component: doc.component })}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-indigo-200 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 hover:border-indigo-300 transition-all group-hover:border-indigo-300"
            >
              <Printer size={14} /> Preview & Print
            </button>
          </div>
        ))}
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1 flex items-center gap-2">
          <BookOpen size={14} /> Cara Mencetak / Simpan PDF
        </p>
        <ol className="list-decimal pl-5 space-y-1 text-xs text-blue-700">
          <li>Klik tombol <strong>Preview & Print</strong> pada dokumen yang ingin dicetak</li>
          <li>Di halaman preview, klik tombol <strong>Print / Simpan PDF</strong> (atau tekan Ctrl+P)</li>
          <li>Pilih printer fisik <em>atau</em> pilih <strong>Save as PDF</strong> untuk menyimpan file PDF</li>
          <li>Atur ukuran kertas A4, orientasi Portrait, margin Normal</li>
        </ol>
      </div>

      {/* Print Preview overlay */}
      {preview && (
        <PrintPreview
          title={preview.title}
          docComponent={preview.component}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}
