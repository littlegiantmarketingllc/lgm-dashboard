// Agency-wide Freshdesk ticket totals — one paginated pull across ALL tickets,
// not per-account like freshdesk-data.js. Powers the two dashboard-wide KPI cards
// and their click-through ticket list.

const FD_BASE = `https://${process.env.FRESHDESK_DOMAIN}.freshdesk.com/api/v2`

function fdAuth() {
  return 'Basic ' + Buffer.from(`${process.env.FRESHDESK_API_KEY}:X`).toString('base64')
}

async function fdFetch(path) {
  const res = await fetch(`${FD_BASE}${path}`, {
    headers: { Authorization: fdAuth(), 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Freshdesk ${path} → HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

// company_id → company name, so tickets can show which account they belong to
async function buildCompanyNameMap() {
  const [p1, p2] = await Promise.all([
    fdFetch('/companies?per_page=100&page=1'),
    fdFetch('/companies?per_page=100&page=2'),
  ])
  const map = {}
  for (const c of [...(Array.isArray(p1) ? p1 : []), ...(Array.isArray(p2) ? p2 : [])]) {
    if (c.id) map[c.id] = c.name || 'Unknown account'
  }
  return map
}

export default async function handler(req, res) {
  if (!process.env.FRESHDESK_DOMAIN || !process.env.FRESHDESK_API_KEY) {
    return res.status(500).json({ error: 'FRESHDESK_DOMAIN / FRESHDESK_API_KEY env var not configured in Vercel' })
  }

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')

  try {
    const companyNames = await buildCompanyNameMap()

    let openCount = 0, pendingCount = 0, urgentCount = 0, totalCount = 0
    const tickets = []
    let page = 1
    while (page <= 20) { // hard cap — Freshdesk API stops paginating past 300 pages anyway
      const batch = await fdFetch(`/tickets?per_page=100&page=${page}&order_by=created_at&order_type=desc`)
      if (!Array.isArray(batch) || batch.length === 0) break

      totalCount += batch.length
      for (const t of batch) {
        const isOpen    = t.status === 2
        const isPending = t.status === 3
        if (isOpen) openCount++
        else if (isPending) pendingCount++
        if (t.priority >= 3 && (isOpen || isPending)) urgentCount++

        if (isOpen || isPending) {
          tickets.push({
            id:          t.id,
            subject:     t.subject || '(no subject)',
            status:      t.status,                // 2 = open, 3 = pending
            priority:    t.priority,               // 1 low, 2 medium, 3 high, 4 urgent
            accountName: companyNames[t.company_id] || 'Unmatched account',
            created_at:  t.created_at,
          })
        }
      }

      if (batch.length < 100) break
      page++
    }

    // Most urgent / newest first
    tickets.sort((a, b) => (b.priority - a.priority) || (new Date(b.created_at) - new Date(a.created_at)))

    res.json({ openCount, pendingCount, urgentCount, totalCount, tickets, syncedAt: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
