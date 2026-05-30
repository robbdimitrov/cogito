package api

import (
	"context"
	"net/http"
	"os"
	"time"

	"github.com/labstack/echo/v4"
	"google.golang.org/grpc/metadata"
)

const defaultInternalGRPCToken = "dev-internal-grpc-token"

func getUserID(c echo.Context) string {
	v, ok := c.Get("userId").(string)
	if !ok {
		return ""
	}
	return v
}

func setUserID(c echo.Context, userID string) {
	c.Set("userId", userID)
}

func appendUserIDHeader(ctx context.Context, c echo.Context) (context.Context, error) {
	uid := getUserID(c)
	if uid == "" {
		return nil, echo.NewHTTPError(401)
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

func createCookie(c echo.Context, sessionID string) {
	cookie := &http.Cookie{
		Name:     "session",
		Value:    sessionID,
		Path:     "/",
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HttpOnly: true,
		Secure:   os.Getenv("COOKIE_SECURE") == "true",
		SameSite: http.SameSiteStrictMode,
	}
	c.SetCookie(cookie)
}

func clearCookie(c echo.Context) {
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
	c.SetCookie(cookie)
}
