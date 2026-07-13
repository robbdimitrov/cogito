package api

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	pb "cogito/apigateway/genproto"
)

type searchController struct {
	client pb.SearchServiceClient
	post   *postController
}

func newSearchController(client pb.SearchServiceClient, post *postController) *searchController {
	return &searchController{client: client, post: post}
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

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	ctx, err = appendUserIDHeader(ctx, r)
	if err != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
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
		jsonResponse(w, http.StatusOK, map[string]any{"items": sc.post.buildPosts(ctx, res.Posts), "nextCursor": res.NextCursor})

	case "all":
		sc.searchAll(w, r, ctx, q, cursor, limit)

	default:
		jsonError(w, http.StatusBadRequest, "Invalid type parameter")
	}
}

// searchAll fans the blended "all" search type out to the three underlying
// search RPCs concurrently and blends their results. If every type fails the
// request fails as a whole (matching single-type behavior); if only some
// types fail, the failed type(s) are treated as an empty page for this
// response and their cursor component is left unadvanced so a later "Load
// more" retries them once the transient failure clears.
func (sc *searchController) searchAll(w http.ResponseWriter, r *http.Request, ctx context.Context, q, cursor string, limit int) {
	in := decodeAllCursor(cursor)
	targetUsers, targetPosts, targetHashtags := computeBlendTargets(limit)

	var usersRes *pb.Users
	var postsRes *pb.Posts
	var hashtagsRes *pb.Hashtags
	var usersErr, postsErr, hashtagsErr error

	var wg sync.WaitGroup
	if targetUsers > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			usersRes, usersErr = sc.client.SearchUsers(ctx, &pb.SearchRequest{Query: q, Limit: int32(targetUsers), Cursor: in.Users})
		}()
	}
	if targetPosts > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			postsRes, postsErr = sc.client.SearchPosts(ctx, &pb.SearchRequest{Query: q, Limit: int32(targetPosts), Cursor: in.Posts})
		}()
	}
	if targetHashtags > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			hashtagsRes, hashtagsErr = sc.client.SearchHashtags(ctx, &pb.SearchRequest{Query: q, Limit: int32(targetHashtags), Cursor: in.Hashtags})
		}()
	}
	wg.Wait()

	attempted, failed := 0, 0
	if targetUsers > 0 {
		attempted++
		if usersErr != nil {
			failed++
			slog.Warn("search users failed", "request_id", getRequestID(r), "error_kind", grpcCode(usersErr))
		}
	}
	if targetPosts > 0 {
		attempted++
		if postsErr != nil {
			failed++
			slog.Warn("search posts failed", "request_id", getRequestID(r), "error_kind", grpcCode(postsErr))
		}
	}
	if targetHashtags > 0 {
		attempted++
		if hashtagsErr != nil {
			failed++
			slog.Warn("search hashtags failed", "request_id", getRequestID(r), "error_kind", grpcCode(hashtagsErr))
		}
	}
	if attempted > 0 && failed == attempted {
		err := usersErr
		if err == nil {
			err = postsErr
		}
		if err == nil {
			err = hashtagsErr
		}
		grpcError(w, err)
		return
	}

	out := allCursor{Users: in.Users, Posts: in.Posts, Hashtags: in.Hashtags}

	var userItems, postItems, hashtagItems []blendedItem
	if targetUsers > 0 && usersErr == nil {
		userItems = make([]blendedItem, len(usersRes.Users))
		for i, u := range usersRes.Users {
			userItems[i] = blendedItem{Type: "users", Item: mapUser(u)}
		}
		out.Users = usersRes.NextCursor
	}
	if targetPosts > 0 && postsErr == nil {
		mapped := sc.post.buildPosts(ctx, postsRes.Posts)
		postItems = make([]blendedItem, len(mapped))
		for i, p := range mapped {
			postItems[i] = blendedItem{Type: "posts", Item: p}
		}
		out.Posts = postsRes.NextCursor
	}
	if targetHashtags > 0 && hashtagsErr == nil {
		hashtagItems = make([]blendedItem, len(hashtagsRes.Hashtags))
		for i, h := range hashtagsRes.Hashtags {
			hashtagItems[i] = blendedItem{Type: "hashtags", Item: mapHashtag(h)}
		}
		out.Hashtags = hashtagsRes.NextCursor
	}

	items := interleaveBlended(userItems, postItems, hashtagItems)

	var nextCursor any
	if out.Users != "" || out.Posts != "" || out.Hashtags != "" {
		nextCursor = encodeAllCursor(out)
	}

	jsonResponse(w, http.StatusOK, map[string]any{"items": items, "nextCursor": nextCursor})
}
