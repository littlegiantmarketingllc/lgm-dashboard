import { useState, useMemo } from 'react'
import { useMasterLeads } from '../../hooks/useMasterLeads'
import { computeOverview, pivotBySource, pivotByOwner, pivotByLeadProfile, salesStageBreakdown } from '../../lib/masterMetrics'
import MasterHeader from './MasterHeader'
import MasterTabBar, { TABS } from './MasterTabBar'
import DateFilterBar from './DateFilterBar'
import OwnerSourceFilter from './OwnerSourceFilter'
import OverviewCards from './OverviewCards'
import PivotTable from './PivotTable'
import SalesStageChart from './SalesStageChart'
import LeadDetailsTable from './LeadDetailsTable'

// Loading/error/empty states all keep the header + tab bar visible — the
// page should never look headerless mid-transition, and switching tabs
// should always work even while Lead Details is still fetching.
function LoadingScreen({ isDemo, activeTab, onTabChange }) {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <MasterHeader isDemo={isDemo} />
      <MasterTabBar active={activeTab} onChange={onTabChange} />
      <div className="flex flex-col items-center justify-center gap-4 py-32">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-brand-border" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-green animate-spin" />
        </div>
        <p className="text-brand-muted text-sm">Pulling leads + opportunities from GHL…</p>
      </div>
    </div>
  )
}

function ErrorScreen({ message, onRetry, isDemo, activeTab, onTabChange }) {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <MasterHeader isDemo={isDemo} />
      <MasterTabBar active={activeTab} onChange={onTabChange} />
      <div className="flex items-center justify-center px-4 py-32">
        <div className="bg-white rounded-2xl border border-brand-border p-8 max-w-lg w-full text-center"
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-brand-heading font-bold text-lg mb-2">Could not load data</h2>
          <p className="text-brand-muted text-sm leading-relaxed mb-6">{message}</p>
          <button onClick={onRetry} className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold"
            style={{ background: '#8CC63F', boxShadow: '0 2px 8px rgba(140,198,63,0.35)' }}>
            Try Again
          </button>
        </div>
      </div>
    </div>
  )
}

// Every tab besides Lead Details, until it gets built out.
function EmptyTabScreen({ isDemo, activeTab, onTabChange }) {
  const label = TABS.find(t => t.key === activeTab)?.label
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <MasterHeader isDemo={isDemo} />
      <MasterTabBar active={activeTab} onChange={onTabChange} />
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
        <p className="text-brand-muted text-sm">{label} — nothing here yet.</p>
      </div>
      <footer className="mt-12 py-5 border-t border-brand-border text-center text-[11px] text-brand-muted/60 tracking-widest uppercase">
        Little Giant Marketing &mdash; Master Dashboard
      </footer>
    </div>
  )
}

