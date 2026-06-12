import { useMemo } from 'react'
import { buildBehaviorInsights } from '../../lib/qcUtils'

export default function BehaviorInsightsChart({ calls }) {
  const insights = useMemo(() => buildBehaviorInsights(calls).slice(0, 20), [calls])
  const positive = insights.filter(t => !t.negative)
  const negative = insights.filter(t =>  t.negative)
  const maxCount = insights[0]?.count || 1

  function TagBar({ tag, count, isNeg }) {
    const pct = Math.round((count / maxCount) * 100)
    return (
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-brand-heading capitalize w-28 flex-shrink-0 truncate">{tag}</span>
        <div className="flex-1 bg-brand-bg rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: isNeg ? '#EF4444' : '#8CC63F' }}
          />
        </div>
        <span className="text-[10px] text-brand-muted num w-5 text-right">{count}</span>
      </div>
    )
  }

  if (!insights.length) {
    return (
      <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white p-5"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h3 className="font-bold text-brand-heading text-sm mb-3">Behavior Insights</h3>
        <p className="text-brand-muted text-sm text-center py-6">No behavior tags in this period</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white p-5"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <h3 className="font-bold text-brand-heading text-sm mb-4">Behavior Insights</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {positive.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-green-600 mb-2">Positive Behaviors</p>
            <div className="space-y-2">
              {positive.slice(0, 8).map(t => (
                <TagBar key={t.tag} tag={t.tag} count={t.count} isNeg={false} />
              ))}
            </div>
          </div>
        )}
        {negative.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 mb-2">Areas of Concern</p>
            <div className="space-y-2">
              {negative.slice(0, 8).map(t => (
                <TagBar key={t.tag} tag={t.tag} count={t.count} isNeg={true} />
              ))}
            </div>
          </div>
        )}
        {!negative.length && positive.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-green-600 mb-2">All behaviors appear positive</p>
          </div>
        )}
      </div>
    </div>
  )
}
