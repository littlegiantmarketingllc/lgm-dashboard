import { format, parseISO } from 'date-fns'
import { G, scoreColor } from '../lib/ehUtils'

const RED = '#EF4444'

function ScorePill({ score }) {
  const c = scoreColor(score || 0)
  return (
    <span className="num inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border"
      style={{ color: c, background: `${c}12`, borderColor: `${c}28` }}>
      {score > 0 ? score.toFixed(1) : '—'}
    </span>
  )
}

function fmtDate(str) {
  if (!str) return '—'
  try { return format(parseISO(str), 'MMM d') } catch { return str }
}

function resolvedAgo(ts) {
  if (!ts) return ''
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

function StatusBadge({ status }) {
  if (status === 'resolved') return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap"
      style={{ color: G, background: `${G}10`, borderColor: `${G}28` }}>✓ Resolved</span>
  )
  if (status === 'in_progress') return (
    <span className="inline-flex items-center gap-1 text-amber-700 text-[11px] font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" /> In Progress
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-red-500 text-[11px] font-semibold bg-red-50 border border-red-200 px-2 py-0.5 rounded-full whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" /> Needs Action
    </span>
  )
}

function ActionButtons({ callId, status, setStatus }) {
  if (status === 'resolved') return (
    <button onClick={e => { e.stopPropagation(); setStatus(callId, null) }}
      className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 whitespace-nowrap"
      style={{ color: '#6B7280', borderColor: '#E5E7E5' }}>
      Undo
    </button>
  )
  if (status === 'in_progress') return (
    <div className="flex items-center gap-1.5">
      <button onClick={e => { e.stopPropagation(); setStatus(callId, 'resolved') }}
        className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 text-white whitespace-nowrap"
        style={{ background: G, borderColor: G }}>
        ✓ Done
      </button>
      <button onClick={e => { e.stopPropagation(); setStatus(callId, null) }}
        className="text-[11px] font-semibold px-2 py-1.5 rounded-lg border transition-all duration-200 whitespace-nowrap"
        style={{ color: '#6B7280', borderColor: '#E5E7E5' }} title="Reset">↩</button>
    </div>
  )
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={e => { e.stopPropagation(); setStatus(callId, 'in_progress') }}
        className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all duration-200 whitespace-nowrap"
        style={{ color: '#D97706', background: '#FFFBEB', borderColor: '#FDE68A' }}>
        Working
      </button>
      <button onClick={e => { e.stopPropagation(); setStatus(callId, 'resolved') }}
        className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all duration-200 text-white whitespace-nowrap"
        style={{ background: G, borderColor: G }}>
        ✓ Done
      </button>
    </div>
  )
}

