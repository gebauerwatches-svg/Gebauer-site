-- Gebauer Watches waitlist schema (Cloudflare D1)
-- Run via: wrangler d1 execute gebauer-waitlist --file=./schema/d1_waitlist_init.sql

CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by TEXT,
  referral_count INTEGER NOT NULL DEFAULT 0,
  waitlist_position INTEGER NOT NULL DEFAULT 9999,
  unsubscribe_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',  -- active | unsubscribed | bounced
  subscribed_at TEXT NOT NULL,
  unsubscribed_at TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_referral_code ON subscribers(referral_code);
CREATE INDEX IF NOT EXISTS idx_subscribers_referral_count ON subscribers(referral_count DESC);
CREATE INDEX IF NOT EXISTS idx_subscribers_unsubscribe_token ON subscribers(unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);

-- Broadcast log: every email sent, who it went to, when
CREATE TABLE IF NOT EXISTS broadcasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  sent_by TEXT
);

-- Per-recipient send log (for unsubscribe audit + send count per subscriber)
CREATE TABLE IF NOT EXISTS broadcast_sends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  broadcast_id INTEGER NOT NULL,
  subscriber_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',  -- sent | failed
  error TEXT,
  FOREIGN KEY (broadcast_id) REFERENCES broadcasts(id),
  FOREIGN KEY (subscriber_id) REFERENCES subscribers(id)
);

CREATE INDEX IF NOT EXISTS idx_sends_broadcast ON broadcast_sends(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_sends_subscriber ON broadcast_sends(subscriber_id);
