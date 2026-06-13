import { useState, useCallback } from 'react'

const KEY = 'lgm-action-items'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') }
  catch { return {} }
}

function save(map) {
  try { localStorage.setItem(KEY, JSON.stringify(map)) } catch {}
}

export function useActionStatus() {
  const [statuses, setStatuses] = useState(load)

  const toggleAction = useCallback((id) => {
    setStatuses(prev => {
      const key  = String(id)
      const next = { ...prev }
      if (next[key]?.done) {
        delete next[key]
      } else {
        next[key] = { done: true, doneAt: Date.now() }
      }
      save(next)
      return next
    })
  }, [])

  const isDone = useCallback((id) => Boolean(statuses[String(id)]?.done), [statuses])

  return { statuses, toggleAction, isDone }
}
