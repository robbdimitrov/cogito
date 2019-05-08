package post

import (
	"context"

	pb "postservice/genproto"
)

// ActionService is handling like and retweet actions of posts
type ActionService struct {
	dbClient *DbClient
}

// NewActionService creates a new server instance
func NewActionService(dbClient *DbClient) *ActionService {
	return &ActionService{dbClient}
}

// LikePost creates a like relationship between user and post
func (s *ActionService) LikePost(ctx context.Context, req *pb.PostRequest) (*pb.Status, error) {

}

// UnlikePost deletes a like relationship between user and post
func (s *ActionService) UnlikePost(ctx context.Context, req *pb.PostRequest) (*pb.Status, error) {

}

// RetweetPost creates a retweet relationship between user and post
func (s *ActionService) RetweetPost(ctx context.Context, req *pb.PostRequest) (*pb.Status, error) {

}

// RemoveRetweet deletes a retweet relationship between user and post
func (s *ActionService) RemoveRetweet(ctx context.Context, req *pb.PostRequest) (*pb.Status, error) {

}
