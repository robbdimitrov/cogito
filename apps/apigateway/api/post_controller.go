package api

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"google.golang.org/grpc/codes"

	pb "cogito/apigateway/genproto"
)

type postController struct {
	client       pb.PostServiceClient
	userClient   pb.UserServiceClient
	imgClient    pb.ImageServiceClient
	searchClient pb.SearchServiceClient
}

func newPostController(addr string, userClient pb.UserServiceClient, imgClient pb.ImageServiceClient, searchClient pb.SearchServiceClient) *postController {
	conn, err := newGatewayClient(addr, "post")
	if err != nil {
		slog.Error("unable to create post client", "error", err)
		os.Exit(1)
	}
	return &postController{
		client:       pb.NewPostServiceClient(conn),
		userClient:   userClient,
		imgClient:    imgClient,
		searchClient: searchClient,
	}
}

func (pc *postController) createPost(w http.ResponseWriter, r *http.Request) {
	client := pc.client

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	var body struct {
		Content     string  `json:"content"`
		MediaKey    *string `json:"mediaKey"`
		InReplyToID *int32  `json:"inReplyToId"`
		QuoteOfID   *int32  `json:"quoteOfId"`
	}
	if err := decodeJSONBody(r, &body); err != nil {
		if grpcCode(err) == codes.ResourceExhausted.String() {
			jsonError(w, http.StatusRequestEntityTooLarge, "Payload too large")
			return
		}
		jsonError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if strings.TrimSpace(body.Content) == "" || utf8.RuneCountInString(body.Content) > 255 {
		jsonError(w, http.StatusBadRequest, "Content must be between 1 and 255 characters")
		return
	}

	if body.MediaKey != nil && *body.MediaKey != "" && pc.imgClient != nil {
		userIDInt, err := strconv.ParseInt(getUserID(r), 10, 32)
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}
		_, err = pc.imgClient.VerifyUpload(ctx, &pb.VerifyUploadRequest{Filename: *body.MediaKey, UserId: int32(userIDInt)})
		if err != nil {
			grpcError(w, err)
			return
		}
	}

	req := pb.CreatePostRequest{Content: body.Content}
	if body.MediaKey != nil {
		req.MediaKey = body.MediaKey
	}
	if body.InReplyToID != nil {
		req.InReplyToId = body.InReplyToID
	}
	if body.QuoteOfID != nil {
		req.QuoteOfId = body.QuoteOfID
	}

	res, err := client.CreatePost(ctx, &req)
	if err != nil {
		slog.Warn("creating post failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	if body.MediaKey != nil && *body.MediaKey != "" && pc.imgClient != nil {
		userIDInt, err := strconv.ParseInt(getUserID(r), 10, 32)
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}
		_, err = pc.imgClient.ConsumeUpload(ctx, &pb.ConsumeUploadRequest{Filename: *body.MediaKey, UserId: int32(userIDInt)})
		if err != nil {
			slog.Warn("consuming upload failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
			if _, deleteErr := client.DeletePost(ctx, &pb.PostRequest{PostId: res.Id}); deleteErr != nil {
				slog.Warn("compensating post delete failed", "request_id", getRequestID(r), "error_kind", grpcCode(deleteErr))
			}
			grpcError(w, err)
			return
		}
	}

	jsonResponse(w, 201, map[string]int32{"id": res.Id})
}

// resolveQuotes fetches every quoted post referenced by the given posts in a
// single batch call and attaches them as QuotePost.
func (pc *postController) resolveQuotes(ctx context.Context, posts []*pb.Post) {
	idSet := make(map[int32]struct{})
	for _, p := range posts {
		if p.QuoteOfId != 0 {
			idSet[p.QuoteOfId] = struct{}{}
		}
		if p.RepostOf != nil && p.RepostOf.QuoteOfId != 0 {
			idSet[p.RepostOf.QuoteOfId] = struct{}{}
		}
	}
	if len(idSet) == 0 {
		return
	}

	ids := make([]int32, 0, len(idSet))
	for id := range idSet {
		ids = append(ids, id)
	}

	res, err := pc.client.GetPostsByIds(ctx, &pb.Ids{Ids: ids})
	if err != nil {
		slog.Warn("resolving quote posts failed", "request_id", requestIDFromContext(ctx), "error_kind", grpcCode(err))
		return
	}

	quotes := make(map[int32]*pb.Post, len(res.Posts))
	for _, q := range res.Posts {
		quotes[q.Id] = q
	}
	for _, p := range posts {
		if p.QuoteOfId != 0 {
			p.QuotePost = quotes[p.QuoteOfId]
		}
		if p.RepostOf != nil && p.RepostOf.QuoteOfId != 0 {
			p.RepostOf.QuotePost = quotes[p.RepostOf.QuoteOfId]
		}
	}
}

// resolveAuthors batch-fetches the authors of every post (including nested
// repost/quote posts) in a single call, returning a map keyed by user ID.
func (pc *postController) resolveAuthors(ctx context.Context, posts []*pb.Post) map[int32]user {
	if pc.userClient == nil {
		return nil
	}

	idSet := make(map[int32]struct{})
	var collect func(p *pb.Post)
	collect = func(p *pb.Post) {
		if p == nil {
			return
		}
		idSet[p.UserId] = struct{}{}
		collect(p.RepostOf)
		collect(p.QuotePost)
	}
	for _, p := range posts {
		collect(p)
	}
	if len(idSet) == 0 {
		return nil
	}

	ids := make([]int32, 0, len(idSet))
	for id := range idSet {
		ids = append(ids, id)
	}

	res, err := pc.userClient.GetUsersByIds(ctx, &pb.Ids{Ids: ids})
	if err != nil {
		slog.Warn("resolving post authors failed", "request_id", requestIDFromContext(ctx), "error_kind", grpcCode(err))
		return nil
	}

	authors := make(map[int32]user, len(res.Users))
	for _, u := range res.Users {
		authors[u.Id] = mapUser(u)
	}
	return authors
}

// buildPosts resolves quotes and authors for a batch of posts and maps them to
// the JSON response shape with embedded authors.
func (pc *postController) buildPosts(ctx context.Context, raw []*pb.Post) []post {
	pc.resolveQuotes(ctx, raw)
	authors := pc.resolveAuthors(ctx, raw)

	posts := make([]post, len(raw))
	for i, v := range raw {
		posts[i] = mapPost(v)
		attachAuthors(&posts[i], authors)
	}
	return posts
}

func (pc *postController) buildPost(ctx context.Context, raw *pb.Post) post {
	return pc.buildPosts(ctx, []*pb.Post{raw})[0]
}

func (pc *postController) getFeed(w http.ResponseWriter, r *http.Request) {
	client := pc.client

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	cursor, limit, err := getCursorAndLimit(r)
	if err != nil {
		grpcError(w, err)
		return
	}

	req := pb.GetFeedRequest{
		Cursor: cursor,
		Limit:  int32(limit),
	}

	res, err := client.GetFeed(ctx, &req)
	if err != nil {
		slog.Warn("getting posts failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	jsonResponse(w, 200, map[string]any{"items": pc.buildPosts(ctx, res.Posts), "nextCursor": res.NextCursor})
}

func (pc *postController) getPosts(w http.ResponseWriter, r *http.Request) {
	client := pc.client

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	userID, err := strconv.ParseInt(r.PathValue("userId"), 10, 32)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}
	cursor, limit, err := getCursorAndLimit(r)
	if err != nil {
		grpcError(w, err)
		return
	}

	req := pb.GetPostsRequest{
		UserId: int32(userID),
		Cursor: cursor,
		Limit:  int32(limit),
	}

	res, err := client.GetPosts(ctx, &req)
	if err != nil {
		slog.Warn("getting posts failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	jsonResponse(w, 200, map[string]any{"items": pc.buildPosts(ctx, res.Posts), "nextCursor": res.NextCursor})
}

func (pc *postController) getLikedPosts(w http.ResponseWriter, r *http.Request) {
	client := pc.client

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	userID, err := strconv.ParseInt(r.PathValue("userId"), 10, 32)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}
	cursor, limit, err := getCursorAndLimit(r)
	if err != nil {
		grpcError(w, err)
		return
	}

	req := pb.GetPostsRequest{
		UserId: int32(userID),
		Cursor: cursor,
		Limit:  int32(limit),
	}

	res, err := client.GetLikedPosts(ctx, &req)
	if err != nil {
		slog.Warn("getting liked posts failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	jsonResponse(w, 200, map[string]any{"items": pc.buildPosts(ctx, res.Posts), "nextCursor": res.NextCursor})
}

func (pc *postController) getHashtagPosts(w http.ResponseWriter, r *http.Request) {
	client := pc.client

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	cursor, limit, err := getCursorAndLimit(r)
	if err != nil {
		grpcError(w, err)
		return
	}

	req := pb.GetHashtagPostsRequest{
		Tag:    r.PathValue("tag"),
		Cursor: cursor,
		Limit:  int32(limit),
	}

	res, err := client.GetHashtagPosts(ctx, &req)
	if err != nil {
		slog.Warn("getting hashtag posts failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	jsonResponse(w, 200, map[string]any{"items": pc.buildPosts(ctx, res.Posts), "nextCursor": res.NextCursor})
}

func (pc *postController) getPost(w http.ResponseWriter, r *http.Request) {
	client := pc.client

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	postID, err := strconv.ParseInt(r.PathValue("postId"), 10, 32)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid post ID")
		return
	}
	req := pb.PostRequest{PostId: int32(postID)}

	res, err := client.GetPost(ctx, &req)
	if err != nil {
		slog.Warn("getting post failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	jsonResponse(w, 200, pc.buildPost(ctx, res))
}

func (pc *postController) deletePost(w http.ResponseWriter, r *http.Request) {
	client := pc.client

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	postID, err := strconv.ParseInt(r.PathValue("postId"), 10, 32)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid post ID")
		return
	}
	req := pb.PostRequest{PostId: int32(postID)}

	// Fetch post first to check if there is a media_key
	postRes, err := client.GetPost(ctx, &req)
	if err != nil {
		slog.Warn("getting post for deletion check failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	// Delete the image before the post: deleting the post is the point of no
	// return, so an image-delete failure must abort here rather than leave an
	// orphaned image with no post left to reference it. This is safe to
	// retry: image storage deletes are idempotent, so a retry after a prior
	// image delete succeeded but the post delete failed will no-op here.
	if postRes.MediaKey != "" && pc.imgClient != nil {
		_, err := pc.imgClient.DeleteImage(ctx, &pb.DeleteImageRequest{Filename: postRes.MediaKey})
		if err != nil {
			slog.Warn("deleting image failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
			grpcError(w, err)
			return
		}
	}

	_, err = client.DeletePost(ctx, &req)
	if err != nil {
		slog.Warn("deleting post failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	w.WriteHeader(204)
}

func (pc *postController) likePost(w http.ResponseWriter, r *http.Request) {
	client := pc.client

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	postID, err := strconv.ParseInt(r.PathValue("postId"), 10, 32)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid post ID")
		return
	}
	req := pb.PostRequest{PostId: int32(postID)}

	_, err = client.LikePost(ctx, &req)
	if err != nil {
		slog.Warn("liking post failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	w.WriteHeader(204)
}

func (pc *postController) unlikePost(w http.ResponseWriter, r *http.Request) {
	client := pc.client

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	postID, err := strconv.ParseInt(r.PathValue("postId"), 10, 32)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid post ID")
		return
	}
	req := pb.PostRequest{PostId: int32(postID)}

	_, err = client.UnlikePost(ctx, &req)
	if err != nil {
		slog.Warn("unliking post failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	w.WriteHeader(204)
}

func (pc *postController) repostPost(w http.ResponseWriter, r *http.Request) {
	client := pc.client

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	postID, err := strconv.ParseInt(r.PathValue("postId"), 10, 32)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid post ID")
		return
	}
	req := pb.PostRequest{PostId: int32(postID)}

	_, err = client.RepostPost(ctx, &req)
	if err != nil {
		slog.Warn("creating repost failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	w.WriteHeader(204)
}

func (pc *postController) removeRepost(w http.ResponseWriter, r *http.Request) {
	client := pc.client

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	postID, err := strconv.ParseInt(r.PathValue("postId"), 10, 32)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid post ID")
		return
	}
	req := pb.PostRequest{PostId: int32(postID)}

	_, err = client.RemoveRepost(ctx, &req)
	if err != nil {
		slog.Warn("deleting repost failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	w.WriteHeader(204)
}

func (pc *postController) getReplies(w http.ResponseWriter, r *http.Request) {
	client := pc.client

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		cancel()
		return
	}
	defer cancel()

	postID, err := strconv.ParseInt(r.PathValue("postId"), 10, 32)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid post ID")
		return
	}
	cursor, limit, err := getCursorAndLimit(r)
	if err != nil {
		grpcError(w, err)
		return
	}

	req := pb.GetRepliesRequest{
		PostId: int32(postID),
		Cursor: cursor,
		Limit:  int32(limit),
	}

	res, err := client.GetReplies(ctx, &req)
	if err != nil {
		slog.Warn("getting replies failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	jsonResponse(w, 200, map[string]any{"items": pc.buildPosts(ctx, res.Posts), "nextCursor": res.NextCursor})
}

func (pc *postController) searchHashtags(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" {
		jsonError(w, http.StatusBadRequest, "Missing query parameter")
		return
	}
	if utf8.RuneCountInString(q) > 255 {
		jsonError(w, http.StatusBadRequest, "Query exceeds maximum length")
		return
	}
	cursor, limit, err := getCursorAndLimitRange(r, 8, 20)
	if err != nil {
		grpcError(w, err)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	ctx = appendInternalAuth(appendRequestIDHeader(ctx, r))
	defer cancel()

	if pc.searchClient != nil {
		res, err := pc.searchClient.SearchHashtags(ctx, &pb.SearchRequest{
			Query:  q,
			Cursor: cursor,
			Limit:  int32(limit),
		})
		if err != nil {
			slog.Warn("searching hashtags failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
			grpcError(w, err)
			return
		}
		tags := make([]hashtag, 0, len(res.Hashtags))
		for _, h := range res.Hashtags {
			tags = append(tags, mapHashtag(h))
		}
		jsonResponse(w, http.StatusOK, map[string]any{"items": tags, "nextCursor": res.NextCursor})
		return
	}

	res, err := pc.client.SearchHashtags(ctx, &pb.SearchHashtagsRequest{
		Query: q,
		Limit: int32(limit),
	})
	if err != nil {
		slog.Warn("searching hashtags failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	tags := make([]hashtag, 0, len(res.Hashtags))
	for _, h := range res.Hashtags {
		tags = append(tags, mapHashtag(h))
	}
	slog.Info("hashtag search in fallback mode, cursor-based pagination unavailable", "request_id", getRequestID(r))
	w.Header().Set("X-Pagination-Degraded", "true")
	jsonResponse(w, http.StatusOK, map[string]any{"items": tags, "nextCursor": ""})
}
