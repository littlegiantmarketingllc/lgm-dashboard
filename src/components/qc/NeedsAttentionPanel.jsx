import { useMemo, useState } from 'react'
import { isOverdue, VERDICT_BG, RISK_BG, STATUS_BG } from '../../lib/qcUtils'
import { format } from 'date-fns'

const PRIORITY = {
  'Action Required': 0,
  'Escalated':       1,
  'frustrated':      2,
  'immediate':       3,
  'high_risk':       4,
  'Pending':         5,
}

function Badge({ label, className }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${className}`}>
      {label}
    </span>
  )
}

function AttentionItem({ item, onOpen, handled, onToggleHandled }) {
  const isRed    = item.priority <= 4
  const isYellow = item.priority === 5
  const overdue  = item.promisedDeadline ? isOverdue(item.promisedDeadline) : false

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 ${
        handled
          ? 'opacity-40 border-brand-border bg-white'
          : isRed
          ? 'border-red-200 bg-red-50'
          : 'border-yellow-200 bg-yellow-50'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggleHandled(item.id)}
        title={handled ? 'Mark as open' : 'Mark as handled'}
        className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          handled
            ? 'bg-brand-green border-brand-green'
            : isRed
            ? 'border-red-400 hover:border-red-600'
            : 'border-yellow-400 hover:border-yellow-600'
        }`}
      >
        {handled && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
              isRed ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'
            }`}
          >
            {item.typeLabel}
          </span>
          <span className="text-[11px] font-semibold text-brand-heading truncate">
            {item.customer}
          </span>
          {item.employee && (
            <span className="text-[11px] text-brand-muted">· {item.employee}</span>
          )}
          {item.date && (
            <span className="text-[11px] text-brand-muted">· {item.date}</span>
          )}
        </div>

        <p className="text-[12px] text-brand-text leading-snug mb-1.5">{item.description}</p>

        <div className="flex flex-wrap items-center gap-1.5">
          {item.status && <Badge label={item.status} className={STATUS_BG[item.status] || 'bg-gray-100 text-gray-600'} />}
          {item.riskLevel && <Badge label={`Risk: ${item.riskLevel}`} className={RISK_BG[item.riskLevel] || 'bg-gray-100 text-gray-600'} />}
          {item.followupOwner && (
            <span className="text-[10px] text-brand-muted">Owner: <strong>{item.followupOwner}</strong></span>
          )}
          {item.promisedDeadline && (
            <span className={`text-[10px] font-semibold ${overdue ? 'text-red-600' : 'text-yellow-700'}`}>
              {overdue ? '⚠ OVERDUE:' : 'Deadline:'} {item.promisedDeadline}
            </span>
          )}
        </div>
      </div>

      {/* View call button */}
      <button
        onClick={() => onOpen(item.meetingId)}
        className="flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-brand-border bg-white hover:bg-brand-bg hover:border-brand-green text-brand-heading transition-colors"
      >
        View
      </button>
    </div>
  )
}

export default function NeedsAttentionPanel({ calls, handledIds, onToggleHandled, onOpenCall }) {
  const [collapsed, setCollapsed] = useState(false)

  const items = useMemo(() => {
    if (!calls.length) return []
    const seen = new Set()
    const result = []

    const add = (call, type, typeLabel, description, priority) => {
      const id = `${type}-${call.meetingId}-${call.employee}`
      if (seen.has(id)) return
      seen.add(id)
      result.push({
        id,
        meetingId:       call.meetingId,
        customer:        call.customer,
        employee:        call.employee,
        date:            call.date,
        status:          call.status,
        riskLevel:       call.riskLevel,
        followupOwner:   call.followupOwner,
        promisedDeadline: call.promisedDeadline,
        type,
        typeLabel,
        description,
        priority,
      })
    }

    for (const c of calls) {
      if (c.status === 'Action Required') {
        add(c, 'action_required', 'Action Required',
          c.actionItems || `Call with ${c.customer} requires action.`, PRIORITY['Action Required'])
      }
      if (c.status === 'Escalated') {
        add(c, 'escalated', 'Escalated',
          c.actionItems || `Call escalated — ${c.customer}.`, PRIORITY['Escalated'])
      }
      if (c.frustratedFlag) {
        add(c, 'frustrated', 'Frustrated Customer',
          `${c.customer} was frustrated during the call. ${c.redFlags ? `Red flags: ${c.redFlags}` : ''}`.trim(),
          PRIORITY['frustrated'])
      }
      if (c.finalVerdict === 'Immediate Attention') {
        add(c, 'immediate', 'Immediate Attention',
          `${c.employee}'s call with ${c.customer} flagged for Immediate Attention.`,
          PRIORITY['immediate'])
      }
      if (c.riskLevel === 'High') {
        add(c, 'high_risk', 'High Risk Client',
          `${c.customer} is a High Risk client. ${c.actionItems || ''}`.trim(),
          PRIORITY['high_risk'])
      }
      if (c.status === 'Pending' && c.followupOwner) {
        add(c, 'pending', 'Pending Follow-up',
          `Follow-up with ${c.customer} — assigned to ${c.followupOwner}.${c.actionItems ? ` ${c.actionItems}` : ''}`,
          PRIORITY['Pending'])
      }
    }

    return result.sort((a, b) => a.priority - b.priority)
  }, [calls])

  const activeCount  = items.filter(i => !handledIds.has(i.id)).length
  const handledCount = items.filter(i =>  handledIds.has(i.id)).length

  if (!items.length) {
    return (
      <div className="animate-fade-in-up rounded-2xl border border-green-200 bg-green-50 p-6 flex items-center gap-4"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl flex-shrink-0">
          ✅
        </div>
        <div>
          <p className="font-semibold text-green-700 text-sm">All clear — nothing needs attention right now</p>
          <p className="text-green-600 text-[12px] mt-0.5">No escalated calls, frustrated customers, or overdue follow-ups in this period.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up rounded-2xl border border-brand-border bg-white overflow-hidden"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.04)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
        <div className="flex items-center gap-2">
          <span className="text-base">⚡</span>
          <h3 className="font-bold text-brand-heading text-sm">Needs Attention</h3>
          {activeCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
          {handledCount > 0 && (
            <span className="bg-gray-200 text-gray-500 text-[10px] font-medium px-2 py-0.5 rounded-full">
              {handledCount} handled
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(p => !p)}
          className="text-brand-muted hover:text-brand-text text-[11px] font-medium transition-colors"
        >
          {collapsed ? 'Show' : 'Collapse'}
        </button>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
          {items.map(item => (
            <AttentionItem
              key={item.id}
              item={item}
              onOpen={onOpenCall}
              handled={handledIds.has(item.id)}
              onToggleHandled={onToggleHandled}
            />
          ))}
        </div>
      )}
    </div>
  )
}
