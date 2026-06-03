import { useState, useMemo, useEffect } from 'react'
import { subDays, format, eachDayOfInterval } from 'date-fns'
import Header from './components/Header'
import SummaryCards from './components/SummaryCards'
import QuickStats from './components/QuickStats'
import TopPerformer from './components/TopPerformer'
import EmployeeTable from './components/EmployeeTable'
import MeetingsChart from './components/MeetingsChart'
import ResolutionTracker from './components/ResolutionTracker'
import FrustratedTable from './components/FrustratedTable'
import ActivityFeed from './components/ActivityFeed'
import TeamInsights from './components/TeamInsights'
import EmployeeModal from './components/EmployeeModal'
import AgencyCard from './components/AgencyCard'
import { useCallStatus } from './hooks/useCallStatus'
import { useGoogleSheets } from './hooks/useGoogleSheets'

// ─── Filter helpers ───────────────────────────────────────────────────────────
function todayStr() { return format(new Date(), 'yyyy-MM-dd') }

function getDateWindow(filter) {
  const today = todayStr()
  if (filter.type === 'all')    return { from: '0000-01-01', to: '9999-12-31' }
  if (filter.type === 'today')  return { from: today, to: today }
  if (filter.type === 'custom') return { from: filter.from || today, to: filter.to || today }
  const days = parseInt(filter.type)
  return { from: format(subDays(new Date(), days), 'yyyy-MM-dd'), to: today }
}

function filterCalls(calls, filter) {
  const { from, to } = getDateWindow(filter)
  return calls.filter(c => c.date >= from && c.date <= to)
}

