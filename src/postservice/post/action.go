package post

import (
	"context"

	pb "postservice/genproto"
)

// ActionServer is handling like and retweet actions of posts
type ActionServer struct{}

// NewActionServer creates a new server instance
func NewActionServer() *ActionServer {
	return &ActionServer{}
}

func (server *ActionServer) LikePost(context.Context, *pb.PostRequest) (*pb.Status, error) {

}

func (server *ActionServer) UnlikePost(context.Context, *pb.PostRequest) (*pb.Status, error) {

}

func (server *ActionServer) RetweetPost(context.Context, *pb.PostRequest) (*pb.Status, error) {

}

func (server *ActionServer) RemoveRetweet(context.Context, *pb.PostRequest) (*pb.Status, error) {

}
