import { useState, useEffect, useCallback, useRef } from 'react'

// Publish this sheet: File → Share → Publish to web → CSV → Publish
const SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1_v96dpphxyqpJi6dv-ePlfrJr67jfo8OFaQua8tVB3s/pub?output=csv'

const REFRESH_MS  = 60_000
const RETRY_MS    = 10_000
const MAX_RETRIES = 3

// ─── CSV parser (handles quoted fields) ──────────────────────────────────────
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

// ─── Field parsers ────────────────────────────────────────────────────────────
function parseDate(raw) {
  const s = (raw ?? '').trim()
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // MM/DD/YYYY (Google Sheets US locale)
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  // Sheets serial number (days since 1899-12-30)
  if (/^\d{5}$/.test(s)) {
    const n = parseInt(s, 10)
    if (n >= 40000 && n <= 60000) {
      const d = new Date(Date.UTC(1899, 11, 30) + n * 86_400_000)
      if (!isNaN(d)) return d.toISOString().slice(0, 10)
    }
  }
  try {
    const d = new Date(s)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  } catch {}
  return s
}

function parseScore(raw) {
  const n = parseFloat((raw ?? '').replace(',', '.'))
  if (isNaN(n)) return null
  return Math.min(10, Math.max(0, n))
}

function parseBool(raw) {
  const v = String(raw ?? '').trim().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes'
}

function parsePipe(raw) {
  if (!raw || !raw.trim()) return []
  return raw.split('|').map(s => s.trim()).filter(Boolean)
}

function parseTags(raw) {
  if (!raw || !raw.trim()) return []
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

function safeStr(raw) {
  const v = (raw ?? '').trim()
  if (!v || v === 'N/A' || v === 'None' || v === 'n/a' || v === 'none' || v === '-') return ''
  return v
}

// ─── Column indices (0-based) ─────────────────────────────────────────────────
// 0:Employee  1:Date  2:Time  3:Customer  4:Category  5:Duration
// 6:FinalVerdict  7:CustomerSentiment  8:OverallScore
// 9:CommScore  10:ProfScore  11:ProdKnowScore  12:CXScore
// 13:Highlights  14:Improvements  15:RedFlags  16:BehaviorTags
// 17:CoachingRecs  18:Status  19:ActionItems  20:FollowupOwner
// 21:PromisedDeadline  22:RiskLevel  23:Summary
// 24:FrustratedFlag  25:CoachingFlag  26:MeetingID

const KNOWN_VERDICTS = new Set(['Excellent', 'Good', 'Needs Coaching', 'Immediate Attention'])

function rowToCall(row, idx) {
  if (row.length < 10) return null

  const employee = (row[0] ?? '').trim()
  const date     = parseDate(row[1])

  if (!employee || !date || date.length !== 10) return null

  const finalVerdict = (row[6] ?? '').trim()
  const meetingId    = (row[26] ?? '').trim()
  const overallScore = parseScore(row[8])

  // Detect old-format rows: must have at least one new-format signal
  const hasNewFormat = meetingId || KNOWN_VERDICTS.has(finalVerdict) || overallScore !== null
  if (!hasNewFormat) return null

  return {
    _rowIdx:        idx,
    employee,
    date,
    time:           (row[2] ?? '').trim(),
    customer:       (row[3] ?? '').trim() || 'Unknown',
    category:       (row[4] ?? '').trim() || 'General',
    duration:       Math.max(0, parseFloat((row[5] ?? '').replace(',', '.')) || 0),
    finalVerdict,
    sentiment:      (row[7] ?? '').trim(),
    overallScore:   overallScore ?? 0,
    commScore:      parseScore(row[9])  ?? 0,
    profScore:      parseScore(row[10]) ?? 0,
    prodKnowScore:  parseScore(row[11]) ?? 0,
    cxScore:        parseScore(row[12]) ?? 0,
    highlights:     parsePipe(row[13]),
    improvements:   parsePipe(row[14]),
    redFlags:       safeStr(row[15]),
    behaviorTags:   parseTags(row[16]),
    coachingRecs:   safeStr(row[17]),
    status:         (row[18] ?? '').trim(),
    actionItems:    safeStr(row[19]),
    followupOwner:  (row[20] ?? '').trim(),
    promisedDeadline: (row[21] ?? '').trim(),
    riskLevel:      (row[22] ?? '').trim(),
    summary:        safeStr(row[23]),
    frustratedFlag: parseBool(row[24]),
    coachingFlag:   parseBool(row[25]),
    meetingId:      meetingId || `auto-${idx}`,
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useQCSheet() {
  const [calls, setCalls]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [retrying, setRetrying]       = useState(false)

  const timerRef      = useRef(null)
  const retryTimerRef = useRef(null)
  const prevCountRef  = useRef(0)
  const fetchRef      = useRef(null)

  fetchRef.current = async function doFetch(attempt) {
    if (attempt === 0) {
      clearTimeout(retryTimerRef.current)
      setRetrying(false)
    }
    setLoading(true)
    try {
      const url = `${SHEET_URL}&_t=${Date.now()}`
      console.log(`[LGM QC] Fetching… (attempt ${attempt + 1}/${MAX_RETRIES + 1})`)
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Google Sheets returned HTTP ${res.status}`)

      const text = await res.text()
      if (text.trimStart().startsWith('<!')) {
        const e = new Error('PUBLISH_REQUIRED')
        e.publishRequired = true
        throw e
      }

      const rows = parseCSV(text)
      if (rows.length < 2) throw new Error('Sheet appears to be empty.')

      const parsed = rows.slice(1).map((row, i) => rowToCall(row, i)).filter(Boolean)

      if (parsed.length === 0) {
        throw new Error(
          'No valid rows found. Ensure the sheet uses the 27-column QA format and is published to web.'
        )
      }

      const prev = prevCountRef.current
      console.log(
        prev === 0
          ? `[LGM QC] Initial load: ${parsed.length} rows`
          : `[LGM QC] Refreshed: ${parsed.length} rows (was ${prev})`
      )
      prevCountRef.current = parsed.length

      setCalls(parsed)
      setError(null)
      setRetrying(false)
      setLastUpdated(new Date())
    } catch (err) {
      const msg = err.publishRequired
        ? 'Sheet not published to web. Go to File → Share → Publish to web → CSV → Publish.'
        : (err.message || 'Failed to load data from Google Sheets.')

      console.warn(`[LGM QC] Fetch failed (attempt ${attempt + 1}):`, msg)

      if (attempt < MAX_RETRIES) {
        const next = attempt + 1
        setRetrying(true)
        setError(`${msg} — Auto-retrying (${next}/${MAX_RETRIES})…`)
        retryTimerRef.current = setTimeout(() => fetchRef.current?.(next), RETRY_MS)
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
    return () => {
      clearInterval(timerRef.current)
      clearTimeout(retryTimerRef.current)
    }
  }, [])

  return { calls, loading, error, lastUpdated, refetch, retrying }
}
