/**
 * GET /api/stories - return approved community stories + total count
 *
 * Phase 4 migration (June 21 2026): reads from D1 community_stories.
 */

import { json } from './_shared.js'

export async function onRequestGet(context) {
  const { env } = context
  if (!env.DB) return json({ error: 'Server configuration error.' }, 500)

  try {
    const rows = await env.DB.prepare(`
      SELECT first_name, story FROM community_stories
      WHERE status = 'approved'
      ORDER BY created_at DESC
      LIMIT 20
    `).all()

    const stories = (rows.results || [])
      .filter(s => s.story && s.story.trim().length > 0)
      .map(s => ({
        name: (s.first_name || '').split(' ')[0] || 'Friend',
        story: s.story.trim(),
      }))

    const countRow = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM community_stories WHERE status = 'approved'"
    ).first()

    return json({ stories, count: countRow ? countRow.cnt : 0 })
  } catch (err) {
    console.error('Stories error:', err.message)
    return json({ error: 'Could not fetch stories' }, 500)
  }
}
