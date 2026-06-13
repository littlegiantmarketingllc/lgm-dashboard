import { subDays, format, parseISO, differenceInDays } from 'date-fns'

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
export function todayStr() { return format(new Date(), 'yyyy-MM-dd') }

export function getDateWindow(filter) {
  const today = todayStr()
  if (filter.type === 'all')    return { from: '0000-01-01', to: '9999-12-31' }
  if (filter.type === 'today')  return { from: today, to: today }
  if (filter.type === 'custom') return { from: filter.from || today, to: filter.to || today }
  const days = parseInt(filter.type)
  return { from: format(subDays(new Date(), days), 'yyyy-MM-dd'), to: today }
}

export function filterCalls(calls, filter) {
  const { from, to } = getDateWindow(filter)
  return calls.filter(c => c.date >= from && c.date <= to)
}

export function getPrevCalls(calls, filter) {
  if (['all', 'today', 'custom'].includes(filter.type)) return []
  const days = parseInt(filter.type)
  const to   = format(subDays(new Date(), days + 1), 'yyyy-MM-dd')
  const from = format(subDays(new Date(), days * 2), 'yyyy-MM-dd')
  return calls.filter(c => c.date >= from && c.date <= to)
}

export function pctChange(curr, prev) {
  if (prev === 0) return null
  return Math.round((curr - prev) / prev * 100)
}

// ─── Unique meeting IDs ───────────────────────────────────────────────────────
export function uniqueMeetingIds(calls) {
  return [...new Set(calls.map(c => c.meetingId).filter(Boolean))]
}

// ─── KPI summary (counts by unique meetings) ─────────────────────────────────
export function calcSummary(calls) {
  const meetings    = new Map() // meetingId → { frustrated, ... }
  for (const c of calls) {
    if (!meetings.has(c.meetingId)) {
      meetings.set(c.meetingId, { frustrated: c.frustratedFlag })
    } else if (c.frustratedFlag) {
      meetings.get(c.meetingId).frustrated = true
    }
  }
  const total      = meetings.size
  const frustrated = [...meetings.values()].filter(m => m.frustrated).length
  const positive   = total - frustrated
  return { total, positive, frustrated }
}

// ─── Employee aggregation (per-row, not per-meeting) ─────────────────────────
export function aggregateEmployees(calls) {
  const map = {}
  const sorted = [...calls].sort((a, b) => a.date.localeCompare(b.date))
  for (const c of sorted) {
    if (!map[c.employee]) {
      map[c.employee] = {
        name: c.employee,
        calls: 0, totalOverall: 0,
        totalComm: 0, totalProf: 0, totalProd: 0, totalCX: 0,
        frustrated: 0, coaching: 0,
        scores: [], callLog: [],
      }
    }
    const e = map[c.employee]
    e.calls++
    e.totalOverall += c.overallScore
    e.totalComm    += c.commScore
    e.totalProf    += c.profScore
    e.totalProd    += c.prodScore
    e.totalCX      += c.cxScore
    if (c.frustratedFlag) e.frustrated++
    if (c.coachingFlag)   e.coaching++
    e.scores.push(c.overallScore)
    if (c.summary || c.customer) {
      e.callLog.push({
        date: c.date, customer: c.customer, summary: c.summary,
        meetingId: c.meetingId, overallScore: c.overallScore,
        finalVerdict: c.finalVerdict, status: c.status,
      })
    }
  }
  return Object.values(map).map(e => ({
    ...e,
    avgScore:    +(e.totalOverall / e.calls).toFixed(1),
    avgComm:     e.totalComm > 0 ? +(e.totalComm  / e.calls).toFixed(1) : null,
    avgProf:     e.totalProf > 0 ? +(e.totalProf  / e.calls).toFixed(1) : null,
    avgProd:     e.totalProd > 0 ? +(e.totalProd  / e.calls).toFixed(1) : null,
    avgCX:       e.totalCX   > 0 ? +(e.totalCX    / e.calls).toFixed(1) : null,
    recentScores:    e.scores.slice(-8),
    recentSummaries: e.callLog.slice(-3).reverse(),
  })).sort((a, b) => b.avgScore - a.avgScore)
}

