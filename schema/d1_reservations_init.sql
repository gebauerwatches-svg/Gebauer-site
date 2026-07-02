-- Reservation interest queue.
-- Separate from subscribers table so it's a REVIEW queue: cold prospects
-- submit interest, Liam personally follows up, and only THEN are they
-- moved into subscribers with a watch number assigned.
-- Preserves the intentional-number-assignment rule
-- (see feedback_number_reservation_policy memory).

CREATE TABLE IF NOT EXISTS reservation_interest (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  wood_preference TEXT NOT NULL,  -- 'hinoki' | 'ebony' | 'padauk' | 'unsure'
  why_message TEXT,                -- their answer to "why do you want this watch"
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'contacted' | 'converted' | 'declined'
  submitted_at TEXT NOT NULL,
  reviewed_at TEXT,
  notes TEXT,
  subscriber_id INTEGER  -- links to subscribers row when converted
);

CREATE INDEX IF NOT EXISTS idx_reservation_status ON reservation_interest(status);
CREATE INDEX IF NOT EXISTS idx_reservation_submitted ON reservation_interest(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_reservation_email ON reservation_interest(email);
