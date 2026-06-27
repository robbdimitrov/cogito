ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_actor_id_fkey,
  ALTER COLUMN actor_id DROP NOT NULL,
  ADD CONSTRAINT notifications_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL;
