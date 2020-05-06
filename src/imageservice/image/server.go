package image

import (
	"fmt"
	"log"
	"net/http"
)

func logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("Request %s %s", r.Method, r.RequestURI)
		next.ServeHTTP(w, r)
	})
}

func createRouter(s *controller) *http.ServeMux {
	router := http.NewServeMux()
	router.Handle("/uploads", logger(http.HandlerFunc(s.uploadFile)))
	router.Handle("/uploads/", logger(http.HandlerFunc(s.getFile)))
	return router
}

// CreateServer is a constructor for new Server objects
func CreateServer(port string, imageDir string) *http.Server {
	return &http.Server{
		Addr:    fmt.Sprintf(":%s", port),
		Handler: createRouter(newController(imageDir)),
	}
}
