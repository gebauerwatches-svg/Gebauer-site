/**
 * Shared welcome-email sender.
 *
 * Reads template from D1 settings (welcome_enabled, welcome_subject,
 * welcome_body). Renders {{first_name}} and {{unsubscribe_url}} tokens.
 * Sends via Resend with the CAN-SPAM footer (mailing address + unsubscribe).
 *
 * Best-effort: returns true/false but never throws. Signup must not fail
 * if the welcome email errors.
 */

const FORBIDDEN_DASHES = ['—', '–']  // em / en dash

function mdToHtml(md) {
  const parts = []
  for (const para of String(md).trim().split(/\n\n+/)) {
    let p = para.trim()
    if (!p) continue
    p = p.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    p = p.replace(/\*(.+?)\*/g, '<em>$1</em>')
    p = p.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#d4a62a;">$1</a>')
    // URL autolink
    p = p.replace(/(?<!["'>])(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#d4a62a;">$1</a>')
    p = p.replace(/\n/g, '<br>')
    parts.push(`<p style="margin:0 0 16px 0;line-height:1.6;font-family:Georgia,serif;font-size:16px;color:#1a1a1a;">${p}</p>`)
  }
  return parts.join('\n')
}

function buildHtml(bodyHtml, unsubscribeUrl, mailingAddress) {
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

async function getSetting(env, key) {
  try {
    const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first()
    return row ? row.value : null
  } catch {
    return null
  }
}

/**
 * Send the welcome email. Returns { sent: bool, reason?: string }.
 * Swallows all errors — caller should not block on this.
 */
export async function sendWelcomeEmail(env, { email, first_name, unsubscribe_token }) {
  try {
    if (!env.DB || !env.RESEND_API_KEY) return { sent: false, reason: 'missing-env' }
    if (!env.GEBAUER_MAILING_ADDRESS) return { sent: false, reason: 'missing-mailing-address' }
    if (!email || !unsubscribe_token) return { sent: false, reason: 'missing-recipient' }

    const enabled = await getSetting(env, 'welcome_enabled')
    if (enabled !== 'true') return { sent: false, reason: 'disabled' }

    const subjectTpl = await getSetting(env, 'welcome_subject')
    const bodyTpl = await getSetting(env, 'welcome_body')
    if (!subjectTpl || !bodyTpl) return { sent: false, reason: 'missing-template' }

    const unsubscribeUrl = `https://gebauerwatches.com/api/unsubscribe?token=${unsubscribe_token}`

    // Token replacement
    const fname = (first_name || 'Friend').split(' ')[0]
    const subject = subjectTpl.replace(/\{\{first_name\}\}/g, fname)
    const body = bodyTpl
      .replace(/\{\{first_name\}\}/g, fname)
      .replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl)

    // Voice guard: refuse em / en dashes
    for (const ch of FORBIDDEN_DASHES) {
      if (subject.includes(ch) || body.includes(ch)) {
        return { sent: false, reason: 'voice-guard' }
      }
    }

    const html = buildHtml(mdToHtml(body), unsubscribeUrl, env.GEBAUER_MAILING_ADDRESS)
    const fromName = env.GEBAUER_FROM_NAME || 'Liam from Gebauer'
    const fromEmail = env.GEBAUER_FROM_EMAIL || 'hello@gebauerwatches.com'

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [email],
        subject,
        html,
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '')
      return { sent: false, reason: `resend-${resp.status}`, error: errText.slice(0, 200) }
    }
    return { sent: true }
  } catch (err) {
    return { sent: false, reason: 'exception', error: err.message }
  }
}
