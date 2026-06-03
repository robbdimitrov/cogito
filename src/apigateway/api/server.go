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
	server.Use(middleware.Secure())
	server.Use(middleware.BodyLimit("2M"))
	server.Use(middleware.CSRFWithConfig(middleware.CSRFConfig{
		TokenLookup:    "header:X-CSRF-Token",
		CookieName:     "_csrf",
		CookieSameSite: http.SameSiteStrictMode,
		CookieHTTPOnly: false,
		Skipper: func(c echo.Context) bool {
			for _, v := range []route{
				{method: "POST", path: "/sessions"},
				{method: "POST", path: "/users"},
				{method: "GET", path: "/"},
			} {
				if c.Request().Method == v.method && c.Request().URL.Path == v.path {
					return true
				}
			}
			return false
		},
	}))

	rlStore := NewPostgresRateLimiterStore(5, 0.5)
	server.Use(middleware.RateLimiterWithConfig(middleware.RateLimiterConfig{
		Store: rlStore,
		IdentifierExtractor: func(c echo.Context) (string, error) {
			return c.RealIP(), nil
		},
		ErrorHandler: func(c echo.Context, err error) error {
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		},
		DenyHandler: func(c echo.Context, identifier string, err error) error {
			return echo.NewHTTPError(http.StatusTooManyRequests, "Too many requests")
		},
		Skipper: func(c echo.Context) bool {
			req := c.Request()
			if req.Method == "POST" && (req.URL.Path == "/sessions" || req.URL.Path == "/users") {
				return false
			}
			return true
		},
	}))

	server.Use(authGuard(router.auth))
	router.configureRoutes(server)

	return server
}
