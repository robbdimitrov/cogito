package api

import (
	"log"

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

	server.Use(authGuard(router.auth))
	server.Use(middleware.Recover())
	router.configureRoutes(server)

	return server
}