function getPrevCalls(calls, filter) {
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

const PERIOD_LABEL = { '2d': 'the last 2 days', '7d': 'this week', '14d': 'the last 2 weeks', '30d': 'this month' }
const PREV_LABEL   = { '2d': 'previous 2 days', '7d': 'last week', '14d': 'previous 2 weeks', '30d': 'last month' }

function getModalPeriodLabel(filter, categoryFilter) {
  let base
  if (filter.type === 'today')  base = 'Today'
  else if (filter.type === 'all') base = 'All time'
  else if (filter.type === 'custom') {
    base = filter.from && filter.to ? `${filter.from} → ${filter.to}` : 'Custom range'
  } else {
    const map = { '2d': 'Last 2 days', '7d': 'Last 7 days', '14d': 'Last 14 days', '30d': 'Last 30 days' }
    base = map[filter.type] || `Last ${filter.type}`
  }
  return categoryFilter !== 'all' ? `${base} · ${categoryFilter}` : base
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
  const [filter, setFilter]                     = useState({ type: '30d', from: '', to: '' })
  const [categoryFilter, setCategoryFilter]     = useState('all')
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [selectedAgency, setSelectedAgency]     = useState({ name: null, position: null })

  const { statuses, setStatus }                           = useCallStatus()
  const { calls, loading, error, lastUpdated, refetch }   = useGoogleSheets()

  // Close modals on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setSelectedEmployee(null)
      setSelectedAgency({ name: null, position: null })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Dynamic categories extracted from all loaded calls
  const allCategories = useMemo(() => {
    const cats = new Set(calls.map(c => c.category).filter(Boolean))
    return [...cats].sort()
  }, [calls])

  // ── All useMemo hooks MUST come before any conditional return ────────────
  const filteredCalls = useMemo(() => {
    let c = filterCalls(calls, filter)
    if (categoryFilter !== 'all') c = c.filter(x => x.category === categoryFilter)
    return c
  }, [calls, filter, categoryFilter])

  const prevCalls = useMemo(() => getPrevCalls(calls, filter), [calls, filter])

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

  const trends = useMemo(() => {
    const canCompare = prevCalls.length >= 5 &&
      !['all', 'today', 'custom'].includes(filter.type)
    return {
      total:      canCompare ? pctChange(summary.total,     prevSummary.total)    : null,
      positive:   canCompare ? pctChange(summary.positive,  prevSummary.positive) : null,
      frustrated: canCompare ? (summary.frustrated - prevSummary.frustrated)      : null,
    }
  }, [summary, prevSummary, prevCalls, filter])

  const employeeStats = useMemo(() => {
    const map = {}
    const sorted = [...filteredCalls].sort((a, b) => (a.date > b.date ? 1 : -1))
    for (const call of sorted) {
      if (!map[call.employee]) {
        map[call.employee] = { name: call.employee, calls: 0, totalScore: 0, frustrated: 0, scores: [], callLog: [] }
      }
      map[call.employee].calls++
      map[call.employee].totalScore += call.score
      if (call.frustrated) map[call.employee].frustrated++
      map[call.employee].scores.push(call.score)
      if (call.summary) {
        map[call.employee].callLog.push({ date: call.date, customer: call.customer, summary: call.summary })
      }
    }
    return Object.values(map)
      .map(e => ({
        ...e,
        avgScore:        +(e.totalScore / e.calls).toFixed(1),
        recentScores:    e.scores.slice(-5),
        recentSummaries: e.callLog.slice(-3).reverse(),
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

  const topPerformerData = useMemo(() => {
    const map = {}
    for (const call of filteredCalls) {
      if (!map[call.employee]) map[call.employee] = { name: call.employee, calls: 0, totalScore: 0 }
      map[call.employee].calls++
      map[call.employee].totalScore += call.score
    }
    const top = Object.values(map)
      .filter(e => e.calls >= 2)
      .map(e => ({ ...e, avgScore: +(e.totalScore / e.calls).toFixed(1) }))
      .sort((a, b) => b.avgScore - a.avgScore)[0] ?? null
    if (!top) return null
    const latestCall = [...filteredCalls]
      .filter(c => c.employee === top.name && c.summary)
      .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : (b.time > a.time ? 1 : -1)))[0]
    return { ...top, latestSummary: latestCall?.summary || '', latestCustomer: latestCall?.customer || '' }
  }, [filteredCalls])

  const quickStats = useMemo(() => {
    const total       = filteredCalls.length
    const avgScore    = total
      ? +(filteredCalls.reduce((s, c) => s + c.score, 0) / total).toFixed(1) : 0
    const totalMins   = filteredCalls.reduce((s, c) => s + (c.duration || 0), 0)
    const avgDuration = total ? Math.round(totalMins / total) : 0
    const withScore   = filteredCalls.filter(c => c.score > 0).length
    const responseRate = total ? Math.round((withScore / total) * 100) : 0
    const prevCount   = prevCalls.length
    const callsDelta  = prevCount >= 5 ? pctChange(total, prevCount) : null
    return { avgScore, totalMins: Math.round(totalMins), avgDuration, responseRate, totalCalls: total, callsDelta }
  }, [filteredCalls, prevCalls])

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

  const handleEmployeeClick = (name) => setSelectedEmployee(name)
  const handleAgencyClick   = (name, e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setSelectedAgency({ name, position: { x: rect.left + rect.width / 2, y: rect.bottom } })
  }

  // ── Smart date intelligence ───────────────────────────────────────────────
  const showTodayEmpty     = filter.type === 'today' && filteredCalls.length === 0 && !loading
  const showPeriodBanner   = !['all', 'today', 'custom'].includes(filter.type) && prevCalls.length >= 5
  const periodLabel        = PERIOD_LABEL[filter.type] || 'this period'
  const prevPeriodLabel    = PREV_LABEL[filter.type]   || 'last period'

  if (loading && calls.length === 0) return <LoadingScreen />
  if (error   && calls.length === 0) return <ErrorScreen message={error} onRetry={refetch} />

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <Header
        filter={filter}
        setFilter={setFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        allCategories={allCategories}
        lastUpdated={lastUpdated}
        onRefresh={refetch}
        isRefreshing={loading}
        dataError={error}
      />

      <div className="max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {error && calls.length > 0 && (
          <div className="mb-4 sm:mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
            <span>⚠️</span>
            <span>Auto-refresh failed — showing last known data.{' '}
              <button onClick={refetch} className="underline font-medium">Retry</button>
            </span>
          </div>
        )}

        {showTodayEmpty && (
          <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 flex items-center gap-2">
            <span>📅</span>
            <span>No calls recorded today yet. Data updates every 60 seconds.</span>
          </div>
        )}

        {showPeriodBanner && (
          <div className="mb-4 rounded-xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-heading flex items-center gap-2"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <span>📊</span>
            <span>
              Team handled{' '}
              <strong>{summary.total}</strong> calls {periodLabel} vs{' '}
              <strong>{prevSummary.total}</strong> {prevPeriodLabel}
              {trends.total !== null && (
                <> —{' '}
                  <strong style={{ color: trends.total >= 0 ? '#8CC63F' : '#EF4444' }}>
                    {trends.total >= 0 ? '+' : ''}{trends.total}%
                  </strong>
                </>
              )}
            </span>
          </div>
        )}

        <div className="flex gap-6 xl:gap-7 items-start">
          <div className="flex-1 min-w-0 space-y-4 sm:space-y-6">
            <SummaryCards summary={summary} trends={trends} />
            <QuickStats stats={quickStats} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <TopPerformer performer={topPerformerData} onEmployeeClick={handleEmployeeClick} />
              <div className="lg:col-span-2">
                <EmployeeTable employees={employeeStats} onEmployeeClick={handleEmployeeClick} />
              </div>
            </div>

            <TeamInsights calls={filteredCalls} prevCalls={prevCalls} />

            <MeetingsChart data={chartData} />
            <ResolutionTracker calls={frustratedCalls} statuses={statuses} />
            <FrustratedTable
              calls={frustratedCalls}
              statuses={statuses}
              setStatus={setStatus}
              onEmployeeClick={handleEmployeeClick}
              onAgencyClick={handleAgencyClick}
            />
          </div>

          <aside className="hidden xl:flex flex-col w-[300px] 2xl:w-[320px] flex-shrink-0 sticky top-[105px]">
            <ActivityFeed
              calls={recentActivity}
              onEmployeeClick={handleEmployeeClick}
              onAgencyClick={handleAgencyClick}
            />
          </aside>
        </div>
      </div>

      <footer className="mt-12 py-5 border-t border-brand-border text-center text-[11px] text-brand-muted/60 tracking-widest uppercase">
        Little Giant Marketing &mdash; Quality Control Dashboard
      </footer>

      {selectedEmployee && (
        <EmployeeModal
          employeeName={selectedEmployee}
          calls={filteredCalls}
          periodLabel={getModalPeriodLabel(filter, categoryFilter)}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
      {selectedAgency.name && (
        <AgencyCard
          agencyName={selectedAgency.name}
          calls={calls}
          position={selectedAgency.position}
          onClose={() => setSelectedAgency({ name: null, position: null })}
        />
      )}
    </div>
  )
}
