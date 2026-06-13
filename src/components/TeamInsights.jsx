const G = '#8CC63F'

function generate(calls, prevCalls) {
  const insights = []
  if (calls.length < 3) return insights

  // Build per-employee map
  const empMap = {}
  for (const call of calls) {
    if (!empMap[call.employee]) empMap[call.employee] = []
    empMap[call.employee].push(call)
  }

  // 1 — Most improved employee (compare first vs second half chronologically)
  let bestImp = null, bestDiff = 0
  for (const [name, ec] of Object.entries(empMap)) {
    if (ec.length < 4) continue
    const sorted = [...ec].sort((a, b) => a.date > b.date ? 1 : -1)
    const half   = Math.floor(sorted.length / 2)
    const olderAvg = sorted.slice(0, half).reduce((s, c) => s + c.score, 0) / half
    const newerAvg = sorted.slice(half).reduce((s, c) => s + c.score, 0) / (sorted.length - half)
    const diff = newerAvg - olderAvg
    if (diff > bestDiff) { bestDiff = diff; bestImp = { name, diff: +diff.toFixed(1) } }
  }
  if (bestImp && bestImp.diff > 0.2) {
    insights.push({
      icon: '📈', color: G,
      text: `${bestImp.name} improved the most this period — scores up ${bestImp.diff} points on average`,
    })
  }

  // 2 — Highest frustrated rate (needs attention)
  let worstEmp = null, worstRate = 0
  for (const [name, ec] of Object.entries(empMap)) {
    if (ec.length < 3) continue
    const rate = ec.filter(c => c.frustrated).length / ec.length
    if (rate > worstRate) { worstRate = rate; worstEmp = { name, rate: Math.round(rate * 100) } }
  }
  if (worstEmp && worstEmp.rate > 0) {
    insights.push({
      icon: '⚠️', color: '#EF4444',
      text: `${worstEmp.name} has the highest frustrated call rate at ${worstEmp.rate}% — may need coaching support`,
    })
  }

  // 3 — Most frustrated category
  const catMap = {}
  for (const call of calls) {
    if (!catMap[call.category]) catMap[call.category] = { total: 0, frustrated: 0 }
    catMap[call.category].total++
    if (call.frustrated) catMap[call.category].frustrated++
  }
  const topFrustCat = Object.entries(catMap)
    .filter(([, d]) => d.frustrated > 0)
    .sort(([, a], [, b]) => b.frustrated - a.frustrated)[0]
  if (topFrustCat) {
    const [cat, d] = topFrustCat
    insights.push({
      icon: '🔍', color: '#D97706',
      text: `${cat} calls have the most client frustration — ${d.frustrated} of ${d.total} flagged this period`,
    })
  }

  // 4 — Most flagged agency
  const agMap = {}
  for (const call of calls.filter(c => c.frustrated)) {
    agMap[call.customer] = (agMap[call.customer] || 0) + 1
  }
  const topAg = Object.entries(agMap).sort(([, a], [, b]) => b - a)[0]
  if (topAg && topAg[1] > 1) {
    insights.push({
      icon: '🏢', color: '#EF4444',
      text: `${topAg[0]} has been flagged ${topAg[1]} times — priority follow-up recommended`,
    })
  }

  // 5 — Overall trend vs previous period
  if (prevCalls.length >= 5) {
    const currAvg = calls.reduce((s, c) => s + c.score, 0) / calls.length
    const prevAvg = prevCalls.reduce((s, c) => s + c.score, 0) / prevCalls.length
    const diff    = +(currAvg - prevAvg).toFixed(1)
    if (Math.abs(diff) > 0.1) {
      insights.push({
        icon: diff > 0 ? '✅' : '📉',
        color: diff > 0 ? G : '#EF4444',
        text: diff > 0
          ? `Team performance is improving — average score up ${diff} points vs previous period`
          : `Team performance has dipped — average score down ${Math.abs(diff)} points vs previous period`,
      })
    }
  }

  return insights
}

export default function TeamInsights({ calls, prevCalls }) {
  const insights = generate(calls, prevCalls)
  if (insights.length === 0) return null

  return (
    <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white"
      style={{ animationDelay: '420ms', boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}>

      <div className="card-header px-4 sm:px-6 py-4 border-b border-brand-border flex items-center gap-2.5">
        <span className="text-lg">🧠</span>
        <div>
          <h2 className="text-brand-heading font-semibold text-sm">Team Insights</h2>
          <p className="text-brand-muted text-[11px] mt-0.5">Auto-generated from your data · {calls.length} calls analysed</p>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {insights.map((ins, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-brand-border p-3 bg-brand-bg/60">
            <span className="text-lg flex-shrink-0 mt-0.5">{ins.icon}</span>
            <p className="text-[12px] sm:text-[13px] text-brand-heading leading-relaxed">{ins.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
