package post

import (
	"context"
	"log"
	"time"

	"google.golang.org/grpc"

	pb "github.com/robbdimitrov/thoughts/src/postservice/genproto"
)

// AuthClient handles the connection to the authentication grpc service
type AuthClient struct {
	address string
}

// NewAuthClient creates a new AuthClient instance
func NewAuthClient(address string) *AuthClient {
	return &AuthClient{address}
}

// Validate checks the validity of the access token and returns userID or error
func (c *AuthClient) Validate(token string) (*pb.AuthStatus, error) {
	conn, err := grpc.Dial(c.address, grpc.WithInsecure())
	defer conn.Close()
	if err != nil {
		log.Panic("Error happened while establishing connection to the auth server")
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	client := pb.NewAuthServiceClient(conn)
	status, err := client.Validate(ctx, &pb.AuthRequest{Token: token})
	if err != nil {
		return nil, err
	}
	return status, nil
}
