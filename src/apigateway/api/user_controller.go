package api

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
	"google.golang.org/grpc"

	pb "github.com/robbdimitrov/thoughts/src/apigateway/genproto"
)

type userController struct {
	addr     string
	authAddr string
}

func newUserController(addr string, authAddr string) *userController {
	return &userController{addr, authAddr}
}

func (s *userController) createUser(c echo.Context) error {
	conn, err := grpc.Dial(s.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewUserServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx = appendInternalAuth(ctx)
	defer cancel()

	var body struct {
		Name     string `json:"name"`
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(400, "Invalid request body")
	}

	req := pb.CreateUserRequest{
		Name:     body.Name,
		Username: body.Username,
		Email:    body.Email,
		Password: body.Password,
	}

	res, err := client.CreateUser(ctx, &req)
	if err != nil {
		log.Printf("Creating user failed: %v", err)
		return newHTTPError(err)
	}

	return c.JSON(201, map[string]int32{"id": res.Id})
}

func (s *userController) getUser(c echo.Context) error {
	conn, err := grpc.Dial(s.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewUserServiceClient(conn)

	userID, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		return echo.NewHTTPError(400)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, err = appendUserIDHeader(ctx, c)
	if err != nil {
		return err
	}
	defer cancel()

	req := pb.UserRequest{UserId: int32(userID)}

	res, err := client.GetUser(ctx, &req)
	if err != nil {
		log.Printf("Getting user failed: %v", err)
		return newHTTPError(err)
	}

	if getUserID(c) == c.Param("userId") {
		return c.JSON(200, mapCurrentUser(res))
	}
	return c.JSON(200, mapUser(res))
}

func (s *userController) getUserByUsername(c echo.Context) error {
	conn, err := grpc.Dial(s.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewUserServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, err = appendUserIDHeader(ctx, c)
	if err != nil {
		return err
	}
	defer cancel()

	req := pb.GetUserByUsernameRequest{Username: c.QueryParam("username")}

	res, err := client.GetUserByUsername(ctx, &req)
	if err != nil {
		log.Printf("Getting user by username failed: %v", err)
		return newHTTPError(err)
	}

	return c.JSON(200, mapUser(res))
}

func (s *userController) updateUser(c echo.Context) error {
	conn, err := grpc.Dial(s.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewUserServiceClient(conn)

	currentUserID := getUserID(c)
	if currentUserID != c.Param("userId") {
		return echo.NewHTTPError(403)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, err = appendUserIDHeader(ctx, c)
	if err != nil {
		return err
	}
	defer cancel()

	var body struct {
		Name        string `json:"name"`
		Username    string `json:"username"`
		Email       string `json:"email"`
		Bio         string `json:"bio"`
		Password    string `json:"password"`
		OldPassword string `json:"oldPassword"`
	}
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(400, "Invalid request body")
	}

	req := pb.UpdateUserRequest{
		Name:        body.Name,
		Username:    body.Username,
		Email:       body.Email,
		Bio:         body.Bio,
		Password:    body.Password,
		OldPassword: body.OldPassword,
	}

	_, err = client.UpdateUser(ctx, &req)
	if err != nil {
		log.Printf("Updating user failed: %v", err)
		return newHTTPError(err)
	}

	if body.Password != "" {
		authConn, err := grpc.Dial(s.authAddr, insecureCredentials(), grpc.WithBlock())
		if err == nil {
			defer authConn.Close()
			authClient := pb.NewAuthServiceClient(authConn)
			
			var currentSessionID string
			if cookie, err := c.Cookie("session"); err == nil {
				currentSessionID = cookie.Value
			}

			secret := os.Getenv("SESSION_HMAC_SECRET")
			if secret == "" {
				secret = "default-session-secret-change-me"
			}
			h := hmac.New(sha256.New, []byte(secret))
			h.Write([]byte(currentSessionID))
			currentHashedSessionID := base64.RawURLEncoding.EncodeToString(h.Sum(nil))

			userIDInt, _ := strconv.Atoi(currentUserID)
			sessionsRes, err := authClient.GetSessions(ctx, &pb.UserRequest{UserId: int32(userIDInt)})
			if err == nil {
				for _, sess := range sessionsRes.Sessions {
					if sess.Id != currentHashedSessionID {
						_, _ = authClient.DeleteSession(ctx, &pb.SessionRequest{SessionId: sess.Id})
					}
				}
			}
		}
	}

	return c.NoContent(204)
}

func (s *userController) getFollowing(c echo.Context) error {
	conn, err := grpc.Dial(s.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewUserServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, err = appendUserIDHeader(ctx, c)
	if err != nil {
		return err
	}
	defer cancel()

	userID, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		return echo.NewHTTPError(400)
	}
	page, limit, err := getPageAndLimit(c)
	if err != nil {
		return err
	}

	req := pb.GetUsersRequest{
		UserId: int32(userID),
		Page:   int32(page),
		Limit:  int32(limit),
	}

	res, err := client.GetFollowing(ctx, &req)
	if err != nil {
		log.Printf("Getting following failed: %v", err)
		return newHTTPError(err)
	}

	users := make([]user, len(res.Users))
	for i, v := range res.Users {
		users[i] = mapUser(v)
	}

	return c.JSON(200, map[string][]user{"items": users})
}

func (s *userController) searchUsers(c echo.Context) error {
	conn, err := grpc.Dial(s.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewUserServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, err = appendUserIDHeader(ctx, c)
	if err != nil {
		return err
	}
	defer cancel()

	query := c.QueryParam("q")
	_, limit, err := getPageAndLimit(c)
	if err != nil {
		return err
	}

	req := pb.SearchUsersRequest{
		Query: query,
		Limit: int32(limit),
	}

	res, err := client.SearchUsers(ctx, &req)
	if err != nil {
		log.Printf("Searching users failed: %v", err)
		return newHTTPError(err)
	}

	users := make([]user, len(res.Users))
	for i, v := range res.Users {
		users[i] = mapUser(v)
	}

	return c.JSON(200, map[string][]user{"items": users})
}

func (s *userController) getFollowers(c echo.Context) error {
	conn, err := grpc.Dial(s.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewUserServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, err = appendUserIDHeader(ctx, c)
	if err != nil {
		return err
	}
	defer cancel()

	userID, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		return echo.NewHTTPError(400)
	}
	page, limit, err := getPageAndLimit(c)
	if err != nil {
		return err
	}

	req := pb.GetUsersRequest{
		UserId: int32(userID),
		Page:   int32(page),
		Limit:  int32(limit),
	}

	res, err := client.GetFollowers(ctx, &req)
	if err != nil {
		log.Printf("Getting followers failed: %v", err)
		return newHTTPError(err)
	}

	users := make([]user, len(res.Users))
	for i, v := range res.Users {
		users[i] = mapUser(v)
	}

	return c.JSON(200, map[string][]user{"items": users})
}

func (s *userController) followUser(c echo.Context) error {
	conn, err := grpc.Dial(s.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewUserServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, err = appendUserIDHeader(ctx, c)
	if err != nil {
		return err
	}
	defer cancel()

	userID, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		return echo.NewHTTPError(400)
	}
	req := pb.UserRequest{UserId: int32(userID)}

	_, err = client.FollowUser(ctx, &req)
	if err != nil {
		log.Printf("Following user failed: %v", err)
		return newHTTPError(err)
	}

	return c.NoContent(204)
}

func (s *userController) unfollowUser(c echo.Context) error {
	conn, err := grpc.Dial(s.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewUserServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, err = appendUserIDHeader(ctx, c)
	if err != nil {
		return err
	}
	defer cancel()

	userID, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		return echo.NewHTTPError(400)
	}
	req := pb.UserRequest{UserId: int32(userID)}

	_, err = client.UnfollowUser(ctx, &req)
	if err != nil {
		log.Printf("Unfollowing user failed: %v", err)
		return newHTTPError(err)
	}

	return c.NoContent(204)
}
