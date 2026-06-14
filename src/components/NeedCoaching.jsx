import { G, scoreColor } from '../lib/ehUtils'

const GOLD = '#F59E0B'

export default function NeedCoaching({ employees, onCoachingClick, onEmployeeClick, isComplete }) {
  const needsCoaching = employees.filter(e =>
    e.coaching > 0 && !isComplete?.(e.name, e.coachingRecs?.length)
  )

  if (!needsCoaching.length) return null

  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white"
      style={{
        animationDelay: '340ms',
        boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)',
        borderLeft: `3px solid ${GOLD}`,
      }}
    >
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-brand-border flex items-center justify-between"
        style={{ background: 'linear-gradient(to right, rgba(245,158,11,0.06), transparent)' }}>
        <div>
          <h3 className="text-brand-heading font-semibold text-[13px] flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
              <path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 12 2.1 12.5"/><circle cx="12" cy="12" r="3"/>
            </svg>
            Need Coaching
          </h3>
          <p className="text-brand-muted text-[10px] mt-0.5">
            {needsCoaching.length} employee{needsCoaching.length !== 1 ? 's' : ''} flagged · click flag to review
          </p>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border"
          style={{ color: GOLD, background: `${GOLD}12`, borderColor: `${GOLD}30` }}>
          {needsCoaching.length} flagged
        </span>
      </div>

      {/* Employee chips — two clickable zones: avatar/name → profile, flag badge → coaching modal */}
      <div className="px-5 py-3.5 flex flex-wrap gap-2">
        {needsCoaching.map(emp => {
          const sc = scoreColor(emp.avgScore)
          const initials = emp.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
          return (
            <div
              key={emp.name}
              className="flex items-center gap-0 rounded-xl border overflow-hidden transition-all duration-200"
              style={{ borderColor: `${GOLD}35`, background: `${GOLD}08` }}
            >
              {/* Left: avatar + name → opens employee profile */}
              <button
                onClick={() => onEmployeeClick?.(emp.name)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-amber-50 transition-colors group"
                title={`View ${emp.name}'s full profile`}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                  style={{ background: sc }}>
                  {initials}
                </div>
                <div className="text-left">
                  <p className="text-[12px] font-semibold text-brand-heading group-hover:text-yellow-700 transition-colors whitespace-nowrap">
                    {emp.name}
                  </p>
                  <p className="text-[10px] text-brand-muted">avg {emp.avgScore}</p>
                </div>
              </button>

              {/* Right: coaching flag badge → opens CoachingModal */}
              <button
                onClick={() => onCoachingClick?.(emp.name)}
                className="flex items-center gap-1 px-2.5 py-2 border-l transition-all duration-200 group"
                style={{ borderColor: `${GOLD}30` }}
                onMouseEnter={e => e.currentTarget.style.background = `${GOLD}22`}
                onMouseLeave={e => e.currentTarget.style.background = ''}
                title="Review coaching recommendations"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" className="w-3 h-3 flex-shrink-0 group-hover:scale-110 transition-transform">
                  <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                </svg>
                <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: GOLD }}>
                  {emp.coaching} flag{emp.coaching !== 1 ? 's' : ''}
                </span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
