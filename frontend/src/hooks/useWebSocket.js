import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'

const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1')
  .replace('http://', 'ws://')
  .replace('https://', 'wss://')
  .replace('/api/v1', '')

export function useWebSocket() {
  const [data, setData] = useState(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  const reconnectRef = useRef(null)
  const token = useAuthStore((s) => s.token)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    try {
      const ws = new WebSocket(`${WS_URL}/ws`)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        clearTimeout(reconnectRef.current)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'realtime') setData(msg)
        } catch { /* ignore malformed */ }
      }

      ws.onclose = () => {
        setConnected(false)
        // Auto-reconnect after 3s
        reconnectRef.current = setTimeout(connect, 3000)
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch { /* WebSocket not available in this env */ }
  }, [])

  useEffect(() => {
    if (!token) return
    connect()
    return () => {
      clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [token, connect])

  return { data, connected }
}
