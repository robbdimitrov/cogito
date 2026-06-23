CREATE TABLE notifications (
  id          bigserial PRIMARY KEY,
  external_id bigint NOT NULL UNIQUE,
  user_id     integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id    integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        varchar(20) NOT NULL,
  entity_id   varchar(255) NOT NULL,
  read        boolean NOT NULL DEFAULT false,
  created     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_id_created_idx
  ON notifications(user_id, created DESC, id DESC);
CREATE INDEX notifications_type_entity_idx
  ON notifications(type, entity_id);
