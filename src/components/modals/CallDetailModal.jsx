import { useEffect, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { scoreColor, VERDICT_STYLE, SENTIMENT_STYLE, RISK_STYLE, STATUS_STYLE, G } from '../../lib/ehUtils'

function ScoreBlock({ label, value }) {
  if (!value && value !== 0) return null
  const c = scoreColor(value)
  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-xl border"
      style={{ background: `${c}0a`, borderColor: `${c}28` }}>
      <span className="num text-2xl font-bold" style={{ color: c }}>{value.toFixed(1)}</span>
      <span className="text-[10px] font-semibold text-brand-muted text-center leading-tight">{label}</span>
    </div>
  )
}

function TagList({ items, color = '#6B7280', bg = '#F4F6F4', border = '#E5E7E5' }) {
  if (!items?.length) return <span className="text-brand-muted text-[11px]">None noted</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t, i) => (
        <span key={i} className="text-[11px] font-medium px-2 py-0.5 rounded-full border"
          style={{ color, background: bg, borderColor: border }}>
          {t}
        </span>
      ))}
    </div>
  )
}

function Badge({ text, styleMap }) {
  if (!text) return null
  const cls = styleMap?.[text] || 'bg-gray-100 text-gray-600'
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{text}</span>
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-2">{title}</p>
      {children}
    </div>
  )
}

export default function CallDetailModal({ meetingId, allCalls, onClose, onEmployeeClick }) {
  const rows = useMemo(() =>
    allCalls.filter(c => c.meetingId === meetingId),
    [allCalls, meetingId]
  )
  const primary = rows[0]

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!primary) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="animate-backdrop-in absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="animate-modal-enter relative bg-white rounded-2xl p-8 text-center max-w-sm w-full">
          <p className="text-brand-muted text-sm">Call not found.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 text-sm font-medium text-white rounded-lg" style={{ background: G }}>Close</button>
        </div>
      </div>
    )
  }

  const fmtDate = primary.date
    ? (() => { try { return format(parseISO(primary.date), 'MMMM d, yyyy') } catch { return primary.date } })()
    : '—'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="animate-backdrop-in absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="animate-modal-enter relative bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-brand-border flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(140,198,63,0.06) 0%, white 60%)' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-1">Call Detail</p>
              <h2 className="text-lg font-bold text-brand-heading truncate">{primary.customer}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[12px] text-brand-muted">
                <span>{fmtDate}</span>
                {primary.time && <><span>·</span><span>{primary.time}</span></>}
                {primary.duration > 0 && <><span>·</span><span>{primary.duration} min</span></>}
                {primary.category && <><span>·</span><span>{primary.category}</span></>}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge text={primary.finalVerdict} styleMap={VERDICT_STYLE} />
                <Badge text={primary.sentiment} styleMap={SENTIMENT_STYLE} />
                {primary.riskLevel && <Badge text={`Risk: ${primary.riskLevel}`} styleMap={RISK_STYLE} />}
                <Badge text={primary.status} styleMap={STATUS_STYLE} />
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
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Employees on this call */}
          <Section title={rows.length > 1 ? `Employees on this call (${rows.length})` : 'Employee'}>
            <div className="flex flex-wrap gap-2">
              {rows.map((r, i) => (
                <button key={i} onClick={() => onEmployeeClick?.(r.employee)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-brand-border bg-brand-bg hover:border-brand-green hover:bg-white transition-colors">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                    style={{ background: scoreColor(r.overallScore) }}>
                    {r.employee.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-[12px] font-semibold text-brand-heading">{r.employee}</span>
                  <span className="num text-[11px] font-bold" style={{ color: scoreColor(r.overallScore) }}>
                    {r.overallScore > 0 ? r.overallScore.toFixed(1) : '—'}
                  </span>
                </button>
              ))}
            </div>
          </Section>

          {/* Scores */}
          {rows.map((r, i) => (
            <div key={i} className={rows.length > 1 ? 'p-4 rounded-xl border border-brand-border bg-brand-bg/40' : ''}>
              {rows.length > 1 && (
                <p className="text-[11px] font-semibold text-brand-heading mb-3">{r.employee}</p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <ScoreBlock label="Overall" value={r.overallScore} />
                {r.commScore > 0 && <ScoreBlock label="Communication" value={r.commScore} />}
                {r.profScore > 0 && <ScoreBlock label="Professionalism" value={r.profScore} />}
                {r.prodScore > 0 && <ScoreBlock label="Product Know." value={r.prodScore} />}
                {r.cxScore  > 0 && <ScoreBlock label="Cx Experience" value={r.cxScore} />}
              </div>
            </div>
          ))}

          {/* Summary */}
          {primary.summary && (
            <Section title="Call Summary">
              <p className="text-[13px] text-brand-text leading-relaxed bg-brand-bg rounded-xl p-3 border border-brand-border italic">
                {primary.summary}
              </p>
            </Section>
          )}

          {primary.posHighlights?.length > 0 && (
            <Section title="Positive Highlights">
              <TagList items={primary.posHighlights} color="#166534" bg="#f0fdf4" border="#bbf7d0" />
            </Section>
          )}

          {primary.areasForImprovement?.length > 0 && (
            <Section title="Areas for Improvement">
              <TagList items={primary.areasForImprovement} color="#92400e" bg="#fffbeb" border="#fde68a" />
            </Section>
          )}

          {primary.redFlags?.length > 0 && (
            <Section title="Red Flags">
              <TagList items={primary.redFlags} color="#991b1b" bg="#fef2f2" border="#fecaca" />
            </Section>
          )}

          {primary.behaviorTags?.length > 0 && (
            <Section title="Behavior Tags">
              <TagList items={primary.behaviorTags} color="#1e40af" bg="#eff6ff" border="#bfdbfe" />
            </Section>
          )}

          {primary.coachingRecs?.length > 0 && (
            <Section title="Coaching Recommendations">
              <div className="space-y-1.5">
                {primary.coachingRecs.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-[12px] text-brand-text">
                    <span className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full bg-yellow-100 border border-yellow-300 flex items-center justify-center text-[10px] font-bold text-yellow-700">{i+1}</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {(primary.actionItems || primary.followupOwner || primary.promisedDeadline) && (
            <Section title="Action Items & Follow-up">
              <div className="rounded-xl border border-brand-border bg-brand-bg p-3 space-y-2">
                {primary.actionItems && (
                  <p className="text-[12px] text-brand-text">{primary.actionItems}</p>
                )}
                <div className="flex flex-wrap gap-3 text-[11px] text-brand-muted">
                  {primary.followupOwner && (
                    <span>Owner: <strong className="text-brand-text">{primary.followupOwner}</strong></span>
                  )}
                  {primary.promisedDeadline && (
                    <span>Deadline: <strong className="text-brand-text">{primary.promisedDeadline}</strong></span>
                  )}
                </div>
              </div>
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-brand-border bg-brand-bg flex items-center justify-between">
          <span className="text-[10px] text-brand-muted font-mono">Meeting ID: {primary.meetingId}</span>
          <button onClick={onClose} className="text-[11px] font-semibold px-4 py-1.5 rounded-lg text-white"
            style={{ background: G }}>Close</button>
        </div>
      </div>
    </div>
  )
}
