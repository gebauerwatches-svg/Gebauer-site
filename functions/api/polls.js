/**
 * GET /api/polls - get active poll + latest closed result
 * POST /api/polls - vote on active poll (requires email)
 *
 * Phase 4 migration (June 21 2026): reads/writes Cloudflare D1.
 * Options are stored as a JSON string in polls.options column.
 */

import { json } from './_shared.js'

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

function parseOptions(jsonStr) {
  try { return JSON.parse(jsonStr || '[]') } catch { return [] }
}

async function withVotes(env, poll) {
  if (!poll) return null
  const rows = await env.DB.prepare(
    'SELECT choice, COUNT(*) as cnt FROM poll_votes WHERE poll_id = ? GROUP BY choice'
  ).bind(poll.id).all()
  const counts = {}
  let total = 0
  for (const row of (rows.results || [])) {
    counts[row.choice] = row.cnt
    total += row.cnt
  }
  return {
    ...poll,
    options: parseOptions(poll.options),
    votes: counts,
    total,
  }
}

export async function onRequestGet(context) {
  const { env } = context
  if (!env.DB) return json({ error: 'Server configuration error.' }, 500)

  try {
    let active = await env.DB.prepare(
      "SELECT * FROM polls WHERE status = 'active' ORDER BY created_at DESC LIMIT 1"
    ).first()

    // Auto-rotate: if active poll is older than 3 days, close it
    if (active) {
      const ageMs = Date.now() - new Date(active.created_at).getTime()
      if (ageMs > THREE_DAYS_MS) {
        // Find winner
        const winRow = await env.DB.prepare(
          'SELECT choice, COUNT(*) as cnt FROM poll_votes WHERE poll_id = ? GROUP BY choice ORDER BY cnt DESC LIMIT 1'
        ).bind(active.id).first()
        const winner = winRow ? winRow.choice : null
        const now = new Date().toISOString()

        await env.DB.prepare(
          "UPDATE polls SET status = 'closed', closed_at = ?, winner = ? WHERE id = ?"
        ).bind(now, winner, active.id).run()
        active = null
      }
    }

    // Get the latest closed poll for the "last result" display
    const closed = await env.DB.prepare(
      "SELECT * FROM polls WHERE status = 'closed' ORDER BY closed_at DESC LIMIT 1"
    ).first()

    return json({
      active: await withVotes(env, active),
      lastResult: await withVotes(env, closed),
    })
  } catch (err) {
    console.error('Polls GET error:', err.message)
    return json({ error: 'Could not fetch polls', message: err.message }, 500)
  }
}

export async function onRequestPost(context) {
  const { env } = context
  if (!env.DB) return json({ error: 'Server configuration error.' }, 500)

  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid request' }, 400) }

  const { poll_id, choice, email } = body || {}
  if (!poll_id || !choice || !email) {
    return json({ error: 'Missing poll_id, choice, or email' }, 400)
  }

  try {
    const poll = await env.DB.prepare(
      'SELECT status FROM polls WHERE id = ? LIMIT 1'
    ).bind(poll_id).first()

    if (!poll || poll.status !== 'active') {
      return json({ error: 'Poll is closed' }, 400)
    }

    // Already voted?
    const existing = await env.DB.prepare(
      'SELECT id FROM poll_votes WHERE poll_id = ? AND email = ? LIMIT 1'
    ).bind(poll_id, email).first()

    if (existing) {
      return json({ error: 'Already voted', already_voted: true })
    }

    const now = new Date().toISOString()
    await env.DB.prepare(
      'INSERT INTO poll_votes (poll_id, choice, email, created_at) VALUES (?, ?, ?, ?)'
    ).bind(poll_id, choice, email, now).run()

    // Return updated counts
    const rows = await env.DB.prepare(
      'SELECT choice, COUNT(*) as cnt FROM poll_votes WHERE poll_id = ? GROUP BY choice'
    ).bind(poll_id).all()
    const counts = {}
    let total = 0
    for (const row of (rows.results || [])) {
      counts[row.choice] = row.cnt
      total += row.cnt
    }

    return json({ ok: true, votes: counts, total })
  } catch (err) {
    console.error('Polls POST error:', err.message)
    return json({ error: 'Could not save vote', message: err.message }, 500)
  }
}
