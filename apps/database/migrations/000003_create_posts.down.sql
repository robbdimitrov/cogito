DROP INDEX IF EXISTS likes_user_id_idx;
DROP INDEX IF EXISTS likes_post_id_idx;
DROP TABLE IF EXISTS likes;

DROP INDEX IF EXISTS posts_created_idx;
DROP INDEX IF EXISTS posts_repost_of_id_idx;
DROP INDEX IF EXISTS posts_quote_of_id_idx;
DROP INDEX IF EXISTS posts_in_reply_to_id_idx;
DROP INDEX IF EXISTS posts_user_id_created_idx;
DROP INDEX IF EXISTS posts_public_id_idx;
DROP TABLE IF EXISTS posts;
