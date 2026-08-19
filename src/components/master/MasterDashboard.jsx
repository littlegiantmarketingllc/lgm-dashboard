import { useState } from 'react'
import { useMasterLeads } from '../../hooks/useMasterLeads'

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

function StepRow({ done, label, detail }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-brand-border/60 last:border-0">
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-bold"
        style={done
          ? { background: '#8CC63F', color: '#fff' }
          : { background: '#F4F6F4', color: '#9CA3AF', border: '1.5px solid #E5E7E5' }}
      >
        {done ? '✓' : ''}
      </div>
      <div>
        <p className={`text-sm font-semibold ${done ? 'text-brand-heading' : 'text-brand-muted'}`}>{label}</p>
        {detail && <p className="text-brand-muted text-[12px] mt-0.5 leading-relaxed">{detail}</p>}
      </div>
    </div>
  )
}

// This connects live to GHL and confirms the underlying data is correct — it's
// a build-status view, not the client-facing dashboard. The real Overview with
// KPI cards (PPL, Disposition Rate, etc.) gets built once two things land:
// the custom-fields OAuth scope (below) and Steve's confirmed formulas. Showing
// KPI cards before then would mean showing wrong or empty numbers, which is
// worse than showing status honestly.
export default function MasterDashboard({ locationId }) {
  const [dateRange] = useState({ from: '', to: '' }) // empty = API default (last 3 months)
  const { data, loading, error, refetch } = useMasterLeads(locationId, dateRange)
  const [showRaw, setShowRaw] = useState(false)

  if (loading && !data) return <LoadingScreen />
  if (error && !data)   return <ErrorScreen message={error} onRetry={refetch} />

  const { leads = [], leadsInRange, totalContactsScanned, customFieldsError, from, to } = data || {}
  const withOpp = leads.filter(l => l.opportunities.length > 0).length

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">

        <div>
          <h1 className="text-brand-heading font-bold text-2xl">Master Dashboard</h1>
          <p className="text-brand-muted text-sm mt-1">Replacing QuickSight — build status for this account</p>
        </div>

        <div className="rounded-2xl border border-brand-border bg-white p-6"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <StepRow
            done
            label="Connected to GHL"
            detail={`Live data for this location, last 3 months (${from} to ${to}).`}
          />
          <StepRow
            done
            label={`${(totalContactsScanned ?? 0).toLocaleString()} contacts found, ${(leadsInRange ?? 0).toLocaleString()} in range`}
            detail={`${withOpp.toLocaleString()} of those have at least one linked opportunity.`}
          />
          <StepRow
            done={!customFieldsError}
            label="Lead price, call count, disposition date"
            detail={customFieldsError
              ? "Blocked — the GHL app needs the \"Locations → Custom Fields\" scope enabled in its Marketplace settings, then a fresh reconnect. Every lead shows these as blank until that's on."
              : "Reading correctly from this account's custom fields."}
          />
          <StepRow
            done={false}
            label="PPL, Disposition Rate, Conversion Rate, and the rest"
            detail="Waiting on Steve to confirm the exact formulas against QuickSight — showing KPI cards before that would mean showing numbers that might be wrong."
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
                    <th className="px-4 py-2 text-right">Opps</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.slice(0, 200).map(l => (
                    <tr key={l.contactId} className="border-b border-brand-border/60 last:border-0">
                      <td className="px-4 py-2 font-medium">{l.name || '—'}</td>
                      <td className="px-4 py-2">{l.dateAdded ? new Date(l.dateAdded).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-2">{l.source || '—'}</td>
                      <td className="px-4 py-2 text-right">{l.opportunities.length}</td>
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
