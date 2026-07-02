/**
 * POST /api/reserve
 *
 * Cold-visitor reservation interest capture. Preserves the intentional
 * number-assignment rule (see feedback_number_reservation_policy) by
 * writing to a REVIEW queue in D1, not directly into subscribers.
 *
 * Liam reviews via /admin, personally follows up, and only then converts
 * the interest into a full subscriber with a watch number assigned.
 *
 * Bindings required (set in Cloudflare Pages):
 *   DB                        - D1 database (gebauer-waitlist)
 *
 * Optional env for notifications:
 *   RESEND_API_KEY            - if set, sends Liam an email when new
 *                               interest lands
 *   RESEND_FROM_EMAIL         - from address for notification email
 *   NOTIFY_EMAIL              - where to send the notification
 *                               (defaults to gebauerwatches@gmail.com)
 */

import { json } from './_shared.js'


const VALID_WOODS = new Set(['hinoki', 'ebony', 'padauk', 'unsure'])


async function notifyLiam(env, entry) {
  const apiKey = env.RESEND_API_KEY
  if (!apiKey) return { sent: false, reason: 'no-key' }

  const notifyTo = env.NOTIFY_EMAIL || 'gebauerwatches@gmail.com'
  const from = env.RESEND_FROM_EMAIL || 'Gebauer Watches <hello@gebauerwatches.com>'

  const woodLabel = {
    hinoki: 'Hinoki ($299)',
    ebony: 'Black Ebony ($339)',
    padauk: 'African Padauk ($375)',
    unsure: 'Not sure yet',
  }[entry.wood_preference] || entry.wood_preference

  const html = `
    <div style="font-family:Georgia,serif;font-size:15px;color:#1a1a1a;max-width:640px;line-height:1.55;">
      <h2 style="font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;color:#0F0D14;">New reservation interest</h2>
      <p><strong>${entry.first_name}</strong> (${entry.email}) just requested a reservation.</p>
      <p><strong>Wood preference:</strong> ${woodLabel}</p>
      ${entry.why_message ? `<p><strong>Why they want it:</strong><br>${entry.why_message.replace(/\n/g, '<br>')}</p>` : '<p><em>No message provided.</em></p>'}
      <hr style="border:0;border-top:1px solid #ccc;margin:24px 0;">
      <p style="font-size:13px;color:#666;">Review in <a href="https://gebauerwatches.com/admin#reservations">/admin</a>. Follow up personally to close.</p>
    </div>
  `

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: notifyTo,
        subject: `New reservation interest: ${entry.first_name} (${woodLabel})`,
        html,
      }),
    })
    if (!resp.ok) {
      const text = await resp.text()
      return { sent: false, reason: 'resend-failed', status: resp.status, body: text.slice(0, 200) }
    }
    return { sent: true }
  } catch (e) {
    return { sent: false, reason: 'exception', error: e.message }
  }
}


export async function onRequestOptions() {
  return json({}, 200)
}

export async function onRequestPost(context) {
  const { env } = context

  if (!env.DB) {
    return json({ error: 'Server configuration error. Contact hello@gebauerwatches.com.' }, 500)
  }

  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid request.' }, 400) }

  const { first_name, email, wood_preference, why_message, honeypot } = body || {}

  // Honeypot spam check
  if (honeypot) return json({ ok: true })

  if (!first_name || !email || !wood_preference) {
    return json({ error: 'Name, email, and wood preference are required.' }, 400)
  }

  const cleanName = String(first_name).trim().slice(0, 100)
  const cleanEmail = String(email).trim().toLowerCase().slice(0, 200)
  const cleanWood = String(wood_preference).toLowerCase().trim()
  const cleanWhy = (why_message ? String(why_message).trim().slice(0, 1000) : null)

  if (cleanName.length < 1) return json({ error: 'Please enter your name.' }, 400)
  if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return json({ error: 'Please enter a valid email.' }, 400)
  }
  if (!VALID_WOODS.has(cleanWood)) {
    return json({ error: 'Please pick a wood option.' }, 400)
  }

  const disposable = ['tempmail', 'throwaway', 'guerrilla', 'sharklasers', 'mailinator', 'yopmail', 'trashmail', 'fakeinbox', 'grr.la']
  if (disposable.some(d => cleanEmail.includes(d))) {
    return json({ error: 'Please use a real email address.' }, 400)
  }

  try {
    // Insert the interest row
    const now = new Date().toISOString()
    const result = await env.DB.prepare(`
      INSERT INTO reservation_interest (email, first_name, wood_preference, why_message, status, submitted_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `).bind(cleanEmail, cleanName, cleanWood, cleanWhy, now).run()

    const insertedId = result.meta.last_row_id

    // Fire-and-forget notification (best effort, never blocks the response)
    try {
      const notif = await notifyLiam(env, {
        id: insertedId,
        email: cleanEmail,
        first_name: cleanName,
        wood_preference: cleanWood,
        why_message: cleanWhy,
      })
      if (!notif.sent) console.log('Notify skipped:', notif.reason, notif.error || '')
    } catch (e) {
      console.error('Notify error:', e.message)
    }

    return json({ ok: true, id: insertedId })

  } catch (err) {
    console.error('Reserve error:', err.message, err.stack)
    return json({ error: 'Something went wrong. Please try again in a moment.' }, 500)
  }
}
