/**
 * PUT    /admin/api/reservation/:id   - update status / notes / linked subscriber
 * DELETE /admin/api/reservation/:id   - hard delete
 */

import { json } from '../../../api/_shared.js'
import { requireAuth } from '../../_auth.js'


const ALLOWED_FIELDS = ['status', 'notes', 'subscriber_id']
const ALLOWED_STATUSES = new Set(['pending', 'contacted', 'converted', 'declined'])


export async function onRequestPut(context) {
  const unauth = await requireAuth(context, json); if (unauth) return unauth
  const { env, params } = context
  const id = parseInt(params.id, 10)
  if (!id) return json({ error: 'Bad id' }, 400)

  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid request.' }, 400) }

  if (body.status && !ALLOWED_STATUSES.has(body.status)) {
    return json({ error: `Invalid status. Must be one of: ${[...ALLOWED_STATUSES].join(', ')}` }, 400)
  }

  const updates = []
  const values = []
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`)
      values.push(body[field])
    }
  }

  // When status changes from 'pending', also stamp reviewed_at
  if (body.status && body.status !== 'pending') {
    updates.push('reviewed_at = ?')
    values.push(new Date().toISOString())
  }

  if (updates.length === 0) return json({ error: 'No fields to update' }, 400)
  values.push(id)

  try {
    await env.DB.prepare(
      `UPDATE reservation_interest SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run()

    const row = await env.DB.prepare(
      `SELECT id, email, first_name, wood_preference, why_message, status,
              submitted_at, reviewed_at, notes, subscriber_id
       FROM reservation_interest WHERE id = ?`
    ).bind(id).first()

    return json({ ok: true, reservation: row })
  } catch (err) {
    console.error('reservation PUT:', err.message)
    return json({ error: err.message }, 500)
  }
}


export async function onRequestDelete(context) {
  const unauth = await requireAuth(context, json); if (unauth) return unauth
  const { env, params } = context
  const id = parseInt(params.id, 10)
  if (!id) return json({ error: 'Bad id' }, 400)

  try {
    await env.DB.prepare(
      `DELETE FROM reservation_interest WHERE id = ?`
    ).bind(id).run()
    return json({ ok: true })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}
