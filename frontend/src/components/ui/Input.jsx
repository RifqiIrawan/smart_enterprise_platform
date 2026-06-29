import { cn } from '@/utils/cn'
import { forwardRef } from 'react'

const Input = forwardRef(({ className, label, error, prefix, suffix, hint, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-slate-400 text-sm pointer-events-none">{prefix}</span>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-xl border px-3.5 py-2.5 text-sm placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-rose-400 focus:ring-rose-400/40 focus:border-rose-400',
            prefix && 'pl-9',
            suffix && 'pr-9',
            className
          )}
          style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-slate-400 text-sm pointer-events-none">{suffix}</span>
        )}
      </div>
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-rose-500 font-medium">{error}</p>}
    </div>
  )
})

Input.displayName = 'Input'
export default Input
