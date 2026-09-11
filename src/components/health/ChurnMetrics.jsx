const G   = '#8CC63F'
const AMB = '#EAB308'
const RED = '#EF4444'

function rateColor(rate) {
  if (rate === null) return '#6B7280'
  if (rate < 5)  return G
  if (rate < 15) return AMB
  return RED
}

function Card({ days, cohortSize, churned, rate, loading }) {
  const color = rateColor(rate)
  return (
    <div className="flex flex-col items-center justify-center px-5 py-6 text-center min-w-0">
      <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-3">
        {days}-Day Cohort
      </p>

      {loading ? (
        <div className="h-9 w-20 mx-auto rounded-lg bg-brand-bg animate-pulse mb-2" />
      ) : rate === null || cohortSize === 0 ? (
        <p className="text-3xl font-bold text-brand-muted num mb-2">—</p>
      ) : (
        <p className="text-3xl font-bold num mb-2" style={{ color }}>
          {rate.toFixed(1)}%
        </p>
      )}

      <p className="text-[11px] text-brand-muted leading-snug">
        {cohortSize === 0
          ? 'No new signups in window'
          : `${churned} cancelled of ${cohortSize} who joined`}
      </p>
    </div>
  )
}

export default function ChurnMetrics({ metrics, stripeLoading }) {
  return (
    <div
      className="animate-fade-in-up rounded-2xl border border-red-200 bg-white overflow-hidden"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}
    >
      {/* Header */}
      <div className="px-5 sm:px-6 py-4 border-b border-red-100 bg-red-50/40 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-red-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            Cohort Churn Rate
          </h2>
          <p className="text-[11px] text-red-500 mt-0.5">
            Of clients who <strong>signed up</strong> in each window — how many have since cancelled
          </p>
        </div>
        <div className="text-[10px] text-red-400 flex flex-col items-end gap-0.5">
          <span className="font-semibold">John's formula</span>
          <span>Cohort denominator = new signups in window</span>
          <span>Cancels from OTHER cohorts excluded</span>
        </div>
      </div>

      {/* 3 metric cards */}
      <div className="grid grid-cols-3 divide-x divide-brand-border">
        {metrics.map(m => (
          <Card key={m.days} {...m} loading={stripeLoading} />
        ))}
      </div>

      {/* Footer note */}
      <div className="px-5 py-2 border-t border-brand-border/40 bg-brand-bg/60 text-[10px] text-brand-muted">
        Stripe-matched accounts only &nbsp;·&nbsp; &lt;5% healthy &nbsp;·&nbsp; 5–15% watch &nbsp;·&nbsp; 15%+ critical
      </div>
    </div>
  )
}
