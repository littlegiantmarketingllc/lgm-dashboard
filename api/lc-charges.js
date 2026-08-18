// LC wallet charges per location from Cliff's migrated agency_lc_raw table.
// Calls a PostgreSQL aggregate function to avoid fetching millions of raw rows.
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
  const { locationId } = req.query
  if (!locationId) return res.status(400).json({ error: 'Missing locationId' })

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')

  const { data, error } = await sb.rpc('get_lc_charges', { p_location_id: locationId })

  if (error) return res.status(500).json({ error: error.message })

  const rows = data || []
  const totalAmount = rows.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0)
  const totalCredits = rows.reduce((sum, r) => sum + parseFloat(r.total_credits_used || 0), 0)

  // Normalise transaction type labels for the UI
  const TYPE_LABELS = {
    'SMS':              'SMS',
    'Email':            'Email',
    'Phone':            'Phone',
    'Conversation AI':  'Conversation AI',
    'Email Verification': 'Email Verification',
    'Content AI':       'Content AI',
    'Workflow AI':      'Workflow AI',
    'WhatsApp':         'WhatsApp',
  }

  const breakdown = rows.map(r => ({
    type:        TYPE_LABELS[r.transaction_type] || r.transaction_type || 'Other',
    amount:      Math.round(parseFloat(r.total_amount || 0) * 100) / 100,
    credits:     Math.round(parseFloat(r.total_credits_used || 0) * 100) / 100,
    count:       parseInt(r.transaction_count, 10),
    latestMonth: r.latest_month,
  }))

  res.json({
    locationId,
    totalAmount:  Math.round(totalAmount * 100) / 100,
    totalCredits: Math.round(totalCredits * 100) / 100,
    breakdown,
    hasData: rows.length > 0,
  })
}
