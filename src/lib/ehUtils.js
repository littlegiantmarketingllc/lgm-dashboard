import { subDays, format, parseISO, differenceInDays, isBefore } from 'date-fns'

// ─── Score colour helpers ──────────────────────────────────────────────────────
export const G   = '#8CC63F'
export const RED = '#EF4444'
export const AMB = '#EAB308'

export function scoreColor(s) {
  return s >= 8 ? G : s >= 6 ? AMB : RED
}
export function scoreBg(s) {
  const c = scoreColor(s)
  if (c === G)   return 'bg-green-50 text-green-700 border-green-200'
  if (c === AMB) return 'bg-yellow-50 text-yellow-700 border-yellow-200'
  return 'bg-red-50 text-red-700 border-red-200'
}

// ─── Date window ──────────────────────────────────────────────────────────────
// Call dates/times are stored in US Eastern Time (see n8n pipeline), so "today"
// must be computed in ET regardless of the viewer's own browser timezone —
// otherwise a viewer ahead of ET (e.g. Pakistan) sees "today" roll over hours early.
function nowET() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date())
  const get = type => Number(parts.find(p => p.type === type).value)
  return new Date(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
}

export function todayStr() { return format(nowET(), 'yyyy-MM-dd') }

export function getDateWindow(filter) {
  const today = todayStr()
  if (filter.type === 'all')    return { from: '0000-01-01', to: '9999-12-31' }
  if (filter.type === 'today')  return { from: today, to: today }
  if (filter.type === 'yesterday') {
    const y = format(subDays(nowET(), 1), 'yyyy-MM-dd')
    return { from: y, to: y }
  }
  if (filter.type === 'custom') return { from: filter.from || today, to: filter.to || today }
  const days = parseInt(filter.type)
  return { from: format(subDays(nowET(), days), 'yyyy-MM-dd'), to: today }
}

export function filterCalls(calls, filter) {
  const { from, to } = getDateWindow(filter)
  return calls.filter(c => c.date >= from && c.date <= to)
}

export function getPrevCalls(calls, filter) {
  if (['all', 'today', 'yesterday', 'custom'].includes(filter.type)) return []
  const days = parseInt(filter.type)
  const to   = format(subDays(nowET(), days + 1), 'yyyy-MM-dd')
  const from = format(subDays(nowET(), days * 2), 'yyyy-MM-dd')
  return calls.filter(c => c.date >= from && c.date <= to)
}

export function pctChange(curr, prev) {
  if (prev === 0) return null
  return Math.round((curr - prev) / prev * 100)
}

// ─── Unique meeting key (fallback for rows without a meetingId) ───────────────
let _rowFallback = 0
function meetingKey(c, idx) {
  return c.meetingId || `__row_${idx}`
}

// ─── Unique meeting count ─────────────────────────────────────────────────────
export function uniqueMeetingIds(calls) {
  return [...new Set(calls.map((c, i) => c.meetingId || `__row_${i}`).filter(Boolean))]
}

// ─── KPI summary (counts by unique meetings) ─────────────────────────────────
export function calcSummary(calls) {
  const meetings = new Map()
  calls.forEach((c, i) => {
    const key = c.meetingId || `__row_${i}`
    if (!meetings.has(key)) {
      meetings.set(key, { frustrated: Boolean(c.frustratedFlag), callType: c.callType })
    } else if (c.frustratedFlag) {
      meetings.get(key).frustrated = true
    }
  })
  const vals         = [...meetings.values()]
  const total        = meetings.size
  const frustrated   = vals.filter(m => m.frustrated).length
  const positive     = total - frustrated
  const meetingCount = vals.filter(m => m.callType === 'Meeting').length
  const phoneCount   = vals.filter(m => m.callType === 'Phone Call').length
  return { total, positive, frustrated, meetingCount, phoneCount }
}

