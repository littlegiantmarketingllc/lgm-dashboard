import { useState, useEffect, useCallback, useRef } from 'react'

const SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9TCj76T9TTEpUxfy26VgDxQt7fpoJiaTJ1n0ITwk477r8_EgC-2tYB7mnoXfVwtw5BxzFvY0uA1gv/pub?output=csv'

const REFRESH_MS   = 60_000   // poll every 60 s
const RETRY_MS     = 10_000   // wait 10 s between retries
const MAX_RETRIES  = 3

// ─── CSV parser ──────────────────────────────────────────────────────────────
function parseCSV(text) {
  const rows = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const fields = []
    let field = '', inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { field += '"'; i++ }
        else if (ch === '"') inQuotes = false
        else field += ch
      } else {
        if (ch === '"')      inQuotes = true
        else if (ch === ',') { fields.push(field); field = '' }
        else                  field += ch
      }
    }
    fields.push(field)
    rows.push(fields)
  }
  return rows
}

// ─── Robust date parser ───────────────────────────────────────────────────────
const MONTH_MAP = {
  jan:1, feb:2, mar:3, apr:4, may:5, jun:6,
  jul:7, aug:8, sep:9, oct:10, nov:11, dec:12,
}

function toISO(y, m, d) {
  return `${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

function parseDate(raw) {
  const s = (raw ?? '').trim()
  if (!s) return ''

  // Already ISO  2024-06-03
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  // Google Sheets serial number (days since 1899-12-30)
  // Plausible range: ~40000 (2009) – ~60000 (2064)
  if (/^\d{5}$/.test(s)) {
    const n = parseInt(s, 10)
    if (n >= 40000 && n <= 60000) {
      const d = new Date(Date.UTC(1899, 11, 30) + n * 86_400_000)
      if (!isNaN(d)) return d.toISOString().slice(0, 10)
    }
  }

  // YYYY/MM/DD
  let m2 = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (m2) return toISO(m2[1], m2[2], m2[3])

  // M/D/YYYY or MM/DD/YYYY  (Google Sheets US locale default)
  m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m2) {
    const [, a, b, y] = m2
    // If first part > 12 it must be DD/MM; otherwise assume MM/DD (Google default)
    if (parseInt(a, 10) > 12) return toISO(y, b, a)
    return toISO(y, a, b)
  }

  // D-M-YYYY or DD-MM-YYYY or MM-DD-YYYY
  m2 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (m2) {
    const [, a, b, y] = m2
    if (parseInt(a, 10) > 12) return toISO(y, b, a) // day-first
    return toISO(y, a, b)
  }

  // "Jan 15, 2024" / "January 15, 2024"
  m2 = s.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/)
  if (m2) {
    const mn = MONTH_MAP[m2[1].toLowerCase().slice(0, 3)]
    if (mn) return toISO(m2[3], mn, m2[2])
  }

  // "15 Jan 2024" / "15 January 2024"
  m2 = s.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/)
  if (m2) {
    const mn = MONTH_MAP[m2[2].toLowerCase().slice(0, 3)]
    if (mn) return toISO(m2[3], mn, m2[1])
  }

  // "15-Jan-2024"
  m2 = s.match(/^(\d{1,2})-([A-Za-z]{3,9})-(\d{4})$/)
  if (m2) {
    const mn = MONTH_MAP[m2[2].toLowerCase().slice(0, 3)]
    if (mn) return toISO(m2[3], mn, m2[1])
  }

  // Last resort: native Date (handles ISO 8601 variants, RFC strings, etc.)
  try {
    const d = new Date(s)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  } catch {}

  // Return as-is and let the row be filtered later
  return s
}

// ─── Field parsers ────────────────────────────────────────────────────────────
function parseScore(raw) {
  const n = parseFloat((raw ?? '').replace(',', '.'))
  return isNaN(n) ? 0 : Math.min(10, Math.max(0, n))
}

function parseFrustrated(raw) {
  const v = String(raw ?? '').trim().toLowerCase()
  return v === 'yes' || v === 'true' || v === '1'
}

function parseDuration(raw) {
  const n = parseFloat((raw ?? '').replace(',', '.'))
  return isNaN(n) ? 0 : Math.max(0, Math.round(n))
}

// Sheet columns: Employee, Date, Time, Customer, Score, Frustrated, Category, Duration (min), Status, Call Summary
function rowToCall(row, idx) {
  const [employee, date, time, customer, score, frustrated, category, duration, , summary] = row
  const emp = (employee ?? '').trim()
  const dt  = parseDate(date)
  if (!emp || !dt) return null
  return {
    id:         idx + 1,
    employee:   emp,
    date:       dt,
    time:       (time ?? '').trim(),
    customer:   (customer ?? '').trim(),
    score:      parseScore(score),
    frustrated: parseFrustrated(frustrated),
    category:   (category ?? '').trim() || 'General',
    duration:   parseDuration(duration),
    summary:    (summary ?? '').trim(),
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useGoogleSheets() {
  const [calls, setCalls]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [retrying, setRetrying]       = useState(false)

  const timerRef      = useRef(null)   // 60-second interval
  const retryTimerRef = useRef(null)   // retry back-off timeout
  const prevCountRef  = useRef(0)      // track row count for new-row detection

  // Use a ref so the function always closes over the latest state setters
  // without needing to be recreated (avoids resetting the interval on every render)
  const fetchRef = useRef(null)

  fetchRef.current = async function doFetch(attempt) {
    if (attempt === 0) {
      clearTimeout(retryTimerRef.current)
      setRetrying(false)
    }

    // Show the spinner in the Refresh button for every fetch, not just the first
    setLoading(true)

    try {
      // Cache-bust the URL so Google's CDN always returns fresh data
      const url = `${SHEET_URL}&_t=${Date.now()}`
      console.log(`[LGM] Fetching sheet data… (attempt ${attempt + 1}/${MAX_RETRIES + 1})`)

      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Google Sheets returned HTTP ${res.status}`)

      const text = await res.text()

      // Google returns an HTML login page when the sheet isn't published
      if (text.trimStart().startsWith('<!')) {
        const e = new Error('PUBLISH_REQUIRED')
        e.publishRequired = true
        throw e
      }

      const rows = parseCSV(text)
      if (rows.length < 2) throw new Error('Sheet appears to be empty — add a header row and at least one data row.')

      const parsed = rows
        .slice(1)
        .map((row, i) => rowToCall(row, i))
        .filter(Boolean)

      if (parsed.length === 0) {
        throw new Error(
          'No valid rows found. Check that the Employee and Date columns are filled in and the date format is recognised.'
        )
      }

      // Log row-count changes so issues are easy to spot in DevTools
      const prev = prevCountRef.current
      if (prev === 0) {
        console.log(`[LGM] Initial load: ${parsed.length} rows`)
      } else if (parsed.length > prev) {
        console.log(`[LGM] New rows detected! ${prev} → ${parsed.length} (+${parsed.length - prev})`)
      } else if (parsed.length < prev) {
        console.log(`[LGM] Row count decreased: ${prev} → ${parsed.length}`)
      } else {
        console.log(`[LGM] Refreshed: ${parsed.length} rows (no change)`)
      }
      prevCountRef.current = parsed.length

      setCalls(parsed)
      setError(null)
      setRetrying(false)
      setLastUpdated(new Date())
    } catch (err) {
      const msg = err.publishRequired
        ? 'Your Google Sheet needs to be published to web. Go to File → Share → Publish to web → choose CSV and click Publish.'
        : err.message || 'Failed to load data from Google Sheets.'

      console.warn(`[LGM] Fetch failed (attempt ${attempt + 1}):`, msg)

      if (attempt < MAX_RETRIES) {
        const next = attempt + 1
        console.log(`[LGM] Retrying in ${RETRY_MS / 1000}s… (${next}/${MAX_RETRIES})`)
        setRetrying(true)
        setError(`${msg} — Auto-retrying (${next}/${MAX_RETRIES})…`)
        retryTimerRef.current = setTimeout(() => fetchRef.current?.(next), RETRY_MS)
      } else {
        console.error(`[LGM] All ${MAX_RETRIES} retries exhausted. Showing error.`)
        setRetrying(false)
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  // Manual refetch: cancels any pending retry, resets the 60-second interval
  const refetch = useCallback(() => {
    clearTimeout(retryTimerRef.current)
    clearInterval(timerRef.current)
    fetchRef.current?.(0)
    timerRef.current = setInterval(() => fetchRef.current?.(0), REFRESH_MS)
  }, [])

  useEffect(() => {
    fetchRef.current?.(0)
    timerRef.current = setInterval(() => fetchRef.current?.(0), REFRESH_MS)
    return () => {
      clearInterval(timerRef.current)
      clearTimeout(retryTimerRef.current)
    }
  }, []) // intentionally empty: set up once on mount

  return { calls, loading, error, lastUpdated, refetch, retrying }
}
