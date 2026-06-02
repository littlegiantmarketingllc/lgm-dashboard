import { useState, useMemo } from 'react'
import { subDays, parseISO, startOfDay, format, eachDayOfInterval } from 'date-fns'
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

const RANGE_OPTIONS = [
  { label: '7d',  value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
  { label: 'All', value: 9999 },
]

function filterByRange(calls, days) {
  if (days >= 9999) return calls
  const cutoff = startOfDay(subDays(new Date(), days))
  return calls.filter(c => startOfDay(parseISO(c.date)) >= cutoff)
}

function filterByWindow(calls, fromDays, toDays) {
  const start = startOfDay(subDays(new Date(), fromDays))
  const end   = startOfDay(subDays(new Date(), toDays))
  return calls.filter(c => {
    const d = startOfDay(parseISO(c.date))
    return d >= start && d < end
  })
}

function pctChange(curr, prev) {
  if (prev === 0 && curr === 0) return null
  if (prev === 0) return null
  return Math.round((curr - prev) / prev * 100)
}

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
      <div
        className="bg-white rounded-2xl border border-brand-border p-8 max-w-lg w-full text-center"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
      >
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-brand-heading font-bold text-lg mb-2">Could not load data</h2>
        <p className="text-brand-muted text-sm leading-relaxed mb-6">{message}</p>
        <div className="bg-brand-bg rounded-xl p-4 text-left mb-6 text-xs text-brand-muted space-y-1.5">
          <p className="font-semibold text-brand-heading text-[11px] uppercase tracking-wider mb-2">Quick checklist</p>
          <p>1. Open the sheet → <strong>File → Share → Publish to web</strong></p>
          <p>2. Choose <strong>Entire Document</strong> + <strong>CSV</strong> → Publish</p>
          <p>3. Also set sharing to <strong>Anyone with the link can view</strong></p>
        </div>
        <button
          onClick={onRetry}
          className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold"
          style={{ background: '#8CC63F', boxShadow: '0 2px 8px rgba(140,198,63,0.35)' }}
        >
          Try Again
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [rangeDays, setRangeDays] = useState(30)
  const { statuses, setStatus }   = useCallStatus()
  const { calls, loading, error, lastUpdated, refetch } = useGoogleSheets()

  // ─── ALL hooks must be called unconditionally before any early return ───────
  const filteredCalls = useMemo(() => filterByRange(calls, rangeDays), [calls, rangeDays])

  const prevCalls = useMemo(() =>
    rangeDays < 9999 ? filterByWindow(calls, rangeDays * 2, rangeDays) : [],
    [calls, rangeDays]
  )

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

  const trends = useMemo(() => ({
    total:      pctChange(summary.total,     prevSummary.total),
    positive:   pctChange(summary.positive,  prevSummary.positive),
    frustrated: summary.frustrated - prevSummary.frustrated,
  }), [summary, prevSummary])

  const employeeStats = useMemo(() => {
    const map = {}
    const sorted = [...filteredCalls].sort((a, b) => new Date(a.date) - new Date(b.date))
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
    const days  = rangeDays >= 9999 ? 30 : Math.min(rangeDays, 30)
    const today = new Date()
    const start = subDays(today, days - 1)
    return eachDayOfInterval({ start, end: today }).map(day => {
      const dateStr  = format(day, 'yyyy-MM-dd')
      const dayCalls = filteredCalls.filter(c => c.date === dateStr)
      return {
        date:       format(day, 'MMM d'),
        positive:   dayCalls.filter(c => !c.frustrated).length,
        frustrated: dayCalls.filter(c => c.frustrated).length,
      }
    })
  }, [filteredCalls, rangeDays])

  const frustratedCalls = useMemo(() =>
    filteredCalls.filter(c => c.frustrated).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [filteredCalls]
  )

  const topPerformerData = useMemo(() => {
    const weekCalls = filterByRange(calls, 7)
    const map = {}
    for (const call of weekCalls) {
      if (!map[call.employee]) map[call.employee] = { name: call.employee, calls: 0, totalScore: 0 }
      map[call.employee].calls++
      map[call.employee].totalScore += call.score
    }
    return Object.values(map)
      .map(e => ({ ...e, avgScore: +(e.totalScore / e.calls).toFixed(1) }))
      .sort((a, b) => b.avgScore - a.avgScore)[0] ?? null
  }, [calls])

  const quickStats = useMemo(() => {
    const weekCalls     = filterByRange(calls, 7)
    const prevWeekCalls = filterByWindow(calls, 14, 7)
    const avgScore      = weekCalls.length
      ? +(weekCalls.reduce((s, c) => s + c.score, 0) / weekCalls.length).toFixed(1) : 0
    const totalMins     = filteredCalls.length * 32
    const callsThisWeek = weekCalls.length
    const callsDelta    = pctChange(callsThisWeek, prevWeekCalls.length)
    return { avgScore, totalMins, callsThisWeek, callsDelta }
  }, [calls, filteredCalls])

  const recentActivity = useMemo(() =>
    [...calls].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 12),
    [calls]
  )
  // ─────────────────────────────────────────────────────────────────────────────

  // Safe to return early after ALL hooks have been called
  if (loading && calls.length === 0) return <LoadingScreen />
  if (error   && calls.length === 0) return <ErrorScreen message={error} onRetry={refetch} />

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <Header
        rangeDays={rangeDays}
        setRangeDays={setRangeDays}
        rangeOptions={RANGE_OPTIONS}
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
