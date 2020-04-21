package api

import (
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

// CreateServer creates and setups new Echo instance
func CreateServer(addrs ...string) *echo.Echo {
	e := echo.New()
	r := newRouter(addrs...)

	e.HideBanner = true
	e.HidePort = true
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	r.configureRoutes(e)

	return e
}
