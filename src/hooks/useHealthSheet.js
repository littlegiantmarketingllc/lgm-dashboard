import { useState, useEffect, useCallback, useRef } from 'react'

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTmb8CwnD8LgR_TzLwjz2Qy1yMUz_yQqAKiOHmcQtldCuHcZs8jeHwW2zvHIXDOODtrk0c_ZxnJ6Dqq/pub?output=csv'

const REFRESH_MS  = 60_000
const RETRY_MS    = 10_000
const MAX_RETRIES = 3

// ── CSV parser ─────────────────────────────────────────────────────────────────
// Processes the whole text as one stream (not pre-split by line) so that
// quoted cells containing embedded newlines (e.g. multi-line Notes columns)
// don't shred row alignment for every row that follows them.
function parseCSV(text) {
  const rows = []
  let fields = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else field += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ',') { fields.push(field); field = '' }
      else if (ch === '\r') { /* skip, \n handles the row break */ }
      else if (ch === '\n') {
        fields.push(field)
        if (fields.some(f => f.trim() !== '')) rows.push(fields)
        fields = []; field = ''
      }
      else field += ch
    }
  }
  if (field !== '' || fields.length > 0) {
    fields.push(field)
    if (fields.some(f => f.trim() !== '')) rows.push(fields)
  }
  return rows
}

// ── Date parser ───────────────────────────────────────────────────────────────
const MONTH_MAP = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 }

