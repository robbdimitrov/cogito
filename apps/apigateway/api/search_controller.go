package api

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	pb "cogito/apigateway/genproto"
)

type searchController struct {
	client pb.SearchServiceClient
}

func newSearchController(client pb.SearchServiceClient) *searchController {
	return &searchController{client: client}
}

func (sc *searchController) search(w http.ResponseWriter, r *http.Request) {
	if sc.client == nil {
		jsonError(w, http.StatusServiceUnavailable, "Search service unavailable")
		return
	}

	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" {
		jsonError(w, http.StatusBadRequest, "Missing query parameter")
		return
	}
	if utf8.RuneCountInString(q) > 255 {
		jsonError(w, http.StatusBadRequest, "Query exceeds maximum length")
		return
	}

	searchType := r.URL.Query().Get("type")
	cursor, limit, err := getCursorAndLimit(r)
	if err != nil {
		grpcError(w, err)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	ctx = appendInternalAuth(appendRequestIDHeader(ctx, r))
	defer cancel()

	req := &pb.SearchRequest{
		Query:  q,
		Limit:  int32(limit),
		Cursor: cursor,
	}

	switch searchType {
	case "users":
		res, err := sc.client.SearchUsers(ctx, req)
		if err != nil {
			slog.Warn("search users failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
			grpcError(w, err)
			return
		}
		users := make([]user, 0, len(res.Users))
		for _, u := range res.Users {
			users = append(users, mapUser(u))
		}
		jsonResponse(w, http.StatusOK, map[string]any{"items": users, "nextCursor": res.NextCursor})

	case "hashtags":
		res, err := sc.client.SearchHashtags(ctx, req)
		if err != nil {
			slog.Warn("search hashtags failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
			grpcError(w, err)
			return
		}
		tags := make([]hashtag, 0, len(res.Hashtags))
		for _, h := range res.Hashtags {
			tags = append(tags, mapHashtag(h))
		}
		jsonResponse(w, http.StatusOK, map[string]any{"items": tags, "nextCursor": res.NextCursor})

	case "posts":
		res, err := sc.client.SearchPosts(ctx, req)
		if err != nil {
			slog.Warn("search posts failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
			grpcError(w, err)
			return
		}
		posts := make([]post, 0, len(res.Posts))
		for _, p := range res.Posts {
			posts = append(posts, mapPost(p))
		}
		jsonResponse(w, http.StatusOK, map[string]any{"items": posts, "nextCursor": res.NextCursor})

	default:
		jsonError(w, http.StatusBadRequest, "Invalid type parameter")
	}
}
