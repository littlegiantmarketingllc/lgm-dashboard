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

const MAX_PAGES = 50 // safety cap: 50 * 100 = 5,000 records per dataset

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

async function fetchAllContacts(token, locationId) {
  const all = []
  let startAfter = null
  let startAfterId = null

  for (let page = 0; page < MAX_PAGES; page++) {
    let path = `/contacts/?locationId=${locationId}&limit=100`
    if (startAfter && startAfterId) {
      path += `&startAfter=${startAfter}&startAfterId=${startAfterId}`
    }
    const { ok, json, text } = await ghlFetch(path, token)
    if (!ok) throw new Error(`Failed to fetch contacts (page ${page}): ${text}`)

    const batch = json?.contacts || []
    all.push(...batch)
    if (batch.length < 100) break

    const last = batch[batch.length - 1]
    startAfter = last?.dateAdded ? new Date(last.dateAdded).getTime() : null
    startAfterId = last?.id || null
    if (!startAfter || !startAfterId) break
  }

  return all
}

async function fetchAllOpportunities(token, locationId) {
  const all = []
  let startAfter = null
  let startAfterId = null

  for (let page = 0; page < MAX_PAGES; page++) {
    const body = { locationId, limit: 100 }
    if (startAfter && startAfterId) {
      body.startAfter = startAfter
      body.startAfterId = startAfterId
    }
    const { ok, json, text } = await ghlFetch(`/opportunities/search`, token, 'POST', body)
    if (!ok) throw new Error(`Failed to fetch opportunities (page ${page}): ${text}`)

    const batch = json?.opportunities || []
    all.push(...batch)
    if (batch.length < 100) break

    const last = batch[batch.length - 1]
    startAfter = last?.dateAdded ? new Date(last.dateAdded).getTime() : null
    startAfterId = last?.id || null
    if (!startAfter || !startAfterId) break
  }

  return all
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
    const token = await getLocationAccessToken(locationId)
    if (!token) {
      return res.status(404).json({
        error: `No OAuth token found for location "${locationId}". Ensure our GHL app is installed at that sub-account.`,
      })
    }

    const [{ map: fieldMap, allFields }, contacts, opportunities] = await Promise.all([
      getCustomFieldMap(token, locationId),
      fetchAllContacts(token, locationId),
      fetchAllOpportunities(token, locationId),
    ])

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
      leadsInRange: leads.length,
      fieldMap,
      missingFields, // non-empty means one or more target custom fields weren't found by name match — check allFields
      allFields,     // full custom-field list for this location, for manual verification against fieldMap
      leads,
      fetchedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('master-leads error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
