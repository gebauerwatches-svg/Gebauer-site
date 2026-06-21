/**
 * POST /api/vote - cast a vote
 * GET /api/vote?poll=wood - get results for a poll
 *
 * Phase 4 migration (June 21 2026): reads/writes Cloudflare D1 instead of
 * the Supabase votes project.
 */

import { json } from './_shared.js'

export async function onRequestGet(context) {
  const { env } = context
  const url = new URL(context.request.url)
  const poll = url.searchParams.get('poll')

  if (!poll) return json({ error: 'Missing poll parameter' }, 400)
  if (!env.DB) return json({ error: 'Server configuration error.' }, 500)

  try {
    const rows = await env.DB.prepare(
      'SELECT option, COUNT(*) as cnt FROM votes WHERE poll_id = ? GROUP BY option'
    ).bind(poll).all()

    const counts = {}
    let total = 0
    for (const row of (rows.results || [])) {
      counts[row.option] = row.cnt
      total += row.cnt
    }

    return json({ results: counts, total })
  } catch (err) {
    console.error('Vote GET error:', err.message)
    return json({ error: 'Could not fetch results' }, 500)
  }
}

export async function onRequestPost(context) {
  const { env } = context

  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid request' }, 400) }

  const { poll_id, option, voter_id } = body || {}
  if (!poll_id || !option) return json({ error: 'Missing poll_id or option' }, 400)
  if (!env.DB) return json({ error: 'Server configuration error.' }, 500)

  const voterId = voter_id || 'anonymous'

  try {
    // Check if already voted (per poll, per voter)
    const existing = await env.DB.prepare(
      'SELECT id FROM votes WHERE poll_id = ? AND voter_id = ? LIMIT 1'
    ).bind(poll_id, voterId).first()

    if (existing) {
      return json({ error: 'Already voted', already_voted: true })
    }

    const now = new Date().toISOString()
    await env.DB.prepare(
      'INSERT INTO votes (poll_id, option, voter_id, created_at) VALUES (?, ?, ?, ?)'
    ).bind(poll_id, option, voterId, now).run()

    // Return updated results
    const rows = await env.DB.prepare(
      'SELECT option, COUNT(*) as cnt FROM votes WHERE poll_id = ? GROUP BY option'
    ).bind(poll_id).all()

    const counts = {}
    let total = 0
    for (const row of (rows.results || [])) {
      counts[row.option] = row.cnt
      total += row.cnt
    }

    return json({ ok: true, results: counts, total })
  } catch (err) {
    console.error('Vote POST error:', err.message)
    return json({ error: 'Could not save vote', message: err.message }, 500)
  }
}
