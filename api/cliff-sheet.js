// Reads Cliff's published Google Sheet (tblSubAccountPlans) and returns a
// GHL location ID → billing record lookup map.
//
// Cliff publishes the sheet from his Excel workbook after each Postman run.
// The URL is set via CLIFF_SHEET_CSV_URL env var in Vercel.
// Expected columns (flexible — detected by header pattern):
//   location_id / locationid / ghl_location_id → GHL location ID
//   stripe_customer_id / customerid / customer_id → Stripe customer ID
//   name / account_name / location_name → account display name
//   plan / plan_name / plan_nickname → plan label
//   total_rev / mrr / monthly_rev → MRR
//   users / user_count → seat count
//   account_type / type → DM or Agent

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (!lines.length) return []
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())
  return lines.slice(1).map(line => {
    const vals = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { vals.push(cur); cur = '' }
      else cur += ch
    }
    vals.push(cur)
    const row = {}
    headers.forEach((h, i) => { row[h] = (vals[i] || '').trim() })
    return row
  })
}

// Map common header aliases to canonical field names
const FIELD_PATTERNS = {
  locationId:       /^(ghl_?location_?id|location_?id|loc_?id|locationid)$/i,
  stripeCustomerId: /^(stripe_?customer_?id|customer_?id|cus_?id|customerid)$/i,
  accountName:      /^(account_?name|location_?name|name|company)$/i,
  planNickname:     /^(plan_?name|plan_?nickname|plan|product)$/i,
  totalRev:         /^(total_?rev|mrr|monthly_?rev|revenue|arr)$/i,
  users:            /^(users|user_?count|seats|seat_?count)$/i,
  accountType:      /^(account_?type|type|client_?type)$/i,
  stripeStatus:     /^(stripe_?status|sub_?status|status)$/i,
}

function detectColumns(headers) {
  const map = {}
  for (const h of headers) {
    for (const [field, pattern] of Object.entries(FIELD_PATTERNS)) {
      if (!map[field] && pattern.test(h)) {
        map[field] = h
        break
      }
    }
  }
  return map
}

export default async function handler(req, res) {
  const csvUrl = process.env.CLIFF_SHEET_CSV_URL
  if (!csvUrl) {
    return res.status(503).json({
      error: 'CLIFF_SHEET_CSV_URL env var not set. Ask Cliff to re-publish the sheet and set the URL in Vercel.',
      byLocId: {},
    })
  }

  try {
    const csvRes = await fetch(csvUrl)
    if (!csvRes.ok) {
      throw new Error(`Google Sheet returned HTTP ${csvRes.status}. The sheet may not be published or the URL changed.`)
    }
    const text = await csvRes.text()
    if (text.trim().startsWith('<!DOCTYPE')) {
      throw new Error('Google returned an HTML error page. The sheet publish URL is broken — ask Cliff to re-publish.')
    }

    const rows = parseCSV(text)
    if (!rows.length) {
      return res.json({ byLocId: {}, count: 0, columns: [] })
    }

    const cols    = detectColumns(Object.keys(rows[0]))
    const byLocId = {}

    for (const row of rows) {
      const locId = cols.locationId ? row[cols.locationId] : null
      if (!locId || locId.length < 5) continue

      byLocId[locId] = {
        cliffLocationId:  locId,
        stripeCustomerId: cols.stripeCustomerId ? row[cols.stripeCustomerId] : null,
        accountName:      cols.accountName      ? row[cols.accountName]      : null,
        planNickname:     cols.planNickname     ? row[cols.planNickname]     : null,
        totalRev:         cols.totalRev         ? parseFloat(row[cols.totalRev]) || 0  : 0,
        users:            cols.users            ? parseInt(row[cols.users],  10) || 0  : 0,
        accountType:      cols.accountType      ? row[cols.accountType]      : null,
        stripeStatus:     cols.stripeStatus     ? row[cols.stripeStatus]     : null,
        _source: 'cliff-sheet',
      }
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.json({
      byLocId,
      count:   Object.keys(byLocId).length,
      columns: cols,
      rows:    rows.length,
      syncedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[cliff-sheet]', err.message)
    return res.status(500).json({ error: err.message, byLocId: {} })
  }
}
