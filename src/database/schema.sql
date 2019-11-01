CREATE DATABASE thoughts;

-- Users

CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  username varchar(255) UNIQUE NOT NULL,
  email varchar(255) UNIQUE NOT NULL,
  name varchar(255) NOT NULL,
  password varchar(255) NOT NULL,
  bio varchar(255) DEFAULT '',
  avatar varchar(255) DEFAULT '',
  date_created timestamp NOT NULL DEFAULT localtimestamp
);

CREATE TABLE IF NOT EXISTS followings (
  user_id integer REFERENCES users ON DELETE CASCADE,
  follower_id integer REFERENCES users ON DELETE CASCADE,
  date_created timestamp NOT NULL DEFAULT localtimestamp,
  UNIQUE(user_id, follower_id)
);

-- Posts

CREATE TABLE IF NOT EXISTS posts (
  id serial PRIMARY KEY,
  content varchar(255) NOT NULL,
  user_id integer REFERENCES users ON DELETE CASCADE,
  date_created timestamp NOT NULL DEFAULT localtimestamp
);

CREATE TABLE IF NOT EXISTS likes (
  post_id integer REFERENCES posts ON DELETE CASCADE,
  user_id integer REFERENCES users ON DELETE CASCADE,
  date_created timestamp NOT NULL DEFAULT localtimestamp,
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS retweets (
  post_id integer REFERENCES posts ON DELETE CASCADE,
  user_id integer REFERENCES users ON DELETE CASCADE,
  date_created timestamp NOT NULL DEFAULT localtimestamp,
  UNIQUE(post_id, user_id)
);

-- Sessions

CREATE TABLE IF NOT EXISTS sessions (
  id serial PRIMARY KEY,
  user_id integer REFERENCES users ON DELETE CASCADE,
  user_agent varchar(255) NOT NULL,
  date_created timestamp NOT NULL DEFAULT localtimestamp
);

-- Utils

CREATE OR REPLACE FUNCTION time_format(origin timestamp)
RETURNS text AS $$
BEGIN
  RETURN to_char(origin, 'DD-MM-YYYY"T"HH24:MI:SS');
END;
$$  LANGUAGE plpgsql;
