import { differenceInDays, parseISO, isValid } from 'date-fns'

// Score based purely on what the GHL Agency API gives us:
//   50% tenure (how long have they been a sub-account)
//   50% activity (how recently was their sub-account record updated)

function tenureScore(dateAdded) {
  if (!dateAdded) return 30
  try {
    const d = parseISO(dateAdded)
    if (!isValid(d)) return 30
    const days = differenceInDays(new Date(), d)
    if (days < 0)    return 30
    if (days < 30)   return 30                                      // brand new
    if (days < 90)   return 30 + ((days - 30) / 60) * 20           // 30–90d: 30–50
    if (days < 365)  return 50 + ((days - 90) / 275) * 30          // 90d–1yr: 50–80
    return Math.min(100, 80 + ((days - 365) / 365) * 20)           // 1yr+: 80–100
  } catch {
    return 30
  }
}

function activityScore(daysSinceUpdate) {
  if (daysSinceUpdate === null || daysSinceUpdate === undefined) return 50
  const d = Number(daysSinceUpdate)
  if (isNaN(d))   return 50
  if (d <= 3)     return 100
  if (d <= 7)     return 90
  if (d <= 14)    return 75
  if (d <= 30)    return 60
  if (d <= 60)    return 40
  if (d <= 90)    return 20
  return 5
}

export function scoreAccount(account) {
  const tenure   = tenureScore(account.ghlDateAdded || account.stripeStartDate)
  const activity = activityScore(account.lastActivity ?? account.ghlDaysSinceUpdate)
  const score    = Math.round(tenure * 0.5 + activity * 0.5)
  return {
    score: Math.min(100, Math.max(0, score)),
    parts: { tenure, activity },
  }
}

// Enhanced score used in AccountModal once live metrics (contacts, opps, users) are loaded.
// Weights: tenure 20% · activity 20% · users 15% · contacts 25% · opportunities 20%
function contactScore(n) {
  if (!n || n <= 0)      return 0
  if (n < 100)           return 10 + (n / 100) * 20           // 10–30
  if (n < 500)           return 30 + ((n - 100) / 400) * 20   // 30–50
  if (n < 2000)          return 50 + ((n - 500) / 1500) * 20  // 50–70
  if (n < 10000)         return 70 + ((n - 2000) / 8000) * 20 // 70–90
  return 90 + Math.min(10, ((n - 10000) / 40000) * 10)        // 90–100
}

function opportunityScore(n) {
  if (!n || n <= 0)   return 5
  if (n < 10)         return 10 + (n / 10) * 20           // 10–30
  if (n < 50)         return 30 + ((n - 10) / 40) * 25    // 30–55
  if (n < 200)        return 55 + ((n - 50) / 150) * 20   // 55–75
  if (n < 1000)       return 75 + ((n - 200) / 800) * 15  // 75–90
  return Math.min(100, 90 + ((n - 1000) / 4000) * 10)     // 90–100
}

function userScore(n) {
  if (!n || n <= 0) return 0
  if (n === 1)      return 30
  if (n === 2)      return 55
  if (n <= 4)       return 70
  if (n <= 7)       return 85
  return 100
}

export function enhancedScoreAccount(account, liveMetrics) {
  const tenure   = tenureScore(account.ghlDateAdded || account.stripeStartDate)
  const activity = activityScore(account.lastActivity ?? account.ghlDaysSinceUpdate)
  const contacts = contactScore(liveMetrics?.contacts)
  const opps     = opportunityScore(liveMetrics?.opportunities)
  const users    = userScore(liveMetrics?.users)
  const score    = Math.round(
    tenure   * 0.20 +
    activity * 0.20 +
    users    * 0.15 +
    contacts * 0.25 +
    opps     * 0.20
  )
  return {
    score: Math.min(100, Math.max(0, score)),
    parts: { tenure, activity, users, contacts, opps },
  }
}

export function classify(score) {
  if (score >= 70) return 'healthy'
  if (score >= 40) return 'watch'
  return 'at_risk'
}

// At-risk = not updated in GHL for 30+ days
export function isAtRisk(account) {
  const days = account.lastActivity ?? account.ghlDaysSinceUpdate
  if (days === null || days === undefined) return false
  return Number(days) > 30
}

// "Needs attention" — account hasn't been touched in 14+ days (watch zone)
export function isWatch(account) {
  const days = account.lastActivity ?? account.ghlDaysSinceUpdate
  if (days === null || days === undefined) return false
  const d = Number(days)
  return d > 14 && d <= 30
}

// We can't detect upsell without billing data — keep stub returning false
export function isUpsellReady() { return false }
export function suggestAddon()  { return null }

export function recommendAction(account) {
  const days = account.lastActivity ?? account.ghlDaysSinceUpdate
  if (days === null || days === undefined) return 'Check account status in GHL'
  const d = Number(days)
  if (d <= 3)   return 'Active — no action needed'
  if (d <= 14)  return 'Check in — account activity slowing'
  if (d <= 30)  return 'Reach out — 2+ weeks since last GHL activity'
  if (d <= 60)  return 'Urgent: 30+ days inactive — schedule a call'
  return 'Critical: 60+ days since any GHL activity'
}

// Summaries used by dashboard KPIs
export function activeAccounts(accounts) {
  return accounts.filter(a => {
    const d = Number(a.lastActivity ?? a.ghlDaysSinceUpdate)
    return !isNaN(d) && d <= 30
  })
}

export function staleAccounts(accounts) {
  return accounts.filter(isAtRisk)
}

// Stubs for functions HealthDashboard still imports
export function revenueAtRisk()     { return 0 }
export function potentialUpsellMRR(){ return 0 }
export function concentrationRisk() { return 0 }
export function avgSubscription()   { return { mean: 0, median: 0 } }
export function avgWalletSpend()    { return { mean: 0, median: 0, count: 0 } }
export function lcCostLeakage()     { return { count: 0, totalLoss: 0, accounts: [] } }
export function dataHealthSummary(accounts) { return { flaggedCount: 0, totalCount: accounts.length, accounts: [] } }
export function dmVsAgent(accounts) {
  return {
    dm:    { count: 0, rev: 0, pct: 0 },
    agent: { count: accounts.length, rev: 0, pct: 100 },
    total: 0,
  }
}
