package api

import (
	"bytes"
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"time"

	pb "cogito/apigateway/genproto"
)

type router struct {
	auth             *authController
	post             *postController
	user             *userController
	search           *searchController
	notification     *notificationController
	imageAddr        string
	imageHTTP        *http.Client
	imageHTTPBreaker *circuitBreaker
}

func imageGRPCAddress(imageHTTPAddr string) string {
	if addr := os.Getenv("IMAGE_GRPC_SERVICE_ADDR"); addr != "" {
		return addr
	}
	if imageHTTPAddr == "imageservice:8081" {
		return "imageservice:5050"
	}
	return imageHTTPAddr
}

func newRouter(authAddr, postAddr, userAddr, imageAddr, searchAddr, eventsAddr string) *router {
	var searchClient pb.SearchServiceClient
	if searchAddr != "" {
		searchConn, err := newGatewayClient(searchAddr, "search")
		if err != nil {
			slog.Error("unable to create search client", "error", err)
			os.Exit(1)
		}
		searchClient = pb.NewSearchServiceClient(searchConn)
	}

	// Shared circuit breaker for user service — postController and userController
	// must see the same failure count so the circuit opens on the correct threshold.
	userBreaker := newCircuitBreaker("user")
	userConn, err := newGatewayClientWithBreaker(userAddr, "user", userBreaker)
	if err != nil {
		slog.Error("unable to create user client", "error", err)
		os.Exit(1)
	}
	sharedUserClient := pb.NewUserServiceClient(userConn)

	// Shared image gRPC client for the same reason.
	var sharedImgClient pb.ImageServiceClient
	imageGRPCAddr := imageGRPCAddress(imageAddr)
	if imageGRPCAddr != "" {
		imgBreaker := newCircuitBreaker("image-grpc")
		imgConn, err := newGatewayClientWithBreaker(imageGRPCAddr, "image-grpc", imgBreaker)
		if err != nil {
			slog.Error("unable to create image grpc client", "error", err)
			os.Exit(1)
		}
		sharedImgClient = pb.NewImageServiceClient(imgConn)
	}

	imageHTTPBreaker := newCircuitBreaker("image-http")
	post := newPostController(postAddr, sharedUserClient, sharedImgClient, searchClient)
	return &router{
		auth:             newAuthController(authAddr),
		post:             post,
		user:             newUserController(sharedUserClient, authAddr, sharedImgClient, searchClient),
		search:           newSearchController(searchClient, post),
		notification:     newNotificationController(eventsAddr),
		imageAddr:        imageAddr,
		imageHTTPBreaker: imageHTTPBreaker,
		imageHTTP: &http.Client{
			Transport: &retryHTTPTransport{
				base:    http.DefaultTransport,
				breaker: imageHTTPBreaker,
				retries: envInt("HTTP_RETRY_MAX_ATTEMPTS", 3),
				backoff: time.Duration(envInt("HTTP_RETRY_BACKOFF_MS", 100)) * time.Millisecond,
			},
		},
	}
}

// postsFeedSegment and usersSearchSegment are literal single-segment routes
// that share a URL shape with a public {id} route registered under the same
// prefix (GET /posts/feed vs. GET /posts/{postId}; GET /users/search vs.
// GET /users/{userId}) and must stay excluded from anonymous reads. They are
// defined once here, alongside route registration, and consumed by
// isPublicPostRead/isPublicUserRead in auth_guard.go so the two can't drift
// out of sync by renaming. Adding another literal single-segment route under
// either prefix still requires adding a matching exclusion in auth_guard.go.
const (
	postsFeedSegment   = "feed"
	usersSearchSegment = "search"
)

