import { useCountUp } from '../../hooks/useCountUp'
import InfoTip from './InfoTip'

const G = '#8CC63F'

function fmt(n) { return '$' + Math.round(n).toLocaleString() }

function Card({
  label, value, sub, icon, accentColor, delay,
  decimals = 0, prefix = '', suffix = '',
  infoText, onClick, clickable,
}) {
  const displayed = useCountUp(typeof value === 'number' ? value : 0, { duration: 1200, delay, decimals })

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
          {prefix}{decimals > 0 ? displayed.toFixed(decimals) : Math.round(displayed)}{suffix}
        </span>
      </div>
      <p className="text-brand-muted text-[11px] leading-snug">{sub}</p>
      {clickable && (
        <p className="text-[10px] text-brand-muted/60 font-medium mt-0.5">Click to expand ↓</p>
      )}
    </div>
  )
}

export default function HealthSummaryCards({
  accounts,
  ghlTotal = 0, ghlOnlyCount = 0,
  atRisk, healthy, upsellReady,
  riskRevenue, upsellMRR,
  avgSub, medianSub,
  dmCount, agentCount, activeCount,
  avgWallet, medianWallet, walletCount,
  newCount = 0, newMRR = 0, newPeriodLabel = 'last 30 days',
  avgUsers = 0,
  onWalletDrilldown,
}) {
  const accountsSub = ghlOnlyCount > 0
    ? `${dmCount} DM · ${agentCount} Agent · ${ghlOnlyCount} in GHL, not yet billed`
    : `${dmCount} DM · ${agentCount} Agent`

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

      <Card
        label="Billed Accounts"
        value={accounts.length}
        sub={accountsSub}
        icon="🏢"
        delay={0}
        infoText="Total client accounts in the LGM billing sheet. DM = Digital Marketing clients; Agent = Conversational AI clients. GHL-only stubs (not yet billed) are excluded from all KPIs."
      />

      <Card
        label="Active Accounts"
        value={activeCount}
        sub={`${accounts.length ? Math.round(activeCount / accounts.length * 100) : 0}% of billed accounts have activity`}
        icon="🟢"
        delay={30}
        infoText="Accounts with a non-zero DataHealthStatus score. Zero-activity accounts have no recorded LC platform usage and are flagged for immediate outreach."
      />

      <Card
        label="New Customers"
        value={newCount}
        sub={`Joined in ${newPeriodLabel} · ${fmt(newMRR)}/mo`}
        icon="✨"
        delay={60}
        infoText={`Clients whose GHL sub-account was created within the selected date range (pulled from GoHighLevel). When no date filter is set, defaults to the last 30 days. New Customer MRR is shown as the subtitle.`}
        accentColor={G}
      />

      <Card
        label="At-Risk Accounts"
        value={atRisk}
        sub={`Revenue at risk: ${fmt(riskRevenue)}/mo`}
        icon="⚠️"
        accentColor="#EF4444"
        delay={120}
        infoText="Accounts with a DataHealthStatus score ≤ 3 (out of 5) OR an overall health score below 50. These clients are most likely to churn and need proactive outreach."
      />

      <Card
        label="Healthy Accounts"
        value={healthy}
        sub={`Score 80+ · ${accounts.length ? Math.round(healthy / accounts.length * 100) : 0}% of billed`}
        icon="✅"
        accentColor={G}
        delay={150}
        infoText="Accounts with a composite health score ≥ 80. Score is weighted: DataHealthStatus 40%, Users 20%, Revenue 15%, Tenure 15%, Activity 10%."
      />

      <Card
        label="Upsell Opportunities"
        value={upsellReady}
        sub={`Potential +${fmt(upsellMRR)}/mo`}
        icon="📈"
        accentColor={G}
        delay={180}
        infoText="Healthy accounts (DataHealthStatus > 3) with more than 3 users and no current add-ons — prime candidates for an upsell conversation on seats, multi-location, or add-on products."
      />

      <Card
        label="Avg Subscription"
        value={Math.round(avgSub)}
        sub={`Median ${fmt(medianSub)}/mo per billed account`}
        icon="📊"
        prefix="$"
        delay={210}
        infoText="Average total monthly charges per billed account — includes plan price, user fees, add-ons, and LC platform charges. Median is shown to reduce the effect of high-revenue outliers."
      />

      <Card
        label="Avg Users / Account"
        value={+avgUsers}
        sub={`Across accounts with ≥ 1 user seat`}
        icon="👥"
        decimals={1}
        delay={240}
        infoText="Average number of GHL-adjusted user seats (GHL Adj User Count) across all billed accounts that have at least one seat. Clients pay per-user, so this tracks seat adoption and upsell headroom."
      />

      <Card
        label="Avg Wallet Spend"
        value={Math.round(avgWallet || 0)}
        sub={`${walletCount || 0} accounts with LC charges · median ${fmt(medianWallet || 0)}`}
        icon="💳"
        prefix="$"
        delay={270}
        infoText="Average LC platform charges per account that has any wallet activity. This reflects actual GHL feature usage (AI, SMS, calls, etc.) — not directly billed to clients. Click to see the full account breakdown."
        clickable={!!onWalletDrilldown}
        onClick={onWalletDrilldown}
      />

    </div>
  )
}
