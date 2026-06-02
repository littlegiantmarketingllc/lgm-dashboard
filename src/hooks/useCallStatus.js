import { useState, useCallback } from 'react'

const STORAGE_KEY = 'lgm-call-statuses'

// Valid statuses: 'in_progress' | 'resolved'
// Absence from the map means 'action_required'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function persist(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {}
}

export function useCallStatus() {
  const [statuses, setStatuses] = useState(load)

  const setStatus = useCallback((id, newStatus) => {
    setStatuses(prev => {
      const key  = String(id)
      const next = { ...prev }

      if (newStatus === null) {
        // Reset → action_required: remove from storage
        delete next[key]
      } else if (newStatus === 'resolved') {
        // Always stamp a fresh timestamp when marking resolved
        next[key] = { status: 'resolved', resolvedAt: Date.now() }
      } else {
        next[key] = { status: newStatus, resolvedAt: null }
      }

      persist(next)
      return next
    })
  }, [])

  // Returns 'action_required' | 'in_progress' | 'resolved'
  const getStatus = useCallback((id) =>
    statuses[String(id)]?.status ?? 'action_required',
    [statuses]
  )

  // Returns epoch ms or null
  const getResolvedAt = useCallback((id) =>
    statuses[String(id)]?.resolvedAt ?? null,
    [statuses]
  )

  return { statuses, setStatus, getStatus, getResolvedAt }
}
