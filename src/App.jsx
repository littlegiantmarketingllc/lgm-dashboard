import { useState, useMemo, useEffect, useCallback } from 'react'
import { format, subDays } from 'date-fns'

// Data hook
import { useQCSheet }     from './hooks/useQCSheet'

// Utilities
import { applyAllFilters, uniqueMeetingIds } from './lib/qcUtils'

// Layout
import Header      from './components/Header'
import TabSwitcher from './components/TabSwitcher'

// QC components
import KPICards                  from './components/qc/KPICards'
import NeedsAttentionPanel       from './components/qc/NeedsAttentionPanel'
import EmployeePerformanceTable  from './components/qc/EmployeePerformanceTable'
import VerdictDistributionChart  from './components/qc/VerdictDistributionChart'
import CategoryPerformanceChart  from './components/qc/CategoryPerformanceChart'
import ScoreTrendsChart          from './components/qc/ScoreTrendsChart'
import RecentCallsFeed           from './components/qc/RecentCallsFeed'
import BehaviorInsightsChart     from './components/qc/BehaviorInsightsChart'

// Modals
import CallDetailModal      from './components/modals/CallDetailModal'
import EmployeeProfileModal from './components/modals/EmployeeProfileModal'
import CustomerProfileModal from './components/modals/CustomerProfileModal'

// Customer Health tab
import CustomerHealthPage from './components/health/CustomerHealthPage'

const TAB_KEY      = 'lgm-active-tab'
const HANDLED_KEY  = 'lgm-handled-items'

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
          <p>1. Open the QA sheet → <strong>File → Share → Publish to web</strong></p>
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

// ─── Main app ─────────────────────────────────────────────────────────────────
export default function App() {
  // Tab persistence
  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem(TAB_KEY) || 'qc' } catch { return 'qc' }
  })
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    try { localStorage.setItem(TAB_KEY, tab) } catch {}
  }

  // Filters
  const [dateFilter, setDateFilter]         = useState({ type: '30d', from: '', to: '' })
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [searchQuery, setSearchQuery]       = useState('')

  // Modal state: null | { type: 'call'|'employee'|'customer', id: string }
  const [modal, setModal] = useState(null)

  // Handled items (client-side "Mark as handled")
  const [handledIds, setHandledIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(HANDLED_KEY) || '[]')) }
    catch { return new Set() }
  })

  const handleToggleHandled = useCallback((id) => {
    setHandledIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try { localStorage.setItem(HANDLED_KEY, JSON.stringify([...next])) } catch {}
      return next
    })
  }, [])

  // Modal openers
  const openCall     = useCallback((meetingId)   => setModal({ type: 'call',     id: meetingId }),   [])
  const openEmployee = useCallback((name)         => setModal({ type: 'employee', id: name }),        [])
  const openCustomer = useCallback((name)         => setModal({ type: 'customer', id: name }),        [])
  const closeModal   = useCallback(()             => setModal(null),                                   [])

  // Escape key closes modal
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setModal(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Data
  const { calls, loading, error, lastUpdated, refetch, retrying } = useQCSheet()

  // Derived filter options
  const allCategories = useMemo(() => {
    const cats = new Set(calls.map(c => c.category).filter(Boolean))
    return [...cats].sort()
  }, [calls])

  const allEmployees = useMemo(() => {
    const emps = new Set(calls.map(c => c.employee).filter(Boolean))
    return [...emps].sort()
  }, [calls])

  // Filtered calls (respect ALL filters)
  const filteredCalls = useMemo(() =>
    applyAllFilters(calls, { dateFilter, categoryFilter, employeeFilter, searchQuery }),
    [calls, dateFilter, categoryFilter, employeeFilter, searchQuery]
  )

  // Show loading/error for initial load on QC tab
  if (loading && calls.length === 0 && activeTab === 'qc') return <LoadingScreen />
  if (error   && calls.length === 0 && activeTab === 'qc') return <ErrorScreen message={error} onRetry={refetch} />

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <Header
        filter={dateFilter}
        setFilter={setDateFilter}
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
      <TabSwitcher activeTab={activeTab} setActiveTab={handleTabChange} />

      {/* ── CUSTOMER HEALTH TAB ─────────────────────────────────────── */}
      {activeTab === 'health' && (
        <CustomerHealthPage
          calls={calls}
          onCustomerClick={openCustomer}
        />
      )}

      {/* ── QUALITY CONTROL TAB ────────────────────────────────────── */}
      {activeTab === 'qc' && (
        <div className="max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">

          {/* Stale data warning */}
          {error && calls.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
              <span>⚠️</span>
              <span>
                Auto-refresh failed — showing last known data.{' '}
                <button onClick={refetch} className="underline font-medium">Retry</button>
              </span>
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredCalls.length === 0 && calls.length > 0 && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 flex items-center gap-2">
              <span>📅</span>
              <span>No calls match the current filters. Try adjusting the date range or clearing filters.</span>
            </div>
          )}

          {/* 5 KPI cards */}
          <KPICards calls={filteredCalls} />

          {/* Needs Attention panel */}
          <NeedsAttentionPanel
            calls={filteredCalls}
            handledIds={handledIds}
            onToggleHandled={handleToggleHandled}
            onOpenCall={openCall}
          />

          {/* Employee Performance Table */}
          <EmployeePerformanceTable
            calls={filteredCalls}
            onEmployeeClick={openEmployee}
          />

          {/* Verdict Distribution + Category Performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <VerdictDistributionChart calls={filteredCalls} />
            <CategoryPerformanceChart calls={filteredCalls} />
          </div>

          {/* Score Trends */}
          <ScoreTrendsChart calls={filteredCalls} dateFilter={dateFilter} />

          {/* Recent Calls + Behavior Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <RecentCallsFeed
              calls={filteredCalls}
              onCallClick={openCall}
              onCustomerClick={openCustomer}
            />
            <BehaviorInsightsChart calls={filteredCalls} />
          </div>
        </div>
      )}

      <footer className="mt-12 py-5 border-t border-brand-border text-center text-[11px] text-brand-muted/60 tracking-widest uppercase">
        Little Giant Marketing &mdash; {activeTab === 'health' ? 'Customer Health' : 'Quality Control'} Dashboard
      </footer>

      {/* ── MODALS ──────────────────────────────────────────────────── */}
      {modal?.type === 'call' && (
        <CallDetailModal
          meetingId={modal.id}
          allCalls={calls}
          onClose={closeModal}
          onEmployeeClick={(name) => { closeModal(); setTimeout(() => openEmployee(name), 50) }}
          onCustomerClick={(name) => { closeModal(); setTimeout(() => openCustomer(name), 50) }}
        />
      )}
      {modal?.type === 'employee' && (
        <EmployeeProfileModal
          employeeName={modal.id}
          allCalls={calls}
          onClose={closeModal}
          onCallClick={(mid)  => { closeModal(); setTimeout(() => openCall(mid), 50) }}
          onCustomerClick={(name) => { closeModal(); setTimeout(() => openCustomer(name), 50) }}
        />
      )}
      {modal?.type === 'customer' && (
        <CustomerProfileModal
          customerName={modal.id}
          allCalls={calls}
          onClose={closeModal}
          onCallClick={(mid) => { closeModal(); setTimeout(() => openCall(mid), 50) }}
          onEmployeeClick={(name) => { closeModal(); setTimeout(() => openEmployee(name), 50) }}
        />
      )}
    </div>
  )
}
