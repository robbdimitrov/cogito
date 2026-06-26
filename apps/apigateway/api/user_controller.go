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
	"strings"
	"time"
	"unicode/utf8"

	pb "cogito/apigateway/genproto"
)

type userController struct {
	client       pb.UserServiceClient
	authClient   pb.AuthServiceClient
	imgClient    pb.ImageServiceClient
	searchClient pb.SearchServiceClient
}

func newUserController(userClient pb.UserServiceClient, authAddr string, imgClient pb.ImageServiceClient, searchClient pb.SearchServiceClient) *userController {
	authConn, err := newGatewayClient(authAddr, "auth")
	if err != nil {
		slog.Error("unable to create auth client", "error", err)
		os.Exit(1)
	}
	return &userController{
		client:       userClient,
		authClient:   pb.NewAuthServiceClient(authConn),
		imgClient:    imgClient,
		searchClient: searchClient,
	}
}

func (s *userController) createUser(w http.ResponseWriter, r *http.Request) {
	client := s.client

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
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

	if body.Email == "" || body.Password == "" {
		jsonError(w, http.StatusBadRequest, "Email and password are required")
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

	userID, err := strconv.ParseInt(r.PathValue("userId"), 10, 32)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
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

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
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

	currentUserID, _ := strconv.ParseInt(getUserID(r), 10, 32)
	if res.Id == int32(currentUserID) {
		jsonResponse(w, 200, mapCurrentUser(res))
	} else {
		jsonResponse(w, 200, mapUser(res))
	}
}

func (s *userController) updateUser(w http.ResponseWriter, r *http.Request) {
	client := s.client

	currentUserID := getUserID(r)
	if currentUserID != r.PathValue("userId") {
		jsonError(w, http.StatusForbidden, "Forbidden")
		return
	}

	baseCtx, errCtx := appendUserIDHeader(r.Context(), r)
	if errCtx != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var body struct {
		Name            *string `json:"name"`
		Username        *string `json:"username"`
		Email           *string `json:"email"`
		Bio             *string `json:"bio"`
		Password        string  `json:"password"`
		OldPassword     string  `json:"oldPassword"`
		ProfilePhotoKey *string `json:"profilePhotoKey"`
		CoverPhotoKey   *string `json:"coverPhotoKey"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	nameLen := 0
	if body.Name != nil {
		nameLen = utf8.RuneCountInString(*body.Name)
	}
	usernameLen := 0
	if body.Username != nil {
		usernameLen = utf8.RuneCountInString(*body.Username)
	}
	emailLen := 0
	if body.Email != nil {
		emailLen = utf8.RuneCountInString(*body.Email)
	}
	bioLen := 0
	if body.Bio != nil {
		bioLen = utf8.RuneCountInString(*body.Bio)
	}
	if nameLen > 255 || usernameLen > 255 || emailLen > 255 || bioLen > 255 {
		jsonError(w, http.StatusBadRequest, "Profile fields cannot exceed 255 characters")
		return
	}

	userIDInt, _ := strconv.Atoi(currentUserID)

	getCtx, getCancel := context.WithTimeout(baseCtx, 5*time.Second)
	oldUserRes, err := client.GetUser(getCtx, &pb.UserRequest{UserId: int32(userIDInt)})
	getCancel()
	if err != nil {
		slog.Warn("getting old user failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	imgClient := s.imgClient
	if (body.ProfilePhotoKey != nil || body.CoverPhotoKey != nil) && imgClient != nil {
		if body.ProfilePhotoKey != nil && *body.ProfilePhotoKey != "" {
			verCtx, verCancel := context.WithTimeout(baseCtx, 5*time.Second)
			_, err = imgClient.VerifyUpload(verCtx, &pb.VerifyUploadRequest{Filename: *body.ProfilePhotoKey, UserId: int32(userIDInt)})
			verCancel()
			if err != nil {
				grpcError(w, err)
				return
			}
		}
		if body.CoverPhotoKey != nil && *body.CoverPhotoKey != "" {
			verCtx, verCancel := context.WithTimeout(baseCtx, 5*time.Second)
			_, err = imgClient.VerifyUpload(verCtx, &pb.VerifyUploadRequest{Filename: *body.CoverPhotoKey, UserId: int32(userIDInt)})
			verCancel()
			if err != nil {
				grpcError(w, err)
				return
			}
		}
	}

	req := pb.UpdateUserRequest{
		Password:    body.Password,
		OldPassword: body.OldPassword,
	}
	if body.Name != nil {
		req.Name = body.Name
	}
	if body.Username != nil {
		req.Username = body.Username
	}
	if body.Email != nil {
		req.Email = body.Email
	}
	if body.Bio != nil {
		req.Bio = body.Bio
	}
	if body.ProfilePhotoKey != nil {
		req.ProfilePhotoKey = body.ProfilePhotoKey
	}
	if body.CoverPhotoKey != nil {
		req.CoverPhotoKey = body.CoverPhotoKey
	}

	updCtx, updCancel := context.WithTimeout(baseCtx, 10*time.Second)
	_, err = client.UpdateUser(updCtx, &req)
	updCancel()
	if err != nil {
		slog.Warn("updating user failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	if imgClient != nil {
		if body.ProfilePhotoKey != nil {
			if *body.ProfilePhotoKey != "" {
				cleanCtx, cleanCancel := context.WithTimeout(baseCtx, 5*time.Second)
				_, _ = imgClient.ConsumeUpload(cleanCtx, &pb.ConsumeUploadRequest{Filename: *body.ProfilePhotoKey})
				cleanCancel()
			}
			if oldUserRes.ProfilePhotoKey != "" && oldUserRes.ProfilePhotoKey != *body.ProfilePhotoKey {
				cleanCtx, cleanCancel := context.WithTimeout(baseCtx, 5*time.Second)
				_, _ = imgClient.DeleteImage(cleanCtx, &pb.DeleteImageRequest{Filename: oldUserRes.ProfilePhotoKey})
				cleanCancel()
			}
		}
		if body.CoverPhotoKey != nil {
			if *body.CoverPhotoKey != "" {
				cleanCtx, cleanCancel := context.WithTimeout(baseCtx, 5*time.Second)
				_, _ = imgClient.ConsumeUpload(cleanCtx, &pb.ConsumeUploadRequest{Filename: *body.CoverPhotoKey})
				cleanCancel()
			}
			if oldUserRes.CoverPhotoKey != "" && oldUserRes.CoverPhotoKey != *body.CoverPhotoKey {
				cleanCtx, cleanCancel := context.WithTimeout(baseCtx, 5*time.Second)
				_, _ = imgClient.DeleteImage(cleanCtx, &pb.DeleteImageRequest{Filename: oldUserRes.CoverPhotoKey})
				cleanCancel()
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

			sessCtx, sessCancel := context.WithTimeout(baseCtx, 5*time.Second)
			sessionsRes, err := authClient.GetSessions(sessCtx, &pb.UserRequest{UserId: int32(userIDInt)})
			if err == nil {
				for _, sess := range sessionsRes.Sessions {
					if sess.Id != currentHashedSessionID {
						_, _ = authClient.DeleteSession(sessCtx, &pb.SessionRequest{SessionId: sess.Id})
					}
				}
			}
			sessCancel()
		}
	}

	w.WriteHeader(204)
}

func (s *userController) getFollowing(w http.ResponseWriter, r *http.Request) {
	client := s.client

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	userID, err := strconv.ParseInt(r.PathValue("userId"), 10, 32)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}
	cursor, limit, err := getCursorAndLimit(r)
	if err != nil {
		grpcError(w, err)
		return
	}

	req := pb.GetUsersRequest{
		UserId: int32(userID),
		Cursor: cursor,
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

	jsonResponse(w, 200, map[string]any{"items": users, "nextCursor": res.NextCursor})
}

func (s *userController) searchUsers(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	query := strings.TrimSpace(r.URL.Query().Get("q"))
	if query == "" {
		jsonError(w, http.StatusBadRequest, "Missing query parameter")
		return
	}
	if utf8.RuneCountInString(query) > 255 {
		jsonError(w, http.StatusBadRequest, "Query exceeds maximum length")
		return
	}
	cursor, limit, err := getCursorAndLimit(r)
	if err != nil {
		grpcError(w, err)
		return
	}

	if s.searchClient != nil {
		searchCtx := appendInternalAuth(appendRequestIDHeader(ctx, r))
		res, err := s.searchClient.SearchUsers(searchCtx, &pb.SearchRequest{
			Query:  query,
			Limit:  int32(limit),
			Cursor: cursor,
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
		jsonResponse(w, http.StatusOK, map[string]any{"items": users, "nextCursor": res.NextCursor})
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

	slog.Info("user search in fallback mode, cursor-based pagination unavailable", "request_id", getRequestID(r))
	w.Header().Set("X-Pagination-Degraded", "true")
	jsonResponse(w, http.StatusOK, map[string]any{"items": users, "nextCursor": ""})
}

func (s *userController) getFollowers(w http.ResponseWriter, r *http.Request) {
	client := s.client

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	userID, err := strconv.ParseInt(r.PathValue("userId"), 10, 32)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}
	cursor, limit, err := getCursorAndLimit(r)
	if err != nil {
		grpcError(w, err)
		return
	}

	req := pb.GetUsersRequest{
		UserId: int32(userID),
		Cursor: cursor,
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

	jsonResponse(w, 200, map[string]any{"items": users, "nextCursor": res.NextCursor})
}

func (s *userController) followUser(w http.ResponseWriter, r *http.Request) {
	client := s.client

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	userID, err := strconv.ParseInt(r.PathValue("userId"), 10, 32)
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

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	userID, err := strconv.ParseInt(r.PathValue("userId"), 10, 32)
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
