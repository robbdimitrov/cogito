package api

import (
	"context"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
	"google.golang.org/grpc"
	"google.golang.org/grpc/status"

	pb "github.com/robbdimitrov/thoughts/src/apiservice/genproto"
)

type userService struct {
	addr string
}

func newUserService(addr string) *userService {
	return &userService{addr}
}

// Handlers

func (s *userService) createUser(c echo.Context) error {
	conn, err := grpc.Dial(s.addr, grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		return echo.NewHTTPError(500, err.Error())
	}
	defer conn.Close()
	client := pb.NewUserServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	req := pb.CreateUserRequest{
		Name:     c.FormValue("name"),
		Username: c.FormValue("username"),
		Email:    c.FormValue("email"),
		Password: c.FormValue("password"),
	}

	res, err := client.CreateUser(ctx, &req)
	if err != nil {
		s := status.Convert(err)
		return echo.NewHTTPError(getStatusCode(s), s.Proto().GetMessage())
	}

	return c.JSON(201, map[string]int32{"id": res.UserId})
}

func (s *userService) updateUser(c echo.Context) error {
	return c.NoContent(204)
}

func (s *userService) getUser(c echo.Context) error {
	conn, err := grpc.Dial(s.addr, grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		return echo.NewHTTPError(500, err.Error())
	}
	defer conn.Close()
	client := pb.NewUserServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	userID, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		return echo.NewHTTPError(500, err.Error())
	}
	req := pb.UserRequest{UserId: int32(userID)}

	res, err := client.GetUser(ctx, &req)
	if err != nil {
		s := status.Convert(err)
		return echo.NewHTTPError(getStatusCode(s), s.Proto().GetMessage())
	}

	return c.JSON(200, mapUser(res))
}

func (s *userService) getFollowing(c echo.Context) error {
	// path --> name := c.Param("name")
	// query --> name := c.QueryParam("name")
	return c.JSON(200, map[string][]user{"items": {}})
}

func (s *userService) getFollowers(c echo.Context) error {
	return c.JSON(200, map[string][]user{"items": {}})
}

func (s *userService) followUser(c echo.Context) error {
	return c.NoContent(204)
}

func (s *userService) unfollowUser(c echo.Context) error {
	return c.NoContent(204)
}
