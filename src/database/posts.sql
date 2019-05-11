CREATE SCHEMA IF NOT EXISTS thoughts;

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
