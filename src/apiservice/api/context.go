package api

import (
	"context"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"google.golang.org/grpc/metadata"
)

func getUserID(c echo.Context) string {
	return c.Get("userId").(string)
}

func setUserID(c echo.Context, userID string) {
	c.Set("userId", userID)
}

func appendUserIDHeader(ctx context.Context, c echo.Context) context.Context {
	return metadata.AppendToOutgoingContext(ctx, "user-id", getUserID(c))
}

func createCookie(c echo.Context, sessionID string) {
	cookie := &http.Cookie{
		Name:     "session",
		Value:    sessionID,
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	}
	c.SetCookie(cookie)
}

func clearCookie(c echo.Context) {
	cookie := &http.Cookie{
		Name:   "session",
		Value:  "",
		MaxAge: 0,
	}
	c.SetCookie(cookie)
}
