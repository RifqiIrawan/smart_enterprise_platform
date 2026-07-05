import { cn } from '@/utils/cn'

const variants = {
  default:  { pill: 'bg-slate-100 text-slate-600 border-slate-200',      dot: 'bg-slate-400' },
  primary:  { pill: 'bg-indigo-50 text-indigo-600 border-indigo-200',    dot: 'bg-indigo-500' },
  success:  { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  warning:  { pill: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500' },
  danger:   { pill: 'bg-rose-50 text-rose-700 border-rose-200',          dot: 'bg-rose-500' },
  info:     { pill: 'bg-cyan-50 text-cyan-700 border-cyan-200',          dot: 'bg-cyan-500' },
  purple:   { pill: 'bg-violet-50 text-violet-700 border-violet-200',    dot: 'bg-violet-500' },
  dark:     { pill: 'bg-slate-800 text-slate-100 border-slate-700',      dot: 'bg-slate-300' },
}

export default function Badge({ children, variant = 'default', className, dot, pulse }) {
  const v = variants[variant] || variants.default

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        v.pill,
        className
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', v.dot, pulse && 'animate-pulse')} />
      )}
      {children}
    </span>
  )
}
