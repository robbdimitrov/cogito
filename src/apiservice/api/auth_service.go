package api

import (
	"context"
	"time"

	"github.com/labstack/echo/v4"
	"google.golang.org/grpc"
	"google.golang.org/grpc/status"

	pb "github.com/robbdimitrov/thoughts/src/apiservice/genproto"
)

type authService struct {
	addr string
}

func newAuthService(addr string) *authService {
	return &authService{addr}
}

// Middleware

func (s *authService) validateSession() error {
	// TODO: Use as middleware - set header and cookie

	// cookie, err := c.Cookie("username")
	// if err != nil {
	// 	return err
	// }

	return nil
}

// Handlers

func (s *authService) createSession(c echo.Context) error {
	conn, err := grpc.Dial(s.addr, grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		return echo.NewHTTPError(500, err.Error())
	}
	defer conn.Close()
	client := pb.NewAuthServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	req := pb.Credentials{
		Email:    c.FormValue("email"),
		Password: c.FormValue("password"),
	}

	res, err := client.CreateSession(ctx, &req)
	if err != nil {
		s := status.Convert(err)
		return echo.NewHTTPError(getStatusCode(s), s.Proto().GetMessage())
	}

	createCookie(c, res.Id)
	return c.JSON(200, map[string]int32{"id": res.UserId})
}

func (s *authService) deleteSession(c echo.Context) error {
	conn, err := grpc.Dial(s.addr, grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		return echo.NewHTTPError(500, err.Error())
	}
	defer conn.Close()
	client := pb.NewAuthServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	req := pb.AuthRequest{}

	_, err = client.DeleteSession(ctx, &req)
	if err != nil {
		s := status.Convert(err)
		return echo.NewHTTPError(getStatusCode(s), s.Proto().GetMessage())
	}

	clearCookie(c)
	return c.NoContent(204)
}
