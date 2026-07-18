package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pb "cogito/apigateway/genproto"
)

type mockPostServiceClient struct {
	pb.PostServiceClient
	deletePostCalled bool
	mediaKey         string
	errDelete        error
	errGet           error
}

func (m *mockPostServiceClient) GetPost(ctx context.Context, in *pb.PostRequest, opts ...grpc.CallOption) (*pb.Post, error) {
	return &pb.Post{MediaKey: m.mediaKey}, m.errGet
}

func (m *mockPostServiceClient) GetPosts(ctx context.Context, in *pb.GetPostsRequest, opts ...grpc.CallOption) (*pb.Posts, error) {
	return &pb.Posts{Posts: []*pb.Post{{MediaKey: m.mediaKey}}}, m.errGet
}

func (m *mockPostServiceClient) DeletePost(ctx context.Context, in *pb.PostRequest, opts ...grpc.CallOption) (*pb.Empty, error) {
	m.deletePostCalled = true
	return &pb.Empty{}, m.errDelete
}

type mockImageServiceClient struct {
	pb.ImageServiceClient
	deleteImageCalled bool
	deletedFilename   string
	errDelete         error
}

func (m *mockImageServiceClient) DeleteImage(ctx context.Context, in *pb.DeleteImageRequest, opts ...grpc.CallOption) (*pb.Empty, error) {
	m.deleteImageCalled = true
	m.deletedFilename = in.Filename
	return &pb.Empty{}, m.errDelete
}

type mockBatchPostClient struct {
	pb.PostServiceClient
	quotes              map[int32]*pb.Post
	requestedQuoteIDs   []int32
	getPostsByIDsCalled bool

	popularRes    *pb.Posts
	popularErr    error
	gotPopularReq *pb.GetPopularPostsRequest
}

func (m *mockBatchPostClient) GetPostsByIds(ctx context.Context, in *pb.Ids, opts ...grpc.CallOption) (*pb.Posts, error) {
	m.getPostsByIDsCalled = true
	m.requestedQuoteIDs = in.Ids
	var out []*pb.Post
	for _, id := range in.Ids {
		if q, ok := m.quotes[id]; ok {
			out = append(out, q)
		}
	}
	return &pb.Posts{Posts: out}, nil
}

func (m *mockBatchPostClient) GetPopularPosts(ctx context.Context, in *pb.GetPopularPostsRequest, opts ...grpc.CallOption) (*pb.Posts, error) {
	m.gotPopularReq = in
	return m.popularRes, m.popularErr
}

type mockBatchUserClient struct {
	pb.UserServiceClient
	users        map[int32]*pb.User
	requestedIDs []int32
	err          error
}

func (m *mockBatchUserClient) GetUsersByIds(ctx context.Context, in *pb.Ids, opts ...grpc.CallOption) (*pb.Users, error) {
	m.requestedIDs = in.Ids
	if m.err != nil {
		return nil, m.err
	}
	var out []*pb.User
	for _, id := range in.Ids {
		if u, ok := m.users[id]; ok {
			out = append(out, u)
		}
	}
	return &pb.Users{Users: out}, nil
}

func TestBuildPosts_EmbedsAuthorsAndQuotes(t *testing.T) {
	quote := &pb.Post{Id: 7, UserId: 3, Content: "quoted"}
	postClient := &mockBatchPostClient{quotes: map[int32]*pb.Post{7: quote}}
	userClient := &mockBatchUserClient{users: map[int32]*pb.User{
		1: {Id: 1, Username: "reposter"},
		2: {Id: 2, Username: "author"},
		3: {Id: 3, Username: "quoter"},
	}}
	pc := &postController{client: postClient, userClient: userClient}

	repostOfID := int32(5)
	original := &pb.Post{Id: 5, UserId: 2, QuoteOfId: 7}
	repost := &pb.Post{Id: 10, UserId: 1, RepostOfId: &repostOfID, RepostOf: original}

	got := pc.buildPosts(context.Background(), []*pb.Post{repost})

	if len(got) != 1 {
		t.Fatalf("expected 1 post, got %d", len(got))
	}
	// Reposter author embedded on the outer post.
	if got[0].User == nil || got[0].User.ID != 1 {
		t.Errorf("expected outer author 1, got %+v", got[0].User)
	}
	// Original author embedded on the nested repost.
	if got[0].RepostOf == nil || got[0].RepostOf.User == nil || got[0].RepostOf.User.ID != 2 {
		t.Errorf("expected repost author 2, got %+v", got[0].RepostOf)
	}
	// Quoted post resolved and its author embedded.
	if got[0].RepostOf.QuotePost == nil || got[0].RepostOf.QuotePost.ID != 7 {
		t.Fatalf("expected quoted post 7, got %+v", got[0].RepostOf.QuotePost)
	}
	if got[0].RepostOf.QuotePost.User == nil || got[0].RepostOf.QuotePost.User.ID != 3 {
		t.Errorf("expected quote author 3, got %+v", got[0].RepostOf.QuotePost.User)
	}
	// Quote resolution batched exactly the referenced id.
	if len(postClient.requestedQuoteIDs) != 1 || postClient.requestedQuoteIDs[0] != 7 {
		t.Errorf("expected quote ids [7], got %v", postClient.requestedQuoteIDs)
	}
	// Authors resolved in a single batch covering all three distinct users.
	if got := idSet(userClient.requestedIDs); !got[1] || !got[2] || !got[3] || len(got) != 3 {
		t.Errorf("expected author ids {1,2,3}, got %v", userClient.requestedIDs)
	}
}

