package api

import (
	"context"
	"log"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
	"google.golang.org/grpc"

	pb "github.com/robbdimitrov/thoughts/src/apigateway/genproto"
)

type authController struct {
	addr string
}

func newAuthController(addr string) *authController {
	return &authController{addr}
}

func (ac *authController) createSession(c echo.Context) error {
	conn, err := grpc.Dial(ac.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewAuthServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10 * time.Second)
	defer cancel()

	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(400, "Invalid request body")
	}

	req := pb.Credentials{
		Email:    body.Email,
		Password: body.Password,
	}

	res, err := client.CreateSession(ctx, &req)
	if err != nil {
		log.Printf("Creating session failed: %v", err)
		return newHTTPError(err)
	}

	createCookie(c, res.Id)
	return c.JSON(200, map[string]int32{"id": res.UserId})
}

func (ac *authController) validateSession(c echo.Context) error {
	cookie, err := c.Cookie("session")
	if err != nil {
		return echo.NewHTTPError(401)
	}

	conn, err := grpc.Dial(ac.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewAuthServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10 * time.Second)
	defer cancel()

	req := pb.SessionRequest{SessionId: cookie.Value}

	res, err := client.GetSession(ctx, &req)
	if err != nil {
		log.Printf("Validating session failed: %v", err)
		clearCookie(c)
		return newHTTPError(err)
	}

	createCookie(c, res.Id)
	setUserID(c, strconv.Itoa(int(res.UserId)))

	return nil
}

func (ac *authController) deleteSession(c echo.Context) error {
	cookie, err := c.Cookie("session")
	if err != nil {
		return echo.NewHTTPError(401)
	}

	conn, err := grpc.Dial(ac.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewAuthServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req := pb.SessionRequest{SessionId: cookie.Value}

	_, err = client.DeleteSession(ctx, &req)
	if err != nil {
		log.Printf("Deleting session failed: %v", err)
		return newHTTPError(err)
	}

	clearCookie(c)
	return c.NoContent(204)
}

func (ac *authController) deleteSessionByID(c echo.Context) error {
	sessionID := c.Param("sessionId")
	if sessionID == "" {
		return echo.NewHTTPError(400, "Session ID is required")
	}

	conn, err := grpc.Dial(ac.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewAuthServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req := pb.SessionRequest{SessionId: sessionID}

	_, err = client.DeleteSession(ctx, &req)
	if err != nil {
		log.Printf("Deleting session by ID failed: %v", err)
		return newHTTPError(err)
	}

	return c.NoContent(204)
}

func (ac *authController) getSessions(c echo.Context) error {
	cookie, err := c.Cookie("session")
	if err != nil {
		return echo.NewHTTPError(401)
	}

	conn, err := grpc.Dial(ac.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewAuthServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	validateReq := pb.SessionRequest{SessionId: cookie.Value}
	validateRes, err := client.GetSession(ctx, &validateReq)
	if err != nil {
		log.Printf("Validating session failed: %v", err)
		clearCookie(c)
		return newHTTPError(err)
	}

	req := pb.UserRequest{UserId: validateRes.UserId}
	res, err := client.GetSessions(ctx, &req)
	if err != nil {
		log.Printf("Getting sessions failed: %v", err)
		return newHTTPError(err)
	}

	sessions := make([]session, len(res.Sessions))
	for i, s := range res.Sessions {
		sessions[i] = session{
			ID:      s.Id,
			UserID:  s.UserId,
			Created: s.Created,
		}
	}

	return c.JSON(200, map[string]interface{}{"sessions": sessions})
}
