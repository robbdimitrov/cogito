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
