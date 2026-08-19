import { useEffect, useState, useCallback } from 'react'
import { differenceInDays, parseISO, isValid, format } from 'date-fns'
import { recommendAction, enhancedScoreAccount, classify } from '../../lib/healthEngine'
import GHLInfoPanel from './GHLInfoPanel'
import InfoTip from './InfoTip'
import { supabase } from '../../lib/supabase'

const NOISE = /\b(agency|llc|inc|corp|insurance|marketing|services|group|associates|co\.?|ltd|the)\b/gi
function buildGHLQuery(name) {
  return name.replace(NOISE, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 2).join(' ')
}

const G   = '#8CC63F'
const AMB = '#EAB308'
const RED = '#EF4444'

function bandColor(band) {
  if (band === 'healthy') return G
  if (band === 'watch')   return AMB
  return RED
}
function bandLabel(band) {
  if (band === 'healthy') return 'Active'
  if (band === 'watch')   return 'Slowing'
  return 'Stale'
}

function SubScoreBar({ label, score }) {
  const pct   = Math.round(score ?? 0)
  const color = pct >= 70 ? G : pct >= 40 ? AMB : RED
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-brand-muted">{label}</span>
        <span className="num font-bold" style={{ color }}>{pct}</span>
      </div>
      <div className="h-1.5 rounded-full bg-brand-border overflow-hidden">
        <div className="h-full rounded-full score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function AccountModal({ account, onClose }) {
  const [ghlData,    setGhlData]    = useState(null)
  const [ghlLoading, setGhlLoading] = useState(false)
  const [ghlError,   setGhlError]   = useState(null)

  const [liveMetrics,        setLiveMetrics]        = useState(null)
  const [liveMetricsLoading, setLiveMetricsLoading] = useState(true)
  const [liveMetricsError,   setLiveMetricsError]   = useState(null)

  const [fdTickets,        setFdTickets]        = useState(null)
  const [fdLoading,        setFdLoading]        = useState(true)

  const [lcCharges,        setLcCharges]        = useState(null)
  const [lcLoading,        setLcLoading]        = useState(true)

  const [ghlStats,         setGhlStats]         = useState(null)
  const [ghlStatsLoading,  setGhlStatsLoading]  = useState(true)

  const fetchGHLInfo = useCallback(async () => {
    if (ghlLoading) return
    setGhlLoading(true)
    setGhlError(null)
    try {
      const q = buildGHLQuery(account.accountName)
      const res = await fetch(`/api/ghl-contact?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setGhlData(data)
    } catch (err) {
      setGhlError(err.message)
    } finally {
      setGhlLoading(false)
    }
  }, [account.accountName, ghlLoading])

  // Auto-fetch per-location metrics (users, contacts, opportunities) via OAuth KV
  useEffect(() => {
    if (!account.ghlId) { setLiveMetricsLoading(false); return }
    setLiveMetricsLoading(true)
    setLiveMetricsError(null)
    fetch(`/api/ghl-location-data?locationId=${encodeURIComponent(account.ghlId)}`)
      .then(r => r.json())
      .then(data => { setLiveMetrics(data); setLiveMetricsLoading(false) })
      .catch(err => { setLiveMetricsError(err.message); setLiveMetricsLoading(false) })
  }, [account.ghlId])

  // Auto-fetch Freshdesk support ticket summary
  useEffect(() => {
    if (!account.ghlId) { setFdLoading(false); return }
    setFdLoading(true)
    fetch(`/api/freshdesk-data?locationId=${encodeURIComponent(account.ghlId)}`)
      .then(r => r.json())
      .then(data => { setFdTickets(data); setFdLoading(false) })
      .catch(() => { setFdLoading(false) })
  }, [account.ghlId])

  // Auto-fetch LC wallet charges from Cliff's migrated data
  useEffect(() => {
    if (!account.ghlId) { setLcLoading(false); return }
    setLcLoading(true)
    fetch(`/api/lc-charges?locationId=${encodeURIComponent(account.ghlId)}`)
      .then(r => r.json())
      .then(data => { setLcCharges(data); setLcLoading(false) })
      .catch(() => { setLcLoading(false) })
  }, [account.ghlId])

  // Fetch GHL sub-account stats (last login + call/email/sms volumes from CSV export)
  useEffect(() => {
    if (!account.ghlId) { setGhlStatsLoading(false); return }
    setGhlStatsLoading(true)
    supabase
      .from('ghl_account_stats')
      .select('last_login, active_users, contacts, total_calls, inbound_calls, outbound_calls, total_emails, total_sms, form_submissions, appointments, google_reviews, positive_reviews, synced_at')
      .eq('location_id', account.ghlId)
      .maybeSingle()
      .then(({ data }) => { setGhlStats(data); setGhlStatsLoading(false) })
      .catch(() => { setGhlStatsLoading(false) })
  }, [account.ghlId])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!account) return null

  // Use enhanced score when live metrics are loaded, fall back to basic score
  const baseHealth = account._health || { score: 0, parts: {}, band: 'at_risk' }
  const enhanced   = (!liveMetricsLoading && liveMetrics?.oauthConnected)
    ? enhancedScoreAccount(account, liveMetrics)
    : null
  const displayScore = enhanced ?? baseHealth
  const { score, parts } = displayScore
  const band   = classify(score)
  const color  = bandColor(band)
  const action = recommendAction(account)
  const isEnhanced = !!enhanced

  const dateAdded = account.ghlDateAdded
  let tenureDays = null, joinFormatted = null
  if (dateAdded) {
    try {
      const d = parseISO(dateAdded)
      if (isValid(d)) {
        tenureDays    = differenceInDays(new Date(), d)
        joinFormatted = format(d, 'MMM d, yyyy')
      }
    } catch {}
  }

  const initials = account.accountName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  // LC wallet proxy (batch data, last month with charges)
  const lcDays   = account.lastLcActivityMonth ? account.lastActivity : null
  const lcSource = account.lastLcActivityMonth ? `LC · ${account.lastLcActivityMonth}` : null

  // The activity sub-score is real LC wallet data only when we actually have it for
  // this account — otherwise it's silently using the GHL "record last updated" fallback,
  // which can reflect LGM staff touching the sub-account rather than the client using it.
  const activityLabel = account.lastLcActivityMonth
    ? `LC Platform Activity (last wallet charge, ${account.lastLcActivityMonth})`
    : 'GHL Sub-Account Activity (no LC data — record last updated, may not reflect real client usage)'

  // Real-time activity: most recently updated contact in this sub-account (loads with liveMetrics)
  // This is the true "client using their GHL" signal — contact/CRM changes by the client's own team
  const realtimeDays = liveMetrics?.lastContactUpdate
    ? Math.max(0, Math.floor((Date.now() - new Date(liveMetrics.lastContactUpdate).getTime()) / (1000 * 60 * 60 * 24)))
    : null

  // GHL sub-account last login (from agency CSV export stored in ghl_account_stats)
  let lastLoginDays = null, lastLoginFormatted = null
  if (ghlStats?.last_login) {
    try {
      const d = parseISO(ghlStats.last_login)
      if (isValid(d)) {
        lastLoginDays      = differenceInDays(new Date(), d)
        lastLoginFormatted = format(d, 'MMM d, yyyy')
      }
    } catch {}
  }
  const loginColor = lastLoginDays !== null ? (lastLoginDays <= 7 ? G : lastLoginDays <= 30 ? AMB : RED) : undefined

  // Prefer real-time GHL signal over LC proxy, then portal last_login as a final fallback
  const days      = realtimeDays ?? lcDays ?? lastLoginDays
  const actSource = realtimeDays !== null ? 'GHL sub-account' : lcSource ?? (lastLoginDays !== null ? 'GHL portal login' : null)
  const actColor  = days !== null ? (days <= 7 ? G : days <= 30 ? AMB : RED) : undefined

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div className="animate-backdrop-in absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className="animate-modal-enter relative bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.20)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
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
                {days !== null && days !== undefined && (
                  <span className="text-[11px] text-brand-muted">
                    Last active: <span className="font-semibold" style={{ color: actColor }}>
                      {days === 0 ? 'today' : `${days}d ago`}
                    </span>
                    {realtimeDays !== null && (
                      <span className="ml-1 text-[9px] font-semibold px-1 py-0.5 rounded" style={{ background: '#8CC63F15', color: '#3a6b10' }}>
                        live
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors text-base flex-shrink-0">
            ✕
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-5">

          {/* Health score */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-brand-bg rounded-xl p-3 border border-brand-border text-center relative">
              <div className="absolute top-2 right-2">
                <InfoTip
                  text={isEnhanced
                    ? `Enhanced score: Activity 30% (${account.lastLcActivityMonth ? 'days since last LC wallet charge' : 'no LC data — using GHL record-updated date instead'}) · CRM Contacts 40% (how much data is in their system) · Pipeline Opportunities 30% (deals being tracked). Higher = more active client.`
                    : `Activity score: 100 = active today, 90 = last 7 days, 75 = last 2 weeks, 60 = last 30 days, 40 = last 60 days, 20 = last 90 days, 5 = 90+ days. ${account.lastLcActivityMonth ? 'Based on LC wallet data.' : 'No LC wallet data for this account yet — based on GHL record-updated date, which is not a reliable usage signal.'} Enhanced score (contacts + pipeline) loads automatically below.`}
                  position="top-end"
                />
              </div>
              <p className="num text-base font-bold" style={{ color }}>{score}/100</p>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider mt-0.5">
                {isEnhanced ? 'Health Score ✦' : 'Health Score'}
              </p>
            </div>
            <div className="bg-brand-bg rounded-xl p-3 border border-brand-border text-center">
              <p className="num text-base font-bold text-brand-text">
                {joinFormatted || '—'}
              </p>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider mt-0.5">Joined GHL</p>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="rounded-xl border border-brand-border p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">Score Breakdown</p>
              {isEnhanced && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#8CC63F18', color: '#3a6b10' }}>
                  ENHANCED
                </span>
              )}
            </div>
            {isEnhanced ? (
              <>
                <SubScoreBar label={`${activityLabel} — 30% of score`} score={parts.activity} />
                <SubScoreBar label="CRM Contacts in their system — 40% of score" score={parts.contacts} />
                <SubScoreBar label="Opportunities / pipeline deals — 30% of score" score={parts.opps} />
              </>
            ) : (
              <SubScoreBar label={activityLabel} score={parts.activity} />
            )}
            <div className="mt-3 pt-3 border-t border-brand-border">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-brand-muted font-semibold">Composite</span>
                <span className="num font-bold text-[14px]" style={{ color }}>{score}/100</span>
              </div>
              <div className="h-2 rounded-full bg-brand-border overflow-hidden">
                <div className="h-full rounded-full score-bar-fill" style={{ width: `${score}%`, background: color }} />
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="rounded-xl border px-4 py-3" style={{
            borderColor: `${color}30`, background: `${color}08`
          }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color }}>Recommended Action</p>
            <p className="text-[12px]" style={{ color: band === 'at_risk' ? RED : band === 'watch' ? AMB : '#3a6b10' }}>
              {action}
            </p>
          </div>

          {/* GHL location details */}
          <div className="rounded-xl border border-brand-border p-4 grid grid-cols-2 gap-3 text-[12px]">
            {account.ghlId && (
              <div className="col-span-2">
                <a
                  href={`https://app.gohighlevel.com/v2/location/${account.ghlId}/dashboard`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors"
                  style={{ color: G, background: `${G}10`, borderColor: `${G}30` }}
                >
                  Open in GHL →
                </a>
              </div>
            )}
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider">
                {realtimeDays !== null ? 'Last Active in GHL' : 'Last Active'}
              </p>
              <p className="num font-medium mt-0.5" style={{ color: days !== null ? actColor : undefined }}>
                {days !== null ? (days === 0 ? 'Today' : `${days} days ago`) : '—'}
              </p>
              {actSource && <p className="text-[9px] text-brand-muted/50 mt-0.5 leading-none">{actSource}</p>}
            </div>
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider">Tenure</p>
              <p className="num font-medium text-brand-text mt-0.5">
                {tenureDays !== null ? `${tenureDays} days` : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider">Email</p>
              <p className="font-medium text-brand-text mt-0.5 truncate">{account.ghlEmail || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider">Phone</p>
              <p className="font-medium text-brand-text mt-0.5">{account.ghlPhone || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider">Location</p>
              <p className="font-medium text-brand-text mt-0.5">
                {[account.ghlCity, account.ghlState].filter(Boolean).join(', ') || '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-brand-muted uppercase tracking-wider">Timezone</p>
              <p className="font-medium text-brand-text mt-0.5">{account.ghlTimezone || '—'}</p>
            </div>
            {account.ghlWebsite && (
              <div className="col-span-2">
                <p className="text-[10px] text-brand-muted uppercase tracking-wider">Website</p>
                <a href={account.ghlWebsite} target="_blank" rel="noopener noreferrer"
                  className="font-medium text-brand-text mt-0.5 hover:underline truncate block"
                  style={{ color: G }}>
                  {account.ghlWebsite}
                </a>
              </div>
            )}
          </div>

          {/* Live Metrics — users, contacts, opportunities via OAuth KV */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-2">Live Account Metrics</p>
            {liveMetricsLoading ? (
              <div className="rounded-xl border border-brand-border p-4 flex items-center gap-2 text-[11px] text-brand-muted">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-brand-border border-t-brand-green animate-spin flex-shrink-0" />
                Fetching live data from GHL…
              </div>
            ) : liveMetricsError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] text-red-700">
                Could not load live metrics: {liveMetricsError}
              </div>
            ) : liveMetrics && !liveMetrics.oauthConnected ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-700">
                OAuth token not yet available for this location. Once the marketplace app is installed for this account, metrics will appear here automatically.
              </div>
            ) : liveMetrics ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Team Members',   value: liveMetrics.users,         icon: '👤' },
                  { label: 'Contacts',       value: liveMetrics.contacts,      icon: '📋' },
                  { label: 'Opportunities',  value: liveMetrics.opportunities,  icon: '🎯' },
                  { label: 'Conversations',  value: liveMetrics.conversations,  icon: '💬' },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="bg-brand-bg rounded-xl border border-brand-border p-3 text-center">
                    <div className="text-base mb-0.5">{icon}</div>
                    <p className="num text-sm font-bold text-brand-text">
                      {value === null ? '—' : value.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-brand-muted mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            ) : null}
            {liveMetrics?.lastContactUpdate && (
              <div className="mt-2 px-3.5 py-2.5 rounded-xl border border-brand-border bg-brand-bg/60 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">Last CRM Activity</p>
                  <p className="text-[11px] font-semibold mt-0.5" style={{ color: realtimeDays !== null ? actColor : undefined }}>
                    {realtimeDays === 0 ? 'Today' : realtimeDays === 1 ? 'Yesterday' : `${realtimeDays} days ago`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-brand-muted">Contact updated</p>
                  <p className="text-[10px] font-medium text-brand-text mt-0.5">
                    {new Date(liveMetrics.lastContactUpdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Freshdesk Support Tickets */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-2">
              Support Tickets
              <span className="ml-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full normal-case"
                style={{ background: '#22c55e12', color: '#15803d', border: '1px solid #22c55e30' }}>
                Freshdesk
              </span>
            </p>
            {fdLoading ? (
              <div className="rounded-xl border border-brand-border p-4 flex items-center gap-2 text-[11px] text-brand-muted">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-brand-border border-t-brand-green animate-spin flex-shrink-0" />
                Loading support tickets…
              </div>
            ) : !fdTickets || !fdTickets.found ? (
              <div className="rounded-xl border border-brand-border bg-brand-bg p-3 text-[11px] text-brand-muted">
                No support account found in Freshdesk for this client.
              </div>
            ) : (
              <div className="rounded-xl border border-brand-border overflow-hidden">
                <div className="grid grid-cols-4 divide-x divide-brand-border">
                  {[
                    { label: 'Open', value: fdTickets.openCount, color: fdTickets.openCount > 0 ? RED : G },
                    { label: 'Pending', value: fdTickets.pendingCount, color: fdTickets.pendingCount > 0 ? AMB : null },
                    { label: 'Urgent', value: fdTickets.urgentCount, color: fdTickets.urgentCount > 0 ? RED : null },
                    { label: 'Total', value: fdTickets.totalCount, color: null },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="px-3 py-2.5 text-center bg-brand-bg/40">
                      <p className="num text-sm font-bold" style={{ color: color || 'inherit' }}>{value}</p>
                      <p className="text-[10px] text-brand-muted mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
                {fdTickets.avgSentiment !== null && (
                  <div className="px-4 py-2.5 border-t border-brand-border flex items-center justify-between bg-white">
                    <span className="text-[11px] text-brand-muted">Avg Sentiment</span>
                    <span className="num text-[11px] font-bold" style={{
                      color: fdTickets.avgSentiment >= 70 ? G : fdTickets.avgSentiment >= 40 ? AMB : RED
                    }}>
                      {fdTickets.avgSentiment}/100
                    </span>
                  </div>
                )}
                {fdTickets.lastTicketAt && (
                  <div className="px-4 py-2 border-t border-brand-border flex items-center justify-between bg-brand-bg/30">
                    <span className="text-[10px] text-brand-muted">Last ticket</span>
                    <span className="text-[10px] text-brand-muted">
                      {new Date(fdTickets.lastTicketAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                )}
                {fdTickets.recentOpen?.length > 0 && (
                  <div className="border-t border-brand-border/50">
                    <p className="px-4 pt-2.5 pb-1 text-[9px] font-bold uppercase tracking-wider text-brand-muted/70">
                      Open / Pending Tickets
                    </p>
                    <div className="divide-y divide-brand-border/30">
                      {fdTickets.recentOpen.map(t => (
                        <div key={t.id} className="px-4 py-2 flex items-center justify-between gap-2 bg-white hover:bg-brand-bg/30 transition-colors">
                          <p className="text-[11px] text-brand-text leading-snug flex-1 min-w-0 truncate">{t.subject}</p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {t.priority >= 3 && (
                              <span className="text-[8px] font-bold px-1 py-0.5 rounded border"
                                style={{ color: RED, background: '#EF444412', borderColor: '#EF444430' }}>
                                {t.priority === 4 ? 'URGENT' : 'HIGH'}
                              </span>
                            )}
                            <span className={`text-[9px] font-semibold px-1 py-0.5 rounded ${t.status === 2 ? 'text-red-600' : 'text-amber-600'}`}>
                              {t.status === 2 ? 'Open' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* GHL Sub-Account Stats (from agency CSV export) */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-2">
              GHL Sub-Account Activity
              <span className="ml-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full normal-case"
                style={{ background: '#3b82f612', color: '#1d4ed8', border: '1px solid #3b82f630' }}>
                Agency export
              </span>
            </p>
            {ghlStatsLoading ? (
              <div className="rounded-xl border border-brand-border p-4 flex items-center gap-2 text-[11px] text-brand-muted">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-brand-border border-t-brand-green animate-spin flex-shrink-0" />
                Loading sub-account stats…
              </div>
            ) : !ghlStats ? (
              <div className="rounded-xl border border-brand-border bg-brand-bg p-3 text-[11px] text-brand-muted">
                No sub-account stats found — location not yet in the export database.
              </div>
            ) : (
              <div className="rounded-xl border border-brand-border overflow-hidden">
                {/* Last Login */}
                <div className="px-4 py-3 bg-brand-bg/60 border-b border-brand-border flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">Last Login to GHL Portal</p>
                    <p className="text-[13px] font-bold mt-0.5" style={{ color: loginColor ?? 'inherit' }}>
                      {lastLoginFormatted
                        ? `${lastLoginFormatted} · ${lastLoginDays === 0 ? 'today' : `${lastLoginDays}d ago`}`
                        : 'Never logged in'}
                    </p>
                  </div>
                  {lastLoginDays !== null && (
                    <span className="text-[9px] font-bold px-2 py-1 rounded-full border flex-shrink-0"
                      style={{
                        color: loginColor,
                        background: `${loginColor}12`,
                        borderColor: `${loginColor}30`,
                      }}>
                      {lastLoginDays <= 7 ? 'Recently active' : lastLoginDays <= 30 ? 'Moderately active' : 'Low activity'}
                    </span>
                  )}
                </div>
                {/* Activity metrics grid */}
                <div className="grid grid-cols-3 divide-x divide-brand-border border-b border-brand-border">
                  {[
                    { label: 'Total Calls',  value: ghlStats.total_calls },
                    { label: 'Emails Sent',  value: ghlStats.total_emails },
                    { label: 'SMS Sent',     value: ghlStats.total_sms },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center bg-white">
                      <p className="num text-sm font-bold text-brand-text">{(value ?? 0).toLocaleString()}</p>
                      <p className="text-[10px] text-brand-muted mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 divide-x divide-brand-border">
                  {[
                    { label: 'Active Users',      value: ghlStats.active_users },
                    { label: 'Form Submissions',  value: ghlStats.form_submissions },
                    { label: 'Appointments',      value: ghlStats.appointments },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-3 py-2.5 text-center bg-brand-bg/30">
                      <p className="num text-sm font-bold text-brand-text">{(value ?? 0).toLocaleString()}</p>
                      <p className="text-[10px] text-brand-muted mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
                {ghlStats.synced_at && (
                  <div className="px-4 py-1.5 border-t border-brand-border/50 bg-brand-bg/20 text-right">
                    <span className="text-[9px] text-brand-muted/60">
                      Data as of {format(parseISO(ghlStats.synced_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* LC Platform Usage */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-2">
              LC Platform Usage
              <span className="ml-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full normal-case"
                style={{ background: '#8CC63F12', color: '#3a6b10', border: '1px solid #8CC63F30' }}>
                Wallet charges
              </span>
            </p>
            {lcLoading ? (
              <div className="rounded-xl border border-brand-border p-4 flex items-center gap-2 text-[11px] text-brand-muted">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-brand-border border-t-brand-green animate-spin flex-shrink-0" />
                Loading LC charges…
              </div>
            ) : !lcCharges || !lcCharges.hasData ? (
              <div className="rounded-xl border border-brand-border bg-brand-bg p-3 text-[11px] text-brand-muted">
                No LC wallet charges found for this account.
              </div>
            ) : (
              <div className="rounded-xl border border-brand-border overflow-hidden">
                <div className="px-4 py-2.5 bg-brand-bg/60 border-b border-brand-border flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-brand-text">Total charges (all time)</span>
                  <span className="num text-[13px] font-bold text-brand-text">${lcCharges.totalAmount.toLocaleString()}</span>
                </div>
                <div className="divide-y divide-brand-border">
                  {lcCharges.breakdown.map(row => (
                    <div key={row.type} className="px-4 py-2 flex items-center justify-between bg-white hover:bg-brand-bg/30 transition-colors">
                      <div>
                        <p className="text-[11px] font-medium text-brand-text">{row.type}</p>
                        <p className="text-[10px] text-brand-muted">{row.count.toLocaleString()} transactions · latest {row.latestMonth}</p>
                      </div>
                      <span className="num text-[12px] font-bold text-brand-text">${row.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Call Intelligence */}
          {account.callStats ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-2">
                Call Intelligence
                <span className="ml-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full normal-case"
                  style={{ background: '#8CC63F12', color: '#3a6b10', border: '1px solid #8CC63F30' }}>
                  AI Team Assistant
                </span>
              </p>
              <div className="rounded-xl border border-brand-border overflow-hidden">
                {/* Summary stats */}
                <div className="grid grid-cols-3 divide-x divide-brand-border border-b border-brand-border">
                  {[
                    { label: 'Total Calls',  value: account.callStats.totalCalls,     color: null },
                    { label: 'Avg Score',    value: account.callStats.avgScore > 0 ? `${account.callStats.avgScore}/10` : '—', color: account.callStats.avgScore >= 7 ? G : account.callStats.avgScore >= 5 ? AMB : RED },
                    { label: 'Frustrated',   value: account.callStats.frustratedCount > 0 ? account.callStats.frustratedCount : '0', color: account.callStats.frustratedCount > 0 ? RED : G },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="px-3 py-2.5 text-center bg-brand-bg/40">
                      <p className="num text-sm font-bold" style={{ color: color || 'inherit' }}>{value}</p>
                      <p className="text-[10px] text-brand-muted mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
                {/* Last call + risk */}
                <div className="px-4 py-2.5 flex items-center justify-between gap-2 text-[11px] border-b border-brand-border/50 bg-white">
                  <div>
                    <span className="text-brand-muted">Last call:</span>
                    <span className="font-semibold text-brand-text ml-1">{account.callStats.lastCallDate || '—'}</span>
                    <span className="text-brand-muted ml-1">by</span>
                    <span className="text-brand-text ml-1">{account.callStats.lastCallEmployee}</span>
                    <span className="ml-1 text-brand-muted">· {account.callStats.lastCallCategory}</span>
                  </div>
                  {account.callStats.riskLevel && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0"
                      style={{
                        color:       account.callStats.riskLevel === 'High' ? RED : account.callStats.riskLevel === 'Medium' ? AMB : G,
                        background:  account.callStats.riskLevel === 'High' ? '#EF444412' : account.callStats.riskLevel === 'Medium' ? '#EAB30812' : '#8CC63F12',
                        borderColor: account.callStats.riskLevel === 'High' ? '#EF444430' : account.callStats.riskLevel === 'Medium' ? '#EAB30830' : '#8CC63F30',
                      }}>
                      {account.callStats.riskLevel} Risk
                    </span>
                  )}
                </div>
                {/* Category breakdown */}
                {Object.keys(account.callStats.categories).length > 0 && (
                  <div className="px-4 py-2.5 flex flex-wrap gap-1.5 border-b border-brand-border/50 bg-white">
                    {Object.entries(account.callStats.categories).sort((a,b) => b[1]-a[1]).map(([cat, cnt]) => (
                      <span key={cat} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-bg border border-brand-border text-brand-muted">
                        {cat} ×{cnt}
                      </span>
                    ))}
                  </div>
                )}
                {/* Recent calls */}
                <div className="divide-y divide-brand-border/50">
                  {account.callStats.recentCalls.map((c, i) => (
                    <div key={c.meetingId || i} className="px-4 py-2.5 bg-white">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-[11px] font-semibold text-brand-text">{c.date}</span>
                        <div className="flex items-center gap-1.5">
                          {c.score > 0 && (
                            <span className="num text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ color: c.score >= 7 ? G : c.score >= 5 ? AMB : RED,
                                       background: c.score >= 7 ? '#8CC63F12' : c.score >= 5 ? '#EAB30812' : '#EF444412' }}>
                              {c.score}/10
                            </span>
                          )}
                          {c.frustrated && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-600">
                              Frustrated
                            </span>
                          )}
                          <span className="text-[10px] text-brand-muted">{c.category}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-brand-muted leading-relaxed line-clamp-2">{c.summary}</p>
                      {c.actionItems && (
                        <p className="text-[10px] text-amber-700 mt-1 leading-relaxed line-clamp-1">
                          Action: {c.actionItems}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-2">Call Intelligence</p>
              <div className="rounded-xl border border-brand-border px-4 py-3 text-[11px] text-brand-muted bg-brand-bg/40">
                No call records found for this account. Calls are matched by client name from the AI Team Assistant dashboard.
              </div>
            </div>
          )}

          {/* Live GHL CRM */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-2">CRM Contact Lookup</p>
            <GHLInfoPanel
              data={ghlData}
              loading={ghlLoading}
              error={ghlError}
              onFetch={fetchGHLInfo}
            />
          </div>

        </div>
      </div>
    </div>
  )
}
