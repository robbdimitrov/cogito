package post

import (
	"context"
	"net/http"

	pb "postservice/genproto"
)

// ActionService is handling like and retweet actions of posts
type ActionService struct {
	dbClient   *DbClient
	authClient *AuthClient
}

// NewActionService creates a new server instance
func NewActionService(dbClient *DbClient, authClient *AuthClient) *ActionService {
	return &ActionService{dbClient, authClient}
}

// LikePost creates a like relationship between user and post
func (s *ActionService) LikePost(ctx context.Context, req *pb.PostRequest) (*pb.Status, error) {
	status, err := s.authClient.Validate(req.Token)
	if err != nil {
		return nil, err
	} else if status.Error.Code != 0 {
		return &pb.Status{Error: status.Error}, nil
	}

	err = s.dbClient.LikePost(req.PostId, status.UserId)
	if err != nil {
		retErr := pb.Error{Code: http.StatusBadRequest, Error: "BAD_REQUEST", Message: "Like post failed."}
		return &pb.Status{Error: &retErr}, err
	}
	return &pb.Status{Message: "Post liked."}, nil
}

// UnlikePost deletes a like relationship between user and post
func (s *ActionService) UnlikePost(ctx context.Context, req *pb.PostRequest) (*pb.Status, error) {
	status, err := s.authClient.Validate(req.Token)
	if err != nil {
		return nil, err
	} else if status.Error.Code != 0 {
		return &pb.Status{Error: status.Error}, nil
	}

	err = s.dbClient.UnlikePost(req.PostId, status.UserId)
	if err != nil {
		retErr := pb.Error{Code: http.StatusBadRequest, Error: "BAD_REQUEST", Message: "Unlike post failed."}
		return &pb.Status{Error: &retErr}, err
	}
	return &pb.Status{Message: "Post unliked."}, nil
}

// RetweetPost creates a retweet relationship between user and post
func (s *ActionService) RetweetPost(ctx context.Context, req *pb.PostRequest) (*pb.Status, error) {
	status, err := s.authClient.Validate(req.Token)
	if err != nil {
		return nil, err
	} else if status.Error.Code != 0 {
		return &pb.Status{Error: status.Error}, nil
	}

	err = s.dbClient.RetweetPost(req.PostId, status.UserId)
	if err != nil {
		retErr := pb.Error{Code: http.StatusBadRequest, Error: "BAD_REQUEST", Message: "Retweet post failed."}
		return &pb.Status{Error: &retErr}, err
	}
	return &pb.Status{Message: "Post retweeted."}, nil
}

// RemoveRetweet deletes a retweet relationship between user and post
func (s *ActionService) RemoveRetweet(ctx context.Context, req *pb.PostRequest) (*pb.Status, error) {
	status, err := s.authClient.Validate(req.Token)
	if err != nil {
		return nil, err
	} else if status.Error.Code != 0 {
		return &pb.Status{Error: status.Error}, nil
	}

	err = s.dbClient.RemoveRetweet(req.PostId, status.UserId)
	if err != nil {
		retErr := pb.Error{Code: http.StatusBadRequest, Error: "BAD_REQUEST", Message: "Retweet removal failed."}
		return &pb.Status{Error: &retErr}, err
	}
	return &pb.Status{Message: "Retweet deleted."}, nil
}
