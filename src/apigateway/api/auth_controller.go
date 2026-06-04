package api

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pb "github.com/robbdimitrov/thoughts/src/apigateway/genproto"
)

type authController struct {
	client pb.AuthServiceClient
}

func newAuthController(addr string) *authController {
	conn, _ := grpc.NewClient(addr, insecureCredentials())
	return &authController{pb.NewAuthServiceClient(conn)}
}

func (ac *authController) createSession(w http.ResponseWriter, r *http.Request) {
	client := ac.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx = appendInternalAuth(ctx)
	defer cancel()

	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid request body", 400)
		return
	}

	req := pb.Credentials{
		Email:    body.Email,
		Password: body.Password,
	}

	res, err := client.CreateSession(ctx, &req)
	if err != nil {
		log.Printf("Creating session failed: %v", err)
		grpcError(w, err)
		return
	}

	createCookie(w, res.Id)
	jsonResponse(w, 200, map[string]int32{"id": res.UserId})
}

func (ac *authController) validateSession(w http.ResponseWriter, r *http.Request) (*http.Request, error) {
	cookie, err := r.Cookie("session")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return nil, err
	}

	client := ac.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx = appendInternalAuth(ctx)
	defer cancel()

	req := pb.SessionRequest{SessionId: cookie.Value}

	res, err := client.GetSession(ctx, &req)
	if err != nil {
		log.Printf("Validating session failed: %v", err)
		s := status.Convert(err)
		if s.Code() == codes.Unauthenticated {
			clearCookie(w)
		}
		grpcError(w, err)
		return nil, err
	}

	createCookie(w, res.Id)
	r = setUserID(r, strconv.Itoa(int(res.UserId)))

	return r, nil
}

func (ac *authController) deleteSession(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	client := ac.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx = appendInternalAuth(ctx)
	defer cancel()

	req := pb.SessionRequest{SessionId: cookie.Value}

	_, err = client.DeleteSession(ctx, &req)
	if err != nil {
		log.Printf("Deleting session failed: %v", err)
		grpcError(w, err)
		return
	}

	clearCookie(w)
	w.WriteHeader(204)
}

func (ac *authController) deleteSessionByID(w http.ResponseWriter, r *http.Request) {
	sessionID := r.PathValue("sessionId")
	if sessionID == "" {
		http.Error(w, "Session ID is required", 400)
		return
	}

	client := ac.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx = appendInternalAuth(ctx)
	defer cancel()

	sess, err := client.GetSession(ctx, &pb.SessionRequest{SessionId: sessionID})
	if err != nil {
		log.Printf("Getting session for ownership check failed: %v", err)
		grpcError(w, err)
		return
	}

	userIDStr := getUserID(r)
	userID, err := strconv.ParseInt(userIDStr, 10, 32)
	if err != nil || userID == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if sess.UserId != int32(userID) {
		http.Error(w, "Cannot delete another user's session", http.StatusForbidden)
		return
	}

	_, err = client.DeleteSession(ctx, &pb.SessionRequest{SessionId: sessionID})
	if err != nil {
		log.Printf("Deleting session by ID failed: %v", err)
		grpcError(w, err)
		return
	}

	w.WriteHeader(204)
}

func (ac *authController) getSessions(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	client := ac.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx = appendInternalAuth(ctx)
	defer cancel()

	validateReq := pb.SessionRequest{SessionId: cookie.Value}
	validateRes, err := client.GetSession(ctx, &validateReq)
	if err != nil {
		log.Printf("Validating session failed: %v", err)
		s := status.Convert(err)
		if s.Code() == codes.Unauthenticated {
			clearCookie(w)
		}
		grpcError(w, err)
		return
	}

	req := pb.UserRequest{UserId: validateRes.UserId}
	res, err := client.GetSessions(ctx, &req)
	if err != nil {
		log.Printf("Getting sessions failed: %v", err)
		grpcError(w, err)
		return
	}

	sessions := make([]session, len(res.Sessions))
	for i, s := range res.Sessions {
		sessions[i] = session{
			ID:      s.Id,
			UserID:  s.UserId,
			Created: s.Created,
		}
	}

	jsonResponse(w, 200, map[string]interface{}{
		"sessions":         sessions,
		"currentSessionId": cookie.Value,
		"userId":           validateRes.UserId,
	})
}
