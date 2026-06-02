import { useState, useMemo } from 'react'
import { subDays, format, eachDayOfInterval, parseISO, startOfDay } from 'date-fns'
import Header from './components/Header'
import SummaryCards from './components/SummaryCards'
import QuickStats from './components/QuickStats'
import TopPerformer from './components/TopPerformer'
import EmployeeTable from './components/EmployeeTable'
import MeetingsChart from './components/MeetingsChart'
import ResolutionTracker from './components/ResolutionTracker'
import FrustratedTable from './components/FrustratedTable'
import ActivityFeed from './components/ActivityFeed'
import { useCallStatus } from './hooks/useCallStatus'
import { useGoogleSheets } from './hooks/useGoogleSheets'

// ─── Filter helpers ───────────────────────────────────────────────────────────
// filter = { type: 'today'|'2d'|'7d'|'14d'|'30d'|'all'|'custom', from: '', to: '' }

function todayStr() { return format(new Date(), 'yyyy-MM-dd') }

function getDateWindow(filter) {
  const today = todayStr()
  if (filter.type === 'all')    return { from: '0000-01-01', to: '9999-12-31' }
  if (filter.type === 'today')  return { from: today, to: today }
  if (filter.type === 'custom') return { from: filter.from || today, to: filter.to || today }
  const days = parseInt(filter.type)    // '7d' → 7
  return { from: format(subDays(new Date(), days), 'yyyy-MM-dd'), to: today }
}

function filterCalls(calls, filter) {
  const { from, to } = getDateWindow(filter)
  return calls.filter(c => c.date >= from && c.date <= to)
}

function getPrevCalls(calls, filter) {
  // Prev period only makes sense for fixed-day filters
  if (['all', 'today', 'custom'].includes(filter.type)) return []
  const days = parseInt(filter.type)
  const to   = format(subDays(new Date(), days + 1), 'yyyy-MM-dd')
  const from = format(subDays(new Date(), days * 2),  'yyyy-MM-dd')
  return calls.filter(c => c.date >= from && c.date <= to)
}

function pctChange(curr, prev) {
  if (prev === 0) return null
  return Math.round((curr - prev) / prev * 100)
}

// ─── Loading / Error screens ─────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center gap-5">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-4 border-brand-border" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-green animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-brand-heading font-semibold text-base">Loading dashboard…</p>
        <p className="text-brand-muted text-sm mt-1">Fetching data from Google Sheets</p>
      </div>
    </div>
  )
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-brand-border p-8 max-w-lg w-full text-center"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-brand-heading font-bold text-lg mb-2">Could not load data</h2>
        <p className="text-brand-muted text-sm leading-relaxed mb-6">{message}</p>
        <div className="bg-brand-bg rounded-xl p-4 text-left mb-6 text-xs text-brand-muted space-y-1.5">
          <p className="font-semibold text-brand-heading text-[11px] uppercase tracking-wider mb-2">Quick checklist</p>
          <p>1. Open the sheet → <strong>File → Share → Publish to web</strong></p>
          <p>2. Choose <strong>Entire Document</strong> + <strong>CSV</strong> → Publish</p>
          <p>3. Also set sharing to <strong>Anyone with the link can view</strong></p>
        </div>
        <button onClick={onRetry} className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold"
          style={{ background: '#8CC63F', boxShadow: '0 2px 8px rgba(140,198,63,0.35)' }}>
          Try Again
        </button>
      </div>
    </div>
  )
}

