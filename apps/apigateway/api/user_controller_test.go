package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"google.golang.org/grpc"

	pb "cogito/apigateway/genproto"
)

type mockUserServiceClient struct {
	pb.UserServiceClient
	updateUserCalled bool
	oldProfileKey    string
	oldCoverKey      string
	errUpdate        error
	errGet           error
}

func (m *mockUserServiceClient) GetUser(ctx context.Context, in *pb.UserRequest, opts ...grpc.CallOption) (*pb.User, error) {
	return &pb.User{
		Id:              in.UserId,
		Email:           "owner@example.com",
		ProfilePhotoKey: m.oldProfileKey,
		CoverPhotoKey:   m.oldCoverKey,
	}, m.errGet
}

func (m *mockUserServiceClient) GetUserByUsername(ctx context.Context, in *pb.GetUserByUsernameRequest, opts ...grpc.CallOption) (*pb.User, error) {
	return &pb.User{Id: 1, Username: in.Username, Email: "owner@example.com"}, m.errGet
}

func (m *mockUserServiceClient) UpdateUser(ctx context.Context, in *pb.UpdateUserRequest, opts ...grpc.CallOption) (*pb.Empty, error) {
	m.updateUserCalled = true
	return &pb.Empty{}, m.errUpdate
}

type mockAuthServiceClient struct {
	pb.AuthServiceClient
	getSessionsCalled   bool
	deleteSessionCalled int
	deletedSessionIDs   []string
	sessions            []*pb.Session
	sessionUserID       int32
	errGetSession       error
}

func (m *mockAuthServiceClient) GetSessions(ctx context.Context, in *pb.UserRequest, opts ...grpc.CallOption) (*pb.Sessions, error) {
	m.getSessionsCalled = true
	return &pb.Sessions{Sessions: m.sessions}, nil
}

func (m *mockAuthServiceClient) GetSession(ctx context.Context, in *pb.SessionRequest, opts ...grpc.CallOption) (*pb.Session, error) {
	if m.errGetSession != nil {
		return nil, m.errGetSession
	}
	return &pb.Session{Handle: "current-session", UserId: m.sessionUserID}, nil
}

func (m *mockAuthServiceClient) DeleteSession(ctx context.Context, in *pb.SessionRequest, opts ...grpc.CallOption) (*pb.Empty, error) {
	m.deleteSessionCalled++
	m.deletedSessionIDs = append(m.deletedSessionIDs, in.SessionId)
	return &pb.Empty{}, nil
}

type mockImageServiceClientForUser struct {
	pb.ImageServiceClient
	verifyCalled  int
	consumeCalled int
	deleteCalled  int
	deletedImages []string
}

func (m *mockImageServiceClientForUser) VerifyUpload(ctx context.Context, in *pb.VerifyUploadRequest, opts ...grpc.CallOption) (*pb.Empty, error) {
	m.verifyCalled++
	return &pb.Empty{}, nil
}

func (m *mockImageServiceClientForUser) ConsumeUpload(ctx context.Context, in *pb.ConsumeUploadRequest, opts ...grpc.CallOption) (*pb.Empty, error) {
	m.consumeCalled++
	return &pb.Empty{}, nil
}

func (m *mockImageServiceClientForUser) DeleteImage(ctx context.Context, in *pb.DeleteImageRequest, opts ...grpc.CallOption) (*pb.Empty, error) {
	m.deleteCalled++
	m.deletedImages = append(m.deletedImages, in.Filename)
	return &pb.Empty{}, nil
}

func TestImageUploadProxy_ForwardsFrontendRouteWithUserHeader(t *testing.T) {
	var gotPath string
	var gotUserID string
	var gotRequestID string
	var gotInternalToken string

	imageServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotUserID = r.Header.Get("x-user-id")
		gotRequestID = r.Header.Get("X-Request-ID")
		gotInternalToken = r.Header.Get("internal-token")
		json.NewEncoder(w).Encode(map[string]string{"filename": "new-profile.jpg"})
	}))
	defer imageServer.Close()

	t.Setenv("INTERNAL_GRPC_TOKEN", "test-internal-token")
	imageAddr := strings.TrimPrefix(imageServer.URL, "http://")
	router := &router{imageAddr: imageAddr}

	req := httptest.NewRequest("POST", "/uploads", bytes.NewBufferString("image-body"))
	req.Header.Set("Connection", "internal-token")
	req = setUserID(req, "42")
	req = setRequestID(req, "req-test")
	w := httptest.NewRecorder()

	router.proxyImageUpload(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}
	if gotPath != "/uploads" {
		t.Errorf("Expected proxied path /uploads, got %s", gotPath)
	}
	if gotUserID != "42" {
		t.Errorf("Expected x-user-id header 42, got %s", gotUserID)
	}
	if gotRequestID != "req-test" {
		t.Errorf("Expected X-Request-ID header req-test, got %s", gotRequestID)
	}
	if gotInternalToken != "test-internal-token" {
		t.Errorf("Expected internal-token header test-internal-token, got %s", gotInternalToken)
	}
	if got := w.Header().Get("Cache-Control"); got != "" {
		t.Errorf("Expected upload response not to be cached, got %q", got)
	}
}

