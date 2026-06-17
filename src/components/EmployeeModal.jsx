import { useEffect } from 'react'

const G = '#8CC63F'

function scoreColor(s) {
  return s >= 8 ? G : s >= 6 ? '#EAB308' : '#EF4444'
}

function getBadge(avg) {
  if (avg >= 8.5) return { label: 'Excellent',         color: G,        bg: `${G}12`       }
  if (avg >= 7.5) return { label: 'Good',              color: '#D97706', bg: '#FFFBEB'      }
  return               { label: 'Needs Improvement', color: '#EF4444', bg: '#FEF2F2'      }
}

function calcTrend(sorted) {
  if (sorted.length < 4) return 'stable'
  const half    = Math.floor(sorted.length / 2)
  const older   = sorted.slice(half)
  const newer   = sorted.slice(0, half)
  const olderAvg = older.reduce((s, c) => s + c.score, 0) / older.length
  const newerAvg = newer.reduce((s, c) => s + c.score, 0) / newer.length
  if (newerAvg > olderAvg + 0.2) return 'improving'
  if (newerAvg < olderAvg - 0.2) return 'declining'
  return 'stable'
}

const TREND = {
  improving: { icon: '↑', label: 'Improving', color: G         },
  declining:  { icon: '↓', label: 'Declining', color: '#EF4444' },
  stable:     { icon: '→', label: 'Stable',    color: '#D97706' },
}

