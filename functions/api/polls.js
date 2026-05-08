/**
 * GET /api/polls — get active poll + latest closed result
 * POST /api/polls — vote on active poll (requires email)
 *
 * Uses SUPABASE_VOTES_URL/VOTES_URL for the votes Supabase project
 */

import { json } from './_shared.js'

function getVotesUrl(env) {
  return env.SUPABASE_VOTES_URL || env.VOTES_URL || env.SUPABASE_URL
}

function getVotesKey(env) {
  return env.SUPABASE_VOTES_KEY || env.VOTES_KEY || env.SUPABASE_KEY
}

async function pollsQuery(env, path, options = {}) {
  const url = getVotesUrl(env)
  const key = getVotesKey(env)

  const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
  }

  if (options.method === 'POST' || options.method === 'PATCH') {
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

  try {
    // Auto-rotate: if active poll is older than 3 days, close it and activate next queued
    const active = await pollsQuery(env,
      'polls?status=eq.active&order=created_at.desc&limit=1'
    )

    if (active.data && active.data.length > 0) {
      const poll = active.data[0]
      const ageMs = Date.now() - new Date(poll.created_at).getTime()
      const threeDays = 3 * 24 * 60 * 60 * 1000

      if (ageMs > threeDays) {
        // Find the winner
        const votes = await pollsQuery(env,
          `poll_votes?poll_id=eq.${poll.id}&select=choice`
        )
        const counts = {}
        for (const row of votes.data || []) {
          counts[row.choice] = (counts[row.choice] || 0) + 1
        }
        const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

        // Close the active poll
        await pollsQuery(env, `polls?id=eq.${poll.id}`, {
          method: 'PATCH',
          body: { status: 'closed', closed_at: new Date().toISOString(), winner },
        })

        // Activate the next queued poll
        const nextQueued = await pollsQuery(env,
          'polls?status=eq.queued&order=created_at.asc&limit=1'
        )
        if (nextQueued.data && nextQueued.data.length > 0) {
          await pollsQuery(env, `polls?id=eq.${nextQueued.data[0].id}`, {
            method: 'PATCH',
            body: { status: 'active', created_at: new Date().toISOString() },
          })
        }
      }
    } else {
      // No active poll — activate the next queued one
      const nextQueued = await pollsQuery(env,
        'polls?status=eq.queued&order=created_at.asc&limit=1'
      )
      if (nextQueued.data && nextQueued.data.length > 0) {
        await pollsQuery(env, `polls?id=eq.${nextQueued.data[0].id}`, {
          method: 'PATCH',
          body: { status: 'active', created_at: new Date().toISOString() },
        })
      }
    }

    // Now fetch the (possibly new) active poll
    const currentActive = await pollsQuery(env,
      'polls?status=eq.active&order=created_at.desc&limit=1'
    )

    // Get latest closed poll (for results display)
    const closed = await pollsQuery(env,
      'polls?status=eq.closed&order=closed_at.desc&limit=1'
    )

    let activePoll = null
    let lastResult = null

    if (currentActive.data && currentActive.data.length > 0) {
      activePoll = currentActive.data[0]
      // Get vote counts for active poll
      const votes = await pollsQuery(env,
        `poll_votes?poll_id=eq.${activePoll.id}&select=choice`
      )
      const counts = {}
      for (const row of votes.data || []) {
        counts[row.choice] = (counts[row.choice] || 0) + 1
      }
      activePoll.votes = counts
      activePoll.total = (votes.data || []).length
    }

    if (closed.data && closed.data.length > 0) {
      lastResult = closed.data[0]
      // Get vote counts for closed poll
      const votes = await pollsQuery(env,
        `poll_votes?poll_id=eq.${lastResult.id}&select=choice`
      )
      const counts = {}
      for (const row of votes.data || []) {
        counts[row.choice] = (counts[row.choice] || 0) + 1
      }
      lastResult.votes = counts
      lastResult.total = (votes.data || []).length
    }

    return json({ active: activePoll, lastResult })
  } catch (err) {
    return json({ error: 'Could not fetch polls', message: err.message }, 500)
  }
}

export async function onRequestPost(context) {
  const { env } = context

  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid request' }, 400) }

  const { poll_id, choice, email } = body || {}

  if (!poll_id || !choice || !email) {
    return json({ error: 'Missing poll_id, choice, or email' }, 400)
  }

  try {
    // Check poll is still active
    const poll = await pollsQuery(env, `polls?id=eq.${poll_id}&select=status`)
    if (!poll.data || poll.data.length === 0 || poll.data[0].status !== 'active') {
      return json({ error: 'Poll is closed' }, 400)
    }

    // Check if already voted
    const existing = await pollsQuery(env,
      `poll_votes?poll_id=eq.${encodeURIComponent(poll_id)}&voter_email=eq.${encodeURIComponent(email)}&select=id`
    )

    if (existing.data && existing.data.length > 0) {
      return json({ error: 'Already voted', already_voted: true })
    }

    // Cast vote
    const insert = await pollsQuery(env, 'poll_votes', {
      method: 'POST',
      body: { poll_id, choice, voter_email: email },
    })

    if (insert.status >= 400) {
      return json({ error: 'Vote failed', detail: insert.data }, 500)
    }

    // Return updated counts
    const votes = await pollsQuery(env,
      `poll_votes?poll_id=eq.${encodeURIComponent(poll_id)}&select=choice`
    )
    const counts = {}
    for (const row of votes.data || []) {
      counts[row.choice] = (counts[row.choice] || 0) + 1
    }

    return json({ ok: true, votes: counts, total: (votes.data || []).length })
  } catch (err) {
    return json({ error: 'Could not save vote', message: err.message }, 500)
  }
}
