import { useEffect, useState } from 'react'
import { getCallRows, VERDICT_BG, SENTIMENT_BG, RISK_BG, STATUS_BG, scoreColor, scoreBg } from '../../lib/qcUtils'

function ScoreGauge({ label, value }) {
  const color = scoreColor(value)
  const pct   = Math.round((value / 10) * 100)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-brand-muted">{label}</span>
        <span className={`text-[12px] font-bold num px-1.5 py-0.5 rounded ${scoreBg(value)}`}>{value || '—'}</span>
      </div>
      <div className="h-1.5 bg-brand-bg rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 score-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

function Badge({ label, className }) {
  if (!label) return null
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${className}`}>{label}</span>
}

function PipeList({ items, color }) {
  if (!items || !items.length) return <p className="text-brand-muted text-[12px] italic">None noted</p>
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-[12px] text-brand-text leading-snug">
          <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: color }} />
          {item}
        </li>
      ))}
    </ul>
  )
}

function TagChips({ tags }) {
  if (!tags || !tags.length) return <span className="text-brand-muted text-[12px]">—</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map(tag => (
        <span key={tag} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-brand-bg border border-brand-border text-brand-heading capitalize">
          {tag}
        </span>
      ))}
    </div>
  )
}

function EmployeePanel({ row, onEmployeeClick }) {
  return (
    <div className="space-y-5">
      {/* Score gauges */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-3">Scores</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ScoreGauge label="Overall"          value={row.overallScore} />
          <ScoreGauge label="Communication"    value={row.commScore} />
          <ScoreGauge label="Professionalism"  value={row.profScore} />
          <ScoreGauge label="Product Knowledge" value={row.prodKnowScore} />
          <ScoreGauge label="Customer Experience" value={row.cxScore} />
        </div>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-2 items-center">
        {row.finalVerdict && (
          <Badge label={row.finalVerdict} className={VERDICT_BG[row.finalVerdict] || 'bg-gray-100 text-gray-600'} />
        )}
        {row.sentiment && (
          <Badge label={row.sentiment} className={SENTIMENT_BG[row.sentiment] || 'bg-gray-100 text-gray-600'} />
        )}
        {row.riskLevel && (
          <Badge label={`Risk: ${row.riskLevel}`} className={RISK_BG[row.riskLevel] || 'bg-gray-100 text-gray-600'} />
        )}
        {row.status && (
          <Badge label={row.status} className={STATUS_BG[row.status] || 'bg-gray-100 text-gray-600'} />
        )}
        {row.frustratedFlag && (
          <Badge label="😤 Frustrated" className="bg-red-100 text-red-700" />
        )}
        {row.coachingFlag && (
          <Badge label="🎓 Coaching Required" className="bg-yellow-100 text-yellow-700" />
        )}
      </div>

      {/* Behavior tags */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-2">Behavior Tags</p>
        <TagChips tags={row.behaviorTags} />
      </div>

      {/* Highlights */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-green-600 mb-2">Positive Highlights</p>
        <PipeList items={row.highlights} color="#8CC63F" />
      </div>

      {/* Areas for Improvement */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-600 mb-2">Areas for Improvement</p>
        <PipeList items={row.improvements} color="#EAB308" />
      </div>

      {/* Red Flags */}
      {row.redFlags && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 mb-1">Red Flags</p>
          <p className="text-[12px] text-red-700">{row.redFlags}</p>
        </div>
      )}

      {/* Coaching recs */}
      {row.coachingRecs && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-2">Coaching Recommendations</p>
          <p className="text-[12px] text-brand-text leading-relaxed">{row.coachingRecs}</p>
        </div>
      )}

      {/* Action items / status */}
      {(row.actionItems || row.followupOwner || row.promisedDeadline) && (
        <div className="rounded-xl border border-brand-border bg-brand-bg p-3 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-2">Follow-up</p>
          {row.actionItems    && <p className="text-[12px] text-brand-text"><strong>Action:</strong> {row.actionItems}</p>}
          {row.followupOwner  && <p className="text-[12px] text-brand-muted"><strong>Owner:</strong> {row.followupOwner}</p>}
          {row.promisedDeadline && <p className="text-[12px] text-brand-muted"><strong>Deadline:</strong> {row.promisedDeadline}</p>}
        </div>
      )}

      {/* Summary */}
      {row.summary && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-2">Summary</p>
          <p className="text-[12px] text-brand-text leading-relaxed">{row.summary}</p>
        </div>
      )}
    </div>
  )
}

export default function CallDetailModal({ meetingId, allCalls, onClose, onEmployeeClick, onCustomerClick }) {
  const rows = getCallRows(allCalls, meetingId)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!rows.length) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
        <div className="animate-backdrop-in absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="animate-modal-enter relative bg-white rounded-2xl p-8 text-center max-w-sm w-full">
          <p className="text-brand-muted text-sm">Call data not found.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 text-sm font-medium text-white rounded-lg" style={{ background: '#8CC63F' }}>Close</button>
        </div>
      </div>
    )
  }

  const first = rows[0]
  const multiEmployee = rows.length > 1
  const activeRow = rows[activeTab] || rows[0]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="animate-backdrop-in absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="animate-modal-enter relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-brand-border flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <button
                className="text-lg font-bold text-brand-heading hover:text-brand-green transition-colors text-left"
                onClick={() => onCustomerClick?.(first.customer)}
              >
                {first.customer}
              </button>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[12px] text-brand-muted">
                <span>{first.date}</span>
                {first.time && <span>{first.time}</span>}
                {first.duration > 0 && <span>{first.duration} min</span>}
                {first.category && <span className="px-1.5 py-0.5 bg-brand-bg border border-brand-border rounded text-[10px]">{first.category}</span>}
                <span className="text-[10px] text-brand-border/80 font-mono">ID: {meetingId}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-bg hover:bg-red-50 hover:text-red-500 text-brand-muted flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Employee tabs (when multiple employees on same call) */}
          {multiEmployee && (
            <div className="flex gap-1 mt-4 flex-wrap">
              {rows.map((row, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                    activeTab === i
                      ? 'bg-brand-green text-white'
                      : 'bg-brand-bg text-brand-muted hover:text-brand-heading border border-brand-border'
                  }`}
                >
                  {row.employee}
                </button>
              ))}
            </div>
          )}

          {!multiEmployee && (
            <div className="mt-2">
              <button
                className="text-[12px] font-semibold text-brand-muted hover:text-brand-green transition-colors"
                onClick={() => onEmployeeClick?.(first.employee)}
              >
                {first.employee}
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {multiEmployee && (
            <p className="text-[11px] text-brand-muted mb-4">
              Showing <strong>{activeRow.employee}</strong> — click tabs above to switch
            </p>
          )}
          <EmployeePanel row={activeRow} onEmployeeClick={onEmployeeClick} />
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-brand-border bg-brand-bg flex items-center justify-between">
          {multiEmployee && (
            <p className="text-[11px] text-brand-muted">{rows.length} employees on this call</p>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {onEmployeeClick && (
              <button
                onClick={() => onEmployeeClick(activeRow.employee)}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-brand-border bg-white hover:bg-brand-bg text-brand-muted transition-colors"
              >
                View {activeRow.employee}'s Profile →
              </button>
            )}
            <button
              onClick={onClose}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-lg text-white transition-colors"
              style={{ background: '#8CC63F' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
