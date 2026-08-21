/**
 * GET /admin/api/env-check
 *
 * Reports which environment variables and bindings the running Function can
 * actually see. Presence only, never values.
 *
 * Exists because "I added it to Cloudflare and it still says missing" is
 * otherwise unfalsifiable from outside: you cannot tell the difference between
 * a variable set on the wrong environment, set on a different project, or set
 * on a deployment that was never rebuilt. This turns that into one answer.
 *
 * SAFETY: this must never return a value, a prefix, or a length that could
 * narrow a secret. Booleans only. Admin auth required.
 */

import { json } from '../../api/_shared.js'
import { requireAuth } from '../_auth.js'

const EXPECTED = [
  'RESEND_API_KEY',
  'ADMIN_PASSWORD',
  'ADMIN_SESSION_SECRET',
  'SUBSCRIBERS_TOKEN',
  'GEBAUER_MAILING_ADDRESS',
  'GEBAUER_FROM_EMAIL',
  'GEBAUER_FROM_NAME',
  'NOTIFY_EMAIL',
]

export async function onRequestGet(context) {
  const unauth = await requireAuth(context, json); if (unauth) return unauth
  const { env } = context

  const vars = {}
  for (const name of EXPECTED) {
    const v = env[name]
    vars[name] = typeof v === 'string' && v.trim().length > 0
  }

  return json({
    ok: true,
    note: 'true means the running Function can read it. Values are never returned.',
    bindings: { DB: Boolean(env.DB) },
    vars,
    missing: EXPECTED.filter((n) => !vars[n]),
  })
}
