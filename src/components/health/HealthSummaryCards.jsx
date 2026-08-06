import { useCountUp } from '../../hooks/useCountUp'
import InfoTip from './InfoTip'

const G   = '#8CC63F'
const AMB = '#EAB308'
const RED = '#EF4444'

function Card({ label, value, sub, icon, accentColor, delay, infoText, onClick, clickable }) {
  const displayed = useCountUp(typeof value === 'number' ? value : 0, { duration: 1200, delay })
  return (
    <div
      onClick={onClick}
      className={`card-hover animate-fade-in-up rounded-2xl border border-brand-border bg-white p-5 sm:p-6 flex flex-col gap-2 ${clickable ? 'cursor-pointer' : ''}`}
      style={{
        animationDelay: `${delay}ms`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)',
        borderLeft: accentColor ? `3px solid ${accentColor}` : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-brand-muted text-[10px] font-bold uppercase tracking-[0.18em] leading-tight">{label}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {infoText && <InfoTip text={infoText} position="top-end" />}
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base border border-brand-border bg-brand-bg">
            {icon}
          </div>
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="num text-[38px] sm:text-[48px] font-bold leading-none text-brand-text tracking-tight">
          {Math.round(displayed)}
        </span>
      </div>
      <p className="text-brand-muted text-[11px] leading-snug">{sub}</p>
      {clickable && <p className="text-[10px] text-brand-muted/60 font-medium mt-0.5">Click to expand ↓</p>}
    </div>
  )
}

export default function HealthSummaryCards({
  total = 0,
  newCount = 0,
  newPeriodLabel = 'last 30 days',
  activeCount = 0,
  staleCount = 0,
  watchCount = 0,
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

      <Card
        label="Total GHL Sub-accounts"
        value={total}
        sub="Live from GHL Agency API · refreshed every page load"
        icon="🔗"
        delay={0}
        infoText="Total active sub-accounts in your GHL agency (excludes sandbox/test accounts). Pulled live from the GHL API on every dashboard load — no caching."
      />

      <Card
        label="New Accounts"
        value={newCount}
        sub={`Created in ${newPeriodLabel}`}
        icon="✨"
        delay={40}
        accentColor={G}
        infoText="Sub-accounts created in GHL within the selected date range (or last 30 days when no filter is set). Based on the GHL dateAdded field."
      />

      <Card
        label="Active (last 30 days)"
        value={activeCount}
        sub="Updated in GHL within 30 days"
        icon="🟢"
        delay={80}
        accentColor={G}
        infoText="Accounts whose GHL sub-account record was updated within the last 30 days. This is the best activity proxy available from the GHL Agency API."
      />

      <Card
        label="Stale (30+ days)"
        value={staleCount}
        sub="No GHL activity in 30+ days"
        icon="⚠️"
        delay={120}
        accentColor={RED}
        infoText="Accounts that haven't had any recorded activity in GHL for over 30 days. These need a check-in. 'Activity' is measured by when the sub-account record was last updated in GHL."
      />

    </div>
  )
}
