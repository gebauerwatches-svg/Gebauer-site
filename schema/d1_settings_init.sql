-- Settings key/value store for admin-editable strings
-- (welcome email template, future single-value config)

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Seed default welcome email
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
  ('welcome_enabled', 'true', '2026-06-21T00:00:00Z'),
  ('welcome_subject', 'You''re in.', '2026-06-21T00:00:00Z'),
  ('welcome_body',
   'Hey {{first_name}},

Thanks for signing up. You''re one of the first to know about Gebauer Watches.

A quick rundown of what''s ahead.

Samples arrive this summer. Kickstarter launches this fall. Watches ship early 2027. You''ll hear from me when each happens.

If you want the daily, I write a short journal entry most days on Substack: https://gebauerwatches.substack.com

Glad you''re here.

Rock on.

Liam',
   '2026-06-21T00:00:00Z');
