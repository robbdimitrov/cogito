package post

import (
	"encoding/base64"
	"encoding/json"
	"time"
)

// Cursor encodes the stable sort key used for keyset pagination.
type Cursor struct {
	Created time.Time `json:"created"`
	ID      int32     `json:"id"`
}

// DecodeCursor base64-decodes and JSON-unmarshals a cursor string.
// Returns (zero, false, nil) for an empty string; error for malformed input.
func DecodeCursor(s string) (Cursor, bool, error) {
	if s == "" {
		return Cursor{}, false, nil
	}
	b, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		return Cursor{}, false, err
	}
	var c Cursor
	if err := json.Unmarshal(b, &c); err != nil {
		return Cursor{}, false, err
	}
	return c, true, nil
}

// EncodeCursor serializes a (created, id) pair into an opaque cursor string.
func EncodeCursor(created time.Time, id int32) string {
	b, _ := json.Marshal(Cursor{Created: created.UTC(), ID: id})
	return base64.RawURLEncoding.EncodeToString(b)
}
