package eventsservice

import (
	"context"
	"errors"
	"log/slog"

	"google.golang.org/grpc/codes"

	"thoughts/eventsservice/internal/notifications"

	pb "thoughts/eventsservice/genproto"
)

type Controller struct {
	pb.UnimplementedNotificationServiceServer
	service *Service
}

func NewController(service *Service) *Controller {
	return &Controller{service: service}
}

func (c *Controller) GetNotifications(ctx context.Context, req *pb.GetNotificationsRequest) (*pb.Notifications, error) {
	limit := req.Limit
	if limit < 1 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}
	items, nextCursor, err := c.service.GetNotifications(ctx, req.UserId, req.Cursor, limit)
	if err != nil {
		slog.Warn("list notifications failed", "request_id", RequestID(ctx), "error", err)
		if errors.Is(err, notifications.ErrInvalidCursor) {
			return nil, NewError(codes.InvalidArgument)
		}
		return nil, NewError(codes.Internal)
	}
	out := make([]*pb.Notification, 0, len(items))
	for _, item := range items {
		out = append(out, &pb.Notification{
			Id:         int32(item.ID),
			ExternalId: item.ExternalID,
			UserId:     item.UserID,
			ActorId:    item.ActorID,
			Type:       item.Type,
			EntityId:   item.EntityID,
			Read:       item.Read,
			Created:    item.Created.UTC().Format("2006-01-02T15:04:05Z"),
		})
	}
	return &pb.Notifications{Notifications: out, NextCursor: nextCursor}, nil
}

func (c *Controller) MarkNotificationRead(ctx context.Context, req *pb.NotificationRequest) (*pb.Empty, error) {
	if err := c.service.MarkNotificationRead(ctx, int64(req.NotificationId), req.UserId); err != nil {
		slog.Warn("mark notification read failed", "request_id", RequestID(ctx), "error", err)
		return nil, NewError(codes.Internal)
	}
	return &pb.Empty{}, nil
}

func (c *Controller) GetUnreadCount(ctx context.Context, req *pb.UserRequest) (*pb.UnreadCountResponse, error) {
	count, err := c.service.UnreadCount(ctx, req.UserId)
	if err != nil {
		slog.Warn("get unread count failed", "request_id", RequestID(ctx), "error", err)
		return nil, NewError(codes.Internal)
	}
	return &pb.UnreadCountResponse{Count: count}, nil
}
