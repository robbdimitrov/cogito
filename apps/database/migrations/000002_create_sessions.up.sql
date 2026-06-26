CREATE TABLE sessions (
  id varchar(255) PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users ON DELETE CASCADE,
  created timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
