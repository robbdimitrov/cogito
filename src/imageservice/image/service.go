package image

import (
	"fmt"
	"io/ioutil"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

const maxFileSize = 1 << 20

type service struct {
	imagePath string
}

func (s *service) uploadFile(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxFileSize)

	err := r.ParseMultipartForm(maxFileSize)
	if err != nil {
		log.Printf("Error Parsing File %v", err)
		errorResponse(w, "File should be smaller than 1MB.", 400)
		return
	}

	file, _, err := r.FormFile("image")
	if err != nil {
		log.Printf("Error Retrieving File %v", err)
		errorResponse(w, "There was an error while processing the image.", 400)
		return
	}
	defer file.Close()

	s.saveFile(w, file)
}

func (s *service) saveFile(w http.ResponseWriter, file multipart.File) {
	data, err := ioutil.ReadAll(file)
	if err != nil {
		log.Printf("Error reading file: %v", err)
		errorResponse(w, "There was an error while processing the image.", 400)
		return
	}

	mimeType := http.DetectContentType(data)
	switch mimeType {
	case "image/jpeg", "image/jpg", "image/png":
		break
	default:
		log.Printf("Error processing image: unsupported format %v", mimeType)
		errorResponse(w, "The file type is not valid.", 400)
		return
	}

	filename := randToken(16)
	path := strings.Join([]string{s.imagePath, filename}, "/")

	err = ioutil.WriteFile(path, data, 0666)
	if err != nil {
		log.Printf("Error writing file: %v", err)
		errorResponse(w, "There was an error while processing the image.", 500)
		return
	}
	jsonResponse(w, map[string]string{"image": filename}, 201)
}

func (s *service) getFile(w http.ResponseWriter, r *http.Request) {
	filePath := fmt.Sprintf("%s/%s", s.imagePath, filepath.Base(r.URL.Path))

	_, err := os.Stat(filePath)
	if err != nil {
		errorResponse(w, "There is no such file.", 404)
		return
	}
	http.ServeFile(w, r, filePath)
}
