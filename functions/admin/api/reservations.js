/**
 * GET  /admin/api/reservations         - list all reservation interest rows
 *                                        with optional ?status= filter
 */

import { json } from '../../api/_shared.js'
import { requireAuth } from '../_auth.js'


export async function onRequestGet(context) {
  const unauth = await requireAuth(context, json); if (unauth) return unauth
  const { env } = context
  const url = new URL(context.request.url)
  const status = url.searchParams.get('status')  // optional filter

  try {
    const rows = status
      ? await env.DB.prepare(
          `SELECT id, email, first_name, wood_preference, why_message, status,
                  submitted_at, reviewed_at, notes, subscriber_id
           FROM reservation_interest
           WHERE status = ?
           ORDER BY submitted_at DESC
           LIMIT 500`
        ).bind(status).all()
      : await env.DB.prepare(
          `SELECT id, email, first_name, wood_preference, why_message, status,
                  submitted_at, reviewed_at, notes, subscriber_id
           FROM reservation_interest
           ORDER BY submitted_at DESC
           LIMIT 500`
        ).all()

    // Counts by status for the dashboard header
    const counts = await env.DB.prepare(
      `SELECT status, COUNT(*) AS c FROM reservation_interest GROUP BY status`
    ).all()

    const countMap = { pending: 0, contacted: 0, converted: 0, declined: 0 }
    for (const r of (counts.results || [])) countMap[r.status] = r.c

    return json({ reservations: rows.results || [], counts: countMap })
  } catch (err) {
    console.error('reservations GET:', err.message)
    return json({ error: 'Could not load reservations' }, 500)
  }
}
