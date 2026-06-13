import { useMemo } from 'react'
import { uniqueMeetingIds } from '../../lib/qcUtils'

function Card({ icon, label, value, sub, accent, pulse }) {
  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white p-5 flex flex-col gap-2 min-w-0"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-brand-muted text-[11px] font-semibold uppercase tracking-wider truncate">
          {label}
        </span>
        <span
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
          style={{ background: `${accent}15`, color: accent }}
        >
          {icon}
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span
          className="text-3xl font-bold num leading-none"
          style={{ color: accent === '#8CC63F' ? '#4A4A4A' : accent }}
        >
          {value}
        </span>
        {pulse && (
          <span className="mb-1 w-2 h-2 rounded-full animate-pulse-dot" style={{ background: accent }} />
        )}
      </div>
      {sub && <p className="text-brand-muted text-[11px] leading-tight">{sub}</p>}
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
        accent="#8CC63F"
      />
      <Card
        icon="⭐"
        label="Avg Overall Score"
        value={stats.avgScore || '—'}
        sub="Out of 10, all employees"
        accent={scoreColor}
      />
      <Card
        icon="⚡"
        label="Action Required"
        value={stats.actionRequired}
        sub="Pending + Escalated + Action Required"
        accent={stats.actionRequired > 0 ? '#EF4444' : '#8CC63F'}
        pulse={stats.actionRequired > 0}
      />
      <Card
        icon="😤"
        label="Frustrated Customers"
        value={stats.frustrated}
        sub="Frustrated Flag = TRUE"
        accent={stats.frustrated > 0 ? '#EF4444' : '#8CC63F'}
        pulse={stats.frustrated > 0}
      />
      <Card
        icon="🎓"
        label="Needs Coaching"
        value={stats.needsCoaching}
        sub="Unique employees with Coaching Flag"
        accent={stats.needsCoaching > 0 ? '#EAB308' : '#8CC63F'}
        pulse={stats.needsCoaching > 0}
      />
    </div>
  )
}
