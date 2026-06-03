package api

import (
	"encoding/json"
	"net/http"
	"strconv"

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

// grpcError writes grpc error to http response
func grpcError(w http.ResponseWriter, err error) {
	s := status.Convert(err)
	http.Error(w, s.Proto().GetMessage(), getStatusCode(s))
}

func jsonResponse(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		json.NewEncoder(w).Encode(data)
	}
}

func insecureCredentials() grpc.DialOption {
	return grpc.WithTransportCredentials(insecure.NewCredentials())
}

// getIntQuery parses an integer query parameter with a fallback default value.
func getIntQuery(r *http.Request, key string, defaultValue int) (int, error) {
	value := r.URL.Query().Get(key)
	if value == "" {
		return defaultValue, nil
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0, err
	}
	return parsed, nil
}

func getPageAndLimit(r *http.Request) (int, int, error) {
	page, err := getIntQuery(r, "page", 0)
	if err != nil {
		return 0, 0, err
	}
	limit, err := getIntQuery(r, "limit", 20)
	if err != nil {
		return 0, 0, err
	}
	if page < 0 {
		return 0, 0, status.Error(codes.InvalidArgument, "Page must be zero or greater")
	}
	if limit < 1 || limit > 100 {
		return 0, 0, status.Error(codes.InvalidArgument, "Limit must be between 1 and 100")
	}
	return page, limit, nil
}
