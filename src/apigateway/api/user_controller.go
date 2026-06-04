package api

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"google.golang.org/grpc"

	pb "github.com/robbdimitrov/thoughts/src/apigateway/genproto"
)

type userController struct {
	client     pb.UserServiceClient
	authClient pb.AuthServiceClient
	imgClient  pb.ImageServiceClient
}

func newUserController(addr string, authAddr string, imageAddr string) *userController {
	conn, _ := grpc.NewClient(addr, insecureCredentials())
	authConn, _ := grpc.NewClient(authAddr, insecureCredentials())
	var imgClient pb.ImageServiceClient
	if imageAddr != "" {
		imgConn, _ := grpc.NewClient(imageAddr, insecureCredentials())
		imgClient = pb.NewImageServiceClient(imgConn)
	}
	return &userController{
		client:     pb.NewUserServiceClient(conn),
		authClient: pb.NewAuthServiceClient(authConn),
		imgClient:  imgClient,
	}
}

func (s *userController) createUser(w http.ResponseWriter, r *http.Request) {
	client := s.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx = appendInternalAuth(ctx)
	defer cancel()

	var body struct {
		Name     string `json:"name"`
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid request body", 400)
		return
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
		grpcError(w, err)
		return
	}

	jsonResponse(w, 201, map[string]int32{"id": res.Id})
}

func (s *userController) getUser(w http.ResponseWriter, r *http.Request) {
	client := s.client

	userID, err := strconv.Atoi(r.PathValue("userId"))
	if err != nil {
		http.Error(w, "Invalid user ID", 400)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		cancel()
		return
	}
	defer cancel()

	req := pb.UserRequest{UserId: int32(userID)}

	res, err := client.GetUser(ctx, &req)
	if err != nil {
		log.Printf("Getting user failed: %v", err)
		grpcError(w, err)
		return
	}

	if getUserID(r) == r.PathValue("userId") {
		jsonResponse(w, 200, mapCurrentUser(res))
	} else {
		jsonResponse(w, 200, mapUser(res))
	}
}

func (s *userController) getUserByUsername(w http.ResponseWriter, r *http.Request) {
	client := s.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		cancel()
		return
	}
	defer cancel()

	req := pb.GetUserByUsernameRequest{Username: r.URL.Query().Get("username")}

	res, err := client.GetUserByUsername(ctx, &req)
	if err != nil {
		log.Printf("Getting user by username failed: %v", err)
		grpcError(w, err)
		return
	}

	jsonResponse(w, 200, mapUser(res))
}

