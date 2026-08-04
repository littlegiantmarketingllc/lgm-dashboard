import { format } from 'date-fns'

const STAGE_COLORS = {
  healthy:    { bg: '#f0fdf4', border: '#86efac', text: '#16a34a' },
  active:     { bg: '#eff6ff', border: '#93c5fd', text: '#2563eb' },
  onboarding: { bg: '#f0f9ff', border: '#7dd3fc', text: '#0369a1' },
  review:     { bg: '#fefce8', border: '#fde047', text: '#ca8a04' },
  at_risk:    { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' },
  churned:    { bg: '#f8fafc', border: '#cbd5e1', text: '#475569' },
  unknown:    { bg: '#f8fafc', border: '#e2e8f0', text: '#6b7280' },
}

function msgTypeLabel(t) {
  return { TYPE_SMS: 'SMS', TYPE_EMAIL: 'Email', TYPE_CALL: 'Call',
    TYPE_WHATSAPP: 'WhatsApp', TYPE_FB_MESSENGER: 'Messenger' }[t]
    || (t ? t.replace('TYPE_', '') : '—')
}

function timeAgo(ts) {
  if (!ts) return '—'
  const d = new Date(typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts)
  if (isNaN(d.getTime())) return '—'
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30)  return `${days}d ago`
  if (days < 56)  return `${Math.floor(days / 7)}w ago`
  return format(d, 'MMM d, yyyy')
}

// Loading skeleton
function LoadingState() {
  return (
    <div className="rounded-xl border border-brand-border bg-brand-bg px-4 py-4 flex items-center gap-3">
      <div className="w-4 h-4 rounded-full border-2 border-[#8CC63F] border-t-transparent animate-spin flex-shrink-0" />
      <div className="space-y-1.5 flex-1">
        <div className="h-2.5 rounded bg-brand-border w-2/3 animate-pulse" />
        <div className="h-2 rounded bg-brand-border w-1/2 animate-pulse" />
      </div>
    </div>
  )
}

// Idle state — show the button
function IdleState({ onFetch }) {
  return (
    <button
      onClick={onFetch}
      className="w-full rounded-xl border border-dashed border-brand-border bg-brand-bg hover:bg-white hover:border-[#8CC63F]/50 transition-all px-4 py-3.5 flex items-center justify-center gap-2 group"
    >
      <span className="text-base group-hover:scale-110 transition-transform">🔍</span>
      <span className="text-[12px] font-semibold text-brand-muted group-hover:text-brand-heading transition-colors">
        Request GHL Info
      </span>
      <span className="text-[10px] text-brand-muted/60 ml-1">— pulls live CRM data</span>
    </button>
  )
}

