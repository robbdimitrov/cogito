ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_actor_id_fkey;

DELETE FROM notifications
WHERE actor_id IS NULL;

ALTER TABLE notifications
  ALTER COLUMN actor_id SET NOT NULL,
  ADD CONSTRAINT notifications_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE;
