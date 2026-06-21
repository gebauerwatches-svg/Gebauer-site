/**
 * GET /api/unsubscribe?token=...
 *
 * Cloudflare Pages Function.
 * CAN-SPAM compliance: every broadcast email contains a unique unsubscribe URL
 * pointing here. Marks the subscriber as unsubscribed (does NOT delete the row,
 * so we keep a record for compliance audits and to prevent re-adding).
 *
 * Returns a simple HTML confirmation page so the user sees that the click worked.
 */

export async function onRequestGet(context) {
  const { env } = context
  const url = new URL(context.request.url)
  const token = (url.searchParams.get('token') || '').trim()

  if (!token) {
    return htmlResponse(`<h1>Invalid unsubscribe link</h1><p>No token provided.</p>`, 400)
  }

  if (!env.DB) {
    return htmlResponse(`<h1>Something went wrong</h1><p>Please email hello@gebauerwatches.com to unsubscribe manually.</p>`, 500)
  }

  try {
    // Find subscriber by token (idempotent - safe to click twice)
    const row = await env.DB.prepare(`
      SELECT id, email, status FROM subscribers WHERE unsubscribe_token = ? LIMIT 1
    `).bind(token).first()

    if (!row) {
      return htmlResponse(`
        <h1>Link not recognized</h1>
        <p>This unsubscribe link is invalid or has expired. If you want to be removed from the list, email hello@gebauerwatches.com and we'll handle it manually.</p>
      `, 404)
    }

    if (row.status === 'unsubscribed') {
      return htmlResponse(`
        <h1>You're already unsubscribed</h1>
        <p>Your email (${escapeHtml(row.email)}) was already removed. No further action needed.</p>
      `)
    }

    await env.DB.prepare(`
      UPDATE subscribers
      SET status = 'unsubscribed', unsubscribed_at = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), row.id).run()

    return htmlResponse(`
      <h1>You've been unsubscribed</h1>
      <p>${escapeHtml(row.email)} has been removed from the Gebauer Watches waitlist.</p>
      <p>If this was a mistake, you can rejoin anytime at <a href="https://gebauerwatches.com">gebauerwatches.com</a>.</p>
    `)
  } catch (err) {
    console.error('Unsubscribe error:', err.message)
    return htmlResponse(`<h1>Something went wrong</h1><p>Please email hello@gebauerwatches.com to unsubscribe manually.</p>`, 500)
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function htmlResponse(bodyHtml, status = 200) {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Gebauer Watches</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; background: #14111c; color: #f8f6f2; margin: 0; padding: 48px 24px; line-height: 1.6; }
    .wrap { max-width: 520px; margin: 0 auto; }
    h1 { color: #d4a62a; font-weight: normal; letter-spacing: 0.05em; font-size: 28px; margin: 0 0 24px; }
    p { color: #b8afca; margin: 0 0 16px; font-size: 16px; }
    a { color: #d4a62a; }
  </style>
</head>
<body>
  <div class="wrap">${bodyHtml}</div>
</body>
</html>`
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
