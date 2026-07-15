CREATE TABLE users (
  id serial PRIMARY KEY,
  name varchar(255) NOT NULL,
  username varchar(30) UNIQUE NOT NULL,
  email varchar(255) UNIQUE NOT NULL,
  password varchar(255) NOT NULL,
  bio varchar(255) DEFAULT '',
  profile_photo_key varchar(255) DEFAULT '',
  cover_photo_key varchar(255) DEFAULT '',
  fan_out_disabled boolean NOT NULL DEFAULT false,
  created timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE followers (
  user_id integer NOT NULL REFERENCES users ON DELETE CASCADE,
  follower_id integer NOT NULL REFERENCES users ON DELETE CASCADE,
  created timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id <> follower_id),
  UNIQUE(user_id, follower_id)
);

CREATE INDEX followers_follower_id_idx ON followers (follower_id);
