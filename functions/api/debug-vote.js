import { json } from './_shared.js'

export async function onRequestGet(context) {
  const { env } = context
  return json({
    has_votes_url: !!env.SUPABASE_VOTES_URL,
    has_votes_url_alt: !!env.VOTES_URL,
    has_votes_key: !!env.SUPABASE_VOTES_KEY,
    has_votes_key_alt: !!env.VOTES_KEY,
    has_main_url: !!env.SUPABASE_URL,
    has_main_key: !!env.SUPABASE_KEY,
    votes_url_start: (env.SUPABASE_VOTES_URL || env.VOTES_URL || 'missing').substring(0, 25),
    votes_key_start: (env.SUPABASE_VOTES_KEY || env.VOTES_KEY || 'missing').substring(0, 10),
  })
}
