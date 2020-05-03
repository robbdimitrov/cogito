package api

import (
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
	return c.JSON(201, map[string]int32{"id": 12})
}

func (ct *postService) getPosts(c echo.Context) error {
	return c.JSON(200, map[string][]post{"items": {}})
}

func (ct *postService) getPost(c echo.Context) error {
	return c.JSON(200, post{})
}

func (ct *postService) deletePost(c echo.Context) error {
	return c.NoContent(204)
}

func (ct *postService) getPostsByUser(c echo.Context) error {
	return c.JSON(200, map[string][]post{"items": {}})
}

func (ct *postService) getPostsLikedByUser(c echo.Context) error {
	return c.JSON(200, map[string][]post{"items": {}})
}

func (ct *postService) likePost(c echo.Context) error {
	return c.NoContent(204)
}

func (ct *postService) unlikePost(c echo.Context) error {
	return c.NoContent(204)
}

func (ct *postService) createRetweet(c echo.Context) error {
	return c.NoContent(204)
}

func (ct *postService) deleteRetweet(c echo.Context) error {
	return c.NoContent(204)
}
