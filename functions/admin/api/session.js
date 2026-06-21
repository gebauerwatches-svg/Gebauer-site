/**
 * GET /admin/api/session - is current cookie a valid session?
 * Used by the admin UI on load to decide login vs dashboard.
 */

import { json } from '../../api/_shared.js'
import { isAuthenticated } from '../_auth.js'

export async function onRequestGet(context) {
  const ok = await isAuthenticated(context)
  return json({ authenticated: ok })
}
