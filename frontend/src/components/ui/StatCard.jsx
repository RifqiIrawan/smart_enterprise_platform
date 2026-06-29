import { cn } from '@/utils/cn'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const colorMap = {
  blue:    { gradient: 'from-blue-500 to-indigo-600',    glow: 'shadow-blue-500/25',   bg: 'bg-blue-50',    text: 'text-blue-600',    bar: 'bg-blue-500' },
  indigo:  { gradient: 'from-indigo-500 to-violet-600',  glow: 'shadow-indigo-500/25', bg: 'bg-indigo-50',  text: 'text-indigo-600',  bar: 'bg-indigo-500' },
  emerald: { gradient: 'from-emerald-500 to-teal-600',   glow: 'shadow-emerald-500/25',bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-500' },
  amber:   { gradient: 'from-amber-500 to-orange-500',   glow: 'shadow-amber-500/25',  bg: 'bg-amber-50',   text: 'text-amber-600',   bar: 'bg-amber-500' },
  red:     { gradient: 'from-rose-500 to-red-600',       glow: 'shadow-rose-500/25',   bg: 'bg-rose-50',    text: 'text-rose-600',    bar: 'bg-rose-500' },
  purple:  { gradient: 'from-purple-500 to-violet-600',  glow: 'shadow-purple-500/25', bg: 'bg-purple-50',  text: 'text-purple-600',  bar: 'bg-purple-500' },
  cyan:    { gradient: 'from-cyan-500 to-blue-500',      glow: 'shadow-cyan-500/25',   bg: 'bg-cyan-50',    text: 'text-cyan-600',    bar: 'bg-cyan-500' },
  rose:    { gradient: 'from-rose-500 to-pink-600',      glow: 'shadow-rose-500/25',   bg: 'bg-rose-50',    text: 'text-rose-600',    bar: 'bg-rose-500' },
}

export default function StatCard({ title, label, value, subtitle, trend, icon: Icon, color = 'blue', className }) {
  const c = colorMap[color] || colorMap.blue
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus
  const trendColor = trend > 0 ? 'text-emerald-600 bg-emerald-50' : trend < 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-400 bg-slate-100'
  const displayTitle = title ?? label

  return (
    <div className={cn(
      'relative bg-white rounded-2xl p-5 overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
      'border border-slate-200/80 shadow-sm',
      className
    )}>
      {/* Subtle top accent */}
      <div className={cn('absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r', c.gradient)} />

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">{displayTitle}</p>
          <p className="mt-2.5 text-2xl font-bold text-slate-900 leading-none">{value}</p>
          {subtitle && <p className="mt-1.5 text-xs text-slate-400">{subtitle}</p>}
          {trend !== undefined && (
            <div className={cn('mt-2.5 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full', trendColor)}>
              <TrendIcon className="w-3 h-3" />
              <span>{Math.abs(trend)}% vs lalu</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
            'bg-gradient-to-br shadow-lg',
            c.gradient, c.glow
          )}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
    </div>
  )
}
