package image

import (
	"encoding/json"
	"net/http"
)

func jsonResponse(w http.ResponseWriter, body interface{}, status int) {
	w.Header().Set("content-type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		http.Error(w, "Malformed data", 500)
	}
}

func errorResponse(w http.ResponseWriter, message string, status int) {
	jsonResponse(w, map[string]string{"message": message}, status)
}
