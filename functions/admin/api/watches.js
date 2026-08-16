/**
 * GET /admin/api/watches
 *
 * Return the full 300-watch first-edition allocation. Every number 1-300
 * that has been reserved by a subscriber (waitlist_position != 9999)
 * appears with reserver info. The client renders the 300-cell grid and
 * fills in status per cell.
 *
 * Response shape:
 *   {
 *     assigned: [
 *       { position, first_name, email, notes, subscribed_at,
 *         wood_hint }  // wood_hint parsed from notes if present
 *     ],
 *     pending: [ ...reservation_interest rows with status='pending' ]
 *   }
 */

import { json } from '../../api/_shared.js'
import { requireAuth } from '../_auth.js'


// Parse the wood variant hint out of the notes column if present.
// notes tend to look like "Ebony #11 confirmed via mom 6/24" or similar.
// This is a heuristic — the notes are free-form.
function detectWood(text) {
  if (!text) return null
  const t = text.toLowerCase()
  if (t.includes('cherry') || t.includes('hinoki')) return 'cherry'  // hinoki = legacy pale variant, dropped Aug 2026
  if (t.includes('ebony')) return 'ebony'
  if (t.includes('padauk')) return 'padauk'
  return null
}


export async function onRequestGet(context) {
  const unauth = await requireAuth(context, json); if (unauth) return unauth
  const { env } = context

  try {
    const assignedRows = await env.DB.prepare(
      `SELECT id, email, first_name, waitlist_position, notes, subscribed_at
       FROM subscribers
       WHERE waitlist_position IS NOT NULL
         AND waitlist_position != 9999
         AND waitlist_position >= 1
         AND waitlist_position <= 300
         AND status = 'active'
       ORDER BY waitlist_position`
    ).all()

    const pendingRows = await env.DB.prepare(
      `SELECT id, email, first_name, wood_preference, why_message, submitted_at
       FROM reservation_interest
       WHERE status = 'pending'
       ORDER BY submitted_at DESC`
    ).all()

    const assigned = (assignedRows.results || []).map(r => ({
      id: r.id,
      email: r.email,
      first_name: r.first_name,
      position: r.waitlist_position,
      notes: r.notes,
      subscribed_at: r.subscribed_at,
      wood_hint: detectWood(r.notes),
    }))

    return json({
      assigned,
      pending: pendingRows.results || [],
      total_slots: 300,
      per_variant: 100,
    })
  } catch (err) {
    console.error('watches GET:', err.message)
    return json({ error: 'Could not load watches' }, 500)
  }
}
