// Shows John (and the team) exactly which data fields are live from the GHL API,
// which are pending additional API scopes, and which come from the LGM sheet.

export default function GHLDataBanner({ status }) {
  if (!status) return null

  const { ghlTotal, matched, sheetOnly, ghlOnly, pendingScopes, ghlError } = status

  // Don't show if GHL hasn't loaded anything yet
  if (ghlTotal === 0 && !ghlError) return null

  return (
    <div className="rounded-xl border border-brand-border bg-white px-4 py-2.5"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-medium">

        <span className="text-brand-muted font-semibold uppercase tracking-wider text-[10px] mr-1">
          Data Sources
        </span>

        {/* GHL live — what we have */}
        {ghlTotal > 0 && (
          <span
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700"
            title="Total GHL sub-accounts (includes internal, trial, and inactive — not all are paying clients). Billing sheet is the source of truth for billed accounts."
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            {ghlTotal} GHL sub-accounts synced
          </span>
        )}
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700">
          ✓ Name · Join date · Last activity · City/State
        </span>

        {/* LGM sheet */}
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
          📋 Revenue · Plans · GP · Notes — from LGM billing sheet
        </span>

        {/* GHL-only — in GHL but not in billing sheet */}
        {ghlOnly > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700"
            title="These clients exist in GHL but have no row in the LGM billing sheet yet. They show up in the Master Table with a 'new' badge.">
            ✦ {ghlOnly} clients in GHL but not yet in billing sheet
          </span>
        )}

        {/* Not matched */}
        {sheetOnly > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-gray-600">
            {sheetOnly} billed accounts couldn't match to a GHL location
          </span>
        )}

        {/* Pending per-location data */}
        <span
          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700"
          title="These fields require per-sub-account API tokens, which are different from the agency-level key. Revenue and plan data come from the billing sheet instead."
        >
          ⚠ GHL per-account data not yet available: {pendingScopes.join(' · ')}
        </span>

        {/* GHL error */}
        {ghlError && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700">
            ✕ GHL unavailable: {ghlError}
          </span>
        )}
      </div>
    </div>
  )
}
