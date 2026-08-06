import { useState, useMemo, useEffect } from 'react'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { useMergedHealthData } from '../../hooks/useMergedHealthData'
import { useAccountStatus }    from '../../hooks/useAccountStatus'
import { scoreAccount, classify, isAtRisk, recommendAction, activeAccounts } from '../../lib/healthEngine'
import HealthFilterBar    from './HealthFilterBar'
import HealthSummaryCards from './HealthSummaryCards'
import MasterAccountsTable from './MasterAccountsTable'
import AccountModal       from './AccountModal'

const G = '#8CC63F'

function getDateWindow(dateRange) {
  if (dateRange.type === 'all') return { from: '0000-01-01', to: '9999-12-31' }
  const today = new Date()
  if (dateRange.type === 'last_7')    return { from: format(subDays(today, 7),  'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') }
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
      <button onClick={onRetry}
        className="px-5 py-2 rounded-xl text-white text-sm font-semibold"
        style={{ background: G, boxShadow: `0 2px 8px ${G}35` }}>
        Try Again
      </button>
    </div>
  )
}

export default function HealthDashboard({ filters, setFilters }) {
  const { accounts: raw, loading, error, lastUpdated, refetch } = useMergedHealthData()
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

  // KPI calculations
  const activeAccts = useMemo(() => activeAccounts(accounts), [accounts])
  const staleAccts  = useMemo(() => accounts.filter(a => {
    const d = Number(a.ghlDaysSinceUpdate)
    return !isNaN(d) && d > 30
  }), [accounts])

  const { newAccounts, newPeriodLabel } = useMemo(() => {
    const today = new Date()
    const isAllTime = filters.dateRange.type === 'all'
    const from  = isAllTime ? format(subDays(today, 30), 'yyyy-MM-dd') : getDateWindow(filters.dateRange).from
    const to    = isAllTime ? format(today, 'yyyy-MM-dd')              : getDateWindow(filters.dateRange).to
    const label = isAllTime ? 'last 30 days' : ({
      last_7: 'last 7 days', this_month: 'this month', last_month: 'last month',
      last_30: 'last 30 days', last_90: 'last 90 days',
    }[filters.dateRange.type] || 'selected period')
    const list = accounts.filter(a => {
      const d = a.ghlDateAdded || ''
      return d && d >= from && d <= to
    })
    return { newAccounts: list, newPeriodLabel: label }
  }, [accounts, filters.dateRange])

  if (loading && raw.length === 0) return <LoadingScreen />
  if (error   && raw.length === 0) return <ErrorBanner message={error} onRetry={refetch} />

  return (
    <div className="max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">

      {/* Data source badge */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-border bg-white text-[11px] text-brand-muted"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse flex-shrink-0" />
        <span>
          <strong className="text-brand-text">{accounts.length} GHL sub-accounts</strong> · Live from GoHighLevel Agency API · No billing sheet
        </span>
        <span className="ml-auto text-brand-muted/60">{lastUpdated ? `Synced ${elapsed}` : 'Syncing…'}</span>
      </div>

      {/* Sub-header */}
      <div className="flex items-center gap-3">
        <button
          onClick={refetch}
          className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border bg-brand-bg text-brand-muted hover:text-brand-text border-brand-border"
        >
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

      {/* KPI cards */}
      <HealthSummaryCards
        total={accounts.length}
        newCount={newAccounts.length}
        newPeriodLabel={newPeriodLabel}
        activeCount={activeAccts.length}
        staleCount={staleAccts.length}
      />

      {/* Stale accounts callout */}
      {staleAccts.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-800 flex items-start gap-3">
          <span className="text-base flex-shrink-0 mt-0.5">⚠️</span>
          <div>
            <p className="font-semibold mb-0.5">{staleAccts.length} accounts have had no GHL activity in 30+ days</p>
            <p className="text-red-700 text-[11px]">
              Sorted to the top of the table below. These need a check-in.
            </p>
          </div>
        </div>
      )}

      {/* Master table */}
      <MasterAccountsTable
        accounts={filteredAccounts}
        onAccountClick={setSelectedAccount}
      />

      {/* Account modal */}
      {selectedAccount && (
        <AccountModal
          account={selectedAccount}
          onClose={() => setSelectedAccount(null)}
        />
      )}
    </div>
  )
}
