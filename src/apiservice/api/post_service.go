package api

import (
	"context"
	"log"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
	"google.golang.org/grpc"

	pb "github.com/robbdimitrov/thoughts/src/apiservice/genproto"
)

type postService struct {
	addr string
}

func newPostService(addr string) *postService {
	return &postService{addr}
}

// Handlers

func (s *postService) createPost(c echo.Context) error {
	conn, err := grpc.Dial(s.addr, grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500, err.Error())
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

	return c.JSON(201, map[string]int32{"id": res.PostId})
}

func (s *postService) getPosts(c echo.Context) error {
	conn, err := grpc.Dial(s.addr, grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500, err.Error())
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	ctx = appendUserIDHeader(ctx, c)
	defer cancel()

	page, err := strconv.Atoi(c.QueryParam("page"))
	if err != nil {
		return echo.NewHTTPError(500, err.Error())
	}
	limit, err := strconv.Atoi(c.QueryParam("limit"))
	if err != nil {
		return echo.NewHTTPError(500, err.Error())
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

func (s *postService) getPost(c echo.Context) error {
	conn, err := grpc.Dial(s.addr, grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500, err.Error())
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	ctx = appendUserIDHeader(ctx, c)
	defer cancel()

	postID, err := strconv.Atoi(c.Param("postId"))
	if err != nil {
		return echo.NewHTTPError(500, err.Error())
	}
	req := pb.PostRequest{PostId: int32(postID)}

	res, err := client.GetPost(ctx, &req)
	if err != nil {
		log.Printf("Getting post failed: %v", err)
		return newHTTPError(err)
	}

	return c.JSON(200, mapPost(res))
}

func (s *postService) deletePost(c echo.Context) error {
	conn, err := grpc.Dial(s.addr, grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500, err.Error())
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	ctx = appendUserIDHeader(ctx, c)
	defer cancel()

	postID, err := strconv.Atoi(c.Param("postId"))
	if err != nil {
		return echo.NewHTTPError(500, err.Error())
	}
	req := pb.PostRequest{PostId: int32(postID)}

	_, err = client.DeletePost(ctx, &req)
	if err != nil {
		log.Printf("Deleting post failed: %v", err)
		return newHTTPError(err)
	}

	return c.NoContent(204)
}

func (s *postService) getPostsByUser(c echo.Context) error {
	conn, err := grpc.Dial(s.addr, grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500, err.Error())
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	ctx = appendUserIDHeader(ctx, c)
	defer cancel()

	userID, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		return echo.NewHTTPError(500, err.Error())
	}
	page, err := strconv.Atoi(c.QueryParam("page"))
	if err != nil {
		return echo.NewHTTPError(500, err.Error())
	}
	limit, err := strconv.Atoi(c.QueryParam("limit"))
	if err != nil {
		return echo.NewHTTPError(500, err.Error())
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

func (s *postService) getPostsLikedByUser(c echo.Context) error {
	conn, err := grpc.Dial(s.addr, grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500, err.Error())
	}
	defer conn.Close()
	client := pb.NewPostServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	ctx = appendUserIDHeader(ctx, c)
	defer cancel()

	userID, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		return echo.NewHTTPError(500, err.Error())
	}
	page, err := strconv.Atoi(c.QueryParam("page"))
	if err != nil {
		return echo.NewHTTPError(500, err.Error())
	}
	limit, err := strconv.Atoi(c.QueryParam("limit"))
	if err != nil {
		return echo.NewHTTPError(500, err.Error())
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

func (s *postService) likePost(c echo.Context) error {
	conn, err := grpc.Dial(s.addr, grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500, err.Error())
	}
	defer conn.Close()
	client := pb.NewActionServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	ctx = appendUserIDHeader(ctx, c)
	defer cancel()

	postID, err := strconv.Atoi(c.Param("postId"))
	if err != nil {
		return echo.NewHTTPError(500, err.Error())
	}
	req := pb.PostRequest{PostId: int32(postID)}

	_, err = client.LikePost(ctx, &req)
	if err != nil {
		log.Printf("Liking post failed: %v", err)
		return newHTTPError(err)
	}

	return c.NoContent(204)
}

func (s *postService) unlikePost(c echo.Context) error {
	conn, err := grpc.Dial(s.addr, grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500, err.Error())
	}
	defer conn.Close()
	client := pb.NewActionServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	ctx = appendUserIDHeader(ctx, c)
	defer cancel()

	postID, err := strconv.Atoi(c.Param("postId"))
	if err != nil {
		return echo.NewHTTPError(500, err.Error())
	}
	req := pb.PostRequest{PostId: int32(postID)}

	_, err = client.UnlikePost(ctx, &req)
	if err != nil {
		log.Printf("Unliking post failed: %v", err)
		return newHTTPError(err)
	}

	return c.NoContent(204)
}

func (s *postService) createRepost(c echo.Context) error {
	conn, err := grpc.Dial(s.addr, grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500, err.Error())
	}
	defer conn.Close()
	client := pb.NewActionServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	ctx = appendUserIDHeader(ctx, c)
	defer cancel()

	postID, err := strconv.Atoi(c.Param("postId"))
	if err != nil {
		return echo.NewHTTPError(500, err.Error())
	}
	req := pb.PostRequest{PostId: int32(postID)}

	_, err = client.RepostPost(ctx, &req)
	if err != nil {
		log.Printf("Creating repost failed: %v", err)
		return newHTTPError(err)
	}

	return c.NoContent(204)
}

func (s *postService) deleteRepost(c echo.Context) error {
	conn, err := grpc.Dial(s.addr, grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		log.Printf("Connecting to service failed: %v", err)
		return echo.NewHTTPError(500, err.Error())
	}
	defer conn.Close()
	client := pb.NewActionServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	ctx = appendUserIDHeader(ctx, c)
	defer cancel()

	postID, err := strconv.Atoi(c.Param("postId"))
	if err != nil {
		return echo.NewHTTPError(500, err.Error())
	}
	req := pb.PostRequest{PostId: int32(postID)}

	_, err = client.RemoveRepost(ctx, &req)
	if err != nil {
		log.Printf("Deleting repost failed: %v", err)
		return newHTTPError(err)
	}

	return c.NoContent(204)
}