// The real Overview: KPI cards, Sales Stage chart, two pivot tables, and a
// full Lead Details table — built on live GHL data, filterable by date range
// (re-fetches — a new window means new data from GHL), and by owner/source
// (client-side — narrows the already-loaded leads, no re-fetch needed).
// Metrics that need the custom-fields OAuth scope or a still-unconfirmed
// formula (PPL) show as pending cards rather than a wrong or fake number —
// see lib/masterMetrics.js for the exact status of every metric.
export default function MasterDashboard({ locationId }) {
  const [activeTab, setActiveTab] = useState('lead-details')
  const [dateRange, setDateRange] = useState({ from: '', to: '' }) // empty = API default (last 3 months)
  const { data, loading, error, refetch, isDemo } = useMasterLeads(locationId, dateRange)

  const [ownerFilter, setOwnerFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')

  // These must run on every render, before any early return — React requires
  // the same hooks in the same order every time. `leads` defaults to [] when
  // data hasn't loaded yet, so the memos are cheap no-ops until then.
  const { leads = [], customFieldsError, missingFields = [], allFields = [], from, to } = data || {}

  const owners = useMemo(
    () => [...new Set(leads.map(l => l.assignedToName || l.assignedTo).filter(Boolean))].sort(),
    [leads]
  )
  const sources = useMemo(
    () => [...new Set(leads.map(l => l.source).filter(Boolean))].sort(),
    [leads]
  )

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (ownerFilter && (l.assignedToName || l.assignedTo) !== ownerFilter) return false
      if (sourceFilter && l.source !== sourceFilter) return false
      return true
    })
  }, [leads, ownerFilter, sourceFilter])

  const overview      = useMemo(() => computeOverview(filteredLeads), [filteredLeads])
  const bySource       = useMemo(() => pivotBySource(filteredLeads), [filteredLeads])
  const byOwner         = useMemo(() => pivotByOwner(filteredLeads), [filteredLeads])
  const byLeadProfile    = useMemo(() => pivotByLeadProfile(filteredLeads), [filteredLeads])
  const stageBreakdown = useMemo(() => salesStageBreakdown(filteredLeads), [filteredLeads])

  // Non-Lead-Details tabs don't depend on this page's data fetch at all —
  // check this before the loading/error states so switching tabs always
  // works instantly, even while Lead Details is still pulling from GHL.
  if (activeTab !== 'lead-details') {
    return <EmptyTabScreen isDemo={isDemo} activeTab={activeTab} onTabChange={setActiveTab} />
  }

  if (loading && !data) return <LoadingScreen isDemo={isDemo} activeTab={activeTab} onTabChange={setActiveTab} />
  if (error && !data)   return <ErrorScreen message={error} onRetry={refetch} isDemo={isDemo} activeTab={activeTab} onTabChange={setActiveTab} />

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <MasterHeader isDemo={isDemo} />
      <MasterTabBar active={activeTab} onChange={setActiveTab} />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-brand-heading font-bold text-xl">Overview</h1>
            <p className="text-brand-muted text-sm mt-1">
              {isDemo ? 'Sample data for UI preview — not a real account' : `${from} to ${to} · leads attributed by date-created`}
            </p>
          </div>
          {customFieldsError && !isDemo && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-[11px] font-medium max-w-sm">
              <span>⚠</span>
              <span>Custom fields blocked — lead price, call count, and disposition date are pending a GHL scope fix. Cards below reflect this.</span>
            </div>
          )}
        </div>

        {/* Shows exactly which target fields didn't match a real GHL custom field
            name on this account, and the account's actual field list, so a naming
            mismatch is visible here instead of requiring a raw API pull to diagnose. */}
        {!isDemo && !customFieldsError && missingFields.length > 0 && (
          <details className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
            <summary className="text-[12px] font-semibold cursor-pointer">
              ⚠ {missingFields.length} field{missingFields.length > 1 ? 's' : ''} not matched to a real GHL custom field — click to see details
            </summary>
            <div className="mt-2 text-[11px] space-y-2">
              <p><strong>Looking for, not found:</strong> {missingFields.join(', ')}</p>
              <details>
                <summary className="cursor-pointer font-medium">Show all {allFields.length} custom fields actually on this account</summary>
                <ul className="mt-1.5 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 max-h-48 overflow-y-auto">
                  {allFields.map(f => <li key={f.id} className="truncate">{f.name}</li>)}
                </ul>
              </details>
            </div>
          </details>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-brand-border p-3"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <DateFilterBar value={dateRange} onChange={setDateRange} />
          <OwnerSourceFilter
            owners={owners}
            sources={sources}
            ownerValue={ownerFilter}
            sourceValue={sourceFilter}
            onOwnerChange={setOwnerFilter}
            onSourceChange={setSourceFilter}
          />
        </div>

        <OverviewCards overview={overview} />

        <SalesStageChart rows={stageBreakdown} total={filteredLeads.length} delay={400} />

        {/* Full width, stacked — each table has 7 data columns and needs the
            room; three of these side by side forced horizontal scrolling. */}
        <PivotTable
          title="By Lead Source"
          subtitle={`${bySource.length} sources`}
          rows={bySource}
          delay={440}
        />
        <PivotTable
          title="By Assigned Owner"
          subtitle={`${byOwner.length} owners`}
          rows={byOwner}
          delay={480}
        />
        <PivotTable
          title="By Lead Profile"
          subtitle={`${byLeadProfile.length} profiles`}
          rows={byLeadProfile}
          delay={520}
        />

        <LeadDetailsTable leads={filteredLeads} delay={560} />
      </div>

      <footer className="mt-12 py-5 border-t border-brand-border text-center text-[11px] text-brand-muted/60 tracking-widest uppercase">
        Little Giant Marketing &mdash; Master Dashboard
      </footer>
    </div>
  )
}
