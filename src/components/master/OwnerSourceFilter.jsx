import MultiSelect from './MultiSelect'

// Client-side filters — these don't need a re-fetch, just narrowing the
// already-loaded `leads` array (unlike the date range, which needs new data
// from GHL). owners/sources are derived from whatever's actually in the
// current data, so the dropdown never offers a choice with zero results.
// Multi-select — an empty array means "All", matching the old single-select's "" = All.
export default function OwnerSourceFilter({ owners, sources, ownerValue, sourceValue, onOwnerChange, onSourceChange }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <MultiSelect label="Assigned to" options={owners} selected={ownerValue} onChange={onOwnerChange} />
      <MultiSelect label="Source" options={sources} selected={sourceValue} onChange={onSourceChange} />
    </div>
  )
}
