CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE hashtags (
  id serial PRIMARY KEY,
  name varchar(50) NOT NULL,
  CONSTRAINT hashtags_name_unique UNIQUE (name)
);

CREATE INDEX hashtags_name_trgm_idx ON hashtags USING GIN (name gin_trgm_ops);

CREATE TABLE post_hashtags (
  post_id integer NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  hashtag_id integer NOT NULL REFERENCES hashtags (id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);

CREATE INDEX post_hashtags_hashtag_id_idx ON post_hashtags (hashtag_id);

CREATE TABLE search_outbox (
  id bigserial PRIMARY KEY,
  entity_type varchar(20) NOT NULL,
  entity_id text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX search_outbox_created_idx ON search_outbox (created_at);
