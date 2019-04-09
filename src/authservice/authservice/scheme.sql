CREATE SCHEMA IF NOT EXISTS thoughts;

CREATE TABLE IF NOT EXISTS thoughts.sessions (
  id serial PRIMARY KEY,
  name varchar(80) NOT NULL,
  user_id integer REFERENCES thoughts.users(id),
  date_created timestamp NOT NULL DEFAULT current_timestamp
);