export default function FrustratedTable({ calls, statuses, setStatus, onEmployeeClick, onCallClick }) {
  const getStatus     = (id) => statuses[String(id)]?.status ?? 'action_required'
  const getResolvedAt = (id) => statuses[String(id)]?.resolvedAt ?? null
  const statusKey     = (call) => call.meetingId || String(call._rowIdx)

  const actionRequired = calls.filter(c => getStatus(statusKey(c)) === 'action_required').length
  const inProgress     = calls.filter(c => getStatus(statusKey(c)) === 'in_progress').length
  const resolved       = calls.filter(c => getStatus(statusKey(c)) === 'resolved').length

  return (
    <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white"
      style={{
        animationDelay: '640ms',
        boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)',
        borderTop: `3px solid ${RED}`,
      }}>

      {/* Header */}
      <div className="px-5 sm:px-6 py-4 border-b border-brand-border flex items-start sm:items-center justify-between flex-wrap gap-3"
        style={{ background: 'linear-gradient(to right, rgba(239,68,68,0.05), transparent)' }}>
        <div>
          <h2 className="text-brand-heading font-semibold text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse-dot inline-block flex-shrink-0"
              style={{ boxShadow: '0 0 5px rgba(239,68,68,0.5)' }} />
            Frustrated Calls
          </h2>
          <p className="text-brand-muted text-[11px] mt-0.5">
            {calls.length === 0
              ? 'No frustrated calls this period'
              : `${actionRequired} pending · ${inProgress} in progress · ${resolved} resolved`}
          </p>
        </div>
        {calls.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {resolved > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border"
                style={{ color: G, background: `${G}10`, borderColor: `${G}25` }}>
                ✓ {resolved} resolved
              </span>
            )}
            {inProgress > 0 && (
              <span className="text-amber-700 text-[11px] font-bold bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                ◌ {inProgress} in progress
              </span>
            )}
            {actionRequired > 0 && (
              <span className="text-red-500 text-[11px] font-bold bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                ⚠ {actionRequired} pending
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border bg-brand-bg/50">
              <th className="pl-5 sm:pl-6 pr-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted">Customer</th>
              <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted hidden sm:table-cell">Date</th>
              <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted">Employee</th>
              <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted">Score</th>
              <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted hidden sm:table-cell">Status</th>
              <th className="px-3 sm:px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {calls.length === 0 && (
              <tr>
                <td colSpan={6} className="py-14 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <svg viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.5" strokeLinecap="round" className="w-10 h-10">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <p className="text-brand-muted text-sm">All clear — no frustrated calls this period</p>
                  </div>
                </td>
              </tr>
            )}

            {calls.map((call, i) => {
              const key        = statusKey(call)
              const status     = getStatus(key)
              const resolvedAt = getResolvedAt(key)
              const isResolved = status === 'resolved'

              return (
                <>
                  <tr
                    key={`row-${call.meetingId || call._rowIdx}`}
                    className={`animate-slide-in-row border-b border-brand-border/60 cursor-pointer transition-all duration-200 ${isResolved ? 'opacity-60' : ''}`}
                    style={{ animationDelay: `${680 + i * 50}ms` }}
                    onClick={() => onCallClick?.(call.meetingId)}
                    onMouseEnter={e => { if (!isResolved) e.currentTarget.style.background = '#F0F7E8' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '' }}
                  >
                    {/* Customer */}
                    <td className="pl-5 sm:pl-6 pr-3 py-3.5">
                      <span className="text-brand-text font-semibold text-[12px] sm:text-[13px] hover:text-brand-green transition-colors">
                        {call.customer || '—'}
                      </span>
                      {call.finalVerdict && (
                        <p className="text-[10px] text-brand-muted mt-0.5">{call.finalVerdict}</p>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-3 py-3.5 text-brand-muted text-[11px] whitespace-nowrap hidden sm:table-cell">
                      {fmtDate(call.date)}
                    </td>

                    {/* Employee */}
                    <td className="px-3 py-3.5">
                      <button
                        onClick={e => { e.stopPropagation(); onEmployeeClick?.(call.employee) }}
                        className="flex items-center gap-1.5 group"
                        title={`View ${call.employee}'s profile`}
                      >
                        <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                          style={{ background: `${G}15`, color: G, border: `1px solid ${G}28` }}>
                          {(call.employee || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-brand-text text-[12px] group-hover:text-brand-green transition-colors truncate max-w-[80px] sm:max-w-none">
                          {call.employee || '—'}
                        </span>
                      </button>
                    </td>

                    {/* Score */}
                    <td className="px-3 py-3.5">
                      <ScorePill score={call.overallScore} />
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3.5 hidden sm:table-cell">
                      <StatusBadge status={status} />
                    </td>

                    {/* Actions */}
                    <td className="px-3 sm:px-6 py-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        <ActionButtons callId={key} status={status} setStatus={setStatus} />
                        {isResolved && resolvedAt && (
                          <span className="text-[10px] text-brand-muted">Done {resolvedAgo(resolvedAt)}</span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Summary sub-row */}
                  {call.summary && (
                    <tr key={`summary-${call.meetingId || call._rowIdx}`}
                      className="border-b border-brand-border/60"
                      style={{ background: '#F9FAF9', borderLeft: `2px solid ${RED}` }}>
                      <td colSpan={6} className="pl-7 sm:pl-9 pr-5 sm:pr-7 py-2">
                        <p className="text-[11px] text-brand-muted italic leading-relaxed">{call.summary}</p>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
