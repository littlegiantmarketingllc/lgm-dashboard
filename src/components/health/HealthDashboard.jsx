import { useState, useMemo, useEffect } from 'react'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { useHealthSheet }      from '../../hooks/useHealthSheet'
import { useAccountStatus }    from '../../hooks/useAccountStatus'
import {
  scoreAccount, classify, isAtRisk, isUpsellReady,
  recommendAction, dmVsAgent, avgSubscription,
  concentrationRisk, revenueAtRisk, potentialUpsellMRR,
  activeAccounts, avgWalletSpend,
} from '../../lib/healthEngine'
import HealthFilterBar         from './HealthFilterBar'
import HealthSummaryCards      from './HealthSummaryCards'
import DmAgentBreakdown        from './DmAgentBreakdown'
import ResolutionTrackerHealth from './ResolutionTrackerHealth'
import NeedsAttentionTable     from './NeedsAttentionTable'
import UpsellTable             from './UpsellTable'
import MasterAccountsTable     from './MasterAccountsTable'
import HealthCharts            from './HealthCharts'
import QuickWins               from './QuickWins'
import AccountModal            from './AccountModal'

const G = '#8CC63F'

// ── Date window helper ────────────────────────────────────────────────────────
function getDateWindow(dateRange) {
  if (dateRange.type === 'all') return { from: '0000-01-01', to: '9999-12-31' }
  const today = new Date()
  if (dateRange.type === 'this_month') return {
    from: format(startOfMonth(today), 'yyyy-MM-dd'),
    to:   format(endOfMonth(today),   'yyyy-MM-dd'),
  }
  if (dateRange.type === 'last_month') {
    const prev = subMonths(today, 1)
    return {
      from: format(startOfMonth(prev), 'yyyy-MM-dd'),
      to:   format(endOfMonth(prev),   'yyyy-MM-dd'),
    }
  }
  if (dateRange.type === 'last_30') return {
    from: format(subDays(today, 30), 'yyyy-MM-dd'),
    to:   format(today, 'yyyy-MM-dd'),
  }
  if (dateRange.type === 'last_90') return {
    from: format(subDays(today, 90), 'yyyy-MM-dd'),
    to:   format(today, 'yyyy-MM-dd'),
  }
  if (dateRange.type === 'custom') return {
    from: dateRange.from || '0000-01-01',
    to:   dateRange.to   || format(today, 'yyyy-MM-dd'),
  }
  return { from: '0000-01-01', to: '9999-12-31' }
}

