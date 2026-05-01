/**
 * POST /api/vote — cast a vote
 * GET /api/vote?poll=wood — get results for a poll
 */

import { json, supabaseQuery } from './_shared.js'

export async function onRequestGet(context) {
  const { env } = context
  const url = new URL(context.request.url)
  const poll = url.searchParams.get('poll')

  if (!poll) return json({ error: 'Missing poll parameter' }, 400)

  try {
    const resp = await supabaseQuery(env,
      `votes?select=option&poll_id=eq.${encodeURIComponent(poll)}`
    )

    if (!resp.data || !Array.isArray(resp.data)) {
      return json({ results: {}, total: 0 })
    }

    // Count votes per option
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

  // Use voter_id (from localStorage) to prevent double voting
  const voterId = voter_id || 'anonymous'

  try {
    // Check if already voted
    const existing = await supabaseQuery(env,
      `votes?poll_id=eq.${encodeURIComponent(poll_id)}&voter_id=eq.${encodeURIComponent(voterId)}&select=id`
    )

    if (existing.data && existing.data.length > 0) {
      return json({ error: 'Already voted', already_voted: true })
    }

    // Cast vote
    await supabaseQuery(env, 'votes', {
      method: 'POST',
      body: {
        poll_id: poll_id,
        option: option,
        voter_id: voterId,
      },
    })

    // Return updated results
    const resp = await supabaseQuery(env,
      `votes?select=option&poll_id=eq.${encodeURIComponent(poll_id)}`
    )

    const counts = {}
    for (const row of resp.data || []) {
      counts[row.option] = (counts[row.option] || 0) + 1
    }

    return json({ ok: true, results: counts, total: (resp.data || []).length })
  } catch (err) {
    return json({ error: 'Could not save vote' }, 500)
  }
}
