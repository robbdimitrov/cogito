package api

import (
	"github.com/labstack/echo/v4"
)

type router struct {
	auth  *authController
	user  *userController
	post  *postController
	image *imageController
}

func newRouter(addrs ...string) *router {
	return &router{
		auth:  newAuthController(addrs[0]),
		user:  newUserController(addrs[1]),
		post:  newPostController(addrs[2]),
		image: newImageController(addrs[3]),
	}
}

func (r *router) configureRoutes(e *echo.Echo) {
	// Sessions
	e.POST("/sessions", r.auth.createSession)
	e.DELETE("/sessions", r.auth.deleteSession)

	// Users
	e.POST("/users", r.user.createUser)
	e.GET("/users/:userId", r.user.getUser)
	e.PUT("/users/:userId", r.user.updateUser)
	e.GET("/users/:userId/following", r.user.getFollowing)
	e.GET("/users/:userId/followers", r.user.getFollowers)
	e.POST("/users/:userId/followers", r.user.followUser)
	e.DELETE("/users/:userId/followers", r.user.unfollowUser)

	// Posts
	e.POST("/posts", r.post.createPost)
	e.GET("/posts", r.post.getFeed)
	e.GET("/users/:userId/posts", r.post.getPosts)
	e.GET("/users/:userId/likes", r.post.getLikedPosts)
	e.GET("/posts/:postId", r.post.getPost)
	e.DELETE("/posts/:postId", r.post.deletePost)
	e.POST("/posts/:postId/likes", r.post.likePost)
	e.DELETE("/posts/:postId/likes", r.post.unlikePost)
	e.POST("/posts/:postId/reposts", r.post.repostPost)
	e.DELETE("/posts/:postId/reposts", r.post.removeRepost)

	// Images
	e.POST("/uploads", r.image.createImage)
	e.GET("/uploads/:filename", r.image.getImage)
}
