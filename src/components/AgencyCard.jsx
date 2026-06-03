const G = '#8CC63F'

function scoreColor(s) {
  return s >= 8 ? G : s >= 6 ? '#EAB308' : '#EF4444'
}

export default function AgencyCard({ agencyName, calls, position, onClose }) {
  if (!agencyName || !position) return null

  const agCalls = [...calls]
    .filter(c => c.customer === agencyName)
    .sort((a, b) => b.date > a.date ? 1 : -1)

  const total      = agCalls.length
  const avgScore   = total ? +(agCalls.reduce((s, c) => s + c.score, 0) / total).toFixed(1) : 0
  const frustrated = agCalls.filter(c => c.frustrated).length
  const latest     = agCalls[0]

  // Keep card on screen
  const vw   = typeof window !== 'undefined' ? window.innerWidth  : 1200
  const vh   = typeof window !== 'undefined' ? window.innerHeight : 800
  const left = Math.max(8, Math.min(position.x - 144, vw - 304))
  const top  = Math.min(position.y + 10, vh - 280)

  return (
    <>
      {/* Click-outside layer */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className="fixed z-50 bg-white border border-brand-border rounded-2xl w-72 animate-fade-in-up"
        style={{ top, left, boxShadow: '0 12px 40px rgba(0,0,0,0.14)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-brand-border flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">Agency Profile</p>
            <p className="text-brand-heading font-semibold text-sm mt-0.5 leading-snug">{agencyName}</p>
          </div>
          <button onClick={onClose}
            className="text-brand-muted hover:text-brand-text w-6 h-6 flex items-center justify-center rounded flex-shrink-0">
            ✕
          </button>
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Total Calls', value: total     },
              { label: 'Avg Score',   value: `${avgScore}` },
              { label: 'Frustrated',  value: frustrated },
            ].map(({ label, value }) => (
              <div key={label} className="bg-brand-bg rounded-lg p-2 text-center border border-brand-border">
                <p className="num text-base font-bold text-brand-text">{value}</p>
                <p className="text-[9px] text-brand-muted uppercase tracking-wide mt-0.5 leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {/* Frustrated alert */}
          {frustrated > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-[11px] text-red-600 font-semibold">
                ⚠ {frustrated} frustrated call{frustrated > 1 ? 's' : ''} flagged
              </p>
            </div>
          )}

          {/* Latest call summary */}
          {latest?.summary && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-1.5">
                Latest Call · {latest.date}
              </p>
              <p className="text-[11px] text-brand-heading italic leading-relaxed">{latest.summary}</p>
            </div>
          )}

          {/* Score bar */}
          <div>
            <div className="flex justify-between text-[10px] text-brand-muted mb-1">
              <span>Avg Score</span>
              <span className="font-bold" style={{ color: scoreColor(avgScore) }}>{avgScore}/10</span>
            </div>
            <div className="h-1.5 rounded-full bg-brand-border overflow-hidden">
              <div className="h-full rounded-full score-bar-fill"
                style={{ width: `${(avgScore / 10) * 100}%`, background: scoreColor(avgScore) }} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
