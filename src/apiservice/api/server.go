package api

import (
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

// CreateEcho creates and setups new Echo instance
func CreateEcho(addrs ...string) *echo.Echo {
	e := echo.New()

	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	r := newRouter(addrs...)
	r.configureRoutes(e)

	return e
}
