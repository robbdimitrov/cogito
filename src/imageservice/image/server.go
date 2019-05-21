package image

import (
	"fmt"
	"io/ioutil"
	"log"
	"mime/multipart"
	"net/http"
)

const maxFileSize = 1 << 20

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

	r.Body = http.MaxBytesReader(w, r.Body, maxFileSize)
	err := r.ParseMultipartForm(maxFileSize)
	if err != nil {
		log.Printf("Error Parsing File %v", err)

		error := Error{http.StatusBadRequest, "FILE_TOO_BIG",
			"File should be smaller than 1MB."}
		ErrorResponse(w, error)
		return
	}

	file, _, err := r.FormFile("image")
	if err != nil {
		log.Printf("Error Retrieving File %v", err)

		error := Error{http.StatusBadRequest, "FILE_ERROR",
			"There was an error while processing the image."}
		ErrorResponse(w, error)
		return
	}
	defer file.Close()

	s.saveFile(w, file)
}

func (s *Server) saveFile(w http.ResponseWriter, file multipart.File) {
	data, err := ioutil.ReadAll(file)
	if err != nil {
		log.Printf("Error reading file: %v", err)
		error := Error{http.StatusBadRequest, "FILE_ERROR",
			"There was an error while processing the image."}
		ErrorResponse(w, error)
		return
	}

	mimeType := http.DetectContentType(data)
	switch mimeType {
	case "image/jpeg", "image/jpg", "image/png":
		break
	default:
		error := Error{http.StatusBadRequest, "INVALID_FILE",
			"The format file is not valid."}
		ErrorResponse(w, error)
		return
	}

	path := fmt.Sprintf("%s/", s.imagePath)
	filename := RandToken(12)
	err = ioutil.WriteFile(path+filename, data, 0666)
	if err != nil {
		log.Printf("Error writing file %v", err)
		error := Error{http.StatusBadRequest, "FILE_ERROR",
			"There was an error while processing the image."}
		ErrorResponse(w, error)
		return
	}
	SuccessResponse(w, filename)
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
