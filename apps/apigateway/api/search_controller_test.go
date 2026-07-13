package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pb "cogito/apigateway/genproto"
)

type fakeSearchServiceClient struct {
	pb.SearchServiceClient

	usersRes    *pb.Users
	usersErr    error
	postsRes    *pb.Posts
	postsErr    error
	hashtagsRes *pb.Hashtags
	hashtagsErr error

	gotUsersReq, gotPostsReq, gotHashtagsReq *pb.SearchRequest
}

func (f *fakeSearchServiceClient) SearchUsers(ctx context.Context, in *pb.SearchRequest, opts ...grpc.CallOption) (*pb.Users, error) {
	f.gotUsersReq = in
	return f.usersRes, f.usersErr
}

func (f *fakeSearchServiceClient) SearchPosts(ctx context.Context, in *pb.SearchRequest, opts ...grpc.CallOption) (*pb.Posts, error) {
	f.gotPostsReq = in
	return f.postsRes, f.postsErr
}

func (f *fakeSearchServiceClient) SearchHashtags(ctx context.Context, in *pb.SearchRequest, opts ...grpc.CallOption) (*pb.Hashtags, error) {
	f.gotHashtagsReq = in
	return f.hashtagsRes, f.hashtagsErr
}

func newTestSearchController(fake *fakeSearchServiceClient) *searchController {
	postClient := &mockBatchPostClient{}
	userClient := &mockBatchUserClient{users: map[int32]*pb.User{
		1: {Id: 1, Username: "alice"},
	}}
	pc := &postController{client: postClient, userClient: userClient}
	return newSearchController(fake, pc)
}

func TestSearchAll_HappyPathBlendsAllThreeTypes(t *testing.T) {
	fake := &fakeSearchServiceClient{
		usersRes:    &pb.Users{Users: []*pb.User{{Id: 1, Username: "alice"}}, NextCursor: "u-next"},
		postsRes:    &pb.Posts{Posts: []*pb.Post{{Id: 10, UserId: 1}, {Id: 11, UserId: 1}, {Id: 12, UserId: 1}}, NextCursor: "p-next"},
		hashtagsRes: &pb.Hashtags{Hashtags: []*pb.Hashtag{{Id: 100, Name: "golang"}}, NextCursor: "h-next"},
	}
	sc := newTestSearchController(fake)

	req := httptest.NewRequest("GET", "/search?q=test&type=all&limit=5", nil)
	req = setUserID(req, "1")
	w := httptest.NewRecorder()
	sc.search(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	if fake.gotUsersReq == nil || fake.gotUsersReq.Limit != 1 {
		t.Errorf("expected SearchUsers called with limit=1, got %+v", fake.gotUsersReq)
	}
	if fake.gotPostsReq == nil || fake.gotPostsReq.Limit != 3 {
		t.Errorf("expected SearchPosts called with limit=3, got %+v", fake.gotPostsReq)
	}
	if fake.gotHashtagsReq == nil || fake.gotHashtagsReq.Limit != 1 {
		t.Errorf("expected SearchHashtags called with limit=1, got %+v", fake.gotHashtagsReq)
	}

	var body struct {
		Items []struct {
			Type string `json:"type"`
		} `json:"items"`
		NextCursor string `json:"nextCursor"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to decode response body: %v: %s", err, w.Body.String())
	}

	if len(body.Items) != 5 {
		t.Fatalf("expected 5 blended items, got %d", len(body.Items))
	}
	if body.NextCursor == "" {
		t.Fatal("expected a non-empty combined nextCursor")
	}
	got := decodeAllCursor(body.NextCursor)
	if got.Users != "u-next" || got.Posts != "p-next" || got.Hashtags != "h-next" {
		t.Errorf("decoded combined cursor = %+v, want per-type next cursors from each RPC", got)
	}
}

func TestSearchAll_PartialFailureIsolatesFailedType(t *testing.T) {
	fake := &fakeSearchServiceClient{
		usersRes:    &pb.Users{Users: []*pb.User{{Id: 1, Username: "alice"}}, NextCursor: "u-next"},
		postsRes:    &pb.Posts{Posts: []*pb.Post{{Id: 10, UserId: 1}}, NextCursor: "p-next"},
		hashtagsErr: status.Error(codes.Unavailable, "meilisearch down"),
	}
	sc := newTestSearchController(fake)

	req := httptest.NewRequest("GET", "/search?q=test&type=all&limit=5", nil)
	req = setUserID(req, "1")
	w := httptest.NewRecorder()
	sc.search(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 despite one failed type, got %d: %s", w.Code, w.Body.String())
	}

	var body struct {
		Items []struct {
			Type string `json:"type"`
		} `json:"items"`
		NextCursor string `json:"nextCursor"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to decode response body: %v: %s", err, w.Body.String())
	}

	if len(body.Items) != 2 {
		t.Fatalf("expected 2 items (users+posts only), got %d", len(body.Items))
	}
	for _, item := range body.Items {
		if item.Type == "hashtags" {
			t.Errorf("expected no hashtags items when SearchHashtags failed, got %+v", body.Items)
		}
	}

	got := decodeAllCursor(body.NextCursor)
	if got.Hashtags != "" {
		t.Errorf("expected the failed hashtags cursor component to stay unadvanced (empty), got %q", got.Hashtags)
	}
	if got.Users != "u-next" || got.Posts != "p-next" {
		t.Errorf("expected succeeding types' cursors to advance, got %+v", got)
	}
}

func TestSearchAll_AllThreeFailReturns503(t *testing.T) {
	unavailable := status.Error(codes.Unavailable, "meilisearch down")
	fake := &fakeSearchServiceClient{
		usersErr:    unavailable,
		postsErr:    unavailable,
		hashtagsErr: unavailable,
	}
	sc := newTestSearchController(fake)

	req := httptest.NewRequest("GET", "/search?q=test&type=all&limit=5", nil)
	req = setUserID(req, "1")
	w := httptest.NewRecorder()
	sc.search(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 when all three search types fail, got %d: %s", w.Code, w.Body.String())
	}
}

func TestSearch_InvalidTypeStill400(t *testing.T) {
	sc := newTestSearchController(&fakeSearchServiceClient{})

	req := httptest.NewRequest("GET", "/search?q=test&type=bogus", nil)
	req = setUserID(req, "1")
	w := httptest.NewRecorder()
	sc.search(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for an invalid type parameter, got %d: %s", w.Code, w.Body.String())
	}
}
