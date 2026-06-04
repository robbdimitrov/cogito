package api

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"time"

	pb "github.com/robbdimitrov/thoughts/src/apigateway/genproto"
)

type postController struct {
	client    pb.PostServiceClient
	imgClient pb.ImageServiceClient
}

func newPostController(addr string, imageAddr string) *postController {
	conn, err := newGatewayClient(addr, "post")
	if err != nil {
		slog.Error("unable to create post client", "error", err)
		os.Exit(1)
	}
	var imgClient pb.ImageServiceClient
	imageGRPCAddr := imageGRPCAddress(imageAddr)
	if imageGRPCAddr != "" {
		imgConn, err := newGatewayClient(imageGRPCAddr, "image-grpc")
		if err != nil {
			slog.Error("unable to create image client", "error", err)
			os.Exit(1)
		}
		imgClient = pb.NewImageServiceClient(imgConn)
	}
	return &postController{pb.NewPostServiceClient(conn), imgClient}
}

func (pc *postController) createPost(w http.ResponseWriter, r *http.Request) {
	client := pc.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		cancel()
		return
	}
	defer cancel()

	var body struct {
		Content  string  `json:"content"`
		MediaKey *string `json:"mediaKey"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid request body", 400)
		return
	}
	if len(body.Content) == 0 || len(body.Content) > 255 {
		http.Error(w, "Content must be between 1 and 255 characters", 400)
		return
	}

	req := pb.CreatePostRequest{Content: body.Content}
	if body.MediaKey != nil {
		req.MediaKey = body.MediaKey
	}

	res, err := client.CreatePost(ctx, &req)
	if err != nil {
		slog.Warn("creating post failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	jsonResponse(w, 201, map[string]int32{"id": res.Id})
}

func (pc *postController) getFeed(w http.ResponseWriter, r *http.Request) {
	client := pc.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		cancel()
		return
	}
	defer cancel()

	page, limit, err := getPageAndLimit(r)
	if err != nil {
		grpcError(w, err)
		return
	}

	req := pb.GetFeedRequest{
		Page:  int32(page),
		Limit: int32(limit),
	}

	res, err := client.GetFeed(ctx, &req)
	if err != nil {
		slog.Warn("getting posts failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	posts := make([]post, len(res.Posts))
	for i, v := range res.Posts {
		posts[i] = mapPost(v)
	}

	jsonResponse(w, 200, map[string][]post{"items": posts})
}

func (pc *postController) getPosts(w http.ResponseWriter, r *http.Request) {
	client := pc.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		cancel()
		return
	}
	defer cancel()

	userID, err := strconv.Atoi(r.PathValue("userId"))
	if err != nil {
		http.Error(w, "Invalid user ID", 400)
		return
	}
	page, limit, err := getPageAndLimit(r)
	if err != nil {
		grpcError(w, err)
		return
	}

	req := pb.GetPostsRequest{
		UserId: int32(userID),
		Page:   int32(page),
		Limit:  int32(limit),
	}

	res, err := client.GetPosts(ctx, &req)
	if err != nil {
		slog.Warn("getting posts failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	posts := make([]post, len(res.Posts))
	for i, v := range res.Posts {
		posts[i] = mapPost(v)
	}

	jsonResponse(w, 200, map[string][]post{"items": posts})
}

func (pc *postController) getLikedPosts(w http.ResponseWriter, r *http.Request) {
	client := pc.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		cancel()
		return
	}
	defer cancel()

	userID, err := strconv.Atoi(r.PathValue("userId"))
	if err != nil {
		http.Error(w, "Invalid user ID", 400)
		return
	}
	page, limit, err := getPageAndLimit(r)
	if err != nil {
		grpcError(w, err)
		return
	}

	req := pb.GetPostsRequest{
		UserId: int32(userID),
		Page:   int32(page),
		Limit:  int32(limit),
	}

	res, err := client.GetLikedPosts(ctx, &req)
	if err != nil {
		slog.Warn("getting liked posts failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	posts := make([]post, len(res.Posts))
	for i, v := range res.Posts {
		posts[i] = mapPost(v)
	}

	jsonResponse(w, 200, map[string][]post{"items": posts})
}

func (pc *postController) getHashtagPosts(w http.ResponseWriter, r *http.Request) {
	client := pc.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		cancel()
		return
	}
	defer cancel()

	page, limit, err := getPageAndLimit(r)
	if err != nil {
		grpcError(w, err)
		return
	}

	req := pb.GetHashtagPostsRequest{
		Tag:   r.PathValue("tag"),
		Page:  int32(page),
		Limit: int32(limit),
	}

	res, err := client.GetHashtagPosts(ctx, &req)
	if err != nil {
		slog.Warn("getting hashtag posts failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	posts := make([]post, len(res.Posts))
	for i, v := range res.Posts {
		posts[i] = mapPost(v)
	}

	jsonResponse(w, 200, map[string][]post{"items": posts})
}

func (pc *postController) getPost(w http.ResponseWriter, r *http.Request) {
	client := pc.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		cancel()
		return
	}
	defer cancel()

	postID, err := strconv.Atoi(r.PathValue("postId"))
	if err != nil {
		http.Error(w, "Invalid post ID", 400)
		return
	}
	req := pb.PostRequest{PostId: int32(postID)}

	res, err := client.GetPost(ctx, &req)
	if err != nil {
		slog.Warn("getting post failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	jsonResponse(w, 200, mapPost(res))
}

func (pc *postController) deletePost(w http.ResponseWriter, r *http.Request) {
	client := pc.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		cancel()
		return
	}
	defer cancel()

	postID, err := strconv.Atoi(r.PathValue("postId"))
	if err != nil {
		http.Error(w, "Invalid post ID", 400)
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

	_, err = client.DeletePost(ctx, &req)
	if err != nil {
		slog.Warn("deleting post failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		grpcError(w, err)
		return
	}

	// Gateway Orchestration for Images: delete image if one exists
	if postRes.MediaKey != "" && pc.imgClient != nil {
		_, err := pc.imgClient.DeleteImage(ctx, &pb.DeleteImageRequest{Filename: postRes.MediaKey})
		if err != nil {
			slog.Warn("deleting image failed", "request_id", getRequestID(r), "error_kind", grpcCode(err))
		}
	}

	w.WriteHeader(204)
}

func (pc *postController) likePost(w http.ResponseWriter, r *http.Request) {
	client := pc.client

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		cancel()
		return
	}
	defer cancel()

	postID, err := strconv.Atoi(r.PathValue("postId"))
	if err != nil {
		http.Error(w, "Invalid post ID", 400)
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

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		cancel()
		return
	}
	defer cancel()

	postID, err := strconv.Atoi(r.PathValue("postId"))
	if err != nil {
		http.Error(w, "Invalid post ID", 400)
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

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		cancel()
		return
	}
	defer cancel()

	postID, err := strconv.Atoi(r.PathValue("postId"))
	if err != nil {
		http.Error(w, "Invalid post ID", 400)
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

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, errCtx := appendUserIDHeader(ctx, r)
	if errCtx != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		cancel()
		return
	}
	defer cancel()

	postID, err := strconv.Atoi(r.PathValue("postId"))
	if err != nil {
		http.Error(w, "Invalid post ID", 400)
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
