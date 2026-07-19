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

// isPublicResourceRead matches GET {prefix}{id}, and GET {prefix}{id}/{allowedSubpath} if set.
// reservedID excludes a sibling literal route (e.g. "feed") that would otherwise collide with {id}.
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

// isPublicPostRead matches GET /posts/{postId} only; postsFeedSegment is excluded
// since GET /posts/feed is the gated, session-required getFeed route.
func isPublicPostRead(r *http.Request) bool {
	return isPublicResourceRead(r, "/posts/", postsFeedSegment, "")
}

// isPublicUserRead matches GET /users/{userId} and .../posts only; likes,
// replies, following, and followers stay gated.
func isPublicUserRead(r *http.Request) bool {
	return isPublicResourceRead(r, "/users/", "", "posts")
}

// isPublicUserByUsernameRead matches GET /users?username= and uses optional
// session validation so logged-in callers do not look anonymous.
func isPublicUserByUsernameRead(r *http.Request) bool {
	return r.Method == http.MethodGet && r.URL.Path == "/users"
}
