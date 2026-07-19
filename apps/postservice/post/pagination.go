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

// maxPopularOffset bounds OFFSET-based pagination since the ranking key is a
// computed score, not a stable keyset column; matches flowservice's cap.
const maxPopularOffset = 1000

type offsetCursor struct {
	Offset int32 `json:"offset"`
}

// DecodeOffsetCursor base64-decodes and JSON-unmarshals an offset cursor. A malformed
// or negative offset is clamped to 0 rather than rejected, since it only affects the page served.
func DecodeOffsetCursor(s string) (int32, error) {
	if s == "" {
		return 0, nil
	}
	b, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		return 0, err
	}
	var c offsetCursor
	if err := json.Unmarshal(b, &c); err != nil {
		return 0, err
	}
	if c.Offset < 0 {
		return 0, nil
	}
	if c.Offset > maxPopularOffset {
		return maxPopularOffset, nil
	}
	return c.Offset, nil
}

// EncodeOffsetCursor serializes a page offset into an opaque cursor string.
// Returns "" at or beyond maxPopularOffset to signal end-of-results.
func EncodeOffsetCursor(offset int32) string {
	if offset >= maxPopularOffset {
		return ""
	}
	b, _ := json.Marshal(offsetCursor{Offset: offset})
	return base64.RawURLEncoding.EncodeToString(b)
}
