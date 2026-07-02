import { useEffect, useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { VERDICT_BG, VERDICT_COLORS, scoreBg, scoreColor, buildBehaviorInsights } from '../../lib/qcUtils'

function ScoreBar({ label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-brand-muted w-36 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-brand-bg rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full score-bar-fill"
          style={{ width: `${Math.round((value / 10) * 100)}%`, background: scoreColor(value) }}
        />
      </div>
      <span className={`text-[11px] font-bold num px-1.5 py-0.5 rounded ${scoreBg(value)}`}>{value || '—'}</span>
    </div>
  )
}

function VerdictBadge({ verdict }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${VERDICT_BG[verdict] || 'bg-gray-100 text-gray-600'}`}>
      {verdict}
    </span>
  )
}

export default function EmployeeProfileModal({ employeeName, allCalls, onClose, onCallClick, onCustomerClick }) {
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 8

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const empCalls = useMemo(() =>
    allCalls
      .filter(c => c.employee === employeeName)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [allCalls, employeeName]
  )

  const stats = useMemo(() => {
    if (!empCalls.length) return null
    const n = empCalls.length
    const avg = (field) => +(empCalls.reduce((s, c) => s + c[field], 0) / n).toFixed(1)
    const verdictCounts = {}
    for (const c of empCalls) {
      if (c.finalVerdict) verdictCounts[c.finalVerdict] = (verdictCounts[c.finalVerdict] || 0) + 1
    }
    return {
      totalCalls: n,
      avgOverall: avg('overallScore'),
      avgComm:    avg('commScore'),
      avgProf:    avg('profScore'),
      avgProd:    avg('prodKnowScore'),
      avgCX:      avg('cxScore'),
      verdictCounts,
      coachingFlag: empCalls.some(c => c.coachingFlag),
    }
  }, [empCalls])

  const scoreHistory = useMemo(() =>
    empCalls.map((c, i) => ({
      label: `#${i + 1}`,
      date: c.date,
      overall: c.overallScore,
      comm: c.commScore,
      prof: c.profScore,
      prod: c.prodKnowScore,
      cx: c.cxScore,
    })),
    [empCalls]
  )

  const topTags = useMemo(() => buildBehaviorInsights(empCalls).slice(0, 10), [empCalls])

  const coachingRecs = useMemo(() => {
    const recs = empCalls.map(c => c.coachingRecs).filter(Boolean)
    const freq = {}
    for (const r of recs) freq[r] = (freq[r] || 0) + 1
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3)
  }, [empCalls])

  const openItems = useMemo(() =>
    empCalls.filter(c => c.status === 'Pending' || c.status === 'Action Required' || c.followupOwner === employeeName),
    [empCalls, employeeName]
  )

  const pagedCalls = empCalls.slice().reverse().slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(empCalls.length / PAGE_SIZE)

  if (!empCalls.length) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="animate-backdrop-in absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="animate-modal-enter relative bg-white rounded-2xl p-8 text-center max-w-sm w-full">
          <p className="text-brand-muted text-sm">No data for {employeeName}.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 text-sm font-medium text-white rounded-lg" style={{ background: '#8CC63F' }}>Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="animate-backdrop-in absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="animate-modal-enter relative bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-brand-border flex-shrink-0 bg-brand-bg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                style={{ background: scoreColor(stats.avgOverall) }}
              >
                {employeeName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-brand-heading">{employeeName}</h2>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-[12px] text-brand-muted">{stats.totalCalls} calls</span>
                  <span className={`text-[12px] font-bold num px-2 py-0.5 rounded ${scoreBg(stats.avgOverall)}`}>
                    Avg {stats.avgOverall}
                  </span>
                  {stats.coachingFlag && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 font-semibold">
                      🎓 Coaching Required
                    </span>
                  )}
                </div>
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

          {/* Verdict distribution pills */}
          {Object.keys(stats.verdictCounts).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {Object.entries(stats.verdictCounts).sort((a,b) => b[1]-a[1]).map(([v, count]) => (
                <span key={v} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${VERDICT_BG[v] || 'bg-gray-100 text-gray-600'}`}>
                  {v} <strong>({count})</strong>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Sub-score bars */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-3">Score Averages</p>
            <div className="space-y-2.5">
              <ScoreBar label="Overall Score"        value={stats.avgOverall} />
              <ScoreBar label="Communication"        value={stats.avgComm} />
              <ScoreBar label="Professionalism"      value={stats.avgProf} />
              <ScoreBar label="Product Knowledge"    value={stats.avgProd} />
              <ScoreBar label="Customer Experience"  value={stats.avgCX} />
            </div>
          </div>

          {/* Score history chart */}
          {scoreHistory.length >= 2 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-3">Score History</p>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoreHistory} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7E5" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E5E7E5' }} />
                    <Line type="monotone" dataKey="overall" name="Overall" stroke="#8CC63F" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                    <Line type="monotone" dataKey="comm" name="Comm" stroke="#4A9AF5" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="prod" name="Prod Know" stroke="#A855F7" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Coaching recommendations */}
          {coachingRecs.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-600 mb-3">Top Coaching Recommendations</p>
              <div className="space-y-1.5">
                {coachingRecs.map(([rec, count], i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-yellow-50 border border-yellow-100">
                    <span className="text-[10px] font-bold text-yellow-600 mt-0.5 flex-shrink-0 w-5">×{count}</span>
                    <p className="text-[12px] text-brand-text leading-snug">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top behavior tags */}
          {topTags.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-3">Most Frequent Behavior Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {topTags.map(t => (
                  <span
                    key={t.tag}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize ${
                      t.negative ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
                    }`}
                  >
                    {t.tag} <span className="opacity-60">({t.count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Open items */}
          {openItems.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 mb-3">Open Items</p>
              <div className="space-y-2">
                {openItems.slice(0, 5).map(c => (
                  <div key={`${c.meetingId}-${c._rowIdx}`}
                    className="flex items-start justify-between gap-3 p-2.5 rounded-lg border border-red-100 bg-red-50 cursor-pointer hover:border-red-300 transition-colors"
                    onClick={() => onCallClick(c.meetingId)}>
                    <div>
                      <p className="text-[12px] font-semibold text-brand-heading">{c.customer} · {c.date}</p>
                      <p className="text-[11px] text-brand-muted">{c.status}{c.actionItems ? ` — ${c.actionItems}` : ''}</p>
                    </div>
                    <svg className="w-4 h-4 text-brand-muted flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Call history table */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-3">Call History</p>
            <div className="overflow-x-auto rounded-xl border border-brand-border">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-brand-bg border-b border-brand-border">
                    {['Date', 'Customer', 'Category', 'Score', 'Verdict'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-brand-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedCalls.map(c => (
                    <tr
                      key={`${c.meetingId}-${c._rowIdx}`}
                      className="border-b border-brand-border/40 hover:bg-brand-bg/60 cursor-pointer transition-colors"
                      onClick={() => onCallClick(c.meetingId)}
                    >
                      <td className="px-3 py-2 text-brand-muted">{c.date}</td>
                      <td className="px-3 py-2 font-medium text-brand-heading">
                        <button
                          className="hover:text-brand-green transition-colors text-left"
                          onClick={e => { e.stopPropagation(); onCustomerClick?.(c.customer) }}
                        >
                          {c.customer}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-brand-muted">{c.category}</td>
                      <td className="px-3 py-2">
                        <span className={`font-bold num text-[11px] px-1.5 py-0.5 rounded ${scoreBg(c.overallScore)}`}>{c.overallScore}</span>
                      </td>
                      <td className="px-3 py-2">
                        {c.finalVerdict && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${VERDICT_BG[c.finalVerdict] || 'bg-gray-100 text-gray-600'}`}>
                            {c.finalVerdict === 'Immediate Attention' ? 'Immediate!' : c.finalVerdict}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="text-[11px] px-2.5 py-1 rounded border border-brand-border text-brand-muted hover:text-brand-heading disabled:opacity-40 transition-colors"
                >
                  ← Prev
                </button>
                <span className="text-[11px] text-brand-muted">Page {page + 1} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="text-[11px] px-2.5 py-1 rounded border border-brand-border text-brand-muted hover:text-brand-heading disabled:opacity-40 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-brand-border bg-brand-bg flex justify-end">
          <button
            onClick={onClose}
            className="text-[11px] font-semibold px-4 py-1.5 rounded-lg text-white"
            style={{ background: '#8CC63F' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
