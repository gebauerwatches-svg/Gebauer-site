/**
 * POST /api/blog-subscribe
 *
 * Adds an email to the "Blog Subscribers" group in MailerLite.
 * Group ID: 184592884281902979
 */

import { json } from './_shared.js'

const BLOG_GROUP_ID = '184592884281902979'

export async function onRequestOptions() {
  return json({}, 200)
}

export async function onRequestPost(context) {
  const { env } = context

  if (!env.MAILERLITE_API_KEY) {
    return json({ error: 'Server configuration error.' }, 500)
  }

  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid request.' }, 400) }

  const email = (body.email || '').trim().toLowerCase()
  if (!email) return json({ error: 'Email is required.' }, 400)

  try {
    // Add subscriber to MailerLite with the Blog Subscribers group
    const resp = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.MAILERLITE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        groups: [BLOG_GROUP_ID],
      }),
    })

    const data = await resp.json()

    if (data.data && data.data.email) {
      return json({ ok: true, message: "You're subscribed. New posts will hit your inbox." })
    }

    // Already subscribed — add to group
    if (resp.status === 200 || (data.message && data.message.includes('already'))) {
      return json({ ok: true, message: "You're subscribed. New posts will hit your inbox." })
    }

    return json({ error: 'Could not subscribe. Try again.' }, 500)
  } catch (err) {
    console.error('Blog subscribe error:', err.message)
    return json({ error: 'Something went wrong.' }, 500)
  }
}
