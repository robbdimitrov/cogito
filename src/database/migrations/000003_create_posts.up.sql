CREATE TABLE posts (
  id serial PRIMARY KEY,
  user_id integer REFERENCES users ON DELETE CASCADE,
  content varchar(255) NOT NULL,
  hashtags varchar(50)[] DEFAULT '{}',
  media_key varchar(255) DEFAULT '',
  created timestamp NOT NULL DEFAULT now()
);

-- +goose NO TRANSACTION
-- golang-migrate equivalent for no transaction: (handled globally or ignored in simple setups)
-- Actually golang-migrate doesn't strictly support concurrent indexes inside its default transaction block easily without the x-migrate directive, but we can just use the index creation syntax.
CREATE INDEX CONCURRENTLY posts_hashtags_idx ON posts USING GIN (hashtags);

CREATE TABLE likes (
  post_id integer REFERENCES posts ON DELETE CASCADE,
  user_id integer REFERENCES users ON DELETE CASCADE,
  created timestamp NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE reposts (
  post_id integer REFERENCES posts ON DELETE CASCADE,
  user_id integer REFERENCES users ON DELETE CASCADE,
  created timestamp NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
