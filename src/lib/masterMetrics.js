// Pure computation functions for the Master Dashboard.
// All formulas match the QS Calculated Fields spec shared by Steve (2026-08-25).
// Commission is a static 10.5% of Written Premium — confirmed by Steve.

const DEFAULT_COMMISSION_RATE = 0.105
const POLICY_SOLD_STAGE = 'Policy Sold'
const BAD_LEAD_DNC_STAGE = 'Bad Lead / DNC'

function isPolicySold(o) {
  return o.pipelineStageName === POLICY_SOLD_STAGE
}

function hasValue(v) {
  return v !== null && v !== undefined && v !== ''
}

// commissionRate is a John-editable variable in the UI (default 10.5%,
// confirmed by Steve) rather than hardcoded, so Commission/Profit/PPL can be
// recalculated without a code change if that rate ever differs by account.
//
// missingFields comes from the API's field-registry check (api/_masterLeadsCore.js) —
// it's fixed per account/date-window and independent of any owner/source filter
// or pivot grouping. That's the only correct source of truth for "is this
// field actually mapped to a real GHL custom field on this account".
//
// A prior version instead asked "does at least one lead IN THIS GROUP have a
// value for this field" — which works fine for the whole-account overview,
// but breaks the moment you filter to one owner, one source, or a narrow date
// range: a genuinely-mapped field with zero matches in a small slice (e.g. no
// quotes yet today, or this one producer never quotes) was indistinguishable
// from the field not existing at all, and both showed the same scary "Field
// not found in GHL" warning. Using missingFields instead means a real zero
// shows as a real 0/0%, and the warning only fires when the field is truly
// unmapped account-wide.
export function computeOverview(leads, commissionRate = DEFAULT_COMMISSION_RATE, missingFields = []) {
  const leadCount = leads.length
  const allOpps   = leads.flatMap(l => l.opportunities || [])
  const policySoldOpps = allOpps.filter(isPolicySold)

  // ── BASE CALCULATIONS ──────────────────────────────────────────────────────
  // 1. Leads — count({crm_id})
  // (leadCount above)

  // 2. Written Premium — sumIf(monetaryValue, pipelineStageId = 'Policy Sold')
  const writtenPremium = policySoldOpps.reduce((s, o) => s + (Number(o.monetaryValue) || 0), 0)

  const missing = key => missingFields.includes(key)
  const hasLeadCost   = !missing('leadPrice')
  const hasCallCount  = !missing('callCount')
  const hasDispoDate  = !missing('dispositionDate')
  const hasBadLead    = !missing('badLeadDate')
  const hasSmsReply   = !missing('smsReplyDate')
  const hasOppSold    = !missing('oppSoldDate')
  const hasQuoted     = !missing('quotedTimestamp')
  const hasXdated     = !missing('xdatedReason')
  const hasOptOut     = !missing('optOutDate')

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
  // 0. Commission — {Written Premium} * commissionRate
  const commission = writtenPremium * commissionRate

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

// Leads with no opportunity at all are excluded from both the chart and the
// percentage base — per John, counting them would skew "% of leads in each
// pipeline stage" against leads that were never worked into a pipeline to
// begin with.
export function salesStageBreakdown(leads) {
  const withStage = leads.filter(l => l.salesStage)
  const counts = new Map()
  for (const lead of withStage) {
    counts.set(lead.salesStage, (counts.get(lead.salesStage) || 0) + 1)
  }
  const total = withStage.length
  return [...counts.entries()]
    .map(([stage, count]) => ({ stage, count, pct: total > 0 ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count)
}

function pivotBy(leads, keyFn, labelFn, commissionRate, missingFields) {
  const groups = new Map()
  for (const lead of leads) {
    const key = keyFn(lead) ?? '(none)'
    if (!groups.has(key)) groups.set(key, { key, label: labelFn(lead), leads: [] })
    groups.get(key).leads.push(lead)
  }
  return [...groups.values()]
    .map(g => ({ label: g.label, ...computeOverview(g.leads, commissionRate, missingFields) }))
    .sort((a, b) => b.leadCount - a.leadCount)
}

export function pivotBySource(leads, commissionRate, missingFields) {
  return pivotBy(leads, l => l.source, l => l.source || '(no source)', commissionRate, missingFields)
}

export function pivotByOwner(leads, commissionRate, missingFields) {
  return pivotBy(leads, l => l.assignedTo, l => l.assignedToName || l.assignedTo || '(unassigned)', commissionRate, missingFields)
}

export function pivotByLeadProfile(leads, commissionRate, missingFields) {
  return pivotBy(leads, l => l.leadProfile, l => l.leadProfile || '(no profile)', commissionRate, missingFields)
}

export function pivotBySubSource(leads, commissionRate, missingFields) {
  return pivotBy(leads, l => l.subSource, l => l.subSource || '(no sub-source)', commissionRate, missingFields)
}
