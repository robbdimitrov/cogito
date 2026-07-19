CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE posts (
  id serial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id integer NOT NULL REFERENCES users ON DELETE CASCADE,
  content varchar(255),
  media_key varchar(255) DEFAULT '',
  in_reply_to_id integer REFERENCES posts(id) ON DELETE SET NULL,
  quote_of_id    integer REFERENCES posts(id) ON DELETE SET NULL,
  repost_of_id   integer REFERENCES posts(id) ON DELETE CASCADE,
  created timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT posts_content_not_empty CHECK (length(trim(content)) > 0),
  CONSTRAINT posts_repost_exclusive CHECK (
    repost_of_id IS NULL OR
    (content IS NULL AND quote_of_id IS NULL AND in_reply_to_id IS NULL)
  ),
  CONSTRAINT posts_repost_unique UNIQUE (user_id, repost_of_id)
);

CREATE UNIQUE INDEX posts_public_id_idx ON posts (public_id);
CREATE INDEX posts_user_id_created_idx ON posts (user_id, created DESC);
CREATE INDEX posts_in_reply_to_id_idx ON posts (in_reply_to_id)
  WHERE in_reply_to_id IS NOT NULL;
CREATE INDEX posts_quote_of_id_idx ON posts (quote_of_id)
  WHERE quote_of_id IS NOT NULL;
CREATE INDEX posts_repost_of_id_idx ON posts (repost_of_id)
  WHERE repost_of_id IS NOT NULL;
CREATE INDEX posts_created_idx ON posts (created DESC)
  WHERE in_reply_to_id IS NULL;

CREATE TABLE likes (
  post_id integer NOT NULL REFERENCES posts ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users ON DELETE CASCADE,
  created timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX likes_post_id_idx ON likes (post_id);
CREATE INDEX likes_user_id_idx ON likes (user_id);
