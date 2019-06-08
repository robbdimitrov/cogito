package post

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	pb "postservice/genproto"
)

// Service is handling post-related grpc calls
type Service struct {
	dbClient   *DbClient
	authClient *AuthClient
	userClient *UserClient
}

// NewService creates a new server instance
func NewService(dbClient *DbClient, authClient *AuthClient, userClient *UserClient) *Service {
	return &Service{dbClient, authClient, userClient}
}

// CreatePost creates a new Post object
func (s *Service) CreatePost(ctx context.Context, req *pb.PostUpdates) (*pb.PostStatus, error) {
	status, err := s.authClient.Validate(req.Token)
	if err != nil {
		return nil, err
	} else if status.Error != nil {
		return &pb.PostStatus{Error: status.Error}, nil
	}

	post, err := s.dbClient.CreatePost(req.Content, status.UserId)
	if err != nil {
		retErr := pb.Error{Code: http.StatusBadRequest, Error: "BAD_REQUEST", Message: "Like post failed."}
		return &pb.PostStatus{Error: &retErr}, err
	}
	return &pb.PostStatus{Post: &post}, nil
}

// GetPost returns a Post object with the id passed from the request
func (s *Service) GetPost(ctx context.Context, req *pb.PostRequest) (*pb.PostStatus, error) {
	post, err := s.dbClient.GetPost(req.PostId)
	if err != nil {
		retErr := pb.Error{Code: http.StatusNotFound, Error: "NOT_FOUND", Message: "Post not found."}
		return &pb.PostStatus{Error: &retErr}, err
	}
	return &pb.PostStatus{Post: &post}, nil
}

// GetFeed returns posts and retweets of users followed by the user
func (s *Service) GetFeed(ctx context.Context, req *pb.DataRequest) (*pb.Posts, error) {
	status, err := s.authClient.Validate(req.Token)
	if err != nil {
		return nil, err
	} else if status.Error != nil {
		return &pb.Posts{}, errors.New(status.Error.Message)
	}

	posts, err := s.dbClient.GetFeed(status.UserId, req.Page, req.Limit)
	if err != nil {
		return &posts, err
	}
	return &posts, nil
}

// GetPosts returns posts and retweets of user
func (s *Service) GetPosts(ctx context.Context, req *pb.DataRequest) (*pb.Posts, error) {
	status, err := s.userClient.GetUser(req.Username)
	if err != nil {
		return nil, err
	} else if status.Error != nil {
		message := fmt.Sprintf("%s", status.Error)
		return nil, errors.New(message)
	}

	if req.CountOnly {
		count, err := s.dbClient.GetPostsCount(status.User.Id)
		if err != nil {
			return nil, err
		}
		return &pb.Posts{Count: count}, nil
	}

	posts, err := s.dbClient.GetPosts(status.User.Id, req.Page, req.Limit)
	if err != nil {
		return &posts, err
	}
	return &posts, nil
}

// GetLikedPosts returns posts liked by the user
func (s *Service) GetLikedPosts(ctx context.Context, req *pb.DataRequest) (*pb.Posts, error) {
	status, err := s.userClient.GetUser(req.Username)
	if err != nil {
		return nil, err
	} else if status.Error != nil {
		message := fmt.Sprintf("%s", status.Error)
		return nil, errors.New(message)
	}

	if req.CountOnly {
		count, err := s.dbClient.GetLikedPostsCount(status.User.Id)
		if err != nil {
			return nil, err
		}
		return &pb.Posts{Count: count}, nil
	}

	posts, err := s.dbClient.GetLikedPosts(status.User.Id, req.Page, req.Limit)
	if err != nil {
		return &posts, err
	}
	return &posts, nil
}

// DeletePost deletes a post owned by the user
func (s *Service) DeletePost(ctx context.Context, req *pb.PostRequest) (*pb.Status, error) {
	status, err := s.authClient.Validate(req.Token)
	if err != nil {
		return nil, err
	} else if status.Error != nil {
		return &pb.Status{Error: status.Error}, nil
	}

	post, _ := s.dbClient.GetPost(req.PostId)
	if post.UserId != status.UserId {
		retErr := pb.Error{Code: http.StatusForbidden, Error: "FORBIDDEN", Message: "This action is forbidden."}
		return &pb.Status{Error: &retErr}, err
	}

	err = s.dbClient.DeletePost(req.PostId)
	if err != nil {
		retErr := pb.Error{Code: http.StatusBadRequest, Error: "BAD_REQUEST", Message: "Deleting post failed."}
		return &pb.Status{Error: &retErr}, err
	}
	return &pb.Status{Message: "Post deleted."}, nil
}
