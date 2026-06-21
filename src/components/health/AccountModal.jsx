import { useEffect } from 'react'
import { differenceInDays, parseISO, isValid, format } from 'date-fns'
import { isAtRisk, isUpsellReady, suggestAddon, recommendAction } from '../../lib/healthEngine'

const G   = '#8CC63F'
const AMB = '#EAB308'
const RED = '#EF4444'

function fmt(n)   { return '$' + Math.round(n).toLocaleString() }
function fmtGP(n) { return n ? `${(n * 100).toFixed(0)}%` : '—' }

function bandColor(band) {
  if (band === 'healthy') return G
  if (band === 'watch')   return AMB
  return RED
}

function bandLabel(band) {
  if (band === 'healthy') return 'Healthy'
  if (band === 'watch')   return 'Watch'
  return 'At-Risk'
}

function SubScoreBar({ label, score, weight }) {
  const pct  = Math.round(score ?? 0)
  const color = pct >= 80 ? G : pct >= 50 ? AMB : RED
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-brand-muted">{label} <span className="text-brand-border">({(weight * 100).toFixed(0)}%)</span></span>
        <span className="num font-bold" style={{ color }}>{pct}</span>
      </div>
      <div className="h-1.5 rounded-full bg-brand-border overflow-hidden">
        <div className="h-full rounded-full score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function StatBlock({ label, value }) {
  return (
    <div className="bg-brand-bg rounded-xl p-3 border border-brand-border text-center">
      <p className="num text-base font-bold text-brand-text">{value}</p>
      <p className="text-[10px] text-brand-muted uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  )
}

export default function AccountModal({ account, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!account) return null

  const { score, parts, band } = account._health || { score: 0, parts: {}, band: 'at_risk' }
  const color   = bandColor(band)
  const atRisk  = isAtRisk(account)
  const upsell  = isUpsellReady(account)
  const action  = recommendAction(account)
  const addon   = upsell ? suggestAddon(account) : null

  let tenureDays = null
  let startFormatted = null
  if (account.stripeStartDate) {
    try {
      const d = parseISO(account.stripeStartDate)
      if (isValid(d)) {
        tenureDays = differenceInDays(new Date(), d)
        startFormatted = format(d, 'MMM d, yyyy')
      }
    } catch {}
  }

  const initials = account.accountName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div className="animate-backdrop-in absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className="animate-modal-enter relative bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.20)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 bg-white border-b border-brand-border px-5 sm:px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: color }}>{initials}</div>
            <div className="min-w-0">
              <h2 className="text-brand-heading font-bold text-base truncate">{account.accountName}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border"
                  style={{ color, background: `${color}12`, borderColor: `${color}30` }}>
                  {bandLabel(band)}
                </span>
                <span className="text-[11px] text-brand-muted">{account.accountType}</span>
                {atRisk  && <span className="text-[11px] font-bold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">⚠ At-Risk</span>}
                {upsell  && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border" style={{ color: G, background: `${G}10`, borderColor: `${G}28` }}>📈 Upsell Ready</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors text-base flex-shrink-0">
            ✕
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-5">

          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBlock label="Health Score"   value={<span style={{ color }}>{score}/100</span>} />
            <StatBlock label="Transactions"   value={account.transactions.toLocaleString()} />
            <StatBlock label="Users"          value={account.users} />
            <StatBlock label="Total Rev"      value={fmt(account.totalRev)} />
          </div>

          {/* Health score breakdown */}
          <div className="rounded-xl border border-brand-border p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-3">Health Score Components</p>
            <div className="space-y-3">
              <SubScoreBar label="Transaction Volume" score={parts.txn}      weight={0.40} />
              <SubScoreBar label="User Adoption"      score={parts.users}    weight={0.20} />
              <SubScoreBar label="Revenue Level"      score={parts.rev}      weight={0.15} />
              <SubScoreBar label="Account Tenure"     score={parts.tenure}   weight={0.15} />
              {parts.activity !== null && (
                <SubScoreBar label="Login Activity"   score={parts.activity} weight={0.10} />
              )}
            </div>
            {/* Composite bar */}
            <div className="mt-4 pt-3 border-t border-brand-border">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-brand-muted font-semibold">Composite Health Score</span>
                <span className="num font-bold text-[14px]" style={{ color }}>{score}/100</span>
              </div>
              <div className="h-2 rounded-full bg-brand-border overflow-hidden">
                <div className="h-full rounded-full score-bar-fill" style={{ width: `${score}%`, background: color }} />
              </div>
            </div>
          </div>

          {/* Billing breakdown */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-3">Billing Breakdown</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: 'Plan Price',        value: fmt(account.planPrice)       },
                { label: 'Monthly User Sub',  value: fmt(account.monthlyUserSub)  },
                { label: 'Add-ons',           value: account.addOns ? fmt(account.addOns) : '—' },
                { label: 'LC Agent Charges',  value: account.lcWalletCharges ? fmt(account.lcWalletCharges) : '—' },
                { label: 'Annual Subs',       value: account.annualSubs ? fmt(account.annualSubs) : '—' },
                { label: 'Agency Gross Profit', value: fmtGP(account.gp) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-brand-bg border border-brand-border px-3 py-2.5">
                  <p className="text-[10px] text-brand-muted uppercase tracking-wider">{label}</p>
                  <p className="num text-[13px] font-semibold text-brand-text mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* LC cost leakage */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-3">LC Infrastructure Profitability</p>
            <div className={`rounded-xl border px-4 py-3 flex items-center justify-between ${
              account.lcAgencyGrossProfit < 0 ? 'border-red-200 bg-red-50' : 'border-brand-border bg-brand-bg'
            }`}>
              <div>
                <p className="text-[11px] text-brand-muted">LC Agency Costs vs. what we charge</p>
                <p className="num text-[13px] font-semibold mt-0.5" style={{ color: account.lcAgencyGrossProfit < 0 ? RED : undefined }}>
                  {account.lcAgencyGrossProfit < 0 ? `Losing ${fmt(Math.abs(account.lcAgencyGrossProfit))}/mo` : `+${fmt(account.lcAgencyGrossProfit || 0)}/mo`}
                </p>
              </div>
              <p className="text-[10px] text-brand-muted text-right">Cost: {fmt(account.lcAgencyCosts || 0)}/mo</p>
            </div>
          </div>

          {/* Account identity / plan / data health */}
          <div className="rounded-xl border border-brand-border p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">Account Details</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[12px]">
              <div>
                <p className="text-[10px] text-brand-muted uppercase tracking-wider">Location ID</p>
                <p className="font-mono text-[11px] text-brand-text mt-0.5 truncate">{account.locationId || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-brand-muted uppercase tracking-wider">Current Plan</p>
                <p className="font-medium text-brand-text mt-0.5 truncate" title={account.currentPlanName}>{account.currentPlanName?.split(':')[0] || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-brand-muted uppercase tracking-wider">Term</p>
                <p className="font-medium text-brand-text mt-0.5">{account.term || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {account.hasDataIssue && (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full" title={account.dataHealthNotes}>
                  🩹 Data issue flagged
                </span>
              )}
              {account.needsReview && (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  🔍 Needs Review
                </span>
              )}
              {Math.abs(account.whatIfDelta || 0) >= 10 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border" style={{ color: G, background: `${G}10`, borderColor: `${G}28` }}>
                  💡 Plan change modeled: {account.whatIfDelta > 0 ? '+' : ''}{fmt(account.whatIfDelta)}/mo
                </span>
              )}
            </div>
            {account.dataHealthNotes && (
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 whitespace-pre-line">{account.dataHealthNotes}</p>
            )}
          </div>

          {/* Account details */}
          <div className="rounded-xl border border-brand-border p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider">Start Date</p>
              <p className="font-medium text-brand-text mt-0.5">{startFormatted || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider">Tenure</p>
              <p className="num font-medium text-brand-text mt-0.5">{tenureDays !== null ? `${tenureDays}d` : '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider">Multi-Location</p>
              <p className="font-medium text-brand-text mt-0.5">{account.multiLocation ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider">Sub-Acnt Count</p>
              <p className="num font-medium text-brand-text mt-0.5">{account.subAcntCount.toLocaleString()}</p>
            </div>
          </div>

          {/* Rules triggered */}
          <div className="space-y-2.5">
            {atRisk && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-1">⚠ At-Risk Rule Triggered</p>
                <p className="text-[12px] text-red-700">{account.transactions < 3500
                  ? `Transactions (${account.transactions.toLocaleString()}) below 3,500 threshold`
                  : `Health score (${score}) below 50 watch threshold`}
                </p>
                <p className="text-[11px] text-red-600 mt-1.5 font-semibold">Recommended: {action}</p>
              </div>
            )}
            {upsell && addon && (
              <div className="rounded-xl border px-4 py-3" style={{ borderColor: `${G}30`, background: `${G}08` }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: G }}>📈 Upsell Rule Triggered</p>
                <p className="text-[12px]" style={{ color: '#3a6b10' }}>
                  {account.transactions.toLocaleString()} txns &gt; 3,500 AND {account.users} users &gt; 3
                </p>
                <p className="text-[11px] mt-1.5 font-semibold" style={{ color: G }}>
                  Suggested: {addon.label} — +${addon.estExtra}/mo
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
