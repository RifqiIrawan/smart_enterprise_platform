import api from './client'

export const dashboardApi = {
  kpi: () => api.get('/dashboard/kpi'),
  alerts: () => api.get('/dashboard/alerts'),
  oee: () => api.get('/dashboard/oee'),
}

export const analyticsApi = {
  getSummary: (period) => api.get('/analytics/summary', { params: { period } }),
  getRoleDashboard: () => api.get('/analytics/role-dashboard'),
}

export const factoryApi = {
  getWorkOrders: (params) => api.get('/factory/workorders', { params }),
  createWorkOrder: (data) => api.post('/factory/workorders', data),
  updateWorkOrderQty: (id, data) => api.patch(`/factory/workorders/${id}/qty`, data),
  getMachines: (params) => api.get('/factory/machines', { params }),
  createMachine: (data) => api.post('/factory/machines', data),
  updateMachine: (id, data) => api.put(`/factory/machines/${id}`, data),
  getBOM: (params) => api.get('/factory/bom', { params }),
  createBOM: (data) => api.post('/factory/bom', data),
  getDowntime: (params) => api.get('/factory/downtime', { params }),
  createDowntime: (data) => api.post('/factory/downtime', data),
  // Phase 31 — Manufacturing Excellence
  getWorkCenters: (params) => api.get('/factory/workcenters', { params }),
  createWorkCenter: (data) => api.post('/factory/workcenters', data),
  updateWorkCenter: (id, data) => api.put(`/factory/workcenters/${id}`, data),
  deleteWorkCenter: (id) => api.delete(`/factory/workcenters/${id}`),
  getProductRoutings: (params) => api.get('/factory/routings', { params }),
  createProductRouting: (data) => api.post('/factory/routings', data),
  updateProductRouting: (id, data) => api.put(`/factory/routings/${id}`, data),
  deleteProductRouting: (id) => api.delete(`/factory/routings/${id}`),
  getOEEReal: (period) => api.get('/factory/oee-real', { params: { period } }),
  getScrapRework: (params) => api.get('/factory/scrap', { params }),
  createScrapRework: (data) => api.post('/factory/scrap', data),
  getCapacityPlan: (month) => api.get('/factory/capacity', { params: { month } }),
  getProductionReport: (period) => api.get('/factory/report', { params: { period } }),
  getDowntimeAnalysis: (period) => api.get('/factory/downtime-analysis', { params: { period } }),
}

export const warehouseApi = {
  getInventory: (params) => api.get('/warehouse/inventory', { params }),
  createInventory: (data) => api.post('/warehouse/inventory', data),
  updateInventory: (id, data) => api.put(`/warehouse/inventory/${id}`, data),
  deleteInventory: (id) => api.delete(`/warehouse/inventory/${id}`),
  updateQty: (id, data) => api.put(`/warehouse/inventory/${id}/qty`, data),
  getMovements: (params) => api.get('/warehouse/movements', { params }),
  createMovement: (data) => api.post('/warehouse/movements', data),
  getAlerts: () => api.get('/warehouse/alerts'),
  createTransfer: (data) => api.post('/warehouse/transfer', data),
  getOpname: () => api.get('/warehouse/opname'),
  submitOpname: (data) => api.post('/warehouse/opname', data),
}

