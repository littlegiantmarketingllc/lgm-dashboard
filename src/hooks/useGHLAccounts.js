import { useState, useEffect, useRef, useCallback } from 'react'

const REFRESH_MS = 300_000 // 5 min refresh — GHL data, no CDN cache

export function useGHLAccounts() {
  const [accounts, setAccounts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [syncedAt, setSyncedAt] = useState(null)
  const timerRef = useRef(null)

  const doFetch = useCallback(async () => {
    try {
      const res = await fetch('/api/ghl-accounts')
      if (!res.ok) throw new Error(`GHL API returned HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAccounts(data.accounts || [])
      setSyncedAt(data.syncedAt ? new Date(data.syncedAt) : new Date())
      setError(null)
    } catch (err) {
      setError(err.message)
      // Keep stale data if we already had some
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    doFetch()
    timerRef.current = setInterval(doFetch, REFRESH_MS)
    return () => clearInterval(timerRef.current)
  }, [doFetch])

  return { accounts, loading, error, syncedAt, refetch: doFetch }
}
