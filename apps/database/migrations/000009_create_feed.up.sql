CREATE TABLE feed (
  user_id   integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id   integer NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created   timestamptz NOT NULL,
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX feed_user_id_created_idx ON feed(user_id, created DESC, post_id DESC);
