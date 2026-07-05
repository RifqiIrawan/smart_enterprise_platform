import { cn } from '@/utils/cn'

export function Table({ children, className }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full', className)}>{children}</table>
    </div>
  )
}

export function Thead({ children }) {
  return <thead className="bg-slate-50/80 border-b border-slate-200">{children}</thead>
}

export function Tbody({ children }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>
}

export function Th({ children, className }) {
  return (
    <th className={cn('px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap', className)}>
      {children}
    </th>
  )
}

export function Td({ children, className }) {
  return (
    <td className={cn('px-3 py-2.5 text-xs text-slate-700', className)}>{children}</td>
  )
}

export function Tr({ children, onClick, className }) {
  return (
    <tr
      onClick={onClick}
      className={cn('hover:bg-blue-50/20 transition-colors duration-150', onClick && 'cursor-pointer', className)}
    >
      {children}
    </tr>
  )
}
