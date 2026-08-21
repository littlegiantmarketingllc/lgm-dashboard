function Select({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-1.5 text-[11px]">
      <span className="text-brand-muted font-semibold whitespace-nowrap">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="px-2.5 py-1.5 rounded-lg border border-brand-border bg-white text-brand-text text-[11px] max-w-[180px] cursor-pointer"
      >
        <option value="">All</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}

// Client-side filters — these don't need a re-fetch, just narrowing the
// already-loaded `leads` array (unlike the date range, which needs new data
// from GHL). owners/sources are derived from whatever's actually in the
// current data, so the dropdown never offers a choice with zero results.
export default function OwnerSourceFilter({ owners, sources, ownerValue, sourceValue, onOwnerChange, onSourceChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select label="Assigned to" value={ownerValue} onChange={onOwnerChange} options={owners} />
      <Select label="Source" value={sourceValue} onChange={onSourceChange} options={sources} />
    </div>
  )
}
