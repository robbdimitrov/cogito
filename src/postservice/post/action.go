package post

import (
	"context"

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
	} else if status.Error != nil {
		return &pb.Status{Error: status.Error}, nil
	}

	err = s.dbClient.LikePost(req.PostId, status.UserId)
	if err != nil {
		retErr := pb.Error{Code: 400, Error: "BAD_REQUEST", Message: "Like post failed."}
		return &pb.Status{Error: &retErr}, err
	}
	return &pb.Status{Message: "Successfully liked post."}, nil
}

// UnlikePost deletes a like relationship between user and post
func (s *ActionService) UnlikePost(ctx context.Context, req *pb.PostRequest) (*pb.Status, error) {
	status, err := s.authClient.Validate(req.Token)
	if err != nil {
		return nil, err
	} else if status.Error != nil {
		return &pb.Status{Error: status.Error}, nil
	}

	err = s.dbClient.UnlikePost(req.PostId, status.UserId)
	if err != nil {
		retErr := pb.Error{Code: 400, Error: "BAD_REQUEST", Message: "Unlike post failed."}
		return &pb.Status{Error: &retErr}, err
	}
	return &pb.Status{Message: "Successfully unliked post."}, nil
}

// RetweetPost creates a retweet relationship between user and post
func (s *ActionService) RetweetPost(ctx context.Context, req *pb.PostRequest) (*pb.Status, error) {
	status, err := s.authClient.Validate(req.Token)
	if err != nil {
		return nil, err
	} else if status.Error != nil {
		return &pb.Status{Error: status.Error}, nil
	}

	err = s.dbClient.RetweetPost(req.PostId, status.UserId)
	if err != nil {
		retErr := pb.Error{Code: 400, Error: "BAD_REQUEST", Message: "Retweet post failed."}
		return &pb.Status{Error: &retErr}, err
	}
	return &pb.Status{Message: "Successfully retweeted post."}, nil
}

// RemoveRetweet deletes a retweet relationship between user and post
func (s *ActionService) RemoveRetweet(ctx context.Context, req *pb.PostRequest) (*pb.Status, error) {
	status, err := s.authClient.Validate(req.Token)
	if err != nil {
		return nil, err
	} else if status.Error != nil {
		return &pb.Status{Error: status.Error}, nil
	}

	err = s.dbClient.RemoveRetweet(req.PostId, status.UserId)
	if err != nil {
		retErr := pb.Error{Code: 400, Error: "BAD_REQUEST", Message: "Retweet removal failed."}
		return &pb.Status{Error: &retErr}, err
	}
	return &pb.Status{Message: "Successfully removed retweet post."}, nil
}
