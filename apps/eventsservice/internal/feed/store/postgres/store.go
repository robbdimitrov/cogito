package postgres

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v4/pgxpool"

	"cogito/eventsservice/internal/feed"
)

const bulkInsertBatchSize = 1000

type Store struct {
	db *pgxpool.Pool
}

func NewStore(db *pgxpool.Pool) *Store {
	return &Store{db: db}
}

func (s *Store) BulkInsert(ctx context.Context, entries []feed.Entry) error {
	for start := 0; start < len(entries); start += bulkInsertBatchSize {
		end := start + bulkInsertBatchSize
		if end > len(entries) {
			end = len(entries)
		}
		if err := s.bulkInsertBatch(ctx, entries[start:end]); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) bulkInsertBatch(ctx context.Context, entries []feed.Entry) error {
	if len(entries) == 0 {
		return nil
	}

	args := make([]any, 0, len(entries)*3)
	var values strings.Builder
	for i, entry := range entries {
		if i > 0 {
			values.WriteByte(',')
		}
		base := i*3 + 1
		fmt.Fprintf(&values, "($%d,$%d,$%d)", base, base+1, base+2)
		args = append(args, entry.UserID, entry.PostID, entry.Created)
	}

	_, err := s.db.Exec(ctx, `INSERT INTO feed (user_id, post_id, created) VALUES `+values.String()+`
		ON CONFLICT (user_id, post_id) DO NOTHING`, args...)
	return err
}

func (s *Store) PruneByFollowee(ctx context.Context, followerID, followeeID int32) error {
	_, err := s.db.Exec(ctx, `DELETE FROM feed f USING posts p
		WHERE f.post_id = p.id
			AND f.user_id = $1
			AND p.user_id = $2`, followerID, followeeID)
	return err
}

func (s *Store) CountFollowers(ctx context.Context, authorID int32) (int, error) {
	var count int
	err := s.db.QueryRow(ctx, "SELECT COUNT(*)::int FROM followers WHERE user_id = $1", authorID).Scan(&count)
	return count, err
}

func (s *Store) GetFollowers(ctx context.Context, authorID int32) ([]int32, error) {
	rows, err := s.db.Query(ctx, "SELECT follower_id FROM followers WHERE user_id = $1", authorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var followers []int32
	for rows.Next() {
		var id int32
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		followers = append(followers, id)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return followers, nil
}

func (s *Store) GetLastPosts(ctx context.Context, userID int32, limit int) ([]feed.Entry, error) {
	rows, err := s.db.Query(ctx, `SELECT id, created FROM posts
		WHERE user_id = $1 AND in_reply_to_id IS NULL
		ORDER BY created DESC, id DESC
		LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	posts := make([]feed.Entry, 0, limit)
	for rows.Next() {
		var entry feed.Entry
		if err := rows.Scan(&entry.PostID, &entry.Created); err != nil {
			return nil, err
		}
		entry.UserID = userID
		posts = append(posts, entry)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return posts, nil
}

func (s *Store) GetFanOutDisabled(ctx context.Context, userID int32) (bool, error) {
	var disabled bool
	err := s.db.QueryRow(ctx, "SELECT fan_out_disabled FROM users WHERE id = $1", userID).Scan(&disabled)
	return disabled, err
}

func (s *Store) SetFanOutDisabled(ctx context.Context, userID int32) error {
	_, err := s.db.Exec(ctx, "UPDATE users SET fan_out_disabled = true WHERE id = $1", userID)
	return err
}
