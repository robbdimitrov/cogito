package image

import (
	"crypto/rand"
	"encoding/hex"
)

// randToken generates a random string
func randToken(len int) (string, error) {
	bytes := make([]byte, len)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
