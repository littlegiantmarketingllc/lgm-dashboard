import { useState, useEffect, useCallback, useRef } from 'react'

const CALL_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9TCj76T9TTEpUxfy26VgDxQt7fpoJiaTJ1n0ITwk477r8_EgC-2tYB7mnoXfVwtw5BxzFvY0uA1gv/pub?output=csv'
const REFRESH_MS = 300_000

// Mirrors the normalization in useMergedHealthData so keys align
function normalizeName(n) {
  return (n || '')
    .toLowerCase()
    .replace(/'s\b/g, '')
    .replace(/\b(llc|inc|corp|ltd|l\.l\.c\.|incorporated|limited|company|the|agency|marketing|services|group|associates|account|insurance|at)\b\.?/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseCSVLine(line) {
  const fields = []
  let field = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') inQ = false
      else field += ch
    } else {
      if (ch === '"') inQ = true
      else if (ch === ',') { fields.push(field); field = '' }
      else field += ch
    }
  }
  fields.push(field)
  return fields
}

function parseDate(raw) {
  const s = (raw || '').trim()
  if (!s) return ''
  // M/D/YYYY (Google Sheets US default)
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  try { return new Date(s).toISOString().slice(0,10) } catch { return s }
}

export function useCallData() {
  const [byCustomerName, setByCustomerName] = useState({})
  const [loading,        setLoading]        = useState(true)
  const timerRef = useRef(null)

  const doFetch = useCallback(async () => {
    try {
      const res = await fetch(`${CALL_SHEET_URL}&_t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) return
      const text = await res.text()
      if (text.trimStart().startsWith('<')) return

      const lines = text.split(/\r?\n/).filter(l => l.trim())
      if (lines.length < 2) return

      const headers = parseCSVLine(lines[0])
      const idx = {}
      headers.forEach((h, i) => { idx[h.trim()] = i })
      const get = (row, name) => (row[idx[name]] || '').trim()

      const calls = []
      for (let r = 1; r < lines.length; r++) {
        const row  = parseCSVLine(lines[r])
        const customer  = get(row, 'Customer')
        const employee  = get(row, 'Employee')
        const dateRaw   = get(row, 'Date')
        if (!customer || !employee) continue

        const frustrated = (() => {
          const v = get(row, 'Frustrated Flag').toLowerCase()
          return v === 'yes' || v === 'true' || v === '1'
        })()

        calls.push({
          customer,
          normCustomer:    normalizeName(customer),
          employee,
          date:            parseDate(dateRaw),
          category:        get(row, 'Category') || 'General',
          duration:        parseFloat(get(row, 'Duration (min)')) || 0,
          score:           parseFloat(get(row, 'Overall Score')) || 0,
          finalVerdict:    get(row, 'Final Verdict'),
          sentiment:       get(row, 'Customer Sentiment'),
          clientRiskLevel: get(row, 'Client Risk Level'),
          frustrated,
          summary:         get(row, 'Summary'),
          actionItems:     get(row, 'Action Items'),
          meetingId:       get(row, 'Meeting ID'),
          callType:        get(row, 'Call Type') || 'Meeting',
        })
      }

      // Group by normalized customer name
      const grouped = {}
      for (const call of calls) {
        const key = call.normCustomer
        if (!key) continue
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(call)
      }

      const lookup = {}
      for (const [key, customerCalls] of Object.entries(grouped)) {
        const sorted = [...customerCalls].sort((a, b) => b.date.localeCompare(a.date))
        const latest = sorted[0]
        const scored = customerCalls.filter(c => c.score > 0)
        const avgScore = scored.length
          ? Math.round((scored.reduce((s, c) => s + c.score, 0) / scored.length) * 10) / 10
          : 0

        // Category breakdown
        const cats = {}
        for (const c of customerCalls) cats[c.category] = (cats[c.category] || 0) + 1

        lookup[key] = {
          totalCalls:       customerCalls.length,
          lastCallDate:     latest.date,
          lastCallEmployee: latest.employee,
          lastCallCategory: latest.category,
          avgScore,
          frustratedCount:  customerCalls.filter(c => c.frustrated).length,
          riskLevel:        latest.clientRiskLevel || '',
          categories:       cats,
          recentCalls:      sorted.slice(0, 5),
        }
      }

      setByCustomerName(lookup)
    } catch (_) {
      // silently keep stale data on error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    doFetch()
    timerRef.current = setInterval(doFetch, REFRESH_MS)
    return () => clearInterval(timerRef.current)
  }, [doFetch])

  return { byCustomerName, loading }
}
