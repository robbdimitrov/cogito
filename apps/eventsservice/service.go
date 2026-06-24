package eventsservice

import (
	"context"

	"cogito/eventsservice/internal/notifications"
)

type Service struct {
	repo notifications.Repository
}

func NewService(repo notifications.Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetNotifications(ctx context.Context, userID int32, cursor string, limit int32) ([]notifications.Notification, string, error) {
	return s.repo.List(ctx, userID, cursor, limit)
}

func (s *Service) MarkNotificationRead(ctx context.Context, id int64, userID int32) error {
	return s.repo.MarkRead(ctx, id, userID)
}

func (s *Service) UnreadCount(ctx context.Context, userID int32) (int32, error) {
	return s.repo.UnreadCount(ctx, userID)
}
