import { useState, useEffect, useCallback, useRef } from 'react'
import { useGHLAccounts } from './useGHLAccounts'
import { useCallData }    from './useCallData'

const STRIPE_REFRESH_MS = 300_000 // 5 min — match GHL cadence

// "2026-07" → days since July 31, 2026 (0 if still within that month or future)
function daysSinceLatestMonth(latestMonth) {
  if (!latestMonth) return null
  try {
    const [yearStr, monthStr] = latestMonth.split('-')
    const year  = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)   // 1-indexed (1 = Jan, 12 = Dec)
    if (!year || !month || month < 1 || month > 12) return null
    // new Date(year, month, 0): month is treated as 0-indexed by Date constructor, so passing the
    // 1-indexed value as-is gives us day-0 of the NEXT month, which equals the last day of our month.
    // e.g. new Date(2026, 7, 0) = last day before month-index-7 (Aug) = July 31 ✓
    const lastDay = new Date(year, month, 0)
    return Math.max(0, Math.floor((Date.now() - lastDay.getTime()) / (1000 * 60 * 60 * 24)))
  } catch {
    return null
  }
}

function useLcChargesBulk() {
  const [byLocationId,    setByLocationId]    = useState({})
  const [latestMonthById, setLatestMonthById] = useState({})
  useEffect(() => {
    fetch('/api/lc-charges-bulk')
      .then(r => r.json())
      .then(d => {
        if (d.byLocationId)    setByLocationId(d.byLocationId)
        if (d.latestMonthById) setLatestMonthById(d.latestMonthById)
      })
      .catch(() => {})
  }, [])
  return { byLocationId, latestMonthById }
}

// Sub-accounts to exclude from all counts, KPIs, and tables (internal/test/snapshot accounts)
const EXCLUDED_NAMES = new Set([
  'lgm nps survey',
  "joe perniciaro's account",
  'hlpt saas snapshot',
  'tippy taps',
  'farmers sandbox',
  '(new) sandbox',
  'mallard',
  // LGM internal add-on / test accounts (John flagged 2026-08-18 demo)
  'lgm add-on',
  'lgm add on',
  'lgm addon',
  'lgm training',
  'lgm training account',
  'lgm test',
  'lgm test account',
  'lgm demo',
  'lgm demo account',
  'little giant marketing',
  'little giant marketing agency',
])

// Normalize phone to 10 digits for matching
function normalizePhone(p) {
  const d = (p || '').replace(/\D/g, '')
  return d.length === 11 && d[0] === '1' ? d.slice(1) : d
}

