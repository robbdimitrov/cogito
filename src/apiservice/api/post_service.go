package api

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

type postService struct {
	addr string
}

func newPostService(addr string) *postService {
	return &postService{addr}
}

// Handlers

func (ct *postService) createPost(c echo.Context) error {
	return c.JSON(http.StatusOK, "CreatePost")
}

func (ct *postService) getPosts(c echo.Context) error {
	return c.JSON(http.StatusOK, "GetPosts")
}

func (ct *postService) getPost(c echo.Context) error {
	return c.JSON(http.StatusOK, "getPost")
}

func (ct *postService) deletePost(c echo.Context) error {
	return c.JSON(http.StatusOK, "deletePost")
}

func (ct *postService) getPostsByUser(c echo.Context) error {
	return c.JSON(http.StatusOK, "getPostsByUser")
}

func (ct *postService) getPostsLikedByUser(c echo.Context) error {
	return c.JSON(http.StatusOK, "getPostsLikedByUser")
}

func (ct *postService) likePost(c echo.Context) error {
	return c.JSON(http.StatusOK, "likePost")
}

func (ct *postService) unlikePost(c echo.Context) error {
	return c.JSON(http.StatusOK, "unlikePost")
}

func (ct *postService) createRetweet(c echo.Context) error {
	return c.JSON(http.StatusOK, "createRetweet")
}

func (ct *postService) deleteRetweet(c echo.Context) error {
	return c.JSON(http.StatusOK, "deleteRetweet")
}
