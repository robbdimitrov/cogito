package image

import (
	"crypto/rand"
	"fmt"
)

// RandToken generates a random string
func RandToken(len int) string {
	b := make([]byte, len)
	rand.Read(b)
	return fmt.Sprintf("%x", b)
}
