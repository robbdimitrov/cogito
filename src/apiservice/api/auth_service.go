package api

import (
	"github.com/labstack/echo/v4"
)

type authService struct {
	addr string
}

func newAuthService(addr string) *authService {
	return &authService{addr}
}

// Add Header: 'user-id'

// Middleware

func (s *authService) validateSession() error {
	// TODO: Use as middleware - set header and cookie
	return nil
}

// Handlers

func (s *authService) createSession(c echo.Context) error {
	// TODO: Create session and return response
	return c.JSON(200, "CreateSession")
}

func (s *authService) deleteSession(c echo.Context) error {
	// TODO: Delete session and delete cookie
	return c.JSON(200, "DeleteSession")
}
