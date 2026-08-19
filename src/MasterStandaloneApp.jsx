import { useEffect } from 'react'
import MasterDashboard from './components/master/MasterDashboard'

// Embedded inside GHL per sub-account via a Custom Menu Link — GHL injects
// locationId into the iframe URL. No login here; access is inherited from
// the client already being inside their own GHL account (see architecture
// doc §2 for the tradeoffs of that approach).
export default function MasterStandaloneApp() {
  useEffect(() => { document.title = 'LGM — Master Dashboard' }, [])

  const params     = new URLSearchParams(window.location.search)
  const locationId = params.get('locationId')

  if (!locationId) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-brand-border p-8 max-w-md w-full text-center"
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div className="text-4xl mb-4">🔗</div>
          <h2 className="text-brand-heading font-bold text-lg mb-2">Missing locationId</h2>
          <p className="text-brand-muted text-sm leading-relaxed">
            This dashboard is meant to be opened as <code>?locationId=&lt;ghl_location_id&gt;</code> —
            normally injected automatically by the GHL Custom Menu Link. For local testing, append that
            query param manually.
          </p>
        </div>
      </div>
    )
  }

  return <MasterDashboard locationId={locationId} />
}
