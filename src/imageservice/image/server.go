package image

import (
	"crypto/rand"
	"fmt"
	"io/ioutil"
	"log"
	"mime/multipart"
	"net/http"
)

// Server is runing on a port and handling grpc requests
type Server struct {
	port      string
	imagePath string
}

// NewServer is a constructor for new Server objects
func NewServer(port string, imagePath string) *Server {
	return &Server{port, imagePath}
}

func (s *Server) uploadFile(w http.ResponseWriter, r *http.Request) {
	log.Println("File Upload Endpoint Hit")

	if err := r.ParseMultipartForm(1024 * 1024 * 10); err != nil {
		jsonResponse(w, http.StatusBadRequest, "FILE_TOO_BIG")
		return
	}

	file, _, err := r.FormFile("image")
	if err != nil {
		log.Printf("Error Retrieving the File %v", err)
		return
	}
	defer file.Close()

	s.saveFile(w, file)
}

func (s *Server) saveFile(w http.ResponseWriter, file multipart.File) {
	data, err := ioutil.ReadAll(file)
	if err != nil {
		fmt.Fprintf(w, "%v", err)
		return
	}

	mimeType := http.DetectContentType(data)
	switch mimeType {
	case "image/jpeg", "image/jpg", "image/png":
		break
	default:
		jsonResponse(w, http.StatusBadRequest, "The format file is not valid.")
		return
	}

	path := fmt.Sprintf("%s/", s.imagePath)
	err = ioutil.WriteFile(path+randToken(12), data, 0666)
	if err != nil {
		fmt.Fprintf(w, "%v", err)
		return
	}
	jsonResponse(w, http.StatusCreated, "File uploaded successfully!.")
}

func jsonResponse(w http.ResponseWriter, code int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	fmt.Fprint(w, message)
}

func randToken(len int) string {
	b := make([]byte, len)
	rand.Read(b)
	return fmt.Sprintf("%x", b)
}

func (s *Server) setupRoutes() {
	fs := http.FileServer(http.Dir(s.imagePath))
	http.Handle("/images/", http.StripPrefix("/images", fs))

	http.HandleFunc("/upload", s.uploadFile)
}

// Start starts the server instance
func (s *Server) Start() {
	s.setupRoutes()
	log.Printf("Starting server on port %s\n", s.port)

	err := http.ListenAndServe(fmt.Sprintf(":%s", s.port), nil)
	if err != nil {
		log.Fatalf("Error prevented the server from running: %v", err)
	}
}
