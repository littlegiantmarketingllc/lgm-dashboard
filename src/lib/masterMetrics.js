// Pure computation functions for the Master Dashboard.
// All formulas match the QS Calculated Fields spec shared by Steve (2026-08-25).
// Commission is a static 10.5% of Written Premium — confirmed by Steve.

const COMMISSION_RATE = 0.105
const POLICY_SOLD_STAGE = 'Policy Sold'
const BAD_LEAD_DNC_STAGE = 'Bad Lead / DNC'

function isPolicySold(o) {
  return o.pipelineStageName === POLICY_SOLD_STAGE
}

function hasValue(v) {
  return v !== null && v !== undefined && v !== ''
}

export function computeOverview(leads) {
  const leadCount = leads.length
  const allOpps   = leads.flatMap(l => l.opportunities || [])
  const policySoldOpps = allOpps.filter(isPolicySold)

  // ── BASE CALCULATIONS ──────────────────────────────────────────────────────
  // 1. Leads — count({crm_id})
  // (leadCount above)

  // 2. Written Premium — sumIf(monetaryValue, pipelineStageId = 'Policy Sold')
  const writtenPremium = policySoldOpps.reduce((s, o) => s + (Number(o.monetaryValue) || 0), 0)

  // Custom-field availability — only compute a metric if at least one lead actually has the field,
  // so a genuinely-missing field shows as a pending "—" instead of a misleading 0.
  const hasLeadCost   = leads.some(l => hasValue(l.leadPrice))
  const hasCallCount  = leads.some(l => hasValue(l.callCount))
  const hasDispoDate  = leads.some(l => hasValue(l.dispositionDate))
  const hasBadLead    = leads.some(l => hasValue(l.badLeadDate))
  const hasSmsReply   = leads.some(l => hasValue(l.smsReplyDate))
  const hasOppSold    = leads.some(l => hasValue(l.oppSoldDate))
  const hasQuoted     = leads.some(l => hasValue(l.quotedTimestamp))
  const hasXdated     = leads.some(l => hasValue(l.xdatedReason))
  const hasOptOut     = leads.some(l => hasValue(l.optOutDate))

  // 3. Bad Leads — count({Bad Lead Date})
  const badLeads = hasBadLead
    ? leads.filter(l => hasValue(l.badLeadDate)).length
    : null

  // 4. Dispositions — count({Disposition Date and Time})
  const dispositionCount = hasDispoDate
    ? leads.filter(l => hasValue(l.dispositionDate)).length
    : null

  // 5. SMS Replies — countIf({SMS reply date}, pipelineStageId <> 'Bad Lead / DNC')
  const smsReplies = hasSmsReply
    ? leads.filter(l => hasValue(l.smsReplyDate) && l.salesStage !== BAD_LEAD_DNC_STAGE).length
    : null

  // 6. New Customers — count({Opp Sold Date}). This is the denominator for
  // CPP, Calls to Close, Close Rate, and Quotes to Close Rate below — it is a
  // dedicated field, NOT a stage or opportunity-status check. A prior version
  // of this file substituted "count of won opportunities" here because the
  // field wasn't being fetched at all; that's a different, usually larger,
  // number and made every formula depending on it wrong.
  const newCustomers = hasOppSold
    ? leads.filter(l => hasValue(l.oppSoldDate)).length
    : null

  // 7. Lead Cost — sum({Lead Price})
  const leadCost = hasLeadCost
    ? leads.reduce((s, l) => s + (Number(l.leadPrice) || 0), 0)
    : null

  // 8. Calls — sum({Call Count})
  const totalCalls = hasCallCount
    ? leads.reduce((s, l) => s + (Number(l.callCount) || 0), 0)
    : null

  // 9. Calls for Customers — sumIf({Call Count}, pipelineStageId = 'Policy Sold')
  const callsForCustomers = hasCallCount
    ? leads
        .filter(l => l.salesStage === POLICY_SOLD_STAGE)
        .reduce((s, l) => s + (Number(l.callCount) || 0), 0)
    : null

  // 10. Quotes — count({Quoted Timestamp})
  const quotes = hasQuoted
    ? leads.filter(l => hasValue(l.quotedTimestamp)).length
    : null

  // 11. Rate too high — countIf(Id, {X-dated Reason} = 'Rate is too high')
  const rateTooHigh = hasXdated
    ? leads.filter(l => (l.xdatedReason || '').toLowerCase().includes('rate is too high')).length
    : null

  // Opt Outs — count({Opt Out Date}). Not in Steve's original spec sheet, but
  // shown alongside it in QuickSight's Lead Source / Owner / Profile matrices.
  const optOuts = hasOptOut
    ? leads.filter(l => hasValue(l.optOutDate)).length
    : null

  // 12. Premium average per customer — avgIf(monetaryValue, pipelineStageId = 'Policy Sold')
  // Averaged over Policy-Sold opportunities themselves, same population as
  // Written Premium above (a lead can have more than one such opportunity,
  // so this is not simply writtenPremium / newCustomers).
  const premiumAvgPerCustomer = policySoldOpps.length > 0
    ? writtenPremium / policySoldOpps.length
    : null

  // Leads with ≥1 opportunity of any kind — a rough engagement proxy, not part of Steve's spec.
  const withOpportunity = leads.filter(l => (l.opportunities || []).length > 0).length

  // ── SPECIAL PARAMETERS ────────────────────────────────────────────────────
  // Commission rate = 0.105, static, confirmed by Steve — see COMMISSION_RATE above.

  // ── COMPOUND CALCULATIONS ─────────────────────────────────────────────────
  // 0. Commission — {Written Premium} * 0.105
  const commission = writtenPremium * COMMISSION_RATE

  // 1. Profit — Commission - {Lead Cost}
  const profit = leadCost !== null ? commission - leadCost : null

  // 2. PPL — Profit / Leads
  const ppl = (profit !== null && leadCount > 0) ? profit / leadCount : null

  // 3. Disposition rate — Dispositions / Leads
  const dispoRate = (dispositionCount !== null && leadCount > 0)
    ? (dispositionCount / leadCount) * 100 : null

  // 4. SMS reply rate — {SMS Replies} / Leads
  const smsReplyRate = (smsReplies !== null && leadCount > 0)
    ? (smsReplies / leadCount) * 100 : null

  // 5. Close rate — {New Customers} / Leads
  const closeRate = (newCustomers !== null && leadCount > 0)
    ? (newCustomers / leadCount) * 100 : null

  // 6. CPP — {Lead Cost} / {New Customers}
  const cpp = (leadCost !== null && newCustomers !== null && newCustomers > 0)
    ? leadCost / newCustomers : null

  // 7. Calls per lead — sum({Call Count}) / Leads
  const callsPerLead = (totalCalls !== null && leadCount > 0) ? totalCalls / leadCount : null

  // 8. Calls to Close — {Calls for Customers} / {New Customers}
  const callsToClose = (callsForCustomers !== null && newCustomers !== null && newCustomers > 0)
    ? callsForCustomers / newCustomers : null

  // 9. Quote Rate — Quotes / Leads
  const quoteRate = (quotes !== null && leadCount > 0) ? (quotes / leadCount) * 100 : null

  // 10. Bad Lead rate — {Bad Leads} / Leads
  const badLeadRate = (badLeads !== null && leadCount > 0)
    ? (badLeads / leadCount) * 100 : null

  // 11. Rate too high rate — {Rate too high} / Leads
  const rateTooHighRate = (rateTooHigh !== null && leadCount > 0)
    ? (rateTooHigh / leadCount) * 100 : null

  // 12. Quotes to close rate — {New Customers} / Quotes
  const quotesToCloseRate = (newCustomers !== null && quotes !== null && quotes > 0)
    ? (newCustomers / quotes) * 100 : null

  // 13. Opt out rate — {Opt Outs} / Leads
  const optOutRate = (optOuts !== null && leadCount > 0)
    ? (optOuts / leadCount) * 100 : null

  return {
    // Base
    leadCount, writtenPremium, newCustomers, premiumAvgPerCustomer, withOpportunity,
    leadCost, totalCalls, callsForCustomers,
    dispositionCount, badLeads, smsReplies, quotes, rateTooHigh, optOuts,
    // Compound
    commission, profit, ppl,
    closeRate, cpp,
    callsPerLead, callsToClose,
    dispoRate, smsReplyRate, quoteRate,
    badLeadRate, rateTooHighRate, quotesToCloseRate, optOutRate,
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

export function pivotByLeadProfile(leads) {
  return pivotBy(leads, l => l.leadProfile, l => l.leadProfile || '(no profile)')
}