function timeAgo(date) {
  if (!date) return '—'
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 10)  return 'just now'
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
        <p className="text-brand-heading font-semibold text-sm">Loading Customer Health data…</p>
        <p className="text-brand-muted text-[11px] mt-1">Fetching from Google Sheets</p>
      </div>
    </div>
  )
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center max-w-lg mx-auto my-12">
      <p className="text-3xl mb-3">⚠️</p>
      <h3 className="text-brand-heading font-bold text-base mb-2">Could not load health data</h3>
      <p className="text-brand-muted text-sm mb-5">{message}</p>
      <button onClick={onRetry}
        className="px-5 py-2 rounded-xl text-white text-sm font-semibold"
        style={{ background: G, boxShadow: `0 2px 8px ${G}35` }}>
        Try Again
      </button>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function HealthDashboard({ filters, setFilters }) {
  const { accounts: raw, loading, error, lastUpdated, refetch, retrying } = useHealthSheet()
  const { statuses, setStatus, isContacted, toggleContacted, getContactedAt } = useAccountStatus()
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

  // ── Enrich raw accounts with health scores (uses full dataset for revenue scaling) ──
  const maxRev = useMemo(() => Math.max(...raw.map(a => a.totalRev || 0), 1), [raw])

  const accounts = useMemo(() =>
    raw.map(a => {
      const { score, parts } = scoreAccount(a, { maxRev })
      const band   = classify(score)
      const action = recommendAction(a)
      return { ...a, _health: { score, parts, band, action } }
    }),
    [raw, maxRev]
  )

  // Available types for the filter dropdown (always from the full list)
  const accountTypes = useMemo(() =>
    [...new Set(accounts.map(a => a.accountType).filter(Boolean))].sort(),
    [accounts]
  )

  // ── Apply all global filters ───────────────────────────────────────────────
  const filteredAccounts = useMemo(() => {
    const { from, to } = getDateWindow(filters.dateRange)
    const srch  = filters.search.toLowerCase().trim()
    const typeF = filters.typeFilter
    const bandF = filters.bandFilter

    return accounts.filter(a => {
      if (srch && !a.accountName.toLowerCase().includes(srch)) return false
      if (typeF !== 'all' && (a.accountType || '').toLowerCase() !== typeF.toLowerCase()) return false
      if (bandF !== 'all' && a._health?.band !== bandF) return false
      if (filters.dateRange.type !== 'all') {
        const d = a.stripeStartDate || ''
        if (!d || d < from || d > to) return false
      }
      return true
    })
  }, [accounts, filters])

  // ── All derived data from filteredAccounts — everything reacts together ───
  const atRiskAccounts  = useMemo(() =>
    filteredAccounts.filter(isAtRisk).sort((a, b) => a._health.score - b._health.score),
    [filteredAccounts]
  )
  const upsellAccounts  = useMemo(() => filteredAccounts.filter(isUpsellReady),                           [filteredAccounts])
  const healthyAccounts = useMemo(() => filteredAccounts.filter(a => a._health.band === 'healthy'),       [filteredAccounts])
  const breakdown       = useMemo(() => dmVsAgent(filteredAccounts),                                      [filteredAccounts])
  const subStats        = useMemo(() => avgSubscription(filteredAccounts),                                [filteredAccounts])
  const riskRevenue     = useMemo(() => revenueAtRisk(atRiskAccounts),                                    [atRiskAccounts])
  const upsellMRR       = useMemo(() => potentialUpsellMRR(upsellAccounts),                               [upsellAccounts])
  const concRisk        = useMemo(() => concentrationRisk(filteredAccounts),                              [filteredAccounts])
  const activeAccts     = useMemo(() => activeAccounts(filteredAccounts),                                 [filteredAccounts])
  const walletStats     = useMemo(() => avgWalletSpend(filteredAccounts),                                 [filteredAccounts])

  const avgHealthDm    = useMemo(() => {
    const dm = filteredAccounts.filter(a => (a.accountType || '').toLowerCase() === 'dm')
    return dm.length ? Math.round(dm.reduce((s, a) => s + a._health.score, 0) / dm.length) : null
  }, [filteredAccounts])

  const avgHealthAgent = useMemo(() => {
    const ag = filteredAccounts.filter(a => (a.accountType || '').toLowerCase() !== 'dm')
    return ag.length ? Math.round(ag.reduce((s, a) => s + a._health.score, 0) / ag.length) : null
  }, [filteredAccounts])

  const top3Upsell  = useMemo(() => [...upsellAccounts].slice(0, 3), [upsellAccounts])
  const top3AtRisk  = useMemo(() => atRiskAccounts.slice(0, 3),      [atRiskAccounts])

  const dmCount    = breakdown.dm.count
  const agentCount = breakdown.agent.count

  if (loading && raw.length === 0) return <LoadingScreen />
  if (error   && raw.length === 0) return <ErrorBanner message={error} onRetry={refetch} />

  return (
    <div className="max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">

      {/* Sub-header: refresh + live dot + concentration risk */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px]">
            {error
              ? <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              : <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse inline-block" />}
            <span className="text-brand-muted">
              {lastUpdated ? `Updated ${elapsed}` : 'Loading…'}
            </span>
          </div>
          <button
            onClick={refetch}
            className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border bg-brand-bg text-brand-muted hover:text-brand-text border-brand-border hover:border-[#C8CCC8]"
          >
            <RefreshIcon spinning={loading || retrying} />
            <span>{retrying ? 'Retrying…' : loading ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>

        {concRisk > 0 && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-semibold ${
            concRisk > 40 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-brand-muted bg-brand-bg border-brand-border'
          }`}>
            {concRisk > 40 ? '⚠' : '📊'} Top 10 accounts = {concRisk}% of MRR
            {concRisk > 40 && ' — concentration risk'}
          </div>
        )}
      </div>

      {/* Stale data warning */}
      {error && raw.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <span>⚠️</span>
          <span>Auto-refresh failed — showing last known data.{' '}
            <button onClick={refetch} className="underline font-medium">Retry</button>
          </span>
        </div>
      )}

      {/* Global filter bar */}
      <HealthFilterBar
        filters={filters}
        setFilters={setFilters}
        accountTypes={accountTypes}
        totalShowing={filteredAccounts.length}
        totalAll={accounts.length}
      />

      {/* Active-filter context banner */}
      {filters.dateRange.type !== 'all' && (
        <div className="rounded-xl border border-brand-border bg-white px-4 py-2.5 text-[11px] text-brand-heading flex items-center gap-2"
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}>
          <span>📅</span>
          <span>
            Showing <strong>{filteredAccounts.length}</strong> accounts with Stripe Start Date in the selected range.
            {' '}Numbers update live as the range changes.
          </span>
        </div>
      )}

      {/* 1. Summary cards — always visible, always current */}
      <HealthSummaryCards
        accounts={filteredAccounts}
        atRisk={atRiskAccounts.length}
        healthy={healthyAccounts.length}
        upsellReady={upsellAccounts.length}
        riskRevenue={riskRevenue}
        upsellMRR={upsellMRR}
        avgSub={subStats.mean}
        medianSub={subStats.median}
        dmCount={dmCount}
        agentCount={agentCount}
        activeCount={activeAccts.length}
        avgWallet={walletStats.mean}
        medianWallet={walletStats.median}
        walletCount={walletStats.count}
      />

      {/* 2. DM vs Agent breakdown */}
      <DmAgentBreakdown
        breakdown={breakdown}
        avgHealthDm={avgHealthDm}
        avgHealthAgent={avgHealthAgent}
      />

      {/* 3. Quick Wins */}
      <QuickWins
        topUpsell={top3Upsell}
        topAtRisk={top3AtRisk}
        onAccountClick={setSelectedAccount}
      />

      {/* 4. Resolution tracker + Needs Attention */}
      <ResolutionTrackerHealth accounts={atRiskAccounts} statuses={statuses} />
      <NeedsAttentionTable
        accounts={atRiskAccounts}
        statuses={statuses}
        setStatus={setStatus}
        onAccountClick={setSelectedAccount}
      />

      {/* 5. Upsell opportunities */}
      <UpsellTable
        accounts={upsellAccounts}
        isContacted={isContacted}
        toggleContacted={toggleContacted}
        getContactedAt={getContactedAt}
        onAccountClick={setSelectedAccount}
        potentialMRR={upsellMRR}
      />

      {/* 6. Charts — fed filtered accounts so they update with filters */}
      <HealthCharts accounts={filteredAccounts} />

      {/* 7. Master accounts table */}
      <MasterAccountsTable accounts={filteredAccounts} onAccountClick={setSelectedAccount} />

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
