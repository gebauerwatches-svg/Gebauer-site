/**
 * GET /admin/api/settings        - return all key/value settings
 * PUT /admin/api/settings        - upsert one or more keys: { key: value, ... }
 */

import { json } from '../../api/_shared.js'
import { requireAuth } from '../_auth.js'

const ALLOWED_KEYS = new Set([
  'welcome_enabled',
  'welcome_subject',
  'welcome_body',
])

export async function onRequestGet(context) {
  const unauth = await requireAuth(context, json); if (unauth) return unauth
  const { env } = context
  try {
    const rows = await env.DB.prepare(
      'SELECT key, value, updated_at FROM settings ORDER BY key'
    ).all()
    const out = {}
    for (const r of (rows.results || [])) out[r.key] = r.value
    return json({ settings: out })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}

export async function onRequestPut(context) {
  const unauth = await requireAuth(context, json); if (unauth) return unauth
  const { env } = context

  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid request.' }, 400) }
  if (!body || typeof body !== 'object') return json({ error: 'Body must be an object of key/value updates.' }, 400)

  const now = new Date().toISOString()
  const updated = []
  const errors = []
  try {
    for (const [key, value] of Object.entries(body)) {
      if (!ALLOWED_KEYS.has(key)) { errors.push(`Unknown key: ${key}`); continue }
      if (typeof value !== 'string') { errors.push(`Value for ${key} must be a string`); continue }
      await env.DB.prepare(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      ).bind(key, value, now).run()
      updated.push(key)
    }
    return json({ ok: true, updated, errors })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}
