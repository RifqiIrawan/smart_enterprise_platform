import { cn } from '@/utils/cn'

export function Label({ children, className, ...props }) {
  return (
    <label className={cn('text-sm font-medium text-foreground', className)} {...props}>
      {children}
    </label>
  )
}

export default Label
