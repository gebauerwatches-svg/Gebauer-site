-- Votes/stories/polls seed from Supabase votes project
-- Generated 2026-06-21T14:55:24.837352

-- community_stories
INSERT OR IGNORE INTO community_stories (email, first_name, story, status, created_at) VALUES ('test@test.com', 'Test', 'Graduating middle school', 'approved', '2026-05-16T22:06:26.712996+00:00');
INSERT OR IGNORE INTO community_stories (email, first_name, story, status, created_at) VALUES ('liamgebauer@icloud.com', 'Liam', 'Chilling in Hawaii', 'approved', '2026-05-16T22:08:55.103585+00:00');
INSERT OR IGNORE INTO community_stories (email, first_name, story, status, created_at) VALUES ('samcedelstein@gmail.com', 'Samuel Edelstein', 'I like chicken but yk that', 'approved', '2026-05-28T05:29:10.209483+00:00');
INSERT OR IGNORE INTO community_stories (email, first_name, story, status, created_at) VALUES ('keagan1533@gmail.com', 'Krysten', 'Holding each of my children for the first time is a moment I would relive over and over again.', 'approved', '2026-06-20T14:32:06.799178+00:00');
INSERT OR IGNORE INTO community_stories (email, first_name, story, status, created_at) VALUES ('john.d.conley3@gmail.com', 'John Conley', 'The time I was flying an aircraft with my grandpa. It was just us two and in that moment, it felt like nothing else mattered.', 'approved', '2026-06-20T20:11:16.21464+00:00');
INSERT OR IGNORE INTO community_stories (email, first_name, story, status, created_at) VALUES ('scottomeara@comcast.net', 'Scott OMeara', 'The days my children were born.', 'approved', '2026-06-21T12:28:44.376807+00:00');
INSERT OR IGNORE INTO community_stories (email, first_name, story, status, created_at) VALUES ('flyboy3131@hotmail.com', 'Sam Stevens', 'The day I got my pilots license', 'approved', '2026-06-21T12:38:07.927649+00:00');

-- votes
INSERT INTO votes (poll_id, option, voter_id, created_at) VALUES ('test', 'test', 'localtest', '2026-05-03T01:00:45.348982+00:00');
INSERT INTO votes (poll_id, option, voter_id, created_at) VALUES ('wood', 'padauk', 'finaltest1', '2026-05-03T01:19:25.667394+00:00');
INSERT INTO votes (poll_id, option, voter_id, created_at) VALUES ('wood', 'ebony', '841javyekw', '2026-05-03T01:20:08.479376+00:00');
INSERT INTO votes (poll_id, option, voter_id, created_at) VALUES ('box-design', 'debossed', '841javyekw', '2026-05-03T15:40:14.15781+00:00');
INSERT INTO votes (poll_id, option, voter_id, created_at) VALUES ('interior-material', 'microfiber', '9uedth90r2i', '2026-05-05T13:46:52.813299+00:00');
INSERT INTO votes (poll_id, option, voter_id, created_at) VALUES ('wood', 'ebony', 'rg97njvqvna', '2026-05-05T22:04:54.439397+00:00');
INSERT INTO votes (poll_id, option, voter_id, created_at) VALUES ('interior-material', 'microfiber', 'rg97njvqvna', '2026-05-05T23:03:28.535745+00:00');
INSERT INTO votes (poll_id, option, voter_id, created_at) VALUES ('wood', 'ebony', 'pfeyn4kgs7m', '2026-05-09T17:11:15.43242+00:00');
INSERT INTO votes (poll_id, option, voter_id, created_at) VALUES ('wood', 'padauk', 'wph0murtumm', '2026-06-21T12:33:40.474957+00:00');
INSERT INTO votes (poll_id, option, voter_id, created_at) VALUES ('wood', 'padauk', 'jdc64ascyhd', '2026-06-21T12:46:03.396955+00:00');
INSERT INTO votes (poll_id, option, voter_id, created_at) VALUES ('wood', 'hinoki', '1qm94q60zbn', '2026-06-21T19:18:59.905829+00:00');

