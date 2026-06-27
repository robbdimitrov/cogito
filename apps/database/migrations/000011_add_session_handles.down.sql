ALTER TABLE sessions
  DROP CONSTRAINT IF EXISTS sessions_handle_unique,
  DROP COLUMN IF EXISTS handle;
