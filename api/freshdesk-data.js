// Per-location Freshdesk support ticket summary.
// Company names in Freshdesk are GHL location IDs — direct match, no fuzzy logic needed.

const FD_BASE = `https://${process.env.FRESHDESK_DOMAIN}.freshdesk.com/api/v2`

function fdAuth() {
  return 'Basic ' + Buffer.from(`${process.env.FRESHDESK_API_KEY}:X`).toString('base64')
}

async function fdFetch(path) {
  const res = await fetch(`${FD_BASE}${path}`, {
    headers: { Authorization: fdAuth(), 'Content-Type': 'application/json' },
  })
  if (!res.ok) return []
  return res.json()
}

// Fetch all ~106 companies in 2 pages, build locationId → freshdeskId map
async function buildCompanyMap() {
  const [p1, p2] = await Promise.all([
    fdFetch('/companies?per_page=100&page=1'),
    fdFetch('/companies?per_page=100&page=2'),
  ])
  const map = {}
  for (const c of [...(Array.isArray(p1) ? p1 : []), ...(Array.isArray(p2) ? p2 : [])]) {
    if (c.name) map[c.name] = c.id
  }
  return map
}

export default async function handler(req, res) {
  const { locationId } = req.query
  if (!locationId) return res.status(400).json({ error: 'Missing locationId' })

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')

  const companyMap = await buildCompanyMap()
  const freshdeskId = companyMap[locationId]

  if (!freshdeskId) {
    return res.json({ locationId, found: false, openCount: 0, pendingCount: 0, totalCount: 0, urgentCount: 0, avgSentiment: null, lastTicketAt: null })
  }

  const tickets = await fdFetch(`/tickets?company_id=${freshdeskId}&per_page=100&order_by=created_at&order_type=desc`)
  if (!Array.isArray(tickets)) {
    return res.json({ locationId, found: true, freshdeskId, openCount: 0, pendingCount: 0, totalCount: 0, urgentCount: 0, avgSentiment: null, lastTicketAt: null })
  }

  const openCount    = tickets.filter(t => t.status === 2).length
  const pendingCount = tickets.filter(t => t.status === 3).length
  const urgentCount  = tickets.filter(t => t.priority >= 3 && (t.status === 2 || t.status === 3)).length
  const sentiments   = tickets.map(t => t.sentiment_score).filter(s => s !== null && s !== undefined)
  const avgSentiment = sentiments.length
    ? Math.round(sentiments.reduce((a, b) => a + b, 0) / sentiments.length)
    : null
  const lastTicketAt = tickets.length ? tickets[0].created_at : null

  // Most recent open/pending tickets with subjects — shown in AccountModal detail view
  const recentOpen = tickets
    .filter(t => t.status === 2 || t.status === 3)
    .slice(0, 5)
    .map(t => ({
      id:         t.id,
      subject:    t.subject || '(no subject)',
      status:     t.status,     // 2=open, 3=pending
      priority:   t.priority,   // 1=low, 2=medium, 3=high, 4=urgent
      created_at: t.created_at,
    }))

  res.json({
    locationId,
    found: true,
    freshdeskId,
    openCount,
    pendingCount,
    totalCount: tickets.length,
    urgentCount,
    avgSentiment,
    lastTicketAt,
    recentOpen,
  })
}
