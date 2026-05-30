package api

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
)

// getStatusCode converts grpc code to http status code
func getStatusCode(s *status.Status) int {
	c := s.Proto().GetCode()
	switch codes.Code(c) {
	case codes.InvalidArgument:
		return http.StatusBadRequest
	case codes.Unauthenticated:
		return http.StatusUnauthorized
	case codes.PermissionDenied:
		return http.StatusForbidden
	case codes.NotFound:
		return http.StatusNotFound
	default:
		return http.StatusInternalServerError
	}
}

// newHTTPError converts grpc error to http error
func newHTTPError(err error) *echo.HTTPError {
	s := status.Convert(err)
	return echo.NewHTTPError(getStatusCode(s), s.Proto().GetMessage())
}

func insecureCredentials() grpc.DialOption {
	return grpc.WithTransportCredentials(insecure.NewCredentials())
}

// getIntQuery parses an integer query parameter with a fallback default value.
func getIntQuery(c echo.Context, key string, defaultValue int) (int, error) {
	value := c.QueryParam(key)
	if value == "" {
		return defaultValue, nil
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0, err
	}
	return parsed, nil
}

func getPageAndLimit(c echo.Context) (int, int, error) {
	page, err := getIntQuery(c, "page", 0)
	if err != nil {
		return 0, 0, err
	}
	limit, err := getIntQuery(c, "limit", 20)
	if err != nil {
		return 0, 0, err
	}
	if page < 0 {
		return 0, 0, echo.NewHTTPError(http.StatusBadRequest, "Page must be zero or greater")
	}
	if limit < 1 || limit > 100 {
		return 0, 0, echo.NewHTTPError(http.StatusBadRequest, "Limit must be between 1 and 100")
	}
	return page, limit, nil
}
