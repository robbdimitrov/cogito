package post

import (
	"context"
	"crypto/subtle"
	"os"
	"regexp"
	"strconv"
	"strings"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

const defaultInternalGRPCToken = "dev-internal-grpc-token"

var extractPattern = regexp.MustCompile(`(?:^|[^A-Za-z0-9_])#([A-Za-z0-9_]{1,50})`)
var validTagPattern = regexp.MustCompile(`^[A-Za-z0-9_]{1,50}$`)

func ExtractHashtags(content string) []string {
	matches := extractPattern.FindAllStringSubmatch(content, -1)
	tagSet := make(map[string]bool)
	var tags []string
	for _, match := range matches {
		if len(match) > 1 {
			tag := strings.ToLower(match[1])
			if !tagSet[tag] {
				tagSet[tag] = true
				tags = append(tags, tag)
			}
		}
	}
	if tags == nil {
		tags = []string{}
	}
	return tags
}

func ValidateHashtag(tag string) bool {
	return validTagPattern.MatchString(tag)
}

func newError(c codes.Code) error {
	return status.Error(c, c.String())
}

func getUserID(ctx context.Context) (int32, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return 0, newError(codes.Unauthenticated)
	}
	values := md.Get("user-id")
	if len(values) == 0 || values[0] == "" {
		return 0, newError(codes.Unauthenticated)
	}
	userID, err := strconv.Atoi(values[0])
	if err != nil {
		return 0, newError(codes.Unauthenticated)
	}
	return int32(userID), nil
}

func validateInternalAuth(ctx context.Context) error {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return newError(codes.Unauthenticated)
	}
	values := md.Get("internal-token")
	if len(values) == 0 || subtle.ConstantTimeCompare([]byte(values[0]), []byte(internalGRPCToken())) != 1 {
		return newError(codes.Unauthenticated)
	}
	return nil
}

func requestID(ctx context.Context) string {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return ""
	}
	values := md.Get("x-request-id")
	if len(values) == 0 {
		return ""
	}
	return values[0]
}

func internalGRPCToken() string {
	token := os.Getenv("INTERNAL_GRPC_TOKEN")
	if token == "" {
		return defaultInternalGRPCToken
	}
	return token
}
