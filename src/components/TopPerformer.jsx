const GOLD = '#F59E0B'
const G    = '#8CC63F'

const EMPLOYEE_MESSAGES = {
  Isaac:    'Exceptional consistency across all calls.',
  Karen:    'Outstanding client communication skills.',
  'Juan E': 'Strong performance and reliability.',
  Maria:    'Impressive growth and dedication.',
  Carlos:   'Solid team contributor this week.',
}

export default function TopPerformer({ performer }) {
  if (!performer) {
    return (
      <div
        className="animate-fade-in-up rounded-2xl border border-brand-border bg-white p-6 flex flex-col items-center justify-center gap-3 min-h-[200px]"
        style={{ animationDelay: '300ms', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      >
        <p className="text-brand-muted text-sm">No data this week</p>
      </div>
    )
  }

  const initials = performer.name.includes(' ')
    ? performer.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : performer.name.slice(0, 2).toUpperCase()

  const message  = EMPLOYEE_MESSAGES[performer.name] ?? 'Outstanding performance this week.'
  const barColor = performer.avgScore >= 8 ? G : '#EAB308'

  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white flex flex-col gap-5 p-6 relative overflow-hidden"
      style={{
        animationDelay: '300ms',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        borderLeft: `3px solid ${G}`,
      }}
    >
      {/* Subtle green blob top-right */}
      <div
        className="absolute -top-6 -right-6 w-28 h-28 rounded-full blur-3xl pointer-events-none"
        style={{ background: G, opacity: 0.06 }}
      />

      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-600">
            🏆 Top Performer
          </p>
          <p className="text-brand-muted text-[11px] mt-0.5">This week's best agent</p>
        </div>
        <span className="text-2xl">🥇</span>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${G}, #6B9B2F)` }}
          >
            {initials}
          </div>
          <div className="absolute -top-2 -right-2 text-lg">👑</div>
        </div>
        <div className="text-center">
          <p className="text-brand-text font-bold text-base">{performer.name}</p>
          <p className="text-brand-muted text-[11px] mt-0.5">{performer.calls} calls this week</p>
        </div>
      </div>

      {/* Score display */}
      <div className="rounded-xl border border-brand-border bg-brand-bg p-3 flex items-center justify-between">
        <span className="text-brand-muted text-xs">Avg Score</span>
        <span className="num text-2xl font-bold" style={{ color: barColor }}>
          {performer.avgScore}
          <span className="text-brand-muted text-sm font-normal"> /10</span>
        </span>
      </div>

      {/* Score bar */}
      <div className="h-1.5 rounded-full bg-brand-border overflow-hidden">
        <div
          className="h-full rounded-full score-bar-fill"
          style={{
            width: `${(performer.avgScore / 10) * 100}%`,
            background: `linear-gradient(90deg, ${G}, ${GOLD})`,
          }}
        />
      </div>

      {/* Message */}
      <p className="text-brand-muted text-[11px] text-center italic leading-relaxed">
        "{message}"
      </p>
    </div>
  )
}
