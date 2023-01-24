package api

import (
	"net/http"

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
