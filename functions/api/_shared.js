/**
 * Shared utilities for Cloudflare Pages Functions.
 * Import these in each function file.
 *
 * Cleanup history:
 *   June 21 2026: removed supabaseQuery, verifyToken, createVerificationToken,
 *   and redirect. The first three were tied to the old Supabase Project A
 *   (waitlist_signups) which the waitlist migration moved to D1. The votes
 *   endpoints have their own local query helpers and use SUPABASE_VOTES_URL.
 */

/** JSON response helper */
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...headers,
    },
  })
}

/** Generate a random hex string (Web Crypto, edge-safe). */
export function randomHex(bytes) {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}
