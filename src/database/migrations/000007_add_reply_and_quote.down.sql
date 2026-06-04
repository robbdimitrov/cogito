DROP INDEX IF EXISTS posts_in_reply_to_id_idx;

ALTER TABLE posts
    DROP COLUMN IF EXISTS quote_of_id,
    DROP COLUMN IF EXISTS in_reply_to_id;