// ─── Employee aggregation (per-row, not per-meeting) ─────────────────────────
export function aggregateEmployees(calls) {
  const map = {}
  const sorted = [...calls].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  for (const c of sorted) {
    if (!c.employee) continue
    if (!map[c.employee]) {
      map[c.employee] = {
        name: c.employee,
        calls: 0, totalOverall: 0,
        totalComm: 0, totalProf: 0, totalProd: 0, totalCX: 0,
        totalDuration: 0,
        frustrated: 0, coaching: 0,
        scores: [], callLog: [],
        coachingRecs: [],
      }
    }
    const e = map[c.employee]
    e.calls++
    e.totalOverall += c.overallScore || 0
    e.totalComm    += c.commScore    || 0
    e.totalProf    += c.profScore    || 0
    e.totalProd    += c.prodScore    || 0
    e.totalCX      += c.cxScore      || 0
    e.totalDuration += c.duration    || 0
    if (c.frustratedFlag) e.frustrated++
    if (c.coachingFlag)   e.coaching++
    e.scores.push(c.overallScore || 0)
    if (c.coachingRecs?.length) {
      for (const r of c.coachingRecs) {
        if (!e.coachingRecs.includes(r)) e.coachingRecs.push(r)
      }
    }
    e.callLog.push({
      date: c.date, customer: c.customer, summary: c.summary,
      meetingId: c.meetingId, overallScore: c.overallScore,
      finalVerdict: c.finalVerdict, status: c.status, _rowIdx: c._rowIdx,
    })
  }
  return Object.values(map).map(e => {
    const validComm = sorted.filter(c => c.employee === e.name && c.commScore > 0)
    const validProf = sorted.filter(c => c.employee === e.name && c.profScore > 0)
    const validProd = sorted.filter(c => c.employee === e.name && c.prodScore > 0)
    const validCX   = sorted.filter(c => c.employee === e.name && c.cxScore   > 0)
    return {
      ...e,
      avgScore: e.calls ? +(e.totalOverall / e.calls).toFixed(1) : 0,
      avgComm:  validComm.length ? +(validComm.reduce((s, c) => s + c.commScore, 0) / validComm.length).toFixed(1) : null,
      avgProf:  validProf.length ? +(validProf.reduce((s, c) => s + c.profScore, 0) / validProf.length).toFixed(1) : null,
      avgProd:  validProd.length ? +(validProd.reduce((s, c) => s + c.prodScore, 0) / validProd.length).toFixed(1) : null,
      avgCX:    validCX.length   ? +(validCX.reduce(  (s, c) => s + c.cxScore,   0) / validCX.length).toFixed(1)   : null,
      totalMins: e.totalDuration,
      recentScores:    e.scores.slice(-8),
      recentSummaries: e.callLog.slice(-3).reverse(),
    }
  }).sort((a, b) => b.avgScore - a.avgScore)
}

// ─── Top performer (weighted: 70% quality, 30% volume) ───────────────────────
export function calcTopPerformer(calls) {
  const employees = aggregateEmployees(calls)
  if (!employees.length) return null
  const maxCalls = Math.max(...employees.map(e => e.calls), 1)
  // Composite = avgScore (0–10) × 0.7 + normalised call volume (0–10) × 0.3
  const ranked = employees
    .map(e => ({ ...e, composite: e.avgScore * 0.7 + (e.calls / maxCalls * 10) * 0.3 }))
    .sort((a, b) => b.composite - a.composite)
  const top = ranked[0]
  if (!top) return null
  const latestCall = [...calls]
    .filter(c => c.employee === top.name && c.summary)
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.time || '').localeCompare(a.time || ''))[0]
  return {
    ...top,
    latestSummary:  latestCall?.summary  || '',
    latestCustomer: latestCall?.customer || '',
  }
}

// ─── Chart data (unique meetings per day) ────────────────────────────────────
export function buildChartData(calls, filter) {
  const days  = ['all', 'custom'].includes(filter.type)
    ? 30 : (filter.type === 'today' || filter.type === 'yesterday') ? 1 : Math.min(parseInt(filter.type), 30)
  const anchor = filter.type === 'yesterday' ? subDays(nowET(), 1) : nowET()
  return Array.from({ length: days }, (_, i) => {
    const d    = subDays(anchor, days - 1 - i)
    const dStr = format(d, 'yyyy-MM-dd')
    const dayRows = calls.filter(c => c.date === dStr)
    const dayMeetings = new Map()
    dayRows.forEach((c, idx) => {
      const key = c.meetingId || `__row_${idx}`
      if (!dayMeetings.has(key)) {
        dayMeetings.set(key, { frustrated: Boolean(c.frustratedFlag) })
      } else if (c.frustratedFlag) {
        dayMeetings.get(key).frustrated = true
      }
    })
    const positive   = [...dayMeetings.values()].filter(m => !m.frustrated).length
    const frustrated = [...dayMeetings.values()].filter(m =>  m.frustrated).length
    return { date: format(d, 'MMM d'), positive, frustrated }
  })
}

// ─── Quick stats (scores-focused, unique meeting counts) ─────────────────────
export function calcQuickStats(calls, prevCalls, filter) {
  const totalMeetings = calcSummary(calls).total

  const avg = (field) => {
    const valid = calls.filter(c => (c[field] || 0) > 0)
    return valid.length ? +(valid.reduce((s, c) => s + c[field], 0) / valid.length).toFixed(1) : 0
  }

  const avgScore = avg('overallScore')
  const avgComm  = avg('commScore')
  const avgProf  = avg('profScore')
  const avgProd  = avg('prodScore')
  const avgCX    = avg('cxScore')
  const totalMins = Math.round(calls.reduce((s, c) => s + (c.duration || 0), 0))
  const avgDuration = calls.length ? Math.round(totalMins / calls.length) : 0

  const prevTotal = calcSummary(prevCalls).total
  const canCompare = prevTotal >= 3 && !['all', 'today', 'custom'].includes(filter.type)
  const callsDelta = canCompare ? pctChange(totalMeetings, prevTotal) : null

  return { avgScore, avgComm, avgProf, avgProd, avgCX, totalMins, avgDuration, totalCalls: totalMeetings, callsDelta }
}

