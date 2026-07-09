import { useState, useEffect, useCallback, useRef } from 'react'

const APP_ID  = 'e6f5964b-bea0-49bb-b1c8-d687f49535ab'
const API_KEY = import.meta.env.VITE_APPSHEET_API_KEY || ''
const TABLE   = 'CheckboxState'
const ROW_KEY = 'action_state'
const LS_KEY  = 'lgm-action-items'
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
    headers: { 'ApplicationAccessKey': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ Action: action, Properties: {}, Rows: rows }),
  })
}

export function useActionStatus() {
  const [statuses, setStatuses] = useState(loadLocal)
  const rowExists = useRef(null) // null=unknown, true=exists, false=needs Add

  const applyRemote = useCallback((data) => {
    setStatuses(data)
    saveLocal(data)
  }, [])

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
          await appsheetCall('Add', [payload])
          rowExists.current = true
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (!API_KEY) return
    fetchRemote()
    const id = setInterval(fetchRemote, POLL_MS)
    return () => clearInterval(id)
  }, [fetchRemote])

  const toggleAction = useCallback((id) => {
    setStatuses(prev => {
      const key  = String(id)
      const next = { ...prev }
      if (next[key]?.done) {
        delete next[key]
      } else {
        next[key] = { done: true, doneAt: Date.now() }
      }
      saveLocal(next)
      writeRemote(next)
      return next
    })
  }, [writeRemote])

  const isDone = useCallback((id) => Boolean(statuses[String(id)]?.done), [statuses])

  return { statuses, toggleAction, isDone }
}
