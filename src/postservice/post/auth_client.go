package post

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"google.golang.org/grpc"

	pb "postservice/genproto"
)

// AuthClient handles the connection to the authentication grpc service
type AuthClient struct {
	address string
}

// NewAuthClient creates a new AuthClient instance
func NewAuthClient(address string) *AuthClient {
	return &AuthClient{address: address}
}

// Validate checks the validity of the access token and returns userID or error
func (c *AuthClient) Validate(token string) (int32, error) {
	conn, err := grpc.Dial(c.address, grpc.WithInsecure())
	if err != nil {
		log.Panic("Error happened while eatablishing connection to the auth server")
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	client := pb.NewAuthServiceClient(conn)
	status, err := client.Validate(ctx, &pb.AuthRequest{Token: token})
	if err != nil || status.Error != nil {
		message := fmt.Sprintf("%s", status.Error)
		return 0, errors.New(message)
	}
	return status.UserId, nil
}
