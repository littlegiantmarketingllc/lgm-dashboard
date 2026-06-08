import { useState, useCallback } from 'react'

const STORAGE_KEY = 'lgm-account-statuses'

function load() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : {} } catch { return {} }
}

function persist(map) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)) } catch {}
}

export function useAccountStatus() {
  const [statuses, setStatuses] = useState(load)

  const setStatus = useCallback((id, newStatus) => {
    setStatuses(prev => {
      const key  = String(id)
      const next = { ...prev }
      if (newStatus === null)           { delete next[key] }
      else if (newStatus === 'resolved') { next[key] = { status: 'resolved', resolvedAt: Date.now() } }
      else                               { next[key] = { status: newStatus, resolvedAt: null } }
      persist(next)
      return next
    })
  }, [])

  const getStatus     = useCallback((id) => statuses[String(id)]?.status ?? 'action_required', [statuses])
  const getResolvedAt = useCallback((id) => statuses[String(id)]?.resolvedAt ?? null, [statuses])

  // Track "contacted" for upsell accounts separately
  const UPSELL_KEY = 'lgm-upsell-contacted'
  const loadContacted = () => { try { const r = localStorage.getItem(UPSELL_KEY); return r ? JSON.parse(r) : {} } catch { return {} } }
  const [contacted, setContacted] = useState(loadContacted)

  const toggleContacted = useCallback((id) => {
    setContacted(prev => {
      const key  = String(id)
      const next = { ...prev }
      if (next[key]) delete next[key]
      else next[key] = { contactedAt: Date.now() }
      try { localStorage.setItem(UPSELL_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const isContacted   = useCallback((id) => !!contacted[String(id)], [contacted])
  const getContactedAt = useCallback((id) => contacted[String(id)]?.contactedAt ?? null, [contacted])

  return { statuses, setStatus, getStatus, getResolvedAt, isContacted, toggleContacted, getContactedAt }
}
