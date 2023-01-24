package api

import (
	"context"
	"log"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
	"google.golang.org/grpc"

	pb "github.com/robbdimitrov/thoughts/src/apigateway/genproto"
)

type postController struct {
	addr string
}

func newPostController(addr string) *postController {
	return &postController{addr}
}

func (pc *postController) createPost(c echo.Context) error {
	conn, err := grpc.Dial(pc.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	ctx = appendUserIDHeader(ctx, c)
	defer cancel()

	req := pb.CreatePostRequest{Content: c.FormValue("content")}

	res, err := client.CreatePost(ctx, &req)
	if err != nil {
		log.Printf("Creating post failed: %v", err)
		return newHTTPError(err)
	}

	return c.JSON(201, map[string]int32{"id": res.Id})
}

func (pc *postController) getFeed(c echo.Context) error {
	conn, err := grpc.Dial(pc.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	ctx = appendUserIDHeader(ctx, c)
	defer cancel()

	page, err := strconv.Atoi(c.QueryParam("page"))
	if err != nil {
		return echo.NewHTTPError(400)
	}
	limit, err := strconv.Atoi(c.QueryParam("limit"))
	if err != nil {
		return echo.NewHTTPError(400)
	}

	req := pb.GetFeedRequest{
		Page:  int32(page),
		Limit: int32(limit),
	}

	res, err := client.GetFeed(ctx, &req)
	if err != nil {
		log.Printf("Getting posts failed: %v", err)
		return newHTTPError(err)
	}

	posts := make([]post, len(res.Posts))
	for i, v := range res.Posts {
		posts[i] = mapPost(v)
	}

	return c.JSON(200, map[string][]post{"items": posts})
}

func (pc *postController) getPosts(c echo.Context) error {
	conn, err := grpc.Dial(pc.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	ctx = appendUserIDHeader(ctx, c)
	defer cancel()

	userID, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		return echo.NewHTTPError(400)
	}
	page, err := strconv.Atoi(c.QueryParam("page"))
	if err != nil {
		return echo.NewHTTPError(400)
	}
	limit, err := strconv.Atoi(c.QueryParam("limit"))
	if err != nil {
		return echo.NewHTTPError(400)
	}

	req := pb.GetPostsRequest{
		UserId: int32(userID),
		Page:   int32(page),
		Limit:  int32(limit),
	}

	res, err := client.GetPosts(ctx, &req)
	if err != nil {
		log.Printf("Getting posts failed: %v", err)
		return newHTTPError(err)
	}

	posts := make([]post, len(res.Posts))
	for i, v := range res.Posts {
		posts[i] = mapPost(v)
	}

	return c.JSON(200, map[string][]post{"items": posts})
}

func (pc *postController) getLikedPosts(c echo.Context) error {
	conn, err := grpc.Dial(pc.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	ctx = appendUserIDHeader(ctx, c)
	defer cancel()

	userID, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		return echo.NewHTTPError(400)
	}
	page, err := strconv.Atoi(c.QueryParam("page"))
	if err != nil {
		return echo.NewHTTPError(400)
	}
	limit, err := strconv.Atoi(c.QueryParam("limit"))
	if err != nil {
		return echo.NewHTTPError(400)
	}

	req := pb.GetPostsRequest{
		UserId: int32(userID),
		Page:   int32(page),
		Limit:  int32(limit),
	}

	res, err := client.GetLikedPosts(ctx, &req)
	if err != nil {
		log.Printf("Getting liked posts failed: %v", err)
		return newHTTPError(err)
	}

	posts := make([]post, len(res.Posts))
	for i, v := range res.Posts {
		posts[i] = mapPost(v)
	}

	return c.JSON(200, map[string][]post{"items": posts})
}

func (pc *postController) getPost(c echo.Context) error {
	conn, err := grpc.Dial(pc.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	ctx = appendUserIDHeader(ctx, c)
	defer cancel()

	postID, err := strconv.Atoi(c.Param("postId"))
	if err != nil {
		return echo.NewHTTPError(400)
	}
	req := pb.PostRequest{PostId: int32(postID)}

	res, err := client.GetPost(ctx, &req)
	if err != nil {
		log.Printf("Getting post failed: %v", err)
		return newHTTPError(err)
	}

	return c.JSON(200, mapPost(res))
}

func (pc *postController) deletePost(c echo.Context) error {
	conn, err := grpc.Dial(pc.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	ctx = appendUserIDHeader(ctx, c)
	defer cancel()

	postID, err := strconv.Atoi(c.Param("postId"))
	if err != nil {
		return echo.NewHTTPError(400)
	}
	req := pb.PostRequest{PostId: int32(postID)}

	_, err = client.DeletePost(ctx, &req)
	if err != nil {
		log.Printf("Deleting post failed: %v", err)
		return newHTTPError(err)
	}

	return c.NoContent(204)
}

func (pc *postController) likePost(c echo.Context) error {
	conn, err := grpc.Dial(pc.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	ctx = appendUserIDHeader(ctx, c)
	defer cancel()

	postID, err := strconv.Atoi(c.Param("postId"))
	if err != nil {
		return echo.NewHTTPError(400)
	}
	req := pb.PostRequest{PostId: int32(postID)}

	_, err = client.LikePost(ctx, &req)
	if err != nil {
		log.Printf("Liking post failed: %v", err)
		return newHTTPError(err)
	}

	return c.NoContent(204)
}

func (pc *postController) unlikePost(c echo.Context) error {
	conn, err := grpc.Dial(pc.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	ctx = appendUserIDHeader(ctx, c)
	defer cancel()

	postID, err := strconv.Atoi(c.Param("postId"))
	if err != nil {
		return echo.NewHTTPError(400)
	}
	req := pb.PostRequest{PostId: int32(postID)}

	_, err = client.UnlikePost(ctx, &req)
	if err != nil {
		log.Printf("Unliking post failed: %v", err)
		return newHTTPError(err)
	}

	return c.NoContent(204)
}

func (pc *postController) repostPost(c echo.Context) error {
	conn, err := grpc.Dial(pc.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	ctx = appendUserIDHeader(ctx, c)
	defer cancel()

	postID, err := strconv.Atoi(c.Param("postId"))
	if err != nil {
		return echo.NewHTTPError(400)
	}
	req := pb.PostRequest{PostId: int32(postID)}

	_, err = client.RepostPost(ctx, &req)
	if err != nil {
		log.Printf("Creating repost failed: %v", err)
		return newHTTPError(err)
	}

	return c.NoContent(204)
}

func (pc *postController) removeRepost(c echo.Context) error {
	conn, err := grpc.Dial(pc.addr, insecureCredentials(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500)
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	ctx = appendUserIDHeader(ctx, c)
	defer cancel()

	postID, err := strconv.Atoi(c.Param("postId"))
	if err != nil {
		return echo.NewHTTPError(400)
	}
	req := pb.PostRequest{PostId: int32(postID)}

	_, err = client.RemoveRepost(ctx, &req)
	if err != nil {
		log.Printf("Deleting repost failed: %v", err)
		return newHTTPError(err)
	}

	return c.NoContent(204)
}
