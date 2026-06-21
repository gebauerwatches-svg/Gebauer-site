/**
 * GET  /admin/api/stories          - list all stories with status filter
 * PUT  /admin/api/stories/:id      - update status (approved | rejected | flagged | pending)
 */

import { json } from '../../api/_shared.js'
import { requireAuth } from '../_auth.js'

export async function onRequestGet(context) {
  const unauth = await requireAuth(context, json); if (unauth) return unauth
  const { env } = context
  const url = new URL(context.request.url)
  const status = url.searchParams.get('status') // optional filter

  try {
    const rows = status
      ? await env.DB.prepare(
          'SELECT id, email, first_name, story, status, created_at FROM community_stories WHERE status = ? ORDER BY created_at DESC LIMIT 200'
        ).bind(status).all()
      : await env.DB.prepare(
          'SELECT id, email, first_name, story, status, created_at FROM community_stories ORDER BY created_at DESC LIMIT 200'
        ).all()

    return json({ stories: rows.results || [] })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}