func (r *router) configureRoutes(mux *http.ServeMux) {
	// Health check
	mux.HandleFunc("GET /", func(w http.ResponseWriter, req *http.Request) {
		if req.URL.Path != "/" {
			jsonError(w, http.StatusNotFound, "Not found")
			return
		}
		w.WriteHeader(200)
		w.Write([]byte("OK"))
	})

	// Users
	mux.HandleFunc("POST /users", r.user.createUser)
	mux.HandleFunc("GET /users", r.user.getUserByUsername)
	mux.HandleFunc("GET /users/"+usersSearchSegment, r.user.searchUsers)
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
	mux.HandleFunc("GET /posts/"+postsFeedSegment, r.post.getFeed)
	mux.HandleFunc("GET /users/{userId}/posts", r.post.getPosts)
	mux.HandleFunc("GET /users/{userId}/likes", r.post.getLikedPosts)
	mux.HandleFunc("GET /hashtags/{tag}/posts", r.post.getHashtagPosts)
	mux.HandleFunc("GET /hashtags/search", r.post.searchHashtags)
	mux.HandleFunc("GET /posts/{postId}", r.post.getPost)
	mux.HandleFunc("DELETE /posts/{postId}", r.post.deletePost)
	mux.HandleFunc("POST /posts/{postId}/likes", r.post.likePost)
	mux.HandleFunc("DELETE /posts/{postId}/likes", r.post.unlikePost)
	mux.HandleFunc("POST /posts/{postId}/reposts", r.post.repostPost)
	mux.HandleFunc("DELETE /posts/{postId}/reposts", r.post.removeRepost)
	mux.HandleFunc("GET /posts/{postId}/replies", r.post.getReplies)

	// Search
	mux.HandleFunc("GET /search", r.search.search)

	// Notifications
	mux.HandleFunc("GET /notifications", r.notification.getNotifications)
	mux.HandleFunc("PUT /notifications/{id}/read", r.notification.markNotificationRead)
	mux.HandleFunc("GET /notifications/unread-count", r.notification.getUnreadCount)

	// Image Gateway Orchestration
	mux.HandleFunc("POST /uploads", r.proxyImageUpload)
	mux.HandleFunc("GET /uploads/{filename}", r.proxyImageFile)
}

func (r *router) proxyImageUpload(w http.ResponseWriter, req *http.Request) {
	userID := getUserID(req)
	if userID == "" {
		jsonError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// A client that honestly reports an oversized Content-Length gets a
	// clean, immediate, zero-I/O 413 here — the common case for browsers and
	// standard HTTP clients.
	if req.ContentLength > maxRequestBodyBytes {
		jsonError(w, http.StatusRequestEntityTooLarge, "Payload too large")
		return
	}

	// Fall back to reading and bounding the body ourselves before ever
	// proxying it, rather than trusting Content-Length outright: a
	// chunked-encoded request (or any client that omits Content-Length)
	// reports ContentLength == -1, which sails past the check above.
	// Uploads are capped at 2 MB, small enough to buffer here, so this gives
	// every client shape a clean, immediate JSON 413 instead of racing
	// bodyLimitMiddleware's MaxBytesReader against the reverse proxy's
	// request-body write, which can drop the connection with no response at
	// all. req.Body may already be that same MaxBytesReader
	// (bodyLimitMiddleware wraps every request upstream of this handler), so
	// a too-large body can surface here as a read error rather than merely a
	// long slice — map that case to 413 too.
	body, err := io.ReadAll(io.LimitReader(req.Body, maxRequestBodyBytes+1))
	if err != nil {
		if _, ok := errors.AsType[*http.MaxBytesError](err); ok {
			jsonError(w, http.StatusRequestEntityTooLarge, "Payload too large")
			return
		}
		jsonError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if len(body) > maxRequestBodyBytes {
		jsonError(w, http.StatusRequestEntityTooLarge, "Payload too large")
		return
	}
	req.Body = io.NopCloser(bytes.NewReader(body))
	req.ContentLength = int64(len(body))

	r.proxyImageRequest("/uploads", func(proxyReq *http.Request) {
		proxyReq.Header.Set("x-user-id", userID)
	})(w, req)
}

func (r *router) proxyImageFile(w http.ResponseWriter, req *http.Request) {
	filename := req.PathValue("filename")
	if filename == "" {
		jsonError(w, http.StatusNotFound, "Not found")
		return
	}

	r.proxyImageRequest("/uploads/"+filename, nil)(w, req)
}

func (r *router) proxyImageRequest(path string, configure func(*http.Request)) http.HandlerFunc {
	return func(w http.ResponseWriter, req *http.Request) {
		targetURL, err := url.Parse("http://" + r.imageAddr)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "Invalid image service address")
			return
		}

		proxy := &httputil.ReverseProxy{
			Rewrite: func(proxyReq *httputil.ProxyRequest) {
				proxyReq.SetURL(targetURL)
				proxyReq.Out.URL.Path = path
				proxyReq.Out.URL.RawPath = ""
				proxyReq.SetXForwarded()
				stripInternalImageProxyHeaders(proxyReq.Out.Header)
				proxyReq.Out.Header.Set("internal-token", internalGRPCToken())
				if requestID := getRequestID(proxyReq.In); requestID != "" {
					proxyReq.Out.Header.Set("X-Request-ID", requestID)
				}
				if configure != nil {
					configure(proxyReq.Out)
				}
			},
		}
		if r.imageHTTP != nil && r.imageHTTP.Transport != nil {
			proxy.Transport = r.imageHTTP.Transport
		}
		proxy.ErrorHandler = func(w http.ResponseWriter, req *http.Request, err error) {
			slog.Warn("image proxy failed", "request_id", getRequestID(req), "error", err)
			if _, ok := errors.AsType[*http.MaxBytesError](err); ok {
				jsonError(w, http.StatusRequestEntityTooLarge, "Payload too large")
				return
			}
			jsonError(w, http.StatusServiceUnavailable, "Image service unavailable")
		}

		ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
		defer cancel()
		proxy.ServeHTTP(w, req.WithContext(ctx))
	}
}

