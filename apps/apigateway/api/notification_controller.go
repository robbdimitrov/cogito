package api

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"time"

	pb "cogito/apigateway/genproto"
)

type notificationController struct {
	client     pb.NotificationServiceClient
	userClient pb.UserServiceClient
}

func newNotificationController(addr string, userClient pb.UserServiceClient) *notificationController {
	if addr == "" {
		return &notificationController{}
	}
	conn, err := newGatewayClient(addr, "events")
	if err != nil {
		slog.Error("unable to create events client", "error", err)
		os.Exit(1)
	}
	return &notificationController{client: pb.NewNotificationServiceClient(conn), userClient: userClient}
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
	Actor      *user  `json:"actor,omitempty"`
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

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
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

	actors := nc.resolveActors(ctx, res.Notifications)
	items := make([]notification, 0, len(res.Notifications))
	for _, item := range res.Notifications {
		n := mapNotification(item)
		if a, ok := actors[item.ActorId]; ok {
			actor := a
			n.Actor = &actor
		}
		items = append(items, n)
	}
	jsonResponse(w, http.StatusOK, map[string]any{"items": items, "nextCursor": res.NextCursor})
}

// resolveActors batch-fetches the actors referenced by a page of
// notifications in a single call, returning a map keyed by user ID.
func (nc *notificationController) resolveActors(ctx context.Context, items []*pb.Notification) map[int32]user {
	if nc.userClient == nil {
		return nil
	}

	idSet := make(map[int32]struct{})
	for _, item := range items {
		idSet[item.ActorId] = struct{}{}
	}
	if len(idSet) == 0 {
		return nil
	}

	ids := make([]int32, 0, len(idSet))
	for id := range idSet {
		ids = append(ids, id)
	}

	res, err := nc.userClient.GetUsersByIds(ctx, &pb.Ids{Ids: ids})
	if err != nil {
		slog.Warn("resolving notification actors failed", "request_id", requestIDFromContext(ctx), "error_kind", grpcCode(err))
		return nil
	}

	actors := make(map[int32]user, len(res.Users))
	for _, u := range res.Users {
		actors[u.Id] = mapUser(u)
	}
	return actors
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

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
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

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
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