function toISO(y, m, d) {
  return `${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

function parseDate(raw) {
  const s = (raw ?? '').trim()
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  if (/^\d{5}$/.test(s)) {
    const n = parseInt(s, 10)
    if (n >= 40000 && n <= 60000) {
      const d = new Date(Date.UTC(1899, 11, 30) + n * 86_400_000)
      if (!isNaN(d)) return d.toISOString().slice(0, 10)
    }
  }
  let m2 = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (m2) return toISO(m2[1], m2[2], m2[3])
  m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m2) { const [,a,b,y]=m2; return parseInt(a,10)>12 ? toISO(y,b,a) : toISO(y,a,b) }
  m2 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (m2) { const [,a,b,y]=m2; return parseInt(a,10)>12 ? toISO(y,b,a) : toISO(y,a,b) }
  m2 = s.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/)
  if (m2) { const mn=MONTH_MAP[m2[1].toLowerCase().slice(0,3)]; if (mn) return toISO(m2[3],mn,m2[2]) }
  m2 = s.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/)
  if (m2) { const mn=MONTH_MAP[m2[2].toLowerCase().slice(0,3)]; if (mn) return toISO(m2[3],mn,m2[1]) }
  try { const d=new Date(s); if (!isNaN(d.getTime())) return d.toISOString().slice(0,10) } catch {}
  return s
}

// ── Numeric helpers ───────────────────────────────────────────────────────────
function parseNum(raw) {
  if (raw === null || raw === undefined) return 0
  const n = parseFloat(String(raw).replace(/[$,\s]/g, ''))
  return isNaN(n) ? 0 : n
}

function parseIntSafe(raw) {
  if (raw === null || raw === undefined) return 0
  const n = parseInt(String(raw).replace(/[$,\s]/g, ''), 10)
  return isNaN(n) ? 0 : n
}

// ── Header → field map ────────────────────────────────────────────────────────
// Schema updated 2026-06 — John now exports a much richer sheet directly from
// his GHL/Stripe records (not yet live-API-connected, but real account data).
// "Transactions" as a standalone column is gone; SubAcnt Count carries the
// same value range and is now the at-risk/churn-volume metric.
const HEADER_PATTERNS = [
  { field: 'accountType',        tests: [/account\s*category/i, /account\s*type/i, /^type$/i] },
  { field: 'stripeStartDate',    tests: [/stripe\s*start/i, /start\s*date/i] },
  { field: 'accountName',        tests: [/^sub\s*accounts?$/i, /account\s*name/i, /^name$/i] },
  { field: 'totalRev',           tests: [/total\s*mon\.?\s*charges/i, /total\s*rev/i, /^revenue$/i] },
  { field: 'planPrice',          tests: [/^plan\s*price$/i] },
  { field: 'monthlyUserSub',     tests: [/monthly\s*user\s*sub/i] },
  { field: 'users',              tests: [/ghl\s*adj\.?\s*user\s*count/i, /users?\s*\(?adjusted\)?/i, /^users?$/i] },
  { field: 'addOns',             tests: [/add[-\s]?ons?/i] },
  { field: 'lcWalletCharges',    tests: [/lc\s*agent\s*charges/i, /lc\s*wallet/i, /wallet\s*charge/i] },
  { field: 'transactions',       tests: [/subac[cn]t\s*count/i, /^transactions?$/i, /lc\s*transactions?/i] },
  { field: 'annuallyAmt',        tests: [/^annually$/i] },
  { field: 'term',               tests: [/^term$/i] },
  { field: 'multiLocation',      tests: [/multi[-\s]?location/i] },
  { field: 'lastActivity',       tests: [/last\s*activity/i, /login\s*activity/i] },
  // New fields (no old-sheet equivalent)
  { field: 'locationId',         tests: [/^location\s*id$/i] },
  { field: 'currentPlanName',    tests: [/current\s*plan\s*name/i] },
  { field: 'agencyGrossProfit',  tests: [/^agency\s*gross\s*profit$/i] },
  { field: 'lcAgencyCosts',      tests: [/lc\s*agency\s*costs/i] },
  { field: 'lcAgencyGrossProfit',tests: [/^lc\s*agency\s*gross\s*profit$/i] },
  { field: 'dataHealthStatus',   tests: [/data\s*health\s*status/i] },
  { field: 'dataHealthNotes',    tests: [/data\s*health\s*notes/i] },
  { field: 'needsReview',        tests: [/needs\s*review/i] },
  { field: 'notes',              tests: [/^notes$/i] },
  { field: 'whatIfPlan',         tests: [/what\s*if\s*plan/i] },
  { field: 'whatIfDelta',        tests: [/what\s*if\s*delta/i] },
  { field: 'rebillLC',           tests: [/rebill\s*lc/i] },
  { field: 'firstUserIncluded',  tests: [/first\s*user\s*included/i] },
  { field: 'stripeCustomerId',   tests: [/stripe\s*customer\s*id/i] },
]

function buildHeaderMap(headerRow) {
  const map = {}
  headerRow.forEach((h, i) => {
    const trimmed = h.trim()
    for (const { field, tests } of HEADER_PATTERNS) {
      if (field in map) continue
      if (tests.some(re => re.test(trimmed))) map[field] = i
    }
  })
  return map
}

function parseBool(s) { return /^true$|^yes$/i.test(s) }

function rowToAccount(row, hmap, idx) {
  const get = (field) => (row[hmap[field]] ?? '').trim()

  const name = get('accountName')
  if (!name) return null

  const totalRev           = parseNum(get('totalRev'))
  const agencyGrossProfit  = parseNum(get('agencyGrossProfit'))
  const lcAgencyCosts      = parseNum(get('lcAgencyCosts'))
  const lcAgencyGrossProfit = parseNum(get('lcAgencyGrossProfit'))
  const transactions       = parseIntSafe(get('transactions'))
  const isAnnual            = get('term').toLowerCase() === 'annually'

  return {
    id:               idx + 1,
    accountName:      name,
    accountType:      get('accountType') || 'Unknown',
    stripeStartDate:  parseDate(get('stripeStartDate')),
    totalRev,
    planPrice:        parseNum(get('planPrice')),
    monthlyUserSub:   parseNum(get('monthlyUserSub')),
    users:            parseIntSafe(get('users')),
    addOns:           parseNum(get('addOns')),
    lcWalletCharges:  parseNum(get('lcWalletCharges')),
    transactions,
    subAcntCount:     transactions, // same source column now (SubAcnt Count)
    annualSubs:       isAnnual ? (parseNum(get('annuallyAmt')) || 1) : 0,
    multiLocation:    get('multiLocation').length > 0,
    lastActivity:     hmap['lastActivity'] !== undefined ? get('lastActivity') : null,

    // Computed locally instead of trusting the sheet's own % columns, which
    // blow up to absurd values (e.g. -1,894,554,355%) when their denominator
    // is near zero.
    gp:               totalRev > 0 ? agencyGrossProfit / totalRev : 0,

    // New fields — no old-sheet equivalent
    locationId:          get('locationId'),
    currentPlanName:     get('currentPlanName'),
    term:                get('term'),
    agencyGrossProfit,
    lcAgencyCosts,
    lcAgencyGrossProfit,
    lcGpRatio:           lcAgencyCosts > 0 ? lcAgencyGrossProfit / lcAgencyCosts : null,
    dataHealthStatus:    get('dataHealthStatus'),
    dataHealthNotes:     get('dataHealthNotes'),
    hasDataIssue:        !!get('dataHealthStatus') && get('dataHealthStatus') !== 'All Good!',
    needsReview:         parseBool(get('needsReview')),
    notes:               get('notes'),
    whatIfPlan:          get('whatIfPlan'),
    whatIfDelta:         parseNum(get('whatIfDelta')),
    rebillLC:            parseBool(get('rebillLC')),
    firstUserIncluded:   parseBool(get('firstUserIncluded')),
    stripeCustomerId:    get('stripeCustomerId'),
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useHealthSheet() {
  const [accounts, setAccounts]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [retrying, setRetrying]       = useState(false)

  const timerRef      = useRef(null)
  const retryTimerRef = useRef(null)
  const fetchRef      = useRef(null)

  fetchRef.current = async function doFetch(attempt) {
    if (attempt === 0) { clearTimeout(retryTimerRef.current); setRetrying(false) }
    setLoading(true)
    try {
      const url = `${SHEET_URL}&_t=${Date.now()}`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Google Sheets returned HTTP ${res.status}`)

      const text = await res.text()
      if (text.trimStart().startsWith('<!')) {
        const e = new Error('PUBLISH_REQUIRED'); e.publishRequired = true; throw e
      }

      const rows = parseCSV(text)
      if (rows.length < 2) throw new Error('Sheet appears empty — needs a header row and data.')

      const hmap  = buildHeaderMap(rows[0])
      const parsed = rows.slice(1).map((r, i) => rowToAccount(r, hmap, i)).filter(Boolean)

      if (parsed.length === 0) throw new Error('No valid account rows found. Check column headers match the spec.')

      setAccounts(parsed)
      setError(null)
      setRetrying(false)
      setLastUpdated(new Date())
    } catch (err) {
      const msg = err.publishRequired
        ? 'Sheet needs to be published to web (File → Share → Publish to web → CSV).'
        : err.message || 'Failed to load data from Google Sheets.'

      if (attempt < MAX_RETRIES) {
        setRetrying(true)
        setError(`${msg} — Auto-retrying (${attempt + 1}/${MAX_RETRIES})…`)
        retryTimerRef.current = setTimeout(() => fetchRef.current?.(attempt + 1), RETRY_MS)
      } else {
        setRetrying(false)
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const refetch = useCallback(() => {
    clearTimeout(retryTimerRef.current)
    clearInterval(timerRef.current)
    fetchRef.current?.(0)
    timerRef.current = setInterval(() => fetchRef.current?.(0), REFRESH_MS)
  }, [])

  useEffect(() => {
    fetchRef.current?.(0)
    timerRef.current = setInterval(() => fetchRef.current?.(0), REFRESH_MS)
    return () => { clearInterval(timerRef.current); clearTimeout(retryTimerRef.current) }
  }, [])

  return { accounts, loading, error, lastUpdated, refetch, retrying }
}
