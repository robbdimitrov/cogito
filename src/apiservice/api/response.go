package api

import (
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func getStatusCode(s *status.Status) int {
	c := s.Proto().GetCode()

	switch codes.Code(c) {
	case codes.InvalidArgument:
		return 400
	case codes.Unauthenticated:
		return 401
	case codes.PermissionDenied:
		return 403
	case codes.NotFound:
		return 404
	default:
		return 500
	}
}
