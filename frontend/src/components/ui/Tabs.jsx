import { cn } from '@/utils/cn'

export default function Tabs({ tabs, active, onChange, className }) {
  return (
    <div className={cn('flex gap-0.5 bg-slate-100 p-1 rounded-xl', className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150',
            active === t.id
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
          )}
        >
          {t.icon && <t.icon className="w-3.5 h-3.5" />}
          {t.label}
          {t.count !== undefined && (
            <span className={cn(
              'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
              active === t.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'
            )}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
