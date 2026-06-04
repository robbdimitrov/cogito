ALTER TABLE posts
    ADD COLUMN in_reply_to_id integer REFERENCES posts(id) ON DELETE SET NULL,
    ADD COLUMN quote_of_id    integer REFERENCES posts(id) ON DELETE SET NULL;

CREATE INDEX posts_in_reply_to_id_idx ON posts (in_reply_to_id)
    WHERE in_reply_to_id IS NOT NULL;
