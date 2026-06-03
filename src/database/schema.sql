CREATE DATABASE thoughts;
\connect thoughts

-- Users

CREATE TABLE users (
  id serial PRIMARY KEY,
  name varchar(255) NOT NULL,
  username varchar(255) UNIQUE NOT NULL,
  email varchar(255) UNIQUE NOT NULL,
  password varchar(255) NOT NULL,
  bio varchar(255) DEFAULT '',
  profile_photo_key varchar(255) DEFAULT '',
  cover_photo_key varchar(255) DEFAULT '',
  created timestamp NOT NULL DEFAULT now()
);

CREATE TABLE followers (
  user_id integer REFERENCES users ON DELETE CASCADE,
  follower_id integer REFERENCES users ON DELETE CASCADE,
  created timestamp NOT NULL DEFAULT now(),
  CHECK (user_id <> follower_id),
  UNIQUE(user_id, follower_id)
);

-- Uploads Staging

CREATE TABLE uploads (
  filename varchar(255) PRIMARY KEY,
  user_id integer REFERENCES users ON DELETE CASCADE,
  created timestamp NOT NULL DEFAULT now()
);

-- Sessions

CREATE TABLE sessions (
  id varchar(255) PRIMARY KEY,
  user_id integer REFERENCES users ON DELETE CASCADE,
  created timestamp NOT NULL DEFAULT now()
);

-- Posts

CREATE TABLE posts (
  id serial PRIMARY KEY,
  user_id integer REFERENCES users ON DELETE CASCADE,
  content varchar(255) NOT NULL,
  hashtags varchar(50)[] DEFAULT '{}',
  media_key varchar(255) DEFAULT '',
  created timestamp NOT NULL DEFAULT now()
);

CREATE INDEX posts_hashtags_idx ON posts USING GIN (hashtags);

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

-- Rate Limits

CREATE TABLE rate_limits (
  id varchar(255) PRIMARY KEY,
  tokens integer NOT NULL,
  last_updated timestamp NOT NULL DEFAULT now()
);

-- Utils

CREATE OR REPLACE FUNCTION time_format(origin timestamp)
RETURNS text AS $$
BEGIN
  RETURN to_char(origin, 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
END;
$$  LANGUAGE plpgsql;
