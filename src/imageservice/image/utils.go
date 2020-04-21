package image

import (
	"crypto/rand"
	"encoding/hex"
)

// randToken generates a random string
func randToken(len int) string {
	bytes := make([]byte, len)
	if _, err := rand.Read(bytes); err != nil {
		return ""
	}
	return hex.EncodeToString(bytes)
}
