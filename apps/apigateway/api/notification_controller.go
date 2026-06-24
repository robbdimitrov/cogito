package api

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"time"

	pb "thoughts/apigateway/genproto"
)

type notificationController struct {
	client pb.NotificationServiceClient
}

func newNotificationController(addr string) *notificationController {
	if addr == "" {
		return &notificationController{}
	}
	conn, err := newGatewayClient(addr, "events")
	if err != nil {
		slog.Error("unable to create events client", "error", err)
		os.Exit(1)
	}
	return &notificationController{client: pb.NewNotificationServiceClient(conn)}
}

type notification struct {
	ID         int64  `json:"id"`
	ExternalID int64  `json:"externalId"`
	UserID     int32  `json:"userId"`
	ActorID    int32  `json:"actorId"`
	Type       string `json:"type"`
	EntityID   string `json:"entityId"`
	Read       bool   `json:"read"`
	Created    string `json:"created"`
}

func (nc *notificationController) getNotifications(w http.ResponseWriter, r *http.Request) {
	if nc.client == nil {
		jsonError(w, http.StatusServiceUnavailable, "Notifications service unavailable")
		return
	}
	userID, ok := currentUserID(w, r)
	if !ok {
		return
	}
	cursor, limit, err := getCursorAndLimit(r)
	if err != nil {
		grpcError(w, err)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	ctx, err = appendUserIDHeader(ctx, r)
	if err != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	res, err := nc.client.GetNotifications(ctx, &pb.GetNotificationsRequest{
		UserId: userID,
		Cursor: cursor,
		Limit:  int32(limit),
	})
	if err != nil {
		slog.Warn("get notifications failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	items := make([]notification, 0, len(res.Notifications))
	for _, item := range res.Notifications {
		items = append(items, mapNotification(item))
	}
	jsonResponse(w, http.StatusOK, map[string]any{"notifications": items, "nextCursor": res.NextCursor})
}

func (nc *notificationController) markNotificationRead(w http.ResponseWriter, r *http.Request) {
	if nc.client == nil {
		jsonError(w, http.StatusServiceUnavailable, "Notifications service unavailable")
		return
	}
	userID, ok := currentUserID(w, r)
	if !ok {
		return
	}
	notificationID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid notification ID")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	ctx, err = appendUserIDHeader(ctx, r)
	if err != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	_, err = nc.client.MarkNotificationRead(ctx, &pb.NotificationRequest{
		NotificationId: notificationID,
		UserId:         userID,
	})
	if err != nil {
		slog.Warn("mark notification read failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (nc *notificationController) getUnreadCount(w http.ResponseWriter, r *http.Request) {
	if nc.client == nil {
		jsonError(w, http.StatusServiceUnavailable, "Notifications service unavailable")
		return
	}
	userID, ok := currentUserID(w, r)
	if !ok {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	ctx, err := appendUserIDHeader(ctx, r)
	if err != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	res, err := nc.client.GetUnreadCount(ctx, &pb.UserRequest{UserId: userID})
	if err != nil {
		slog.Warn("get unread notification count failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}
	jsonResponse(w, http.StatusOK, map[string]int32{"count": res.Count})
}

func currentUserID(w http.ResponseWriter, r *http.Request) (int32, bool) {
	raw := getUserID(r)
	if raw == "" {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		return 0, false
	}
	id, err := strconv.ParseInt(raw, 10, 32)
	if err != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		return 0, false
	}
	return int32(id), true
}

func mapNotification(item *pb.Notification) notification {
	return notification{
		ID:         item.Id,
		ExternalID: item.ExternalId,
		UserID:     item.UserId,
		ActorID:    item.ActorId,
		Type:       item.Type,
		EntityID:   item.EntityId,
		Read:       item.Read,
		Created:    item.Created,
	}
}