func TestBuildPosts_NoQuotesSkipsQuoteCall(t *testing.T) {
	postClient := &mockBatchPostClient{}
	userClient := &mockBatchUserClient{users: map[int32]*pb.User{1: {Id: 1, Username: "a"}}}
	pc := &postController{client: postClient, userClient: userClient}

	got := pc.buildPosts(context.Background(), []*pb.Post{{Id: 1, UserId: 1}})

	if postClient.getPostsByIDsCalled {
		t.Errorf("GetPostsByIds should not be called when there are no quotes")
	}
	if got[0].User == nil || got[0].User.ID != 1 {
		t.Errorf("expected author 1, got %+v", got[0].User)
	}
}

func idSet(ids []int32) map[int32]bool {
	set := make(map[int32]bool, len(ids))
	for _, id := range ids {
		set[id] = true
	}
	return set
}

func TestDeletePost_ImageOrchestration(t *testing.T) {
	mockPost := &mockPostServiceClient{mediaKey: "test-image.jpg"}
	mockImage := &mockImageServiceClient{}

	pc := &postController{
		client:    mockPost,
		imgClient: mockImage,
	}

	req := httptest.NewRequest("DELETE", "/posts/123", nil)
	req.SetPathValue("postId", "123")
	req = setUserID(req, "1")

	w := httptest.NewRecorder()
	pc.deletePost(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("Expected status 204, got %d", w.Code)
	}
	if !mockPost.deletePostCalled {
		t.Errorf("Expected DeletePost to be called")
	}
	if !mockImage.deleteImageCalled {
		t.Errorf("Expected DeleteImage to be called")
	}
	if mockImage.deletedFilename != "test-image.jpg" {
		t.Errorf("Expected DeleteImage to be called with test-image.jpg, got %s", mockImage.deletedFilename)
	}
}

func TestDeletePost_ImageDeleteFailurePreservesPost(t *testing.T) {
	mockPost := &mockPostServiceClient{mediaKey: "test-image.jpg"}
	mockImage := &mockImageServiceClient{errDelete: status.Error(codes.Internal, "storage unavailable")}

	pc := &postController{
		client:    mockPost,
		imgClient: mockImage,
	}

	req := httptest.NewRequest("DELETE", "/posts/123", nil)
	req.SetPathValue("postId", "123")
	req = setUserID(req, "1")

	w := httptest.NewRecorder()
	pc.deletePost(w, req)

	if w.Code == http.StatusNoContent {
		t.Errorf("Expected deletePost to fail when image deletion fails")
	}
	if mockPost.deletePostCalled {
		t.Errorf("Expected DeletePost not to be called when image deletion fails, to avoid orphaning the image")
	}
}

func TestGetPost_NoSessionSucceeds(t *testing.T) {
	mockPost := &mockPostServiceClient{}
	pc := &postController{client: mockPost}

	req := httptest.NewRequest("GET", "/posts/123", nil)
	req.SetPathValue("postId", "123")
	// No setUserID call: simulates an anonymous visitor.

	w := httptest.NewRecorder()
	pc.getPost(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected anonymous getPost to succeed, got status %d: %s", w.Code, w.Body.String())
	}
}

func TestGetPosts_NoSessionSucceeds(t *testing.T) {
	mockPost := &mockPostServiceClient{}
	pc := &postController{client: mockPost}

	req := httptest.NewRequest("GET", "/users/123/posts", nil)
	req.SetPathValue("userId", "123")
	// No setUserID call: simulates an anonymous visitor.

	w := httptest.NewRecorder()
	pc.getPosts(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected anonymous getPosts to succeed, got status %d: %s", w.Code, w.Body.String())
	}
}
