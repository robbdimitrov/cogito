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

	pb "github.com/robbdimitrov/thoughts/apps/apigateway/genproto"
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
		ProfilePhotoKey: m.oldProfileKey,
		CoverPhotoKey:   m.oldCoverKey,
	}, m.errGet
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
}

func (m *mockAuthServiceClient) GetSessions(ctx context.Context, in *pb.UserRequest, opts ...grpc.CallOption) (*pb.Sessions, error) {
	m.getSessionsCalled = true
	return &pb.Sessions{Sessions: m.sessions}, nil
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

	imageServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotUserID = r.Header.Get("x-user-id")
		gotRequestID = r.Header.Get("X-Request-ID")
		json.NewEncoder(w).Encode(map[string]string{"filename": "new-profile.jpg"})
	}))
	defer imageServer.Close()

	imageAddr := strings.TrimPrefix(imageServer.URL, "http://")
	router := &router{imageAddr: imageAddr}

	req := httptest.NewRequest("POST", "/uploads", bytes.NewBufferString("image-body"))
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
	if got := w.Header().Get("Cache-Control"); got != "" {
		t.Errorf("Expected upload response not to be cached, got %q", got)
	}
}

func TestImageFileProxy_ForwardsCacheAndValidatorHeaders(t *testing.T) {
	var gotPath string
	var gotMethod string

	imageServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotMethod = r.Method
		w.Header().Set("Cache-Control", "private, max-age=86400")
		w.Header().Set("Last-Modified", "Sat, 06 Jun 2026 10:00:00 GMT")
		w.WriteHeader(http.StatusOK)
	}))
	defer imageServer.Close()

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
	if got := w.Header().Get("Cache-Control"); got != "private, max-age=86400" {
		t.Errorf("Expected cache header to be forwarded, got %q", got)
	}
	if got := w.Header().Get("Last-Modified"); got != "Sat, 06 Jun 2026 10:00:00 GMT" {
		t.Errorf("Expected Last-Modified to be forwarded, got %q", got)
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

func TestUpdateUser_ImageAndSessionOrchestration(t *testing.T) {
	mockUser := &mockUserServiceClient{
		oldProfileKey: "old-profile.jpg",
		oldCoverKey:   "old-cover.jpg",
	}
	mockAuth := &mockAuthServiceClient{
		sessions: []*pb.Session{
			{Id: "current-hashed-session"},
			{Id: "other-session"},
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