export const assetApi = {
  getAssets: (params) => api.get('/asset/assets', { params }),
  createAsset: (data) => api.post('/asset/assets', data),
  updateAsset: (id, data) => api.put(`/asset/assets/${id}`, data),
  deleteAsset: (id) => api.delete(`/asset/assets/${id}`),
  getMaintenance: (params) => api.get('/asset/maintenance', { params }),
  createMaintenance: (data) => api.post('/asset/maintenance', data),
  updateMaintenanceStatus: (id, status) => api.patch(`/asset/maintenance/${id}/status`, { status }),
  // Phase 17 — CMMS
  getPMSchedules: (params) => api.get('/asset/pm', { params }),
  createPMSchedule: (data) => api.post('/asset/pm', data),
  updatePMSchedule: (id, data) => api.put(`/asset/pm/${id}`, data),
  deletePMSchedule: (id) => api.delete(`/asset/pm/${id}`),
  getSpareParts: (params) => api.get('/asset/spareparts', { params }),
  createSparePart: (data) => api.post('/asset/spareparts', data),
  updateSparePart: (id, data) => api.put(`/asset/spareparts/${id}`, data),
  deleteSparePart: (id) => api.delete(`/asset/spareparts/${id}`),
  getDepreciation: () => api.get('/asset/depreciation'),
  calculateDepreciation: (data) => api.post('/asset/depreciation/calculate', data),
  getDisposals: (params) => api.get('/asset/disposals', { params }),
  createDisposal: (data) => api.post('/asset/disposals', data),
}

export const hrisApi = {
  getEmployees: (params) => api.get('/hris/employees', { params }),
  createEmployee: (data) => api.post('/hris/employees', data),
  updateEmployee: (id, data) => api.put(`/hris/employees/${id}`, data),
  deleteEmployee: (id) => api.delete(`/hris/employees/${id}`),
  getAttendance: (params) => api.get('/hris/attendance', { params }),
  checkIn: (data) => api.post('/hris/attendance/checkin', data),
  checkOut: (id) => api.patch(`/hris/attendance/${id}/checkout`, {}),
  getLeaves: (params) => api.get('/hris/leaves', { params }),
  createLeave: (data) => api.post('/hris/leaves', data),
  updateLeaveStatus: (id, status) => api.patch(`/hris/leaves/${id}/status`, { status }),
  getPayroll: (params) => api.get('/hris/payroll', { params }),
  generatePayroll: (period) => api.post('/hris/payroll/generate', { period }),
  updatePayrollStatus: (id, status) => api.patch(`/hris/payroll/${id}/status`, { status }),
  // Phase 16 — Rekrutmen
  getJobs: (params) => api.get('/hris/jobs', { params }),
  createJob: (data) => api.post('/hris/jobs', data),
  updateJobStatus: (id, status) => api.patch(`/hris/jobs/${id}/status`, { status }),
  deleteJob: (id) => api.delete(`/hris/jobs/${id}`),
  getCandidates: (params) => api.get('/hris/candidates', { params }),
  createCandidate: (data) => api.post('/hris/candidates', data),
  updateCandidateStage: (id, data) => api.patch(`/hris/candidates/${id}/stage`, data),
  deleteCandidate: (id) => api.delete(`/hris/candidates/${id}`),
  // Phase 16 — Training
  getTrainingPrograms: (params) => api.get('/hris/training/programs', { params }),
  createTrainingProgram: (data) => api.post('/hris/training/programs', data),
  deleteTrainingProgram: (id) => api.delete(`/hris/training/programs/${id}`),
  getTrainingSchedules: (params) => api.get('/hris/training/schedules', { params }),
  createTrainingSchedule: (data) => api.post('/hris/training/schedules', data),
  updateTrainingStatus: (id, data) => api.patch(`/hris/training/schedules/${id}/status`, data),
  // Phase 16 — KPI
  getKPITemplates: (params) => api.get('/hris/kpi/templates', { params }),
  createKPITemplate: (data) => api.post('/hris/kpi/templates', data),
  deleteKPITemplate: (id) => api.delete(`/hris/kpi/templates/${id}`),
  getKPIReviews: (params) => api.get('/hris/kpi/reviews', { params }),
  createKPIReview: (data) => api.post('/hris/kpi/reviews', data),
  // Phase 16 — Shift & Lembur
  getShifts: (params) => api.get('/hris/shifts', { params }),
  createShift: (data) => api.post('/hris/shifts', data),
  deleteShift: (id) => api.delete(`/hris/shifts/${id}`),
  getOvertime: (params) => api.get('/hris/overtime', { params }),
  createOvertime: (data) => api.post('/hris/overtime', data),
  updateOvertimeStatus: (id, status) => api.patch(`/hris/overtime/${id}/status`, { status }),
  // Phase 32 — HR Completion
  getHRDashboard: () => api.get('/hris/dashboard'),
  getOrgChart: (dept) => api.get('/hris/orgchart', { params: { dept } }),
  getPayslipHistory: (params) => api.get('/hris/payslip', { params }),
  getPayslip: (id) => api.get(`/hris/payslip/${id}`),
  getAttendanceCalendar: (month, empId) => api.get('/hris/attendance-calendar', { params: { month, emp_id: empId } }),
}

