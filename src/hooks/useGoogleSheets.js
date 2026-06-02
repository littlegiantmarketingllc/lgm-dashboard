import { useState, useEffect, useCallback, useRef } from 'react'

const SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9TCj76T9TTEpUxfy26VgDxQt7fpoJiaTJ1n0ITwk477r8_EgC-2tYB7mnoXfVwtw5BxzFvY0uA1gv/pub?output=csv'

const REFRESH_MS = 60_000 // auto-refresh every 60 seconds

// ─── CSV parser (handles quoted fields with commas / escaped quotes) ──────────
function parseCSV(text) {
  const rows = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const fields = []
    let field = ''
    let inQuotes = false
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s           // already YYYY-MM-DD
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)  // M/D/YYYY
  if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`
  try {
    const d = new Date(s)
    if (!isNaN(d)) return d.toISOString().slice(0, 10)
  } catch {}
  return s
}

function parseScore(raw) {
  const n = parseFloat((raw ?? '').replace(',', '.'))
  return isNaN(n) ? 0 : Math.min(10, Math.max(0, n))
}

function parseFrustrated(raw) {
  const v = String(raw ?? '').trim().toLowerCase()
  return v === 'yes' || v === 'true' || v === '1'
}

// ─── Row → call object ────────────────────────────────────────────────────────
// Sheet columns: Employee, Date, Time, Customer, Score, Frustrated, Category, Duration (min), Status
function rowToCall(row, idx) {
  const [employee, date, , customer, score, frustrated, category] = row
  const emp = (employee ?? '').trim()
  const dt  = parseDate(date)
  if (!emp || !dt) return null          // skip blank / header-like rows
  return {
    id:         idx + 1,
    employee:   emp,
    date:       dt,
    customer:   (customer ?? '').trim(),
    score:      parseScore(score),
    frustrated: parseFrustrated(frustrated),
    category:   (category ?? '').trim() || 'General',
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useGoogleSheets() {
  const [calls, setCalls]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const timerRef = useRef(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(SHEET_URL, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      const text = await res.text()

      // Detect HTML response (sheet not public / login wall)
      if (text.trimStart().startsWith('<!')) {
        throw new Error(
          'Google Sheets returned a login page. Make sure the sheet is set to ' +
          '"Anyone with the link can view" AND has been published via ' +
          'File → Share → Publish to web.'
        )
      }

      const rows = parseCSV(text)
      if (rows.length < 2) throw new Error('Sheet appears to be empty.')

      const parsed = rows
        .slice(1)                               // skip header row
        .map((row, i) => rowToCall(row, i))
        .filter(Boolean)                        // drop null / bad rows

      if (parsed.length === 0) throw new Error('No valid rows found in the sheet.')

      setCalls(parsed)
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message || 'Failed to load data from Google Sheets.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    timerRef.current = setInterval(fetchData, REFRESH_MS)
    return () => clearInterval(timerRef.current)
  }, [fetchData])

  return { calls, loading, error, lastUpdated, refetch: fetchData }
}
