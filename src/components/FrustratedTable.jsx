import { useState } from 'react'
import { format, parseISO } from 'date-fns'

const G = '#8CC63F'

function scoreColor(s) {
  return s >= 8 ? G : s >= 6 ? '#EAB308' : '#EF4444'
}

function ScorePill({ score }) {
  const c = scoreColor(score)
  return (
    <span
      className="num inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border"
      style={{ color: c, background: `${c}12`, borderColor: `${c}28` }}
    >
      {score.toFixed(1)} / 10
    </span>
  )
}

export default function FrustratedTable({ calls }) {
  const [reviewed, setReviewed] = useState(new Set())

  const toggle = (id) => setReviewed(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const pending   = calls.filter(c => !reviewed.has(c.id))
  const doneCount = reviewed.size

  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-brand-border bg-white"
      style={{
        animationDelay: '520ms',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-brand-heading font-semibold text-sm flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full bg-brand-red animate-pulse-dot inline-block"
              style={{ boxShadow: '0 0 5px rgba(239,68,68,0.5)' }}
            />
            Frustrated Calls — Action Required
          </h2>
          <p className="text-brand-muted text-[11px] mt-0.5">
            {calls.length === 0
              ? 'No frustrated calls in this period'
              : `${pending.length} pending · ${doneCount} reviewed`}
          </p>
        </div>

        {calls.length > 0 && (
          <div className="flex items-center gap-2">
            {doneCount > 0 && (
              <span
                className="text-[11px] font-bold px-2.5 py-1 rounded-full border"
                style={{ color: G, background: `${G}10`, borderColor: `${G}25` }}
              >
                ✓ {doneCount} reviewed
              </span>
            )}
            {pending.length > 0 && (
              <span className="text-red-500 text-[11px] font-bold bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                ⚠ {pending.length} pending
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border bg-brand-bg/50">
              {['Customer', 'Date', 'Employee', 'Category', 'Score', 'Status', ''].map((h, i) => (
                <th key={i} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-brand-muted first:pl-6">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calls.length === 0 && (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-4xl">✅</span>
                    <p className="text-brand-muted text-sm">All clear — no frustrated clients this period</p>
                  </div>
                </td>
              </tr>
            )}
            {calls.map((call, i) => {
              const done = reviewed.has(call.id)
              return (
                <tr
                  key={call.id}
                  className={`animate-slide-in-row border-b border-brand-border/60 frustrated-row ${done ? 'reviewed' : ''}`}
                  style={{ animationDelay: `${560 + i * 50}ms` }}
                >
                  {/* Customer */}
                  <td className="pl-6 pr-4 py-4">
                    <span className="text-brand-text font-medium text-[13px]">{call.customer}</span>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-4 text-brand-muted text-[12px]">
                    {format(parseISO(call.date), 'MMM d, yyyy')}
                  </td>

                  {/* Employee */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                        style={{ background: `${G}15`, color: G, border: `1px solid ${G}28` }}
                      >
                        {call.employee.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-brand-text text-[12px]">{call.employee}</span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-4">
                    <span className="text-brand-muted text-[11px] bg-brand-bg border border-brand-border px-2 py-0.5 rounded">
                      {call.category}
                    </span>
                  </td>

                  {/* Score */}
                  <td className="px-4 py-4">
                    <ScorePill score={call.score} />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4">
                    {done ? (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border"
                        style={{ color: G, background: `${G}10`, borderColor: `${G}25` }}
                      >
                        ✓ Reviewed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-500 text-[11px] font-semibold bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        Needs Follow-up
                      </span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="px-5 py-4 pr-6 text-right">
                    <button
                      onClick={() => toggle(call.id)}
                      className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200"
                      style={done
                        ? { color: '#6B7280', borderColor: '#E5E7E5', background: 'transparent' }
                        : {
                            color: '#FFFFFF',
                            background: G,
                            borderColor: G,
                            boxShadow: `0 1px 4px ${G}40`,
                          }
                      }
                    >
                      {done ? 'Undo' : 'Mark as Reviewed'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
