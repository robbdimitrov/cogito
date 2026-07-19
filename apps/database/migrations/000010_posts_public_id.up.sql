CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- gen_random_uuid() is volatile, so Postgres rewrites the table to backfill
-- every existing row rather than a fast metadata-only default.
ALTER TABLE posts ADD COLUMN public_id uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX posts_public_id_idx ON posts(public_id);