func TestImageUploadProxy_RejectsOversizedContentLengthBeforeProxying(t *testing.T) {
	// Regression test: an oversized upload must get a clean JSON 413 without
	// ever reaching the reverse proxy, since a body-write error mid-proxy can
	// drop the connection with no response at all instead of a clean error.
	proxyReached := false
	imageServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		proxyReached = true
		w.WriteHeader(http.StatusOK)
	}))
	defer imageServer.Close()

	t.Setenv("INTERNAL_GRPC_TOKEN", "test-internal-token")
	imageAddr := strings.TrimPrefix(imageServer.URL, "http://")
	router := &router{imageAddr: imageAddr}

	req := httptest.NewRequest("POST", "/uploads", bytes.NewBufferString("oversized-body"))
	req.ContentLength = maxRequestBodyBytes + 1
	req = setUserID(req, "42")
	w := httptest.NewRecorder()

	router.proxyImageUpload(w, req)

	if w.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected status 413, got %d", w.Code)
	}
	if proxyReached {
		t.Error("expected the oversized upload to be rejected before reaching the image service")
	}
	var body map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("expected valid JSON error body, got parse error %v: %s", err, w.Body.String())
	}
	if body["message"] == "" {
		t.Error("expected a non-empty JSON error message")
	}
}

func TestImageFileProxy_ForwardsCacheAndValidatorHeaders(t *testing.T) {
	var gotPath string
	var gotMethod string
	var gotInternalToken string

	imageServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotMethod = r.Method
		gotInternalToken = r.Header.Get("internal-token")
		w.Header().Set("Cache-Control", "private, max-age=86400")
		w.Header().Set("Last-Modified", "Sat, 06 Jun 2026 10:00:00 GMT")
		w.WriteHeader(http.StatusOK)
	}))
	defer imageServer.Close()

	t.Setenv("INTERNAL_GRPC_TOKEN", "test-internal-token")
	imageAddr := strings.TrimPrefix(imageServer.URL, "http://")
	router := &router{imageAddr: imageAddr}

	req := httptest.NewRequest("GET", "/uploads/profile.jpg", nil)
	req.SetPathValue("filename", "profile.jpg")
	w := httptest.NewRecorder()

	router.proxyImageFile(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}
	if gotPath != "/uploads/profile.jpg" {
		t.Errorf("Expected proxied path /uploads/profile.jpg, got %s", gotPath)
	}
	if gotMethod != http.MethodGet {
		t.Errorf("Expected proxied method GET, got %s", gotMethod)
	}
	if gotInternalToken != "test-internal-token" {
		t.Errorf("Expected internal-token header test-internal-token, got %s", gotInternalToken)
	}
	if got := w.Header().Get("Cache-Control"); got != "private, max-age=86400" {
		t.Errorf("Expected cache header to be forwarded, got %q", got)
	}
	if got := w.Header().Get("Last-Modified"); got != "Sat, 06 Jun 2026 10:00:00 GMT" {
		t.Errorf("Expected Last-Modified to be forwarded, got %q", got)
	}
}

