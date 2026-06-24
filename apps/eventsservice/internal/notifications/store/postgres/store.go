package postgres

import (
	"context"
	"encoding/base64"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v4/pgxpool"

	"thoughts/eventsservice/internal/notifications"
)

type Store struct {
	db *pgxpool.Pool
}

func NewStore(db *pgxpool.Pool) *Store {
	return &Store{db: db}
}

func (s *Store) List(ctx context.Context, userID int32, cursor string, limit int32) ([]notifications.Notification, string, error) {
	cursorCreated, cursorID, err := decodeCursor(cursor)
	if err != nil {
		return nil, "", err
	}
	rows, err := s.db.Query(ctx, `SELECT id, external_id, user_id, actor_id, type, entity_id, read, created
		FROM notifications
		WHERE user_id = $1
			AND ($2::timestamptz IS NULL OR (created, id) < ($2, $3))
		ORDER BY created DESC, id DESC
		LIMIT $4`, userID, cursorCreated, cursorID, limit+1)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()

	items := make([]notifications.Notification, 0, limit)
	for rows.Next() {
		var n notifications.Notification
		if err := rows.Scan(&n.ID, &n.ExternalID, &n.UserID, &n.ActorID, &n.Type, &n.EntityID, &n.Read, &n.Created); err != nil {
			return nil, "", err
		}
		items = append(items, n)
	}
	if err := rows.Err(); err != nil {
		return nil, "", err
	}

	nextCursor := ""
	if int32(len(items)) > limit {
		items = items[:limit]
		last := items[len(items)-1]
		nextCursor = encodeCursor(last.Created, last.ID)
	}
	return items, nextCursor, nil
}

func (s *Store) Insert(ctx context.Context, externalID int64, userID, actorID int32, notifType, entityID string) error {
	_, err := s.db.Exec(ctx, `INSERT INTO notifications (external_id, user_id, actor_id, type, entity_id)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (external_id) DO NOTHING`, externalID, userID, actorID, notifType, entityID)
	return err
}

func (s *Store) MarkRead(ctx context.Context, id int64, userID int32) error {
	tag, err := s.db.Exec(ctx, "UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2", id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return notifications.ErrNotFound
	}
	return nil
}

func (s *Store) UnreadCount(ctx context.Context, userID int32) (int32, error) {
	var count int32
	err := s.db.QueryRow(ctx, "SELECT COUNT(*)::int FROM notifications WHERE user_id = $1 AND read = false", userID).Scan(&count)
	return count, err
}

func (s *Store) DeleteByEntity(ctx context.Context, entityID string, types []string) error {
	_, err := s.db.Exec(ctx, "DELETE FROM notifications WHERE type = ANY($1) AND entity_id = $2", types, entityID)
	return err
}

func (s *Store) DeleteByActorAndType(ctx context.Context, actorID, recipientID int32, notifType, entityID string) error {
	_, err := s.db.Exec(ctx, "DELETE FROM notifications WHERE actor_id = $1 AND user_id = $2 AND type = $3 AND entity_id = $4", actorID, recipientID, notifType, entityID)
	return err
}

func decodeCursor(cursor string) (*time.Time, int64, error) {
	if cursor == "" {
		return nil, 0, nil
	}
	decoded, err := base64.RawURLEncoding.DecodeString(cursor)
	if err != nil {
		return nil, 0, notifications.ErrInvalidCursor
	}
	parts := strings.SplitN(string(decoded), ",", 2)
	if len(parts) != 2 {
		return nil, 0, notifications.ErrInvalidCursor
	}
	created, err := time.Parse(time.RFC3339Nano, parts[0])
	if err != nil {
		return nil, 0, notifications.ErrInvalidCursor
	}
	id, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		return nil, 0, notifications.ErrInvalidCursor
	}
	return &created, id, nil
}

func encodeCursor(created time.Time, id int64) string {
	raw := created.UTC().Format(time.RFC3339Nano) + "," + strconv.FormatInt(id, 10)
	return base64.RawURLEncoding.EncodeToString([]byte(raw))
}
