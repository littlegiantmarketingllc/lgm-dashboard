import { useState, useEffect, useCallback } from 'react'

// Fetches the joined contacts+opportunities dataset for one GHL location from
// /api/master-leads. Pure data-fetch hook — no metric calculations here.
//
// ?demo=1 in the URL loads a synthetic fixture (src/data/masterDashboardDemoData.json)
// instead of hitting the live API — for previewing/polishing the UI independent
// of GHL's OAuth connection status, or for showing the dashboard to someone
// without needing a real account wired up. Dynamically imported so the fixture
// never ships in the bundle for real usage.
export function useMasterLeads(locationId, { from, to } = {}) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const isDemo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1'

  const fetchData = useCallback(async () => {
    if (isDemo) {
      setLoading(true)
      setError(null)
      const mod = await import('../data/masterDashboardDemoData.json')
      setData(mod.default || mod)
      setLoading(false)
      return
    }

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
  }, [locationId, from, to, isDemo])

  useEffect(() => { fetchData() }, [fetchData])

  return { data, loading, error, refetch: fetchData, isDemo }
}