func stripInternalImageProxyHeaders(headers http.Header) {
	headers.Del("internal-token")
	headers.Del("x-user-id")
	headers.Del("user-id")
}

type retryHTTPTransport struct {
	base    http.RoundTripper
	breaker *circuitBreaker
	retries int
	backoff time.Duration
}

func (t *retryHTTPTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	if !t.breaker.allow() {
		return nil, errors.New("downstream circuit open")
	}
	attempts := 1
	if req.Method == http.MethodGet {
		attempts = t.retries
	}
	var lastResp *http.Response
	var lastErr error
	for attempt := 1; attempt <= attempts; attempt++ {
		resp, err := t.base.RoundTrip(req)
		if err == nil && !isTransientHTTPStatus(resp.StatusCode) {
			t.breaker.success()
			return resp, nil
		}
		if err == nil {
			lastResp = resp
		} else {
			lastErr = err
		}
		if req.Method != http.MethodGet || attempt == attempts {
			if err != nil || (resp != nil && isTransientHTTPStatus(resp.StatusCode)) {
				t.breaker.failureTransient()
			}
			if err != nil {
				return nil, err
			}
			return resp, nil
		}
		if resp != nil && resp.Body != nil {
			_, _ = io.Copy(io.Discard, resp.Body)
			_ = resp.Body.Close()
		}
		slog.Warn("retrying image http request", "request_id", req.Header.Get("X-Request-ID"), "attempt", attempt, "status", responseStatus(lastResp), "error", lastErr)
		select {
		case <-req.Context().Done():
			return nil, req.Context().Err()
		case <-time.After(time.Duration(attempt) * t.backoff):
		}
	}
	return lastResp, lastErr
}

func isTransientHTTPStatus(status int) bool {
	return status == http.StatusBadGateway || status == http.StatusServiceUnavailable || status == http.StatusGatewayTimeout
}

func responseStatus(resp *http.Response) int {
	if resp == nil {
		return 0
	}
	return resp.StatusCode
}
