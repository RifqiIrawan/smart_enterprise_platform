import { cn } from '@/utils/cn'

export function Table({ children, className }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-sm', className)}>{children}</table>
    </div>
  )
}

export function Thead({ children }) {
  return <thead className="bg-gray-50 border-b border-gray-200">{children}</thead>
}

export function Tbody({ children }) {
  return <tbody className="divide-y divide-gray-100">{children}</tbody>
}

export function Th({ children, className }) {
  return (
    <th className={cn('px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider', className)}>
      {children}
    </th>
  )
}

export function Td({ children, className }) {
  return (
    <td className={cn('px-4 py-3 text-gray-700 whitespace-nowrap', className)}>{children}</td>
  )
}

export function Tr({ children, onClick, className }) {
  return (
    <tr
      onClick={onClick}
      className={cn('hover:bg-gray-50 transition-colors', onClick && 'cursor-pointer', className)}
    >
      {children}
    </tr>
  )
}
