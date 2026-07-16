CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE recent_searches (
  id bigserial PRIMARY KEY,
  public_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type varchar(10) NOT NULL CHECK (entity_type IN ('users', 'hashtags', 'queries')),
  reference varchar(255) NOT NULL,
  created timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX recent_searches_public_id_idx ON recent_searches(public_id);
CREATE UNIQUE INDEX recent_searches_user_type_reference_idx
  ON recent_searches(user_id, entity_type, reference);
CREATE INDEX recent_searches_user_created_idx
  ON recent_searches(user_id, created DESC, id DESC);
