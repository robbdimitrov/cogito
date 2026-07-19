package api

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"os"
	"time"

	"google.golang.org/grpc/metadata"
)

const defaultInternalGRPCToken = "dev-internal-grpc-token"
const defaultSessionHMACSecret = "default-session-secret-change-me"

// ValidateSecrets warns when default secrets are in use and exits in production.
// Call this from main before starting the server so os.Exit doesn't fire in tests.
func ValidateSecrets() {
	inProd := os.Getenv("APP_ENV") == "production"
	if internalGRPCToken() == defaultInternalGRPCToken {
		if inProd {
			slog.Error("INTERNAL_GRPC_TOKEN must be set in production")
			os.Exit(1)
		}
		slog.Warn("using default INTERNAL_GRPC_TOKEN — set env var before deploying")
	}
	if sessionHMACSecret() == defaultSessionHMACSecret {
		if inProd {
			slog.Error("SESSION_HMAC_SECRET must be set in production")
			os.Exit(1)
		}
		slog.Warn("using default SESSION_HMAC_SECRET — set env var before deploying")
	}
}

func internalGRPCToken() string {
	if token := os.Getenv("INTERNAL_GRPC_TOKEN"); token != "" {
		return token
	}
	return defaultInternalGRPCToken
}

func sessionHMACSecret() string {
	if secret := os.Getenv("SESSION_HMAC_SECRET"); secret != "" {
		return secret
	}
	return defaultSessionHMACSecret
}

// secureCookies is opt-in via COOKIE_SECURE=true; local deploys run over HTTP.
func secureCookies() bool {
	return os.Getenv("COOKIE_SECURE") == "true"
}

type contextKey string

const userIDKey contextKey = "userId"
const requestIDKey contextKey = "requestId"

func getRequestID(r *http.Request) string {
	return requestIDFromContext(r.Context())
}

func requestIDFromContext(ctx context.Context) string {
	v, ok := ctx.Value(requestIDKey).(string)
	if ok && v != "" {
		return v
	}
	if md, ok := metadata.FromOutgoingContext(ctx); ok {
		values := md.Get("x-request-id")
		if len(values) > 0 {
			return values[0]
		}
	}
	return ""
}

func setRequestID(r *http.Request, requestID string) *http.Request {
	ctx := context.WithValue(r.Context(), requestIDKey, requestID)
	return r.WithContext(ctx)
}

func newRequestID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return time.Now().Format("20060102150405.000000000")
	}
	return hex.EncodeToString(b[:])
}

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
	return appendInternalAuth(appendRequestIDHeader(metadata.AppendToOutgoingContext(ctx, "user-id", uid), r)), nil
}

// appendOptionalUserIDHeader attaches user-id metadata when present but never errors,
// for viewer-optional reads that degrade booleans like liked/followed instead of requiring a session.
func appendOptionalUserIDHeader(ctx context.Context, r *http.Request) context.Context {
	ctx = appendInternalAuthForRequest(ctx, r)
	if uid := getUserID(r); uid != "" {
		ctx = metadata.AppendToOutgoingContext(ctx, "user-id", uid)
	}
	return ctx
}

func appendInternalAuth(ctx context.Context) context.Context {
	return metadata.AppendToOutgoingContext(ctx, "internal-token", internalGRPCToken())
}

func appendInternalAuthForRequest(ctx context.Context, r *http.Request) context.Context {
	return appendInternalAuth(appendRequestIDHeader(ctx, r))
}

func appendRequestIDHeader(ctx context.Context, r *http.Request) context.Context {
	if requestID := getRequestID(r); requestID != "" {
		return metadata.AppendToOutgoingContext(ctx, "x-request-id", requestID)
	}
	return ctx
}

func createCookie(w http.ResponseWriter, sessionID string) {
	cookie := &http.Cookie{
		Name:     "session",
		Value:    sessionID,
		Path:     "/",
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HttpOnly: true,
		Secure:   secureCookies(),
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
		Secure:   secureCookies(),
		SameSite: http.SameSiteStrictMode,
	}
	http.SetCookie(w, cookie)
}
