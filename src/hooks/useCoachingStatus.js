import { useState, useEffect, useCallback } from 'react'

const DB     = 'https://lgm-dashboard-f3e78-default-rtdb.firebaseio.com/checkboxes'
const KEY    = 'coaching_state'
const LS_KEY = 'lgm-coaching-status'
const POLL_MS = 10_000

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}
function saveLocal(val) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(val)) } catch {}
}

async function fbRead() {
  const res = await fetch(`${DB}/${KEY}.json`)
  if (!res.ok) throw new Error('read failed')
  return (await res.json()) || {}
}

async function fbWrite(val) {
  await fetch(`${DB}/${KEY}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(val),
  })
}

export function useCoachingStatus() {
  const [statuses, setStatuses] = useState(loadLocal)

  const applyRemote = useCallback((data) => {
    setStatuses(data)
    saveLocal(data)
  }, [])

  const fetchRemote = useCallback(async () => {
    try { applyRemote(await fbRead()) } catch {}
  }, [applyRemote])

  useEffect(() => {
    fetchRemote()
    const id = setInterval(fetchRemote, POLL_MS)
    return () => clearInterval(id)
  }, [fetchRemote])

  const toggleRec = useCallback((employeeName, recIdx) => {
    setStatuses(prev => {
      const next = {
        ...prev,
        [employeeName]: { ...prev[employeeName], [recIdx]: !prev[employeeName]?.[recIdx] },
      }
      saveLocal(next)
      fbWrite(next).catch(() => {})
      return next
    })
  }, [])

  const isRecDone = useCallback((employeeName, recIdx) =>
    Boolean(statuses[employeeName]?.[recIdx]), [statuses])

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
      fbWrite(next).catch(() => {})
      return next
    })
  }, [])

  const markAllComplete = useCallback((employeesList) => {
    setStatuses(prev => {
      const next = { ...prev }
      for (const emp of employeesList) {
        const count = (emp.coachingRecs || []).length
        if (count > 0) {
          next[emp.name] = {}
          for (let i = 0; i < count; i++) next[emp.name][i] = true
        }
      }
      saveLocal(next)
      fbWrite(next).catch(() => {})
      return next
    })
  }, [])

  return { statuses, toggleRec, isRecDone, isCoachingComplete, resetEmployee, markAllComplete }
}
