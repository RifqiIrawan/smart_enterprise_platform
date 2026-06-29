import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Role → permissions map (mirrors backend defaultRolePermissions)
const ROLE_PERMISSIONS = {
  superadmin: null, // null = all permissions
  admin: ['dashboard.view','sales.manage','purchasing.manage','warehouse.manage','factory.manage','hris.view','accounting.view','finance.view','tax.view','cost.view','budget.view','mrp.view','qms.view','asset.manage','analytics.view','settings.view'],
  finance: ['dashboard.view','sales.view','purchasing.view','warehouse.view','accounting.manage','finance.manage','tax.manage','cost.manage','budget.manage','analytics.view'],
  hr: ['dashboard.view','hris.manage','analytics.view'],
  warehouse: ['dashboard.view','warehouse.manage','purchasing.view','factory.view','analytics.view'],
  sales: ['dashboard.view','sales.manage','analytics.view'],
  purchasing: ['dashboard.view','purchasing.manage','warehouse.view','analytics.view'],
  operator: ['dashboard.view','factory.manage','warehouse.manage','asset.manage','qms.manage'],
  manager: ['dashboard.view','sales.view','purchasing.view','warehouse.view','factory.view','hris.view','accounting.view','finance.view','tax.view','cost.view','budget.view','mrp.view','qms.view','asset.view','analytics.view'],
  viewer: ['dashboard.view','sales.view','purchasing.view','warehouse.view','factory.view','asset.view','analytics.view'],
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      company: null,

      setAuth: (user, token, company) => set({ user, token, company }),
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, token: null, company: null }),

      isAuthenticated: () => !!get().token,

      hasPermission: (perm) => {
        const { user } = get()
        if (!user) return false
        if (user.role === 'superadmin') return true
        // Check custom permissions on user object first, then fall back to role default
        if (user.permissions?.length > 0) return user.permissions.includes(perm)
        const rolePerms = ROLE_PERMISSIONS[user.role]
        if (!rolePerms) return false
        // "x.manage" implies "x.view"
        const [mod] = perm.split('.')
        return rolePerms.includes(perm) || rolePerms.includes(`${mod}.manage`)
      },

      hasRole: (...roles) => roles.includes(get().user?.role),
    }),
    {
      name: 'sep-auth',
      partialize: (state) => ({ user: state.user, token: state.token, company: state.company }),
    }
  )
)
