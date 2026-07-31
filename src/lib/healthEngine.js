import { differenceInDays, parseISO, isValid } from 'date-fns'
import { CHURN_TXN_THRESHOLD, UPSELL_MIN_USERS, HEALTH_BANDS, WEIGHTS } from './healthConfig.js'

// ── Component scorers ─────────────────────────────────────────────────────────

function txnScore(txns) {
  if (txns <= 0) return 0
  if (txns <= CHURN_TXN_THRESHOLD) return (txns / CHURN_TXN_THRESHOLD) * 60
  if (txns >= 12000) return 100
  return 60 + ((txns - CHURN_TXN_THRESHOLD) / (12000 - CHURN_TXN_THRESHOLD)) * 40
}

function userScore(users) {
  if (users <= 0) return 0
  if (users <= 1) return 30
  if (users <= 3) return 30 + ((users - 1) / 2) * 40
  if (users < 6)  return 70 + ((users - 3) / 3) * 30
  return 100
}

function revScore(rev, maxRev) {
  if (!maxRev || maxRev === 0) return 50
  return Math.min(100, (rev / maxRev) * 100)
}

function tenureScore(stripeStartDate) {
  if (!stripeStartDate) return 40
  try {
    const d = parseISO(stripeStartDate)
    if (!isValid(d)) return 40
    const days = differenceInDays(new Date(), d)
    if (days < 0)   return 40
    if (days < 60)  return 40
    if (days < 180) return 40 + ((days - 60) / 120) * 30
    return Math.min(100, 70 + ((days - 180) / 180) * 30)
  } catch {
    return 40
  }
}

function activityScore(lastActivity) {
  if (lastActivity === null || lastActivity === undefined || lastActivity === '') return null
  const days = Number(lastActivity)
  if (isNaN(days)) return null
  if (days < 7)  return 100
  if (days <= 30) return 60
  return 20
}

// ── Public API ────────────────────────────────────────────────────────────────

export function scoreAccount(account, { maxRev = 1 } = {}) {
  const txn      = txnScore(account.transactions)
  const users    = userScore(account.users)
  const rev      = revScore(account.totalRev, maxRev)
  const tenure   = tenureScore(account.stripeStartDate)
  const activity = activityScore(account.lastActivity)

  const hasActivity = activity !== null
  const base = 1 - WEIGHTS.activity
  const w = hasActivity ? WEIGHTS : {
    transactions: WEIGHTS.transactions / base,
    users:        WEIGHTS.users        / base,
    revenue:      WEIGHTS.revenue      / base,
    tenure:       WEIGHTS.tenure       / base,
    activity:     0,
  }

  const score = Math.round(
    txn    * w.transactions +
    users  * w.users +
    rev    * w.revenue +
    tenure * w.tenure +
    (hasActivity ? activity * w.activity : 0)
  )

  return {
    score: Math.min(100, Math.max(0, score)),
    parts: { txn, users, rev, tenure, activity: activity ?? null },
  }
}

export function classify(score) {
  if (score >= HEALTH_BANDS.healthy) return 'healthy'
  if (score >= HEALTH_BANDS.watch)   return 'watch'
  return 'at_risk'
}

export function isAtRisk(account) {
  return account.transactions < CHURN_TXN_THRESHOLD ||
    (account._health?.score ?? 0) < HEALTH_BANDS.watch
}

export function isUpsellReady(account) {
  // Per John's exact rule: >3,500 transactions AND >3 users AND no add-ons yet
  return account.transactions > CHURN_TXN_THRESHOLD &&
    account.users > UPSELL_MIN_USERS &&
    !account.addOns
}

export function suggestAddon(account) {
  if (account.users >= 6 && !account.addOns)
    return { label: 'Team / multi-seat add-on', estExtra: 128 }
  if (account.transactions >= 12000)
    return { label: 'Volume / power-user plan', estExtra: 99 }
  if (!account.multiLocation && account.users >= 4)
    return { label: 'Multi-location upgrade', estExtra: 149 }
  if (!account.annualSubs)
    return { label: 'Annual plan switch (+2 months)', estExtra: 49 }
  return { label: 'Premium support add-on', estExtra: 49 }
}

