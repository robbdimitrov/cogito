DROP TABLE IF EXISTS likes;

CREATE TABLE reposts (
  post_id integer REFERENCES posts ON DELETE CASCADE,
  user_id integer REFERENCES users ON DELETE CASCADE,
  created timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX reposts_user_id_idx ON reposts (user_id);

ALTER TABLE posts
  DROP CONSTRAINT posts_repost_unique;

ALTER TABLE posts
  DROP CONSTRAINT posts_repost_exclusive;

DROP INDEX posts_repost_of_id_idx;

DELETE FROM posts WHERE content IS NULL;

ALTER TABLE posts
  DROP COLUMN repost_of_id;

ALTER TABLE posts
  ALTER COLUMN content SET NOT NULL;

DROP INDEX IF EXISTS posts_hashtags_idx;
DROP TABLE IF EXISTS posts;
