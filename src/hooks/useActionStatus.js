import { useState, useEffect, useCallback } from 'react'

const DB     = 'https://lgm-dashboard-f3e78-default-rtdb.firebaseio.com/checkboxes'
const KEY    = 'action_state'
const LS_KEY = 'lgm-action-items'
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

export function useActionStatus() {
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
      fbWrite(next).catch(() => {})
      return next
    })
  }, [])

  const isDone = useCallback((id) => Boolean(statuses[String(id)]?.done), [statuses])

  return { statuses, toggleAction, isDone }
}
