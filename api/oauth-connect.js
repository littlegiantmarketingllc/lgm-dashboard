// One-time OAuth connect for GHL agency.
// Visit /api/oauth-connect to authorize — GHL redirects to the Goals Dashboard
// callback which stores the company token in Supabase ghl_tokens table.
// After that, ghl-location-data.js can derive location tokens for all sub-accounts.

// locations/customFields.readonly added 2026-08-21 — the marketplace app was
// updated (new published version) to support it. A prior attempt to add this
// scope failed with "Invalid scope(s)" because the app didn't have it enabled
// yet; if this breaks the connect flow again, revert immediately rather than
// iterate blindly — this app also serves the Health dashboard.
const SCOPES = [
  'contacts.readonly',
  'conversations.readonly',
  'conversations/message.readonly',
  'locations.readonly',
  'locations/tags.readonly',
  'locations/customFields.readonly',
  'opportunities.readonly',
  'users.readonly',
].join(' ')

// Health dashboard owns its own callback — must be registered in GHL marketplace app
const REDIRECT_URI = 'https://health.littlegiantmarketing.com/api/oauth-callback'

export default function handler(req, res) {
  const clientId = process.env.GHL_CLIENT_ID
  if (!clientId) {
    return res.status(500).send('GHL_CLIENT_ID not configured')
  }

  const url = new URL('https://marketplace.gohighlevel.com/oauth/chooselocation')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri',  REDIRECT_URI)
  url.searchParams.set('client_id',     clientId)
  url.searchParams.set('scope',         SCOPES)

  return res.redirect(302, url.toString())
}
