// Vercel serverless function — fetches all active Stripe subscriptions for LGM.
// Expands customer inline to avoid N+1 calls.
// Returns { byEmail: { [email]: billingData } } for the frontend to merge with GHL data.
//
// Env var required: STRIPE_SECRET_KEY (set in Vercel project settings)

const STRIPE_BASE = 'https://api.stripe.com/v1'

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

      for (const sub of subs) {
        // Track the highest-priority (best) status across all subscriptions
        if ((STATUS_PRIORITY[sub.status] ?? 9) < (STATUS_PRIORITY[primaryStatus] ?? 9)) {
          primaryStatus = sub.status
          primarySubId = sub.id
        }

        // Earliest subscription start = when this client first paid us
        const subDate = new Date(sub.created * 1000).toISOString().slice(0, 10)
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

      // DM detection: monthly plan ≈ $250, or annual plan where monthly equiv ≈ $208 ($2500/yr)
      const monthlyBase = planInterval === 'month' ? planPrice : planPrice / 12
      const isDM =
        (monthlyBase >= 245 && monthlyBase <= 255) ||
        (planInterval === 'year' && monthlyBase >= 205 && monthlyBase <= 215)

      byEmail[email] = {
        stripeCustomerId:     customer.id,
        stripeCustomerName:   customer.name || '',
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
        // Still pending from Cliff's LC data or GHL Payments API
        lcWalletCharges: 0,
        transactions:    0,
        gp:              0,
      }
    }

    res.setHeader('Cache-Control', 'no-store')
    return res.json({
      byEmail,
      count:     Object.keys(byEmail).length,
      totalSubs: allSubs.length,
      syncedAt:  new Date().toISOString(),
    })
  } catch (err) {
    console.error('[stripe-billing]', err.message)
    return res.status(500).json({ error: err.message })
  }
}