// Normalize name for call-sheet matching — must mirror useCallData.js exactly
function normalizeName(n) {
  return (n || '')
    .toLowerCase()
    .replace(/'s\b/g, '')                // strip possessives: "Lewis's" → "Lewis"
    .replace(/\b(llc|inc|corp|ltd|l\.l\.c\.|incorporated|limited|company|the|agency|marketing|services|group|associates|account|insurance|at)\b\.?/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function useStripeBilling() {
  const [byEmail,      setByEmail]      = useState({})
  const [byPhone,      setByPhone]      = useState({})
  const [byNormName,   setByNormName]   = useState({})
  const [byLocId,      setByLocId]      = useState({}) // from Stripe sub/customer metadata
  const [byCustomerId, setByCustomerId] = useState({}) // keyed by Stripe cus_xxx ID
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [syncedAt,     setSyncedAt]     = useState(null)
  const timerRef = useRef(null)

  const doFetch = useCallback(async () => {
    try {
      const res = await fetch('/api/stripe-billing')
      if (!res.ok) throw new Error(`Stripe billing API returned HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const emailMap = data.byEmail || {}
      setByEmail(emailMap)
      setByPhone(data.byPhone || {})
      setByLocId(data.byLocId || {})
      setSyncedAt(data.syncedAt ? new Date(data.syncedAt) : new Date())
      setError(null)

      // byCustomerId — enables Cliff's sheet to look up full Stripe data by customer ID
      const custIdx = {}
      for (const rec of Object.values(emailMap)) {
        if (rec.stripeCustomerId) custIdx[rec.stripeCustomerId] = rec
      }
      setByCustomerId(custIdx)

      // byNormName — server builds it; rebuild client-side if absent (older deploy)
      if (data.byNormName && Object.keys(data.byNormName).length > 0) {
        setByNormName(data.byNormName)
      } else {
        const normIdx = {}
        const dupes   = new Set()
        for (const val of Object.values(emailMap)) {
          const n = normalizeName(val.stripeCustomerName)
          if (!n) continue
          if (normIdx[n]) dupes.add(n)
          else normIdx[n] = val
        }
        for (const n of dupes) delete normIdx[n]
        setByNormName(normIdx)
      }
    } catch (err) {
      console.warn('[useStripeBilling] fetch failed:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    doFetch()
    timerRef.current = setInterval(doFetch, STRIPE_REFRESH_MS)
    return () => clearInterval(timerRef.current)
  }, [doFetch])

  return { byEmail, byPhone, byNormName, byLocId, byCustomerId, loading, error, syncedAt }
}

// Reads Cliff's published Google Sheet — authoritative GHL Location ID → Stripe Customer ID mapping
function useCliffSheet() {
  const [byLocId,  setByLocId]  = useState({})
  const [loading,  setLoading]  = useState(true)
  const timerRef = useRef(null)

  const doFetch = useCallback(async () => {
    try {
      const res = await fetch('/api/cliff-sheet')
      const data = await res.json()
      if (data.byLocId) setByLocId(data.byLocId)
    } catch (_) {
      // Cliff sheet is optional — don't surface errors, just keep stale data
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    doFetch()
    timerRef.current = setInterval(doFetch, STRIPE_REFRESH_MS)
    return () => clearInterval(timerRef.current)
  }, [doFetch])

  return { byLocId, loading }
}

export function useMergedHealthData() {
  const ghl    = useGHLAccounts()
  const stripe = useStripeBilling()
  const cliff  = useCliffSheet()
  const calls  = useCallData()
  const { byLocationId: lcBulk, latestMonthById: lcMonths } = useLcChargesBulk()

  const accounts = (ghl.accounts || [])
    .filter(g => !EXCLUDED_NAMES.has((g.ghlName || '').toLowerCase().trim()))
    .map(g => {
    // Join priority (highest confidence first):
    // 1. Cliff's sheet: locationId → stripeCustomerId → full Stripe record  (authoritative)
    // 2. Stripe subscription/customer metadata: locationId stored by Cliff's Postman script
    // 3. Email exact match (case-insensitive)
    // 4. Normalized company name (unique Stripe customers only, strips LLC/Inc/etc.)
    // 5. Phone number (10-digit normalized, unique customers only)
    const email    = (g.ghlEmail || '').toLowerCase().trim()
    const normName = normalizeName(g.ghlName)
    const phone    = normalizePhone(g.ghlPhone)

    // Cliff sheet: look up location → get their Stripe customer ID → full Stripe record
    const cliffRecord   = cliff.byLocId[g.ghlId] || null
    const cliffCustRec  = cliffRecord?.stripeCustomerId
      ? stripe.byCustomerId[cliffRecord.stripeCustomerId]
      : null

    const billing = cliffCustRec
                 || (g.ghlId  && stripe.byLocId[g.ghlId])
                 || (email    && stripe.byEmail[email])
                 || (normName && stripe.byNormName[normName])
                 || (phone    && phone.length >= 10 && stripe.byPhone[phone])
                 || null

    return {
      // ── Identity ──────────────────────────────────────────
      id:               g.ghlId,
      accountName:      g.ghlName,
      locationId:       g.ghlId,
      ghlId:            g.ghlId,

      // ── GHL fields ────────────────────────────────────────
      ghlEmail:         g.ghlEmail,
      ghlPhone:         g.ghlPhone,
      ghlCity:          g.ghlCity,
      ghlState:         g.ghlState,
      ghlCountry:       g.ghlCountry,
      ghlWebsite:       g.ghlWebsite,
      ghlTimezone:      g.ghlTimezone,
      ghlDateAdded:     g.ghlDateAdded,
      ghlDateUpdated:   g.ghlDateUpdated,
      ghlDaysSinceUpdate: g.ghlDaysSinceUpdate,
      ghlPermissions:   g.ghlPermissions,
      ghlSnapshotId:    g.ghlSnapshotId,

      // ── Health scoring inputs ──────────────────────────────
      // Prefer Stripe start date (actual payment start) over GHL create date
      stripeStartDate:  billing?.stripeStartDate || g.ghlDateAdded,
      // lastActivity: LC wallet month gives real platform usage; GHL dateUpdated is fallback
      lastActivity:        daysSinceLatestMonth(lcMonths[g.ghlId]) ?? g.ghlDaysSinceUpdate,
      lastLcActivityMonth: lcMonths[g.ghlId] || null,

      // ── Stripe / billing fields ───────────────────────────
      stripeCustomerId:     billing?.stripeCustomerId     || null,
      stripeCustomerName:   billing?.stripeCustomerName   || null,
      stripeStatus:         billing?.stripeStatus         || null,
      stripeSubscriptionId: billing?.stripeSubscriptionId || null,
      planNickname:         billing?.planNickname         || null,
      planInterval:         billing?.planInterval         || null,

      // ── Monetary fields (all in $/month) ──────────────────
      totalRev:        billing?.totalRev        ?? 0,
      planPrice:       billing?.planPrice       ?? 0,
      monthlyUserSub:  billing?.monthlyUserSub  ?? 0,
      addOns:          billing?.addOns          ?? 0,
      lcWalletCharges: lcBulk[g.ghlId] ?? billing?.lcWalletCharges ?? 0,
      annualSubs:      billing?.planInterval === 'year'
        ? Math.round((billing?.planPrice ?? 0) * 12 * 100) / 100
        : 0,

      // ── Non-monetary billing fields ───────────────────────
      users:        billing?.users        ?? 0,
      transactions: billing?.transactions ?? 0, // pending: Cliff's DataHealthStatus
      gp:           billing?.gp           ?? 0, // pending: cost data
      multiLocation: false,
      accountType:  billing?.accountType  || (billing ? 'Agent' : 'Unknown'),

      // Stripe cancellation date (ISO string) — set only if subscription was cancelled
      canceledAt: billing?.canceledAt || null,

      // Internal flag — true when Stripe data was matched
      _stripeBound: !!billing,

      // ── Call intelligence (from AI Team Assistant call sheet) ─────────────
      callStats: calls.byCustomerName[normName] || null,
    }
  })

  const matched   = accounts.filter(a => a._stripeBound).length
  const unmatched = accounts.length - matched

  const dataSourceStatus = {
    ghlTotal:       ghl.accounts.length,
    stripeTotal:    Object.keys(stripe.byEmail).length,
    matched,
    unmatched,
    ghlSyncedAt:    ghl.syncedAt,
    stripeSyncedAt: stripe.syncedAt,
    byLocIdCount:   Object.keys(stripe.byLocId).length,
  }

  return {
    accounts,
    loading:      ghl.loading,   // show spinner only for GHL (primary source)
    stripeLoading: stripe.loading,
    ghlLoading:   ghl.loading,
    error:        ghl.error,
    ghlError:     ghl.error,
    stripeError:  stripe.error,
    lastUpdated:  ghl.syncedAt,
    refetch:      ghl.refetch,
    retrying:     false,
    dataSourceStatus,
  }
}
