CREATE TABLE hashtags (
  id serial PRIMARY KEY,
  name varchar(50) NOT NULL,
  CONSTRAINT hashtags_name_unique UNIQUE (name)
);

CREATE TABLE post_hashtags (
  post_id integer NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  hashtag_id integer NOT NULL REFERENCES hashtags (id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);

CREATE INDEX post_hashtags_hashtag_id_idx ON post_hashtags (hashtag_id);

CREATE TABLE outbox (
  id      bigserial PRIMARY KEY,
  topic   varchar(50) NOT NULL,
  payload jsonb NOT NULL,
  created timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX outbox_created_idx ON outbox (created);
