import { useState, useMemo, useCallback } from 'react'

import { useEmployeeHealthSheet } from './hooks/useEmployeeHealthSheet'
import { useCallStatus }          from './hooks/useCallStatus'
import { useCoachingStatus }      from './hooks/useCoachingStatus'

import {
  filterCalls, getPrevCalls, calcSummary, aggregateEmployees,
  calcTopPerformer, buildChartData, calcQuickStats, getFrustratedCalls,
} from './lib/ehUtils'

import Header              from './components/Header'
import TabSwitcher         from './components/TabSwitcher'
import SummaryCards        from './components/SummaryCards'
import QuickStats          from './components/QuickStats'
import TopPerformer        from './components/TopPerformer'
import EmployeeTable       from './components/EmployeeTable'
import NeedCoaching        from './components/NeedCoaching'
import MeetingsChart       from './components/MeetingsChart'
import VerdictDistribution from './components/VerdictDistribution'
import CategoryPerformance from './components/CategoryPerformance'
import BehaviorInsights    from './components/BehaviorInsights'
import ResolutionTracker   from './components/ResolutionTracker'
import FrustratedTable     from './components/FrustratedTable'
import ActivityFeed        from './components/ActivityFeed'
import HealthDashboard     from './components/health/HealthDashboard'

import CallDetailModal     from './components/modals/CallDetailModal'
import EmployeeDetailModal from './components/modals/EmployeeDetailModal'
import CoachingModal       from './components/modals/CoachingModal'

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
  const [activeTab, setActiveTab] = useState(() =>
    localStorage.getItem('lgm-active-tab') || 'qc'
  )

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab)
    localStorage.setItem('lgm-active-tab', tab)
  }, [])

  // ── QC state ────────────────────────────────────────────────────────────────
  const [filter, setFilter]                 = useState({ type: 'today', from: '', to: '' })
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [searchQuery, setSearchQuery]       = useState('')

  const [modalStack, setModalStack] = useState([])
  const currentModal = modalStack.length > 0 ? modalStack[modalStack.length - 1] : null
  const canGoBack    = modalStack.length > 1
  const pushModal  = useCallback((m) => setModalStack(s => [...s, m]), [])
  const popModal   = useCallback(()  => setModalStack(s => s.slice(0, -1)), [])
  const closeAll   = useCallback(()  => setModalStack([]), [])

  const { statuses, setStatus } = useCallStatus()
  const { statuses: coachingStatuses, toggleRec: toggleCoachingRec, isCoachingComplete, resetEmployee: resetCoaching, markAllComplete: markAllCoachingComplete } = useCoachingStatus()

  const { calls, loading, error, lastUpdated, refetch, retrying } = useEmployeeHealthSheet()

  // ── Health tab state ────────────────────────────────────────────────────────
  const [healthFilters, setHealthFilters] = useState({
    search: '', typeFilter: 'all', bandFilter: 'all',
    dateRange: { type: 'all', from: '', to: '' },
  })

  // ── QC derived data ─────────────────────────────────────────────────────────
  const allCategories = useMemo(() => {
    const cats = new Set(calls.map(c => c.category).filter(Boolean))
    return [...cats].sort()
  }, [calls])

  const allEmployees = useMemo(() => {
    const emps = new Set(calls.map(c => c.employee).filter(Boolean))
    return [...emps].sort()
  }, [calls])

  const filteredCalls = useMemo(() => {
    let result = filterCalls(calls, filter)
    if (categoryFilter !== 'all') result = result.filter(c => c.category === categoryFilter)
    if (employeeFilter !== 'all') result = result.filter(c => c.employee === employeeFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c =>
        c.employee?.toLowerCase().includes(q) ||
        c.customer?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.meetingId?.toLowerCase().includes(q) ||
        c.date?.includes(q) ||
        c.finalVerdict?.toLowerCase().includes(q) ||
        c.status?.toLowerCase().includes(q) ||
        c.summary?.toLowerCase().includes(q)
      )
    }
    return result
  }, [calls, filter, categoryFilter, employeeFilter, searchQuery])

  const prevCalls = useMemo(() => getPrevCalls(calls, filter), [calls, filter])

  const summary         = useMemo(() => calcSummary(filteredCalls),             [filteredCalls])
  const prevSummary     = useMemo(() => calcSummary(prevCalls),                 [prevCalls])
  const employees       = useMemo(() => aggregateEmployees(filteredCalls),      [filteredCalls])
  const topPerformer    = useMemo(() => calcTopPerformer(filteredCalls),        [filteredCalls])
  const chartData       = useMemo(() => buildChartData(filteredCalls, filter),  [filteredCalls, filter])
  const quickStats      = useMemo(() => calcQuickStats(filteredCalls, prevCalls, filter), [filteredCalls, prevCalls, filter])
  const frustratedCalls = useMemo(() => getFrustratedCalls(filteredCalls),      [filteredCalls])

  const coachingNeeded = useMemo(() =>
    employees.filter(e => e.coaching > 0 && !isCoachingComplete(e.name, e.coachingRecs?.length)).length
  , [employees, isCoachingComplete])

  const recentActivity = useMemo(() =>
    [...calls].sort((a, b) => b._rowIdx - a._rowIdx).slice(0, 15),
    [calls]
  )

  const canCompare = prevCalls.length >= 3 && !['all', 'today', 'yesterday', 'custom'].includes(filter.type)
  const trends = useMemo(() => ({
    total:      canCompare ? (summary.total      - prevSummary.total)      : null,
    positive:   canCompare ? (summary.positive   - prevSummary.positive)   : null,
    frustrated: canCompare ? (summary.frustrated - prevSummary.frustrated) : null,
  }), [summary, prevSummary, canCompare])

  if (loading && calls.length === 0) return <LoadingScreen />
  if (error   && calls.length === 0) return <ErrorScreen message={error} onRetry={refetch} />

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      {/* Shared header (QC tab only — health has its own filter bar) */}
      {activeTab === 'qc' && (
        <Header
          filter={filter}           setFilter={setFilter}
          categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} allCategories={allCategories}
          employeeFilter={employeeFilter} setEmployeeFilter={setEmployeeFilter} allEmployees={allEmployees}
          searchQuery={searchQuery}  setSearchQuery={setSearchQuery}
          searchResultCount={searchQuery.trim() ? filteredCalls.length : null}
          lastUpdated={lastUpdated}  onRefresh={refetch}
          isRefreshing={loading}     retrying={retrying} dataError={error}
        />
      )}

      {activeTab === 'health' && (
        <header className="sticky top-0 z-50 bg-white border-b border-brand-border"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderTop: '3px solid #8CC63F' }}>
          <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 h-[60px] flex items-center">
            <div className="flex items-center gap-3 min-w-0">
              <img src="/lgm-logo.png" alt="Little Giant Marketing"
                className="h-8 sm:h-9 w-auto flex-shrink-0 object-contain"
                onError={(e) => { e.target.style.display = 'none' }} />
              <div className="hidden sm:block leading-tight min-w-0">
                <p className="shimmer-text text-[10px] font-extrabold tracking-[0.2em] uppercase leading-none">
                  Little Giant Marketing
                </p>
                <p className="text-brand-heading font-semibold text-[14px] leading-tight mt-0.5">
                  Customer Health
                </p>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Tab switcher — always visible */}
      <TabSwitcher activeTab={activeTab} setActiveTab={handleTabChange} />

      {/* ── QC Tab ─────────────────────────────────────────────────────────── */}
      {activeTab === 'qc' && (
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
            <div className="flex-1 min-w-0 space-y-6">
              <SummaryCards summary={summary} trends={trends} />
              <QuickStats stats={quickStats} coachingNeeded={coachingNeeded} />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="flex flex-col gap-6">
                  <TopPerformer performer={topPerformer} onEmployeeClick={(n) => pushModal({ type: 'employee', id: n })} />
                  <NeedCoaching
                    employees={employees}
                    onEmployeeClick={(n) => pushModal({ type: 'employee', id: n })}
                    onCoachingClick={(n) => pushModal({ type: 'coaching', id: n })}
                    isComplete={isCoachingComplete}
                    onClearAll={() => markAllCoachingComplete(employees)}
                  />
                </div>
                <div className="lg:col-span-2">
                  <EmployeeTable
                    employees={employees}
                    onEmployeeClick={(n) => pushModal({ type: 'employee', id: n })}
                    onCoachingClick={(n) => pushModal({ type: 'coaching', id: n })}
                  />
                </div>
              </div>

              <MeetingsChart data={chartData} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <VerdictDistribution calls={filteredCalls} />
                <CategoryPerformance calls={filteredCalls} />
              </div>

              <BehaviorInsights calls={filteredCalls} />
              <ResolutionTracker calls={frustratedCalls} statuses={statuses} />
              <FrustratedTable
                calls={frustratedCalls}
                statuses={statuses}
                setStatus={setStatus}
                onEmployeeClick={(n)  => pushModal({ type: 'employee', id: n })}
                onCallClick={(mid)    => pushModal({ type: 'call',     id: mid })}
              />
            </div>

            <aside className="hidden xl:flex flex-col w-[320px] flex-shrink-0 sticky top-20">
              <ActivityFeed
                calls={recentActivity}
                onEmployeeClick={(n)  => pushModal({ type: 'employee', id: n })}
                onCallClick={(mid)    => pushModal({ type: 'call',     id: mid })}
              />
            </aside>
          </div>
        </div>
      )}

      {/* ── Customer Health Tab ─────────────────────────────────────────────── */}
      {activeTab === 'health' && (
        <HealthDashboard filters={healthFilters} setFilters={setHealthFilters} />
      )}

      <footer className="mt-12 py-5 border-t border-brand-border text-center text-[11px] text-brand-muted/60 tracking-widest uppercase">
        Little Giant Marketing &mdash; {activeTab === 'health' ? 'Customer Health Dashboard (Beta)' : 'Team AI Assistant'}
      </footer>

      {/* ── Modal stack (QC tab) ───────────────────────────────────────────── */}
      {currentModal?.type === 'employee' && (
        <EmployeeDetailModal
          key={currentModal.id}
          employeeName={currentModal.id}
          allCalls={calls}
          filter={filter}
          onClose={closeAll}
          onBack={canGoBack ? popModal : null}
          onCallClick={(mid)    => pushModal({ type: 'call',     id: mid })}
          onCoachingClick={(n)  => pushModal({ type: 'coaching', id: n })}
          statuses={statuses}
          setStatus={setStatus}
        />
      )}
      {currentModal?.type === 'call' && (
        <CallDetailModal
          key={currentModal.id}
          meetingId={currentModal.id}
          allCalls={calls}
          onClose={closeAll}
          onBack={canGoBack ? popModal : null}
          onEmployeeClick={(name) => pushModal({ type: 'employee', id: name })}
        />
      )}
      {currentModal?.type === 'coaching' && (
        <CoachingModal
          key={currentModal.id}
          employeeName={currentModal.id}
          allCalls={calls}
          coachingStatuses={coachingStatuses}
          onToggleRec={toggleCoachingRec}
          onResetCoaching={resetCoaching}
          onClose={closeAll}
          onBack={canGoBack ? popModal : null}
          onEmployeeClick={(name) => pushModal({ type: 'employee', id: name })}
        />
      )}
    </div>
  )
}
