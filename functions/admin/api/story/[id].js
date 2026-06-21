/**
 * PUT    /admin/api/story/:id  - update story (status, edit text)
 * DELETE /admin/api/story/:id  - hard delete
 */

import { json } from '../../../api/_shared.js'
import { requireAuth } from '../../_auth.js'

const ALLOWED_STATUSES = new Set(['approved', 'rejected', 'flagged', 'pending'])

export async function onRequestPut(context) {
  const unauth = await requireAuth(context, json); if (unauth) return unauth
  const { env, params } = context
  const id = parseInt(params.id, 10)
  if (!id) return json({ error: 'Bad id' }, 400)

  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid request.' }, 400) }

  const updates = []
  const values = []
  if (body.status !== undefined) {
    if (!ALLOWED_STATUSES.has(body.status)) return json({ error: 'Bad status' }, 400)
    updates.push('status = ?')
    values.push(body.status)
  }
  if (body.story !== undefined) {
    updates.push('story = ?')
    values.push(String(body.story).slice(0, 500))
  }

  if (updates.length === 0) return json({ error: 'No fields to update' }, 400)
  values.push(id)

  try {
    await env.DB.prepare(`UPDATE community_stories SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()
    return json({ ok: true })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}

export async function onRequestDelete(context) {
  const unauth = await requireAuth(context, json); if (unauth) return unauth
  const { env, params } = context
  const id = parseInt(params.id, 10)
  if (!id) return json({ error: 'Bad id' }, 400)
  try {
    await env.DB.prepare('DELETE FROM community_stories WHERE id = ?').bind(id).run()
    return json({ ok: true })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}
