import { differenceInDays, parseISO } from 'date-fns'

const TODAY = new Date('2026-06-02')
const G     = '#8CC63F'

function timeAgo(dateStr) {
  const days = differenceInDays(TODAY, parseISO(dateStr))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

function scoreColor(s) {
  return s >= 8 ? G : s >= 6 ? '#EAB308' : '#EF4444'
}

function FeedRow({ call, i }) {
  const initials     = call.employee.slice(0, 2).toUpperCase()
  const isFrustrated = call.frustrated
  const avCol        = isFrustrated ? '#EF4444' : G

  return (
    <div
      className="animate-slide-in-row flex items-start gap-3 py-3 border-b border-brand-border/60 last:border-0 rounded-lg px-3 -mx-3 transition-colors duration-150 cursor-default"
      style={{ animationDelay: `${600 + i * 45}ms` }}
      onMouseEnter={e => e.currentTarget.style.background = '#F4F6F4'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold"
          style={{
            background: `${avCol}14`,
            color:       avCol,
            border:      `1px solid ${avCol}28`,
          }}
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
          {call.employee} &middot; {call.category}
        </p>
        <p className="text-brand-muted/50 text-[10px] mt-0.5">{timeAgo(call.date)}</p>
      </div>
    </div>
  )
}

export default function ActivityFeed({ calls }) {
  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white flex flex-col"
      style={{
        animationDelay: '500ms',
        maxHeight: 'calc(100vh - 120px)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-brand-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-brand-heading font-semibold text-sm flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse-dot inline-block"
                style={{ background: G }}
              />
              Recent Activity
            </h2>
            <p className="text-brand-muted text-[11px] mt-0.5">Last {calls.length} calls</p>
          </div>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase border"
            style={{ color: G, background: `${G}10`, borderColor: `${G}25` }}
          >
            Live
          </span>
        </div>
      </div>

      {/* Feed list */}
      <div className="overflow-y-auto flex-1 px-5 py-2">
        {calls.map((call, i) => (
          <FeedRow key={call.id} call={call} i={i} />
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
