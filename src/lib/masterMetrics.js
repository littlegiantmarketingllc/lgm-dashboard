// Pure computation functions for the Master Dashboard — mirrors the pattern in
// healthEngine.js: no side effects, no API calls, just math over the `leads`
// array already fetched by /api/master-leads.
//
// Formula status as of 2026-08-21 (update this comment as items get confirmed):
//   Computable now — leadCount, saleCount, wonPremium, withOpportunity, and the
//     source/owner pivots built on top of those.
//   Blocked on the GHL custom-fields OAuth scope (see MasterDashboard's status
//     banner) — leadPrice, callCount, dispositionDate. Everything downstream of
//     those (CPP, Calls Per Lead, Dispo Rate) returns null until that scope is on.
//   Blocked, no data source wired up at all yet — SMS Reply Rate, and PPL
//     specifically (needs a "commission" value; QuickSight has one, we haven't
//     identified which GHL field it maps to — do not guess, ask Steve).
//   Reverse-engineered from QuickSight exports, not yet confirmed by Steve —
//     CPP = leadCost / saleCount. Treat as provisional.

function isWon(o) { return o.status === 'won' }

export function computeOverview(leads) {
  const leadCount = leads.length
  const allOpps = leads.flatMap(l => l.opportunities || [])
  const wonOpps = allOpps.filter(isWon)
  const saleCount = wonOpps.length
  const wonPremium = wonOpps.reduce((sum, o) => sum + (Number(o.monetaryValue) || 0), 0)
  const withOpportunity = leads.filter(l => (l.opportunities || []).length > 0).length

  const hasLeadCost    = leads.some(l => l.leadPrice !== null && l.leadPrice !== undefined && l.leadPrice !== '')
  const hasCallCount   = leads.some(l => l.callCount !== null && l.callCount !== undefined && l.callCount !== '')
  const hasDisposition = leads.some(l => !!l.dispositionDate)

  const totalLeadCost = hasLeadCost  ? leads.reduce((sum, l) => sum + (Number(l.leadPrice) || 0), 0) : null
  const totalCalls    = hasCallCount ? leads.reduce((sum, l) => sum + (Number(l.callCount) || 0), 0) : null
  const dispositioned = hasDisposition ? leads.filter(l => !!l.dispositionDate).length : null

  return {
    leadCount,
    saleCount,
    wonPremium,
    withOpportunity,
    leadCost:     totalLeadCost,
    cpp:          (totalLeadCost !== null && saleCount > 0) ? totalLeadCost / saleCount : null,
    callsPerLead: (totalCalls !== null && leadCount > 0) ? totalCalls / leadCount : null,
    dispoRate:    (dispositioned !== null && leadCount > 0) ? (dispositioned / leadCount) * 100 : null,
    ppl:          null, // needs "commission" — not yet identified which GHL field this is, do not guess
  }
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
