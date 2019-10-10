CREATE DATABASE thoughts;

-- Users

CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  username varchar(20) UNIQUE NOT NULL,
  email varchar(100) UNIQUE NOT NULL,
  name varchar(100) NOT NULL,
  password varchar(100) NOT NULL,
  bio varchar(250) DEFAULT '',
  avatar varchar(100) DEFAULT '',
  date_created timestamp NOT NULL DEFAULT localtimestamp
);

CREATE TABLE IF NOT EXISTS followings (
  id serial PRIMARY KEY,
  user_id integer REFERENCES users(id) ON DELETE CASCADE,
  follower_id integer REFERENCES users(id) ON DELETE CASCADE,
  date_created timestamp NOT NULL DEFAULT localtimestamp
);

-- Posts

CREATE TABLE IF NOT EXISTS posts (
  id serial PRIMARY KEY,
  content varchar(250) NOT NULL,
  user_id integer REFERENCES users(id) ON DELETE CASCADE,
  date_created timestamp NOT NULL DEFAULT localtimestamp
);

CREATE TABLE IF NOT EXISTS likes (
  id serial PRIMARY KEY,
  post_id integer REFERENCES posts(id) ON DELETE CASCADE,
  user_id integer REFERENCES users(id) ON DELETE CASCADE,
  date_created timestamp NOT NULL DEFAULT localtimestamp
);

CREATE TABLE IF NOT EXISTS retweets (
  id serial PRIMARY KEY,
  post_id integer REFERENCES posts(id) ON DELETE CASCADE,
  user_id integer REFERENCES users(id) ON DELETE CASCADE,
  date_created timestamp NOT NULL DEFAULT localtimestamp
);

-- Sessions

CREATE TABLE IF NOT EXISTS sessions (
  id serial PRIMARY KEY,
  user_id integer REFERENCES users(id) ON DELETE CASCADE,
  user_agent varchar(250) NOT NULL,
  date_created timestamp NOT NULL DEFAULT localtimestamp
);

-- Utils

CREATE OR REPLACE FUNCTION time_format(origin timestamp)
RETURNS text AS $$
BEGIN
  RETURN to_char(origin, 'DD-MM-YYYY"T"HH24:MI:SS');
END;
$$  LANGUAGE plpgsql;
