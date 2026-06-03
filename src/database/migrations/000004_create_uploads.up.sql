CREATE TABLE uploads (
  filename varchar(255) PRIMARY KEY,
  user_id integer REFERENCES users ON DELETE CASCADE,
  created timestamp NOT NULL DEFAULT now()
);
