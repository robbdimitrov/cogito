package api

import (
	"net/http"
	"net/http/httputil"
	"net/url"
)

type router struct {
	auth      *authController
	post      *postController
	user      *userController
	imageAddr string
}

func newRouter(authAddr, postAddr, userAddr, imageAddr string) *router {
	return &router{
		auth:      newAuthController(authAddr),
		post:      newPostController(postAddr, imageAddr),
		user:      newUserController(userAddr, authAddr, imageAddr),
		imageAddr: imageAddr,
	}
}

func (r *router) configureRoutes(mux *http.ServeMux) {
	// Health check
	mux.HandleFunc("GET /", func(w http.ResponseWriter, req *http.Request) {
		if req.URL.Path != "/" {
			http.NotFound(w, req)
			return
		}
		w.WriteHeader(200)
		w.Write([]byte("OK"))
	})

	// Users
	mux.HandleFunc("POST /users", r.user.createUser)
	mux.HandleFunc("GET /users", r.user.getUserByUsername)
	mux.HandleFunc("GET /users/search", r.user.searchUsers)
	mux.HandleFunc("GET /users/{userId}", r.user.getUser)
	mux.HandleFunc("PUT /users/{userId}", r.user.updateUser)
	mux.HandleFunc("GET /users/{userId}/following", r.user.getFollowing)
	mux.HandleFunc("GET /users/{userId}/followers", r.user.getFollowers)
	mux.HandleFunc("POST /users/{userId}/following", r.user.followUser)
	mux.HandleFunc("DELETE /users/{userId}/following", r.user.unfollowUser)

	// Sessions
	mux.HandleFunc("POST /sessions", r.auth.createSession)
	mux.HandleFunc("GET /sessions", r.auth.getSessions)
	mux.HandleFunc("DELETE /sessions", r.auth.deleteSession)
	mux.HandleFunc("DELETE /sessions/{sessionId}", r.auth.deleteSessionByID)

	// Posts
	mux.HandleFunc("POST /posts", r.post.createPost)
	mux.HandleFunc("GET /posts", r.post.getFeed)
	mux.HandleFunc("GET /posts/feed", r.post.getFeed)
	mux.HandleFunc("GET /users/{userId}/posts", r.post.getPosts)
	mux.HandleFunc("GET /users/{userId}/likes", r.post.getLikedPosts)
	mux.HandleFunc("GET /hashtags/{tag}/posts", r.post.getHashtagPosts)
	mux.HandleFunc("GET /posts/{postId}", r.post.getPost)
	mux.HandleFunc("DELETE /posts/{postId}", r.post.deletePost)
	mux.HandleFunc("POST /posts/{postId}/likes", r.post.likePost)
	mux.HandleFunc("DELETE /posts/{postId}/likes", r.post.unlikePost)
	mux.HandleFunc("POST /posts/{postId}/reposts", r.post.repostPost)
	mux.HandleFunc("DELETE /posts/{postId}/reposts", r.post.removeRepost)

	// Image Gateway Orchestration
	targetURL, _ := url.Parse("http://" + r.imageAddr)
	proxy := httputil.NewSingleHostReverseProxy(targetURL)

	mux.Handle("POST /api/upload", proxy)
	mux.Handle("GET /images/", proxy)
}