// ─── Top performer ────────────────────────────────────────────────────────────
export function calcTopPerformer(calls) {
  const employees = aggregateEmployees(calls.filter(c => true))
  const top = employees.filter(e => e.calls >= 2)[0] ?? employees[0] ?? null
  if (!top) return null
  const latestCall = [...calls]
    .filter(c => c.employee === top.name && c.summary)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || ''))[0]
  return {
    ...top,
    latestSummary:  latestCall?.summary || '',
    latestCustomer: latestCall?.customer || '',
  }
}

// ─── Chart data ───────────────────────────────────────────────────────────────
export function buildChartData(calls, filter) {
  const days  = ['all', 'custom'].includes(filter.type)
    ? 30 : filter.type === 'today' ? 1 : Math.min(parseInt(filter.type), 30)
  const today = new Date()
  const result = []
  for (let i = days - 1; i >= 0; i--) {
    const d    = subDays(today, i)
    const dStr = format(d, 'yyyy-MM-dd')
    // Count unique meetings per day
    const dayRows = calls.filter(c => c.date === dStr)
    const dayMeetings = new Map()
    for (const c of dayRows) {
      if (!dayMeetings.has(c.meetingId)) {
        dayMeetings.set(c.meetingId, { frustrated: c.frustratedFlag })
      } else if (c.frustratedFlag) {
        dayMeetings.get(c.meetingId).frustrated = true
      }
    }
    const positive   = [...dayMeetings.values()].filter(m => !m.frustrated).length
    const frustrated = [...dayMeetings.values()].filter(m => m.frustrated).length
    result.push({ date: format(d, 'MMM d'), positive, frustrated })
  }
  return result
}

// ─── Quick stats ──────────────────────────────────────────────────────────────
export function calcQuickStats(calls, prevCalls, filter) {
  const total     = calls.length
  const avgScore  = total
    ? +(calls.reduce((s, c) => s + c.overallScore, 0) / total).toFixed(1) : 0
  const totalMins = calls.reduce((s, c) => s + (c.duration || 0), 0)
  const avgDuration = total ? Math.round(totalMins / total) : 0
  const withScore = calls.filter(c => c.overallScore > 0).length
  const responseRate = total ? Math.round((withScore / total) * 100) : 0
  const prevCount = prevCalls.length
  const canCompare = prevCount >= 5 && !['all', 'today', 'custom'].includes(filter.type)
  const callsDelta = canCompare ? pctChange(total, prevCount) : null
  return { avgScore, totalMins: Math.round(totalMins), avgDuration, responseRate, totalCalls: total, callsDelta }
}

// ─── Frustrated calls (unique per meetingId, first row wins) ─────────────────
export function getFrustratedCalls(calls) {
  const seen = new Set()
  const result = []
  // Sort newest first so first-seen for a meetingId is the newest row
  const sorted = [...calls]
    .filter(c => c.frustratedFlag)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || ''))
  for (const c of sorted) {
    if (!seen.has(c.meetingId)) {
      seen.add(c.meetingId)
      result.push(c)
    }
  }
  return result
}

// ─── Time-ago helper ──────────────────────────────────────────────────────────
export function timeAgo(dateStr) {
  if (!dateStr) return ''
  try {
    const days = differenceInDays(new Date(), parseISO(dateStr))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7)  return `${days}d ago`
    return `${Math.floor(days / 7)}w ago`
  } catch { return '' }
}

// ─── Verdict / sentiment badge styles ────────────────────────────────────────
export const VERDICT_STYLE = {
  'Excellent':          'bg-green-100 text-green-800 border-green-200',
  'Good':               'bg-green-50 text-green-700 border-green-200',
  'Satisfactory':       'bg-blue-50 text-blue-700 border-blue-200',
  'Needs Improvement':  'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Needs Coaching':     'bg-orange-50 text-orange-700 border-orange-200',
  'Immediate Attention':'bg-red-100 text-red-800 border-red-200',
  'Immediate':          'bg-red-100 text-red-800 border-red-200',
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
