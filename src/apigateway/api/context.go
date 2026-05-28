package api

import (
	"context"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"google.golang.org/grpc/metadata"
)

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
	return metadata.AppendToOutgoingContext(ctx, "user-id", uid), nil
}

func createCookie(c echo.Context, sessionID string) {
	cookie := &http.Cookie{
		Name:     "session",
		Value:    sessionID,
		Path:     "/",
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HttpOnly: true,
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
		SameSite: http.SameSiteStrictMode,
	}
	c.SetCookie(cookie)
}
