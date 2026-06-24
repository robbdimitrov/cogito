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
	case codes.AlreadyExists:
		return http.StatusConflict
	default:
		return http.StatusInternalServerError
	}
}

// grpcError writes grpc error to http response
func grpcError(w http.ResponseWriter, err error) {
	s := status.Convert(err)
	jsonError(w, getStatusCode(s), s.Proto().GetMessage())
}

func grpcCode(err error) string {
	return status.Code(err).String()
}

func jsonResponse(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		json.NewEncoder(w).Encode(data)
	}
}

type errorResponse struct {
	Error string `json:"error"`
}

func jsonError(w http.ResponseWriter, status int, msg string) {
	jsonResponse(w, status, errorResponse{Error: msg})
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

func getCursorAndLimit(r *http.Request) (cursor string, limit int, err error) {
	cursor = r.URL.Query().Get("cursor")
	limit, err = getIntQuery(r, "limit", 20)
	if err != nil {
		return
	}
	if limit < 1 || limit > 100 {
		err = status.Error(codes.InvalidArgument, "Limit must be between 1 and 100")
	}
	return
}
