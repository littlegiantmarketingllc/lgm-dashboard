// Keeps the Master Dashboard's per-location GHL data cache warm so interactive
// requests almost never hit the slow ~150-request live pull themselves — see
// api/_masterLeadsCore.js for why the cache exists and api/master-leads.js for
// the read side. Runs on a schedule (vercel.json crons) against every location
// that has ever loaded the dashboard (registered via touchKnownLocations).

import { getLocationAccessToken } from './_ghlAuth.js'
import { kv } from './_supabase.js'
import { loadRaw, cacheKey, KNOWN_LOCATIONS_KEY } from './_masterLeadsCore.js'

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const locations = (await kv.get(KNOWN_LOCATIONS_KEY)) || []
  const results = []

  for (const locationId of locations) {
    try {
      const { token, reason } = await getLocationAccessToken(locationId)
      if (!token) {
        results.push({ locationId, ok: false, reason })
        continue
      }
      const raw = await loadRaw(token, locationId)
      await kv.set(cacheKey(locationId), raw)
      results.push({ locationId, ok: true, contacts: raw.contacts.length, opportunities: raw.opportunities.length })
    } catch (err) {
      results.push({ locationId, ok: false, error: err.message })
    }
  }

  res.json({ refreshed: results, at: new Date().toISOString() })
}
