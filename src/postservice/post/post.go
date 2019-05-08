package post

import (
	"context"

	pb "postservice/genproto"
)

// Service is handling post-related grpc calls
type Service struct {
	dbClient *DbClient
}

// NewService creates a new server instance
func NewService(dbClient *DbClient) *Service {
	return &Service{dbClient}
}

// CreatePost creates a new Post object
func (s *Service) CreatePost(ctx context.Context, req *pb.Post) (*pb.PostStatus, error) {

}

// GetPost returns a Post object with the id passed from the request
func (s *Service) GetPost(ctx context.Context, req *pb.PostRequest) (*pb.PostStatus, error) {

}

// GetPosts returns posts and retweets of user
func (s *Service) GetPosts(ctx context.Context, req *pb.UserRequest) (*pb.Posts, error) {

}

// GetLikedPosts returns posts liked by the user
func (s *Service) GetLikedPosts(ctx context.Context, req *pb.UserRequest) (*pb.Posts, error) {

}

// DeletePost deletes a post owned by the user
func (s *Service) DeletePost(ctx context.Context, req *pb.PostRequest) (*pb.Status, error) {

}
