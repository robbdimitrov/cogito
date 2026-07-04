package api

import (
	"net/http"
	"strings"
)

type route struct {
	method string
	path   string
}

var allowed = []route{
	{method: "POST", path: "/sessions"},
	{method: "DELETE", path: "/sessions"},
	{method: "POST", path: "/users"},
	{method: "GET", path: "/"},
}

func authGuard(ac *authController) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			for _, v := range allowed {
				if r.Method == v.method && r.URL.Path == v.path {
					next.ServeHTTP(w, r)
					return
				}
			}
			if isPublicUploadRead(r) {
				next.ServeHTTP(w, r)
				return
			}
			if isPublicPostRead(r) || isPublicUserRead(r) || isPublicUserByUsernameRead(r) {
				newReq, err := ac.validateSessionOptional(w, r)
				if err != nil {
					grpcError(w, err)
					return
				}
				next.ServeHTTP(w, newReq)
				return
			}
			newReq, err := ac.validateSession(w, r)
			if err != nil {
				return // validation already wrote error to w
			}
			next.ServeHTTP(w, newReq)
		})
	}
}

func isPublicUploadRead(r *http.Request) bool {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		return false
	}
	filename, ok := strings.CutPrefix(r.URL.Path, "/uploads/")
	return ok && filename != "" && !strings.Contains(filename, "/")
}

// isPublicResourceRead matches GET {prefix}{id} and, if allowedSubpath is
// non-empty, GET {prefix}{id}/{allowedSubpath}. reservedID excludes a sibling
// literal route registered under the same prefix that would otherwise collide
// with the {id} shape (e.g. "feed" for /posts/feed, "search" for
// /users/search).
func isPublicResourceRead(r *http.Request, prefix, reservedID, allowedSubpath string) bool {
	if r.Method != http.MethodGet {
		return false
	}
	rest, ok := strings.CutPrefix(r.URL.Path, prefix)
	if !ok || rest == "" {
		return false
	}
	if !strings.Contains(rest, "/") {
		return rest != reservedID
	}
	if allowedSubpath == "" {
		return false
	}
	id, sub, ok := strings.Cut(rest, "/")
	return ok && id != "" && id != reservedID && sub == allowedSubpath
}

// isPublicPostRead matches GET /posts/{postId} only. "feed" is excluded
// because GET /posts/feed is the personalized, session-required getFeed
// route and has the same single-segment shape as /posts/{postId}.
func isPublicPostRead(r *http.Request) bool {
	return isPublicResourceRead(r, "/posts/", "feed", "")
}

// isPublicUserRead matches GET /users/{userId} and GET /users/{userId}/posts
// only. "search" is excluded because GET /users/search is the session-required
// searchUsers route and collides with the /users/{userId} shape; "likes",
// "following", "followers" stay gated since only "posts" is public.
func isPublicUserRead(r *http.Request) bool {
	return isPublicResourceRead(r, "/users/", "search", "posts")
}

// isPublicUserByUsernameRead matches GET /users (getUserByUsername, looked up
// via the ?username= query string) — the username-based counterpart to
// isPublicUserRead's numeric-id path. Deliberately routed through
// validateSessionOptional like the other viewer-optional reads rather than
// the unconditional `allowed` allowlist, so a logged-in caller's session is
// still resolved instead of always looking anonymous.
func isPublicUserByUsernameRead(r *http.Request) bool {
	return r.Method == http.MethodGet && r.URL.Path == "/users"
}
