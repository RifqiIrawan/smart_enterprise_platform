import { isValidElement } from 'react'
import { cn } from '@/utils/cn'

function renderIcon(icon) {
  if (!icon) return null
  if (isValidElement(icon)) {
    // Already a rendered JSX element e.g. <Plus className="..." />
    return <span className="w-3.5 h-3.5 flex-shrink-0 [&>svg]:w-full [&>svg]:h-full">{icon}</span>
  }
  // Component reference (function or forwardRef object) e.g. Plus, PlayCircle
  const I = icon
  return <I className="w-3.5 h-3.5 flex-shrink-0" />
}

const variants = {
  primary:   'bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 border border-indigo-400/20',
  secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm hover:border-slate-300',
  danger:    'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white shadow-md shadow-rose-500/20',
  ghost:     'hover:bg-slate-100 text-slate-600 hover:text-slate-800',
  success:   'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20',
  warning:   'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/20',
  outline:   'border border-indigo-300 text-indigo-600 hover:bg-indigo-50',
}

const sizes = {
  xs: 'px-2.5 py-1 text-xs',
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  loading,
  disabled,
  icon,
  ...props
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-2 font-semibold rounded-xl transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
        'active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : renderIcon(icon)}
      {children}
    </button>
  )
}
