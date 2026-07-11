import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/api/client'
import { authApi } from '@/api/auth'

const MENU_LEVEL_ORDER = { none: 0, view: 1, add: 2, edit: 3, delete: 4 }

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      company: null,
      // Lightweight "browse as" lens, separate from the session's actual company
      // (above) — set via the header's company dropdown, applied by an axios
      // interceptor to every request's params, cleared without touching the JWT.
      companyFilter: null,
      menuPermissions: {},
      // Tracks whether the initial DB fetch for the current user has settled. hasPermission
      // and canDo derive from menuPermissions, which is fetched asynchronously — RequirePermission
      // must wait for this to be true before making an allow/deny call, otherwise it sees the
      // empty initial state on first render and wrongly navigates to /403 before data arrives.
      menuPermissionsLoaded: false,

      setAuth: (user, token, company) => set({ user, token, company }),
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, token: null, company: null, menuPermissions: {}, menuPermissionsLoaded: false }),

      // Re-issues the session's JWT scoped to a different company (session-only —
      // never changes the user's enduring primary/home company). A full page reload
      // follows so every page's already-fetched data (none of it company-aware on
      // the client side) gets refetched under the new company context, instead of
      // risking stale cross-company data flashing from cached component state.
      switchCompany: async (companyId) => {
        const res = await authApi.switchCompany(companyId)
        const { token, user, company } = res.data
        set({ user, token, company, menuPermissions: {}, menuPermissionsLoaded: false })
        window.location.href = '/dashboard'
      },

      // Sets/clears the "browse as" company lens (pass null to clear, i.e. "Ikuti
      // Perusahaan Saya"). A full reload follows for the same reason switchCompany
      // reloads — no page currently invalidates its cached data on company change.
      setCompanyFilter: (company) => {
        set({ companyFilter: company })
        window.location.reload()
      },

      // Fine-grained per-menu permission layer (view/add/edit/delete tiers), resolved
      // for this specific user: a per-user override (user_menu_permissions) wins over
      // the role default when present.
      loadMenuPermissions: async () => {
        const { user } = get()
        if (!user) return
        if (user.role === 'superadmin') { set({ menuPermissionsLoaded: true }); return }
        try {
          const res = await api.get('/rbac/menu-permissions', { params: { role: user.role, user_id: user.id } })
          set({ menuPermissions: res?.data || {}, menuPermissionsLoaded: true })
        } catch {
          // fail closed to "none" via getMenuLevel's default — no permissions loaded
          set({ menuPermissionsLoaded: true })
        }
      },

      getMenuLevel: (menuKey) => {
        const { user, menuPermissions } = get()
        if (user?.role === 'superadmin') return 'edit'
        return menuPermissions?.[menuKey] || 'none'
      },

      canDo: (menuKey, action) => {
        const { user, menuPermissions } = get()
        if (user?.role === 'superadmin') return true
        const level = menuPermissions?.[menuKey] || 'none'
        return MENU_LEVEL_ORDER[level] >= MENU_LEVEL_ORDER[action]
      },

      isSuperAdmin: () => get().user?.role === 'superadmin',

      isAuthenticated: () => !!get().token,

      // Module-level gate (e.g. "factory.view", "settings.manage") — derived from the
      // same DB-backed menuPermissions used by canDo(), not a hardcoded role map.
      // A role "has" module.view/manage if ANY of that module's menu_keys meets the
      // required tier (view, or edit for "manage").
      hasPermission: (perm) => {
        const { user, menuPermissions } = get()
        if (!user) return false
        if (user.role === 'superadmin') return true
        const [module, tier] = perm.split('.')
        const levels = Object.entries(menuPermissions || {})
          .filter(([key]) => key.startsWith(`${module}.`))
          .map(([, level]) => MENU_LEVEL_ORDER[level] ?? 0)
        const best = levels.length ? Math.max(...levels) : 0
        const required = tier === 'manage' ? MENU_LEVEL_ORDER.edit : MENU_LEVEL_ORDER.view
        return best >= required
      },

      hasRole: (...roles) => roles.includes(get().user?.role),
    }),
    {
      name: 'sep-auth',
      partialize: (state) => ({ user: state.user, token: state.token, company: state.company, companyFilter: state.companyFilter }),
    }
  )
)
