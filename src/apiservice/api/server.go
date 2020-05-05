package api

import (
	"log"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

// CreateServer creates and setups new Echo instance
func CreateServer(addrs ...string) *echo.Echo {
	e := echo.New()
	r := newRouter(addrs...)

	e.HideBanner = true
	e.HidePort = true

	e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) (err error) {
			req := c.Request()
			log.Printf("Request %s %s", req.Method, req.RequestURI)
			return
		}
	})

	e.Use(middleware.Recover())
	r.configureRoutes(e)

	return e
}
