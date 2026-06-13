import { useState, useMemo, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { scoreColor, G, filterCalls, getDateWindow, aggregateEmployees } from '../../lib/ehUtils'

const RANGE_OPTIONS = [
  { label: 'Today', value: 'today' },
  { label: '2d',    value: '2'     },
  { label: '7d',    value: '7'     },
  { label: '14d',   value: '14'    },
  { label: '30d',   value: '30'    },
  { label: 'All',   value: 'all'   },
]

function ScoreRing({ value, size = 64 }) {
  const r = (size / 2) - 6
  const circ = 2 * Math.PI * r
  const pct = Math.min(Math.max((value || 0) / 10, 0), 1)
  const dash = pct * circ
  const c = scoreColor(value || 0)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E7E5" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="5"
        strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px`,
          fontFamily: '"DM Sans", sans-serif', fontSize: '13px', fontWeight: 700, fill: c }}>
        {value ? value.toFixed(1) : '—'}
      </text>
    </svg>
  )
}

function SubBar({ label, value }) {
  if (!value) return null
  const c = scoreColor(value)
  return (
    <div className="flex items-center gap-2">
      <span className="text-brand-muted text-[10px] w-24 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-brand-border rounded-full overflow-hidden">
        <div className="h-full rounded-full score-bar-fill" style={{ width: `${(value/10)*100}%`, background: c }} />
      </div>
      <span className="num text-[10px] font-bold flex-shrink-0" style={{ color: c }}>{value.toFixed(1)}</span>
    </div>
  )
}

export default function EmployeeDetailModal({ employeeName, allCalls, onClose, onCallClick }) {
  const [dateFilter, setDateFilter] = useState({ type: 'all', from: '', to: '' })

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // All calls for this employee
  const empCalls = useMemo(() =>
    allCalls.filter(c => c.employee === employeeName),
    [allCalls, employeeName]
  )

  // Date-filtered subset
  const filteredCalls = useMemo(() =>
    filterCalls(empCalls, dateFilter),
    [empCalls, dateFilter]
  )

  // Aggregate stats from filtered calls
  const stats = useMemo(() => {
    if (!filteredCalls.length) return null
    const avg = (arr) => {
      const valid = arr.filter(v => v > 0)
      return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0
    }
    return {
      calls:       filteredCalls.length,
      avgScore:    avg(filteredCalls.map(c => c.overallScore)),
      avgComm:     avg(filteredCalls.map(c => c.commScore)),
      avgProf:     avg(filteredCalls.map(c => c.profScore)),
      avgProd:     avg(filteredCalls.map(c => c.prodScore)),
      avgCX:       avg(filteredCalls.map(c => c.cxScore)),
      frustrated:  filteredCalls.filter(c => c.frustratedFlag).length,
      coaching:    filteredCalls.filter(c => c.coachingFlag).length,
    }
  }, [filteredCalls])

  // Sort calls newest-first
  const sortedCalls = useMemo(() =>
    [...filteredCalls].sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return b.date.localeCompare(a.date)
    }),
    [filteredCalls]
  )

  const initials = employeeName.includes(' ')
    ? employeeName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : employeeName.slice(0, 2).toUpperCase()

  const scoreC = scoreColor(stats?.avgScore || 0)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="animate-backdrop-in absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="animate-modal-enter relative bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-brand-border flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(140,198,63,0.07) 0%, white 60%)', borderTop: `3px solid ${G}` }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                style={{ background: G }}>
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-0.5">Employee Profile</p>
                <h2 className="text-lg font-bold text-brand-heading truncate">{employeeName}</h2>
                <p className="text-brand-muted text-[11px] mt-0.5">{empCalls.length} total calls · {stats?.frustrated || 0} frustrated</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-white hover:bg-red-50 hover:text-red-500 text-brand-muted flex items-center justify-center transition-colors border border-brand-border"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Date range pills */}
          <div className="flex items-center gap-1 mt-4 bg-brand-bg border border-brand-border rounded-lg p-0.5 w-fit flex-wrap">
            {RANGE_OPTIONS.map(opt => {
              const active = dateFilter.type === opt.value
              return (
                <button key={opt.value} onClick={() => setDateFilter(p => ({ ...p, type: opt.value }))}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 whitespace-nowrap flex-shrink-0"
                  style={active ? { background: G, color: 'white' } : { color: '#6B7280' }}>
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Stats row */}
          {stats ? (
            <div className="px-6 py-5 border-b border-brand-border bg-brand-bg/40">
              <div className="flex flex-wrap items-center gap-6">
                {/* Score ring */}
                <div className="flex flex-col items-center gap-1">
                  <ScoreRing value={stats.avgScore} size={70} />
                  <span className="text-[10px] text-brand-muted font-medium">Avg Score</span>
                </div>
                {/* Quick stats */}
                <div className="flex flex-wrap gap-4 flex-1">
                  <div className="text-center">
                    <p className="num text-2xl font-bold text-brand-heading">{stats.calls}</p>
                    <p className="text-[10px] text-brand-muted">Calls</p>
                  </div>
                  <div className="text-center">
                    <p className="num text-2xl font-bold text-red-500">{stats.frustrated}</p>
                    <p className="text-[10px] text-brand-muted">Frustrated</p>
                  </div>
                  {stats.coaching > 0 && (
                    <div className="text-center">
                      <p className="num text-2xl font-bold text-yellow-600">{stats.coaching}</p>
                      <p className="text-[10px] text-brand-muted">Need Coaching</p>
                    </div>
                  )}
                </div>
                {/* Sub-score bars */}
                <div className="flex-1 min-w-[200px] space-y-1.5">
                  <SubBar label="Communication"   value={stats.avgComm > 0 ? stats.avgComm : null} />
                  <SubBar label="Professionalism" value={stats.avgProf > 0 ? stats.avgProf : null} />
                  <SubBar label="Product Know."   value={stats.avgProd > 0 ? stats.avgProd : null} />
                  <SubBar label="Cx Experience"   value={stats.avgCX   > 0 ? stats.avgCX   : null} />
                </div>
              </div>
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-brand-muted text-sm border-b border-brand-border">
              No calls found for selected period
            </div>
          )}

          {/* Call history table */}
          <div className="px-6 py-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-3">
              Call History ({sortedCalls.length})
            </p>
            {sortedCalls.length === 0 ? (
              <p className="text-brand-muted text-sm text-center py-8">No calls in this date range</p>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-brand-border bg-brand-bg/40 rounded">
                      <th className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wider text-brand-muted">Date</th>
                      <th className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wider text-brand-muted">Customer</th>
                      <th className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wider text-brand-muted hidden sm:table-cell">Verdict</th>
                      <th className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wider text-brand-muted">Score</th>
                      <th className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wider text-brand-muted hidden sm:table-cell">Sentiment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCalls.map((call, i) => {
                      const fmtDate = call.date
                        ? (() => { try { return format(parseISO(call.date), 'MMM d') } catch { return call.date } })()
                        : '—'
                      const sc = scoreColor(call.overallScore)
                      return (
                        <tr key={call._rowIdx}
                          className="border-b border-brand-border/60 cursor-pointer transition-colors duration-150"
                          style={{ background: call.frustratedFlag ? '#fff5f5' : i % 2 === 0 ? '#fff' : '#f9faf9' }}
                          onClick={() => onCallClick?.(call.meetingId)}
                          onMouseEnter={e => e.currentTarget.style.background = '#f0f7e8'}
                          onMouseLeave={e => e.currentTarget.style.background = call.frustratedFlag ? '#fff5f5' : i % 2 === 0 ? '#fff' : '#f9faf9'}
                        >
                          <td className="py-2.5 px-3 text-brand-muted text-[11px] whitespace-nowrap">{fmtDate}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              {call.frustratedFlag && (
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" title="Frustrated" />
                              )}
                              <span className="text-brand-text text-[12px] font-medium hover:text-brand-green transition-colors">
                                {call.customer}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 hidden sm:table-cell">
                            {call.finalVerdict ? (
                              <span className="text-[10px] text-brand-muted bg-brand-bg border border-brand-border px-1.5 py-0.5 rounded whitespace-nowrap">
                                {call.finalVerdict}
                              </span>
                            ) : <span className="text-brand-muted text-[11px]">—</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="num text-[11px] font-bold" style={{ color: sc }}>
                              {call.overallScore > 0 ? call.overallScore.toFixed(1) : '—'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 hidden sm:table-cell">
                            {call.sentiment ? (
                              <span className="text-[10px] text-brand-muted">{call.sentiment}</span>
                            ) : <span className="text-brand-muted text-[11px]">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-brand-border bg-brand-bg flex items-center justify-between">
          <span className="text-[10px] text-brand-muted">{filteredCalls.length} calls in selected period</span>
          <button onClick={onClose} className="text-[11px] font-semibold px-4 py-1.5 rounded-lg text-white"
            style={{ background: G }}>Close</button>
        </div>
      </div>
    </div>
  )
}
