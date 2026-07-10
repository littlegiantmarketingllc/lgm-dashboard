import { useState, useMemo, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import {
  scoreColor, G, filterCalls, fmtMins,
  getFrustratedCalls, getActionRequired, buildBehaviorInsights,
} from '../../lib/ehUtils'
import { useActionStatus } from '../../hooks/useActionStatus'
import EmployeeAvatar from '../EmployeeAvatar'

const RED  = '#EF4444'
const GOLD = '#F59E0B'

const RANGE_OPTIONS = [
  { label: 'Today',     value: 'today'     },
  { label: 'Yesterday', value: 'yesterday' },
  { label: '2d',    value: '2'     },
  { label: '7d',    value: '7'     },
  { label: '14d',   value: '14'    },
  { label: '30d',   value: '30'    },
  { label: 'All',   value: 'all'   },
]

function ScoreRing({ value, size = 72 }) {
  const r    = (size / 2) - 6
  const circ = 2 * Math.PI * r
  const pct  = Math.min(Math.max((value || 0) / 10, 0), 1)
  const c    = scoreColor(value || 0)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E7E5" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="5"
        strokeLinecap="round" strokeDasharray={`${pct * circ} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px`,
          fontFamily: '"DM Sans", sans-serif', fontSize: '13px', fontWeight: 700, fill: c }}>
        {value ? value.toFixed(1) : '—'}
      </text>
    </svg>
  )
}

function SubBar({ label, value }) {
  if (!value) return null
  const c = scoreColor(value)
  return (
    <div className="flex items-center gap-2">
      <span className="text-brand-muted text-[10px] w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-brand-border rounded-full overflow-hidden">
        <div className="h-full rounded-full score-bar-fill" style={{ width: `${(value/10)*100}%`, background: c }} />
      </div>
      <span className="num text-[10px] font-bold flex-shrink-0" style={{ color: c }}>{value.toFixed(1)}</span>
    </div>
  )
}

function ProgressBar({ done, total, color = G }) {
  if (!total) return null
  const pct = Math.round((done / total) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-brand-border rounded-full overflow-hidden">
        <div className="h-full rounded-full score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] font-bold text-brand-muted num">{done}/{total}</span>
    </div>
  )
}

function Checkbox({ checked, onClick }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      className="w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 focus:outline-none"
      style={{ borderColor: checked ? G : '#D1D5DB', background: checked ? G : 'white' }}
    >
      {checked && (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )}
    </button>
  )
}

function Tag({ text, color, bg, border }) {
  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border"
      style={{ color, background: bg, borderColor: border }}>
      {text}
    </span>
  )
}

function SectionHead({ title, badge }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">{title}</p>
      {badge}
    </div>
  )
}

function fmtDate(str) {
  if (!str) return '—'
  try { return format(parseISO(str), 'MMM d') } catch { return str }
}

function avg(arr) {
  const valid = arr.filter(v => (v || 0) > 0)
  return valid.length ? +(valid.reduce((s, v) => s + v, 0) / valid.length).toFixed(1) : 0
}

