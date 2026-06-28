package api

import (
	"encoding/json"
	"errors"
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
	case codes.ResourceExhausted:
		return http.StatusTooManyRequests
	case codes.Unavailable:
		return http.StatusServiceUnavailable
	case codes.DeadlineExceeded:
		return http.StatusGatewayTimeout
	default:
		return http.StatusInternalServerError
	}
}

// grpcError writes grpc error to http response
func grpcError(w http.ResponseWriter, err error) {
	s := status.Convert(err)
	httpStatus := getStatusCode(s)
	var msg string
	switch s.Code() {
	case codes.InvalidArgument, codes.NotFound, codes.AlreadyExists:
		msg = s.Message()
	default:
		msg = http.StatusText(httpStatus)
	}
	jsonError(w, httpStatus, msg)
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
	Message string `json:"message"`
}

func jsonError(w http.ResponseWriter, status int, msg string) {
	jsonResponse(w, status, errorResponse{Message: msg})
}

func decodeJSONBody(r *http.Request, dst any) error {
	err := json.NewDecoder(r.Body).Decode(dst)
	var maxBytesErr *http.MaxBytesError
	if errors.As(err, &maxBytesErr) {
		return status.Error(codes.ResourceExhausted, "Payload too large")
	}
	return err
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
		return 0, status.Errorf(codes.InvalidArgument, "Invalid %s", key)
	}
	return parsed, nil
}

func getCursorAndLimit(r *http.Request) (cursor string, limit int, err error) {
	return getCursorAndLimitRange(r, 20, 100)
}

func getCursorAndLimitRange(r *http.Request, defaultLimit, maxLimit int) (cursor string, limit int, err error) {
	cursor = r.URL.Query().Get("cursor")
	limit, err = getIntQuery(r, "limit", defaultLimit)
	if err != nil {
		return
	}
	if limit < 1 || limit > maxLimit {
		err = status.Errorf(codes.InvalidArgument, "Limit must be between 1 and %d", maxLimit)
	}
	return
}
