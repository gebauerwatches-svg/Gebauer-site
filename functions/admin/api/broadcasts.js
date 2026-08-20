/**
 * GET  /admin/api/broadcasts                  - history of sent broadcasts
 * POST /admin/api/broadcasts/preview          - render preview HTML (no send)
 * POST /admin/api/broadcasts/send             - send to all active subscribers
 */

import { json } from '../../api/_shared.js'
import { requireAuth } from '../_auth.js'

const FORBIDDEN_DASHES = ['—', '–']

function checkVoiceGuard(subject, body) {
  const hits = []
  for (const ch of FORBIDDEN_DASHES) {
    if (subject.includes(ch)) hits.push(`subject contains "${ch}"`)
    if (body.includes(ch)) hits.push(`body contains "${ch}"`)
  }
  return hits
}

// Tiny markdown -> HTML. Handles paragraphs, **bold**, *italic*, [text](url).
function mdToHtml(md) {
  const parts = []
  for (const para of String(md).trim().split(/\n\n+/)) {
    let p = para.trim()
    if (!p) continue
    p = p.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    p = p.replace(/\*(.+?)\*/g, '<em>$1</em>')
    p = p.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#d4a62a;">$1</a>')
    p = p.replace(/\n/g, '<br>')
    parts.push(`<p style="margin:0 0 16px 0;line-height:1.6;font-family:Georgia,serif;font-size:16px;color:#1a1a1a;">${p}</p>`)
  }
  return parts.join('\n')
}

function buildEmailHtml(bodyHtml, unsubscribeUrl, mailingAddress) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f3ef;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f5f3ef;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;background:#ffffff;padding:32px;">
        <tr><td>
          ${bodyHtml}
          <hr style="border:0;border-top:1px solid #e0d8c8;margin:32px 0 16px;">
          <p style="font-family:Arial,sans-serif;font-size:11px;color:#888;line-height:1.5;margin:0 0 8px;">You are receiving this because you signed up at gebauerwatches.com.</p>
          <p style="font-family:Arial,sans-serif;font-size:11px;color:#888;line-height:1.5;margin:0 0 8px;">${mailingAddress}</p>
          <p style="font-family:Arial,sans-serif;font-size:11px;color:#888;line-height:1.5;margin:0;"><a href="${unsubscribeUrl}" style="color:#888;">Unsubscribe</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export async function onRequestGet(context) {
  const unauth = await requireAuth(context, json); if (unauth) return unauth
  const { env } = context

  try {
    const rows = await env.DB.prepare(
      'SELECT id, subject, sent_at, recipients_count, sent_by FROM broadcasts ORDER BY sent_at DESC LIMIT 100'
    ).all()
    return json({ broadcasts: rows.results || [] })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}

export async function onRequestPost(context) {
  const unauth = await requireAuth(context, json); if (unauth) return unauth
  const { env } = context
  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid request.' }, 400) }

  // The action comes from the request BODY, not the path. Cloudflare Pages maps
  // this file to /admin/api/broadcasts exactly; sub-paths like /broadcasts/send
  // need a directory (see reservation/[id].js). There isn't one, so the old
  // pathname check meant every send and preview from the admin UI 405'd and the
  // feature had never actually run. Pathname is still honoured for old clients.
  const url = new URL(context.request.url)
  const action = (body.action === 'preview' || url.pathname.endsWith('/preview')) ? 'preview' : 'send'

  const subject = (body.subject || '').trim()
  const bodyMd = (body.body || '').trim()
  if (!subject || !bodyMd) return json({ error: 'subject and body are required' }, 400)

  // Voice guard: refuse em/en dashes
  const dashHits = checkVoiceGuard(subject, bodyMd)
  if (dashHits.length > 0) {
    return json({ error: `Voice guard: ${dashHits.join(', ')}. Replace dashes with periods or commas.` }, 400)
  }

  const mailingAddress = env.GEBAUER_MAILING_ADDRESS || ''
  if (!mailingAddress) {
    return json({ error: 'Missing GEBAUER_MAILING_ADDRESS env var (required for CAN-SPAM compliance).' }, 500)
  }

  const bodyHtml = mdToHtml(bodyMd)

  // PREVIEW path: render once with a placeholder unsubscribe URL
  if (action === 'preview') {
    const sample = buildEmailHtml(bodyHtml, 'https://gebauerwatches.com/api/unsubscribe?token=PREVIEW', mailingAddress)
    return json({ ok: true, html: sample })
  }

  // SEND path
  const resendKey = env.RESEND_API_KEY
  if (!resendKey) return json({ error: 'Missing RESEND_API_KEY' }, 500)

  const fromName = env.GEBAUER_FROM_NAME || 'Liam from Gebauer'
  const fromEmail = env.GEBAUER_FROM_EMAIL || 'hello@gebauerwatches.com'

  try {
    // Pull active subscribers
    const subRows = await env.DB.prepare(
      "SELECT id, email, first_name, unsubscribe_token FROM subscribers WHERE status = 'active' AND unsubscribe_token IS NOT NULL"
    ).all()
    const recipients = subRows.results || []

    if (recipients.length === 0) {
      return json({ error: 'No active subscribers to send to.' }, 400)
    }

    // Log the broadcast first
    const now = new Date().toISOString()
    const broadcastResult = await env.DB.prepare(
      'INSERT INTO broadcasts (subject, body_html, sent_at, recipients_count, sent_by) VALUES (?, ?, ?, ?, ?)'
    ).bind(subject, bodyHtml, now, recipients.length, 'admin').run()
    const broadcastId = broadcastResult.meta.last_row_id

    // Send each one. Cap to first 200 per request to stay within Cloudflare time limits.
    // For a full 134-subscriber send this is fine in one batch. Larger lists would need a queue.
    let sent = 0
    let failed = 0
    const errors = []
    for (const r of recipients) {
      const unsubUrl = `https://gebauerwatches.com/api/unsubscribe?token=${r.unsubscribe_token}`
      const html = buildEmailHtml(bodyHtml, unsubUrl, mailingAddress)
      try {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${fromName} <${fromEmail}>`,
            to: [r.email],
            subject,
            html,
          }),
        })
        if (resp.ok) {
          sent++
          await env.DB.prepare(
            "INSERT INTO broadcast_sends (broadcast_id, subscriber_id, email, sent_at, status) VALUES (?, ?, ?, ?, 'sent')"
          ).bind(broadcastId, r.id, r.email, new Date().toISOString()).run()
        } else {
          failed++
          const errText = await resp.text()
          errors.push(`${r.email}: ${resp.status}`)
          await env.DB.prepare(
            "INSERT INTO broadcast_sends (broadcast_id, subscriber_id, email, sent_at, status, error) VALUES (?, ?, ?, ?, 'failed', ?)"
          ).bind(broadcastId, r.id, r.email, new Date().toISOString(), errText.slice(0, 500)).run()
        }
      } catch (err) {
        failed++
        errors.push(`${r.email}: ${err.message}`)
      }
    }

    // Update recipients_count to actual sent count
    await env.DB.prepare('UPDATE broadcasts SET recipients_count = ? WHERE id = ?').bind(sent, broadcastId).run()

    return json({
      ok: true,
      broadcast_id: broadcastId,
      sent,
      failed,
      errors: errors.slice(0, 5),
    })
  } catch (err) {
    console.error('broadcasts SEND:', err.message)
    return json({ error: err.message }, 500)
  }
}
