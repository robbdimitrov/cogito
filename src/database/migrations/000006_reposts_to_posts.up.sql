ALTER TABLE posts
  ADD COLUMN repost_of_id integer REFERENCES posts(id) ON DELETE CASCADE;

ALTER TABLE posts
  ALTER COLUMN content DROP NOT NULL;

ALTER TABLE posts
  ADD CONSTRAINT posts_repost_exclusive CHECK (
    repost_of_id IS NULL OR
    (content IS NULL AND quote_of_id IS NULL AND in_reply_to_id IS NULL)
  );

ALTER TABLE posts
  ADD CONSTRAINT posts_repost_unique UNIQUE (user_id, repost_of_id);

CREATE INDEX posts_repost_of_id_idx ON posts (repost_of_id)
  WHERE repost_of_id IS NOT NULL;

DROP TABLE reposts;
