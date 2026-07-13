CREATE INDEX users_username_lower_idx ON users (lower(username) text_pattern_ops);
CREATE INDEX hashtags_name_trgm_idx ON hashtags USING GIN (name gin_trgm_ops);
