// Bulk LC wallet totals — queries pre-aggregated lc_wallet_totals materialized view
// (created from agency_lc_raw 9.8M rows; view has ~200 rows, instant query)
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')

  const { data, error } = await sb
    .from('lc_wallet_totals')
    .select('location_id, total_amount, latest_month')

  if (error) return res.status(500).json({ error: error.message, byLocationId: {}, latestMonthById: {} })

  const byLocationId    = {}
  const latestMonthById = {}
  for (const row of (data || [])) {
    if (row.location_id) {
      byLocationId[row.location_id] = Math.round(parseFloat(row.total_amount || 0) * 100) / 100
      if (row.latest_month) latestMonthById[row.location_id] = row.latest_month
    }
  }

  res.json({ byLocationId, latestMonthById, count: Object.keys(byLocationId).length, syncedAt: new Date().toISOString() })
}
