import { cn } from '@/utils/cn'

export function Card({ children, className, glass, style, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl border shadow-sm',
        glass && 'glass',
        className
      )}
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-sm)', ...style }}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }) {
  return (
    <div className={cn('px-6 py-4 border-b', className)} style={{ borderColor: 'var(--border-subtle)' }}>{children}</div>
  )
}

export function CardTitle({ children, className }) {
  return <h3 className={cn('text-sm font-semibold', className)} style={{ color: 'var(--text-primary)' }}>{children}</h3>
}

export function CardContent({ children, className }) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>
}

export function CardFooter({ children, className }) {
  return (
    <div className={cn('px-6 py-4 border-t rounded-b-2xl', className)} style={{ backgroundColor: 'var(--bg-surface-3)', borderColor: 'var(--border-subtle)' }}>
      {children}
    </div>
  )
}
