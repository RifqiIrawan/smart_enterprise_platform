import { Search, X } from 'lucide-react'
import { cn } from '@/utils/cn'

export default function SearchInput({ value, onChange, placeholder = 'Cari...', className }) {
  return (
    <div className={cn('relative flex items-center', className)}>
      <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-8 py-2 text-sm bg-gray-100 border-0 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-2.5 text-gray-400 hover:text-gray-600">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
