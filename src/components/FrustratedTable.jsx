import { format, parseISO } from 'date-fns'

const G = '#8CC63F'

function scoreColor(s) {
  return s >= 8 ? G : s >= 6 ? '#EAB308' : '#EF4444'
}

function ScorePill({ score }) {
  const c = scoreColor(score)
  return (
    <span className="num inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border"
      style={{ color: c, background: `${c}12`, borderColor: `${c}28` }}>
      {score.toFixed(1)}
    </span>
  )
}

function resolvedAgo(ts) {
  if (!ts) return ''
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60)  return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
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
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" /> Action Required
    </span>
  )
}

function ActionButtons({ callId, status, setStatus }) {
  if (status === 'resolved') return (
    <button onClick={() => setStatus(callId, null)}
      className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 whitespace-nowrap"
      style={{ color: '#6B7280', borderColor: '#E5E7E5' }}>
      Undo
    </button>
  )

  if (status === 'in_progress') return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button onClick={() => setStatus(callId, 'resolved')}
        className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 text-white whitespace-nowrap"
        style={{ background: G, borderColor: G, boxShadow: `0 1px 4px ${G}40` }}>
        Mark Complete
      </button>
      <button onClick={() => setStatus(callId, null)}
        className="text-[11px] font-semibold px-2 py-1.5 rounded-lg border transition-all duration-200 whitespace-nowrap"
        style={{ color: '#6B7280', borderColor: '#E5E7E5' }} title="Reset">
        ↩
      </button>
    </div>
  )

  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-1.5">
      <button onClick={() => setStatus(callId, 'in_progress')}
        className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 whitespace-nowrap"
        style={{ color: '#D97706', background: '#FFFBEB', borderColor: '#FDE68A' }}>
        In Progress
      </button>
      <button onClick={() => setStatus(callId, 'resolved')}
        className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 text-white whitespace-nowrap"
        style={{ background: G, borderColor: G, boxShadow: `0 1px 4px ${G}40` }}>
        Mark Complete
      </button>
    </div>
  )
}

export default function FrustratedTable({ calls, statuses, setStatus, onEmployeeClick, onAgencyClick }) {
  const getStatus     = (id) => statuses[String(id)]?.status ?? 'action_required'
  const getResolvedAt = (id) => statuses[String(id)]?.resolvedAt ?? null

  const actionRequired = calls.filter(c => getStatus(c.id) === 'action_required').length
  const inProgress     = calls.filter(c => getStatus(c.id) === 'in_progress').length
  const resolved       = calls.filter(c => getStatus(c.id) === 'resolved').length

  return (
    <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white"
      style={{ animationDelay: '560ms', boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}>

      {/* Header */}
      <div className="card-header px-4 sm:px-6 py-4 border-b border-brand-border flex items-start sm:items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-brand-heading font-semibold text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse-dot inline-block flex-shrink-0"
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
              <th className="px-3 sm:px-5 py-3 pl-4 sm:pl-6 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted">Customer</th>
              <th className="px-3 sm:px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted hidden sm:table-cell">Date</th>
              <th className="px-3 sm:px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted">Employee</th>
              <th className="px-3 sm:px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted hidden lg:table-cell">Category</th>
              <th className="px-3 sm:px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted">Score</th>
              <th className="px-3 sm:px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted hidden sm:table-cell">Status</th>
              <th className="px-3 sm:px-5 py-3 pr-4 sm:pr-6 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {calls.length === 0 && (
              <tr>
                <td colSpan={7} className="py-14 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-4xl">✅</span>
                    <p className="text-brand-muted text-sm">All clear — no frustrated clients this period</p>
                  </div>
                </td>
              </tr>
            )}

            {calls.map((call, i) => {
              const status     = getStatus(call.id)
              const resolvedAt = getResolvedAt(call.id)
              const isResolved = status === 'resolved'

              return (
                <>
                  {/* Main data row */}
                  <tr key={`row-${call.id}`}
                    className={`animate-slide-in-row frustrated-row transition-all duration-200 ${isResolved ? 'reviewed' : ''}`}
                    style={{ animationDelay: `${600 + i * 50}ms` }}>

                    {/* Customer — clickable */}
                    <td className="pl-4 sm:pl-6 pr-3 sm:pr-5 py-3">
                      <button
                        onClick={e => onAgencyClick?.(call.customer, e)}
                        className="text-brand-text font-medium text-[12px] sm:text-[13px] hover:text-brand-green transition-colors duration-150 text-left underline decoration-dotted underline-offset-2 decoration-brand-muted/50"
                        title={`View ${call.customer} profile`}
                      >
                        {call.customer}
                      </button>
                    </td>

                    {/* Date */}
                    <td className="px-3 sm:px-5 py-3 text-brand-muted text-[11px] sm:text-[12px] hidden sm:table-cell whitespace-nowrap">
                      {format(parseISO(call.date), 'MMM d, yyyy')}
                    </td>

                    {/* Employee — clickable */}
                    <td className="px-3 sm:px-5 py-3">
                      <button
                        onClick={() => onEmployeeClick?.(call.employee)}
                        className="flex items-center gap-1.5 sm:gap-2 group"
                        title={`View ${call.employee}'s profile`}
                      >
                        <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                          style={{ background: `${G}15`, color: G, border: `1px solid ${G}28` }}>
                          {call.employee.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-brand-text text-[11px] sm:text-[12px] group-hover:text-brand-green transition-colors duration-150">
                          <span className="hidden sm:inline">{call.employee}</span>
                          <span className="sm:hidden">{call.employee.split(' ')[0]}</span>
                        </span>
                      </button>
                    </td>

                    {/* Category */}
                    <td className="px-3 sm:px-5 py-3 hidden lg:table-cell">
                      <span className="text-brand-muted text-[11px] bg-brand-bg border border-brand-border px-2 py-0.5 rounded whitespace-nowrap">
                        {call.category}
                      </span>
                    </td>

                    {/* Score */}
                    <td className="px-3 sm:px-5 py-3">
                      <ScorePill score={call.score} />
                    </td>

                    {/* Status */}
                    <td className="px-3 sm:px-5 py-3 hidden sm:table-cell">
                      <StatusBadge status={status} />
                    </td>

                    {/* Actions */}
                    <td className="px-3 sm:px-5 py-3 pr-4 sm:pr-6">
                      <div className="flex flex-col gap-1 items-start">
                        <ActionButtons callId={call.id} status={status} setStatus={setStatus} />
                        {isResolved && resolvedAt && (
                          <span className="text-[10px] text-brand-muted">
                            Resolved {resolvedAgo(resolvedAt)}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Summary sub-row */}
                  {call.summary && (
                    <tr key={`summary-${call.id}`}
                      className={`border-b border-brand-border/60 transition-opacity duration-200 ${isResolved ? 'opacity-50' : ''}`}
                      style={{ background: '#F9FAF9', borderLeft: '2px solid #EF4444' }}>
                      <td colSpan={7} className="pl-8 sm:pl-10 pr-4 sm:pr-6 py-2.5">
                        <p className="text-[11px] text-brand-muted italic leading-relaxed">
                          📋 {call.summary}
                        </p>
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
