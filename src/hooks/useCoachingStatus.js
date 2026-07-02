import { useState, useEffect, useCallback, useRef } from 'react'

const APP_ID  = 'e6f5964b-bea0-49bb-b1c8-d687f49535ab'
const API_KEY = import.meta.env.VITE_APPSHEET_API_KEY || ''
const TABLE   = 'CheckboxState'
const ROW_KEY = 'coaching_state'
const LS_KEY  = 'lgm-coaching-status'
const POLL_MS = 15_000

const ENDPOINT = `https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/${TABLE}/Action`

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}
function saveLocal(val) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(val)) } catch {}
}

function appsheetCall(action, rows) {
  return fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'ApplicationAccessKey': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ Action: action, Properties: {}, Rows: rows }),
  })
}

export function useCoachingStatus() {
  const [statuses, setStatuses] = useState(loadLocal)
  const rowExists = useRef(null) // null=unknown, true=row in sheet, false=needs Add

  const applyRemote = useCallback((data) => {
    setStatuses(data)
    saveLocal(data)
  }, [])

  // Read from AppSheet
  const fetchRemote = useCallback(async () => {
    if (!API_KEY) return
    try {
      const res = await appsheetCall('Find', [])
      if (!res.ok) return
      const rows = await res.json()
      const row = Array.isArray(rows) ? rows.find(r => r.Key === ROW_KEY) : null
      rowExists.current = !!row
      if (row) applyRemote(JSON.parse(row.StateJSON || '{}'))
    } catch {}
  }, [applyRemote])

  // Write to AppSheet (optimistic — called after local state already updated)
  const writeRemote = useCallback(async (next) => {
    if (!API_KEY) return
    const payload = { Key: ROW_KEY, StateJSON: JSON.stringify(next) }
    try {
      if (rowExists.current === false) {
        await appsheetCall('Add', [payload])
        rowExists.current = true
      } else {
        const res = await appsheetCall('Edit', [payload])
        if (res.ok) {
          rowExists.current = true
        } else if (rowExists.current === null) {
          // Row may not exist yet — try Add
          await appsheetCall('Add', [payload])
          rowExists.current = true
        }
      }
    } catch {}
  }, [])

  // Poll on mount
  useEffect(() => {
    if (!API_KEY) return
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
      writeRemote(next)
      return next
    })
  }, [writeRemote])

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
  }, [writeRemote])

  return { statuses, toggleRec, isRecDone, isCoachingComplete, resetEmployee }
}
