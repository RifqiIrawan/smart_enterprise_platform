import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import AppLayout from '@/components/layout/AppLayout'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import UpdatePrompt from '@/components/ui/UpdatePrompt'
import Login from '@/pages/auth/Login'
import Forbidden from '@/pages/errors/Forbidden'
import NotFound from '@/pages/errors/NotFound'
import Dashboard from '@/pages/dashboard/Dashboard'
import SmartFactory from '@/pages/factory/SmartFactory'
import SmartWarehouse from '@/pages/warehouse/SmartWarehouse'
import AssetMaintenance from '@/pages/asset/AssetMaintenance'
import SmartHRIS from '@/pages/hris/SmartHRIS'
import Purchasing from '@/pages/purchasing/Purchasing'
import NetworkNOC from '@/pages/network/NetworkNOC'
import SmartBuilding from '@/pages/building/SmartBuilding'
import SmartEnergy from '@/pages/building/SmartEnergy'
import SmartVehicle from '@/pages/vehicle/SmartVehicle'
import SmartSecurity from '@/pages/security/SmartSecurity'
import AIAssistant from '@/pages/ai/AIAssistant'
import Analytics from '@/pages/analytics/Analytics'
import Accounting from '@/pages/accounting/Accounting'
import Sales from '@/pages/sales/Sales'
import Finance from '@/pages/finance/Finance'
import Tax from '@/pages/tax/Tax'
import MRP from '@/pages/mrp/MRP'
import QMS from '@/pages/qms/QMS'
import Cost from '@/pages/cost/Cost'
import Budget from '@/pages/budget/Budget'
import Settings from '@/pages/settings/Settings'
import Documents from '@/pages/documents/Documents'
import PrintCenter from '@/pages/print/PrintCenter'
import Integration from '@/pages/integration/Integration'
import CustomerPortal from '@/pages/portal/CustomerPortal'
import VendorPortal from '@/pages/portal/VendorPortal'
import Marketplace from '@/pages/marketplace/Marketplace'
import IoTHub from '@/pages/iot/IoTHub'
import SupplyChain from '@/pages/supply-chain/SupplyChain'
import ExecutiveDashboard from '@/pages/executive/ExecutiveDashboard'

function RequireAuth({ children }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return children
}

function RequirePermission({ permission, children }) {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  if (!hasPermission(permission)) return <Navigate to="/403" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { fontSize: '13px', borderRadius: '12px' },
        }}
      />
      <UpdatePrompt />
      <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<RequirePermission permission="dashboard.view"><Dashboard /></RequirePermission>} />
          <Route path="ai" element={<AIAssistant />} />
          <Route path="factory" element={<RequirePermission permission="factory.view"><SmartFactory /></RequirePermission>} />
          <Route path="warehouse" element={<RequirePermission permission="warehouse.view"><SmartWarehouse /></RequirePermission>} />
          <Route path="asset" element={<RequirePermission permission="asset.view"><AssetMaintenance /></RequirePermission>} />
          <Route path="hris" element={<RequirePermission permission="hris.view"><SmartHRIS /></RequirePermission>} />
          <Route path="purchasing" element={<RequirePermission permission="purchasing.view"><Purchasing /></RequirePermission>} />
          <Route path="network" element={<NetworkNOC />} />
          <Route path="building" element={<SmartBuilding />} />
          <Route path="energy" element={<SmartEnergy />} />
          <Route path="vehicle" element={<SmartVehicle />} />
          <Route path="security" element={<SmartSecurity />} />
          <Route path="analytics" element={<RequirePermission permission="analytics.view"><Analytics /></RequirePermission>} />
          <Route path="accounting" element={<RequirePermission permission="accounting.view"><Accounting /></RequirePermission>} />
          <Route path="sales" element={<RequirePermission permission="sales.view"><Sales /></RequirePermission>} />
          <Route path="finance" element={<RequirePermission permission="finance.view"><Finance /></RequirePermission>} />
          <Route path="tax" element={<RequirePermission permission="tax.view"><Tax /></RequirePermission>} />
          <Route path="mrp" element={<RequirePermission permission="mrp.view"><MRP /></RequirePermission>} />
          <Route path="qms" element={<RequirePermission permission="qms.view"><QMS /></RequirePermission>} />
          <Route path="cost" element={<RequirePermission permission="cost.view"><Cost /></RequirePermission>} />
          <Route path="budget" element={<RequirePermission permission="budget.view"><Budget /></RequirePermission>} />
          <Route path="settings/*" element={<RequirePermission permission="settings.view"><Settings /></RequirePermission>} />
          <Route path="documents" element={<Documents />} />
          <Route path="print" element={<PrintCenter />} />
          <Route path="integration" element={<Integration />} />
          <Route path="portal/customer" element={<CustomerPortal />} />
          <Route path="portal/vendor" element={<VendorPortal />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="iot-hub" element={<IoTHub />} />
          <Route path="supply-chain" element={<SupplyChain />} />
          <Route path="executive" element={<ExecutiveDashboard />} />
          <Route path="403" element={<Forbidden />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
