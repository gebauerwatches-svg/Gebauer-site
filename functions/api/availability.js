/**
 * GET /api/availability
 *
 * Public endpoint. Returns which watch numbers are reserved per wood
 * variant so cold visitors on /reserve can see availability and pick
 * a specific number.
 *
 * Response returns NO customer PII. Only integer position numbers per
 * wood. Response is safe to expose publicly.
 *
 *   {
 *     cherry: [reserved positions 1-100],   // hard reserved by subscribers
 *     ebony:  [...],
 *     padauk: [...],
 *     pending: { cherry: [...], ebony: [...], padauk: [...] },
 *     strategic_hold: { cherry: [1..10], ebony: [1..10], padauk: [1..10] }
 *   }
 *
 * Pending: preferred_position values from active reservation_interest
 * rows. Someone else requested them, Liam hasn't confirmed yet.
 *
 * Strategic hold: numbers 1-10 of each wood are held for Liam, family,
 * press, and key supporters. Not available to cold visitors even though
 * no subscriber row exists for them yet. See memory feedback_number
 * _reservation_policy: "#1-10 are strategically reserved."
 */

import { json } from './_shared.js'


const STRATEGIC_HOLD_MAX = 10  // numbers 1..N per wood are held internally


// Units per variant. CONFIRMED with the factory Sep 24 2026
// (facts.EDITION_SPLIT_CONFIRMED_WITH_FACTORY). Cherry is a one-time edition of
// 250 tied to the American 250th; ebony is 50 and continues past this run.
//
// This replaced a hardcoded 100-per-wood assumption that survived the padauk
// cut. Under the old numbers the grid offered ebony up to #100 when only 50
// ebony watches exist, so half the ebony grid was numbers that could never be
// delivered. Read units from here, never from a literal.
const VARIANT_UNITS = { cherry: 250, ebony: 50 }


// Numbers held for a NAMED person who has not decided yet, beyond the blanket
// 1..STRATEGIC_HOLD_MAX. These render as unavailable, same as a confirmed
// reservation, because they are promised to someone.
//
// Why this exists: subscribers.waitlist_position is ONE integer, so a person
// cannot hold two numbers at once. Scott OMeara was moved off the cut padauk
// to cherry #16 and told in writing that BOTH cherry #16 and ebony #16 are his
// until he chooses. Cherry #16 is his real subscriber row; ebony #16 has no row
// to live in, so it is held here.
//
// REMOVE the ebony entry the moment Scott picks. Holding 16 of only 50 ebony
// indefinitely is real inventory sitting idle.
const NAMED_HOLDS = {
  cherry: [2],      // Liam's grandmother, pending her choice. Set Oct 5 2026.
  ebony: [2, 16],   // 2: Liam's grandmother. 16: Scott OMeara. Both pending.
}

// Note on #2: numbers 1-10 are already inside STRATEGIC_HOLD_MAX, so listing it
// here does not change what a visitor can book. It is recorded anyway because
// the blanket hold says "held" and says nothing about WHO for. That gap is
// exactly how padauk #16 came to be attributed to the wrong Scott. A hold with
// a name on it survives a handover; an anonymous one does not.


// 'hinoki' is a LEGACY value. Hinoki was the pale variant until Aug 2026, when
// it turned out to be unsourceable and was replaced by cherry. Rows written
// before then still say hinoki in notes / wood_preference, so every read path
// maps it onto cherry. Do not delete this without migrating the D1 data first,
// or those reservations silently stop resolving to a variant.
function detectWood(text) {
  if (!text) return null
  const t = text.toLowerCase()
  if (t.includes('cherry') || t.includes('hinoki')) return 'cherry'
  if (t.includes('ebony')) return 'ebony'
  if (t.includes('padauk')) return 'padauk'
  return null
}


// Used ONLY when a subscriber row names no wood in its notes. It used to read
// the wood off the number range (1-100 cherry, 101-200 ebony, 201-300 padauk).
// That scheme is dead: padauk was cut Sep 24 2026 and the split is 250/50, so
// a bare number can no longer identify a variant. Cherry is 250 of the 300, so
// an unlabelled row is overwhelmingly likely to be cherry and that is the least
// damaging guess. Anything past the cherry run is unresolvable, so return null
// and let the caller drop it rather than invent a variant for it.
function fallbackWood(pos) {
  return pos >= 1 && pos <= VARIANT_UNITS.cherry ? 'cherry' : null
}


// Numbers are stored per-variant: Meg is ebony #12 at waitlist_position 12, not
// 112. The 101-200 branch below is legacy defence for any row written under the
// old offset scheme before Sep 24 2026.
function positionWithinVariant(pos, wood) {
  if (wood === 'ebony' && pos > 100 && pos <= 200) return pos - 100
  return pos
}


export async function onRequestGet(context) {
  const { env } = context
  if (!env.DB) return json({ cherry: [], ebony: [], padauk: [], pending: { cherry: [], ebony: [], padauk: [] } })

  try {
    // Reserved: subscribers with an assigned waitlist_position
    const assigned = await env.DB.prepare(
      `SELECT waitlist_position, notes
       FROM subscribers
       WHERE waitlist_position IS NOT NULL
         AND waitlist_position != 9999
         AND waitlist_position >= 1
         AND waitlist_position <= 300
         AND status = 'active'`
    ).all()

    const reserved = { cherry: [], ebony: [], padauk: [] }
    for (const r of (assigned.results || [])) {
      const wood = detectWood(r.notes) || fallbackWood(r.waitlist_position)
      if (!wood) continue  // unresolvable row, see fallbackWood
      const pos = positionWithinVariant(r.waitlist_position, wood)
      // Bound per variant, not a flat 100: ebony stops at 50.
      const max = VARIANT_UNITS[wood]
      if (max && pos >= 1 && pos <= max) reserved[wood].push(pos)
    }

    // Pending: reservation_interest rows with a preferred_position specified
    const pending = { cherry: [], ebony: [], padauk: [] }
    try {
      const pendingRows = await env.DB.prepare(
        `SELECT preferred_position, wood_preference
         FROM reservation_interest
         WHERE status = 'pending' AND preferred_position IS NOT NULL`
      ).all()
      for (const p of (pendingRows.results || [])) {
        const w = p.wood_preference === 'hinoki' ? 'cherry' : p.wood_preference  // legacy, see detectWood
        const max = VARIANT_UNITS[w]
        if (max && p.preferred_position >= 1 && p.preferred_position <= max) {
          pending[w].push(p.preferred_position)
        }
      }
    } catch (e) {
      // Column may not exist yet — swallow so the endpoint still works
    }

    // Strategic hold: numbers 1..STRATEGIC_HOLD_MAX for each wood.
    // NOTE: 10 held out of 50 ebony is 20% of that variant, against 4% of
    // cherry. Left as-is because the hold policy is Liam's call, but it is a
    // much bigger bite now that ebony is 50 rather than 100.
    const holdRange = []
    for (let i = 1; i <= STRATEGIC_HOLD_MAX; i++) holdRange.push(i)
    const strategic_hold = {
      cherry: [...new Set([...holdRange, ...(NAMED_HOLDS.cherry || [])])],
      ebony: [...new Set([...holdRange, ...(NAMED_HOLDS.ebony || [])])],
    }

    return json({ ...reserved, pending, strategic_hold, units: VARIANT_UNITS })
  } catch (err) {
    console.error('availability GET:', err.message)
    return json({ error: 'Could not load availability' }, 500)
  }
}
