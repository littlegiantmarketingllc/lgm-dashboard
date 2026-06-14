import { useCountUp } from '../hooks/useCountUp'
import { scoreColor, fmtMins, G } from '../lib/ehUtils'

function ScoreCell({ label, value, delay, isMain = false, noBorder = false }) {
  const displayed = useCountUp(value || 0, { duration: 1000, delay, decimals: 1 })
  const c = scoreColor(value || 0)
  const borderClass = noBorder ? '' : 'sm:border-l border-brand-border'
  if (!value) return (
    <div className={`flex flex-col items-center justify-center gap-1.5 ${borderClass} px-3 py-4`}>
      <span className="text-brand-muted text-[13px] font-semibold">—</span>
      <span className="text-[9px] text-brand-muted/70 uppercase tracking-wider font-bold text-center leading-tight">{label}</span>
    </div>
  )
  return (
    <div className={`flex flex-col items-center justify-center gap-1.5 ${borderClass} px-3 py-4`}>
      <span className={`num font-bold leading-none ${isMain ? 'text-3xl' : 'text-xl'}`} style={{ color: c }}>
        {displayed.toFixed(1)}
      </span>
      <span className="text-[9px] text-brand-muted uppercase tracking-wider font-bold text-center leading-tight">{label}</span>
    </div>
  )
}

function TalkTimeCell({ totalMins }) {
  const formatted = fmtMins(totalMins)
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 sm:border-l border-brand-border px-3 py-4">
      <span className="num text-xl font-bold leading-none text-brand-heading">{formatted || '—'}</span>
      <span className="text-[9px] text-brand-muted uppercase tracking-wider font-bold">Talk Time</span>
    </div>
  )
}

function CoachingNeededCell({ count }) {
  const displayed = useCountUp(count || 0, { duration: 900, delay: 360 })
  const GOLD = '#F59E0B'
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 sm:border-l border-brand-border px-3 py-4">
      <span className="num text-xl font-bold leading-none" style={{ color: count > 0 ? GOLD : '#6B7280' }}>
        {displayed}
      </span>
      <span className="text-[9px] text-brand-muted uppercase tracking-wider font-bold text-center leading-tight">
        Coaching Needed
      </span>
    </div>
  )
}

export default function QuickStats({ stats, coachingNeeded }) {
  const { avgScore, avgComm, avgProf, avgProd, avgCX, totalMins } = stats

  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white overflow-hidden"
      style={{
        animationDelay: '120ms',
        boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <div className="px-5 pt-3 pb-1 border-b border-brand-border/50">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-muted">Score Breakdown · Selected Period</p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7">
        <div className="col-span-1" style={{ background: `${scoreColor(avgScore || 0)}08` }}>
          <ScoreCell label="Overall Score" value={avgScore} delay={0} isMain noBorder />
        </div>
        <ScoreCell label="Communication"   value={avgComm}  delay={60}  />
        <ScoreCell label="Professionalism" value={avgProf}  delay={120} />
        <ScoreCell label="Product Know."   value={avgProd}  delay={180} />
        <ScoreCell label="Cx Experience"   value={avgCX}    delay={240} />
        <TalkTimeCell totalMins={totalMins} />
        <CoachingNeededCell count={coachingNeeded ?? 0} />
      </div>
    </div>
  )
}
