import { useMemo, useEffect } from 'react'
import { G } from '../../lib/ehUtils'
import EmployeeAvatar from '../EmployeeAvatar'

const GOLD = '#F59E0B'

function Checkbox({ checked, onClick }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      className="w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 focus:outline-none"
      style={{ borderColor: checked ? G : '#D1D5DB', background: checked ? G : 'white' }}
    >
      {checked && (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )}
    </button>
  )
}

export default function CoachingModal({
  employeeName, allCalls,
  coachingStatuses, onToggleRec, onResetCoaching,
  onClose, onBack, onEmployeeClick,
}) {
  const coachingRecs = useMemo(() => {
    const seen = new Set()
    const recs = []
    for (const c of allCalls.filter(c => c.employee === employeeName))
      for (const r of (c.coachingRecs || []))
        if (r && !seen.has(r)) { seen.add(r); recs.push(r) }
    return recs
  }, [allCalls, employeeName])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  const empStatus = coachingStatuses[employeeName] || {}
  const doneCount = coachingRecs.filter((_, i) => empStatus[i]).length
  const allDone   = coachingRecs.length > 0 && doneCount === coachingRecs.length
  const pct       = coachingRecs.length ? Math.round((doneCount / coachingRecs.length) * 100) : 0

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="animate-backdrop-in absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="animate-modal-enter relative bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)', borderTop: `3px solid ${GOLD}` }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-brand-border flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.07) 0%, white 60%)' }}>

          {onBack && (
            <button onClick={onBack}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-muted hover:text-brand-heading transition-colors mb-3 -mt-1 group">
              <svg className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              Back
            </button>
          )}

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <EmployeeAvatar name={employeeName} size={48} variant="solid" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: GOLD }}>
                  Coaching Review
                </p>
                <h2 className="text-lg font-bold text-brand-heading truncate">{employeeName}</h2>
                <button
                  onClick={() => onEmployeeClick?.(employeeName)}
                  className="text-[11px] text-brand-muted hover:text-brand-green transition-colors underline decoration-dotted underline-offset-2 mt-0.5"
                >
                  View full profile →
                </button>
              </div>
            </div>
            <button onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-white hover:bg-red-50 hover:text-red-500 text-brand-muted flex items-center justify-center transition-colors border border-brand-border">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          {coachingRecs.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-brand-muted">
                  <span className="font-semibold text-brand-heading">{doneCount}</span>
                  {' '}of{' '}
                  <span className="font-semibold text-brand-heading">{coachingRecs.length}</span>
                  {' '}items reviewed
                </span>
                <span className="font-bold" style={{ color: allDone ? G : GOLD }}>{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-brand-border overflow-hidden">
                <div className="h-full rounded-full score-bar-fill"
                  style={{ width: `${pct}%`, background: allDone ? G : GOLD }} />
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {coachingRecs.length === 0 && (
            <div className="text-center py-10 text-brand-muted text-sm">
              No coaching recommendations on file for {employeeName}.
            </div>
          )}

          {allDone ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: `${G}15` }}>
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <p className="text-brand-heading font-bold text-base">Coaching Complete!</p>
                <p className="text-brand-muted text-[12px] mt-1 leading-relaxed">
                  All {coachingRecs.length} coaching items reviewed for {employeeName}.<br/>
                  This employee will be removed from the Need Coaching list.
                </p>
              </div>
              <button
                onClick={() => onResetCoaching?.(employeeName)}
                className="text-[11px] font-semibold px-4 py-1.5 rounded-lg border border-brand-border text-brand-muted hover:text-brand-heading transition-colors"
              >
                ↩ Reset &amp; Re-coach
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-3">
                Coaching Recommendations — check each one when reviewed
              </p>
              {coachingRecs.map((rec, i) => {
                const done = Boolean(empStatus[i])
                return (
                  <div key={i}
                    className="flex items-start gap-3 rounded-xl border p-3.5 transition-all duration-200"
                    style={{
                      borderColor: done ? '#BBF7D0' : `${GOLD}40`,
                      background:  done ? '#F0FDF4' : `${GOLD}06`,
                      opacity: done ? 0.72 : 1,
                    }}>
                    <Checkbox checked={done} onClick={() => onToggleRec(employeeName, i)} />
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold"
                        style={{
                          borderColor: done ? '#BBF7D0' : `${GOLD}60`,
                          color:  done ? '#16a34a' : GOLD,
                          background: done ? '#F0FDF4' : `${GOLD}12`,
                        }}>
                        {i + 1}
                      </span>
                      <p className={`text-[12px] leading-relaxed flex-1 ${done ? 'line-through text-brand-muted' : 'text-brand-text'}`}>
                        {rec}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-brand-border bg-brand-bg flex items-center justify-between">
          <span className="text-[10px] text-brand-muted">
            {coachingRecs.length} recommendation{coachingRecs.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            {onBack && (
              <button onClick={onBack}
                className="text-[11px] font-semibold px-4 py-1.5 rounded-lg border border-brand-border text-brand-muted hover:text-brand-heading transition-colors">
                ← Back
              </button>
            )}
            <button onClick={onClose}
              className="text-[11px] font-semibold px-4 py-1.5 rounded-lg text-white"
              style={{ background: GOLD }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
