import { useMemo } from 'react'
import { buildBehaviorInsights, G } from '../lib/ehUtils'

const RED = '#EF4444'

function TagBar({ tag, count, maxCount, isNeg }) {
  const pct = Math.round((count / maxCount) * 100)
  const color = isNeg ? RED : G
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-brand-heading capitalize w-28 flex-shrink-0 truncate" title={tag}>{tag}</span>
      <div className="flex-1 bg-brand-bg rounded-full h-1.5 overflow-hidden">
        <div className="h-full rounded-full score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] text-brand-muted num w-4 text-right flex-shrink-0">{count}</span>
    </div>
  )
}

export default function BehaviorInsights({ calls }) {
  const insights = useMemo(() => buildBehaviorInsights(calls).slice(0, 20), [calls])
  const positive = insights.filter(t => !t.negative)
  const negative = insights.filter(t =>  t.negative)
  const maxCount = insights[0]?.count || 1

  if (!insights.length) return (
    <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white p-5"
      style={{ animationDelay: '580ms', boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}>
      <h3 className="font-semibold text-brand-heading text-sm mb-1">Team Behavior Insights</h3>
      <p className="text-brand-muted text-sm text-center py-8">No behavior tags in this period</p>
    </div>
  )

  return (
    <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white p-5"
      style={{ animationDelay: '580ms', boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}>
      <h3 className="font-semibold text-brand-heading text-sm mb-1">Team Behavior Insights</h3>
      <p className="text-brand-muted text-[11px] mb-4">Most frequent behavior tags across all calls</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {positive.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-green-600 mb-2.5">Positive Behaviors</p>
            <div className="space-y-2">
              {positive.slice(0, 8).map(t => (
                <TagBar key={t.tag} tag={t.tag} count={t.count} maxCount={maxCount} isNeg={false} />
              ))}
            </div>
          </div>
        )}
        {negative.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 mb-2.5">Areas of Concern</p>
            <div className="space-y-2">
              {negative.slice(0, 8).map(t => (
                <TagBar key={t.tag} tag={t.tag} count={t.count} maxCount={maxCount} isNeg={true} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
