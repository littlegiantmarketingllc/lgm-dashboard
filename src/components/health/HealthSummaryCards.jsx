import { useCountUp } from '../../hooks/useCountUp'
import InfoTip from './InfoTip'

const G   = '#8CC63F'
const RED = '#EF4444'
const AMB = '#EAB308'

function fmt(n) { return '$' + Math.round(n).toLocaleString() }

function Card({ label, value, sub, icon, accentColor, delay, decimals = 0, prefix = '', suffix = '', infoText, onClick, clickable }) {
  const displayed = useCountUp(typeof value === 'number' ? value : 0, { duration: 1200, delay, decimals })
  return (
    <div
      onClick={onClick}
      className={`card-hover animate-fade-in-up rounded-2xl border border-brand-border bg-white p-5 sm:p-6 flex flex-col gap-2 ${clickable ? 'cursor-pointer' : ''}`}
      style={{ animationDelay: `${delay}ms`, boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)', borderLeft: accentColor ? `3px solid ${accentColor}` : undefined }}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-brand-muted text-[10px] font-bold uppercase tracking-[0.18em] leading-tight">{label}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {infoText && <InfoTip text={infoText} position="top-end" />}
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base border border-brand-border bg-brand-bg">{icon}</div>
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="num text-[38px] sm:text-[48px] font-bold leading-none text-brand-text tracking-tight">
          {prefix}{decimals > 0 ? displayed.toFixed(decimals) : Math.round(displayed)}{suffix}
        </span>
      </div>
      <p className="text-brand-muted text-[11px] leading-snug">{sub}</p>
      {clickable && <p className="text-[10px] text-brand-muted/60 font-medium mt-0.5">Click to expand ↓</p>}
    </div>
  )
}

// Card shown when we have no data source for the metric yet
function PendingCard({ label, icon, delay, infoText, pendingNote }) {
  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-dashed border-brand-border bg-white p-5 sm:p-6 flex flex-col gap-2 opacity-70"
      style={{ animationDelay: `${delay}ms`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-brand-muted text-[10px] font-bold uppercase tracking-[0.18em] leading-tight">{label}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {infoText && <InfoTip text={infoText} position="top-end" />}
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base border border-dashed border-brand-border bg-brand-bg">{icon}</div>
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[38px] sm:text-[48px] font-bold leading-none text-brand-border tracking-tight">—</span>
      </div>
      <p className="text-[11px] leading-snug text-amber-600 font-medium">⚠ {pendingNote}</p>
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
  // billing fields — all 0 until Stripe / billing sheet connected
  billedCount = 0,
  atRisk = 0,
  healthy = 0,
  upsellReady = 0,
  riskRevenue = 0,
  upsellMRR = 0,
  avgSub = 0,
  medianSub = 0,
  avgUsers = 0,
  avgWallet = 0,
  medianWallet = 0,
  walletCount = 0,
  newMRR = 0,
  onWalletDrilldown,
}) {
  const hasBilling = billedCount > 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

      {/* ── Live GHL data ─────────────────────────────────── */}
      <Card
        label="Total GHL Sub-accounts"
        value={total}
        sub="Live from GoHighLevel API · sandbox excluded"
        icon="🔗"
        delay={0}
        infoText="Total active client sub-accounts pulled live from GoHighLevel on every dashboard load. Internal sandbox and test accounts are excluded."
      />

      <Card
        label="Active Accounts"
        value={activeCount}
        sub={`${total ? Math.round(activeCount / total * 100) : 0}% of portfolio · GHL updated in last 30 days`}
        icon="🟢"
        accentColor={G}
        delay={20}
        infoText="Accounts whose GHL sub-account record was updated within the last 30 days — best available proxy for platform activity."
      />

      <Card
        label="New Clients"
        value={newCount}
        sub={`Joined GHL in ${newPeriodLabel}${hasBilling && newMRR ? ` · ${fmt(newMRR)}/mo` : ''}`}
        icon="✨"
        accentColor={G}
        delay={40}
        infoText="Clients whose GHL sub-account was created within the selected date range. Defaults to last 30 days when no date filter is active."
      />

      <Card
        label="Needs Check-in"
        value={staleCount}
        sub={`${total ? Math.round(staleCount / total * 100) : 0}% of portfolio · no GHL activity in 30+ days`}
        icon="⚠️"
        accentColor={RED}
        delay={60}
        infoText="Accounts with no GHL sub-account activity in over 30 days. These clients need a proactive check-in. Sorted worst-first in the Needs Attention table."
      />

      <Card
        label="Avg Health Score"
        value={Math.round(avgScore)}
        sub="Portfolio average · 0–100"
        icon="📊"
        suffix="/100"
        accentColor={avgScore >= 70 ? G : avgScore >= 40 ? AMB : RED}
        delay={80}
        infoText="Average composite health score. 50% tenure (how long in GHL) + 50% activity (days since last update). Opens to 5-factor enhanced score per account."
      />

      <Card
        label="Avg Client Tenure"
        value={Math.round(avgTenureDays / 30)}
        sub={`~${Math.round(avgTenureDays)} days avg · since joining GHL`}
        icon="📅"
        suffix=" mo"
        delay={100}
        infoText="Average months clients have been active GHL sub-accounts. Longer tenure = lower churn risk."
      />

      {/* ── Billing-dependent fields ────────────────────────────────────────── */}
      {hasBilling ? (
        <>
          <Card
            label="At-Risk Accounts"
            value={atRisk}
            sub={`Revenue at risk: ${fmt(riskRevenue)}/mo`}
            icon="🚨"
            accentColor={RED}
            delay={120}
            infoText="Accounts with health score below 50 or DataHealthStatus ≤ 3. Most likely to churn."
          />
          <Card
            label="Healthy Accounts"
            value={healthy}
            sub={`Score 80+ · ${billedCount ? Math.round(healthy / billedCount * 100) : 0}% of billed`}
            icon="✅"
            accentColor={G}
            delay={140}
            infoText="Accounts with composite health score ≥ 80."
          />
          <Card
            label="Upsell Opportunities"
            value={upsellReady}
            sub={`Potential +${fmt(upsellMRR)}/mo`}
            icon="📈"
            accentColor={G}
            delay={160}
            infoText="Healthy accounts with 3+ users and no add-ons — prime upsell candidates."
          />
          <Card
            label="Avg Subscription"
            value={Math.round(avgSub)}
            sub={`Median ${fmt(medianSub)}/mo per billed account`}
            icon="💰"
            prefix="$"
            delay={180}
            infoText="Average total monthly charges per billed account — plan price + user fees + add-ons + LC charges."
          />
          <Card
            label="Avg Users / Account"
            value={+avgUsers}
            sub="Across accounts with ≥ 1 user seat"
            icon="👥"
            decimals={1}
            delay={200}
            infoText="Average GHL user seats per billed account. Tracks seat adoption and upsell headroom."
          />
          <Card
            label="Avg Wallet Spend"
            value={Math.round(avgWallet || 0)}
            sub={`${walletCount || 0} accounts with LC charges · median ${fmt(medianWallet || 0)}`}
            icon="💳"
            prefix="$"
            delay={220}
            infoText="Average LC platform charges per account with wallet activity."
            clickable={!!onWalletDrilldown}
            onClick={onWalletDrilldown}
          />
        </>
      ) : (
        <>
          <PendingCard label="At-Risk Accounts (by Revenue)"  icon="🚨" delay={120} pendingNote="Requires billing data to calculate revenue at risk" infoText="Will show: accounts with health score < 50 and total revenue at churn risk. Needs Stripe or billing sheet." />
          <PendingCard label="Healthy Accounts (by Score)"    icon="✅" delay={140} pendingNote="Health band available — revenue breakdown needs billing data" infoText="Count of accounts scoring 80+ is computable now; revenue split needs billing sheet." />
          <PendingCard label="Upsell Opportunities"           icon="📈" delay={160} pendingNote="Requires billing data to identify upsell-ready accounts" infoText="Will show: accounts with 3+ users and no add-ons. Needs Stripe or billing sheet to confirm plan details." />
          <PendingCard label="Avg Monthly Subscription (MRR)" icon="💰" delay={180} pendingNote="Requires billing data — connect Stripe or billing sheet" infoText="Will show: average monthly charges per client. Requires plan price and add-on data from Stripe or the LGM billing sheet." />
          <PendingCard label="Avg Users / Account"            icon="👥" delay={200} pendingNote="Available per account via OAuth — bulk aggregate pending" infoText="User count is available per account when you open the detail modal (via GHL OAuth). Bulk average across all 278 requires pre-fetching all locations." />
          <PendingCard label="Avg LC Wallet Spend"            icon="💳" delay={220} pendingNote="Requires billing data — not available from GHL Agency API" infoText="Will show: average GoHighLevel platform usage charges (SMS, AI, phone) per account. Needs billing sheet or GHL Payments API access." />
        </>
      )}

    </div>
  )
}
