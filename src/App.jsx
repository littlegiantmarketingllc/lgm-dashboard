import { useState, useMemo } from 'react'
import { subDays, parseISO, startOfDay, format, eachDayOfInterval } from 'date-fns'
import Header from './components/Header'
import SummaryCards from './components/SummaryCards'
import QuickStats from './components/QuickStats'
import TopPerformer from './components/TopPerformer'
import EmployeeTable from './components/EmployeeTable'
import MeetingsChart from './components/MeetingsChart'
import FrustratedTable from './components/FrustratedTable'
import ActivityFeed from './components/ActivityFeed'
import { rawCalls } from './data/sampleData'

const RANGE_OPTIONS = [
  { label: '7d',  value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
  { label: 'All', value: 9999 },
]

function filterByRange(calls, days) {
  if (days >= 9999) return calls
  const cutoff = startOfDay(subDays(new Date(), days))
  return calls.filter(c => startOfDay(parseISO(c.date)) >= cutoff)
}

function filterByWindow(calls, fromDays, toDays) {
  const start = startOfDay(subDays(new Date(), fromDays))
  const end   = startOfDay(subDays(new Date(), toDays))
  return calls.filter(c => {
    const d = startOfDay(parseISO(c.date))
    return d >= start && d < end
  })
}

function pctChange(curr, prev) {
  if (prev === 0 && curr === 0) return null
  if (prev === 0) return null
  return Math.round((curr - prev) / prev * 100)
}

export default function App() {
  const [rangeDays, setRangeDays] = useState(30)

  const filteredCalls = useMemo(() => filterByRange(rawCalls, rangeDays), [rangeDays])

  const prevCalls = useMemo(() =>
    rangeDays < 9999 ? filterByWindow(rawCalls, rangeDays * 2, rangeDays) : [],
    [rangeDays]
  )

  const summary = useMemo(() => {
    const total      = filteredCalls.length
    const frustrated = filteredCalls.filter(c => c.frustrated).length
    const positive   = total - frustrated
    return { total, positive, frustrated }
  }, [filteredCalls])

  const prevSummary = useMemo(() => {
    const total      = prevCalls.length
    const frustrated = prevCalls.filter(c => c.frustrated).length
    const positive   = total - frustrated
    return { total, positive, frustrated }
  }, [prevCalls])

  const trends = useMemo(() => ({
    total:      pctChange(summary.total,     prevSummary.total),
    positive:   pctChange(summary.positive,  prevSummary.positive),
    frustrated: summary.frustrated - prevSummary.frustrated,
  }), [summary, prevSummary])

  const employeeStats = useMemo(() => {
    const map = {}
    const sorted = [...filteredCalls].sort((a, b) => new Date(a.date) - new Date(b.date))
    for (const call of sorted) {
      if (!map[call.employee]) {
        map[call.employee] = { name: call.employee, calls: 0, totalScore: 0, frustrated: 0, scores: [] }
      }
      map[call.employee].calls++
      map[call.employee].totalScore += call.score
      if (call.frustrated) map[call.employee].frustrated++
      map[call.employee].scores.push(call.score)
    }
    return Object.values(map)
      .map(e => ({
        ...e,
        avgScore:     +(e.totalScore / e.calls).toFixed(1),
        recentScores: e.scores.slice(-5),
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
  }, [filteredCalls])

  const chartData = useMemo(() => {
    const days  = rangeDays >= 9999 ? 30 : Math.min(rangeDays, 30)
    const today = new Date()
    const start = subDays(today, days - 1)
    return eachDayOfInterval({ start, end: today }).map(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayCalls = filteredCalls.filter(c => c.date === dateStr)
      return {
        date:       format(day, 'MMM d'),
        positive:   dayCalls.filter(c => !c.frustrated).length,
        frustrated: dayCalls.filter(c => c.frustrated).length,
      }
    })
  }, [filteredCalls, rangeDays])

  const frustratedCalls = useMemo(() =>
    filteredCalls.filter(c => c.frustrated).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [filteredCalls]
  )

  const topPerformerData = useMemo(() => {
    const weekCalls = filterByRange(rawCalls, 7)
    const map = {}
    for (const call of weekCalls) {
      if (!map[call.employee]) map[call.employee] = { name: call.employee, calls: 0, totalScore: 0 }
      map[call.employee].calls++
      map[call.employee].totalScore += call.score
    }
    return Object.values(map)
      .map(e => ({ ...e, avgScore: +(e.totalScore / e.calls).toFixed(1) }))
      .sort((a, b) => b.avgScore - a.avgScore)[0] ?? null
  }, [])

  const quickStats = useMemo(() => {
    const weekCalls     = filterByRange(rawCalls, 7)
    const prevWeekCalls = filterByWindow(rawCalls, 14, 7)
    const avgScore      = weekCalls.length
      ? +(weekCalls.reduce((s, c) => s + c.score, 0) / weekCalls.length).toFixed(1) : 0
    const totalMins     = filteredCalls.length * 32
    const callsThisWeek = weekCalls.length
    const callsLastWeek = prevWeekCalls.length
    const callsDelta    = pctChange(callsThisWeek, callsLastWeek)
    return { avgScore, totalMins, callsThisWeek, callsLastWeek, callsDelta }
  }, [filteredCalls])

  const recentActivity = useMemo(() =>
    [...rawCalls].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 12),
    []
  )

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <Header rangeDays={rangeDays} setRangeDays={setRangeDays} rangeOptions={RANGE_OPTIONS} />

      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-7 items-start">

          {/* Main column */}
          <div className="flex-1 min-w-0 space-y-6">
            <SummaryCards summary={summary} trends={trends} />
            <QuickStats stats={quickStats} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <TopPerformer performer={topPerformerData} />
              <div className="lg:col-span-2">
                <EmployeeTable employees={employeeStats} />
              </div>
            </div>

            <MeetingsChart data={chartData} />
            <FrustratedTable calls={frustratedCalls} />
          </div>

          {/* Activity sidebar */}
          <aside className="hidden xl:flex flex-col w-[320px] flex-shrink-0 sticky top-20">
            <ActivityFeed calls={recentActivity} />
          </aside>

        </div>
      </div>

      <footer className="mt-12 py-5 border-t border-brand-border text-center text-[11px] text-brand-muted/60 tracking-widest uppercase">
        Little Giant Marketing &mdash; Quality Control Dashboard
      </footer>
    </div>
  )
}
