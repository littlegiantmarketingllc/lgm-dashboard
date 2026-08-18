import { useEffect } from 'react'

const RED = '#EF4444'
const AMB = '#EAB308'

const STATUS_LABEL   = { 2: 'Open', 3: 'Pending' }
const PRIORITY_LABEL = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Urgent' }
const PRIORITY_COLOR = { 1: '#6B7280', 2: '#6B7280', 3: AMB, 4: RED }

export default function TicketsModal({ tickets, filterStatus, title, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const shown = filterStatus === 'open' ? tickets // already open+pending only, per freshdesk-summary.js
              : filterStatus === 'urgent' ? tickets.filter(t => t.priority >= 3)
              : tickets

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl border border-brand-border max-w-lg w-full max-h-[80vh] flex flex-col"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-brand-heading font-semibold text-sm">{title}</h2>
            <p className="text-brand-muted text-[10px] mt-0.5">{shown.length} ticket{shown.length === 1 ? '' : 's'} · live from Freshdesk</p>
          </div>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-heading text-lg leading-none px-1">×</button>
        </div>

        <div className="overflow-y-auto flex-1">
          {shown.length === 0 ? (
            <p className="text-center text-brand-muted text-sm py-10">No tickets in this view.</p>
          ) : (
            <div className="divide-y divide-brand-border/60">
              {shown.map(t => (
                <div key={t.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-medium text-brand-text leading-snug">{t.subject}</p>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0"
                      style={{ color: PRIORITY_COLOR[t.priority] || '#6B7280', borderColor: `${PRIORITY_COLOR[t.priority] || '#6B7280'}40`, background: `${PRIORITY_COLOR[t.priority] || '#6B7280'}10` }}
                    >
                      {PRIORITY_LABEL[t.priority] || 'Normal'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-brand-muted">{t.accountName}</span>
                    <span className="text-[10px] text-brand-border">·</span>
                    <span className="text-[10px] text-brand-muted">{STATUS_LABEL[t.status] || '—'}</span>
                    {t.created_at && (
                      <>
                        <span className="text-[10px] text-brand-border">·</span>
                        <span className="text-[10px] text-brand-muted">
                          {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
