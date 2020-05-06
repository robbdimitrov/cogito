package post

import (
	"context"
	"log"

	"google.golang.org/grpc/codes"

	pb "github.com/robbdimitrov/thoughts/src/postservice/genproto"
)

// controller is handling post-related grpc calls
type controller struct {
	dbClient *DbClient
}

// newController creates a new server instance
func newController(dbClient *DbClient) *controller {
	return &controller{dbClient}
}

// CreatePost creates a new Post object
func (c *controller) CreatePost(ctx context.Context, req *pb.CreatePostRequest) (*pb.CreatePostResponse, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	res, err := c.dbClient.CreatePost(req.Content, userID)
	if err != nil {
		log.Printf("Creating post failed: %v", err)
		return nil, newError(codes.Internal)
	}

	return &pb.CreatePostResponse{PostId: res}, nil
}

// GetPost returns a Post object with the id passed from the request
func (c *controller) GetPost(ctx context.Context, req *pb.PostRequest) (*pb.Post, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	res, err := c.dbClient.GetPost(req.PostId, userID)
	if err != nil {
		log.Printf("Getting post failed: %v", err)
		return nil, newError(codes.NotFound)
	}

	return res, nil
}

// GetFeed returns posts and retweets of users followed by the user
func (c *controller) GetFeed(ctx context.Context, req *pb.GetFeedRequest) (*pb.Posts, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	res, err := c.dbClient.GetFeed(userID, req.Page, req.Limit)
	if err != nil {
		log.Printf("Getting posts failed: %v", err)
		return nil, newError(codes.Internal)
	}

	return res, nil
}

// GetPosts returns posts and retweets of user
func (c *controller) GetPosts(ctx context.Context, req *pb.GetPostsRequest) (*pb.Posts, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	res, err := c.dbClient.GetPosts(req.UserId, req.Page, req.Limit, userID)
	if err != nil {
		log.Printf("Getting posts failed: %v", err)
		return nil, newError(codes.Internal)
	}

	return res, nil
}

// GetLikedPosts returns posts liked by the user
func (c *controller) GetLikedPosts(ctx context.Context, req *pb.GetPostsRequest) (*pb.Posts, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	res, err := c.dbClient.GetLikedPosts(req.UserId, req.Page, req.Limit, userID)
	if err != nil {
		log.Printf("Getting posts failed: %v", err)
		return nil, newError(codes.Internal)
	}

	return res, nil
}

// DeletePost deletes a post owned by the user
func (c *controller) DeletePost(ctx context.Context, req *pb.PostRequest) (*pb.Empty, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	if err := c.dbClient.DeletePost(req.PostId, userID); err != nil {
		log.Printf("Deleting post failed: %v", err)
		return nil, newError(codes.Internal)
	}

	return &pb.Empty{}, nil
}

// LikePost creates a like relationship between user and post
func (c *controller) LikePost(ctx context.Context, req *pb.PostRequest) (*pb.Empty, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	if err = c.dbClient.LikePost(req.PostId, userID); err != nil {
		log.Printf("Liking post failed: %v", err)
		return nil, newError(codes.Internal)
	}

	return &pb.Empty{}, nil
}

// UnlikePost deletes a like relationship between user and post
func (c *controller) UnlikePost(ctx context.Context, req *pb.PostRequest) (*pb.Empty, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	if err = c.dbClient.UnlikePost(req.PostId, userID); err != nil {
		log.Printf("Unliking post failed: %v", err)
		return nil, newError(codes.Internal)
	}

	return &pb.Empty{}, nil
}

// RetweetPost creates a retweet relationship between user and post
func (c *controller) RepostPost(ctx context.Context, req *pb.PostRequest) (*pb.Empty, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	if err = c.dbClient.RepostPost(req.PostId, userID); err != nil {
		log.Printf("Reposting post failed: %v", err)
		return nil, newError(codes.Internal)
	}

	return &pb.Empty{}, nil
}

// RemoveRetweet deletes a retweet relationship between user and post
func (c *controller) RemoveRepost(ctx context.Context, req *pb.PostRequest) (*pb.Empty, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	if err = c.dbClient.RemoveRepost(req.PostId, userID); err != nil {
		log.Printf("Removing repost failed: %v", err)
		return nil, newError(codes.Internal)
	}

	return &pb.Empty{}, nil
}
