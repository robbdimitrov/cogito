package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"

	pb "cogito/apigateway/genproto"
)

type mockNotificationServiceClient struct {
	pb.NotificationServiceClient
	getReq        *pb.GetNotificationsRequest
	markReq       *pb.NotificationRequest
	unreadReq     *pb.UserRequest
	outgoingMD    metadata.MD
	err           error
	notifications *pb.Notifications
	unreadCount   *pb.UnreadCountResponse
}

func (m *mockNotificationServiceClient) capture(ctx context.Context) {
	md, _ := metadata.FromOutgoingContext(ctx)
	m.outgoingMD = md
}

func (m *mockNotificationServiceClient) GetNotifications(ctx context.Context, in *pb.GetNotificationsRequest, opts ...grpc.CallOption) (*pb.Notifications, error) {
	m.capture(ctx)
	m.getReq = in
	if m.err != nil {
		return nil, m.err
	}
	if m.notifications != nil {
		return m.notifications, nil
	}
	return &pb.Notifications{}, nil
}

func (m *mockNotificationServiceClient) MarkNotificationRead(ctx context.Context, in *pb.NotificationRequest, opts ...grpc.CallOption) (*pb.Empty, error) {
	m.capture(ctx)
	m.markReq = in
	if m.err != nil {
		return nil, m.err
	}
	return &pb.Empty{}, nil
}

func (m *mockNotificationServiceClient) GetUnreadCount(ctx context.Context, in *pb.UserRequest, opts ...grpc.CallOption) (*pb.UnreadCountResponse, error) {
	m.capture(ctx)
	m.unreadReq = in
	if m.err != nil {
		return nil, m.err
	}
	if m.unreadCount != nil {
		return m.unreadCount, nil
	}
	return &pb.UnreadCountResponse{}, nil
}

