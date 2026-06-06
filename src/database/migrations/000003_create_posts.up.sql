CREATE TABLE posts (
  id serial PRIMARY KEY,
  user_id integer REFERENCES users ON DELETE CASCADE,
  content varchar(255) NOT NULL,
  hashtags varchar(50)[] DEFAULT '{}',
  media_key varchar(255) DEFAULT '',
  created timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX posts_user_id_created_idx ON posts (user_id, created DESC);
CREATE INDEX posts_hashtags_idx ON posts USING GIN (hashtags);

CREATE TABLE likes (
  post_id integer REFERENCES posts ON DELETE CASCADE,
  user_id integer REFERENCES users ON DELETE CASCADE,
  created timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX likes_user_id_idx ON likes (user_id);

CREATE TABLE reposts (
  post_id integer REFERENCES posts ON DELETE CASCADE,
  user_id integer REFERENCES users ON DELETE CASCADE,
  created timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX reposts_user_id_idx ON reposts (user_id);
