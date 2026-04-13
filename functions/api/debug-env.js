/**
 * GET /api/debug-env
 * Temporarily check which env vars are available. DELETE THIS AFTER DEBUGGING.
 */

import { json } from './_shared.js'

export async function onRequestGet(context) {
  const { env } = context
  const keys = Object.keys(env).filter(k => !k.startsWith('__'))
  return json({
    available_keys: keys,
    has_supabase: !!env.SUPABASE_URL,
    has_mailerlite: !!env.MAILERLITE_API_KEY,
    has_resend: !!env.RESEND_API_KEY,
  })
}
