import { useState, useMemo, useCallback } from 'react'

import { useEmployeeHealthSheet } from './hooks/useEmployeeHealthSheet'
import { useCallStatus }          from './hooks/useCallStatus'

import {
  filterCalls, getPrevCalls, calcSummary, aggregateEmployees,
  calcTopPerformer, buildChartData, calcQuickStats, getFrustratedCalls,
} from './lib/ehUtils'

import Header          from './components/Header'
import SummaryCards    from './components/SummaryCards'
import QuickStats      from './components/QuickStats'
import TopPerformer    from './components/TopPerformer'
import EmployeeTable   from './components/EmployeeTable'
import MeetingsChart   from './components/MeetingsChart'
import ResolutionTracker from './components/ResolutionTracker'
import FrustratedTable from './components/FrustratedTable'
import ActivityFeed    from './components/ActivityFeed'

import CallDetailModal     from './components/modals/CallDetailModal'
import EmployeeDetailModal from './components/modals/EmployeeDetailModal'

// ─── Loading / Error screens ──────────────────────────────────────────────────
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

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [filter, setFilter]                 = useState({ type: '30d', from: '', to: '' })
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [searchQuery, setSearchQuery]       = useState('')

  // null | { type: 'call'|'employee', id: string }
  const [modal, setModal] = useState(null)

  const openCall     = useCallback((meetingId) => setModal({ type: 'call',     id: meetingId }), [])
  const openEmployee = useCallback((name)       => setModal({ type: 'employee', id: name }),      [])
  const closeModal   = useCallback(()           => setModal(null),                                 [])

  const { statuses, setStatus } = useCallStatus()

  const { calls, loading, error, lastUpdated, refetch, retrying } = useEmployeeHealthSheet()

  // ── Derived filters ────────────────────────────────────────────────────────
  const allCategories = useMemo(() => {
    const cats = new Set(calls.map(c => c.category).filter(Boolean))
    return [...cats].sort()
  }, [calls])

  const allEmployees = useMemo(() => {
    const emps = new Set(calls.map(c => c.employee).filter(Boolean))
    return [...emps].sort()
  }, [calls])

  // ── Filtered calls ─────────────────────────────────────────────────────────
  const filteredCalls = useMemo(() => {
    let result = filterCalls(calls, filter)
    if (categoryFilter !== 'all')
      result = result.filter(c => c.category === categoryFilter)
    if (employeeFilter !== 'all')
      result = result.filter(c => c.employee === employeeFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c =>
        c.employee?.toLowerCase().includes(q) ||
        c.customer?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q)
      )
    }
    return result
  }, [calls, filter, categoryFilter, employeeFilter, searchQuery])

  const prevCalls = useMemo(() => getPrevCalls(calls, filter), [calls, filter])

  // ── All derived data (all hooks before conditional returns) ────────────────
  const summary       = useMemo(() => calcSummary(filteredCalls),           [filteredCalls])
  const prevSummary   = useMemo(() => calcSummary(prevCalls),               [prevCalls])
  const employees     = useMemo(() => aggregateEmployees(filteredCalls),    [filteredCalls])
  const topPerformer  = useMemo(() => calcTopPerformer(filteredCalls),      [filteredCalls])
  const chartData     = useMemo(() => buildChartData(filteredCalls, filter), [filteredCalls, filter])
  const quickStats    = useMemo(() => calcQuickStats(filteredCalls, prevCalls, filter), [filteredCalls, prevCalls, filter])
  const frustratedCalls = useMemo(() => getFrustratedCalls(filteredCalls),  [filteredCalls])

  const recentActivity = useMemo(() =>
    [...calls]
      .sort((a, b) => {
        if (b.date !== a.date) return b.date > a.date ? 1 : -1
        return (b.time || '') > (a.time || '') ? 1 : -1
      })
      .slice(0, 15),
    [calls]
  )

  const canCompare = prevCalls.length >= 5 && !['all', 'today', 'custom'].includes(filter.type)
  const trends = useMemo(() => ({
    total:      canCompare ? (summary.total - prevSummary.total) : null,
    positive:   canCompare ? (summary.positive - prevSummary.positive) : null,
    frustrated: canCompare ? (summary.frustrated - prevSummary.frustrated) : null,
  }), [summary, prevSummary, canCompare])

  // ── Early returns ──────────────────────────────────────────────────────────
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
        employeeFilter={employeeFilter}
        setEmployeeFilter={setEmployeeFilter}
        allEmployees={allEmployees}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        lastUpdated={lastUpdated}
        onRefresh={refetch}
        isRefreshing={loading}
        retrying={retrying}
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

        {!loading && filteredCalls.length === 0 && calls.length > 0 && (
          <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 flex items-center gap-2">
            <span>📅</span>
            <span>No calls match the current filters. Try adjusting the date range or clearing filters.</span>
          </div>
        )}

        <div className="flex gap-7 items-start">
          {/* ── Main column ─────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-6">

            <SummaryCards summary={summary} trends={trends} />
            <QuickStats stats={quickStats} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <TopPerformer performer={topPerformer} onEmployeeClick={openEmployee} />
              <div className="lg:col-span-2">
                <EmployeeTable employees={employees} onEmployeeClick={openEmployee} />
              </div>
            </div>

            <MeetingsChart data={chartData} />
            <ResolutionTracker calls={frustratedCalls} statuses={statuses} />
            <FrustratedTable
              calls={frustratedCalls}
              statuses={statuses}
              setStatus={setStatus}
              onEmployeeClick={openEmployee}
              onCallClick={openCall}
            />
          </div>

          {/* ── Sidebar ─────────────────────────────────────────────────── */}
          <aside className="hidden xl:flex flex-col w-[320px] flex-shrink-0 sticky top-20">
            <ActivityFeed
              calls={recentActivity}
              onEmployeeClick={openEmployee}
              onCallClick={openCall}
            />
          </aside>
        </div>
      </div>

      <footer className="mt-12 py-5 border-t border-brand-border text-center text-[11px] text-brand-muted/60 tracking-widest uppercase">
        Little Giant Marketing &mdash; Employee Health Dashboard
      </footer>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {modal?.type === 'call' && (
        <CallDetailModal
          meetingId={modal.id}
          allCalls={calls}
          onClose={closeModal}
          onEmployeeClick={(name) => { closeModal(); setTimeout(() => openEmployee(name), 50) }}
        />
      )}
      {modal?.type === 'employee' && (
        <EmployeeDetailModal
          employeeName={modal.id}
          allCalls={calls}
          onClose={closeModal}
          onCallClick={(mid) => { closeModal(); setTimeout(() => openCall(mid), 50) }}
        />
      )}
    </div>
  )
}
