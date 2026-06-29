import { useState, useRef, useEffect } from 'react'
import Button from '@/components/ui/Button'
import { Bot, Send, Mic, User, Sparkles, BarChart3, Factory, Users, Package, Wrench } from 'lucide-react'
import { cn } from '@/utils/cn'
import { aiApi } from '@/api'

const suggestions = [
  { icon: BarChart3, text: 'Tampilkan ringkasan KPI hari ini' },
  { icon: Factory, text: 'Analisis OEE produksi minggu ini' },
  { icon: Users, text: 'Berapa karyawan yang cuti hari ini?' },
  { icon: Package, text: 'Stok apa yang perlu segera di-reorder?' },
  { icon: Wrench, text: 'Jadwal maintenance apa yang urgent?' },
  { icon: Sparkles, text: 'Beri rekomendasi efisiensi energi' },
]

function formatContent(content) {
  return content.split('\n').map((line, i) => {
    const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    if (line.startsWith('## ')) return <p key={i} className="font-bold text-gray-900 text-base mt-3 mb-1">{line.slice(3)}</p>
    if (line.startsWith('### ')) return <p key={i} className="font-semibold text-gray-800 mt-2 mb-0.5">{line.slice(4)}</p>
    if (line.startsWith('- ') || line.startsWith('• ')) return (
      <p key={i} className="flex items-start gap-1.5 text-sm my-0.5">
        <span className="mt-1.5 w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" />
        <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
      </p>
    )
    if (line === '') return <div key={i} className="h-1.5" />
    return <p key={i} className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: bold }} />
  })
}

export default function AIAssistant() {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: 'Halo! Saya adalah **AI Assistant** untuk Smart Enterprise Platform.\n\nSaya siap membantu Anda menganalisis data produksi, warehouse, HRIS, purchasing, dan semua modul lainnya.\n\nAda yang bisa saya bantu?',
    timestamp: new Date(),
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async (text) => {
    const userMsg = (text || input).trim()
    if (!userMsg || loading) return

    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date() }])
    setInput('')
    setLoading(true)

    try {
      const res = await aiApi.chat(userMsg)
      const reply = res.reply || res.data?.reply || 'Maaf, saya tidak bisa memproses permintaan tersebut saat ini.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: new Date() }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Maaf, terjadi kesalahan koneksi. Silakan coba lagi.',
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const showSuggestions = messages.length === 1

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto">
      {/* Header info */}
      <div className="flex items-center gap-3 mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">SEP AI Assistant</p>
          <p className="text-xs text-gray-500">Powered by Gemini AI · Analisis data enterprise real-time</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs text-emerald-600 font-medium">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}>
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
              msg.role === 'assistant' ? 'bg-blue-600' : 'bg-gray-700')}>
              {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
            </div>
            <div className={cn('max-w-[82%] rounded-2xl px-4 py-3',
              msg.role === 'assistant' ? 'bg-white border border-gray-200 shadow-sm' : 'bg-blue-600 text-white')}>
              {msg.role === 'assistant'
                ? <div className="text-gray-700 space-y-0.5">{formatContent(msg.content)}</div>
                : <p className="text-sm">{msg.content}</p>
              }
              <p className={cn('text-[10px] mt-2', msg.role === 'assistant' ? 'text-gray-400' : 'text-blue-200')}>
                {msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex gap-1.5 items-center h-5">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {showSuggestions && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          {suggestions.map((s, i) => {
            const Icon = s.icon
            return (
              <button key={i} onClick={() => sendMessage(s.text)}
                className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors text-left">
                <Icon className="w-4 h-4 flex-shrink-0 text-blue-500" />
                {s.text}
              </button>
            )
          })}
        </div>
      )}

      {/* Input */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-2 flex gap-2 items-end">
        <button className="p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0">
          <Mic className="w-5 h-5" />
        </button>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          placeholder="Tanyakan sesuatu tentang operasional perusahaan... (Enter untuk kirim)"
          className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400 py-2 resize-none max-h-32"
          rows={1}
          disabled={loading}
          style={{ fieldSizing: 'content' }}
        />
        <Button onClick={() => sendMessage()} disabled={!input.trim() || loading} loading={loading}
          className="rounded-xl flex-shrink-0" size="sm" icon={!loading && <Send className="w-4 h-4" />}>
          {loading ? '' : 'Kirim'}
        </Button>
      </div>
    </div>
  )
}
