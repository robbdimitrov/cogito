package eventsservice

import (
	"context"
	"log/slog"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/status"

	pb "cogito/eventsservice/genproto"
)

func CreateServer(service *Service) *grpc.Server {
	server := grpc.NewServer(grpc.UnaryInterceptor(internalAuthInterceptor))
	pb.RegisterNotificationServiceServer(server, NewController(service))
	return server
}

func internalAuthInterceptor(
	ctx context.Context,
	req interface{},
	info *grpc.UnaryServerInfo,
	handler grpc.UnaryHandler,
) (interface{}, error) {
	start := time.Now()
	if err := ValidateInternalAuth(ctx); err != nil {
		slog.Warn("grpc request rejected", "request_id", RequestID(ctx), "method", info.FullMethod, "error_kind", status.Code(err).String(), "duration_ms", time.Since(start).Milliseconds())
		return nil, err
	}
	resp, err := handler(ctx, req)
	attrs := []any{
		"request_id", RequestID(ctx),
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
