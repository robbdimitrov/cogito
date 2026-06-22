package search

import (
	"context"
	"strings"
	"time"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

type OutboxRow struct {
	ID         int64
	EntityType string
	EntityID   string
	Attempts   int32
}

type UserDoc struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Name     string `json:"name"`
}

type PostDoc struct {
	ID        string   `json:"id"`
	Content   string   `json:"content"`
	Username  string   `json:"username"`
	Hashtags  []string `json:"hashtags"`
	CreatedAt string   `json:"created_at"`
}

type HashtagDoc struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	PostCount int    `json:"post_count"`
}

func DrainOutbox(ctx context.Context, tx pgx.Tx) ([]OutboxRow, error) {
	// DISTINCT ON cannot be combined with FOR UPDATE directly in PostgreSQL.
	// Select the newest row ID per entity in a subquery, then lock those rows.
	rows, err := tx.Query(ctx, `
		SELECT id, entity_type, entity_id, attempts
		FROM search_outbox
		WHERE id IN (
			SELECT DISTINCT ON (entity_type, entity_id) id
			FROM search_outbox
			ORDER BY entity_type, entity_id, id DESC
			LIMIT 100
		)
		FOR UPDATE SKIP LOCKED`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []OutboxRow
	for rows.Next() {
		var r OutboxRow
		if err := rows.Scan(&r.ID, &r.EntityType, &r.EntityID, &r.Attempts); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func GetUser(ctx context.Context, db *pgxpool.Pool, id string) (*UserDoc, error) {
	var doc UserDoc
	err := db.QueryRow(ctx, `SELECT id::text, username, name FROM users WHERE id = $1`, id).
		Scan(&doc.ID, &doc.Username, &doc.Name)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return &doc, err
}

func GetPost(ctx context.Context, db *pgxpool.Pool, id string) (*PostDoc, error) {
	var doc PostDoc
	var created time.Time
	err := db.QueryRow(ctx, `
		SELECT p.id::text, COALESCE(p.content, ''), u.username,
		       COALESCE(array_agg(h.name) FILTER (WHERE h.name IS NOT NULL), '{}'), p.created
		FROM posts p
		JOIN users u ON u.id = p.user_id
		LEFT JOIN post_hashtags ph ON ph.post_id = p.id
		LEFT JOIN hashtags h ON h.id = ph.hashtag_id
		WHERE p.id = $1
		GROUP BY p.id, u.username`, id).
		Scan(&doc.ID, &doc.Content, &doc.Username, &doc.Hashtags, &created)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	doc.CreatedAt = created.UTC().Format(time.RFC3339)
	return &doc, nil
}

func GetHashtag(ctx context.Context, db *pgxpool.Pool, id string) (*HashtagDoc, error) {
	var doc HashtagDoc
	err := db.QueryRow(ctx, `
		SELECT h.id::text, h.name, COUNT(ph.post_id)::int
		FROM hashtags h
		LEFT JOIN post_hashtags ph ON ph.hashtag_id = h.id
		WHERE h.id = $1
		GROUP BY h.id`, id).
		Scan(&doc.ID, &doc.Name, &doc.PostCount)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return &doc, err
}

func StreamUsers(ctx context.Context, db *pgxpool.Pool, offset, limit int) ([]*UserDoc, error) {
	rows, err := db.Query(ctx, `SELECT id::text, username, name FROM users ORDER BY id LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*UserDoc
	for rows.Next() {
		var d UserDoc
		if err := rows.Scan(&d.ID, &d.Username, &d.Name); err != nil {
			return nil, err
		}
		out = append(out, &d)
	}
	return out, rows.Err()
}

func StreamPosts(ctx context.Context, db *pgxpool.Pool, offset, limit int) ([]*PostDoc, error) {
	rows, err := db.Query(ctx, `
		SELECT p.id::text, COALESCE(p.content, ''), u.username,
		       COALESCE(array_agg(h.name) FILTER (WHERE h.name IS NOT NULL), '{}'), p.created
		FROM posts p
		JOIN users u ON u.id = p.user_id
		LEFT JOIN post_hashtags ph ON ph.post_id = p.id
		LEFT JOIN hashtags h ON h.id = ph.hashtag_id
		GROUP BY p.id, u.username
		ORDER BY p.id LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*PostDoc
	for rows.Next() {
		var d PostDoc
		var created time.Time
		if err := rows.Scan(&d.ID, &d.Content, &d.Username, &d.Hashtags, &created); err != nil {
			return nil, err
		}
		d.CreatedAt = created.UTC().Format(time.RFC3339)
		out = append(out, &d)
	}
	return out, rows.Err()
}

func StreamHashtags(ctx context.Context, db *pgxpool.Pool, offset, limit int) ([]*HashtagDoc, error) {
	rows, err := db.Query(ctx, `
		SELECT h.id::text, h.name, COUNT(ph.post_id)::int
		FROM hashtags h
		LEFT JOIN post_hashtags ph ON ph.hashtag_id = h.id
		GROUP BY h.id ORDER BY h.id LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*HashtagDoc
	for rows.Next() {
		var d HashtagDoc
		if err := rows.Scan(&d.ID, &d.Name, &d.PostCount); err != nil {
			return nil, err
		}
		out = append(out, &d)
	}
	return out, rows.Err()
}

func RequeueRow(ctx context.Context, db *pgxpool.Pool, entityType, entityID string, attempts int32) error {
	_, err := db.Exec(ctx,
		"INSERT INTO search_outbox (entity_type, entity_id, attempts) VALUES ($1, $2, $3)",
		entityType, entityID, attempts)
	return err
}

func TryAcquireBackfillLock(ctx context.Context, conn *pgxpool.Conn) bool {
	var ok bool
	_ = conn.QueryRow(ctx, `SELECT pg_try_advisory_lock(774191)`).Scan(&ok)
	return ok
}

func ReleaseBackfillLock(ctx context.Context, conn *pgxpool.Conn) {
	_, _ = conn.Exec(ctx, `SELECT pg_advisory_unlock(774191)`)
}

func docToMap(v any) map[string]any {
	switch d := v.(type) {
	case *UserDoc:
		return map[string]any{"id": d.ID, "username": d.Username, "name": d.Name}
	case *PostDoc:
		return map[string]any{"id": d.ID, "content": d.Content, "username": d.Username, "hashtags": d.Hashtags, "created_at": d.CreatedAt}
	case *HashtagDoc:
		return map[string]any{"id": d.ID, "name": d.Name, "post_count": d.PostCount}
	}
	return nil
}

// indexForType returns the Meilisearch index name for an entity type.
func indexForType(entityType string) string {
	switch strings.ToLower(entityType) {
	case "user":
		return "users"
	case "post":
		return "posts"
	case "hashtag":
		return "hashtags"
	}
	return ""
}
