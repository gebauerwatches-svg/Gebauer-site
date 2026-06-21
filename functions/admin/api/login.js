/**
 * POST /admin/api/login - submit password, get session cookie
 */

import { json } from '../../api/_shared.js'
import { createSessionCookie } from '../_auth.js'

export async function onRequestPost(context) {
  const { env } = context
  if (!env.ADMIN_PASSWORD) {
    // Diagnostic - strip after debugging
    const adminKeys = Object.keys(env).filter(k => k.toUpperCase().includes('ADMIN') || k.toUpperCase().includes('PASS'))
    return json({
      error: 'Admin not configured. Set ADMIN_PASSWORD env var.',
      diag: {
        admin_like_keys_visible: adminKeys,
        ADMIN_PASSWORD_type: typeof env.ADMIN_PASSWORD,
        ADMIN_PASSWORD_length: env.ADMIN_PASSWORD ? env.ADMIN_PASSWORD.length : 0,
      },
    }, 500)
  }

  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid request.' }, 400) }

  const password = body.password || ''
  if (password !== env.ADMIN_PASSWORD) {
    return json({ error: 'Wrong password.' }, 401)
  }

  try {
    const cookie = await createSessionCookie(env)
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}
