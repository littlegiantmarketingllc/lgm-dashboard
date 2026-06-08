const G   = '#8CC63F'
const RED = '#EF4444'
const AMB = '#EAB308'

function fmt(n) { return '$' + Math.round(n).toLocaleString() }

function bandColor(band) {
  if (band === 'healthy') return G
  if (band === 'watch')   return AMB
  return RED
}

function resolvedAgo(ts) {
  if (!ts) return ''
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60)  return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function HealthPill({ score, band }) {
  const c = bandColor(band)
  return (
    <div className="flex items-center gap-1.5">
      <span className="num inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border"
        style={{ color: c, background: `${c}12`, borderColor: `${c}28` }}>
        {score}
      </span>
      <div className="w-12 h-1 rounded-full bg-brand-border overflow-hidden">
        <div className="h-full score-bar-fill rounded-full" style={{ width: `${score}%`, background: c }} />
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  if (status === 'resolved')   return (
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

function ActionButtons({ id, status, setStatus }) {
  if (status === 'resolved') return (
    <button onClick={() => setStatus(id, null)}
      className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 whitespace-nowrap"
      style={{ color: '#6B7280', borderColor: '#E5E7E5' }}>Undo</button>
  )
  if (status === 'in_progress') return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button onClick={() => setStatus(id, 'resolved')}
        className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border text-white whitespace-nowrap"
        style={{ background: G, borderColor: G, boxShadow: `0 1px 4px ${G}40` }}>Mark Complete</button>
      <button onClick={() => setStatus(id, null)}
        className="text-[11px] font-semibold px-2 py-1.5 rounded-lg border whitespace-nowrap"
        style={{ color: '#6B7280', borderColor: '#E5E7E5' }} title="Reset">↩</button>
    </div>
  )
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 flex-wrap">
      <button onClick={() => setStatus(id, 'in_progress')}
        className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border whitespace-nowrap"
        style={{ color: '#D97706', background: '#FFFBEB', borderColor: '#FDE68A' }}>In Progress</button>
      <button onClick={() => setStatus(id, 'resolved')}
        className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border text-white whitespace-nowrap"
        style={{ background: G, borderColor: G, boxShadow: `0 1px 4px ${G}40` }}>Mark Complete</button>
    </div>
  )
}

export default function NeedsAttentionTable({ accounts, statuses, setStatus, onAccountClick }) {
  const getStatus     = (id) => statuses[String(id)]?.status ?? 'action_required'
  const getResolvedAt = (id) => statuses[String(id)]?.resolvedAt ?? null

  const actionRequired = accounts.filter(a => getStatus(a.id) === 'action_required').length
  const inProgress     = accounts.filter(a => getStatus(a.id) === 'in_progress').length
  const resolved       = accounts.filter(a => getStatus(a.id) === 'resolved').length

  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white"
      style={{ animationDelay: '540ms', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-brand-border flex items-start sm:items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-brand-heading font-semibold text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse-dot inline-block flex-shrink-0"
              style={{ boxShadow: '0 0 5px rgba(239,68,68,0.5)' }} />
            Needs Attention
          </h2>
          <p className="text-brand-muted text-[11px] mt-0.5">
            {accounts.length === 0
              ? 'No at-risk accounts — all clear'
              : `${accounts.length} accounts · ${actionRequired} pending · ${inProgress} in progress · ${resolved} resolved`}
          </p>
        </div>
        {accounts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {resolved    > 0 && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border" style={{ color: G,   background: `${G}10`,   borderColor: `${G}25`   }}>✓ {resolved} resolved</span>}
            {inProgress  > 0 && <span className="text-amber-700 text-[11px] font-bold bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">◌ {inProgress} in progress</span>}
            {actionRequired > 0 && <span className="text-red-500 text-[11px] font-bold bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">⚠ {actionRequired} pending</span>}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border bg-brand-bg/50">
              {['Account Name', 'Type', 'Transactions', 'Users', 'Total Rev', 'Health', 'Recommended Action', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-3 sm:px-4 py-3 first:pl-5 last:pr-5 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 && (
              <tr>
                <td colSpan={9} className="py-14 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-4xl">✅</span>
                    <p className="text-brand-muted text-sm">No at-risk accounts — portfolio looking healthy</p>
                  </div>
                </td>
              </tr>
            )}
            {accounts.map((a, i) => {
              const status     = getStatus(a.id)
              const resolvedAt = getResolvedAt(a.id)
              const isResolved = status === 'resolved'

              return (
                <tr key={a.id}
                  className={`animate-slide-in-row border-b border-brand-border/60 transition-all duration-200 ${isResolved ? 'opacity-50' : 'hover:bg-red-50/30'}`}
                  style={{ animationDelay: `${560 + i * 40}ms`, borderLeft: `2px solid ${isResolved ? '#E5E7E5' : RED}` }}>

                  <td className="pl-5 pr-3 py-3">
                    <button
                      onClick={() => onAccountClick?.(a)}
                      className="text-[12px] font-semibold hover:underline text-left"
                      style={{ color: RED }}
                    >
                      {a.accountName}
                    </button>
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <span className="text-[11px] bg-brand-bg border border-brand-border px-2 py-0.5 rounded whitespace-nowrap text-brand-muted">
                      {a.accountType}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <span className="num text-[12px] font-semibold text-brand-text">{a.transactions.toLocaleString()}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <span className="num text-[12px] text-brand-text">{a.users}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <span className="num text-[12px] font-semibold text-brand-text">{fmt(a.totalRev)}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <HealthPill score={a._health?.score ?? 0} band={a._health?.band ?? 'at_risk'} />
                  </td>
                  <td className="px-3 sm:px-4 py-3 max-w-[200px]">
                    <p className="text-[11px] text-brand-muted leading-snug">{a._health?.action ?? ''}</p>
                  </td>
                  <td className="px-3 sm:px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={status} />
                      {isResolved && resolvedAt && (
                        <span className="text-[10px] text-brand-muted">Resolved {resolvedAgo(resolvedAt)}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-3 pr-5">
                    <ActionButtons id={a.id} status={status} setStatus={setStatus} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