func TestNotificationControllerGetNotifications(t *testing.T) {
	t.Setenv("INTERNAL_GRPC_TOKEN", "test-token")
	client := &mockNotificationServiceClient{
		notifications: &pb.Notifications{
			Notifications: []*pb.Notification{{Id: 1, ExternalId: 42, UserId: 7, ActorId: 8, Type: "like", EntityId: "99", Created: "2026-01-01T00:00:00Z"}},
			NextCursor:    "next",
		},
	}
	userClient := &mockBatchUserClient{users: map[int32]*pb.User{8: {Id: 8, Username: "actor"}}}
	controller := &notificationController{client: client, userClient: userClient}
	req := httptest.NewRequest(http.MethodGet, "/notifications?cursor=abc&limit=5", nil)
	req = setUserID(req, "7")
	req = setRequestID(req, "req-1")
	rec := httptest.NewRecorder()

	controller.getNotifications(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body %s", rec.Code, rec.Body.String())
	}
	if client.getReq == nil || client.getReq.UserId != 7 || client.getReq.Cursor != "abc" || client.getReq.Limit != 5 {
		t.Fatalf("unexpected request: %+v", client.getReq)
	}
	assertNotificationMetadata(t, client.outgoingMD)
	if len(userClient.requestedIDs) != 1 || userClient.requestedIDs[0] != 8 {
		t.Fatalf("expected actor ids [8], got %v", userClient.requestedIDs)
	}

	var body struct {
		Items      []notification `json:"items"`
		NextCursor string         `json:"nextCursor"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if body.NextCursor != "next" || len(body.Items) != 1 || body.Items[0].ExternalID != 42 {
		t.Fatalf("unexpected body: %+v", body)
	}
	if body.Items[0].Actor == nil || body.Items[0].Actor.ID != 8 || body.Items[0].Actor.Username != "actor" {
		t.Fatalf("expected embedded actor 8, got %+v", body.Items[0].Actor)
	}
}

func TestNotificationControllerGetNotifications_UnresolvableActor(t *testing.T) {
	t.Setenv("INTERNAL_GRPC_TOKEN", "test-token")
	client := &mockNotificationServiceClient{
		notifications: &pb.Notifications{
			Notifications: []*pb.Notification{{Id: 1, ExternalId: 42, UserId: 7, ActorId: 8, Type: "like", EntityId: "99", Created: "2026-01-01T00:00:00Z"}},
		},
	}
	userClient := &mockBatchUserClient{users: map[int32]*pb.User{}}
	controller := &notificationController{client: client, userClient: userClient}
	req := httptest.NewRequest(http.MethodGet, "/notifications", nil)
	req = setUserID(req, "7")
	req = setRequestID(req, "req-1")
	rec := httptest.NewRecorder()

	controller.getNotifications(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Items []notification `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if len(body.Items) != 1 || body.Items[0].Actor != nil {
		t.Fatalf("expected nil actor for unresolvable actor id, got %+v", body.Items)
	}
}

func TestNotificationControllerGetNotifications_ActorResolutionFails(t *testing.T) {
	t.Setenv("INTERNAL_GRPC_TOKEN", "test-token")
	client := &mockNotificationServiceClient{
		notifications: &pb.Notifications{
			Notifications: []*pb.Notification{{Id: 1, ExternalId: 42, UserId: 7, ActorId: 8, Type: "like", EntityId: "99", Created: "2026-01-01T00:00:00Z"}},
		},
	}
	userClient := &mockBatchUserClient{err: context.DeadlineExceeded}
	controller := &notificationController{client: client, userClient: userClient}
	req := httptest.NewRequest(http.MethodGet, "/notifications", nil)
	req = setUserID(req, "7")
	req = setRequestID(req, "req-1")
	rec := httptest.NewRecorder()

	controller.getNotifications(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 despite actor resolution failure, got %d body %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Items []notification `json:"items"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if len(body.Items) != 1 || body.Items[0].ExternalID != 42 || body.Items[0].Actor != nil {
		t.Fatalf("expected notification returned with nil actor, got %+v", body.Items)
	}
}

func TestNotificationControllerUnavailable(t *testing.T) {
	controller := &notificationController{}
	req := httptest.NewRequest(http.MethodGet, "/notifications", nil)
	req = setUserID(req, "7")
	rec := httptest.NewRecorder()

	controller.getNotifications(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", rec.Code)
	}
}

func TestNotificationControllerMarkReadInvalidID(t *testing.T) {
	controller := &notificationController{client: &mockNotificationServiceClient{}}
	req := httptest.NewRequest(http.MethodPut, "/notifications/not-an-id/read", nil)
	req.SetPathValue("id", "not-an-id")
	req = setUserID(req, "7")
	rec := httptest.NewRecorder()

	controller.markNotificationRead(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestNotificationControllerUnreadCount(t *testing.T) {
	t.Setenv("INTERNAL_GRPC_TOKEN", "test-token")
	client := &mockNotificationServiceClient{unreadCount: &pb.UnreadCountResponse{Count: 3}}
	controller := &notificationController{client: client}
	req := httptest.NewRequest(http.MethodGet, "/notifications/unread-count", nil)
	req = setUserID(req, "7")
	req = setRequestID(req, "req-1")
	rec := httptest.NewRecorder()

	controller.getUnreadCount(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body %s", rec.Code, rec.Body.String())
	}
	if client.unreadReq == nil || client.unreadReq.UserId != 7 {
		t.Fatalf("unexpected request: %+v", client.unreadReq)
	}
	assertNotificationMetadata(t, client.outgoingMD)

	var body map[string]int
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if body["count"] != 3 {
		t.Fatalf("expected count 3, got %v", body)
	}
}

func assertNotificationMetadata(t *testing.T, md metadata.MD) {
	t.Helper()
	if got := md.Get("internal-token"); len(got) != 1 || got[0] != "test-token" {
		t.Fatalf("expected internal-token test-token, got %v", got)
	}
	if got := md.Get("user-id"); len(got) != 1 || got[0] != "7" {
		t.Fatalf("expected user-id 7, got %v", got)
	}
	if got := md.Get("x-request-id"); len(got) != 1 || got[0] != "req-1" {
		t.Fatalf("expected x-request-id req-1, got %v", got)
	}
}
