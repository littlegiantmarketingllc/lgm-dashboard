import { format, parseISO } from 'date-fns'
import { G, STATUS_STYLE } from '../lib/ehUtils'

const RED = '#EF4444'
const AMB = '#EAB308'

function fmtDate(str) {
  if (!str) return null
  try { return format(parseISO(str), 'MMM d, yyyy') } catch { return str }
}

function StatusPill({ status }) {
  const cls = STATUS_STYLE[status] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>
      {status}
    </span>
  )
}

function OverdueBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
      Overdue
    </span>
  )
}

export default function ActionRequired({ calls, onCallClick, onEmployeeClick }) {
  if (!calls.length) {
    return (
      <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white"
        style={{ animationDelay: '400ms', boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)', borderTop: `3px solid ${G}` }}>
        <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between"
          style={{ background: 'linear-gradient(to right, rgba(140,198,63,0.05), transparent)' }}>
          <div>
            <h2 className="text-brand-heading font-semibold text-sm flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.2" strokeLinecap="round" className="w-4 h-4">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Action Required
            </h2>
            <p className="text-brand-muted text-[11px] mt-0.5">All open items resolved this period</p>
          </div>
        </div>
        <div className="py-10 text-center">
          <div className="flex flex-col items-center gap-3">
            <svg viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.5" strokeLinecap="round" className="w-10 h-10">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p className="text-brand-muted text-sm">No open action items this period</p>
          </div>
        </div>
      </div>
    )
  }

  const overdue = calls.filter(c => c.overdue).length

  return (
    <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white"
      style={{ animationDelay: '400ms', boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)', borderTop: `3px solid ${RED}` }}>

      {/* Header */}
      <div className="px-5 sm:px-6 py-4 border-b border-brand-border flex items-start sm:items-center justify-between flex-wrap gap-3"
        style={{ background: 'linear-gradient(to right, rgba(239,68,68,0.05), transparent)' }}>
        <div>
          <h2 className="text-brand-heading font-semibold text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse-dot inline-block" />
            Action Required
          </h2>
          <p className="text-brand-muted text-[11px] mt-0.5">
            {calls.length} open item{calls.length !== 1 ? 's' : ''}
            {overdue > 0 && <span className="text-red-600 font-semibold"> · {overdue} overdue</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {overdue > 0 && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
              ⚠ {overdue} overdue
            </span>
          )}
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border"
            style={{ color: RED, background: `${RED}10`, borderColor: `${RED}28` }}>
            {calls.length} pending
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border bg-brand-bg/50">
              <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted">Customer</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted hidden sm:table-cell">Employee</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted hidden md:table-cell">Action Items</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted hidden lg:table-cell">Owner</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted">Deadline</th>
              <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted">Status</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call, i) => (
              <tr key={call.meetingId || call._rowIdx}
                className="border-b border-brand-border/60 cursor-pointer transition-colors duration-150"
                style={{
                  background: call.overdue ? '#fff5f5' : i % 2 === 0 ? '#fff' : '#f9faf9',
                  borderLeft: call.overdue ? `3px solid ${RED}` : `3px solid ${AMB}`,
                }}
                onClick={() => onCallClick?.(call.meetingId)}
                onMouseEnter={e => e.currentTarget.style.background = '#f0f7e8'}
                onMouseLeave={e => e.currentTarget.style.background = call.overdue ? '#fff5f5' : i % 2 === 0 ? '#fff' : '#f9faf9'}
              >
                {/* Customer */}
                <td className="pl-4 sm:pl-6 pr-3 py-3">
                  <div className="flex items-start gap-1.5 flex-wrap">
                    <span className="text-brand-text font-medium text-[12px] sm:text-[13px]">{call.customer || '—'}</span>
                    {call.overdue && <OverdueBadge />}
                  </div>
                  <p className="text-brand-muted text-[10px] mt-0.5 sm:hidden">{call.employee}</p>
                </td>

                {/* Employee */}
                <td className="px-4 py-3 hidden sm:table-cell">
                  <button onClick={e => { e.stopPropagation(); onEmployeeClick?.(call.employee) }}
                    className="text-brand-text text-[12px] hover:text-brand-green transition-colors">
                    {call.employee || '—'}
                  </button>
                </td>

                {/* Action Items */}
                <td className="px-4 py-3 hidden md:table-cell max-w-[220px]">
                  <p className="text-brand-muted text-[11px] leading-relaxed line-clamp-2">
                    {call.actionItems || '—'}
                  </p>
                </td>

                {/* Owner */}
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-brand-text text-[12px]">{call.followupOwner || '—'}</span>
                </td>

                {/* Deadline */}
                <td className="px-4 py-3">
                  {call.promisedDeadline ? (
                    <span className={`text-[11px] font-semibold ${call.overdue ? 'text-red-600' : 'text-brand-muted'}`}>
                      {fmtDate(call.promisedDeadline)}
                    </span>
                  ) : (
                    <span className="text-brand-muted text-[11px]">No deadline</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-4 sm:px-6 py-3">
                  <StatusPill status={call.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
