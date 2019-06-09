package image

import (
	"crypto/rand"
	"fmt"
	"net/http"
)

// RandToken generates a random string
func RandToken(len int) string {
	b := make([]byte, len)
	rand.Read(b)
	return fmt.Sprintf("%x", b)
}

func getToken(r *http.Request) string {
	return r.Header.Get("Authorization")
}