export function recommendAction(account) {
  const txns = account.transactions
  let tenure = 999
  if (account.stripeStartDate) {
    try {
      const d = parseISO(account.stripeStartDate)
      if (isValid(d)) tenure = differenceInDays(new Date(), d)
    } catch {}
  }
  if (txns === 0)                                            return 'Urgent: zero activity — personal outreach today'
  if (txns < 1000)                                           return 'High risk: schedule a check-in call'
  if (txns < CHURN_TXN_THRESHOLD && account.users <= 1)     return 'Low adoption — offer onboarding / training'
  if (txns < CHURN_TXN_THRESHOLD && tenure < 60)            return 'New account — ensure onboarding completed'
  return 'Monitor — review next week'
}

export function revenueAtRisk(atRiskAccounts) {
  return atRiskAccounts.reduce((s, a) => s + (a.totalRev || 0), 0)
}

export function potentialUpsellMRR(upsellAccounts) {
  return upsellAccounts.reduce((s, a) => s + suggestAddon(a).estExtra, 0)
}

export function dmVsAgent(accounts) {
  const total = accounts.reduce((s, a) => s + (a.totalRev || 0), 0)
  const dm    = accounts.filter(a => (a.accountType || '').toLowerCase() === 'dm')
  const agent = accounts.filter(a => (a.accountType || '').toLowerCase() !== 'dm')
  const dmRev = dm.reduce((s, a)    => s + (a.totalRev || 0), 0)
  const agRev = agent.reduce((s, a) => s + (a.totalRev || 0), 0)
  return {
    dm:    { count: dm.length,    rev: dmRev, pct: total ? Math.round(dmRev / total * 100) : 0 },
    agent: { count: agent.length, rev: agRev, pct: total ? Math.round(agRev / total * 100) : 0 },
    total,
  }
}

export function avgSubscription(accounts) {
  if (!accounts.length) return { mean: 0, median: 0 }
  const revs   = accounts.map(a => a.totalRev || 0).sort((a, b) => a - b)
  const mean   = revs.reduce((s, v) => s + v, 0) / revs.length
  const mid    = Math.floor(revs.length / 2)
  const median = revs.length % 2 === 0 ? (revs[mid - 1] + revs[mid]) / 2 : revs[mid]
  return { mean: +mean.toFixed(2), median: +median.toFixed(2) }
}

export function concentrationRisk(accounts) {
  const total = accounts.reduce((s, a) => s + (a.totalRev || 0), 0)
  if (!total) return 0
  const top10Rev = [...accounts]
    .sort((a, b) => (b.totalRev || 0) - (a.totalRev || 0))
    .slice(0, 10)
    .reduce((s, a) => s + (a.totalRev || 0), 0)
  return Math.round((top10Rev / total) * 100)
}

// Active = has any LC transaction activity at all (excludes fully dormant accounts)
export function activeAccounts(accounts) {
  return accounts.filter(a => (a.transactions || 0) > 0)
}

export function avgWalletSpend(accounts) {
  const withWallet = accounts.filter(a => (a.lcWalletCharges || 0) > 0)
  if (!withWallet.length) return { mean: 0, median: 0, count: 0 }
  const vals   = withWallet.map(a => a.lcWalletCharges).sort((a, b) => a - b)
  const mean   = vals.reduce((s, v) => s + v, 0) / vals.length
  const mid    = Math.floor(vals.length / 2)
  const median = vals.length % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid]
  return { mean: +mean.toFixed(2), median: +median.toFixed(2), count: withWallet.length }
}

// LC infrastructure cost pass-through: accounts where what we charge for LC
// doesn't cover what LC actually costs us. Separate from overall profitability.
export function isLcLeaking(account) {
  return (account.lcAgencyGrossProfit ?? 0) < 0
}

export function lcCostLeakage(accounts) {
  const leaking = accounts.filter(isLcLeaking)
  const totalLoss = leaking.reduce((s, a) => s + Math.abs(a.lcAgencyGrossProfit || 0), 0)
  return { count: leaking.length, totalLoss, accounts: leaking }
}

// Accounts with a flagged DataHealthStatus discrepancy — still counted in all
// totals, just surfaced so the team knows which numbers might need a closer look.
export function dataHealthSummary(accounts) {
  const flagged = accounts.filter(a => a.hasDataIssue)
  return { flaggedCount: flagged.length, totalCount: accounts.length, accounts: flagged }
}

// Accounts where a real plan-change scenario has been modeled with a
// meaningful $ impact (positive or negative), not just left equal to current.
export function whatIfOpportunities(accounts, minDelta = 10) {
  return accounts.filter(a => Math.abs(a.whatIfDelta || 0) >= minDelta)
}
