import { useState } from 'react'
import { G, scoreColor, timeAgo } from '../lib/ehUtils'

function ChevronIcon({ open }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}>
      <path d="m6 9 6 6 6-6"/>
    </svg>
  )
}

function FeedRow({ call, isExpanded, onToggle, onEmployeeClick, onCallClick }) {
  const initials     = call.employee.slice(0, 2).toUpperCase()
  const isFrustrated = call.frustratedFlag
  const avCol        = isFrustrated ? '#EF4444' : G
  const hasSummary   = Boolean(call.summary)
  const sc           = scoreColor(call.overallScore)

  return (
    <div className="animate-slide-in-row border-b border-brand-border/60 last:border-0">
      {/* Main row */}
      <div
        className="flex items-start gap-3 py-3 px-3 -mx-3 rounded-lg transition-colors duration-150 cursor-pointer"
        onClick={() => onCallClick?.(call.meetingId)}
        onMouseEnter={e => e.currentTarget.style.background = '#F4F6F4'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {/* Avatar — clicking opens employee view */}
        <div className="relative flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onEmployeeClick?.(call.employee) }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold hover:opacity-80 transition-opacity"
            style={{ background: `${avCol}14`, color: avCol, border: `1px solid ${avCol}28` }}
            title={`View ${call.employee}'s profile`}
          >
            {initials}
          </button>
          {isFrustrated && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white pointer-events-none" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-brand-text text-[12px] font-medium truncate">{call.customer}</span>
            <span className="num text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ color: sc, background: `${sc}12` }}>
              {call.overallScore > 0 ? call.overallScore.toFixed(1) : '—'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-brand-muted text-[10px] truncate">
            <button onClick={e => { e.stopPropagation(); onEmployeeClick?.(call.employee) }}
              className="hover:text-brand-green transition-colors duration-150 truncate"
              title={`View ${call.employee}'s profile`}>
              {call.employee}
            </button>
            <span className="flex-shrink-0">·</span>
            <span className="truncate">{call.category}</span>
            {call.callType === 'Phone Call'
              ? <span className="flex-shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded border bg-sky-50 text-sky-700 border-sky-200">Phone</span>
              : <span className="flex-shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded border bg-violet-50 text-violet-700 border-violet-200">Meeting</span>
            }
          </div>
          {call.finalVerdict && (
            <p className="text-[10px] text-brand-muted/70 mt-0.5 truncate">{call.finalVerdict}</p>
          )}
          <p className="text-brand-muted/50 text-[10px] mt-0.5">{timeAgo(call.date)}</p>
        </div>

        {/* Expand chevron */}
        {hasSummary && (
          <button
            onClick={e => { e.stopPropagation(); onToggle(call._rowIdx) }}
            className="flex-shrink-0 text-brand-muted hover:text-brand-text transition-colors mt-0.5 p-0.5 rounded"
            title={isExpanded ? 'Hide summary' : 'Show summary'}
          >
            <ChevronIcon open={isExpanded} />
          </button>
        )}
      </div>

      {/* Expandable summary */}
      <div className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isExpanded ? '160px' : '0px' }}>
        {call.summary && (
          <p className="text-brand-muted text-[11px] italic leading-relaxed px-3 pb-3 pt-0.5">
            {call.summary}
          </p>
        )}
      </div>
    </div>
  )
}

export default function ActivityFeed({ calls, onEmployeeClick, onCallClick }) {
  const [expanded, setExpanded] = useState(new Set())

  const toggle = (id) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white flex flex-col"
      style={{
        animationDelay: '500ms',
        maxHeight: 'calc(100vh - 120px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)',
        borderTop: `3px solid ${G}`,
      }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-brand-border flex-shrink-0"
        style={{ background: 'linear-gradient(to right, rgba(140,198,63,0.06), transparent)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-brand-heading font-semibold text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot inline-block" style={{ background: G }} />
              Recent Activity
            </h2>
            <p className="text-brand-muted text-[11px] mt-0.5">Last {calls.length} calls · click row to view</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase border"
            style={{ color: G, background: `${G}10`, borderColor: `${G}25` }}>
            Live
          </span>
        </div>
      </div>

      {/* Feed */}
      <div className="overflow-y-auto flex-1 px-5 py-2">
        {calls.length === 0 && (
          <p className="text-brand-muted text-sm text-center py-8">No calls yet</p>
        )}
        {calls.map(call => (
          <FeedRow
            key={call._rowIdx}
            call={call}
            isExpanded={expanded.has(call._rowIdx)}
            onToggle={toggle}
            onEmployeeClick={onEmployeeClick}
            onCallClick={onCallClick}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-brand-border/60 flex-shrink-0">
        <p className="text-brand-muted text-[10px] text-center">
          Showing most recent {calls.length} calls
        </p>
      </div>
    </div>
  )
}
