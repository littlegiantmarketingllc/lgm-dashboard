import { useState, useEffect, useCallback } from 'react'

// Fetches the joined contacts+opportunities dataset for one GHL location from
// /api/master-leads. Pure data-fetch hook — no metric calculations here.
export function useMasterLeads(locationId, { from, to } = {}) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetchData = useCallback(async () => {
    if (!locationId) {
      setLoading(false)
      setError('Missing locationId — this dashboard must be opened with ?locationId=... in the URL.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ locationId })
      if (from) params.set('from', from)
      if (to)   params.set('to', to)
      const res  = await fetch(`/api/master-leads?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      setData(json)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [locationId, from, to])

  useEffect(() => { fetchData() }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
