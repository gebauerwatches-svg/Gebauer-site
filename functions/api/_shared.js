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

// CAN-SPAM requires a physical postal address in every commercial email.
// This is hardcoded rather than read from config because it is not a secret,
// it is printed in every email we send, and it changes roughly never. It was
// an env var, which meant a missing value silently disabled welcome emails and
// blocked broadcasts entirely. A legally required constant should not be able
// to go missing. GEBAUER_MAILING_ADDRESS still overrides it if ever set.
export const MAILING_ADDRESS = 'Gebauer Watches, c/o RCEDP, P.O. Box 774408, Steamboat Springs, CO 80477'
export function mailingAddress(env) {
  return (env && env.GEBAUER_MAILING_ADDRESS) || MAILING_ADDRESS
}
