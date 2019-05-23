package image

import (
	"fmt"
	"io/ioutil"
	"log"
	"mime/multipart"
	"net/http"
)

const maxFileSize = 1 << 20

// Service handles validating and saving of files
type Service struct {
	imagePath  string
	authClient *AuthClient
}

// UploadFile handles validation and uploading of image files
func (s *Service) UploadFile(w http.ResponseWriter, r *http.Request) {
	log.Println("File Upload Endpoint Hit")

	// s.authClient.Validate(getToken(r))

	// status, err := s.authClient.Validate(getToken(r))
	// if err != nil {
	// 	error := Error{http.StatusBadRequest, "VALIDATION_ERROR",
	// 		"There was an error while validating the upload request."}
	// 	ErrorResponse(w, error)
	// 	return
	// } else if status.Error != nil {
	// 	error := Error{int(status.Error.Code), status.Error.Error, status.Error.Message}
	// 	ErrorResponse(w, error)
	// 	return
	// }

	log.Printf("Begin = %v", r.Body)

	r.Body = http.MaxBytesReader(w, r.Body, maxFileSize)

	log.Printf("Begin 2 = %v", r.Body)

	err := r.ParseMultipartForm(maxFileSize)

	log.Printf("Begin 3 = %v", r.Body)

	if err != nil {
		log.Printf("Error Parsing File %v", err)

		error := Error{http.StatusBadRequest, "FILE_TOO_BIG",
			"File should be smaller than 1MB."}
		ErrorResponse(w, error)
		return
	}

	log.Printf("parsing body = %v", err)

	file, _, err := r.FormFile("image")
	if err != nil {
		log.Printf("Error Retrieving File %v", err)

		error := Error{http.StatusBadRequest, "FILE_ERROR",
			"There was an error while processing the image."}
		ErrorResponse(w, error)
		return
	}
	defer file.Close()

	log.Printf("file = %v", file)

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
