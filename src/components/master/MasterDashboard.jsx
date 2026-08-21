import { useState, useMemo } from 'react'
import { useMasterLeads } from '../../hooks/useMasterLeads'
import { computeOverview, pivotBySource, pivotByOwner } from '../../lib/masterMetrics'
import OverviewCards from './OverviewCards'
import PivotTable from './PivotTable'

function fmtMoney(n) {
  if (n === null || n === undefined || n === '') return '—'
  const num = Number(n)
  return Number.isFinite(num) ? '$' + num.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-brand-border" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-green animate-spin" />
      </div>
      <p className="text-brand-muted text-sm">Pulling leads + opportunities from GHL…</p>
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
        <button onClick={onRetry} className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold"
          style={{ background: '#8CC63F', boxShadow: '0 2px 8px rgba(140,198,63,0.35)' }}>
          Try Again
        </button>
      </div>
    </div>
  )
}

// The real Overview: KPI cards + two pivot tables, built on live GHL data.
// Metrics that need the custom-fields OAuth scope (leadPrice/callCount/
// dispositionDate) or a still-unconfirmed formula (PPL) show as pending cards
// rather than a wrong or fake number — see lib/masterMetrics.js for the exact
// status of every metric. Raw data is still available below for verification,
// just not the first thing on the page.
export default function MasterDashboard({ locationId }) {
  const [dateRange] = useState({ from: '', to: '' }) // empty = API default (last 3 months)
  const { data, loading, error, refetch, isDemo } = useMasterLeads(locationId, dateRange)
  const [showRaw, setShowRaw] = useState(false)

  // These must run on every render, before any early return — React requires
  // the same hooks in the same order every time. `leads` defaults to [] when
  // data hasn't loaded yet, so the memos are cheap no-ops until then.
  const { leads = [], customFieldsError, from, to } = data || {}
  const overview = useMemo(() => computeOverview(leads), [leads])
  const bySource = useMemo(() => pivotBySource(leads), [leads])
  const byOwner  = useMemo(() => pivotByOwner(leads), [leads])

  if (loading && !data) return <LoadingScreen />
  if (error && !data)   return <ErrorScreen message={error} onRetry={refetch} />

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-brand-heading font-bold text-xl flex items-center gap-2">
              Master Dashboard
              {isDemo && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700 uppercase tracking-wider">
                  Demo Data
                </span>
              )}
            </h1>
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

        <OverviewCards overview={overview} customFieldsBlocked={!!customFieldsError} />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <PivotTable
            title="By Lead Source"
            subtitle={`${bySource.length} sources`}
            rows={bySource}
            delay={320}
          />
          <PivotTable
            title="By Assigned Owner"
            subtitle={`${byOwner.length} owners`}
            rows={byOwner}
            delay={360}
          />
        </div>

        <button
          onClick={() => setShowRaw(v => !v)}
          className="text-[12px] font-medium text-brand-muted hover:text-brand-heading transition-colors"
        >
          {showRaw ? '▾' : '▸'} Show raw pulled data ({leads.length.toLocaleString()} rows, for verification)
        </button>

        {showRaw && (
          <div className="rounded-2xl border border-brand-border bg-white overflow-hidden"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-brand-border text-left text-brand-muted uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Date Added</th>
                    <th className="px-4 py-2">Source</th>
                    <th className="px-4 py-2">Assigned To</th>
                    <th className="px-4 py-2 text-right">Opps</th>
                    <th className="px-4 py-2 text-right">Opp Value</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.slice(0, 200).map(l => (
                    <tr key={l.contactId} className="border-b border-brand-border/60 last:border-0">
                      <td className="px-4 py-2 font-medium">{l.name || '—'}</td>
                      <td className="px-4 py-2">{l.dateAdded ? new Date(l.dateAdded).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-2">{l.source || '—'}</td>
                      <td className="px-4 py-2">{l.assignedToName || l.assignedTo || '—'}</td>
                      <td className="px-4 py-2 text-right">{l.opportunities.length}</td>
                      <td className="px-4 py-2 text-right">
                        {fmtMoney(l.opportunities.reduce((s, o) => s + (Number(o.monetaryValue) || 0), 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {leads.length > 200 && (
                <p className="px-4 py-3 text-[11px] text-brand-muted">Showing first 200 of {leads.length.toLocaleString()}.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
