// Split out of App.jsx Nov 18 2026 so Story.jsx can use these without App.jsx
// exporting non-components, which breaks fast refresh.

// Fallback shown before /api/leaderboard answers, so the number never renders
// as a blank or a zero.
export const FALLBACK_WAITLIST_COUNT = 152

// Founder's age is COMPUTED, never hardcoded. The story keeps the founding
// moment in past tense ("when I was 14") so it never decays; this is the one
// present-tense fact on the page and it updates itself. Born May 2011; exact
// day unknown, so it ticks over on June 1 and never overstates his age.
const FOUNDER_BIRTH_YEAR = 2011
const FOUNDER_BIRTH_MONTH = 5 // May

export function founderAgeNow(now = new Date()) {
  const past = now.getMonth() + 1 > FOUNDER_BIRTH_MONTH
  return now.getFullYear() - FOUNDER_BIRTH_YEAR - (past ? 0 : 1)
}
