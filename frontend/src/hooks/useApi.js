import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

export function useApi(apiFn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFn()
      // Support both OData format and legacy format
      setData(res)
    } catch (err) {
      setError(err?.message || 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}

export function useSubmit(apiFn, { onSuccess, successMsg = 'Berhasil disimpan' } = {}) {
  const [loading, setLoading] = useState(false)

  const submit = async (dataOrFn) => {
    setLoading(true)
    try {
      // Support two patterns:
      // 1. useSubmit(apiFn) → submit(data) calls apiFn(data)
      // 2. useSubmit() → submit(() => api.method(args)) calls the passed fn directly
      const res = apiFn
        ? await apiFn(dataOrFn)
        : typeof dataOrFn === 'function'
          ? await dataOrFn()
          : undefined
      toast.success(successMsg)
      onSuccess?.(res)
      return res
    } catch (err) {
      toast.error(err?.message || 'Terjadi kesalahan')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { submit, loading }
}
