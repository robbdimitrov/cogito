ALTER TABLE sessions
  ADD COLUMN handle varchar(255);

UPDATE sessions
SET handle = md5(random()::text || clock_timestamp()::text || id)
WHERE handle IS NULL;

ALTER TABLE sessions
  ALTER COLUMN handle SET NOT NULL,
  ADD CONSTRAINT sessions_handle_unique UNIQUE (handle);
