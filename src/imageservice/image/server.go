package image

import (
	"fmt"
	"net/http"
)

func createRouter(s *service) *http.ServeMux {
	router := http.NewServeMux()
	router.HandleFunc("/uploads", s.uploadFile)
	router.HandleFunc("/uploads/", s.getFile)
	return router
}

// CreateServer is a constructor for new Server objects
func CreateServer(port string, imageDir string) *http.Server {
	service := &service{imageDir}
	server := &http.Server{
		Addr:    fmt.Sprintf(":%s", port),
		Handler: createRouter(service),
	}
	return server
}
