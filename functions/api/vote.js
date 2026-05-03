/**
 * POST /api/vote — cast a vote
 * GET /api/vote?poll=wood — get results for a poll
 *
 * Uses SUPABASE_VOTES_URL and SUPABASE_VOTES_KEY (separate project for votes)
 */

import { json } from './_shared.js'

async function votesQuery(env, path, options = {}) {
  const url = env.SUPABASE_VOTES_URL || env.VOTES_URL || env.SUPABASE_URL
  const key = env.SUPABASE_VOTES_KEY || env.VOTES_KEY || env.SUPABASE_KEY

  const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
  }

  if (options.method === 'POST') {
    headers['Prefer'] = 'return=representation'
  }

  const resp = await fetch(`${url}/rest/v1/${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await resp.json().catch(() => null)
  return { status: resp.status, data }
}

export async function onRequestGet(context) {
  const { env } = context
  const url = new URL(context.request.url)
  const poll = url.searchParams.get('poll')

  if (!poll) return json({ error: 'Missing poll parameter' }, 400)

  try {
    const resp = await votesQuery(env,
      `votes?select=option&poll_id=eq.${encodeURIComponent(poll)}`
    )

    if (!resp.data || !Array.isArray(resp.data)) {
      return json({ results: {}, total: 0 })
    }

    const counts = {}
    for (const row of resp.data) {
      counts[row.option] = (counts[row.option] || 0) + 1
    }

    return json({ results: counts, total: resp.data.length })
  } catch (err) {
    return json({ error: 'Could not fetch results' }, 500)
  }
}

export async function onRequestPost(context) {
  const { env } = context

  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid request' }, 400) }

  const { poll_id, option, voter_id } = body || {}

  if (!poll_id || !option) return json({ error: 'Missing poll_id or option' }, 400)

  const voterId = voter_id || 'anonymous'

  try {
    // Check if already voted
    const existing = await votesQuery(env,
      `votes?poll_id=eq.${encodeURIComponent(poll_id)}&voter_id=eq.${encodeURIComponent(voterId)}&select=id`
    )

    if (existing.data && existing.data.length > 0) {
      return json({ error: 'Already voted', already_voted: true })
    }

    // Cast vote
    const insert = await votesQuery(env, 'votes', {
      method: 'POST',
      body: { poll_id, option, voter_id: voterId },
    })

    if (insert.status >= 400) {
      return json({ error: 'Insert failed', status: insert.status, detail: insert.data }, 500)
    }

    // Return updated results
    const resp = await votesQuery(env,
      `votes?select=option&poll_id=eq.${encodeURIComponent(poll_id)}`
    )

    const counts = {}
    for (const row of resp.data || []) {
      counts[row.option] = (counts[row.option] || 0) + 1
    }

    return json({ ok: true, results: counts, total: (resp.data || []).length })
  } catch (err) {
    return json({ error: 'Could not save vote', message: err.message }, 500)
  }
}
