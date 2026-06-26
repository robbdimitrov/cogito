CREATE TABLE uploads (
  filename varchar(255) PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users ON DELETE CASCADE,
  created timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX uploads_user_id_idx ON uploads (user_id);