func TestImageFileProxy_StripsClientInternalHeaders(t *testing.T) {
	var gotInternalToken string
	var gotUserID string
	var gotGRPCUserID string

	imageServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotInternalToken = r.Header.Get("internal-token")
		gotUserID = r.Header.Get("x-user-id")
		gotGRPCUserID = r.Header.Get("user-id")
		w.WriteHeader(http.StatusOK)
	}))
	defer imageServer.Close()

	t.Setenv("INTERNAL_GRPC_TOKEN", "gateway-owned-token")
	imageAddr := strings.TrimPrefix(imageServer.URL, "http://")
	router := &router{imageAddr: imageAddr}

	req := httptest.NewRequest("GET", "/uploads/profile.jpg", nil)
	req.Header.Set("internal-token", "attacker-token")
	req.Header.Set("x-user-id", "99")
	req.Header.Set("user-id", "99")
	req.SetPathValue("filename", "profile.jpg")
	w := httptest.NewRecorder()

	router.proxyImageFile(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}
	if gotInternalToken != "gateway-owned-token" {
		t.Errorf("Expected gateway-owned internal-token, got %q", gotInternalToken)
	}
	if gotUserID != "" {
		t.Errorf("Expected client x-user-id to be stripped, got %q", gotUserID)
	}
	if gotGRPCUserID != "" {
		t.Errorf("Expected client user-id to be stripped, got %q", gotGRPCUserID)
	}
}

func TestImageFileProxy_ForwardsHeadRequest(t *testing.T) {
	var gotMethod string

	imageServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotMethod = r.Method
		w.Header().Set("Cache-Control", "private, max-age=86400")
		w.Header().Set("Last-Modified", "Sat, 06 Jun 2026 10:00:00 GMT")
		w.WriteHeader(http.StatusOK)
	}))
	defer imageServer.Close()

	imageAddr := strings.TrimPrefix(imageServer.URL, "http://")
	router := &router{imageAddr: imageAddr}

	req := httptest.NewRequest(http.MethodHead, "/uploads/profile.jpg", nil)
	req.SetPathValue("filename", "profile.jpg")
	w := httptest.NewRecorder()

	router.proxyImageFile(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}
	if gotMethod != http.MethodHead {
		t.Errorf("Expected proxied method HEAD, got %s", gotMethod)
	}
	if got := w.Header().Get("Cache-Control"); got != "private, max-age=86400" {
		t.Errorf("Expected cache header to be forwarded, got %q", got)
	}
	if got := w.Header().Get("Last-Modified"); got != "Sat, 06 Jun 2026 10:00:00 GMT" {
		t.Errorf("Expected Last-Modified to be forwarded, got %q", got)
	}
}

func TestImageFileProxy_DoesNotCacheMissingImage(t *testing.T) {
	imageServer := httptest.NewServer(http.NotFoundHandler())
	defer imageServer.Close()

	imageAddr := strings.TrimPrefix(imageServer.URL, "http://")
	router := &router{imageAddr: imageAddr}

	req := httptest.NewRequest(http.MethodGet, "/uploads/missing.jpg", nil)
	req.SetPathValue("filename", "missing.jpg")
	w := httptest.NewRecorder()

	router.proxyImageFile(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("Expected status 404, got %d", w.Code)
	}
	if got := w.Header().Get("Cache-Control"); got != "" {
		t.Errorf("Expected missing image not to be cached, got %q", got)
	}
}

func TestImageFileProxy_ForwardsConditionalRequest(t *testing.T) {
	const lastModified = "Sat, 06 Jun 2026 10:00:00 GMT"
	var gotIfModifiedSince string

	imageServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotIfModifiedSince = r.Header.Get("If-Modified-Since")
		w.Header().Set("Cache-Control", "private, max-age=86400")
		w.Header().Set("Last-Modified", lastModified)
		w.WriteHeader(http.StatusNotModified)
	}))
	defer imageServer.Close()

	imageAddr := strings.TrimPrefix(imageServer.URL, "http://")
	router := &router{imageAddr: imageAddr}

	req := httptest.NewRequest("GET", "/uploads/profile.jpg", nil)
	req.Header.Set("If-Modified-Since", lastModified)
	req.SetPathValue("filename", "profile.jpg")
	w := httptest.NewRecorder()

	router.proxyImageFile(w, req)

	if w.Code != http.StatusNotModified {
		t.Fatalf("Expected status 304, got %d", w.Code)
	}
	if gotIfModifiedSince != lastModified {
		t.Errorf("Expected conditional header to be forwarded, got %q", gotIfModifiedSince)
	}
	if got := w.Header().Get("Cache-Control"); got != "private, max-age=86400" {
		t.Errorf("Expected cache header to be forwarded, got %q", got)
	}
}

