// Vercel serverless function — fetches all active Stripe subscriptions for LGM.
// Expands customer inline to avoid N+1 calls.
// Returns { byEmail, byPhone, byNormName } lookup maps for the frontend to merge with GHL data.
//
// Env var required: STRIPE_SECRET_KEY (set in Vercel project settings)

const STRIPE_BASE = 'https://api.stripe.com/v1'

// Normalize company name for fuzzy matching — must mirror useMergedHealthData.js exactly
function normalizeName(n) {
  return (n || '')
    .toLowerCase()
    .replace(/'s\b/g, '')
    .replace(/\b(llc|inc|corp|ltd|l\.l\.c\.|incorporated|limited|company|the|agency|marketing|services|group|associates|account|insurance|at)\b\.?/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Normalize phone to 10 digits (strip country code if present)
function normalizePhone(p) {
  const d = (p || '').replace(/\D/g, '')
  return d.length === 11 && d[0] === '1' ? d.slice(1) : d
}

async function stripeGet(path, key) {
  const encoded = Buffer.from(`${key}:`).toString('base64')
  const res = await fetch(`${STRIPE_BASE}${path}`, {
    headers: { Authorization: `Basic ${encoded}` },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Stripe ${path} → HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

async function fetchAllSubscriptions(key) {
  const all = []
  let startingAfter = null

  while (true) {
    const params = new URLSearchParams({ limit: '100', 'expand[]': 'data.customer' })
    if (startingAfter) params.set('starting_after', startingAfter)

    const page = await stripeGet(`/subscriptions?${params}`, key)
    const batch = page.data || []
    all.push(...batch)
    if (!page.has_more || batch.length === 0) break
    startingAfter = batch[batch.length - 1].id
  }

  return all
}

// Priority used when a customer has multiple subscriptions — prefer active over trialing
const STATUS_PRIORITY = { active: 0, trialing: 1, past_due: 2, canceled: 3 }

export default async function handler(req, res) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    return res.status(500).json({ error: 'STRIPE_SECRET_KEY env var not configured in Vercel' })
  }

  try {
    const allSubs = await fetchAllSubscriptions(key)

    // Group subscriptions by customer email
    const subsByEmail = {}
    for (const sub of allSubs) {
      const cust = sub.customer
      if (typeof cust !== 'object' || !cust?.email) continue
      const email = cust.email.toLowerCase().trim()
      if (!subsByEmail[email]) subsByEmail[email] = { customer: cust, subs: [] }
      subsByEmail[email].subs.push(sub)
    }

    // Build per-email billing summary
    const byEmail = {}

    for (const [email, { customer, subs }] of Object.entries(subsByEmail)) {
      let planPrice = 0
      let planNickname = ''
      let planInterval = 'month'
      let monthlyUserSub = 0
      let addOns = 0
      let userCount = 0
      let primaryStatus = 'canceled'
      let primarySubId = null
      let startDate = null
      let canceledAt = null

      for (const sub of subs) {
        // Track the highest-priority (best) status across all subscriptions
        if ((STATUS_PRIORITY[sub.status] ?? 9) < (STATUS_PRIORITY[primaryStatus] ?? 9)) {
          primaryStatus = sub.status
          primarySubId = sub.id
        }

        // Earliest subscription start = when this client first paid us
        const subDate = new Date(sub.created * 1000).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        if (!startDate || subDate < startDate) startDate = subDate

        for (const item of sub.items?.data || []) {
          const plan = item.plan || {}
          const amtDollars = (plan.amount || 0) / 100
          const qty = item.quantity || 0
          if (qty === 0 || amtDollars === 0) continue

          const interval = plan.interval || 'month'
          const nick = (plan.nickname || '').toLowerCase()
          // Convert to monthly equivalent for consistent math
          const monthlyEquiv = interval === 'month' ? amtDollars : amtDollars / 12

          if (nick.includes('additional user') || nick.includes('user seat') || nick.includes('@ 64')) {
            monthlyUserSub += monthlyEquiv * qty
            userCount += qty
          } else if (
            nick.includes('leadflow') ||
            nick.includes('ai assistant') ||
            nick.includes('add-on') ||
            nick.includes('addon')
          ) {
            addOns += monthlyEquiv * qty
          } else {
            // Base plan — keep the highest-value one if there are multiple
            if (monthlyEquiv > planPrice) {
              planPrice = monthlyEquiv
              planNickname = plan.nickname || ''
              planInterval = interval
            }
          }
        }
      }

      const totalRev = planPrice + monthlyUserSub + addOns

      // canceledAt — ISO date if primary subscription is cancelled, else null
      const primarySub = subs.find(s => s.id === primarySubId) ?? subs[0]
      if (primarySub?.status === 'canceled' && primarySub?.canceled_at) {
        canceledAt = new Date(primarySub.canceled_at * 1000).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      }

      // DM detection: monthly plan ≈ $250, or annual plan where monthly equiv ≈ $208 ($2500/yr)
      const monthlyBase = planInterval === 'month' ? planPrice : planPrice / 12
      const isDM =
        (monthlyBase >= 245 && monthlyBase <= 255) ||
        (planInterval === 'year' && monthlyBase >= 205 && monthlyBase <= 215)

      const stripePhone    = normalizePhone(customer.phone)
      const stripeNormName = normalizeName(customer.name)

      // Cliff's Postman script "Stripe – Enrich Active Subs with GHL Location Id"
      // stores the GHL location ID on subscription metadata (not customer metadata).
      // Check sub metadata first across all subs, then fall back to customer metadata.
      const META_KEYS = ['location_id', 'ghl_location_id', 'locationId', 'ghlLocationId', 'GHL_Location_ID']
      let metaLocId = null
      for (const sub of subs) {
        for (const k of META_KEYS) {
          if (sub.metadata?.[k]) { metaLocId = sub.metadata[k]; break }
        }
        if (metaLocId) break
      }
      if (!metaLocId) {
        for (const k of META_KEYS) {
          if (customer.metadata?.[k]) { metaLocId = customer.metadata[k]; break }
        }
      }

      const record = {
        stripeCustomerId:     customer.id,
        stripeCustomerName:   customer.name || '',
        stripePhone,
        stripeNormName,
        stripeGhlLocationId:  metaLocId,
        stripeStatus:         primaryStatus,
        stripeSubscriptionId: primarySubId,
        stripeStartDate:      startDate,
        planNickname,
        planInterval,
        planPrice:       Math.round(planPrice       * 100) / 100,
        monthlyUserSub:  Math.round(monthlyUserSub  * 100) / 100,
        addOns:          Math.round(addOns          * 100) / 100,
        totalRev:        Math.round(totalRev        * 100) / 100,
        users:           userCount,
        accountType:     isDM ? 'DM' : 'Agent',
        canceledAt,
        lcWalletCharges: 0,
        transactions:    0,
        gp:              0,
      }

      byEmail[email] = record
    }

    // Build secondary lookup maps — phone and normalized name (unique only, skip collisions)
    const byPhone    = {}
    const byNormName = {}
    const phoneDupes = new Set()
    const nameDupes  = new Set()
    const byLocId    = {}

    for (const rec of Object.values(byEmail)) {
      if (rec.stripePhone && rec.stripePhone.length >= 10) {
        if (byPhone[rec.stripePhone]) phoneDupes.add(rec.stripePhone)
        else byPhone[rec.stripePhone] = rec
      }
      if (rec.stripeNormName) {
        if (byNormName[rec.stripeNormName]) nameDupes.add(rec.stripeNormName)
        else byNormName[rec.stripeNormName] = rec
      }
      if (rec.stripeGhlLocationId) {
        byLocId[rec.stripeGhlLocationId] = rec
      }
    }
    for (const p of phoneDupes)   delete byPhone[p]
    for (const n of nameDupes)    delete byNormName[n]

    // Stripe billing data changes infrequently — cache at edge for 10 min, serve stale up to 1 hour
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600')
    return res.json({
      byEmail,
      byPhone,
      byNormName,
      byLocId,
      count:     Object.keys(byEmail).length,
      totalSubs: allSubs.length,
      syncedAt:  new Date().toISOString(),
    })
  } catch (err) {
    console.error('[stripe-billing]', err.message)
    return res.status(500).json({ error: err.message })
  }
}
