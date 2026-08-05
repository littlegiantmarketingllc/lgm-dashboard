// Diagnostic endpoint — returns GHL dateAdded stats to debug date filter issues
// Protected by same session cookie as the main app (SESSION_SECRET value)
const AGENCY_KEY  = process.env.GHL_AGENCY_API_KEY
const COOKIE_NAME = 'lgm-health-auth'
const SECRET      = process.env.SESSION_SECRET

function checkAuth(req) {
  if (process.env.AUTH_ENABLED !== 'true') return true
  if (!SECRET) return false
  const cookies = Object.fromEntries(
    (req.headers.cookie || '').split(';').map(c => {
      const [k, ...v] = c.trim().split('=')
      return [k, v.join('=')]
    })
  )
  return cookies[COOKIE_NAME] === SECRET
}

const SANDBOX_RE = /sandbox|test account|test 2|in progress|bilingual snapshot/i

async function fetchAllLocations(key) {
  const locations = []
  let skip = 0
  while (true) {
    const res = await fetch(
      `https://services.leadconnectorhq.com/locations/search?limit=100&skip=${skip}`,
      { headers: { Authorization: `Bearer ${key}`, Version: '2021-07-28' } }
    )
    if (!res.ok) throw new Error(`GHL ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const locs = data.locations || []
    locations.push(...locs)
    if (locs.length < 100) break
    skip += 100
  }
  return locations
}

export default async function handler(req, res) {
  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  if (!AGENCY_KEY) {
    return res.status(500).json({ error: 'GHL_AGENCY_API_KEY not set' })
  }

  try {
    const locations = await fetchAllLocations(AGENCY_KEY)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().slice(0, 10)

    // Last 7 days
    const d7 = new Date(today); d7.setDate(d7.getDate() - 7)
    const d7Str = d7.toISOString().slice(0, 10)

    // This month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthStartStr = monthStart.toISOString().slice(0, 10)

    // Last 30 days
    const d30 = new Date(today); d30.setDate(d30.getDate() - 30)
    const d30Str = d30.toISOString().slice(0, 10)

    // Last 90 days
    const d90 = new Date(today); d90.setDate(d90.getDate() - 90)
    const d90Str = d90.toISOString().slice(0, 10)

    const all = locations.filter(l => !SANDBOX_RE.test(l.name || ''))
    const sandbox = locations.filter(l => SANDBOX_RE.test(l.name || ''))

    const withDate = all.filter(l => l.dateAdded)
    const noDate   = all.filter(l => !l.dateAdded)

    // Parse dateAdded → YYYY-MM-DD
    const dated = withDate.map(l => {
      let ds = null
      try { ds = new Date(l.dateAdded).toISOString().slice(0, 10) } catch {}
      return { name: l.name, id: l.id, dateAdded: l.dateAdded, dateStr: ds }
    })

    const last7   = dated.filter(l => l.dateStr && l.dateStr >= d7Str   && l.dateStr <= todayStr)
    const thisMonth = dated.filter(l => l.dateStr && l.dateStr >= monthStartStr && l.dateStr <= todayStr)
    const last30  = dated.filter(l => l.dateStr && l.dateStr >= d30Str  && l.dateStr <= todayStr)
    const last90  = dated.filter(l => l.dateStr && l.dateStr >= d90Str  && l.dateStr <= todayStr)

    // Most recent 20 accounts
    const recent = [...dated]
      .filter(l => l.dateStr)
      .sort((a, b) => b.dateStr.localeCompare(a.dateStr))
      .slice(0, 20)
      .map(l => ({ name: l.name, id: l.id, dateStr: l.dateStr, raw: l.dateAdded }))

    return res.status(200).json({
      _info: 'GHL dateAdded diagnostic — for debugging date filter',
      today: todayStr,
      windows: { d7Str, monthStartStr, d30Str, d90Str },
      total_raw: locations.length,
      sandbox_excluded: sandbox.length,
      real_accounts: all.length,
      with_dateAdded: withDate.length,
      no_dateAdded: noDate.length,
      no_dateAdded_names: noDate.slice(0, 20).map(l => l.name),
      counts_by_window: {
        last_7:     last7.length,
        this_month: thisMonth.length,
        last_30:    last30.length,
        last_90:    last90.length,
      },
      recent_20: recent,
      last_7_accounts:     last7.map(l => ({ name: l.name, date: l.dateStr })),
      this_month_accounts: thisMonth.map(l => ({ name: l.name, date: l.dateStr })),
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
