package api

import (
	"log"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

// CreateServer creates and setups new Echo instance
func CreateServer(addrs ...string) *echo.Echo {
	server := echo.New()
	router := newRouter(addrs...)

	server.HideBanner = true
	server.HidePort = true

	server.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			req := c.Request()
			log.Printf("Request %s %s", req.Method, req.RequestURI)
			return next(c)
		}
	})

	server.Use(middleware.Recover())
	server.Use(middleware.BodyLimit("2M"))
	server.Use(middleware.CSRFWithConfig(middleware.CSRFConfig{
		TokenLookup:    "header:X-CSRF-Token",
		CookieName:     "_csrf",
		CookieSameSite: http.SameSiteStrictMode,
	}))

	server.Use(authGuard(router.auth))
	router.configureRoutes(server)

	return server
}
