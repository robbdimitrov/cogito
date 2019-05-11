CREATE SCHEMA IF NOT EXISTS thoughts;

CREATE TABLE IF NOT EXISTS thoughts.users (
  id serial PRIMARY KEY,
  username varchar(20) UNIQUE NOT NULL,
  email varchar(100) UNIQUE NOT NULL,
  name varchar(100) NOT NULL,
  password varchar(100) NOT NULL,
  bio varchar(250) DEFAULT '',
  date_created timestamp NOT NULL DEFAULT localtimestamp
);

CREATE TABLE IF NOT EXISTS thoughts.followings (
  id serial PRIMARY KEY,
  user_id integer REFERENCES thoughts.users(id) ON DELETE CASCADE,
  follower_id integer REFERENCES thoughts.users(id) ON DELETE CASCADE,
  date_created timestamp NOT NULL DEFAULT localtimestamp
);
