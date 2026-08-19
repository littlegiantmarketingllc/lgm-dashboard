// Vercel serverless function — Master Dashboard data layer.
// Pulls contacts + opportunities for one GHL sub-account, joins them on contact ID,
// and resolves the custom fields the metrics depend on (lead price, call count,
// disposition date). This is the "canvas" data layer — it returns normalized,
// joined records only. No PPL/CVR/etc. calculations here; those come from
// metricsEngine.js once Steve dictates the exact formulas.
//
// Request:  GET /api/master-leads?locationId=<ghl_location_id>&from=YYYY-MM-DD&to=YYYY-MM-DD
// from/to filter on the lead's dateAdded (date-created attribution, not sale date —
// confirmed by John: a sale today from a 4-month-old lead belongs to that lead's
// original month, not today's).

import { getLocationAccessToken, ghlFetch } from './_ghlAuth.js'

const CONTACTS_MAX_PAGES = 200 // hard backstop; the date-range early-stop below is the real limiter
const OPPS_MAX_PAGES     = 200 // no early-stop available for opportunities (see fetchAllOpportunities) — real cap

// Target fields we need values for. Matched against GHL custom field names/fieldKeys
// by case-insensitive substring — GHL naming may not be an exact match per account.
const FIELD_TARGETS = {
  leadPrice:      ['lead price', 'lead cost'],
  callCount:      ['call count', 'calls count'],
  dispositionDate: ['disposition date'],
}

async function getCustomFieldMap(token, locationId) {
  const { ok, json, text } = await ghlFetch(`/locations/${locationId}/customFields`, token)
  if (!ok) throw new Error(`Failed to fetch custom fields: ${text}`)

  const fields = json?.customFields || []
  const map = {} // targetKey -> { id, name } | null

  for (const [targetKey, aliases] of Object.entries(FIELD_TARGETS)) {
    const match = fields.find(f => {
      const name = (f.name || f.fieldKey || '').toLowerCase()
      return aliases.some(alias => name.includes(alias))
    })
    map[targetKey] = match ? { id: match.id, name: match.name || match.fieldKey } : null
  }

  return { map, allFields: fields.map(f => ({ id: f.id, name: f.name || f.fieldKey })) }
}

function readCustomFieldValue(contact, fieldMatch) {
  if (!fieldMatch) return null
  const cf = (contact.customFields || []).find(f => f.id === fieldMatch.id)
  return cf?.value ?? cf?.fieldValue ?? null
}

async function fetchAllContacts(token, locationId, fromMs) {
  const all = []
  let startAfter = null
  let startAfterId = null
  let pagesFetched = 0
  let hitPageCap = false

  // GHL returns contacts newest-first by default. Once a page's oldest contact
  // is older than the requested `from` date, every later page is even older —
  // stop there instead of relying on a fixed page cap to bound the fetch.
  for (let page = 0; page < CONTACTS_MAX_PAGES; page++) {
    let path = `/contacts/?locationId=${locationId}&limit=100`
    if (startAfter && startAfterId) {
      path += `&startAfter=${startAfter}&startAfterId=${startAfterId}`
    }
    const { ok, json, text } = await ghlFetch(path, token)
    if (!ok) throw new Error(`Failed to fetch contacts (page ${page}): ${text}`)

    const batch = json?.contacts || []
    all.push(...batch)
    pagesFetched++
    if (batch.length < 100) break

    const last = batch[batch.length - 1]
    const lastDateMs = last?.dateAdded ? new Date(last.dateAdded).getTime() : null
    if (lastDateMs !== null && lastDateMs < fromMs) break

    startAfter = lastDateMs
    startAfterId = last?.id || null
    if (!startAfter || !startAfterId) break

    if (page === CONTACTS_MAX_PAGES - 1) hitPageCap = true
  }

  return { contacts: all, pagesFetched, hitPageCap }
}