export default function EmployeeModal({ employeeName, calls, periodLabel, onClose }) {
  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // All calls for this employee, most-recent first
  const empCalls = [...calls]
    .filter(c => c.employee === employeeName)
    .sort((a, b) => b.date > a.date ? 1 : b.date < a.date ? -1 : (b.time || '') > (a.time || '') ? 1 : -1)

  const total = empCalls.length

  // Employee has no calls in the selected period — show a graceful empty state
  if (total === 0) {
    const initials = employeeName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
        <div className="animate-backdrop-in absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="animate-modal-enter relative bg-white rounded-2xl w-full max-w-md p-8 text-center"
          style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.20)' }}
          onClick={e => e.stopPropagation()}>
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors">
            ✕
          </button>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white mx-auto mb-4"
            style={{ background: G }}>{initials}</div>
          <h2 className="text-brand-heading font-bold text-base mb-1">{employeeName}</h2>
          {periodLabel && (
            <p className="text-[11px] text-brand-muted mb-4">📅 {periodLabel}</p>
          )}
          <p className="text-brand-muted text-sm">No calls recorded in this period.</p>
          <p className="text-brand-muted/60 text-[11px] mt-1">Try selecting a wider date range.</p>
        </div>
      </div>
    )
  }

  const avgScore       = +(empCalls.reduce((s, c) => s + c.score, 0) / total).toFixed(1)
  const frustrated     = empCalls.filter(c => c.frustrated).length
  const satisfactionRate = Math.round(((total - frustrated) / total) * 100)
  const badge          = getBadge(avgScore)
  const trend          = calcTrend(empCalls)
  const trendCfg       = TREND[trend]

  // Best category
  const catMap = {}
  for (const call of empCalls) {
    if (!catMap[call.category]) catMap[call.category] = { n: 0, sum: 0 }
    catMap[call.category].n++
    catMap[call.category].sum += call.score
  }
  const bestCat = Object.entries(catMap)
    .map(([cat, d]) => ({ cat, avg: +(d.sum / d.n).toFixed(1) }))
    .sort((a, b) => b.avg - a.avg)[0]

  const initials = employeeName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const recent5  = empCalls.slice(0, 5)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}>
      {/* Backdrop */}
      <div className="animate-backdrop-in absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="animate-modal-enter relative bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.20)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 bg-white border-b border-brand-border px-5 sm:px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: G }}>{initials}</div>
            <div className="min-w-0">
              <h2 className="text-brand-heading font-bold text-base truncate">{employeeName}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border"
                  style={{ color: badge.color, background: badge.bg, borderColor: `${badge.color}30` }}>
                  {badge.label}
                </span>
                <span className="text-[11px] font-semibold" style={{ color: trendCfg.color }}>
                  {trendCfg.icon} {trendCfg.label}
                </span>
              </div>
              {periodLabel && (
                <p className="text-[10px] text-brand-muted mt-1 flex items-center gap-1">
                  <span>📅</span>
                  <span>Showing data for: <strong>{periodLabel}</strong></span>
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors text-base flex-shrink-0">
            ✕
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-5">

          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Calls',   value: total             },
              { label: 'Avg Score',     value: `${avgScore}/10`  },
              { label: 'Priority',      value: frustrated         },
              { label: 'Satisfaction',  value: `${satisfactionRate}%` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-brand-bg rounded-xl p-3 text-center border border-brand-border">
                <p className="num text-xl font-bold text-brand-text">{value}</p>
                <p className="text-[10px] text-brand-muted uppercase tracking-wider mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Best category + trend */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bestCat && (
              <div className="rounded-xl border border-brand-border p-4 flex items-center gap-3">
                <span className="text-2xl">🏅</span>
                <div>
                  <p className="text-[10px] text-brand-muted uppercase tracking-wider">Best Category</p>
                  <p className="text-brand-heading font-semibold text-sm mt-0.5">{bestCat.cat}</p>
                  <p className="text-[11px] font-bold" style={{ color: G }}>Avg {bestCat.avg} / 10</p>
                </div>
              </div>
            )}
            <div className="rounded-xl border border-brand-border p-4 flex items-center gap-3">
              <span className="text-2xl">{trend === 'improving' ? '📈' : trend === 'declining' ? '📉' : '📊'}</span>
              <div>
                <p className="text-[10px] text-brand-muted uppercase tracking-wider">Performance Trend</p>
                <p className="text-brand-heading font-semibold text-sm mt-0.5" style={{ color: trendCfg.color }}>
                  {trendCfg.label}
                </p>
                <p className="text-[11px] text-brand-muted">Based on {total} calls</p>
              </div>
            </div>
          </div>

          {/* Recent 5 calls timeline */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-3">
              Recent 5 Calls
            </p>
            <div className="space-y-0">
              {recent5.map((call, i) => (
                <div key={call.id} className="flex gap-3 items-start">
                  <div className="flex flex-col items-center flex-shrink-0 pt-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: call.frustrated ? '#EF4444' : G }} />
                    {i < recent5.length - 1 && <div className="w-px h-8 bg-brand-border mt-1" />}
                  </div>
                  <div className="flex-1 min-w-0 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-medium text-brand-text truncate">{call.customer}</p>
                      <span className="num text-[12px] font-bold flex-shrink-0"
                        style={{ color: scoreColor(call.score) }}>
                        {call.score.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-[11px] text-brand-muted">{call.category} · {call.date}</p>
                    {call.summary && (
                      <p className="text-[11px] text-brand-muted italic mt-0.5 leading-relaxed line-clamp-2">
                        {call.summary}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full call history */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-3">
              Call History — {periodLabel || 'Selected Period'} ({total} calls)
            </p>
            <div className="rounded-xl border border-brand-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-brand-bg border-b border-brand-border">
                      {['Date', 'Customer', 'Category', 'Score', 'Status'].map(h => (
                        <th key={h} className="px-3 py-2.5 first:pl-4 text-left text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {empCalls.map(call => (
                      <tr key={call.id} className="hover:bg-brand-bg transition-colors">
                        <td className="px-3 py-2 pl-4 text-[11px] text-brand-muted whitespace-nowrap">{call.date}</td>
                        <td className="px-3 py-2 text-[12px] text-brand-text font-medium max-w-[160px] truncate">{call.customer}</td>
                        <td className="px-3 py-2 text-[11px] text-brand-muted whitespace-nowrap">{call.category}</td>
                        <td className="px-3 py-2">
                          <span className="num text-[12px] font-bold" style={{ color: scoreColor(call.score) }}>
                            {call.score.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {call.frustrated
                            ? <span className="text-red-500 text-[11px] font-bold">⚠ Priority</span>
                            : <span className="text-brand-muted text-[11px]">Positive</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
