package image

import (
	"fmt"
	"io/ioutil"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
)

const maxFileSize = 1 << 20

// Service handles validating and saving of files
type Service struct {
	imagePath  string
	authClient *AuthClient
}

func (s *Service) uploadFile(w http.ResponseWriter, r *http.Request) {
	status, err := s.authClient.Validate(getToken(r))
	if err != nil {
		error := Error{http.StatusBadRequest, "VALIDATION_ERROR",
			"There was an error while validating the upload request."}
		ErrorResponse(w, error)
		return
	} else if status.Error != nil {
		error := Error{int(status.Error.Code), status.Error.Error, status.Error.Message}
		ErrorResponse(w, error)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxFileSize)

	err = r.ParseMultipartForm(maxFileSize)
	if err != nil {
		log.Printf("Error Parsing File %v", err)

		error := Error{http.StatusBadRequest, "FILE_TOO_BIG",
			"File should be smaller than 1MB."}
		ErrorResponse(w, error)
		return
	}

	file, _, err := r.FormFile("image")
	defer file.Close()
	if err != nil {
		log.Printf("Error Retrieving File %v", err)

		error := Error{http.StatusBadRequest, "FILE_ERROR",
			"There was an error while processing the image."}
		ErrorResponse(w, error)
		return
	}

	s.saveFile(w, file)
}

func (s *Service) saveFile(w http.ResponseWriter, file multipart.File) {
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

func (s *Service) getFile(w http.ResponseWriter, r *http.Request) {
	filePath := fmt.Sprintf("%s/%s", s.imagePath, filepath.Base(r.URL.Path))

	_, err := os.Stat(filePath)
	if err != nil {
		error := Error{http.StatusNotFound, "NOT_FOUND", "There is no such file."}
		ErrorResponse(w, error)
		return
	}
	http.ServeFile(w, r, filePath)
}
