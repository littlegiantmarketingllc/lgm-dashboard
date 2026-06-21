import { useCountUp } from '../../hooks/useCountUp'

const G = '#8CC63F'

function fmt(n) {
  return '$' + Math.round(n).toLocaleString()
}

function Card({ label, value, sub, icon, accentColor, delay, decimals = 0, prefix = '', suffix = '' }) {
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
      <div className="flex items-start justify-between">
        <span className="text-brand-muted text-[10px] font-bold uppercase tracking-[0.18em]">{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base border border-brand-border bg-brand-bg flex-shrink-0">
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="num text-[38px] sm:text-[48px] font-bold leading-none text-brand-text tracking-tight">
          {prefix}{decimals > 0 ? displayed.toFixed(decimals) : displayed}{suffix}
        </span>
      </div>
      <p className="text-brand-muted text-[11px] leading-snug">{sub}</p>
    </div>
  )
}

export default function HealthSummaryCards({ accounts, atRisk, healthy, upsellReady, riskRevenue, upsellMRR, avgSub, medianSub, dmCount, agentCount, activeCount, avgWallet, medianWallet }) {
  const totalMRR   = accounts.reduce((s, a) => s + (a.totalRev || 0), 0)
  const avgPerAcct = accounts.length ? Math.round(totalMRR / accounts.length) : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Card
        label="Total Accounts"
        value={accounts.length}
        sub={`${dmCount} DM · ${agentCount} Agent`}
        icon="🏢"
        delay={0}
      />
      <Card
        label="Active Accounts"
        value={activeCount}
        sub={`${accounts.length ? Math.round(activeCount / accounts.length * 100) : 0}% of total have transactions`}
        icon="🟢"
        delay={30}
      />
      <Card
        label="Total MRR"
        value={Math.round(totalMRR)}
        sub={`Avg ${fmt(avgPerAcct)}/account`}
        icon="💰"
        prefix="$"
        delay={60}
      />
      <Card
        label="At-Risk Accounts"
        value={atRisk}
        sub={`Revenue at risk: ${fmt(riskRevenue)}/mo`}
        icon="⚠️"
        accentColor="#EF4444"
        delay={120}
      />
      <Card
        label="Healthy Accounts"
        value={healthy}
        sub={`Score 80+ · ${accounts.length ? Math.round(healthy/accounts.length*100) : 0}% of total`}
        icon="✅"
        accentColor={G}
        delay={180}
      />
      <Card
        label="Upsell Opportunities"
        value={upsellReady}
        sub={`Potential +${fmt(upsellMRR)}/mo`}
        icon="📈"
        accentColor={G}
        delay={240}
      />
      <Card
        label="Avg Subscription"
        value={Math.round(avgSub)}
        sub={`Median ${fmt(medianSub)}/mo`}
        icon="📊"
        prefix="$"
        delay={300}
      />
      <Card
        label="Avg Wallet Spend"
        value={Math.round(avgWallet || 0)}
        sub={`Median ${fmt(medianWallet || 0)}/mo`}
        icon="💳"
        prefix="$"
        delay={360}
      />
    </div>
  )
}
