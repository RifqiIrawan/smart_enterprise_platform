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
import ApprovalCenter from '@/pages/approval/ApprovalCenter'

function RequireAuth({ children }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return children
}

function RequirePermission({ permission, children }) {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const menuPermissionsLoaded = useAuthStore((s) => s.menuPermissionsLoaded)
  const role = useAuthStore((s) => s.user?.role)
  // menuPermissions loads asynchronously (DB fetch) — until it settles, withhold the
  // allow/deny decision instead of defaulting to "deny" and navigating away prematurely.
  if (role !== 'superadmin' && !menuPermissionsLoaded) return null
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
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="ai" element={<AIAssistant />} />
          <Route path="approval" element={<ApprovalCenter />} />
          <Route path="factory/:tab?" element={<RequirePermission permission="factory.view"><SmartFactory /></RequirePermission>} />
          <Route path="warehouse/:tab?" element={<RequirePermission permission="warehouse.view"><SmartWarehouse /></RequirePermission>} />
          <Route path="asset/:tab?" element={<RequirePermission permission="asset.view"><AssetMaintenance /></RequirePermission>} />
          <Route path="hris/:tab?" element={<RequirePermission permission="hris.view"><SmartHRIS /></RequirePermission>} />
          <Route path="purchasing/:tab?" element={<RequirePermission permission="purchasing.view"><Purchasing /></RequirePermission>} />
          <Route path="network/:tab?" element={<RequirePermission permission="network.view"><NetworkNOC /></RequirePermission>} />
          <Route path="building/:tab?" element={<RequirePermission permission="building.view"><SmartBuilding /></RequirePermission>} />
          <Route path="energy" element={<SmartEnergy />} />
          <Route path="vehicle/:tab?" element={<RequirePermission permission="vehicle.view"><SmartVehicle /></RequirePermission>} />
          <Route path="security/:tab?" element={<RequirePermission permission="security.view"><SmartSecurity /></RequirePermission>} />
          <Route path="analytics/:tab?" element={<RequirePermission permission="analytics.view"><Analytics /></RequirePermission>} />
          <Route path="accounting/:tab?" element={<RequirePermission permission="accounting.view"><Accounting /></RequirePermission>} />
          <Route path="sales/:tab?" element={<RequirePermission permission="sales.view"><Sales /></RequirePermission>} />
          <Route path="finance/:tab?" element={<RequirePermission permission="finance.view"><Finance /></RequirePermission>} />
          <Route path="tax/:tab?" element={<RequirePermission permission="tax.view"><Tax /></RequirePermission>} />
          <Route path="mrp/:tab?" element={<RequirePermission permission="mrp.view"><MRP /></RequirePermission>} />
          <Route path="qms/:tab?" element={<RequirePermission permission="qms.view"><QMS /></RequirePermission>} />
          <Route path="cost/:tab?" element={<RequirePermission permission="cost.view"><Cost /></RequirePermission>} />
          <Route path="budget/:tab?" element={<RequirePermission permission="budget.view"><Budget /></RequirePermission>} />
          <Route path="settings/:tab?" element={<RequirePermission permission="settings.view"><Settings /></RequirePermission>} />
          <Route path="documents" element={<Documents />} />
          <Route path="print" element={<PrintCenter />} />
          <Route path="integration" element={<Integration />} />
          <Route path="portal/customer" element={<CustomerPortal />} />
          <Route path="portal/vendor" element={<VendorPortal />} />
          <Route path="marketplace/:tab?" element={<RequirePermission permission="marketplace.view"><Marketplace /></RequirePermission>} />
          <Route path="iot-hub/:tab?" element={<RequirePermission permission="iot.view"><IoTHub /></RequirePermission>} />
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