export const purchasingApi = {
  getPR: (params) => api.get('/purchasing/pr', { params }),
  createPR: (data) => api.post('/purchasing/pr', data),
  updatePRStatus: (id, status) => api.patch(`/purchasing/pr/${id}/status`, { status }),
  convertPRtoPO: (id, data) => api.post(`/purchasing/pr/${id}/convert`, data),
  deletePR: (id) => api.delete(`/purchasing/pr/${id}`),
  getPO: (params) => api.get('/purchasing/po', { params }),
  createPO: (data) => api.post('/purchasing/po', data),
  deletePO: (id) => api.delete(`/purchasing/po/${id}`),
  getGRN: (params) => api.get('/purchasing/grn', { params }),
  createGRN: (data) => api.post('/purchasing/grn', data),
  getVendors: (params) => api.get('/purchasing/vendors', { params }),
  createVendor: (data) => api.post('/purchasing/vendors', data),
  updateVendor: (id, data) => api.put(`/purchasing/vendors/${id}`, data),
  deleteVendor: (id) => api.delete(`/purchasing/vendors/${id}`),
}

export const accountingApi = {
  getCOA: (params) => api.get('/accounting/coa', { params }),
  createCOA: (data) => api.post('/accounting/coa', data),
  getJournal: (params) => api.get('/accounting/journal', { params }),
  createJournal: (data) => api.post('/accounting/journal', data),
  getPL: () => api.get('/accounting/pl'),
  getBalanceSheet: () => api.get('/accounting/balance-sheet'),
}

export const securityApi = {
  getVisitors: (params) => api.get('/security/visitors', { params }),
  checkIn: (data) => api.post('/security/visitors', data),
  checkOut: (id) => api.patch(`/security/visitors/${id}/checkout`, {}),
  getIncidents: (params) => api.get('/security/incidents', { params }),
  createIncident: (data) => api.post('/security/incidents', data),
  updateIncidentStatus: (id, status) => api.patch(`/security/incidents/${id}/status`, { status }),
}

export const vehicleApi = {
  getFleet: (params) => api.get('/vehicle/fleet', { params }),
  getFuelLogs: (params) => api.get('/vehicle/fuel', { params }),
  createFuelLog: (data) => api.post('/vehicle/fuel', data),
}

export const networkApi = {
  getDevices: (params) => api.get('/network/devices', { params }),
  toggleDevice: (id) => api.patch(`/network/devices/${id}/toggle`, {}),
  getTraffic: () => api.get('/network/traffic'),
  pollDevices: () => api.get('/iot/network/poll'),
}

export const iotApi = {
  getBuildingSensors: () => api.get('/iot/building/sensors'),
  getGPSTracking: () => api.get('/iot/gps'),
}

