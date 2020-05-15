package image

import (
	"crypto/rand"
	"encoding/base64"
)

func generateFilename() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return ""
	}
	return base64.StdEncoding.EncodeToString(bytes)
}
