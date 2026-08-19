import { useState } from 'react'
import { useMasterLeads } from '../../hooks/useMasterLeads'

function fmtMoney(n) {
  if (n === null || n === undefined || n === '') return '—'
  const num = Number(n)
  return Number.isFinite(num) ? '$' + num.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'
}

function StatCard({ label, value, sub }) {
  return (
    <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white p-4"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <p className="text-brand-muted text-[11px] uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-brand-heading font-bold text-2xl mt-1">{value}</p>
      {sub && <p className="text-brand-muted text-[11px] mt-1">{sub}</p>}
    </div>
  )
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

// This is the "canvas" — it proves the data layer (contacts + opportunities,
// joined on contact ID, filtered by lead date-created) is working correctly.
// It intentionally does NOT compute PPL / Dispo / SMS% / CVR / CPP yet —
// those formulas come from Steve, dictated in huddles, and get added to
// src/lib/metricsEngine.js once confirmed. This page is what he verifies
// the raw joined rows against QuickSight before any calculation is trusted.
export default function MasterDashboard({ locationId }) {
  const [dateRange] = useState({ from: '', to: '' }) // empty = API default (last 3 months)
  const { data, loading, error, refetch } = useMasterLeads(locationId, dateRange)

  if (loading && !data) return <LoadingScreen />
  if (error && !data)   return <ErrorScreen message={error} onRetry={refetch} />

  const { leads = [], leadsInRange, totalContactsScanned, totalOpportunitiesScanned, missingFields = [], allFields = [], from, to } = data || {}

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <div>
          <h1 className="text-brand-heading font-bold text-xl">Master Dashboard — Data Layer Canvas</h1>
          <p className="text-brand-muted text-sm mt-1">
            Location <code className="bg-white px-1.5 py-0.5 rounded border border-brand-border text-[12px]">{locationId}</code>
            {' '}· {from} to {to} · leads attributed by date-created
          </p>
        </div>

        {missingFields.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold">⚠ Couldn't find a name match for: {missingFields.join(', ')}</p>
            <p className="mt-1 text-[12px]">
              Check the account's actual custom field names below — the matcher looks for a substring like
              "lead price" or "call count" and may need an alias added in <code>api/master-leads.js</code>.
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer text-[12px] font-medium">Show all {allFields.length} custom fields on this account</summary>
              <ul className="mt-2 text-[12px] grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 max-h-48 overflow-y-auto">
                {allFields.map(f => <li key={f.id} className="truncate">{f.name}</li>)}
              </ul>
            </details>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Contacts scanned" value={totalContactsScanned ?? '—'} />
          <StatCard label="Opportunities scanned" value={totalOpportunitiesScanned ?? '—'} />
          <StatCard label="Leads in range" value={leadsInRange ?? '—'} sub="filtered by dateAdded" />
          <StatCard label="With ≥1 opportunity" value={leads.filter(l => l.opportunities.length > 0).length} />
        </div>

        <div className="rounded-2xl border border-brand-border bg-white overflow-hidden"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div className="px-5 py-3 border-b border-brand-border">
            <h2 className="text-brand-heading font-semibold text-sm">Joined lead records</h2>
            <p className="text-brand-muted text-[11px] mt-0.5">Raw data — no calculations applied yet</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-brand-border text-left text-brand-muted uppercase tracking-wider text-[10px]">
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Date Added</th>
                  <th className="px-4 py-2">Source</th>
                  <th className="px-4 py-2">Assigned To</th>
                  <th className="px-4 py-2 text-right">Lead Price</th>
                  <th className="px-4 py-2 text-right">Call Count</th>
                  <th className="px-4 py-2">Disposition Date</th>
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
                    <td className="px-4 py-2">{l.assignedTo || '—'}</td>
                    <td className="px-4 py-2 text-right">{fmtMoney(l.leadPrice)}</td>
                    <td className="px-4 py-2 text-right">{l.callCount ?? '—'}</td>
                    <td className="px-4 py-2">{l.dispositionDate ? new Date(l.dispositionDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-2 text-right">{l.opportunities.length}</td>
                    <td className="px-4 py-2 text-right">
                      {fmtMoney(l.opportunities.reduce((s, o) => s + (Number(o.monetaryValue) || 0), 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {leads.length > 200 && (
              <p className="px-4 py-3 text-[11px] text-brand-muted">
                Showing first 200 of {leads.length} leads.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
