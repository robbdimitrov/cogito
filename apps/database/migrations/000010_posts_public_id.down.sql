DROP INDEX IF EXISTS posts_public_id_idx;
ALTER TABLE posts DROP COLUMN IF EXISTS public_id;
