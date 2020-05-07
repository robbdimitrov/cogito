CREATE DATABASE thoughts;
\connect thoughts

-- Users

CREATE TABLE users (
  id serial PRIMARY KEY,
  name varchar(255) NOT NULL,
  username varchar(255) UNIQUE NOT NULL,
  email varchar(255) UNIQUE NOT NULL,
  password varchar(255) NOT NULL,
  avatar varchar(255) DEFAULT '',
  bio varchar(255) DEFAULT '',
  created timestamp NOT NULL DEFAULT now()
);

CREATE TABLE followings (
  user_id integer REFERENCES users ON DELETE CASCADE,
  follower_id integer REFERENCES users ON DELETE CASCADE,
  created timestamp NOT NULL DEFAULT now(),
  UNIQUE(user_id, follower_id)
);

-- Posts

CREATE TABLE posts (
  id serial PRIMARY KEY,
  user_id integer REFERENCES users ON DELETE CASCADE,
  content varchar(255) NOT NULL,
  created timestamp NOT NULL DEFAULT now()
);

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

-- Sessions

CREATE TABLE sessions (
  id varchar(255) PRIMARY KEY,
  user_id integer REFERENCES users ON DELETE CASCADE,
  created timestamp NOT NULL DEFAULT now()
);

-- Utils

CREATE OR REPLACE FUNCTION time_format(origin timestamp)
RETURNS text AS $$
BEGIN
  RETURN to_char(origin, 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
END;
$$  LANGUAGE plpgsql;
