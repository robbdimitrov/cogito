CREATE SCHEMA IF NOT EXISTS thoughts;

-- Users

CREATE TABLE IF NOT EXISTS thoughts.users (
  id serial PRIMARY KEY,
  username varchar(20) UNIQUE NOT NULL,
  email varchar(100) UNIQUE NOT NULL,
  name varchar(100) NOT NULL,
  password varchar(100) NOT NULL,
  bio varchar(250) DEFAULT '',
  avatar varchar(100) DEFAULT '',
  date_created timestamp NOT NULL DEFAULT localtimestamp
);

CREATE TABLE IF NOT EXISTS thoughts.followings (
  id serial PRIMARY KEY,
  user_id integer REFERENCES thoughts.users(id) ON DELETE CASCADE,
  follower_id integer REFERENCES thoughts.users(id) ON DELETE CASCADE,
  date_created timestamp NOT NULL DEFAULT localtimestamp
);

-- Posts

CREATE TABLE IF NOT EXISTS thoughts.posts (
  id serial PRIMARY KEY,
  content varchar(250) NOT NULL,
  user_id integer REFERENCES thoughts.users(id) ON DELETE CASCADE,
  date_created timestamp NOT NULL DEFAULT localtimestamp
);

CREATE TABLE IF NOT EXISTS thoughts.likes (
  id serial PRIMARY KEY,
  post_id integer REFERENCES thoughts.posts(id) ON DELETE CASCADE,
  user_id integer REFERENCES thoughts.users(id) ON DELETE CASCADE,
  date_created timestamp NOT NULL DEFAULT localtimestamp
);

CREATE TABLE IF NOT EXISTS thoughts.retweets (
  id serial PRIMARY KEY,
  post_id integer REFERENCES thoughts.posts(id) ON DELETE CASCADE,
  user_id integer REFERENCES thoughts.users(id) ON DELETE CASCADE,
  date_created timestamp NOT NULL DEFAULT localtimestamp
);

-- Sessions

CREATE TABLE IF NOT EXISTS thoughts.sessions (
  id serial PRIMARY KEY,
  user_id integer REFERENCES thoughts.users(id) ON DELETE CASCADE,
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
