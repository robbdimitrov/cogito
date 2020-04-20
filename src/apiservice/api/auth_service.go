package api

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

type authService struct {
	addr string
}

func newAuthService(addr string) *authService {
	return &authService{addr}
}

// Handlers

func (ct *authService) createSession(c echo.Context) error {
	return c.JSON(http.StatusOK, "CreateSession")
}

func (ct *authService) deleteSession(c echo.Context) error {
	return c.JSON(http.StatusOK, "DeleteSession")
}