func TestGetUser_NoSessionSucceedsAndHidesEmail(t *testing.T) {
	mockUser := &mockUserServiceClient{}
	uc := &userController{client: mockUser}

	req := httptest.NewRequest("GET", "/users/1", nil)
	req.SetPathValue("userId", "1")
	// No setUserID call: simulates an anonymous visitor.

	w := httptest.NewRecorder()
	uc.getUser(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected anonymous getUser to succeed, got status %d: %s", w.Code, w.Body.String())
	}
	if strings.Contains(w.Body.String(), "owner@example.com") {
		t.Errorf("expected email to be hidden from an anonymous viewer, got: %s", w.Body.String())
	}
}

func TestGetUserByUsername_NoSessionSucceedsAndHidesEmail(t *testing.T) {
	mockUser := &mockUserServiceClient{}
	uc := &userController{client: mockUser}

	req := httptest.NewRequest("GET", "/users?username=alice", nil)
	// No setUserID call: simulates an anonymous visitor.

	w := httptest.NewRecorder()
	uc.getUserByUsername(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected anonymous getUserByUsername to succeed, got status %d: %s", w.Code, w.Body.String())
	}
	if strings.Contains(w.Body.String(), "owner@example.com") {
		t.Errorf("expected email to be hidden from an anonymous viewer, got: %s", w.Body.String())
	}
}

func TestGetUserByUsername_AnonymousNeverMatchesUserIdZero(t *testing.T) {
	// Regression test: currentUserID used to come from strconv.ParseInt on a
	// possibly-empty getUserID(r) with the error discarded, so an anonymous
	// caller's "" collapsed to a currentUserID of 0. If the looked-up user's
	// id were ever 0 (should not happen with a `serial` PK, but must not be
	// relied on), that would match and leak the owner's email.
	mockUser := &mockUserServiceClientWithZeroID{}
	uc := &userController{client: mockUser}

	req := httptest.NewRequest("GET", "/users?username=alice", nil)
	// No setUserID call: simulates an anonymous visitor.

	w := httptest.NewRecorder()
	uc.getUserByUsername(w, req)

	if strings.Contains(w.Body.String(), "owner@example.com") {
		t.Errorf("anonymous caller must never see email even if the user's id is 0, got: %s", w.Body.String())
	}
}

type mockUserServiceClientWithZeroID struct {
	pb.UserServiceClient
}

func (m *mockUserServiceClientWithZeroID) GetUserByUsername(ctx context.Context, in *pb.GetUserByUsernameRequest, opts ...grpc.CallOption) (*pb.User, error) {
	return &pb.User{Id: 0, Username: in.Username, Email: "owner@example.com"}, nil
}

func TestUpdateUser_ImageAndSessionOrchestration(t *testing.T) {
	mockUser := &mockUserServiceClient{
		oldProfileKey: "old-profile.jpg",
		oldCoverKey:   "old-cover.jpg",
	}
	mockAuth := &mockAuthServiceClient{
		sessions: []*pb.Session{
			{Handle: "current-session"},
			{Handle: "other-session"},
		},
	}
	mockImage := &mockImageServiceClientForUser{}

	uc := &userController{
		client:     mockUser,
		authClient: mockAuth,
		imgClient:  mockImage,
	}

	body := `{"name":"test","password":"newpass","profilePhotoKey":"new-profile.jpg"}`
	req := httptest.NewRequest("PUT", "/users/1", bytes.NewBufferString(body))
	req.SetPathValue("userId", "1")
	req = setUserID(req, "1")

	w := httptest.NewRecorder()
	uc.updateUser(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("Expected status 204, got %d", w.Code)
	}
	if !mockUser.updateUserCalled {
		t.Errorf("Expected UpdateUser to be called")
	}
	if mockImage.verifyCalled != 1 {
		t.Errorf("Expected VerifyUpload to be called 1 time, got %d", mockImage.verifyCalled)
	}
	if mockImage.consumeCalled != 1 {
		t.Errorf("Expected ConsumeUpload to be called 1 time, got %d", mockImage.consumeCalled)
	}
	if mockImage.deleteCalled != 1 {
		t.Errorf("Expected DeleteImage to be called 1 time, got %d", mockImage.deleteCalled)
	}
	if len(mockImage.deletedImages) > 0 && mockImage.deletedImages[0] != "old-profile.jpg" {
		t.Errorf("Expected deleted image to be old-profile.jpg, got %s", mockImage.deletedImages[0])
	}
	if !mockAuth.getSessionsCalled {
		t.Errorf("Expected GetSessions to be called")
	}
}
