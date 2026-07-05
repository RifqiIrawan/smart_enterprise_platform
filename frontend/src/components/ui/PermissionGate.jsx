import { useAuthStore } from '@/store/authStore'

export default function PermissionGate({ permission, fallback = null, children }) {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  if (!hasPermission(permission)) return fallback
  return children
}
