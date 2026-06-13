import { useEffect, useMemo, useState } from 'react'
import { SENTIMENT_BG, RISK_BG, STATUS_BG, VERDICT_BG, scoreBg, uniqueMeetingIds } from '../../lib/qcUtils'

const SENTIMENT_ORDER = { Happy:5, Engaged:4, Interested:3, Uncertain:2, Confused:1, Frustrated:0, Upset:0 }

function SentimentDot({ sentiment }) {
  const cls = SENTIMENT_BG[sentiment] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${cls.split(' ')[0]}`} title={sentiment} />
  )
}

export default function CustomerProfileModal({ customerName, allCalls, onClose, onCallClick, onEmployeeClick }) {
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

  const customerRows = useMemo(() =>
    allCalls
      .filter(c => c.customer === customerName)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [allCalls, customerName]
  )

  const stats = useMemo(() => {
    if (!customerRows.length) return null
    const totalCalls   = uniqueMeetingIds(customerRows).length
    const latest       = customerRows[customerRows.length - 1]
    const employees    = [...new Set(customerRows.map(c => c.employee))]
    const riskLevel    = latest.riskLevel
    const openIssues   = customerRows.filter(c => c.status && c.status !== 'Resolved')
    const avgScore     = customerRows.length
      ? +(customerRows.reduce((s, c) => s + c.overallScore, 0) / customerRows.length).toFixed(1)
      : 0

    const sentimentHistory = [...new Map(
      customerRows.map(c => [`${c.date}-${c.meetingId}`, { date: c.date, sentiment: c.sentiment, meetingId: c.meetingId }])
    ).values()].sort((a, b) => a.date.localeCompare(b.date))

    const scores = sentimentHistory.map(s => SENTIMENT_ORDER[s.sentiment] ?? 2)
    const trend = scores.length < 2 ? 'stable'
      : scores[scores.length - 1] > scores[0] ? 'improving'
      : scores[scores.length - 1] < scores[0] ? 'declining'
      : 'stable'

    return { totalCalls, latest, employees, riskLevel, openIssues, avgScore, sentimentHistory, trend }
  }, [customerRows])

  const pagedRows = customerRows.slice().reverse().slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(customerRows.length / PAGE_SIZE)

  if (!customerRows.length || !stats) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="animate-backdrop-in absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="animate-modal-enter relative bg-white rounded-2xl p-8 text-center max-w-sm w-full">
          <p className="text-brand-muted text-sm">No data for {customerName}.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 text-sm font-medium text-white rounded-lg" style={{ background: '#8CC63F' }}>Close</button>
        </div>
      </div>
    )
  }

  const trendIcon  = stats.trend === 'improving' ? '↑' : stats.trend === 'declining' ? '↓' : '→'
  const trendColor = stats.trend === 'improving' ? 'text-green-600' : stats.trend === 'declining' ? 'text-red-600' : 'text-brand-muted'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="animate-backdrop-in absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="animate-modal-enter relative bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-brand-border flex-shrink-0 bg-brand-bg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-brand-heading">{customerName}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-[12px] text-brand-muted">{stats.totalCalls} calls</span>
                {stats.riskLevel && (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${RISK_BG[stats.riskLevel] || 'bg-gray-100 text-gray-600'}`}>
                    Risk: {stats.riskLevel}
                  </span>
                )}
                {stats.latest.sentiment && (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${SENTIMENT_BG[stats.latest.sentiment] || 'bg-gray-100 text-gray-600'}`}>
                    {stats.latest.sentiment}
                  </span>
                )}
                <span className={`text-[12px] font-semibold ${trendColor}`}>{trendIcon} {stats.trend}</span>
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
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Sentiment journey */}
          {stats.sentimentHistory.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-3">Sentiment Journey</p>
              <div className="flex items-center gap-2 flex-wrap">
                {stats.sentimentHistory.map((s, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity ${SENTIMENT_BG[s.sentiment] || 'bg-gray-100 text-gray-600'}`}
                      onClick={() => onCallClick(s.meetingId)}
                      title="Click to view call"
                    >
                      {s.sentiment || '?'}
                    </span>
                    <span className="text-[9px] text-brand-muted">{s.date.slice(5)}</span>
                    {i < stats.sentimentHistory.length - 1 && (
                      <span className="text-brand-border text-[10px]">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employees who spoke to this customer */}
          {stats.employees.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-3">LGM Employees Involved</p>
              <div className="flex flex-wrap gap-2">
                {stats.employees.map(emp => {
                  const empRows = customerRows.filter(c => c.employee === emp)
                  const avg = empRows.length
                    ? +(empRows.reduce((s, c) => s + c.overallScore, 0) / empRows.length).toFixed(1)
                    : 0
                  return (
                    <button
                      key={emp}
                      onClick={() => onEmployeeClick?.(emp)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg hover:border-brand-green hover:bg-white transition-colors"
                    >
                      <span className="text-[11px] font-semibold text-brand-heading">{emp}</span>
                      <span className={`text-[10px] font-bold num px-1 py-0.5 rounded ${scoreBg(avg)}`}>{avg}</span>
                      <span className="text-[10px] text-brand-muted">{empRows.length}×</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Open action items */}
          {stats.openIssues.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 mb-3">Open Issues ({stats.openIssues.length})</p>
              <div className="space-y-2">
                {stats.openIssues.slice(0, 5).map(c => (
                  <div
                    key={`${c.meetingId}-${c._rowIdx}`}
                    className="flex items-start justify-between gap-3 p-2.5 rounded-lg border border-red-100 bg-red-50 cursor-pointer hover:border-red-300 transition-colors"
                    onClick={() => onCallClick(c.meetingId)}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${STATUS_BG[c.status] || 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                        <span className="text-[11px] text-brand-muted">{c.date} · {c.employee}</span>
                      </div>
                      {c.actionItems && <p className="text-[12px] text-brand-text mt-1">{c.actionItems}</p>}
                      {c.followupOwner && <p className="text-[11px] text-brand-muted">Owner: {c.followupOwner}</p>}
                    </div>
                    <svg className="w-4 h-4 text-brand-muted flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full call history */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-3">Call History</p>
            <div className="overflow-x-auto rounded-xl border border-brand-border">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-brand-bg border-b border-brand-border">
                    {['Date', 'Employee', 'Category', 'Sentiment', 'Score', 'Verdict'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-brand-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map(c => (
                    <tr
                      key={`${c.meetingId}-${c._rowIdx}`}
                      className="border-b border-brand-border/40 hover:bg-brand-bg/60 cursor-pointer transition-colors"
                      onClick={() => onCallClick(c.meetingId)}
                    >
                      <td className="px-3 py-2 text-brand-muted whitespace-nowrap">{c.date}</td>
                      <td className="px-3 py-2 text-brand-heading font-medium">
                        <button
                          className="hover:text-brand-green transition-colors text-left"
                          onClick={e => { e.stopPropagation(); onEmployeeClick?.(c.employee) }}
                        >
                          {c.employee}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-brand-muted">{c.category}</td>
                      <td className="px-3 py-2">
                        {c.sentiment ? (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${SENTIMENT_BG[c.sentiment] || 'bg-gray-100 text-gray-600'}`}>
                            {c.sentiment}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-[11px] font-bold num px-1.5 py-0.5 rounded ${scoreBg(c.overallScore)}`}>{c.overallScore}</span>
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
