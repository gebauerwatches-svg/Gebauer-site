-- Gebauer votes/stories/polls schema (Cloudflare D1)
-- Run via: wrangler d1 execute gebauer-waitlist --remote --file=./schema/d1_votes_init.sql
-- Added June 21 2026 as Phase 4 of the migration away from Supabase.
-- Lives in the same D1 database as the waitlist (gebauer-waitlist) to keep
-- everything in one place.

-- Simple votes table (covers wood vote + any future single-choice polls)
CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id TEXT NOT NULL,        -- e.g. 'wood' for the wood preference vote
  option TEXT NOT NULL,         -- e.g. 'padauk', 'ebony', 'hinoki'
  voter_id TEXT NOT NULL,       -- browser-generated stable id (anti-double-vote)
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_votes_poll ON votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(poll_id, voter_id);

-- Community milestone stories (was in milestone_stories table on the votes Supabase)
CREATE TABLE IF NOT EXISTS community_stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  story TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved',  -- approved | rejected | flagged | pending
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stories_email ON community_stories(email);
CREATE INDEX IF NOT EXISTS idx_stories_status_created ON community_stories(status, created_at DESC);

-- Rotating polls (multi-choice questions with vote tracking)
CREATE TABLE IF NOT EXISTS polls (
  id TEXT PRIMARY KEY,          -- UUID or short slug
  question TEXT NOT NULL,
  options TEXT NOT NULL,        -- JSON array of option strings
  status TEXT NOT NULL DEFAULT 'active',  -- active | closed
  min_referrals INTEGER NOT NULL DEFAULT 0,
  winner TEXT,
  created_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_polls_status_created ON polls(status, created_at DESC);

-- Per-poll vote tracking (separate from the simple wood vote)
CREATE TABLE IF NOT EXISTS poll_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id TEXT NOT NULL,
  choice TEXT NOT NULL,
  email TEXT,                   -- nullable: anonymous voters allowed
  created_at TEXT NOT NULL,
  FOREIGN KEY (poll_id) REFERENCES polls(id)
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_email ON poll_votes(poll_id, email);
