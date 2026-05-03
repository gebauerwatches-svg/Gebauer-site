import { json } from './_shared.js'

export async function onRequestGet(context) {
  const { env } = context
  return json({
    has_votes_url: !!env.SUPABASE_VOTES_URL,
    has_votes_key: !!env.SUPABASE_VOTES_KEY,
    has_main_url: !!env.SUPABASE_URL,
    has_main_key: !!env.SUPABASE_KEY,
    votes_url_start: env.SUPABASE_VOTES_URL ? env.SUPABASE_VOTES_URL.substring(0, 20) + '...' : 'missing',
    votes_key_start: env.SUPABASE_VOTES_KEY ? env.SUPABASE_VOTES_KEY.substring(0, 10) + '...' : 'missing',
  })
}
