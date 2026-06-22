/**
 * GET /api/timeline
 *
 * Returns the launch timeline milestones for InsiderView.
 * Stored in D1 settings table under key 'timeline_json'.
 * Falls back to a default if the row is missing or invalid.
 */

import { json } from './_shared.js'

const DEFAULT_TIMELINE = [
  { id: 'design',      label: 'Design locked',         when: 'June 2026',     status: 'done' },
  { id: 'samples',     label: 'Samples arrive',        when: 'August 2026',   status: 'current' },
  { id: 'kickstarter', label: 'Kickstarter launches',  when: 'November 2026', status: 'upcoming' },
  { id: 'ship',        label: 'Watches ship',          when: 'Early 2027',    status: 'upcoming' },
]

export async function onRequestGet(context) {
  const { env } = context
  if (!env.DB) return json({ milestones: DEFAULT_TIMELINE })

  try {
    const row = await env.DB.prepare(
      "SELECT value FROM settings WHERE key = 'timeline_json' LIMIT 1"
    ).first()
    if (!row || !row.value) return json({ milestones: DEFAULT_TIMELINE })

    const parsed = JSON.parse(row.value)
    if (!Array.isArray(parsed) || parsed.length === 0) return json({ milestones: DEFAULT_TIMELINE })
    return json({ milestones: parsed })
  } catch {
    return json({ milestones: DEFAULT_TIMELINE })
  }
}
