import { useState, useMemo, useEffect } from 'react'
import { format, subDays, startOfMonth, endOfMonth, subMonths, differenceInDays, parseISO, isValid } from 'date-fns'
import { useMergedHealthData }    from '../../hooks/useMergedHealthData'
import { useAccountStatus }       from '../../hooks/useAccountStatus'
import { scoreAccount, classify, isAtRisk, recommendAction } from '../../lib/healthEngine'
import HealthFilterBar            from './HealthFilterBar'
import HealthSummaryCards         from './HealthSummaryCards'
import ResolutionTrackerHealth    from './ResolutionTrackerHealth'
import NeedsAttentionTable        from './NeedsAttentionTable'
import MasterAccountsTable        from './MasterAccountsTable'
import HealthCharts               from './HealthCharts'
import QuickWins                  from './QuickWins'
import AccountModal               from './AccountModal'

const G = '#8CC63F'

function getDateWindow(dateRange) {
  if (dateRange.type === 'all') return { from: '0000-01-01', to: '9999-12-31' }
  const today = new Date()
  if (dateRange.type === 'last_7')     return { from: format(subDays(today, 7), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') }
  if (dateRange.type === 'this_month') return { from: format(startOfMonth(today), 'yyyy-MM-dd'), to: format(endOfMonth(today), 'yyyy-MM-dd') }
  if (dateRange.type === 'last_month') {
    const prev = subMonths(today, 1)
    return { from: format(startOfMonth(prev), 'yyyy-MM-dd'), to: format(endOfMonth(prev), 'yyyy-MM-dd') }
  }
  if (dateRange.type === 'last_30') return { from: format(subDays(today, 30), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') }
  if (dateRange.type === 'last_90') return { from: format(subDays(today, 90), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') }
  if (dateRange.type === 'custom')  return { from: dateRange.from || '0000-01-01', to: dateRange.to || format(today, 'yyyy-MM-dd') }
  return { from: '0000-01-01', to: '9999-12-31' }
}

function timeAgo(date) {
  if (!date) return '—'
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60)  return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

function RefreshIcon({ spinning }) {
  return (
    <svg className={`w-3.5 h-3.5 ${spinning ? 'animate-spin-slow' : ''}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
      <path d="M21 3v5h-5"/>
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
      <path d="M8 16H3v5"/>
    </svg>
  )
}

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-5">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-brand-border" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-green animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-brand-heading font-semibold text-sm">Loading GHL sub-accounts…</p>
        <p className="text-brand-muted text-[11px] mt-1">Pulling live data from GoHighLevel API</p>
      </div>
    </div>
  )
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center max-w-lg mx-auto my-12">
      <p className="text-3xl mb-3">⚠️</p>
      <h3 className="text-brand-heading font-bold text-base mb-2">Could not load GHL data</h3>
      <p className="text-brand-muted text-sm mb-5">{message}</p>
      <button onClick={onRetry} className="px-5 py-2 rounded-xl text-white text-sm font-semibold"
        style={{ background: G, boxShadow: `0 2px 8px ${G}35` }}>
        Try Again
      </button>
    </div>
  )
}

export default function HealthDashboard({ filters, setFilters }) {
  const { accounts: raw, loading, error, lastUpdated, refetch } = useMergedHealthData()
  const { statuses, setStatus } = useAccountStatus()
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [elapsed, setElapsed] = useState('—')

  useEffect(() => {
    const tick = () => setElapsed(timeAgo(lastUpdated))
    tick()
    const id = setInterval(tick, 15_000)
    return () => clearInterval(id)
  }, [lastUpdated])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSelectedAccount(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Enrich with health scores
  const accounts = useMemo(() =>
    raw.map(a => {
      const { score, parts } = scoreAccount(a)
      const band   = classify(score)
      const action = recommendAction(a)
      return { ...a, _health: { score, parts, band, action } }
    }),
    [raw]
  )

  // Apply filters
  const filteredAccounts = useMemo(() => {
    const { from, to } = getDateWindow(filters.dateRange)
    const srch = filters.search.toLowerCase().trim()
    return accounts.filter(a => {
      if (srch && !a.accountName.toLowerCase().includes(srch) &&
          !(a.ghlEmail || '').toLowerCase().includes(srch) &&
          !(a.ghlCity  || '').toLowerCase().includes(srch)) return false
      if (filters.bandFilter !== 'all' && a._health?.band !== filters.bandFilter) return false
      if (filters.dateRange.type !== 'all') {
        const d = a.ghlDateAdded || ''
        if (!d || d < from || d > to) return false
      }
      return true
    })
  }, [accounts, filters])

  // KPIs — derived from full account list (not filtered by date)
  const activeAccounts = useMemo(() =>
    accounts.filter(a => { const d = Number(a.ghlDaysSinceUpdate); return !isNaN(d) && d <= 30 }),
    [accounts]
  )
  const staleAccounts = useMemo(() =>
    accounts.filter(isAtRisk).sort((a, b) =>
      (Number(b.ghlDaysSinceUpdate) || 0) - (Number(a.ghlDaysSinceUpdate) || 0)
    ),
    [accounts]
  )

  const { newAccounts, newPeriodLabel } = useMemo(() => {
    const today = new Date()
    const isAllTime = filters.dateRange.type === 'all'
    const from  = isAllTime ? format(subDays(today, 30), 'yyyy-MM-dd') : getDateWindow(filters.dateRange).from
    const to    = isAllTime ? format(today, 'yyyy-MM-dd')              : getDateWindow(filters.dateRange).to
    const label = isAllTime ? 'last 30 days' : ({
      last_7: 'last 7 days', this_month: 'this month', last_month: 'last month',
      last_30: 'last 30 days', last_90: 'last 90 days',
    }[filters.dateRange.type] || 'selected period')
    const list = accounts.filter(a => { const d = a.ghlDateAdded || ''; return d && d >= from && d <= to })
    return { newAccounts: list, newPeriodLabel: label }
  }, [accounts, filters.dateRange])

  const avgScore = useMemo(() => {
    if (!accounts.length) return 0
    return accounts.reduce((s, a) => s + (a._health?.score ?? 0), 0) / accounts.length
  }, [accounts])

  const avgTenureDays = useMemo(() => {
    const withDate = accounts.filter(a => a.ghlDateAdded)
    if (!withDate.length) return 0
    const total = withDate.reduce((s, a) => {
      try {
        const d = parseISO(a.ghlDateAdded)
        return isValid(d) ? s + differenceInDays(new Date(), d) : s
      } catch { return s }
    }, 0)
    return total / withDate.length
  }, [accounts])

  // QuickWins: top 3 most stale + top 3 newest
  const top3Stale = staleAccounts.slice(0, 3)
  const top3New   = useMemo(() =>
    [...accounts]
      .filter(a => a.ghlDateAdded)
      .sort((a, b) => (b.ghlDateAdded || '').localeCompare(a.ghlDateAdded || ''))
      .slice(0, 3),
    [accounts]
  )

  if (loading && raw.length === 0) return <LoadingScreen />
  if (error   && raw.length === 0) return <ErrorBanner message={error} onRetry={refetch} />

  return (
    <div className="max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">

      {/* Data source badge */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-border bg-white text-[11px] text-brand-muted"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse flex-shrink-0" />
        <span>
          <strong className="text-brand-text">{accounts.length} GHL sub-accounts</strong> · Live from GoHighLevel Agency API · Updated every 5 minutes
        </span>
        <span className="ml-auto text-brand-muted/60">{lastUpdated ? `Synced ${elapsed}` : 'Syncing…'}</span>
      </div>

      {/* Sub-header */}
      <div className="flex items-center gap-3">
        <button onClick={refetch}
          className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border bg-brand-bg text-brand-muted hover:text-brand-text border-brand-border">
          <RefreshIcon spinning={loading} />
          <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
        </button>
        {error && raw.length > 0 && (
          <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
            ⚠ Auto-refresh failed — showing last known data
          </div>
        )}
      </div>

      {/* Filter bar */}
      <HealthFilterBar
        filters={filters}
        setFilters={setFilters}
        accountTypes={[]}
        totalShowing={filteredAccounts.length}
        totalAll={accounts.length}
      />

      {/* 1. KPI summary cards */}
      <HealthSummaryCards
        total={accounts.length}
        activeCount={activeAccounts.length}
        staleCount={staleAccounts.length}
        newCount={newAccounts.length}
        newPeriodLabel={newPeriodLabel}
        avgScore={avgScore}
        avgTenureDays={avgTenureDays}
      />

      {/* 2. Quick Wins — do these today */}
      <QuickWins
        topStale={top3Stale}
        topNew={top3New}
        onAccountClick={setSelectedAccount}
      />

      {/* 3. Resolution tracker */}
      <ResolutionTrackerHealth accounts={staleAccounts} statuses={statuses} />

      {/* 4. Needs Attention — stale accounts with outreach tracking */}
      <NeedsAttentionTable
        accounts={staleAccounts}
        statuses={statuses}
        setStatus={setStatus}
        onAccountClick={setSelectedAccount}
      />

      {/* 5. Charts — health distribution, join timeline, activity histogram */}
      <HealthCharts accounts={filteredAccounts} />

      {/* 6. Master accounts table — full portfolio */}
      <MasterAccountsTable
        accounts={filteredAccounts}
        onAccountClick={setSelectedAccount}
      />

      {/* Account detail modal */}
      {selectedAccount && (
        <AccountModal
          account={selectedAccount}
          onClose={() => setSelectedAccount(null)}
        />
      )}
    </div>
  )
}
