/**
 * GET /api/check-story?email=... - check if a user has submitted a milestone story
 *
 * Phase 4 migration (June 21 2026): reads from D1 community_stories.
 */

import { json } from './_shared.js'

export async function onRequestGet(context) {
  const { env } = context
  if (!env.DB) return json({ has_story: false })

  const email = new URL(context.request.url).searchParams.get('email')
  if (!email) return json({ has_story: false })

  try {
    const row = await env.DB.prepare(
      'SELECT story FROM community_stories WHERE email = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(email.trim().toLowerCase()).first()

    if (!row) return json({ has_story: false, story: '' })
    return json({ has_story: true, story: row.story || '' })
  } catch {
    return json({ has_story: false, story: '' })
  }
}
