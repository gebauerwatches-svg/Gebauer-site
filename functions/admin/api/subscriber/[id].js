/**
 * PUT    /admin/api/subscriber/:id   - update fields
 * DELETE /admin/api/subscriber/:id   - hard delete
 */

import { json } from '../../../api/_shared.js'
import { requireAuth } from '../../_auth.js'

const ALLOWED_FIELDS = ['first_name', 'waitlist_position', 'status', 'notes', 'referral_count']

export async function onRequestPut(context) {
  const unauth = await requireAuth(context, json); if (unauth) return unauth
  const { env, params } = context
  const id = parseInt(params.id, 10)
  if (!id) return json({ error: 'Bad id' }, 400)

  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid request.' }, 400) }

  const updates = []
  const values = []
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`)
      values.push(body[field])
    }
  }

  // Special-case: status -> 'unsubscribed' should also set unsubscribed_at
  if (body.status === 'unsubscribed') {
    updates.push('unsubscribed_at = ?')
    values.push(new Date().toISOString())
  }

  if (updates.length === 0) return json({ error: 'No fields to update' }, 400)

  values.push(id)

  try {
    await env.DB.prepare(`UPDATE subscribers SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()
    const row = await env.DB.prepare(
      'SELECT id, email, first_name, referral_count, waitlist_position, status, notes FROM subscribers WHERE id = ?'
    ).bind(id).first()
    return json({ ok: true, subscriber: row })
  } catch (err) {
    console.error('subscriber PUT:', err.message)
    return json({ error: err.message }, 500)
  }
}

export async function onRequestDelete(context) {
  const unauth = await requireAuth(context, json); if (unauth) return unauth
  const { env, params } = context
  const id = parseInt(params.id, 10)
  if (!id) return json({ error: 'Bad id' }, 400)

  try {
    await env.DB.prepare('DELETE FROM subscribers WHERE id = ?').bind(id).run()
    return json({ ok: true })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}
