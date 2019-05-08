package post

import (
	"context"

	pb "postservice/genproto"
)

// PostServer is handling post-related grpc calls
type PostServer struct{}

// NewPostServer creates a new server instance
func NewPostServer() *PostServer {
	return &PostServer{}
}

// GetPost returns a Post object with the id passed from the request
func (server *PostServer) GetPost(context.Context, *pb.PostRequest) (*pb.PostStatus, error) {

}

// GetPosts returns posts and retweets of user
func (server *PostServer) GetPosts(context.Context, *pb.UserRequest) (*pb.Posts, error) {

}

// GetLikedPosts returns posts liked by the user
func (server *PostServer) GetLikedPosts(context.Context, *pb.UserRequest) (*pb.Posts, error) {

}

// DeletePost deletes a post owned by the user
func (server *PostServer) DeletePost(context.Context, *pb.PostRequest) (*pb.Status, error) {

}
