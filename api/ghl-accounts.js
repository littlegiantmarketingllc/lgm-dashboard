// Vercel serverless function — fetches all GHL sub-accounts for LGM agency.
// Frontend calls GET /api/ghl-accounts; this proxies to GHL so the API key
// never touches the browser.
//
// Env var required: GHL_AGENCY_API_KEY (set in Vercel project settings)

const GHL_BASE = 'https://services.leadconnectorhq.com'
const GHL_VER  = '2021-07-28'

async function ghlGet(path, key) {
  const res = await fetch(`${GHL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${key}`, Version: GHL_VER },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`GHL ${path} → HTTP ${res.status}: ${body.slice(0, 120)}`)
  }
  return res.json()
}

export default async function handler(req, res) {
  const key = process.env.GHL_AGENCY_API_KEY
  if (!key) {
    return res.status(500).json({ error: 'GHL_AGENCY_API_KEY env var not configured in Vercel' })
  }

  try {
    // Page through all locations (GHL returns max 100 per request)
    let all = [], skip = 0
    while (true) {
      const data  = await ghlGet(`/locations/search?limit=100&skip=${skip}`, key)
      const batch = data.locations || []
      all = all.concat(batch)
      if (batch.length < 100) break
      skip += 100
    }

    const now = new Date()

    const accounts = all.map(loc => {
      const updatedAt        = loc.dateUpdated ? new Date(loc.dateUpdated) : null
      const daysSinceUpdate  = updatedAt
        ? Math.floor((now - updatedAt) / 86_400_000)
        : null

      return {
        // ✅ Available now with current scopes
        ghlId:              loc.id,
        ghlName:            loc.name            || '',
        ghlEmail:           loc.email           || '',
        ghlPhone:           loc.phone           || '',
        ghlCity:            loc.city            || '',
        ghlState:           loc.state           || '',
        ghlCountry:         loc.country         || '',
        ghlWebsite:         loc.website         || '',
        ghlTimezone:        loc.timezone        || '',
        ghlDateAdded:       loc.dateAdded
          ? new Date(loc.dateAdded).toISOString().slice(0, 10) : null,
        ghlDateUpdated:     loc.dateUpdated
          ? new Date(loc.dateUpdated).toISOString().slice(0, 10) : null,
        ghlDaysSinceUpdate: daysSinceUpdate,
        ghlPermissions:     loc.permissions     || {},
        ghlSnapshotId:      loc.snapshotId      || '',

        // ⚠️ Null = needs additional GHL API scope — will show as pending in UI
        ghlUserCount:       null,  // needs users.readonly scope
        ghlContactCount:    null,  // needs contacts.readonly scope
        ghlTransactions:    null,  // needs saas/subscription scope
        ghlLcWallet:        null,  // needs payments.readonly scope
        ghlOpportunities:   null,  // needs opportunities.readonly scope
      }
    })

    // Cache at Vercel CDN edge for 15 min, serve stale for up to 30 min while revalidating
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800')
    res.json({ accounts, total: all.length, syncedAt: now.toISOString() })
  } catch (err) {
    console.error('GHL accounts fetch error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
