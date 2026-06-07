package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"google.golang.org/grpc"

	pb "github.com/robbdimitrov/thoughts/src/apigateway/genproto"
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
