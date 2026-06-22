package api

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"time"

	"unicode/utf8"

	pb "thoughts/apigateway/genproto"
)

type userController struct {
	client       pb.UserServiceClient
	authClient   pb.AuthServiceClient
	imgClient    pb.ImageServiceClient
	searchClient pb.SearchServiceClient
}

func newUserController(addr string, authAddr string, imageAddr string, searchClient pb.SearchServiceClient) *userController {
	conn, err := newGatewayClient(addr, "user")
	if err != nil {
		slog.Error("unable to create user client", "error", err)
		os.Exit(1)
	}
	authConn, err := newGatewayClient(authAddr, "auth")
	if err != nil {
		slog.Error("unable to create auth client", "error", err)
		os.Exit(1)
	}
	var imgClient pb.ImageServiceClient
	imageGRPCAddr := imageGRPCAddress(imageAddr)
	if imageGRPCAddr != "" {
		imgConn, err := newGatewayClient(imageGRPCAddr, "image-grpc")
		if err != nil {
			slog.Error("unable to create image client", "error", err)
			os.Exit(1)
		}
		imgClient = pb.NewImageServiceClient(imgConn)
	}
	return &userController{
		client:       pb.NewUserServiceClient(conn),
		authClient:   pb.NewAuthServiceClient(authConn),
		imgClient:    imgClient,
		searchClient: searchClient,
	}
}

func (s *userController) createUser(w http.ResponseWriter, r *http.Request) {
	client := s.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx = appendInternalAuthForRequest(ctx, r)
	defer cancel()

	var body struct {
		Name     string `json:"name"`
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if utf8.RuneCountInString(body.Name) > 255 || utf8.RuneCountInString(body.Username) > 255 || utf8.RuneCountInString(body.Email) > 255 {
		jsonError(w, http.StatusBadRequest, "Profile fields cannot exceed 255 characters")
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
		slog.Warn("creating user failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	jsonResponse(w, 201, map[string]int32{"id": res.Id})
}

func (s *userController) getUser(w http.ResponseWriter, r *http.Request) {
	client := s.client

	userID, err := strconv.Atoi(r.PathValue("userId"))
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	req := pb.UserRequest{UserId: int32(userID)}

	res, err := client.GetUser(ctx, &req)
	if err != nil {
		slog.Warn("getting user failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
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
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	req := pb.GetUserByUsernameRequest{Username: r.URL.Query().Get("username")}

	res, err := client.GetUserByUsername(ctx, &req)
	if err != nil {
		slog.Warn("getting user by username failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	jsonResponse(w, 200, mapUser(res))
}

func (s *userController) updateUser(w http.ResponseWriter, r *http.Request) {
	client := s.client

	currentUserID := getUserID(r)
	if currentUserID != r.PathValue("userId") {
		jsonError(w, http.StatusForbidden, "Forbidden")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
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
		jsonError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if utf8.RuneCountInString(body.Name) > 255 || utf8.RuneCountInString(body.Username) > 255 || utf8.RuneCountInString(body.Email) > 255 || utf8.RuneCountInString(body.Bio) > 255 {
		jsonError(w, http.StatusBadRequest, "Profile fields cannot exceed 255 characters")
		return
	}

	userIDInt, _ := strconv.Atoi(currentUserID)

	// Fetch existing user to get old photos
	oldUserReq := pb.UserRequest{UserId: int32(userIDInt)}
	oldUserRes, err := client.GetUser(ctx, &oldUserReq)
	if err != nil {
		slog.Warn("getting old user failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
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
		slog.Warn("updating user failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
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

			h := hmac.New(sha256.New, []byte(sessionHMACSecret()))
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
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	userID, err := strconv.Atoi(r.PathValue("userId"))
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid user ID")
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
		slog.Warn("getting following failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
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
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	query := r.URL.Query().Get("q")
	page, limit, err := getPageAndLimit(r)
	if err != nil {
		grpcError(w, err)
		return
	}

	if s.searchClient != nil {
		searchCtx := appendInternalAuth(ctx)
		res, err := s.searchClient.SearchUsers(searchCtx, &pb.SearchRequest{
			Query:  query,
			Limit:  int32(limit),
			Offset: int32(page * limit),
		})
		if err != nil {
			slog.Warn("searching users failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
			grpcError(w, err)
			return
		}
		users := make([]user, len(res.Users))
		for i, v := range res.Users {
			users[i] = mapUser(v)
		}
		jsonResponse(w, 200, map[string][]user{"items": users})
		return
	}

	res, err := s.client.SearchUsers(ctx, &pb.SearchUsersRequest{
		Query: query,
		Limit: int32(limit),
	})
	if err != nil {
		slog.Warn("searching users failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
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
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	userID, err := strconv.Atoi(r.PathValue("userId"))
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid user ID")
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
		slog.Warn("getting followers failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
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
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	userID, err := strconv.Atoi(r.PathValue("userId"))
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}
	req := pb.UserRequest{UserId: int32(userID)}

	_, err = client.FollowUser(ctx, &req)
	if err != nil {
		slog.Warn("following user failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
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
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	userID, err := strconv.Atoi(r.PathValue("userId"))
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}
	req := pb.UserRequest{UserId: int32(userID)}

	_, err = client.UnfollowUser(ctx, &req)
	if err != nil {
		slog.Warn("unfollowing user failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	w.WriteHeader(204)
}
