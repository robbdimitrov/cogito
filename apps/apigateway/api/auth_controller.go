package api

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pb "cogito/apigateway/genproto"
)

type authController struct {
	client         pb.AuthServiceClient
	throttle       LoginThrottle
	ipThreshold    int
	emailThreshold int
}

func newAuthController(addr string) *authController {
	conn, err := newGatewayClient(addr, "auth")
	if err != nil {
		slog.Error("unable to create auth client", "error", err)
		os.Exit(1)
	}
	var throttle LoginThrottle
	dt, err := NewDragonflyLoginThrottle()
	if err != nil {
		slog.Warn("login throttle unavailable, using noop", "error", err)
		throttle = NoopLoginThrottle{}
	} else {
		throttle = dt
	}
	return &authController{
		client:         pb.NewAuthServiceClient(conn),
		throttle:       throttle,
		ipThreshold:    envInt("THROTTLE_IP_FAILURES", 5),
		emailThreshold: envInt("THROTTLE_EMAIL_FAILURES", 50),
	}
}

func (ac *authController) createSession(w http.ResponseWriter, r *http.Request) {
	client := ac.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx = appendInternalAuthForRequest(ctx, r)
	defer cancel()

	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	keys := loginFailureKeys(r, body.Email)
	tctx, tcancel := context.WithTimeout(context.Background(), 2*time.Second)
	failures, err := ac.throttle.GetFailures(tctx, keys)
	tcancel()
	if err != nil {
		slog.Warn("login throttle unavailable, failing open", "request_id", getRequestID(r), "error", err)
		failures = nil
	}
	if loginRateLimited(failures, ac.ipThreshold, ac.emailThreshold) {
		jsonError(w, http.StatusTooManyRequests, "Too many requests")
		return
	}

	req := pb.Credentials{
		Email:    body.Email,
		Password: body.Password,
	}

	res, err := client.CreateSession(ctx, &req)
	if err != nil {
		slog.Warn("creating session failed", "request_id", getRequestID(r), "error_kind", status.Code(err).String())
		if status.Code(err) == codes.Unauthenticated {
			for _, key := range keys {
				rctx, rcancel := context.WithTimeout(context.Background(), 2*time.Second)
				if rerr := ac.throttle.RecordFailure(rctx, key); rerr != nil {
					slog.Warn("failed to record login failure", "request_id", getRequestID(r), "error", rerr)
				}
				rcancel()
			}
		}
		grpcError(w, err)
		return
	}

	cctx, ccancel := context.WithTimeout(context.Background(), 2*time.Second)
	if err := ac.throttle.Clear(cctx, keys); err != nil {
		slog.Warn("failed to clear login failures", "request_id", getRequestID(r), "error", err)
	}
	ccancel()

	createCookie(w, res.Id)
	jsonResponse(w, http.StatusOK, map[string]int32{"id": res.UserId})
}

func (ac *authController) validateSession(w http.ResponseWriter, r *http.Request) (*http.Request, error) {
	cookie, err := r.Cookie("session")
	if err != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		return nil, err
	}

	client := ac.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx = appendInternalAuthForRequest(ctx, r)
	defer cancel()

	req := pb.SessionRequest{SessionId: cookie.Value}

	res, err := client.GetSession(ctx, &req)
	if err != nil {
		slog.Warn("validating session failed", "request_id", getRequestID(r), "error_kind", status.Code(err).String())
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
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	client := ac.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx = appendInternalAuthForRequest(ctx, r)
	defer cancel()

	req := pb.SessionRequest{SessionId: cookie.Value}

	_, err = client.DeleteSession(ctx, &req)
	if err != nil {
		slog.Warn("deleting session failed", "request_id", getRequestID(r), "error_kind", status.Code(err).String())
		grpcError(w, err)
		return
	}

	clearCookie(w)
	w.WriteHeader(204)
}

func (ac *authController) deleteSessionByID(w http.ResponseWriter, r *http.Request) {
	sessionID := r.PathValue("sessionId")
	if sessionID == "" {
		jsonError(w, http.StatusBadRequest, "Session ID is required")
		return
	}

	client := ac.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx = appendInternalAuthForRequest(ctx, r)
	defer cancel()

	sess, err := client.GetSession(ctx, &pb.SessionRequest{SessionId: sessionID})
	if err != nil {
		slog.Warn("getting session for ownership check failed", "request_id", getRequestID(r), "error_kind", status.Code(err).String())
		grpcError(w, err)
		return
	}

	userIDStr := getUserID(r)
	userID, err := strconv.ParseInt(userIDStr, 10, 32)
	if err != nil || userID == 0 {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	if sess.UserId != int32(userID) {
		jsonError(w, http.StatusForbidden, "Cannot delete another user's session")
		return
	}

	_, err = client.DeleteSession(ctx, &pb.SessionRequest{SessionId: sessionID})
	if err != nil {
		slog.Warn("deleting session by id failed", "request_id", getRequestID(r), "error_kind", status.Code(err).String())
		grpcError(w, err)
		return
	}

	w.WriteHeader(204)
}

func (ac *authController) getSessions(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session")
	if err != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	client := ac.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx = appendInternalAuthForRequest(ctx, r)
	defer cancel()

	validateReq := pb.SessionRequest{SessionId: cookie.Value}
	validateRes, err := client.GetSession(ctx, &validateReq)
	if err != nil {
		slog.Warn("validating session failed", "request_id", getRequestID(r), "error_kind", status.Code(err).String())
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
		slog.Warn("getting sessions failed", "request_id", getRequestID(r), "error_kind", status.Code(err).String())
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
