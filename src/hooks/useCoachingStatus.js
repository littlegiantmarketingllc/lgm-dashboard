import { useState, useCallback } from 'react'

const KEY = 'lgm-coaching-status'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}

export function useCoachingStatus() {
  const [statuses, setStatuses] = useState(load)

  const toggleRec = useCallback((employeeName, recIdx) => {
    setStatuses(prev => {
      const next = {
        ...prev,
        [employeeName]: { ...prev[employeeName], [recIdx]: !prev[employeeName]?.[recIdx] },
      }
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const isRecDone = useCallback((employeeName, recIdx) => {
    return Boolean(statuses[employeeName]?.[recIdx])
  }, [statuses])

  // true when every rec index 0..totalRecs-1 is done
  const isCoachingComplete = useCallback((employeeName, totalRecs) => {
    if (!totalRecs) return false
    const emp = statuses[employeeName] || {}
    return Array.from({ length: totalRecs }, (_, i) => i).every(i => emp[i])
  }, [statuses])

  const resetEmployee = useCallback((employeeName) => {
    setStatuses(prev => {
      const next = { ...prev }
      delete next[employeeName]
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  return { statuses, toggleRec, isRecDone, isCoachingComplete, resetEmployee }
}
