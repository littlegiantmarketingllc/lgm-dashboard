import { useState, useEffect } from 'react'

const SUPABASE_URL = 'https://apfffxrydfkiokuysivy.supabase.co'
const ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwZmZmeHJ5ZGZraW9rdXlzaXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NDkyNTAsImV4cCI6MjEwMjAyNTI1MH0.T9-hXUucxuJkEuBKzT1bLmjPInWw_SbkG7hXjjepl6Q'

// Returns a map of { ghlLocationId → { dmName, agentName } }
// refreshes every 60 minutes (matches the n8n hourly sync)
export function useDmAgentMap() {
  const [dmMap,    setDmMap]   = useState({})
  const [dmLoaded, setLoaded]  = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = () =>
      fetch(
        `${SUPABASE_URL}/rest/v1/dm_agent_map?select=agent_ghl_location_id,dm_name,agent_name&limit=2000`,
        { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
      )
        .then(r => r.json())
        .then(rows => {
          if (cancelled || !Array.isArray(rows)) return
          const map = {}
          rows.forEach(row => {
            if (row.agent_ghl_location_id) {
              map[row.agent_ghl_location_id] = {
                dmName:    row.dm_name    || null,
                agentName: row.agent_name || null,
              }
            }
          })
          setDmMap(map)
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoaded(true) })

    load()
    const id = setInterval(load, 60 * 60 * 1000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return { dmMap, dmLoaded }
}