export const notificationApi = {
  get: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`, {}),
  clear: () => api.delete('/notifications/clear'),
}

export const searchApi = {
  query: (q) => api.get('/search', { params: { q } }),
}

export const aiApi = {
  chat: (message) => api.post('/ai/chat', { message }),
}

export const costApi = {
  getCostCenters: () => api.get('/cost/centers'),
  createCostCenter: (data) => api.post('/cost/centers', data),
  updateCostCenter: (id, data) => api.put(`/cost/centers/${id}`, data),
  deleteCostCenter: (id) => api.delete(`/cost/centers/${id}`),
  getWOCosts: (params) => api.get('/cost/wo-costs', { params }),
  createWOCost: (data) => api.post('/cost/wo-costs', data),
  deleteWOCost: (id) => api.delete(`/cost/wo-costs/${id}`),
  getStandardCosts: () => api.get('/cost/standard-costs'),
  upsertStandardCost: (data) => api.post('/cost/standard-costs', data),
  deleteStandardCost: (id) => api.delete(`/cost/standard-costs/${id}`),
  getCostVariance: (params) => api.get('/cost/variance', { params }),
  getCOGSReport: (params) => api.get('/cost/cogs', { params }),
  getProfitabilityReport: (params) => api.get('/cost/profitability', { params }),
  getCostCenterReport: (params) => api.get('/cost/center-report', { params }),
  getCostSummary: (params) => api.get('/cost/summary', { params }),
}

export const budgetApi = {
  getEntries: (params) => api.get('/budget/entries', { params }),
  createEntry: (data) => api.post('/budget/entries', data),
  updateEntry: (id, data) => api.put(`/budget/entries/${id}`, data),
  deleteEntry: (id) => api.delete(`/budget/entries/${id}`),
  submitApproval: (id) => api.patch(`/budget/entries/${id}/submit`),
  approve: (id) => api.patch(`/budget/entries/${id}/approve`),
  reject: (id, data) => api.patch(`/budget/entries/${id}/reject`, data),
  importEntries: (items) => api.post('/budget/entries/import', items),
  getVsActual: (params) => api.get('/budget/vs-actual', { params }),
  getAlerts: () => api.get('/budget/alerts'),
  getForecast: () => api.get('/budget/forecast'),
  getScenarios: () => api.get('/budget/scenarios'),
  createScenario: (data) => api.post('/budget/scenarios', data),
  updateScenario: (id, data) => api.put(`/budget/scenarios/${id}`, data),
  deleteScenario: (id) => api.delete(`/budget/scenarios/${id}`),
}

export const qmsApi = {
  getStats: () => api.get('/qms/stats'),
  getInspections: (params) => api.get('/qms/inspections', { params }),
  createInspection: (data) => api.post('/qms/inspections', data),
  updateInspectionResult: (id, data) => api.patch(`/qms/inspections/${id}/result`, data),
  deleteInspection: (id) => api.delete(`/qms/inspections/${id}`),
  getNCRs: () => api.get('/qms/ncr'),
  createNCR: (data) => api.post('/qms/ncr', data),
  updateNCRStatus: (id, data) => api.patch(`/qms/ncr/${id}/status`, data),
  deleteNCR: (id) => api.delete(`/qms/ncr/${id}`),
  getCAPAs: (params) => api.get('/qms/capa', { params }),
  createCAPA: (data) => api.post('/qms/capa', data),
  updateCAPAStatus: (id, data) => api.patch(`/qms/capa/${id}/status`, data),
  getTools: () => api.get('/qms/tools'),
  createTool: (data) => api.post('/qms/tools', data),
  recordCalibration: (id, data) => api.patch(`/qms/tools/${id}/calibrate`, data),
  deleteTool: (id) => api.delete(`/qms/tools/${id}`),
  getCalibrationAlerts: () => api.get('/qms/calibration-alerts'),
}

export const mrpApi = {
  getRuns: () => api.get('/mrp/runs'),
  runMRP: (data) => api.post('/mrp/runs', data),
  getResults: (params) => api.get('/mrp/results', { params }),
  getExceptions: () => api.get('/mrp/exceptions'),
  getSchedules: () => api.get('/mrp/schedules'),
  createSchedule: (data) => api.post('/mrp/schedules', data),
  updateScheduleStatus: (id, status) => api.patch(`/mrp/schedules/${id}/status`, { status }),
  deleteSchedule: (id) => api.delete(`/mrp/schedules/${id}`),
  getRoutings: (params) => api.get('/mrp/routings', { params }),
  createRouting: (data) => api.post('/mrp/routings', data),
  updateRouting: (id, data) => api.put(`/mrp/routings/${id}`, data),
  deleteRouting: (id) => api.delete(`/mrp/routings/${id}`),
  getLots: () => api.get('/mrp/lots'),
  createLot: (data) => api.post('/mrp/lots', data),
  deleteLot: (id) => api.delete(`/mrp/lots/${id}`),
}

export const taxApi = {
  getConfigs: () => api.get('/tax/configs'),
  upsertConfig: (data) => api.post('/tax/configs', data),
  getFakturKeluaran: (params) => api.get('/tax/faktur-keluaran', { params }),
  getFakturMasukan: (params) => api.get('/tax/faktur-masukan', { params }),
  getRekapPPN: (params) => api.get('/tax/ppn-rekap', { params }),
  getPPh21: (params) => api.get('/tax/pph21', { params }),
  generatePPh21: (data) => api.post('/tax/pph21/generate', data),
  deletePPh21: (id) => api.delete(`/tax/pph21/${id}`),
  getPPh23: (params) => api.get('/tax/pph23', { params }),
  createPPh23: (data) => api.post('/tax/pph23', data),
  deletePPh23: (id) => api.delete(`/tax/pph23/${id}`),
  getBPJS: (params) => api.get('/tax/bpjs', { params }),
  generateBPJS: (data) => api.post('/tax/bpjs/generate', data),
  deleteBPJS: (id) => api.delete(`/tax/bpjs/${id}`),
}

export const financeApi = {
  getBankAccounts: () => api.get('/finance/bank-accounts'),
  createBankAccount: (data) => api.post('/finance/bank-accounts', data),
  updateBankAccount: (id, data) => api.put(`/finance/bank-accounts/${id}`, data),
  deleteBankAccount: (id) => api.delete(`/finance/bank-accounts/${id}`),
  getVendorInvoices: (params) => api.get('/finance/vendor-invoices', { params }),
  createVendorInvoice: (data) => api.post('/finance/vendor-invoices', data),
  updateVIStatus: (id, status) => api.patch(`/finance/vendor-invoices/${id}/status`, { status }),
  getPaymentsOut: (params) => api.get('/finance/payments-out', { params }),
  createPaymentOut: (data) => api.post('/finance/payments-out', data),
  getPaymentsIn: (params) => api.get('/finance/payments-in', { params }),
  createPaymentIn: (data) => api.post('/finance/payments-in', data),
  getAgingAP: () => api.get('/finance/aging-ap'),
  getAgingAR: () => api.get('/finance/aging-ar'),
  getCashPosition: () => api.get('/finance/cash-position'),
}

export const salesApi = {
  // Customers (master)
  getCustomers: (params) => api.get('/sales/customers', { params }),
  createCustomer: (data) => api.post('/sales/customers', data),
  updateCustomer: (id, data) => api.put(`/sales/customers/${id}`, data),
  deleteCustomer: (id) => api.delete(`/sales/customers/${id}`),

  // Sales Orders
  getSalesOrders: (params) => api.get('/sales/orders', { params }),
  createSalesOrder: (data) => api.post('/sales/orders', data),
  getSalesOrderDetail: (id) => api.get(`/sales/orders/${id}`),
  updateSOStatus: (id, status) => api.patch(`/sales/orders/${id}/status`, { status }),
  deleteSalesOrder: (id) => api.delete(`/sales/orders/${id}`),

  // Delivery Orders
  getDeliveryOrders: (params) => api.get('/sales/delivery', { params }),
  createDelivery: (data) => api.post('/sales/delivery', data),
  confirmDelivery: (id) => api.patch(`/sales/delivery/${id}/confirm`, {}),

  // Invoices
  getInvoices: (params) => api.get('/sales/invoices', { params }),
  createInvoice: (data) => api.post('/sales/invoices', data),

  // Phase 24 — Quotation
  getQuotations: (params) => api.get('/sales/quotations', { params }),
  createQuotation: (data) => api.post('/sales/quotations', data),
  updateQuotationStatus: (id, status) => api.patch(`/sales/quotations/${id}/status`, { status }),
  convertQuotationToSO: (id) => api.post(`/sales/quotations/${id}/convert`),

  // Phase 24 — Sales Return
  getSalesReturns: (params) => api.get('/sales/returns', { params }),
  createSalesReturn: (data) => api.post('/sales/returns', data),
  confirmSalesReturn: (id) => api.patch(`/sales/returns/${id}/confirm`, {}),

  // Phase 24 — CRM
  getLeads: (params) => api.get('/sales/crm/leads', { params }),
  createLead: (data) => api.post('/sales/crm/leads', data),
  updateLead: (id, data) => api.put(`/sales/crm/leads/${id}`, data),
  updateLeadStage: (id, stage) => api.patch(`/sales/crm/leads/${id}/stage`, { stage }),
  getCRMActivities: (params) => api.get('/sales/crm/activities', { params }),
  createCRMActivity: (data) => api.post('/sales/crm/activities', data),
  getCRMStats: () => api.get('/sales/crm/stats'),
}

export const rbacApi = {
  // Users
  getUsers: (params) => api.get('/rbac/users', { params }),
  createUser: (data) => api.post('/rbac/users', data),
  updateUser: (id, data) => api.put(`/rbac/users/${id}`, data),
  toggleActive: (id, is_active) => api.patch(`/rbac/users/${id}/toggle-active`, { is_active }),
  resetPassword: (id, new_password) => api.post(`/rbac/users/${id}/reset-password`, { new_password }),
  // Roles & Permissions
  getRoles: () => api.get('/rbac/roles'),
  getPermissions: () => api.get('/rbac/permissions'),
  updateRolePermissions: (role, permissions) => api.put(`/rbac/roles/${role}/permissions`, { permissions }),
  // Access Logs
  getAccessLogs: (params) => api.get('/rbac/access-logs', { params }),
  // Companies
  getCompanies: () => api.get('/rbac/companies'),
  createCompany: (data) => api.post('/rbac/companies', data),
}

export const documentApi = {
  upload: (formData) => api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAll: (params) => api.get('/documents', { params }),
  remove: (id) => api.delete(`/documents/${id}`),
}

export const currencyApi = {
  getList: (params) => api.get('/currency/list', { params }),
  create: (data) => api.post('/currency/list', data),
  update: (id, data) => api.put(`/currency/list/${id}`, data),
  getRates: (params) => api.get('/currency/rates', { params }),
  setRate: (data) => api.post('/currency/rates', data),
  getLatestRates: () => api.get('/currency/rates/latest'),
}

export const notifConfigApi = {
  get: () => api.get('/settings/notif-config'),
  save: (data) => api.put('/settings/notif-config', data),
  testEmail: (email) => api.post('/settings/notif-config/test-email', { email }),
}

export const biApi = {
  getDemandForecast: () => api.get('/bi/demand-forecast'),
  getPredictiveMaintenance: () => api.get('/bi/predictive-maintenance'),
  getAnomalies: () => api.get('/bi/anomalies'),
  getPriceRecommendation: () => api.get('/bi/price-recommendation'),
  getComparison: () => api.get('/bi/comparison'),
  getCustomReport: (data) => api.post('/bi/custom-report', data),
  getScheduledReports: () => api.get('/bi/scheduled-reports'),
  saveScheduledReport: (data) => api.post('/bi/scheduled-reports', data),
}

export const financeGlApi = {
  getGeneralLedger: (params) => api.get('/finance/gl', { params }),
  getTrialBalance: (params) => api.get('/finance/trial-balance', { params }),
  getCashFlow: (params) => api.get('/finance/cashflow', { params }),
  getPeriods: () => api.get('/finance/periods'),
  closePeriod: (id) => api.patch(`/finance/periods/${id}/close`, {}),
  reopenPeriod: (id) => api.patch(`/finance/periods/${id}/reopen`, {}),
  getComparativeIncome: (params) => api.get('/finance/comparative/income-statement', { params }),
  getComparativeBalance: (params) => api.get('/finance/comparative/balance-sheet', { params }),
}

export const taxEfakturApi = {
  getNSFP: () => api.get('/tax/nsfp'),
  importNSFP: (data) => api.post('/tax/nsfp/import', data),
  getEFaktur: (params) => api.get('/tax/efaktur', { params }),
  getEFakturXML: (id) => api.get(`/tax/efaktur/${id}/xml`),
  exportEFakturCSV: (params) => api.get('/tax/efaktur/export-csv', { params }),
  uploadCoretax: (id) => api.post(`/tax/efaktur/${id}/upload`, {}),
  getSPTPPN: (params) => api.get('/tax/spt-ppn', { params }),
  submitSPTPPN: (data) => api.post('/tax/spt-ppn/submit', data),
}

export const bankReconApi = {
  getSessions: () => api.get('/recon/sessions'),
  createSession: (data) => api.post('/recon/sessions', data),
  getDetail: (id) => api.get(`/recon/sessions/${id}`),
  autoMatch: (id) => api.post(`/recon/sessions/${id}/auto-match`, {}),
  manualMatch: (id, data) => api.post(`/recon/sessions/${id}/manual-match`, data),
  lockSession: (id) => api.patch(`/recon/sessions/${id}/lock`, {}),
  getPettyCash: () => api.get('/petty-cash'),
  createPettyCash: (data) => api.post('/petty-cash', data),
  getPettyCashTransactions: (params) => api.get('/petty-cash/transactions', { params }),
  createPettyCashTransaction: (data) => api.post('/petty-cash/transactions', data),
  replenish: (id, data) => api.post(`/petty-cash/${id}/replenish`, data),
}

export const integrationApi = {
  getImportTemplates: () => api.get('/integration/import/templates'),
  downloadTemplate: (type) => api.get(`/integration/import/templates/${type}/download`, { responseType: 'blob' }),
  previewImport: (params) => api.post('/integration/import/preview', null, { params }),
  executeImport: (data) => api.post('/integration/import/execute', data),
  getImportHistory: (params) => api.get('/integration/import/history', { params }),
  exportData: (type, params) => api.get(`/integration/export/${type}`, { params, responseType: 'blob' }),
  getAPIKeys: () => api.get('/integration/api-keys'),
  createAPIKey: (data) => api.post('/integration/api-keys', data),
  revokeAPIKey: (id) => api.delete(`/integration/api-keys/${id}`),
  getAPIUsageLogs: (params) => api.get('/integration/api-keys/logs', { params }),
  getWebhooks: () => api.get('/integration/webhooks'),
  createWebhook: (data) => api.post('/integration/webhooks', data),
  updateWebhook: (id, data) => api.put(`/integration/webhooks/${id}`, data),
  deleteWebhook: (id) => api.delete(`/integration/webhooks/${id}`),
  getWebhookLogs: (id, params) => api.get(`/integration/webhooks/${id}/logs`, { params }),
  getWebhookEvents: () => api.get('/integration/webhook-events'),
}

export const pushApi = {
  getVapidKey: () => api.get('/push/vapid-key'),
  subscribe: (subscription) => api.post('/push/subscribe', subscription),
  unsubscribe: () => api.delete('/push/subscribe'),
  getStatus: () => api.get('/push/status'),
  send: (msg) => api.post('/push/send', msg),
}

export const executiveApi = {
  getDashboard: (period) => api.get('/executive/dashboard', { params: { period } }),
  getKPITargets: () => api.get('/executive/kpi-targets'),
  updateKPITargets: (data) => api.put('/executive/kpi-targets', data),
  getManagementReport: (period) => api.get('/executive/management-report', { params: { period } }),
}

export const supplyChainApi = {
  getMap: () => api.get('/supply-chain/map'),
  getTraceability: (params) => api.get('/supply-chain/traceability', { params }),
  getSupplierScorecard: () => api.get('/supply-chain/supplier-scorecard'),
  getRisk: () => api.get('/supply-chain/risk'),
}

export const marketplaceApi = {
  getSummary: () => api.get('/marketplace/summary'),
  getChannels: () => api.get('/marketplace/channels'),
  getOrders: (params) => api.get('/marketplace/orders', { params }),
  fulfillOrder: (id) => api.post(`/marketplace/orders/${id}/fulfill`, {}),
  getListings: (params) => api.get('/marketplace/listings', { params }),
  syncListing: (id) => api.post('/marketplace/listings/sync', { id }),
}

export const iotHubApi = {
  getDevices: (params) => api.get('/iot/devices', { params }),
  createDevice: (data) => api.post('/iot/devices', data),
  updateDevice: (id, data) => api.put(`/iot/devices/${id}`, data),
  deleteDevice: (id) => api.delete(`/iot/devices/${id}`),
  getReadings: () => api.get('/iot/readings'),
  getAlertRules: (params) => api.get('/iot/alert-rules', { params }),
  createAlertRule: (data) => api.post('/iot/alert-rules', data),
  deleteAlertRule: (id) => api.delete(`/iot/alert-rules/${id}`),
  getAlertHistory: (params) => api.get('/iot/alert-history', { params }),
}

export const portalApi = {
  getCustomers: () => api.get('/portal/customers'),
  getVendors: () => api.get('/portal/vendors'),
  // Customer Portal
  getCustomerDashboard: (customerId) => api.get('/portal/customer/dashboard', { params: { customer_id: customerId } }),
  getCustomerOrders: (params) => api.get('/portal/customer/orders', { params }),
  getCustomerInvoices: (params) => api.get('/portal/customer/invoices', { params }),
  getCustomerDeliveries: (params) => api.get('/portal/customer/deliveries', { params }),
  // Vendor Portal
  getVendorDashboard: (vendorId) => api.get('/portal/vendor/dashboard', { params: { vendor_id: vendorId } }),
  getVendorPOs: (params) => api.get('/portal/vendor/pos', { params }),
  getVendorInvoices: (params) => api.get('/portal/vendor/invoices', { params }),
  createVendorInvoice: (data) => api.post('/portal/vendor/invoices', data),
  getVendorPayments: (params) => api.get('/portal/vendor/payments', { params }),
}

export const securityAdvApi = {
  // 2FA
  get2FAStatus: () => api.get('/security/2fa/status'),
  setup2FA: () => api.post('/security/2fa/setup', {}),
  enable2FA: (code) => api.post('/security/2fa/enable', { code }),
  disable2FA: (code) => api.post('/security/2fa/disable', { code }),
  regenerateBackupCodes: () => api.post('/security/2fa/backup-codes/regenerate', {}),
  // Sessions
  getSessions: () => api.get('/security/sessions'),
  revokeSession: (id) => api.delete(`/security/sessions/${id}`),
  revokeAllSessions: () => api.delete('/security/sessions'),
  // Audit Trail
  getAuditTrail: (params) => api.get('/security/audit-trail', { params }),
  exportAuditTrail: (params) => api.get('/security/audit-trail/export', { params, responseType: 'blob' }),
  // Security Policy
  getPolicy: () => api.get('/security/policy'),
  updatePolicy: (data) => api.put('/security/policy', data),
}