// ─── Frustrated calls (unique per meetingId) ─────────────────────────────────
export function getFrustratedCalls(calls) {
  const seen = new Set()
  return [...calls]
    .filter(c => c.frustratedFlag)
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.time || '').localeCompare(a.time || ''))
    .filter(c => {
      const key = c.meetingId || `__row_${c._rowIdx}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

// ─── Action Required calls ────────────────────────────────────────────────────
const ACTION_STATUSES = new Set(['Action Required', 'Pending', 'Escalated', 'action required', 'pending', 'escalated'])

export function getActionRequired(calls) {
  const today = todayStr()
  const seen  = new Set()
  return [...calls]
    .filter(c => ACTION_STATUSES.has(c.status))
    .sort((a, b) => {
      // Overdue first, then by promisedDeadline ascending, then by date
      const aOver = a.promisedDeadline && a.promisedDeadline < today
      const bOver = b.promisedDeadline && b.promisedDeadline < today
      if (aOver && !bOver) return -1
      if (!aOver && bOver) return  1
      if (a.promisedDeadline && b.promisedDeadline) return a.promisedDeadline.localeCompare(b.promisedDeadline)
      if (a.promisedDeadline)  return -1
      if (b.promisedDeadline)  return  1
      return (b.date || '').localeCompare(a.date || '')
    })
    .filter(c => {
      const key = c.meetingId || `__row_${c._rowIdx}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map(c => ({ ...c, overdue: Boolean(c.promisedDeadline && c.promisedDeadline < today) }))
}

// ─── Behavior insights from behaviorTags array ───────────────────────────────
const NEGATIVE_TAG_WORDS = [
  'rude', 'unprofessional', 'late', 'wrong', 'poor', 'negative', 'miss',
  'fail', 'error', 'problem', 'issue', 'complaint', 'aggressive', 'unclear',
  'slow', 'inaccurate', 'confus', 'abrupt', 'dismissive',
]

function isNegativeTag(tag) {
  const t = tag.toLowerCase()
  return NEGATIVE_TAG_WORDS.some(w => t.includes(w))
}

export function buildBehaviorInsights(calls) {
  const tagCount = {}
  for (const c of calls) {
    for (const tag of (c.behaviorTags || [])) {
      const t = (tag || '').trim()
      if (!t) continue
      tagCount[t] = (tagCount[t] || 0) + 1
    }
  }
  return Object.entries(tagCount)
    .map(([tag, count]) => ({ tag, count, negative: isNegativeTag(tag) }))
    .sort((a, b) => b.count - a.count)
}

// ─── Time-ago helper ──────────────────────────────────────────────────────────
export function timeAgo(dateStr) {
  if (!dateStr) return ''
  try {
    const days = differenceInDays(nowET(), parseISO(dateStr))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7)  return `${days}d ago`
    return `${Math.floor(days / 7)}w ago`
  } catch { return '' }
}

// ─── Format talk time ─────────────────────────────────────────────────────────
export function fmtMins(mins) {
  if (!mins) return '0m'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// ─── Verdict / sentiment badge styles ────────────────────────────────────────
export const VERDICT_STYLE = {
  'Excellent':           'bg-green-100 text-green-800 border-green-200',
  'Good':                'bg-green-50 text-green-700 border-green-200',
  'Satisfactory':        'bg-blue-50 text-blue-700 border-blue-200',
  'Needs Improvement':   'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Needs Coaching':      'bg-orange-50 text-orange-700 border-orange-200',
  'Immediate Attention': 'bg-red-100 text-red-800 border-red-200',
  'Immediate':           'bg-red-100 text-red-800 border-red-200',
}
export const SENTIMENT_STYLE = {
  'Happy':      'bg-green-50 text-green-700',
  'Engaged':    'bg-teal-50 text-teal-700',
  'Interested': 'bg-blue-50 text-blue-700',
  'Neutral':    'bg-gray-100 text-gray-600',
  'Uncertain':  'bg-yellow-50 text-yellow-700',
  'Confused':   'bg-orange-50 text-orange-700',
  'Frustrated': 'bg-red-100 text-red-700',
  'Upset':      'bg-red-100 text-red-800',
}
export const RISK_STYLE = {
  'Low':      'bg-green-50 text-green-700',
  'Medium':   'bg-yellow-50 text-yellow-700',
  'High':     'bg-red-50 text-red-700',
  'Critical': 'bg-red-100 text-red-800 font-bold',
}
export const STATUS_STYLE = {
  'Resolved':         'bg-green-50 text-green-700',
  'Pending':          'bg-yellow-50 text-yellow-700',
  'Action Required':  'bg-red-50 text-red-700',
  'Escalated':        'bg-red-100 text-red-800',
  'In Progress':      'bg-blue-50 text-blue-700',
  'Closed':           'bg-gray-100 text-gray-500',
}
