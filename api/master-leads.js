// Vercel serverless function — Master Dashboard data layer.
// Pulls contacts + opportunities for one GHL sub-account, joins them on contact ID,
// and resolves the custom fields the metrics depend on.
//
// Request:  GET /api/master-leads?locationId=<ghl_location_id>&from=YYYY-MM-DD&to=YYYY-MM-DD
// from/to filter on the lead's dateAdded (date-created attribution, not sale date —
// confirmed by John: a sale today from a 4-month-old lead belongs to that lead's
// original month, not today's).
//
// Performance: the actual GHL pull (loadRaw) is cached in Supabase per locationId
// for CACHE_TTL_MS and shared across every date-range request — switching between
// Today / Yesterday / 7 Days / This Month / etc. re-runs only the cheap in-memory
// join+filter (buildLeads), not a new ~150-request round trip to GHL. A background
// cron (api/cron-refresh-master-cache.js) keeps the cache warm so an interactive
// user should rarely be the one who pays for a cold-cache pull. Pass &refresh=1 to
// force a live re-pull regardless of cache age (e.g. a manual "refresh" button).

import { getLocationAccessToken } from './_ghlAuth.js'
import { kv } from './_supabase.js'
import { loadRaw, buildLeads, cacheKey, touchKnownLocations, CACHE_TTL_MS } from './_masterLeadsCore.js'

function defaultDateRange() {
  const to = new Date()
  const from = new Date()
  from.setMonth(from.getMonth() - 3) // matches QuickSight's "Last 3 months" default
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

export default async function handler(req, res) {
  const { locationId } = req.query
  if (!locationId) return res.status(400).json({ error: 'locationId query param is required' })

  const defaults = defaultDateRange()
  const from = req.query.from || defaults.from
  const to   = req.query.to   || defaults.to
  const fromMs = new Date(`${from}T00:00:00Z`).getTime()
  const toMs   = new Date(`${to}T23:59:59Z`).getTime()
  const forceRefresh = req.query.refresh === '1'

  res.setHeader('Cache-Control', 'no-store')

  try {
    const { token, reason } = await getLocationAccessToken(locationId)
    if (!token) {
      return res.status(404).json({
        error: `No OAuth token available for location "${locationId}".`,
        reason,
      })
    }

    await touchKnownLocations(locationId)

    let raw = forceRefresh ? null : await kv.get(cacheKey(locationId))
    const isFresh = raw && (Date.now() - new Date(raw.fetchedAt).getTime() < CACHE_TTL_MS)

    if (!isFresh) {
      raw = await loadRaw(token, locationId)
      await kv.set(cacheKey(locationId), raw)
    }

    const { leads, missingFields } = buildLeads(raw, fromMs, toMs)

    res.json({
      locationId,
      from,
      to,
      totalContactsScanned:     raw.contacts.length,
      totalOpportunitiesScanned: raw.opportunities.length,
      contactsPagination:     raw.contactsPagination,
      opportunitiesPagination: raw.opportunitiesPagination,
      leadsInRange: leads.length,
      fieldMap: raw.fieldMap,
      missingFields,
      allFields: raw.allFields,
      customFieldsError: raw.customFieldsError,
      leads,
      fetchedAt: raw.fetchedAt,
      cacheAgeMs: Date.now() - new Date(raw.fetchedAt).getTime(),
    })
  } catch (err) {
    console.error('master-leads error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
