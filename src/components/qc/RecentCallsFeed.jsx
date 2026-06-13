import { useMemo } from 'react'
import { VERDICT_BG, SENTIMENT_BG, scoreBg } from '../../lib/qcUtils'

function timeStr(time) {
  if (!time) return ''
  return time
}

export default function RecentCallsFeed({ calls, onCallClick, onCustomerClick }) {
  const recent = useMemo(() =>
    [...calls]
      .sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date)
        return (b.time || '').localeCompare(a.time || '')
      })
      .slice(0, 15),
    [calls]
  )

  return (
    <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white overflow-hidden"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}>
      <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between">
        <h3 className="font-bold text-brand-heading text-sm">Recent Calls</h3>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
          <span className="text-brand-muted text-[11px]">Live</span>
        </div>
      </div>

      {!recent.length ? (
        <div className="p-8 text-center text-brand-muted text-sm">No calls in this period</div>
      ) : (
        <div className="divide-y divide-brand-border/40 max-h-[480px] overflow-y-auto">
          {recent.map(call => (
            <div
              key={`${call.meetingId}-${call.employee}`}
              className="px-5 py-3 hover:bg-brand-bg/60 cursor-pointer transition-colors group"
              onClick={() => onCallClick(call.meetingId)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <button
                      className="text-[12px] font-semibold text-brand-heading hover:text-brand-green truncate transition-colors"
                      onClick={e => { e.stopPropagation(); onCustomerClick?.(call.customer) }}
                    >
                      {call.customer}
                    </button>
                    {call.category && (
                      <span className="text-[10px] text-brand-muted bg-brand-bg px-1.5 py-0.5 rounded flex-shrink-0">
                        {call.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-brand-muted">{call.employee}</span>
                    <span className="text-brand-border">·</span>
                    <span className="text-[11px] text-brand-muted">{call.date} {timeStr(call.time)}</span>
                    {call.duration > 0 && (
                      <>
                        <span className="text-brand-border">·</span>
                        <span className="text-[11px] text-brand-muted">{call.duration}min</span>
                      </>
                    )}
                  </div>
                  {call.summary && (
                    <p className="text-[11px] text-brand-muted mt-1 line-clamp-1 leading-snug">
                      {call.summary}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-[11px] font-bold num px-1.5 py-0.5 rounded ${scoreBg(call.overallScore)}`}>
                    {call.overallScore || '—'}
                  </span>
                  {call.finalVerdict && (
                    <span className={`text-[9px] font-semibold px-1 py-0.5 rounded whitespace-nowrap ${VERDICT_BG[call.finalVerdict] || 'bg-gray-100 text-gray-600'}`}>
                      {call.finalVerdict === 'Immediate Attention' ? 'Immediate!' : call.finalVerdict}
                    </span>
                  )}
                  {call.frustratedFlag && (
                    <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-red-100 text-red-700">😤 Frustrated</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
