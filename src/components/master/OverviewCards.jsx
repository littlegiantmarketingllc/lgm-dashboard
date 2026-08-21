import { useCountUp } from '../../hooks/useCountUp'
import InfoTip from '../health/InfoTip'

const G   = '#8CC63F'
const AMB = '#EAB308'

function fmtMoney(n) { return '$' + Math.round(n).toLocaleString() }

function Card({ label, value, sub, icon, accentColor, delay, decimals = 0, prefix = '', suffix = '', infoText }) {
  const displayed = useCountUp(typeof value === 'number' ? value : 0, { duration: 1200, delay, decimals })
  return (
    <div
      className="card-hover animate-fade-in-up rounded-2xl border bg-white p-5 sm:p-6 flex flex-col gap-2"
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
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base border border-brand-border bg-brand-bg">{icon}</div>
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="num text-[34px] sm:text-[40px] font-bold leading-none text-brand-text tracking-tight">
          {prefix}{decimals > 0 ? displayed.toFixed(decimals) : Math.round(displayed).toLocaleString()}{suffix}
        </span>
      </div>
      {sub && <p className="text-brand-muted text-[11px] leading-snug">{sub}</p>}
    </div>
  )
}

// Card shown when the underlying data isn't available yet — same visual
// language as HealthSummaryCards' PendingCard, so a viewer who's seen the
// Health dashboard reads this the same way instantly.
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
        <span className="text-[34px] sm:text-[40px] font-bold leading-none text-brand-border tracking-tight">—</span>
      </div>
      <p className="text-[11px] leading-snug text-amber-600 font-medium">⚠ {pendingNote}</p>
    </div>
  )
}

// `overview` is the shape returned by computeOverview() in lib/masterMetrics.js.
// `customFieldsBlocked` = true means the GHL custom-fields OAuth scope isn't
// enabled yet, so leadPrice/callCount/dispositionDate are null on every lead —
// cards that depend on those show as pending rather than a false $0 or 0%.
export default function OverviewCards({ overview, customFieldsBlocked }) {
  const {
    leadCount, saleCount, wonPremium, withOpportunity,
    cpp, callCount, callsPerLead, dispoRate, conversionRate, ppl,
  } = overview

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

      <Card
        label="Leads"
        value={leadCount}
        sub="Contacts created in the selected window"
        icon="👥"
        delay={0}
        infoText="Total contacts whose GHL date-created falls in the selected date range — the same date-created attribution QuickSight uses (a sale from an older lead counts in that lead's original month, not today's)."
      />

      <Card
        label="Sale Count"
        value={saleCount}
        sub={`${leadCount ? Math.round(saleCount / leadCount * 1000) / 10 : 0}% of leads`}
        icon="🏆"
        accentColor={G}
        delay={40}
        infoText="Opportunities linked to an in-range lead with status = Won."
      />

      <Card
        label="Written Premium"
        value={wonPremium}
        prefix="$"
        sub="Sum of opportunity value on won deals"
        icon="💰"
        accentColor={G}
        delay={80}
        infoText="Sum of monetaryValue across all Won opportunities linked to in-range leads."
      />

      <Card
        label="With Opportunity"
        value={withOpportunity}
        sub={`${leadCount ? Math.round(withOpportunity / leadCount * 100) : 0}% of leads have ≥1 linked opportunity`}
        icon="🔗"
        delay={120}
        infoText="Leads with at least one opportunity of any stage/status attached — a rough proxy for engagement until a proper Quote Rate is defined."
      />

      <Card
        label="Conversion Rate"
        value={conversionRate ?? 0}
        suffix="%"
        decimals={1}
        sub="Sale Count ÷ Leads"
        icon="📈"
        accentColor={G}
        delay={160}
        infoText="Sales ÷ Leads — the simple 'Close Rate' definition. QuickSight's own headline Conv. Rate tile used Sales ÷ Quotes instead (a different, usually higher, number) — that variant needs a confirmed 'Quoted' stage before it can be added here too."
      />

      {customFieldsBlocked ? (
        <PendingCard label="Cost Per Policy (CPP)" icon="🧮" delay={200}
          pendingNote="Needs lead price — blocked on the custom-fields OAuth scope"
          infoText="Will show: total lead cost ÷ Sale Count, once the custom-fields scope is enabled." />
      ) : (
        <Card label="Cost Per Policy" value={cpp ?? 0} prefix="$" decimals={cpp !== null ? 0 : 0}
          sub="Total lead cost ÷ Sale Count" icon="🧮" delay={200}
          infoText="Reverse-engineered from QuickSight's CPP field, not yet confirmed by Steve — treat as provisional." />
      )}

      {customFieldsBlocked ? (
        <PendingCard label="Disposition Rate" icon="📋" delay={240}
          pendingNote="Needs disposition date — blocked on the custom-fields OAuth scope"
          infoText="Will show: leads with a disposition date set ÷ total leads." />
      ) : (
        <Card label="Disposition Rate" value={dispoRate ?? 0} suffix="%" decimals={1}
          sub="Leads with a disposition date set" icon="📋" accentColor={AMB} delay={240}
          infoText="Percentage of in-range leads with the disposition date custom field filled in." />
      )}

      {customFieldsBlocked ? (
        <PendingCard label="Call Count" icon="📞" delay={280}
          pendingNote="Blocked on the custom-fields OAuth scope"
          infoText="Will show: sum of the call count field across in-range leads." />
      ) : (
        <Card label="Call Count" value={callCount ?? 0} decimals={0}
          sub="Sum of call count across all leads" icon="📞" delay={280}
          infoText="Total value of the call count custom field, summed across every in-range lead." />
      )}

      {customFieldsBlocked ? (
        <PendingCard label="Calls Per Lead" icon="📱" delay={320}
          pendingNote="Needs call count — blocked on the custom-fields OAuth scope"
          infoText="Will show: sum of the call count field ÷ total leads." />
      ) : (
        <Card label="Calls Per Lead" value={callsPerLead ?? 0} decimals={2}
          sub="Call Count ÷ total leads" icon="📱" delay={320}
          infoText="Average value of the call count custom field across in-range leads." />
      )}

      <PendingCard label="PPL (Profit Per Lead)" icon="💹" delay={360}
        pendingNote="Needs a confirmed commission source — ask Steve, don't guess"
        infoText="Will show: (commission − lead cost) ÷ leads. QuickSight has a Commission value; we haven't identified which GHL field it maps to yet." />

    </div>
  )
}
