CREATE TABLE rate_limits (
  id varchar(255) PRIMARY KEY,
  tokens integer NOT NULL,
  last_updated timestamptz NOT NULL DEFAULT now()
);
