package post

import (
	"context"
	"log/slog"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pb "cogito/postservice/genproto"
)

func CreateServer(dbClient *DBClient) *grpc.Server {
	server := grpc.NewServer(grpc.ChainUnaryInterceptor(recoveryInterceptor, internalAuthInterceptor))
	controller := newController(dbClient)
	pb.RegisterPostServiceServer(server, controller)
	return server
}

// recoveryInterceptor runs outermost so a panic anywhere in the handler chain
// is mapped to a gRPC Internal status instead of crashing the process.
func recoveryInterceptor(
	ctx context.Context,
	req interface{},
	info *grpc.UnaryServerInfo,
	handler grpc.UnaryHandler,
) (resp interface{}, err error) {
	defer func() {
		if rec := recover(); rec != nil {
			slog.Error("grpc panic recovered", "request_id", requestID(ctx), "method", info.FullMethod, "panic", rec)
			err = status.Error(codes.Internal, "Internal server error")
		}
	}()
	return handler(ctx, req)
}

func internalAuthInterceptor(
	ctx context.Context,
	req interface{},
	info *grpc.UnaryServerInfo,
	handler grpc.UnaryHandler,
) (interface{}, error) {
	start := time.Now()
	if err := validateInternalAuth(ctx); err != nil {
		slog.Warn("grpc request rejected", "request_id", requestID(ctx), "method", info.FullMethod, "error_kind", status.Code(err).String(), "duration_ms", time.Since(start).Milliseconds())
		return nil, err
	}
	resp, err := handler(ctx, req)
	attrs := []any{
		"request_id", requestID(ctx),
		"method", info.FullMethod,
		"duration_ms", time.Since(start).Milliseconds(),
	}
	if err != nil {
		attrs = append(attrs, "error_kind", status.Code(err).String())
		slog.Warn("grpc request failed", attrs...)
		return resp, err
	}
	slog.Info("grpc request", attrs...)
	return resp, nil
}
