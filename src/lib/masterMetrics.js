// Pure computation functions for the Master Dashboard.
// All formulas match the QS Calculated Fields spec shared by Steve (2026-08-25).
// Commission is a static 10.5% of Written Premium — confirmed by Steve.

const COMMISSION_RATE = 0.105

function isWon(o) {
  return o.status === 'won' || o.pipelineStageName === 'Policy Sold'
}

function hasValue(v) {
  return v !== null && v !== undefined && v !== ''
}

export function computeOverview(leads) {
  const leadCount = leads.length
  const allOpps   = leads.flatMap(l => l.opportunities || [])
  const wonOpps   = allOpps.filter(isWon)

  // ── BASE CALCULATIONS ──────────────────────────────────────────────────────
  // 1. Leads
  // (leadCount above)

  // 2. Written Premium — sumIf(monetaryValue, stage = 'Policy Sold')
  const wonPremium = wonOpps.reduce((s, o) => s + (Number(o.monetaryValue) || 0), 0)

  // 6. New Customers — count({Opp Sold Date}) ≈ won opportunities
  const saleCount = wonOpps.length

  // 12. Premium average per customer
  const premiumAvgPerCustomer = saleCount > 0 ? wonPremium / saleCount : null

  // Leads with ≥1 opportunity (proxy for engagement)
  const withOpportunity = leads.filter(l => (l.opportunities || []).length > 0).length

  // Custom-field availability — only compute if at least one lead has the field
  const hasLeadCost   = leads.some(l => hasValue(l.leadPrice))
  const hasCallCount  = leads.some(l => hasValue(l.callCount))
  const hasDispoDate  = leads.some(l => hasValue(l.dispositionDate))
  const hasBadLead    = leads.some(l => hasValue(l.badLeadDate))
  const hasSmsReply   = leads.some(l => hasValue(l.smsReplyDate))
  const hasQuoted     = leads.some(l => hasValue(l.quotedTimestamp))
  const hasXdated     = leads.some(l => hasValue(l.xdatedReason))

  // 7. Lead Cost — sum({Lead Price})
  const totalLeadCost = hasLeadCost
    ? leads.reduce((s, l) => s + (Number(l.leadPrice) || 0), 0)
    : null

  // 8. Calls — sum({Call Count})
  const totalCalls = hasCallCount
    ? leads.reduce((s, l) => s + (Number(l.callCount) || 0), 0)
    : null

  // 9. Calls for Customers — sumIf({Call Count}, stage = 'Policy Sold')
  const callsForCustomers = hasCallCount
    ? leads
        .filter(l => (l.opportunities || []).some(isWon))
        .reduce((s, l) => s + (Number(l.callCount) || 0), 0)
    : null

  // 3. Bad Leads — count({Bad Lead Date})
  const badLeads = hasBadLead
    ? leads.filter(l => hasValue(l.badLeadDate)).length
    : null

  // 4. Dispositions — count({Disposition Date and Time})
  const dispositionCount = hasDispoDate
    ? leads.filter(l => hasValue(l.dispositionDate)).length
    : null

  // 5. SMS Replies — countIf({SMS reply date}, stage <> 'Bad Lead / DNC')
  const smsReplies = hasSmsReply
    ? leads.filter(l => hasValue(l.smsReplyDate) && l.salesStage !== 'Bad Lead / DNC').length
    : null

  // 10. Quotes — count({Quoted Timestamp})
  const quotes = hasQuoted
    ? leads.filter(l => hasValue(l.quotedTimestamp)).length
    : null

  // 11. Rate too high — countIf(Id, {X-dated Reason} = 'Rate is too high')
  const rateTooHigh = hasXdated
    ? leads.filter(l => (l.xdatedReason || '').toLowerCase().includes('rate is too high')).length
    : null

  // ── SPECIAL PARAMETERS ────────────────────────────────────────────────────
  // Commission rate = 0.105 (static, confirmed by Steve)

  // ── COMPOUND CALCULATIONS ─────────────────────────────────────────────────
  // 0. Commission — {Written Premium} * 0.105
  const commission = wonPremium * COMMISSION_RATE

  // 1. Profit — Commission - {Lead Cost}
  const profit = totalLeadCost !== null ? commission - totalLeadCost : null

  // 2. PPL — Profit / Leads
  const ppl = (profit !== null && leadCount > 0) ? profit / leadCount : null

  // 3. Disposition rate — Dispositions / Leads
  const dispoRate = (dispositionCount !== null && leadCount > 0)
    ? (dispositionCount / leadCount) * 100 : null

  // 4. SMS reply rate — {SMS Replies} / Leads
  const smsReplyRate = (smsReplies !== null && leadCount > 0)
    ? (smsReplies / leadCount) * 100 : null

  // 5. Close rate — {New Customers} / Leads
  const conversionRate = leadCount > 0 ? (saleCount / leadCount) * 100 : null

  // 6. CPP — {Lead Cost} / {New Customers}
  const cpp = (totalLeadCost !== null && saleCount > 0) ? totalLeadCost / saleCount : null

  // 7. Calls per lead — sum({Call Count}) / Leads
  const callsPerLead = (totalCalls !== null && leadCount > 0) ? totalCalls / leadCount : null

  // 8. Calls to Close — {Calls for Customers} / {New Customers}
  const callsToClose = (callsForCustomers !== null && saleCount > 0)
    ? callsForCustomers / saleCount : null

  // 9. Quote Rate — Quotes / Leads
  const quoteRate = (quotes !== null && leadCount > 0) ? (quotes / leadCount) * 100 : null

  // 10. Bad Lead rate — {Bad Leads} / Leads
  const badLeadRate = (badLeads !== null && leadCount > 0)
    ? (badLeads / leadCount) * 100 : null

  // 11. Rate too high rate — {Rate too high} / Leads
  const rateTooHighRate = (rateTooHigh !== null && leadCount > 0)
    ? (rateTooHigh / leadCount) * 100 : null

  // 12. Quotes to close rate — {New Customers} / Quotes
  const quotesToCloseRate = (quotes !== null && quotes > 0)
    ? (saleCount / quotes) * 100 : null

  return {
    // Base
    leadCount, saleCount, wonPremium, premiumAvgPerCustomer, withOpportunity,
    leadCost: totalLeadCost,
    totalCalls, callsForCustomers,
    dispositionCount, badLeads, smsReplies, quotes, rateTooHigh,
    // Compound
    commission, profit, ppl,
    conversionRate, cpp,
    callsPerLead, callsToClose,
    dispoRate, smsReplyRate, quoteRate,
    badLeadRate, rateTooHighRate, quotesToCloseRate,
  }
}

export function salesStageBreakdown(leads) {
  const counts = new Map()
  for (const lead of leads) {
    const stage = lead.salesStage || '(no opportunity)'
    counts.set(stage, (counts.get(stage) || 0) + 1)
  }
  const total = leads.length
  return [...counts.entries()]
    .map(([stage, count]) => ({ stage, count, pct: total > 0 ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count)
}

function pivotBy(leads, keyFn, labelFn) {
  const groups = new Map()
  for (const lead of leads) {
    const key = keyFn(lead) ?? '(none)'
    if (!groups.has(key)) groups.set(key, { key, label: labelFn(lead), leads: [] })
    groups.get(key).leads.push(lead)
  }
  return [...groups.values()]
    .map(g => ({ label: g.label, ...computeOverview(g.leads) }))
    .sort((a, b) => b.leadCount - a.leadCount)
}

export function pivotBySource(leads) {
  return pivotBy(leads, l => l.source, l => l.source || '(no source)')
}

export function pivotByOwner(leads) {
  return pivotBy(leads, l => l.assignedTo, l => l.assignedToName || l.assignedTo || '(unassigned)')
}
