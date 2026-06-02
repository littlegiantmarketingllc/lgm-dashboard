import { useState } from 'react'
import { differenceInDays, parseISO } from 'date-fns'

const G = '#8CC63F'

function timeAgo(dateStr) {
  const days = differenceInDays(new Date(), parseISO(dateStr))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

function scoreColor(s) {
  return s >= 8 ? G : s >= 6 ? '#EAB308' : '#EF4444'
}

function ChevronIcon({ open }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}
    >
      <path d="m6 9 6 6 6-6"/>
    </svg>
  )
}

function FeedRow({ call, isExpanded, onToggle }) {
  const initials     = call.employee.slice(0, 2).toUpperCase()
  const isFrustrated = call.frustrated
  const avCol        = isFrustrated ? '#EF4444' : G
  const hasSummary   = Boolean(call.summary)

  return (
    <div
      className="animate-slide-in-row border-b border-brand-border/60 last:border-0"
      style={{ animationDelay: `${100}ms` }}
    >
      {/* Main row */}
      <div
        className="flex items-start gap-3 py-3 px-3 -mx-3 rounded-lg transition-colors duration-150 cursor-default"
        onMouseEnter={e => e.currentTarget.style.background = '#F4F6F4'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold"
            style={{ background: `${avCol}14`, color: avCol, border: `1px solid ${avCol}28` }}
          >
            {initials}
          </div>
          {isFrustrated && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <p className="text-brand-text text-[12px] font-medium truncate">{call.customer}</p>
            <span
              className="num text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ color: scoreColor(call.score), background: `${scoreColor(call.score)}12` }}
            >
              {call.score.toFixed(1)}
            </span>
          </div>
          <p className="text-brand-muted text-[10px] truncate">
            {call.employee} · {call.category}
          </p>
          <p className="text-brand-muted/50 text-[10px] mt-0.5">{timeAgo(call.date)}</p>
        </div>

        {/* Expand chevron — only if there's a summary */}
        {hasSummary && (
          <button
            onClick={() => onToggle(call.id)}
            className="flex-shrink-0 text-brand-muted hover:text-brand-text transition-colors mt-0.5 p-0.5 rounded"
            title={isExpanded ? 'Hide summary' : 'Show summary'}
          >
            <ChevronIcon open={isExpanded} />
          </button>
        )}
      </div>

      {/* Expandable summary */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isExpanded ? '160px' : '0px' }}
      >
        {call.summary && (
          <p className="text-brand-muted text-[11px] italic leading-relaxed px-3 pb-3 pt-0.5">
            {call.summary}
          </p>
        )}
      </div>
    </div>
  )
}

export default function ActivityFeed({ calls }) {
  const [expanded, setExpanded] = useState(new Set())

  const toggle = (id) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white flex flex-col"
      style={{ animationDelay: '500ms', maxHeight: 'calc(100vh - 120px)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-brand-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-brand-heading font-semibold text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot inline-block" style={{ background: G }} />
              Recent Activity
            </h2>
            <p className="text-brand-muted text-[11px] mt-0.5">Last {calls.length} calls · tap ❯ for summary</p>
          </div>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase border"
            style={{ color: G, background: `${G}10`, borderColor: `${G}25` }}
          >
            Live
          </span>
        </div>
      </div>

      {/* Feed */}
      <div className="overflow-y-auto flex-1 px-5 py-2">
        {calls.map(call => (
          <FeedRow
            key={call.id}
            call={call}
            isExpanded={expanded.has(call.id)}
            onToggle={toggle}
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
