import { useMemo } from 'react'
import { uniqueMeetingIds } from '../../lib/qcUtils'

function Card({ icon, label, value, sub, accent, pulse, delay }) {
  return (
    <div
      className="card-hover animate-fade-in-up rounded-2xl border border-brand-border bg-white flex flex-col gap-2 min-w-0 overflow-hidden"
      style={{
        boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)',
        borderTop: `4px solid ${accent}`,
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        className="p-5 flex flex-col gap-2 flex-1"
        style={{ background: `linear-gradient(135deg, ${accent}0e 0%, #ffffff 60%)` }}
      >
        {/* Label + icon row */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-brand-muted text-[10px] font-bold uppercase tracking-[0.18em] leading-snug">
            {label}
          </span>
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
            style={{ background: `${accent}1a`, border: `1px solid ${accent}30`, color: accent }}
          >
            {icon}
          </span>
        </div>

        {/* Value — always uses accent color so it pops */}
        <div className="flex items-end gap-2">
          <span
            className="text-[42px] font-bold num leading-none tracking-tight"
            style={{ color: accent }}
          >
            {value}
          </span>
          {pulse && (
            <span
              className="mb-1.5 w-2.5 h-2.5 rounded-full animate-pulse-dot flex-shrink-0"
              style={{ background: accent }}
            />
          )}
        </div>

        {sub && <p className="text-brand-muted text-[11px] leading-tight">{sub}</p>}
      </div>
    </div>
  )
}

export default function KPICards({ calls }) {
  const stats = useMemo(() => {
    if (!calls.length) return { totalCalls: 0, avgScore: 0, actionRequired: 0, frustrated: 0, needsCoaching: 0 }

    const totalCalls    = uniqueMeetingIds(calls).length
    const avgScore      = calls.length
      ? +(calls.reduce((s, c) => s + c.overallScore, 0) / calls.length).toFixed(1)
      : 0
    const actionRequired = calls.filter(
      c => c.status === 'Pending' || c.status === 'Escalated' || c.status === 'Action Required'
    ).length
    const frustrated     = calls.filter(c => c.frustratedFlag).length
    const needsCoaching  = new Set(
      calls.filter(c => c.coachingFlag).map(c => c.employee)
    ).size

    return { totalCalls, avgScore, actionRequired, frustrated, needsCoaching }
  }, [calls])

  const scoreColor = stats.avgScore >= 8 ? '#8CC63F' : stats.avgScore >= 6 ? '#EAB308' : '#EF4444'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
      <Card
        icon="📞"
        label="Total Calls"
        value={stats.totalCalls}
        sub="Unique meeting IDs"
        accent="#3B82F6"
        delay={0}
      />
      <Card
        icon="⭐"
        label="Avg Overall Score"
        value={stats.avgScore || '—'}
        sub="Out of 10, all employees"
        accent={scoreColor}
        delay={60}
      />
      <Card
        icon="⚡"
        label="Action Required"
        value={stats.actionRequired}
        sub="Pending + Escalated"
        accent={stats.actionRequired > 0 ? '#EF4444' : '#8CC63F'}
        pulse={stats.actionRequired > 0}
        delay={120}
      />
      <Card
        icon="😤"
        label="Frustrated"
        value={stats.frustrated}
        sub="Frustrated Flag = TRUE"
        accent={stats.frustrated > 0 ? '#EF4444' : '#8CC63F'}
        pulse={stats.frustrated > 0}
        delay={180}
      />
      <Card
        icon="🎓"
        label="Needs Coaching"
        value={stats.needsCoaching}
        sub="Unique employees flagged"
        accent={stats.needsCoaching > 0 ? '#EAB308' : '#8CC63F'}
        pulse={stats.needsCoaching > 0}
        delay={240}
      />
    </div>
  )
}