export default function GHLInfoPanel({ data, loading, error, onFetch }) {
  if (loading) return <LoadingState />

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-2">
        <span className="text-red-400 flex-shrink-0">⚠</span>
        <span className="text-[11px] text-red-700 flex-1">Could not fetch GHL data: {error}</span>
        <button onClick={onFetch} className="text-[10px] text-red-600 underline flex-shrink-0">Retry</button>
      </div>
    )
  }

  if (!data) return <IdleState onFetch={onFetch} />

  const { contacts, opportunities, conversation } = data
  const hasResults = contacts.length > 0 || opportunities.length > 0

  if (!hasResults) {
    return (
      <div className="rounded-xl border border-brand-border bg-brand-bg px-4 py-3 text-center">
        <p className="text-[12px] text-brand-muted">No matching record found in GHL CRM.</p>
        <button onClick={onFetch} className="text-[10px] text-[#8CC63F] underline mt-1">Search again</button>
      </div>
    )
  }

  // Prefer Client Success / Customer Onboarding pipeline entries
  const bestOpp = opportunities.find(o =>
    o.pipeline === 'Client Success' || o.pipeline === 'Customer Onboarding'
  ) || opportunities[0]

  const stageStyle = bestOpp
    ? (STAGE_COLORS[bestOpp.stageStatus] || STAGE_COLORS.unknown)
    : null

  const otherOpps = opportunities.filter(o => o !== bestOpp)

  return (
    <div className="rounded-xl border border-brand-border bg-white overflow-hidden">
      {/* Panel header */}
      <div className="px-4 py-2.5 bg-brand-bg border-b border-brand-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">GHL CRM Profile</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#8CC63F] animate-pulse" />
        </div>
        <button onClick={onFetch}
          className="text-[10px] text-brand-muted hover:text-brand-heading underline transition-colors">
          Refresh
        </button>
      </div>

      <div className="px-4 py-3.5 space-y-3.5">

        {/* Primary pipeline stage */}
        {bestOpp && (
          <Row label="Pipeline Stage">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border"
                style={{ color: stageStyle.text, background: stageStyle.bg, borderColor: stageStyle.border }}>
                {bestOpp.stage}
              </span>
              <span className="text-[10px] text-brand-muted">{bestOpp.pipeline}</span>
              {bestOpp.lastStageChangeAt && (
                <span className="text-[10px] text-brand-muted">· {timeAgo(bestOpp.lastStageChangeAt)}</span>
              )}
            </div>
          </Row>
        )}

        {/* Other pipelines */}
        {otherOpps.length > 0 && (
          <Row label="Also In">
            <div className="flex flex-wrap gap-1.5">
              {otherOpps.map(o => {
                const s = STAGE_COLORS[o.stageStatus] || STAGE_COLORS.unknown
                return (
                  <span key={o.id} className="text-[9px] font-semibold px-2 py-0.5 rounded-full border"
                    style={{ color: s.text, background: s.bg, borderColor: s.border }}>
                    {o.pipeline}: {o.stage}
                  </span>
                )
              })}
            </div>
          </Row>
        )}

        {/* Last conversation */}
        {conversation && (
          <Row label="Last Contact">
            <div className="min-w-0">
              <p className="text-[11px] text-brand-heading font-medium">
                {timeAgo(conversation.lastMessageDate)}
                <span className="text-brand-muted font-normal"> · {msgTypeLabel(conversation.lastMessageType)}</span>
                {conversation.direction && (
                  <span className="text-brand-muted font-normal">
                    {' '}({conversation.direction === 'outbound' ? 'sent by LGM' : 'received from client'})
                  </span>
                )}
              </p>
              {conversation.lastMessageBody && (
                <p className="text-[10px] text-brand-muted mt-0.5 italic line-clamp-2">
                  "{conversation.lastMessageBody}"
                </p>
              )}
            </div>
          </Row>
        )}

        {/* Contact info */}
        {contacts[0] && (
          <Row label="Contact">
            <div className="min-w-0 text-[11px]">
              <p className="text-brand-heading font-semibold">{contacts[0].name}</p>
              {contacts[0].companyName && contacts[0].companyName !== contacts[0].name && (
                <p className="text-brand-muted">{contacts[0].companyName}</p>
              )}
              {contacts[0].email && <p className="text-brand-muted">{contacts[0].email}</p>}
              {contacts[0].phone && <p className="text-brand-muted">{contacts[0].phone}</p>}
            </div>
          </Row>
        )}

        {/* Tags */}
        {(contacts[0]?.tags?.length > 0 || bestOpp?.tags?.length > 0) && (
          <Row label="Tags">
            <div className="flex flex-wrap gap-1">
              {(contacts[0]?.tags || bestOpp?.tags || []).slice(0, 8).map(tag => (
                <span key={tag}
                  className="text-[9px] px-1.5 py-0.5 rounded-md bg-brand-bg border border-brand-border text-brand-muted">
                  {tag}
                </span>
              ))}
            </div>
          </Row>
        )}

      </div>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[9px] font-bold uppercase tracking-wider text-brand-muted w-[72px] flex-shrink-0 mt-1 leading-relaxed">
        {label}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
