const G = '#8CC63F'

function StatPill({ count, label, color, bg, border }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border" style={{ background: bg, borderColor: border }}>
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
      <div className="min-w-0">
        <p className="num text-xl font-bold leading-none" style={{ color }}>{count}</p>
        <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color }}>{label}</p>
      </div>
    </div>
  )
}

export default function ResolutionTrackerHealth({ accounts, statuses }) {
  if (!accounts || accounts.length === 0) return null

  let actionRequired = 0, inProgress = 0, resolved = 0
  for (const a of accounts) {
    const s = statuses[String(a.id)]?.status ?? 'action_required'
    if (s === 'resolved')     resolved++
    else if (s === 'in_progress') inProgress++
    else actionRequired++
  }

  const total = accounts.length
  const pct   = total > 0 ? Math.round((resolved / total) * 100) : 0

  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white"
      style={{ animationDelay: '480ms', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      <div className="px-6 py-4 border-b border-brand-border">
        <h2 className="text-brand-heading font-semibold text-sm">At-Risk Resolution Tracker</h2>
        <p className="text-brand-muted text-[11px] mt-0.5">Track follow-up progress on at-risk accounts</p>
      </div>

      <div className="px-6 py-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatPill count={actionRequired} label="Action Required" color="#EF4444" bg="#FEF2F2" border="#FECACA" />
          <StatPill count={inProgress}     label="In Progress"     color="#D97706" bg="#FFFBEB" border="#FDE68A" />
          <StatPill count={resolved}       label="Resolved"        color={G}       bg={`${G}0D`} border={`${G}30`} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-brand-muted">
              <span className="font-semibold text-brand-text">{resolved}</span> of{' '}
              <span className="font-semibold text-brand-text">{total}</span> at-risk accounts actioned
            </span>
            <span className="font-bold" style={{ color: G }}>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-brand-border overflow-hidden">
            <div className="h-full flex">
              <div className="h-full score-bar-fill"
                style={{ width: `${(resolved / total) * 100}%`, background: G,
                  borderRadius: resolved === total ? '9999px' : '9999px 0 0 9999px' }} />
              <div className="h-full score-bar-fill"
                style={{ width: `${(inProgress / total) * 100}%`, background: '#F59E0B',
                  borderRadius: actionRequired === 0 ? '0 9999px 9999px 0' : '0' }} />
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-brand-muted">
            {[
              { color: G,         label: 'Resolved'         },
              { color: '#F59E0B', label: 'In Progress'      },
              { color: '#E5E7E5', label: 'Action Required'  },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
