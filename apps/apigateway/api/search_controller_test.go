package api

import (
	"bytes"
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

	recentRes    *pb.RecentSearches
	recentErr    error
	recordErr    error
	deleteErr    error
	clearErr     error
	gotRecordReq *pb.RecordRecentSearchRequest
	gotDeleteReq *pb.DeleteRecentSearchRequest
	listCalled   bool
	clearCalled  bool
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

func (f *fakeSearchServiceClient) ListRecentSearches(ctx context.Context, in *pb.Empty, opts ...grpc.CallOption) (*pb.RecentSearches, error) {
	f.listCalled = true
	return f.recentRes, f.recentErr
}

func (f *fakeSearchServiceClient) RecordRecentSearch(ctx context.Context, in *pb.RecordRecentSearchRequest, opts ...grpc.CallOption) (*pb.Empty, error) {
	f.gotRecordReq = in
	return &pb.Empty{}, f.recordErr
}

func (f *fakeSearchServiceClient) DeleteRecentSearch(ctx context.Context, in *pb.DeleteRecentSearchRequest, opts ...grpc.CallOption) (*pb.Empty, error) {
	f.gotDeleteReq = in
	return &pb.Empty{}, f.deleteErr
}

func (f *fakeSearchServiceClient) ClearRecentSearches(ctx context.Context, in *pb.Empty, opts ...grpc.CallOption) (*pb.Empty, error) {
	f.clearCalled = true
	return &pb.Empty{}, f.clearErr
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

func TestListRecentSearchesMapsItems(t *testing.T) {
	fake := &fakeSearchServiceClient{recentRes: &pb.RecentSearches{Items: []*pb.RecentSearch{
		{Id: "01904d2e-7f4d-7c33-ae21-2f94737eaa10", Type: "users", User: &pb.User{Id: 1, Username: "alice", Name: "Alice"}},
		{Id: "01904d2e-7f4d-7c33-ae21-2f94737eaa11", Type: "hashtags", Hashtag: &pb.Hashtag{Id: 2, Name: "go", PostCount: 3}},
		{Id: "01904d2e-7f4d-7c33-ae21-2f94737eaa12", Type: "queries", Reference: "live flow"},
	}}}
	sc := newTestSearchController(fake)

	req := httptest.NewRequest(http.MethodGet, "/search/recent", nil)
	req = setUserID(req, "1")
	w := httptest.NewRecorder()
	sc.listRecentSearches(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var body []struct {
		ID   string          `json:"id"`
		Type string          `json:"type"`
		Item json.RawMessage `json:"item"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to decode body: %v", err)
	}
	if len(body) != 3 || body[2].Type != "queries" || string(body[2].Item) != `"live flow"` {
		t.Fatalf("unexpected recent search body: %+v", body)
	}
}

func TestRecordRecentSearchTrimsInput(t *testing.T) {
	fake := &fakeSearchServiceClient{}
	sc := newTestSearchController(fake)

	req := httptest.NewRequest(http.MethodPost, "/search/recent", bytes.NewBufferString(`{"type":" queries ","reference":" live flow "}`))
	req = setUserID(req, "1")
	w := httptest.NewRecorder()
	sc.recordRecentSearch(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d: %s", w.Code, w.Body.String())
	}
	if fake.gotRecordReq == nil || fake.gotRecordReq.Type != "queries" || fake.gotRecordReq.Reference != "live flow" {
		t.Fatalf("record request = %+v", fake.gotRecordReq)
	}
}

func TestRecordRecentSearchRejectsMalformedJSON(t *testing.T) {
	fake := &fakeSearchServiceClient{}
	sc := newTestSearchController(fake)

	req := httptest.NewRequest(http.MethodPost, "/search/recent", bytes.NewBufferString(`{`))
	req = setUserID(req, "1")
	w := httptest.NewRecorder()
	sc.recordRecentSearch(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
	if fake.gotRecordReq != nil {
		t.Fatal("malformed json reached gRPC client")
	}
}

func TestDeleteRecentSearchValidatesID(t *testing.T) {
	fake := &fakeSearchServiceClient{}
	sc := newTestSearchController(fake)

	req := httptest.NewRequest(http.MethodDelete, "/search/recent/not-a-uuid", nil)
	req.SetPathValue("id", "not-a-uuid")
	req = setUserID(req, "1")
	w := httptest.NewRecorder()
	sc.deleteRecentSearch(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
	if fake.gotDeleteReq != nil {
		t.Fatal("invalid id reached gRPC client")
	}
}

func TestDeleteRecentSearchMapsNotFound(t *testing.T) {
	const id = "01904d2e-7f4d-7c33-ae21-2f94737eaa10"
	fake := &fakeSearchServiceClient{deleteErr: status.Error(codes.NotFound, "Recent search not found.")}
	sc := newTestSearchController(fake)

	req := httptest.NewRequest(http.MethodDelete, "/search/recent/"+id, nil)
	req.SetPathValue("id", id)
	req = setUserID(req, "1")
	w := httptest.NewRecorder()
	sc.deleteRecentSearch(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
	if fake.gotDeleteReq == nil || fake.gotDeleteReq.Id != id {
		t.Fatalf("delete request = %+v", fake.gotDeleteReq)
	}
}

func TestClearRecentSearchesSucceeds(t *testing.T) {
	fake := &fakeSearchServiceClient{}
	sc := newTestSearchController(fake)

	req := httptest.NewRequest(http.MethodDelete, "/search/recent", nil)
	req = setUserID(req, "1")
	w := httptest.NewRecorder()
	sc.clearRecentSearches(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d: %s", w.Code, w.Body.String())
	}
	if !fake.clearCalled {
		t.Fatal("expected ClearRecentSearches to be called")
	}
}
