import { create } from 'zustand'

export const useUIStore = create((set) => ({
  sidebarOpen: true,
  sidebarCollapsed: false,
  theme: 'light',
  notifications: [],

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  collapseSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setTheme: (theme) => set({ theme }),
  addNotification: (notif) =>
    set((s) => ({ notifications: [notif, ...s.notifications].slice(0, 50) })),
  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),
  clearNotifications: () => set({ notifications: [] }),
}))
