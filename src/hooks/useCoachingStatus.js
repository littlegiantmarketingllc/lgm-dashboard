import { useState, useEffect, useCallback } from 'react'

const SYNC_URL = import.meta.env.VITE_COACHING_SYNC_URL || ''
const LS_KEY   = 'lgm-coaching-status'
const POLL_MS  = 15_000

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}

function saveLocal(val) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(val)) } catch {}
}

async function fetchRemote() {
  const res = await fetch(SYNC_URL, { cache: 'no-store' })
  if (!res.ok) throw new Error(res.status)
  const data = await res.json()
  if (typeof data !== 'object' || data === null) throw new Error('bad payload')
  return data
}

function writeRemote(next) {
  if (!SYNC_URL) return
  // mode: no-cors avoids CORS preflight; Apps Script receives body via e.postData.contents
  fetch(SYNC_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(next),
  }).catch(() => {})
}

export function useCoachingStatus() {
  const [statuses, setStatuses] = useState(loadLocal)

  // Sync from remote on mount + poll
  useEffect(() => {
    if (!SYNC_URL) return
    let cancelled = false

    async function poll() {
      try {
        const remote = await fetchRemote()
        if (!cancelled) {
          setStatuses(remote)
          saveLocal(remote)
        }
      } catch {}
    }

    poll()
    const id = setInterval(poll, POLL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const toggleRec = useCallback((employeeName, recIdx) => {
    setStatuses(prev => {
      const next = {
        ...prev,
        [employeeName]: { ...prev[employeeName], [recIdx]: !prev[employeeName]?.[recIdx] },
      }
      saveLocal(next)
      writeRemote(next)
      return next
    })
  }, [])

  const isRecDone = useCallback((employeeName, recIdx) => {
    return Boolean(statuses[employeeName]?.[recIdx])
  }, [statuses])

  const isCoachingComplete = useCallback((employeeName, totalRecs) => {
    if (!totalRecs) return false
    const emp = statuses[employeeName] || {}
    return Array.from({ length: totalRecs }, (_, i) => i).every(i => emp[i])
  }, [statuses])

  const resetEmployee = useCallback((employeeName) => {
    setStatuses(prev => {
      const next = { ...prev }
      delete next[employeeName]
      saveLocal(next)
      writeRemote(next)
      return next
    })
  }, [])

  return { statuses, toggleRec, isRecDone, isCoachingComplete, resetEmployee }
}
