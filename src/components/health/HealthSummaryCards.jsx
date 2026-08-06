import { useCountUp } from '../../hooks/useCountUp'
import InfoTip from './InfoTip'

const G   = '#8CC63F'
const RED = '#EF4444'
const AMB = '#EAB308'

function Card({ label, value, sub, icon, accentColor, delay, decimals = 0, prefix = '', suffix = '', infoText }) {
  const displayed = useCountUp(typeof value === 'number' ? value : 0, { duration: 1200, delay, decimals })
  return (
    <div
      className="card-hover animate-fade-in-up rounded-2xl border border-brand-border bg-white p-5 sm:p-6 flex flex-col gap-2"
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
          {prefix}{decimals > 0 ? displayed.toFixed(decimals) : Math.round(displayed)}{suffix}
        </span>
      </div>
      <p className="text-brand-muted text-[11px] leading-snug">{sub}</p>
    </div>
  )
}

export default function HealthSummaryCards({
  total = 0,
  activeCount = 0,
  staleCount = 0,
  newCount = 0,
  newPeriodLabel = 'last 30 days',
  avgScore = 0,
  avgTenureDays = 0,
}) {
  const activeRate = total > 0 ? Math.round((activeCount / total) * 100) : 0
  const staleRate  = total > 0 ? Math.round((staleCount  / total) * 100) : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">

      <Card
        label="Total Sub-accounts"
        value={total}
        sub="Live from GoHighLevel API · sandbox excluded"
        icon="🔗"
        delay={0}
        infoText="Total active client sub-accounts pulled live from GoHighLevel on every dashboard load. Internal sandbox and test accounts are automatically excluded."
      />

      <Card
        label="Active Accounts"
        value={activeCount}
        sub={`${activeRate}% of portfolio · GHL updated in last 30d`}
        icon="🟢"
        accentColor={G}
        delay={40}
        infoText="Accounts whose GHL sub-account record was updated within the last 30 days. This is the best available proxy for platform activity — an account that hasn't been touched in 30+ days is considered stale."
      />

      <Card
        label="Needs Check-in"
        value={staleCount}
        sub={`${staleRate}% of portfolio · no GHL activity in 30+ days`}
        icon="⚠️"
        accentColor={RED}
        delay={80}
        infoText="Accounts with no GHL sub-account activity in over 30 days. These clients need a proactive check-in before they go cold. Sorted worst-first in the table below."
      />

      <Card
        label="New Clients"
        value={newCount}
        sub={`Joined GHL in ${newPeriodLabel}`}
        icon="✨"
        accentColor={G}
        delay={120}
        infoText="Clients whose GHL sub-account was created within the selected date range. When no date filter is active, defaults to the last 30 days. New clients need onboarding attention."
      />

      <Card
        label="Avg Health Score"
        value={Math.round(avgScore)}
        sub="Portfolio average · tenure + activity (0–100)"
        icon="📊"
        suffix="/100"
        accentColor={avgScore >= 70 ? G : avgScore >= 40 ? AMB : RED}
        delay={160}
        infoText="Average composite health score across all accounts. Score = 50% GHL tenure (how long they've been a sub-account) + 50% activity (how recently their account was updated). Click any account in the table to see the full breakdown."
      />

      <Card
        label="Avg Client Tenure"
        value={Math.round(avgTenureDays / 30)}
        sub={`~${Math.round(avgTenureDays)} days avg · since joining GHL`}
        icon="📅"
        suffix=" mo"
        delay={200}
        infoText="Average number of months clients have been active as GHL sub-accounts. Longer tenure correlates with higher health scores and lower churn risk."
      />

    </div>
  )
}
