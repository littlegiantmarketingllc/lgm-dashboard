// Vercel serverless function — on-demand GHL CRM lookup for a single account.
// Called from AccountModal when user clicks "Request GHL Info".
// Keeps the API token server-side; never exposed to the browser.
//
// Env vars required:
//   GHL_LOCATION_TOKEN — sub-account PIT for LGM marketing sub-account
//   GHL_LOCATION_ID   — location ID for LGM marketing sub-account (k0kz7epnAGvpdoV79ONk)

const GHL_BASE = 'https://services.leadconnectorhq.com'
const GHL_VER  = '2021-07-28'

const PIPELINE_NAMES = {
  WrSQYzKEAw0invFEVfE8: 'Client Success',
  YWluXcLOK8zqrN7xCZaa: 'Customer Onboarding',
  '6js1O4j1qo5BeWrHWKUZ': 'Sales',
  '8G4fkcVZCv5mF7t5uQ0n': 'Escalation Inbox',
  laXiSmpo3x0Jta4VYnoQ: 'Imports & Campaigns',
}

const STAGE_MAP = {
  // Client Success
  '4d52f591-3b9a-4201-b2cb-2a0883ee8b86': { name: 'Intro Call Scheduled',        status: 'onboarding' },
  'b9f4a1f5-c9d6-4cc2-bfac-861d4546c0f8': { name: 'Campaign Launch Scheduled',    status: 'onboarding' },
  'ed2202a2-79f7-4d82-886a-2b7d34fd3729': { name: 'Campaign Live',                 status: 'active'     },
  '5db80ee2-ed26-4a52-a0fa-548046a92919': { name: '5 Day Review',                  status: 'review'     },
  '021a3395-e6a5-4c93-8a9c-3dc718568055': { name: '15 Day Review',                 status: 'review'     },
  'f8757a0f-cb46-4b5f-ac24-88233d9f43e7': { name: '30 Day Review',                 status: 'review'     },
  'b67f8ea5-3168-46b0-aa67-246331335784': { name: 'Adopted Client',                status: 'healthy'    },
  // Customer Onboarding
  '327f1a59-170c-4871-93af-0f608b439d2b': { name: 'Pending Activation Call',       status: 'onboarding' },
  '102514a2-3607-4bcc-bdd8-660b512f630b': { name: 'Call 1: Verification',          status: 'onboarding' },
  '0e2c1cad-14ba-4eae-83fc-150e280a57fd': { name: 'Call 2: System Setup',          status: 'onboarding' },
  '2158a442-d4c3-4db9-ac68-2b8ee6d5763c': { name: 'Call 3: Launched',              status: 'onboarding' },
  '9bca9c37-4fce-4f1a-ab70-f077313cbd0d': { name: 'Day 4 Follow-up',               status: 'onboarding' },
  'c58decec-9723-4f3a-a37a-341acfa4f123': { name: 'Day 5 Follow-up',               status: 'onboarding' },
  'a77b6090-a4a0-4bcb-956d-b32b600b10f3': { name: 'AI Call Coach Follow-up',       status: 'onboarding' },
  '5a3da2c1-bb13-4647-b96c-48f7046d491f': { name: 'Recurring Check-In',            status: 'healthy'    },
  '7d7aacfd-da67-4102-b302-f4d521d4b7e5': { name: 'Send to Recurring Workflow',    status: 'active'     },
  'afd90417-da1c-48cf-8a6f-82a23aa7010e': { name: 'Cancellation Request',          status: 'at_risk'    },
  '64a9e8a8-b292-401f-8c95-311df4db3293': { name: 'Cancelled',                     status: 'churned'    },
  // Sales
  '9a15259e-9f7c-4788-b31e-5c439b212096': { name: 'Payment Made / Account Build',  status: 'onboarding' },
  '086b5b24-934d-4e89-8b23-f1223cdefea2': { name: 'Customer Upsell',               status: 'healthy'    },
  'c351ad97-93fd-46ef-8014-ee58f9a91b54': { name: 'Onboarding Completed',          status: 'active'     },
  // Escalation Inbox
  '2d571dae-41b9-4834-885b-2e390270a40a': { name: 'New Escalation',                status: 'at_risk'    },
  'e84c4a02-10ac-4654-b890-17ff3c7a394a': { name: 'In Review (Queued)',             status: 'at_risk'    },
  '608d62c2-5a7a-403f-8a23-e74573d04b73': { name: 'In Progress (Active)',           status: 'at_risk'    },
  '5ac818f7-d944-499e-a803-19efc51cddbc': { name: 'Roadblock',                     status: 'at_risk'    },
  '429c3a6a-6355-462b-b56a-fbf8ba583683': { name: 'Waiting on Client',             status: 'at_risk'    },
  'fa75532a-6acf-4dae-a4f1-ed3e26b75d01': { name: 'Resolved',                      status: 'active'     },
}

