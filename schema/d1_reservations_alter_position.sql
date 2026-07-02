-- Add preferred_position column so cold visitors on /reserve can
-- optionally pick a specific watch number they want. Liam still
-- personally confirms and assigns; this is just a signal about what
-- number the reserver had in mind.

ALTER TABLE reservation_interest ADD COLUMN preferred_position INTEGER;