-- polls
INSERT OR IGNORE INTO polls (id, question, options, status, min_referrals, winner, created_at, closed_at) VALUES ('0fdeb604-9d77-4507-a340-dfed31cdd877', 'Which box exterior?', '["Matte Black with Debossed Logo", "Matte Black with Gold Logo"]', 'closed', 0, NULL, '2026-05-08T01:39:57.662814+00:00', '2026-05-08T22:05:36.32799+00:00');
INSERT OR IGNORE INTO polls (id, question, options, status, min_referrals, winner, created_at, closed_at) VALUES ('2e94fb9e-c34f-49db-a67d-f5ee3238ae11', 'Which box interior material?', '["Suede", "Microfiber"]', 'closed', 0, 'Suede', '2026-05-08T22:05:36.32799+00:00', '2026-05-11T23:40:45.164+00:00');
INSERT OR IGNORE INTO polls (id, question, options, status, min_referrals, winner, created_at, closed_at) VALUES ('f0cf14db-c4fc-49fe-be0b-92a6afe4aaea', 'Which box interior color?', '["Warm Cream", "Charcoal"]', 'closed', 0, NULL, '2026-05-11T23:40:45.342+00:00', '2026-05-15T15:44:34.855+00:00');
INSERT OR IGNORE INTO polls (id, question, options, status, min_referrals, winner, created_at, closed_at) VALUES ('0a2c4164-a165-4193-a7b6-2d25ea76b48b', 'Which crown design?', '["G", "Raven", "Plain"]', 'closed', 0, 'G', '2026-05-15T15:44:34.959+00:00', '2026-05-18T21:46:58.219+00:00');
INSERT OR IGNORE INTO polls (id, question, options, status, min_referrals, winner, created_at, closed_at) VALUES ('fadadd74-d37a-413c-b449-76e3f18a76c5', 'Clasp engraving?', '["Gebauer", "G", "Nothing"]', 'closed', 0, NULL, '2026-05-18T21:46:58.375+00:00', '2026-05-21T23:22:09.536+00:00');
INSERT OR IGNORE INTO polls (id, question, options, status, min_referrals, winner, created_at, closed_at) VALUES ('07c8cbdd-e7d5-4124-b64c-4494bc9d2dd2', 'Caseback raven style?', '["Minimal", "Detailed"]', 'closed', 0, NULL, '2026-05-21T23:22:09.75+00:00', '2026-05-25T22:21:22.055+00:00');
INSERT OR IGNORE INTO polls (id, question, options, status, min_referrals, winner, created_at, closed_at) VALUES ('e25e6807-bfe4-4dca-bd9e-31fc0343fa5f', 'Lume color?', '["Green", "Blue"]', 'closed', 0, 'Green', '2026-05-25T22:21:22.294+00:00', '2026-05-29T05:51:46.898+00:00');
INSERT OR IGNORE INTO polls (id, question, options, status, min_referrals, winner, created_at, closed_at) VALUES ('4662f4cd-2b1c-4e05-9523-983a632b7acb', 'Box pillow or flat?', '["Dome Pillow", "Flat"]', 'closed', 0, NULL, '2026-05-29T05:51:47.138+00:00', '2026-06-01T12:49:34.073+00:00');
INSERT OR IGNORE INTO polls (id, question, options, status, min_referrals, winner, created_at, closed_at) VALUES ('e1b1e4a7-f473-48cc-8b45-b93c6203a019', 'Packaging tissue color?', '["Black", "Cream"]', 'closed', 0, NULL, '2026-06-01T12:49:34.141+00:00', '2026-06-04T13:46:30.695+00:00');
INSERT OR IGNORE INTO polls (id, question, options, status, min_referrals, winner, created_at, closed_at) VALUES ('195787ee-1aa3-4185-bf84-618038219a0c', 'Launch month?', '["November", "December"]', 'closed', 0, 'December', '2026-06-04T13:46:30.814+00:00', '2026-06-08T02:35:44.544+00:00');
INSERT OR IGNORE INTO polls (id, question, options, status, min_referrals, winner, created_at, closed_at) VALUES ('54a798e5-1184-4220-a4f4-1a2bdf1373f2', 'Edition number format?', '["034/300", "#034"]', 'closed', 0, NULL, '2026-06-08T02:35:44.622+00:00', '2026-06-12T13:43:30.222+00:00');
INSERT OR IGNORE INTO polls (id, question, options, status, min_referrals, winner, created_at, closed_at) VALUES ('ca32f92f-b843-4c70-9843-9f3473b7109e', '2 hands or 3?', '["2 hands \u2014 cleaner, minimal, wood grain stands out", "3 hands \u2014 classic look with seconds hand"]', 'closed', 0, NULL, '2026-06-12T13:43:30.407+00:00', '2026-06-16T01:55:28.611+00:00');

-- poll_votes
INSERT INTO poll_votes (poll_id, choice, email, created_at) VALUES ('2e94fb9e-c34f-49db-a67d-f5ee3238ae11', 'Suede', 'loke.huppert@gmail.com', '2026-05-11T22:20:25.717043+00:00');
INSERT INTO poll_votes (poll_id, choice, email, created_at) VALUES ('0a2c4164-a165-4193-a7b6-2d25ea76b48b', 'G', 'liamgebauer@icloud.com', '2026-05-17T15:50:18.882446+00:00');
INSERT INTO poll_votes (poll_id, choice, email, created_at) VALUES ('e25e6807-bfe4-4dca-bd9e-31fc0343fa5f', 'Green', 'liamgebauer@icloud.com', '2026-05-25T22:22:40.803252+00:00');
INSERT INTO poll_votes (poll_id, choice, email, created_at) VALUES ('195787ee-1aa3-4185-bf84-618038219a0c', 'December', 'liamgebauer@icloud.com', '2026-06-06T00:00:59.45065+00:00');
