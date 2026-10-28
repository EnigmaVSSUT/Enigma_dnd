-- Initial data for local development, taken from the Bruno collection.
--
-- db-entrypoint.sh runs this file once (tracked in the _seed_history table) as
-- part of the database container startup. Fixed UUIDs + ON CONFLICT keep it
-- safe to re-run against a database that already holds the same rows.
--
-- Source values:
--   bruno/environments/Local.bru  -> credentials used by Sign In / Sign Up
--   bruno/Forms/*.bru examples    -> user/form/submission ids and content
--
-- Seeded login (development only, matches the Local environment):
--   email:    dev.dharmendra.m@gmail.com
--   password: DevAdmin#2026
-- Change or delete this user before using the database for anything real.

INSERT INTO "user" (
  "userId",
  "userName",
  "userAvtar",
  "userPassword",
  "userEmail",
  "userRegistrationNumber",
  "userRole"
)
VALUES (
  '3d1f0a2b-9c4e-4f5a-8b6d-7e8f9a0b1c2d',
  'admin',
  'https://example.com/avatars/jane-doe.png',
  '$2b$10$3F8f/XifpVpuigd6T3HiAOpcKOI.JNmMe88uaUq3aZdHGA0V1Ixre',
  'admin@example.com',
  '1234567890',
  'admin'
)
ON CONFLICT DO NOTHING;

INSERT INTO "Form" (
  "id",
  "userId",
  "createdAt",
  "published",
  "name",
  "description",
  "content",
  "visits",
  "submissions",
  "shareUrl"
)
VALUES (
  '8f14e45f-ce3a-4f6f-9d3a-1b7c2d4e5f60',
  '3d1f0a2b-9c4e-4f5a-8b6d-7e8f9a0b1c2d',
  '2026-10-26T09:15:32.481Z',
  true,
  'Employee Onboarding',
  'Collect new hire details before day one',
  '{"components":[{"id":"c1","type":"text","label":"Full name","required":true},{"id":"c2","type":"email","label":"Work email","required":true}]}',
  42,
  1,
  'b6f3a1c9-7d2e-4a8b-9c0d-1e2f3a4b5c6d'
)
ON CONFLICT DO NOTHING;

INSERT INTO "FormSubmissions" (
  "id",
  "createdAt",
  "formId",
  "content",
  "userId"
)
VALUES (
  'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  '2026-10-26T10:02:11.734Z',
  '8f14e45f-ce3a-4f6f-9d3a-1b7c2d4e5f60',
  '{"fullName":"Jane Doe","workEmail":"jane.doe@example.com","startDate":"2026-11-02"}'::jsonb,
  '3d1f0a2b-9c4e-4f5a-8b6d-7e8f9a0b1c2d'
)
ON CONFLICT DO NOTHING;