CREATE SCHEMA IF NOT EXISTS thoughts;

CREATE TABLE IF NOT EXISTS thoughts.sessions (
  id serial PRIMARY KEY,
  user_id integer REFERENCES thoughts.users(id) ON DELETE CASCADE,
  user_agent varchar(250) NOT NULL,
  date_created timestamp NOT NULL DEFAULT localtimestamp
);