// ─── Main app ────────────────────────────────────────────────────────────────
export default function App() {
  const [filter, setFilter]         = useState({ type: '30d', from: '', to: '' })
  const { statuses, setStatus }     = useCallStatus()
  const { calls, loading, error, lastUpdated, refetch } = useGoogleSheets()

  // ── All useMemo hooks MUST come before any conditional return ────────────
  const filteredCalls = useMemo(() => filterCalls(calls, filter), [calls, filter])
  const prevCalls     = useMemo(() => getPrevCalls(calls, filter), [calls, filter])

  const summary = useMemo(() => {
    const total      = filteredCalls.length
    const frustrated = filteredCalls.filter(c => c.frustrated).length
    const positive   = total - frustrated
    return { total, positive, frustrated }
  }, [filteredCalls])

  const prevSummary = useMemo(() => {
    const total      = prevCalls.length
    const frustrated = prevCalls.filter(c => c.frustrated).length
    const positive   = total - frustrated
    return { total, positive, frustrated }
  }, [prevCalls])

  // Only show trend % when prev period has ≥5 calls AND filter has a comparison period
  const trends = useMemo(() => {
    const canCompare = prevCalls.length >= 5 &&
      !['all', 'today', 'custom'].includes(filter.type)
    return {
      total:     canCompare ? pctChange(summary.total,     prevSummary.total)    : null,
      positive:  canCompare ? pctChange(summary.positive,  prevSummary.positive) : null,
      frustrated: canCompare ? (summary.frustrated - prevSummary.frustrated)     : null,
    }
  }, [summary, prevSummary, prevCalls, filter])

  const employeeStats = useMemo(() => {
    const map = {}
    const sorted = [...filteredCalls].sort((a, b) => (a.date > b.date ? 1 : -1))
    for (const call of sorted) {
      if (!map[call.employee]) {
        map[call.employee] = { name: call.employee, calls: 0, totalScore: 0, frustrated: 0, scores: [] }
      }
      map[call.employee].calls++
      map[call.employee].totalScore += call.score
      if (call.frustrated) map[call.employee].frustrated++
      map[call.employee].scores.push(call.score)
    }
    return Object.values(map)
      .map(e => ({
        ...e,
        avgScore:     +(e.totalScore / e.calls).toFixed(1),
        recentScores: e.scores.slice(-5),
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
  }, [filteredCalls])

  const chartData = useMemo(() => {
    const days  = ['all', 'today', 'custom'].includes(filter.type) ? 30 : Math.min(parseInt(filter.type), 30)
    const today = new Date()
    const start = subDays(today, days - 1)
    return eachDayOfInterval({ start, end: today }).map(day => {
      const dateStr  = format(day, 'yyyy-MM-dd')
      const dayCalls = filteredCalls.filter(c => c.date === dateStr)
      return {
        date:       format(day, 'MMM d'),
        positive:   dayCalls.filter(c => !c.frustrated).length,
        frustrated: dayCalls.filter(c =>  c.frustrated).length,
      }
    })
  }, [filteredCalls, filter])

  const frustratedCalls = useMemo(() =>
    filteredCalls
      .filter(c => c.frustrated)
      .sort((a, b) => {
        if (b.date !== a.date) return b.date > a.date ? 1 : -1
        return (b.time || '') > (a.time || '') ? 1 : -1
      }),
    [filteredCalls]
  )

  // Top performer from the selected period (not hardcoded to 7d)
  const topPerformerData = useMemo(() => {
    const map = {}
    for (const call of filteredCalls) {
      if (!map[call.employee]) map[call.employee] = { name: call.employee, calls: 0, totalScore: 0 }
      map[call.employee].calls++
      map[call.employee].totalScore += call.score
    }
    return Object.values(map)
      .filter(e => e.calls >= 2)            // need ≥2 calls to be meaningful
      .map(e => ({ ...e, avgScore: +(e.totalScore / e.calls).toFixed(1) }))
      .sort((a, b) => b.avgScore - a.avgScore)[0] ?? null
  }, [filteredCalls])

  // Quick stats — all from real data, all scoped to selected period
  const quickStats = useMemo(() => {
    const total      = filteredCalls.length
    const avgScore   = total
      ? +(filteredCalls.reduce((s, c) => s + c.score, 0) / total).toFixed(1) : 0
    const totalMins  = filteredCalls.reduce((s, c) => s + (c.duration || 0), 0)
    const avgDuration = total ? Math.round(totalMins / total) : 0
    const withScore  = filteredCalls.filter(c => c.score > 0).length
    const responseRate = total ? Math.round((withScore / total) * 100) : 0
    const prevCount  = prevCalls.length
    const callsDelta = prevCount >= 5 ? pctChange(total, prevCount) : null
    return { avgScore, totalMins: Math.round(totalMins), avgDuration, responseRate, totalCalls: total, callsDelta }
  }, [filteredCalls, prevCalls])

  // Recent activity sorted by date+time from sheet
  const recentActivity = useMemo(() =>
    [...calls]
      .sort((a, b) => {
        if (b.date !== a.date) return b.date > a.date ? 1 : -1
        return (b.time || '') > (a.time || '') ? 1 : -1
      })
      .slice(0, 12),
    [calls]
  )
  // ──────────────────────────────────────────────────────────────────────────

  if (loading && calls.length === 0) return <LoadingScreen />
  if (error   && calls.length === 0) return <ErrorScreen message={error} onRetry={refetch} />

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <Header
        filter={filter}
        setFilter={setFilter}
        lastUpdated={lastUpdated}
        onRefresh={refetch}
        isRefreshing={loading}
        dataError={error}
      />

      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && calls.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
            <span>⚠️</span>
            <span>Auto-refresh failed — showing last known data.{' '}
              <button onClick={refetch} className="underline font-medium">Retry</button>
            </span>
          </div>
        )}

        <div className="flex gap-7 items-start">
          <div className="flex-1 min-w-0 space-y-6">
            <SummaryCards summary={summary} trends={trends} />
            <QuickStats stats={quickStats} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <TopPerformer performer={topPerformerData} />
              <div className="lg:col-span-2">
                <EmployeeTable employees={employeeStats} />
              </div>
            </div>

            <MeetingsChart data={chartData} />
            <ResolutionTracker calls={frustratedCalls} statuses={statuses} />
            <FrustratedTable calls={frustratedCalls} statuses={statuses} setStatus={setStatus} />
          </div>

          <aside className="hidden xl:flex flex-col w-[320px] flex-shrink-0 sticky top-20">
            <ActivityFeed calls={recentActivity} />
          </aside>
        </div>
      </div>

      <footer className="mt-12 py-5 border-t border-brand-border text-center text-[11px] text-brand-muted/60 tracking-widest uppercase">
        Little Giant Marketing &mdash; Quality Control Dashboard
      </footer>
    </div>
  )
}