async function fetchAllOpportunities(token, locationId) {
  const all = []
  let pagesFetched = 0
  let firstMeta = null

  // Per GHL's docs, page/startAfter/startAfterId are query-string params, not
  // POST body fields — passing them in the body (as this used to) meant they
  // were silently ignored and every "page" returned the same first 100 results.
  let hitPageCap = false
  for (let pageNum = 1; pageNum <= OPPS_MAX_PAGES; pageNum++) {
    const path = `/opportunities/search?location_id=${locationId}&limit=100&page=${pageNum}`
    const { ok, json, text } = await ghlFetch(path, token)
    if (!ok) throw new Error(`Failed to fetch opportunities (page ${pageNum}): ${text}`)
    if (pageNum === 1) firstMeta = json?.meta || null

    const batch = json?.opportunities || []
    all.push(...batch)
    pagesFetched++
    if (batch.length < 100) break
    if (pageNum === OPPS_MAX_PAGES) hitPageCap = true
  }

  return { opportunities: all, pagesFetched, firstMeta, hitPageCap }
}

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

  res.setHeader('Cache-Control', 'no-store')

  try {
    const { token, reason } = await getLocationAccessToken(locationId)
    if (!token) {
      return res.status(404).json({
        error: `No OAuth token available for location "${locationId}".`,
        reason,
      })
    }

    // Custom fields need a separate OAuth scope that may not be granted yet —
    // don't let that block contacts/opportunities, which use scopes that already work.
    const [fieldMapResult, contactsResult, oppsResult] = await Promise.all([
      getCustomFieldMap(token, locationId).catch(err => ({ error: err.message })),
      fetchAllContacts(token, locationId, fromMs),
      fetchAllOpportunities(token, locationId),
    ])

    const fieldMap  = fieldMapResult.map || { leadPrice: null, callCount: null, dispositionDate: null }
    const allFields = fieldMapResult.allFields || []
    const customFieldsError = fieldMapResult.error || null
    const contacts = contactsResult.contacts
    const opportunities = oppsResult.opportunities

    const missingFields = Object.entries(fieldMap)
      .filter(([, v]) => v === null)
      .map(([k]) => k)

    // Group opportunities by contactId for the join
    const oppsByContact = {}
    for (const o of opportunities) {
      const cid = o.contactId || o.contact?.id
      if (!cid) continue
      ;(oppsByContact[cid] ||= []).push({
        id:              o.id,
        name:            o.name,
        monetaryValue:   o.monetaryValue ?? null,
        pipelineId:      o.pipelineId,
        pipelineStageId: o.pipelineStageId,
        status:          o.status,
        dateAdded:       o.dateAdded,
        lastStageChangeAt: o.lastStageChangeAt,
      })
    }

    const leads = contacts
      .filter(c => {
        const t = c.dateAdded ? new Date(c.dateAdded).getTime() : null
        return t !== null && t >= fromMs && t <= toMs
      })
      .map(c => ({
        contactId:       c.id,
        name:            c.contactName || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
        dateAdded:       c.dateAdded,
        source:          c.source || null,
        assignedTo:      c.assignedTo || null,
        leadPrice:       readCustomFieldValue(c, fieldMap.leadPrice),
        callCount:       readCustomFieldValue(c, fieldMap.callCount),
        dispositionDate: readCustomFieldValue(c, fieldMap.dispositionDate),
        opportunities:   oppsByContact[c.id] || [],
      }))

    res.json({
      locationId,
      from,
      to,
      totalContactsScanned:     contacts.length,
      totalOpportunitiesScanned: opportunities.length,
      // true means the safety page cap was hit and there may be more data beyond what's shown —
      // contacts stops naturally at the `from` date boundary so this should normally be false there;
      // opportunities has no such boundary available and is more likely to hit this on large accounts
      contactsPagination:     { pagesFetched: contactsResult.pagesFetched, hitPageCap: contactsResult.hitPageCap },
      opportunitiesPagination: { pagesFetched: oppsResult.pagesFetched, hitPageCap: oppsResult.hitPageCap },
      leadsInRange: leads.length,
      fieldMap,
      missingFields, // non-empty means one or more target custom fields weren't found by name match — check allFields
      allFields,     // full custom-field list for this location, for manual verification against fieldMap
      customFieldsError, // non-null means the customFields API call itself failed (e.g. missing OAuth scope) — leadPrice/callCount/dispositionDate will all be null on every lead until this is fixed
      leads,
      fetchedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('master-leads error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
