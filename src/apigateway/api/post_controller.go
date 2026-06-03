package api

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"google.golang.org/grpc"

	pb "github.com/robbdimitrov/thoughts/src/apigateway/genproto"
)

type postController struct {
	addr      string
	imageAddr string
}

func newPostController(addr string, imageAddr string) *postController {
	return &postController{addr, imageAddr}
}

func (pc *postController) createPost(w http.ResponseWriter, r *http.Request) {
	conn, err := grpc.Dial(pc.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		http.Error(w, "Internal Server Error", 500)
		return
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, err = appendUserIDHeader(ctx, r)
	if err != nil {
		http.Error(w, "Unauthorized", 401)
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
		log.Printf("Creating post failed: %v", err)
		grpcError(w, err)
		return
	}

	jsonResponse(w, 201, map[string]int32{"id": res.Id})
}

func (pc *postController) getFeed(w http.ResponseWriter, r *http.Request) {
	conn, err := grpc.Dial(pc.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		http.Error(w, "Internal Server Error", 500)
		return
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, err = appendUserIDHeader(ctx, r)
	if err != nil {
		http.Error(w, "Unauthorized", 401)
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
		log.Printf("Getting posts failed: %v", err)
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
	conn, err := grpc.Dial(pc.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		http.Error(w, "Internal Server Error", 500)
		return
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, err = appendUserIDHeader(ctx, r)
	if err != nil {
		http.Error(w, "Unauthorized", 401)
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
		log.Printf("Getting posts failed: %v", err)
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
	conn, err := grpc.Dial(pc.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		http.Error(w, "Internal Server Error", 500)
		return
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, err = appendUserIDHeader(ctx, r)
	if err != nil {
		http.Error(w, "Unauthorized", 401)
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
		log.Printf("Getting liked posts failed: %v", err)
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
	conn, err := grpc.Dial(pc.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		http.Error(w, "Internal Server Error", 500)
		return
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, err = appendUserIDHeader(ctx, r)
	if err != nil {
		http.Error(w, "Unauthorized", 401)
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
		log.Printf("Getting hashtag posts failed: %v", err)
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
	conn, err := grpc.Dial(pc.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		http.Error(w, "Internal Server Error", 500)
		return
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, err = appendUserIDHeader(ctx, r)
	if err != nil {
		http.Error(w, "Unauthorized", 401)
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
		log.Printf("Getting post failed: %v", err)
		grpcError(w, err)
		return
	}

	jsonResponse(w, 200, mapPost(res))
}

func (pc *postController) deletePost(w http.ResponseWriter, r *http.Request) {
	conn, err := grpc.Dial(pc.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		http.Error(w, "Internal Server Error", 500)
		return
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, err = appendUserIDHeader(ctx, r)
	if err != nil {
		http.Error(w, "Unauthorized", 401)
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
		log.Printf("Getting post for deletion check failed: %v", err)
		grpcError(w, err)
		return
	}

	_, err = client.DeletePost(ctx, &req)
	if err != nil {
		log.Printf("Deleting post failed: %v", err)
		grpcError(w, err)
		return
	}

	// Gateway Orchestration for Images: delete image if one exists
	if postRes.MediaKey != "" {
		imgConn, err := grpc.Dial(pc.imageAddr, insecureCredentials(), grpc.WithBlock())
		if err == nil {
			imgClient := pb.NewImageServiceClient(imgConn)
			_, _ = imgClient.DeleteImage(ctx, &pb.DeleteImageRequest{Filename: postRes.MediaKey})
			imgConn.Close()
		} else {
			log.Printf("Connecting to image service failed: %v", err)
		}
	}

	w.WriteHeader(204)
}

func (pc *postController) likePost(w http.ResponseWriter, r *http.Request) {
	conn, err := grpc.Dial(pc.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		http.Error(w, "Internal Server Error", 500)
		return
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, err = appendUserIDHeader(ctx, r)
	if err != nil {
		http.Error(w, "Unauthorized", 401)
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
		log.Printf("Liking post failed: %v", err)
		grpcError(w, err)
		return
	}

	w.WriteHeader(204)
}

func (pc *postController) unlikePost(w http.ResponseWriter, r *http.Request) {
	conn, err := grpc.Dial(pc.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		http.Error(w, "Internal Server Error", 500)
		return
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, err = appendUserIDHeader(ctx, r)
	if err != nil {
		http.Error(w, "Unauthorized", 401)
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
		log.Printf("Unliking post failed: %v", err)
		grpcError(w, err)
		return
	}

	w.WriteHeader(204)
}

func (pc *postController) repostPost(w http.ResponseWriter, r *http.Request) {
	conn, err := grpc.Dial(pc.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		http.Error(w, "Internal Server Error", 500)
		return
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, err = appendUserIDHeader(ctx, r)
	if err != nil {
		http.Error(w, "Unauthorized", 401)
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
		log.Printf("Creating repost failed: %v", err)
		grpcError(w, err)
		return
	}

	w.WriteHeader(204)
}

func (pc *postController) removeRepost(w http.ResponseWriter, r *http.Request) {
	conn, err := grpc.Dial(pc.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		http.Error(w, "Internal Server Error", 500)
		return
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	ctx, err = appendUserIDHeader(ctx, r)
	if err != nil {
		http.Error(w, "Unauthorized", 401)
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
		log.Printf("Deleting repost failed: %v", err)
		grpcError(w, err)
		return
	}

	w.WriteHeader(204)
}
