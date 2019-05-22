package image

import (
	"encoding/json"
	"log"
	"net/http"
)

func jsonResponse(w http.ResponseWriter, code int) {
	w.Header().Set("content-type", "application/json")
	w.WriteHeader(code)
}

// SuccessResponse returns a successful json response
func SuccessResponse(w http.ResponseWriter, filename string) {
	jsonResponse(w, http.StatusCreated)

	res := map[string]string{"filename": filename}
	json, err := json.Marshal(res)
	if err != nil {
		log.Printf("Error converting to json %v", err)
		return
	}

	w.Write(json)
}

// ErrorResponse returns an erroneous json response
func ErrorResponse(w http.ResponseWriter, error Error) {
	jsonResponse(w, error.Code)

	json, err := json.Marshal(error)
	if err != nil {
		log.Printf("Error converting to json %v", err)
		return
	}

	w.Write(json)
}
