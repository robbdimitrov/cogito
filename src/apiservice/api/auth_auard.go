package api

import "github.com/labstack/echo/v4"

type route struct {
	method string
	path   string
}

var allowed = []route{
	{method: "POST", path: "/sessions"},
	{method: "DELETE", path: "/sessions"},
	{method: "POST", path: "/users"},
}

func authGuard(s *authService) func(echo.HandlerFunc) echo.HandlerFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			req := c.Request()
			for _, v := range allowed {
				if req.Method == v.method && req.URL.Path == v.path {
					return next(c)
				}
			}
			if err := s.validateSession(c); err != nil {
				return err
			}
			return next(c)
		}
	}
}
