/**
 * POST /api/blog-subscribe
 *
 * Saves an email to the blog_subscribers table in Supabase.
 */

import { json, supabaseQuery } from './_shared.js'

export async function onRequestOptions() {
  return json({}, 200)
}

export async function onRequestPost(context) {
  const { env } = context

  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) return json({ error: 'Server configuration error.' }, 500)

  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid request.' }, 400) }

  const email = (body.email || '').trim().toLowerCase()
  if (!email) return json({ error: 'Email is required.' }, 400)

  try {
    // Check if already subscribed
    const existing = await supabaseQuery(env,
      `blog_subscribers?email=eq.${encodeURIComponent(email)}&select=email`
    )

    if (existing.data && existing.data.length > 0) {
      return json({ ok: true, message: "You're already subscribed." })
    }

    const insert = await supabaseQuery(env, 'blog_subscribers', {
      method: 'POST',
      body: { email },
    })

    if (insert.status >= 400) {
      return json({ error: 'Could not subscribe. Try again.' }, 500)
    }

    return json({ ok: true, message: 'Subscribed.' })
  } catch (err) {
    console.error('Blog subscribe error:', err.message)
    return json({ error: 'Something went wrong.' }, 500)
  }
}
