package image

import (
	"encoding/json"
	"net/http"
)

func jsonResponse(w http.ResponseWriter, body interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		http.Error(w, "Malformed data", http.StatusInternalServerError)
	}
}

func errorResponse(w http.ResponseWriter, message string, status int) {
	body := map[string]string{"message": message}
	jsonResponse(w, body, status)
}
