package feed

import "context"

type Repository interface {
	BulkInsert(ctx context.Context, entries []Entry) error
	PruneByFollowee(ctx context.Context, followerID, followeeID int32) error
	CountFollowers(ctx context.Context, authorID int32) (int, error)
	GetFollowers(ctx context.Context, authorID int32) ([]int32, error)
	GetLastPosts(ctx context.Context, userID int32, limit int) ([]Entry, error)
	GetFanOutDisabled(ctx context.Context, userID int32) (bool, error)
	SetFanOutDisabled(ctx context.Context, userID int32) error
}