export default function EmployeeDetailModal({
  employeeName, allCalls, onClose, onBack, onCallClick, onCoachingClick,
  statuses: callStatuses, setStatus: setCallStatus,
  coachingStatuses, onToggleRec,
}) {
  const [dateFilter, setDateFilter] = useState({ type: 'all', from: '', to: '' })
  const { toggleAction, isDone } = useActionStatus()

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  const empCalls = useMemo(() =>
    allCalls.filter(c => c.employee === employeeName),
    [allCalls, employeeName]
  )

  const filteredCalls = useMemo(() =>
    filterCalls(empCalls, dateFilter),
    [empCalls, dateFilter]
  )

  const stats = useMemo(() => {
    if (!filteredCalls.length) return null
    return {
      calls:      filteredCalls.length,
      avgScore:   avg(filteredCalls.map(c => c.overallScore)),
      avgComm:    avg(filteredCalls.map(c => c.commScore))  || null,
      avgProf:    avg(filteredCalls.map(c => c.profScore))  || null,
      avgProd:    avg(filteredCalls.map(c => c.prodScore))  || null,
      avgCX:      avg(filteredCalls.map(c => c.cxScore))    || null,
      totalMins:  Math.round(filteredCalls.reduce((s, c) => s + (c.duration || 0), 0)),
      frustrated: filteredCalls.filter(c => c.frustratedFlag).length,
      coaching:   filteredCalls.filter(c => c.coachingFlag).length,
    }
  }, [filteredCalls])

  const coachingRecs = useMemo(() => {
    const seen = new Set()
    const recs = []
    for (const c of filteredCalls)
      for (const r of (c.coachingRecs || []))
        if (r && !seen.has(r)) { seen.add(r); recs.push(r) }
    return recs
  }, [filteredCalls])

  const behaviorInsights = useMemo(() => buildBehaviorInsights(filteredCalls), [filteredCalls])
  const posTags = behaviorInsights.filter(t => !t.negative).slice(0, 6)
  const negTags = behaviorInsights.filter(t =>  t.negative).slice(0, 6)

  const frustratedCalls = useMemo(() => getFrustratedCalls(filteredCalls), [filteredCalls])
  const actionItems     = useMemo(() => getActionRequired(filteredCalls),   [filteredCalls])

  const sortedCalls = useMemo(() =>
    [...filteredCalls].sort((a, b) =>
      (b.date || '').localeCompare(a.date || '') || (b.time || '').localeCompare(a.time || '')
    ), [filteredCalls]
  )

  // Action items progress
  const actionDone  = actionItems.filter(c => isDone(c.meetingId || `__row_${c._rowIdx}`)).length
  const actionTotal = actionItems.length

  // Frustrated calls progress (using the shared callStatuses prop)
  const getCallStatus = (c) => callStatuses?.[String(c.meetingId || c._rowIdx)]?.status ?? 'action_required'
  const frustDone  = frustratedCalls.filter(c => getCallStatus(c) === 'resolved').length
  const frustTotal = frustratedCalls.length

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="animate-backdrop-in absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="animate-modal-enter relative bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)', borderTop: `3px solid ${G}` }}
      >
        {/* ── Header ── */}
        <div className="px-6 py-5 border-b border-brand-border flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(140,198,63,0.07) 0%, white 60%)' }}>

          {/* Back button */}
          {onBack && (
            <button onClick={onBack}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-muted hover:text-brand-heading transition-colors mb-3 -mt-1 group">
              <svg className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>
              Back
            </button>
          )}

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {/* Photo-ready avatar */}
              <EmployeeAvatar name={employeeName} size={56} variant="solid" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-0.5">Employee Profile</p>
                <h2 className="text-lg font-bold text-brand-heading truncate">
                  {employeeName}
                  {employeeName === 'John Graham' && (
                    <span className="text-brand-muted font-normal text-[12px] ml-2">(Founder)</span>
                  )}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-brand-muted">
                  <span>{empCalls.length} total calls</span>
                  {stats?.frustrated > 0 && <><span>·</span><span className="text-red-500">{stats.frustrated} frustrated</span></>}
                  {stats?.coaching   > 0 && (
                    <><span>·</span>
                    <button
                      onClick={() => onCoachingClick?.(employeeName)}
                      className="text-yellow-600 hover:text-yellow-700 underline decoration-dotted underline-offset-2 transition-colors"
                    >
                      {stats.coaching} coaching flag{stats.coaching !== 1 ? 's' : ''}
                    </button></>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-white hover:bg-red-50 hover:text-red-500 text-brand-muted flex items-center justify-center transition-colors border border-brand-border">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Date range pills */}
          <div className="flex items-center gap-0.5 mt-4 bg-brand-bg border border-brand-border rounded-lg p-0.5 w-fit">
            {RANGE_OPTIONS.map(opt => {
              const active = dateFilter.type === opt.value
              return (
                <button key={opt.value} onClick={() => setDateFilter(p => ({ ...p, type: opt.value }))}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 whitespace-nowrap"
                  style={active ? { background: G, color: 'white' } : { color: '#6B7280' }}>
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto divide-y divide-brand-border/60">

          {/* Score overview */}
          {stats ? (
            <div className="px-6 py-5 bg-brand-bg/30">
              <SectionHead title="Performance Overview" />
              <div className="flex flex-wrap items-start gap-5">
                <div className="flex flex-col items-center gap-1.5">
                  <ScoreRing value={stats.avgScore} size={72} />
                  <span className="text-[10px] text-brand-muted">Overall</span>
                </div>
                <div className="flex-1 min-w-[180px] space-y-1.5">
                  <SubBar label="Communication"   value={stats.avgComm} />
                  <SubBar label="Professionalism" value={stats.avgProf} />
                  <SubBar label="Product Know."   value={stats.avgProd} />
                  <SubBar label="Cx Experience"   value={stats.avgCX}   />
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <div className="rounded-xl border border-brand-border bg-white px-4 py-2.5 text-center min-w-[80px]">
                    <p className="num text-2xl font-bold text-brand-heading">{stats.calls}</p>
                    <p className="text-[10px] text-brand-muted">Calls</p>
                  </div>
                  <div className="rounded-xl border border-brand-border bg-white px-4 py-2.5 text-center">
                    <p className="num text-lg font-bold text-brand-heading">{fmtMins(stats.totalMins)}</p>
                    <p className="text-[10px] text-brand-muted">Talk Time</p>
                  </div>
                  {stats.frustrated > 0 && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-center">
                      <p className="num text-2xl font-bold text-red-500">{stats.frustrated}</p>
                      <p className="text-[10px] text-red-400">Priority</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-brand-muted text-sm bg-brand-bg/30">
              No calls in this date range
            </div>
          )}

          {/* ── Action Required Checklist ── */}
          {actionTotal > 0 && (
            <div className="px-6 py-5">
              <SectionHead
                title={`My Action Items`}
                badge={
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    style={actionDone === actionTotal
                      ? { color: G,   background: `${G}12`,     borderColor: `${G}28` }
                      : { color: RED, background: `${RED}12`, borderColor: `${RED}28` }}>
                    {actionDone}/{actionTotal} done
                  </span>
                }
              />
              <ProgressBar done={actionDone} total={actionTotal} color={actionDone === actionTotal ? G : RED} />
              <div className="mt-3 space-y-2">
                {actionItems.map(item => {
                  const key    = item.meetingId || `__row_${item._rowIdx}`
                  const done   = isDone(key)
                  return (
                    <div key={key}
                      className="rounded-xl border p-3 transition-all duration-200"
                      style={{
                        borderColor: done ? '#BBF7D0' : item.overdue ? '#FECACA' : '#E5E7E5',
                        background:  done ? '#F0FDF4' : item.overdue ? '#FEF2F2' : '#F9FAF9',
                        opacity: done ? 0.75 : 1,
                      }}>
                      <div className="flex items-start gap-3">
                        <Checkbox checked={done} onClick={() => toggleAction(key)} />
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onCallClick?.(item.meetingId)}>
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <p className={`text-[12px] font-semibold truncate ${done ? 'line-through text-brand-muted' : 'text-brand-heading'}`}>
                              {item.customer || '—'}
                              {item.overdue && !done && (
                                <span className="ml-2 text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full not-italic">Overdue</span>
                              )}
                            </p>
                            <span className="text-[10px] text-brand-muted flex-shrink-0">
                              {item.promisedDeadline ? `Due ${fmtDate(item.promisedDeadline)}` : 'No deadline'}
                            </span>
                          </div>
                          {item.actionItems && (
                            <p className={`text-[11px] mt-0.5 leading-relaxed ${done ? 'line-through text-brand-muted/60' : 'text-brand-muted'}`}>
                              {item.actionItems}
                            </p>
                          )}
                          {item.followupOwner && (
                            <p className="text-[10px] text-brand-muted mt-1">Owner: {item.followupOwner}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {actionDone === actionTotal && actionTotal > 0 && (
                <p className="text-[11px] font-semibold text-center mt-3" style={{ color: G }}>
                  ✓ All action items completed!
                </p>
              )}
            </div>
          )}

          {/* ── Frustrated Calls (with resolution tracking) ── */}
          {frustTotal > 0 && (
            <div className="px-6 py-5">
              <SectionHead
                title={`Priority Calls`}
                badge={
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    style={frustDone === frustTotal
                      ? { color: G,   background: `${G}12`,     borderColor: `${G}28` }
                      : { color: RED, background: `${RED}12`, borderColor: `${RED}28` }}>
                    {frustDone}/{frustTotal} handled
                  </span>
                }
              />
              <ProgressBar done={frustDone} total={frustTotal} color={frustDone === frustTotal ? G : RED} />
              <div className="mt-3 space-y-1.5">
                {frustratedCalls.map(c => {
                  const key       = String(c.meetingId || c._rowIdx)
                  const callStatus = callStatuses?.[key]?.status ?? 'action_required'
                  const resolved   = callStatus === 'resolved'
                  const inProgress = callStatus === 'in_progress'
                  return (
                    <div key={c._rowIdx}
                      className="flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-200"
                      style={{
                        borderColor: resolved ? '#BBF7D0' : '#FECACA',
                        background:  resolved ? '#F0FDF4' : '#FEF2F2',
                        opacity: resolved ? 0.75 : 1,
                      }}>
                      {/* Resolution checkbox */}
                      <Checkbox
                        checked={resolved}
                        onClick={() => setCallStatus?.(key, resolved ? null : 'resolved')}
                      />
                      {/* Call info */}
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onCallClick?.(c.meetingId)}>
                        <p className={`text-[12px] font-semibold truncate ${resolved ? 'line-through text-brand-muted' : 'text-brand-heading'}`}>
                          {c.customer || '—'}
                        </p>
                        <p className="text-[10px] text-brand-muted">
                          {fmtDate(c.date)}{c.finalVerdict && ` · ${c.finalVerdict}`}
                        </p>
                      </div>
                      {/* Status badge */}
                      <div className="flex-shrink-0">
                        {resolved ? (
                          <span className="text-[10px] font-bold text-green-600">✓ Resolved</span>
                        ) : inProgress ? (
                          <button onClick={() => setCallStatus?.(key, 'resolved')}
                            className="text-[10px] font-semibold px-2 py-1 rounded-lg border text-amber-700 bg-amber-50 border-amber-200 whitespace-nowrap">
                            ✓ Mark done
                          </button>
                        ) : (
                          <button onClick={e => { e.stopPropagation(); setCallStatus?.(key, 'in_progress') }}
                            className="text-[10px] font-semibold px-2 py-1 rounded-lg border text-red-600 bg-red-50 border-red-200 whitespace-nowrap">
                            Working on it
                          </button>
                        )}
                      </div>
                      {/* Score */}
                      <span className="num text-[11px] font-bold flex-shrink-0" style={{ color: scoreColor(c.overallScore || 0) }}>
                        {(c.overallScore || 0) > 0 ? c.overallScore.toFixed(1) : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Coaching Notes — informational bullet points */}
          {coachingRecs.length > 0 && (
            <div className="px-6 py-5">
              <SectionHead title="Coaching Notes" />
              <div className="mt-3 space-y-2">
                {coachingRecs.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center text-[10px] font-bold text-yellow-600">
                      {i + 1}
                    </span>
                    <p className="text-[12px] leading-relaxed text-brand-text">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Behavior Tags */}
          {(posTags.length > 0 || negTags.length > 0) && (
            <div className="px-6 py-5">
              <SectionHead title="Behavior Tags" />
              <div className="space-y-3">
                {posTags.length > 0 && (
                  <div>
                    <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wider mb-1.5">Strengths</p>
                    <div className="flex flex-wrap gap-1.5">
                      {posTags.map(t => (
                        <Tag key={t.tag} text={`${t.tag} ×${t.count}`} color="#166534" bg="#f0fdf4" border="#bbf7d0" />
                      ))}
                    </div>
                  </div>
                )}
                {negTags.length > 0 && (
                  <div>
                    <p className="text-[10px] text-red-600 font-semibold uppercase tracking-wider mb-1.5">Areas to Improve</p>
                    <div className="flex flex-wrap gap-1.5">
                      {negTags.map(t => (
                        <Tag key={t.tag} text={`${t.tag} ×${t.count}`} color="#991b1b" bg="#fef2f2" border="#fecaca" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Call History */}
          <div className="px-6 py-5">
            <SectionHead title={`Call History (${sortedCalls.length})`} />
            {sortedCalls.length === 0 ? (
              <p className="text-brand-muted text-sm text-center py-6">No calls in this period</p>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-brand-border">
                      <th className="py-2 pr-3 text-left text-[10px] font-bold uppercase tracking-wider text-brand-muted">Date</th>
                      <th className="py-2 pr-3 text-left text-[10px] font-bold uppercase tracking-wider text-brand-muted">Customer</th>
                      <th className="py-2 pr-3 text-left text-[10px] font-bold uppercase tracking-wider text-brand-muted hidden sm:table-cell">Verdict</th>
                      <th className="py-2 pr-3 text-left text-[10px] font-bold uppercase tracking-wider text-brand-muted">Score</th>
                      <th className="py-2 text-left text-[10px] font-bold uppercase tracking-wider text-brand-muted hidden sm:table-cell">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCalls.map(call => (
                      <tr key={call._rowIdx}
                        className="border-b border-brand-border/60 cursor-pointer transition-colors duration-150 hover:bg-brand-bg"
                        style={{ background: call.frustratedFlag ? '#fff5f5' : '' }}
                        onClick={() => onCallClick?.(call.meetingId)}>
                        <td className="py-2.5 pr-3 text-[11px] text-brand-muted whitespace-nowrap">{fmtDate(call.date)}</td>
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-1.5">
                            {call.frustratedFlag && (
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" title="Priority" />
                            )}
                            <div className="min-w-0">
                              <span className="text-[12px] font-medium text-brand-text hover:text-brand-green transition-colors truncate max-w-[120px] block">
                                {call.customer || '—'}
                              </span>
                              {call.category && (
                                <span className="text-[9px] font-semibold text-brand-muted uppercase tracking-wide">{call.category}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 hidden sm:table-cell">
                          {call.finalVerdict
                            ? <span className="text-[10px] text-brand-muted bg-brand-bg border border-brand-border px-1.5 py-0.5 rounded whitespace-nowrap">{call.finalVerdict}</span>
                            : <span className="text-brand-muted text-[11px]">—</span>}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className="num text-[11px] font-bold" style={{ color: scoreColor(call.overallScore || 0) }}>
                            {(call.overallScore || 0) > 0 ? call.overallScore.toFixed(1) : '—'}
                          </span>
                        </td>
                        <td className="py-2.5 hidden sm:table-cell">
                          {call.status
                            ? <span className="text-[10px] text-brand-muted">{call.status}</span>
                            : <span className="text-brand-muted text-[11px]">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-brand-border bg-brand-bg flex items-center justify-between">
          <span className="text-[10px] text-brand-muted">{filteredCalls.length} calls in selected period</span>
          <div className="flex items-center gap-2">
            {onBack && (
              <button onClick={onBack} className="text-[11px] font-semibold px-4 py-1.5 rounded-lg border border-brand-border text-brand-muted hover:text-brand-heading transition-colors">
                ← Back
              </button>
            )}
            <button onClick={onClose} className="text-[11px] font-semibold px-4 py-1.5 rounded-lg text-white"
              style={{ background: G }}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
