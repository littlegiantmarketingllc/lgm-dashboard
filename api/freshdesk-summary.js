// Agency-wide Freshdesk ticket totals — one paginated pull across ALL tickets,
// not per-account like freshdesk-data.js. Powers the two dashboard-wide KPI cards.

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

export default async function handler(req, res) {
  if (!process.env.FRESHDESK_DOMAIN || !process.env.FRESHDESK_API_KEY) {
    return res.status(500).json({ error: 'FRESHDESK_DOMAIN / FRESHDESK_API_KEY env var not configured in Vercel' })
  }

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')

  try {
    let openCount = 0, pendingCount = 0, urgentCount = 0, totalCount = 0
    let page = 1
    while (page <= 20) { // hard cap — Freshdesk API stops paginating past 300 pages anyway
      const batch = await fdFetch(`/tickets?per_page=100&page=${page}&order_by=created_at&order_type=desc`)
      if (!Array.isArray(batch) || batch.length === 0) break

      totalCount += batch.length
      for (const t of batch) {
        if (t.status === 2) openCount++
        else if (t.status === 3) pendingCount++
        if (t.priority >= 3 && (t.status === 2 || t.status === 3)) urgentCount++
      }

      if (batch.length < 100) break
      page++
    }

    res.json({ openCount, pendingCount, urgentCount, totalCount, syncedAt: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
