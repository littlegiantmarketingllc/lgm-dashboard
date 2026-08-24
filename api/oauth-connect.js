// One-time OAuth connect for GHL agency.
// Visit /api/oauth-connect to authorize — GHL redirects to the Goals Dashboard
// callback which stores the company token in Supabase ghl_tokens table.
// After that, ghl-location-data.js can derive location tokens for all sub-accounts.

// locations/customFields.readonly added 2026-08-21 — the marketplace app was
// updated (new published version) to support it.
//
// locations/tags.readonly removed 2026-08-24 — confirmed via grep that
// nothing in this codebase actually calls a /tags endpoint, and the app's
// "live" version (there are now multiple versions in play — v1 original,
// v2 with customFields added) started rejecting it as invalid. Safe to drop
// since nothing depends on it.
//
// conversations.readonly / conversations/message.readonly are still
// requested even though the same "Invalid scope(s)" error currently flags
// them too — unlike tags, these ARE used (Health dashboard's conversation
// count + last-message preview in AccountModal.jsx). Removing them would
// silently break a working feature, so this needs a GHL-side fix instead:
// whichever app version is "live" for new authorizations needs both of
// these enabled under Settings → Scopes. Until that's done, /api/oauth-connect
// will keep failing at this exact step — don't touch this scope list again
// to "fix" it without that GHL-side change happening first.
const SCOPES = [
  'contacts.readonly',
  'conversations.readonly',
  'conversations/message.readonly',
  'locations.readonly',
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