async function ghlFetch(path, token) {
  const res = await fetch(`${GHL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Version: GHL_VER },
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`GHL HTTP ${res.status}: ${txt.slice(0, 80)}`)
  }
  return res.json()
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const token = process.env.GHL_LOCATION_TOKEN
  const locId = process.env.GHL_LOCATION_ID
  if (!token || !locId) {
    return res.status(500).json({ error: 'GHL_LOCATION_TOKEN or GHL_LOCATION_ID not configured' })
  }

  const q = (req.query.q || '').trim()
  if (!q) return res.status(400).json({ error: 'q param required' })

  try {
    // Search contacts and opportunities in parallel
    const [contactData, oppData] = await Promise.all([
      ghlFetch(`/contacts/?locationId=${locId}&query=${encodeURIComponent(q)}&limit=5`, token),
      ghlFetch(`/opportunities/search?location_id=${locId}&q=${encodeURIComponent(q)}&limit=10`, token),
    ])

    const contacts = (contactData.contacts || []).slice(0, 3).map(c => ({
      id:          c.id,
      name:        c.contactName || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
      companyName: c.companyName || null,
      email:       c.email       || null,
      phone:       c.phone       || null,
      tags:        c.tags        || [],
      type:        c.type        || null,
      dateAdded:   c.dateAdded   || null,
    }))

    const opportunities = (oppData.opportunities || []).map(o => ({
      id:                o.id,
      name:              o.name,
      pipeline:          PIPELINE_NAMES[o.pipelineId]        || o.pipelineId,
      stage:             STAGE_MAP[o.pipelineStageId]?.name   || 'Unknown Stage',
      stageStatus:       STAGE_MAP[o.pipelineStageId]?.status || 'unknown',
      lastStageChangeAt: o.lastStageChangeAt || null,
      updatedAt:         o.updatedAt         || null,
      status:            o.status            || 'open',
      contactName:       o.contact?.name     || null,
      contactEmail:      o.contact?.email    || null,
      tags:              o.contact?.tags     || [],
    }))

    // Fetch latest conversation for the best-matching contact
    let conversation = null
    if (contacts[0]?.id) {
      try {
        const convoData = await ghlFetch(
          `/conversations/search?locationId=${locId}&contactId=${contacts[0].id}&limit=1`,
          token
        )
        const c = (convoData.conversations || [])[0]
        if (c) {
          conversation = {
            lastMessageDate: c.lastMessageDate    || null,
            lastMessageType: c.lastMessageType    || null,
            lastMessageBody: (c.lastMessageBody   || '').slice(0, 140),
            direction:       c.lastMessageDirection || null,
          }
        }
      } catch (_) {
        // Conversations are best-effort — don't fail the whole request
      }
    }

    res.setHeader('Cache-Control', 'no-store')
    res.json({ contacts, opportunities, conversation })
  } catch (err) {
    console.error('ghl-contact error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
