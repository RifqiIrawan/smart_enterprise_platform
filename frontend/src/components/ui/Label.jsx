import { cn } from '@/utils/cn'

export function Label({ children, className, ...props }) {
  return (
    <label className={cn('text-xs font-semibold text-slate-600 uppercase tracking-wide', className)} {...props}>
      {children}
    </label>
  )
}

export default Label
