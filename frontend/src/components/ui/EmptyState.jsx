import { cn } from '@/utils/cn'
import { Inbox } from 'lucide-react'

export default function EmptyState({ icon: Icon = Inbox, title = 'Belum ada data', desc, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-slate-300" />
      </div>
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      {desc && <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
