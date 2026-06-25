/**
 * GET    /admin/api/subscribers       - list with optional search/sort
 * POST   /admin/api/subscribers       - add a subscriber manually
 * PUT    /admin/api/subscribers/:id   - update a subscriber (name, position, status, notes)
 * DELETE /admin/api/subscribers/:id   - hard delete (rare, prefer status=unsubscribed)
 */

import { json, randomHex } from '../../api/_shared.js'
import { requireAuth } from '../_auth.js'

export async function onRequestGet(context) {
  const unauth = await requireAuth(context, json); if (unauth) return unauth
  const { env } = context
  const url = new URL(context.request.url)
  const q = (url.searchParams.get('q') || '').trim().toLowerCase()
  const sort = url.searchParams.get('sort') || 'subscribed_at'
  const order = url.searchParams.get('order') === 'asc' ? 'ASC' : 'DESC'
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '200', 10), 500)

  const allowedSort = new Set(['subscribed_at', 'first_name', 'email', 'referral_count', 'waitlist_position'])
  const sortCol = allowedSort.has(sort) ? sort : 'subscribed_at'

  try {
    let rows
    const baseSelect = `
      SELECT s.id, s.email, s.first_name, s.referral_code, s.referral_count,
             s.waitlist_position, s.status, s.subscribed_at, s.notes,
             COUNT(cs.id) AS story_count,
             GROUP_CONCAT(cs.story, '||SEP||') AS stories
      FROM subscribers s
      LEFT JOIN community_stories cs ON cs.email = s.email
    `
    if (q) {
      const pat = `%${q}%`
      rows = await env.DB.prepare(
        `${baseSelect}
         WHERE LOWER(s.email) LIKE ? OR LOWER(s.first_name) LIKE ? OR LOWER(cs.story) LIKE ?
         GROUP BY s.id
         ORDER BY s.${sortCol} ${order}
         LIMIT ?`
      ).bind(pat, pat, pat, limit).all()
    } else {
      rows = await env.DB.prepare(
        `${baseSelect}
         GROUP BY s.id
         ORDER BY s.${sortCol} ${order}
         LIMIT ?`
      ).bind(limit).all()
    }

    const totalRow = await env.DB.prepare(
      "SELECT COUNT(*) as cnt, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active FROM subscribers"
    ).first()

    const storiesRow = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM community_stories"
    ).first()

    return json({
      subscribers: rows.results || [],
      total: totalRow ? totalRow.cnt : 0,
      active: totalRow ? totalRow.active : 0,
      stories_total: storiesRow ? storiesRow.cnt : 0,
    })
  } catch (err) {
    console.error('subscribers GET:', err.message)
    return json({ error: 'Could not load subscribers' }, 500)
  }
}

export async function onRequestPost(context) {
  const unauth = await requireAuth(context, json); if (unauth) return unauth
  const { env } = context

  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid request.' }, 400) }
  const { email, first_name, notes, waitlist_position } = body || {}
  if (!email || !first_name) return json({ error: 'email and first_name are required' }, 400)

  const cleanEmail = email.trim().toLowerCase()
  const cleanName = first_name.trim()
  const watchNumber = Number.isInteger(waitlist_position) && waitlist_position >= 1 && waitlist_position <= 300
    ? waitlist_position
    : 9999

  try {
    const existing = await env.DB.prepare(
      'SELECT id FROM subscribers WHERE email = ? LIMIT 1'
    ).bind(cleanEmail).first()
    if (existing) return json({ error: 'Already on the waitlist.', id: existing.id }, 409)

    const referralCode = cleanName.split(' ')[0].toUpperCase().slice(0, 6) + '-' + randomHex(3).toUpperCase()
    const unsubscribeToken = randomHex(16)
    const now = new Date().toISOString()

    const result = await env.DB.prepare(`
      INSERT INTO subscribers
        (email, first_name, referral_code, referral_count, waitlist_position, unsubscribe_token, status, subscribed_at, notes)
      VALUES (?, ?, ?, 0, ?, ?, 'active', ?, ?)
    `).bind(cleanEmail, cleanName, referralCode, watchNumber, unsubscribeToken, now, notes || null).run()

    return json({ ok: true, id: result.meta.last_row_id, referral_code: referralCode })
  } catch (err) {
    console.error('subscribers POST:', err.message)
    return json({ error: err.message }, 500)
  }
}
