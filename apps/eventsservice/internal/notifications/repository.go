package notifications

import (
	"context"
	"errors"
)

var ErrInvalidCursor = errors.New("invalid cursor")
var ErrNotFound = errors.New("not found")

type Repository interface {
	List(ctx context.Context, userID int32, cursor string, limit int32) ([]Notification, string, error)
	Insert(ctx context.Context, externalID int64, userID, actorID int32, notifType, entityID string) error
	MarkRead(ctx context.Context, id int64, userID int32) error
	UnreadCount(ctx context.Context, userID int32) (int32, error)
	DeleteByEntity(ctx context.Context, entityID string, types []string) error
	DeleteByActorAndType(ctx context.Context, actorID, recipientID int32, notifType, entityID string) error
}
