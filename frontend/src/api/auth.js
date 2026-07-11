import api from './client'

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
  changePassword: (data) => api.put('/auth/password', data),
  switchCompany: (companyId) => api.post('/auth/switch-company', { company_id: companyId }),
}
