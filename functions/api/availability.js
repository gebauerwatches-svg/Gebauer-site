/**
 * GET /api/availability
 *
 * Public endpoint. Returns which watch numbers are reserved per wood
 * variant so cold visitors on /reserve can see availability and pick
 * a specific number.
 *
 * Response returns NO customer PII. Only integer position numbers per
 * wood. Response is safe to expose publicly.
 *
 *   {
 *     hinoki: [reserved positions 1-100],
 *     ebony:  [reserved positions 1-100],
 *     padauk: [reserved positions 1-100],
 *     pending: {
 *       hinoki: [preferred positions from pending /reserve requests],
 *       ebony:  [...],
 *       padauk: [...]
 *     }
 *   }
 *
 * Pending positions are grouped separately so the UI can show them
 * differently (e.g., "under consideration" not fully reserved).
 */

import { json } from './_shared.js'


function detectWood(text) {
  if (!text) return null
  const t = text.toLowerCase()
  if (t.includes('hinoki')) return 'hinoki'
  if (t.includes('ebony')) return 'ebony'
  if (t.includes('padauk')) return 'padauk'
  return null
}


function fallbackWood(pos) {
  if (pos <= 100) return 'hinoki'
  if (pos <= 200) return 'ebony'
  return 'padauk'
}


function positionWithinVariant(pos, wood) {
  if (wood === 'ebony' && pos > 100 && pos <= 200) return pos - 100
  if (wood === 'padauk' && pos > 200 && pos <= 300) return pos - 200
  return pos
}


export async function onRequestGet(context) {
  const { env } = context
  if (!env.DB) return json({ hinoki: [], ebony: [], padauk: [], pending: { hinoki: [], ebony: [], padauk: [] } })

  try {
    // Reserved: subscribers with an assigned waitlist_position
    const assigned = await env.DB.prepare(
      `SELECT waitlist_position, notes
       FROM subscribers
       WHERE waitlist_position IS NOT NULL
         AND waitlist_position != 9999
         AND waitlist_position >= 1
         AND waitlist_position <= 300
         AND status = 'active'`
    ).all()

    const reserved = { hinoki: [], ebony: [], padauk: [] }
    for (const r of (assigned.results || [])) {
      const wood = detectWood(r.notes) || fallbackWood(r.waitlist_position)
      const pos = positionWithinVariant(r.waitlist_position, wood)
      if (pos >= 1 && pos <= 100) reserved[wood].push(pos)
    }

    // Pending: reservation_interest rows with a preferred_position specified
    const pending = { hinoki: [], ebony: [], padauk: [] }
    try {
      const pendingRows = await env.DB.prepare(
        `SELECT preferred_position, wood_preference
         FROM reservation_interest
         WHERE status = 'pending' AND preferred_position IS NOT NULL`
      ).all()
      for (const p of (pendingRows.results || [])) {
        const w = p.wood_preference
        if (['hinoki', 'ebony', 'padauk'].includes(w) && p.preferred_position >= 1 && p.preferred_position <= 100) {
          pending[w].push(p.preferred_position)
        }
      }
    } catch (e) {
      // Column may not exist yet — swallow so the endpoint still works
    }

    return json({ ...reserved, pending })
  } catch (err) {
    console.error('availability GET:', err.message)
    return json({ error: 'Could not load availability' }, 500)
  }
}
