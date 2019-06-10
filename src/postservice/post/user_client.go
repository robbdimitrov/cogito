package post

import (
	"context"
	"log"
	"time"

	"google.golang.org/grpc"

	pb "postservice/genproto"
)

// UserClient handles the connection to the user grpc service
type UserClient struct {
	address string
}

// NewUserClient creates a new UserClient instance
func NewUserClient(address string) *UserClient {
	return &UserClient{address}
}

// GetUser gets the user with username from the user grpc service
func (c *UserClient) GetUser(userID string) (*pb.UserStatus, error) {
	conn, err := grpc.Dial(c.address, grpc.WithInsecure())
	if err != nil {
		log.Panic("Error happened while establishing connection to the user server")
	}
	defer conn.Close()

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	client := pb.NewUserServiceClient(conn)
	status, err := client.GetUser(ctx, &pb.UserRequest{UserId: userID})
	if err != nil {
		return nil, err
	}
	return status, nil
}
