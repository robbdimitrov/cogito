package api

import (
	"context"
	"net/http"
	"os"
	"time"

	"google.golang.org/grpc/metadata"
)

const defaultInternalGRPCToken = "dev-internal-grpc-token"

type contextKey string

const userIDKey contextKey = "userId"

func getUserID(r *http.Request) string {
	v, ok := r.Context().Value(userIDKey).(string)
	if !ok {
		return ""
	}
	return v
}

func setUserID(r *http.Request, userID string) *http.Request {
	ctx := context.WithValue(r.Context(), userIDKey, userID)
	return r.WithContext(ctx)
}

func appendUserIDHeader(ctx context.Context, r *http.Request) (context.Context, error) {
	uid := getUserID(r)
	if uid == "" {
		return nil, os.ErrPermission
	}
	return appendInternalAuth(metadata.AppendToOutgoingContext(ctx, "user-id", uid)), nil
}

func appendInternalAuth(ctx context.Context) context.Context {
	token := os.Getenv("INTERNAL_GRPC_TOKEN")
	if token == "" {
		token = defaultInternalGRPCToken
	}
	return metadata.AppendToOutgoingContext(ctx, "internal-token", token)
}

func createCookie(w http.ResponseWriter, sessionID string) {
	cookie := &http.Cookie{
		Name:     "session",
		Value:    sessionID,
		Path:     "/",
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HttpOnly: true,
		Secure:   os.Getenv("COOKIE_SECURE") == "true",
		SameSite: http.SameSiteStrictMode,
	}
	http.SetCookie(w, cookie)
}

func clearCookie(w http.ResponseWriter) {
	cookie := &http.Cookie{
		Name:     "session",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   os.Getenv("COOKIE_SECURE") == "true",
		SameSite: http.SameSiteStrictMode,
	}
	http.SetCookie(w, cookie)
}