func (s *userController) updateUser(w http.ResponseWriter, r *http.Request) {
	client := s.client

	currentUserID := getUserID(r)
	if currentUserID != r.PathValue("userId") {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		cancel()
		return
	}
	defer cancel()

	var body struct {
		Name            string  `json:"name"`
		Username        string  `json:"username"`
		Email           string  `json:"email"`
		Bio             string  `json:"bio"`
		Password        string  `json:"password"`
		OldPassword     string  `json:"oldPassword"`
		ProfilePhotoKey *string `json:"profilePhotoKey"`
		CoverPhotoKey   *string `json:"coverPhotoKey"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid request body", 400)
		return
	}

	userIDInt, _ := strconv.Atoi(currentUserID)

	// Fetch existing user to get old photos
	oldUserReq := pb.UserRequest{UserId: int32(userIDInt)}
	oldUserRes, err := client.GetUser(ctx, &oldUserReq)
	if err != nil {
		log.Printf("Getting old user failed: %v", err)
		grpcError(w, err)
		return
	}

	imgClient := s.imgClient
	if (body.ProfilePhotoKey != nil || body.CoverPhotoKey != nil) && imgClient != nil {

		if body.ProfilePhotoKey != nil && *body.ProfilePhotoKey != "" {
			_, err = imgClient.VerifyUpload(ctx, &pb.VerifyUploadRequest{Filename: *body.ProfilePhotoKey, UserId: int32(userIDInt)})
			if err != nil {
				grpcError(w, err)
				return
			}
		}
		if body.CoverPhotoKey != nil && *body.CoverPhotoKey != "" {
			_, err = imgClient.VerifyUpload(ctx, &pb.VerifyUploadRequest{Filename: *body.CoverPhotoKey, UserId: int32(userIDInt)})
			if err != nil {
				grpcError(w, err)
				return
			}
		}
	}
	req := pb.UpdateUserRequest{
		Name:        body.Name,
		Username:    body.Username,
		Email:       body.Email,
		Bio:         body.Bio,
		Password:    body.Password,
		OldPassword: body.OldPassword,
	}
	if body.ProfilePhotoKey != nil {
		req.ProfilePhotoKey = body.ProfilePhotoKey
	}
	if body.CoverPhotoKey != nil {
		req.CoverPhotoKey = body.CoverPhotoKey
	}

	_, err = client.UpdateUser(ctx, &req)
	if err != nil {
		log.Printf("Updating user failed: %v", err)
		grpcError(w, err)
		return
	}

	if imgClient != nil {
		if body.ProfilePhotoKey != nil {
			if *body.ProfilePhotoKey != "" {
				_, _ = imgClient.ConsumeUpload(ctx, &pb.ConsumeUploadRequest{Filename: *body.ProfilePhotoKey})
			}
			if oldUserRes.ProfilePhotoKey != "" && oldUserRes.ProfilePhotoKey != *body.ProfilePhotoKey {
				_, _ = imgClient.DeleteImage(ctx, &pb.DeleteImageRequest{Filename: oldUserRes.ProfilePhotoKey})
			}
		}
		if body.CoverPhotoKey != nil {
			if *body.CoverPhotoKey != "" {
				_, _ = imgClient.ConsumeUpload(ctx, &pb.ConsumeUploadRequest{Filename: *body.CoverPhotoKey})
			}
			if oldUserRes.CoverPhotoKey != "" && oldUserRes.CoverPhotoKey != *body.CoverPhotoKey {
				_, _ = imgClient.DeleteImage(ctx, &pb.DeleteImageRequest{Filename: oldUserRes.CoverPhotoKey})
			}
		}
	}

	if body.Password != "" {
		authClient := s.authClient
		if authClient != nil {

			var currentSessionID string
			if cookie, err := r.Cookie("session"); err == nil {
				currentSessionID = cookie.Value
			}

			secret := os.Getenv("SESSION_HMAC_SECRET")
			if secret == "" {
				secret = "default-session-secret-change-me"
			}
			h := hmac.New(sha256.New, []byte(secret))
			h.Write([]byte(currentSessionID))
			currentHashedSessionID := base64.RawURLEncoding.EncodeToString(h.Sum(nil))

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

	w.WriteHeader(204)
}

func (s *userController) getFollowing(w http.ResponseWriter, r *http.Request) {
	client := s.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		cancel()
		return
	}
	defer cancel()

	userID, err := strconv.Atoi(r.PathValue("userId"))
	if err != nil {
		http.Error(w, "Invalid user ID", 400)
		return
	}
	page, limit, err := getPageAndLimit(r)
	if err != nil {
		grpcError(w, err)
		return
	}

	req := pb.GetUsersRequest{
		UserId: int32(userID),
		Page:   int32(page),
		Limit:  int32(limit),
	}

	res, err := client.GetFollowing(ctx, &req)
	if err != nil {
		log.Printf("Getting following failed: %v", err)
		grpcError(w, err)
		return
	}

	users := make([]user, len(res.Users))
	for i, v := range res.Users {
		users[i] = mapUser(v)
	}

	jsonResponse(w, 200, map[string][]user{"items": users})
}

func (s *userController) searchUsers(w http.ResponseWriter, r *http.Request) {
	client := s.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		cancel()
		return
	}
	defer cancel()

	query := r.URL.Query().Get("q")
	_, limit, err := getPageAndLimit(r)
	if err != nil {
		grpcError(w, err)
		return
	}

	req := pb.SearchUsersRequest{
		Query: query,
		Limit: int32(limit),
	}

	res, err := client.SearchUsers(ctx, &req)
	if err != nil {
		log.Printf("Searching users failed: %v", err)
		grpcError(w, err)
		return
	}

	users := make([]user, len(res.Users))
	for i, v := range res.Users {
		users[i] = mapUser(v)
	}

	jsonResponse(w, 200, map[string][]user{"items": users})
}

func (s *userController) getFollowers(w http.ResponseWriter, r *http.Request) {
	client := s.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		cancel()
		return
	}
	defer cancel()

	userID, err := strconv.Atoi(r.PathValue("userId"))
	if err != nil {
		http.Error(w, "Invalid user ID", 400)
		return
	}
	page, limit, err := getPageAndLimit(r)
	if err != nil {
		grpcError(w, err)
		return
	}

	req := pb.GetUsersRequest{
		UserId: int32(userID),
		Page:   int32(page),
		Limit:  int32(limit),
	}

	res, err := client.GetFollowers(ctx, &req)
	if err != nil {
		log.Printf("Getting followers failed: %v", err)
		grpcError(w, err)
		return
	}

	users := make([]user, len(res.Users))
	for i, v := range res.Users {
		users[i] = mapUser(v)
	}

	jsonResponse(w, 200, map[string][]user{"items": users})
}

func (s *userController) followUser(w http.ResponseWriter, r *http.Request) {
	client := s.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		cancel()
		return
	}
	defer cancel()

	userID, err := strconv.Atoi(r.PathValue("userId"))
	if err != nil {
		http.Error(w, "Invalid user ID", 400)
		return
	}
	req := pb.UserRequest{UserId: int32(userID)}

	_, err = client.FollowUser(ctx, &req)
	if err != nil {
		log.Printf("Following user failed: %v", err)
		grpcError(w, err)
		return
	}

	w.WriteHeader(204)
}

func (s *userController) unfollowUser(w http.ResponseWriter, r *http.Request) {
	client := s.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		cancel()
		return
	}
	defer cancel()

	userID, err := strconv.Atoi(r.PathValue("userId"))
	if err != nil {
		http.Error(w, "Invalid user ID", 400)
		return
	}
	req := pb.UserRequest{UserId: int32(userID)}

	_, err = client.UnfollowUser(ctx, &req)
	if err != nil {
		log.Printf("Unfollowing user failed: %v", err)
		grpcError(w, err)
		return
	}

	w.WriteHeader(204)
}
