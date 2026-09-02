const G = '#8CC63F'

function fmtPct(n) { return n === null || n === undefined ? '—' : Math.round(n * 10) / 10 + '%' }

// Ranked bar-list leaderboard — rows sorted by `rows` order (caller decides
// the ranking metric), each with a horizontal bar sized relative to the top
// row. Matches the vertical-stacked-bars style used on the Goals dashboard.
export default function Leaderboard({ title, subtitle, rows, valueKey, valueLabel, delay = 0, minSample, sampleKey, sampleLabel }) {
  const ranked = rows.filter(r => r[valueKey] !== null && r[valueKey] !== undefined)
  const filtered = minSample ? ranked.filter(r => (r[sampleKey] || 0) >= minSample) : ranked
  const top = [...filtered].sort((a, b) => b[valueKey] - a[valueKey]).slice(0, 8)
  const max = top.length ? Math.max(...top.map(r => r[valueKey])) : 0

  return (
    <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white p-5 sm:p-6"
      style={{ animationDelay: `${delay}ms`, boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}>
      <h2 className="text-brand-heading font-semibold text-sm">{title}</h2>
      <p className="text-brand-muted text-[10px] mt-0.5 mb-4">{subtitle}</p>

      {top.length === 0 ? (
        <p className="text-brand-muted text-sm py-10 text-center">
          {minSample ? `Not enough data yet (need ${minSample}+ ${sampleLabel || 'samples'}).` : 'No data for this window.'}
        </p>
      ) : (
        <div className="space-y-3">
          {top.map((row, i) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="w-4 flex-shrink-0 text-[10px] font-bold text-brand-muted text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-medium text-brand-text truncate">{row.label}</span>
                  <span className="num text-[11px] font-bold text-brand-text flex-shrink-0">{fmtPct(row[valueKey])}</span>
                </div>
                <div className="h-2 rounded-full bg-brand-bg overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${max > 0 ? (row[valueKey] / max) * 100 : 0}%`, background: i === 0 ? G : '#B7DD84' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {valueLabel && <p className="text-[10px] text-brand-muted mt-4">Ranked by {valueLabel}</p>}
    </div>
  )
}
