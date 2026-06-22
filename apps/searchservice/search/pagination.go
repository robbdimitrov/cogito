package search

import (
	"encoding/base64"
	"encoding/json"
)

type searchCursorPayload struct {
	Offset int32 `json:"offset"`
}

func decodeSearchCursor(s string) int32 {
	if s == "" {
		return 0
	}
	b, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		return 0
	}
	var p searchCursorPayload
	if err := json.Unmarshal(b, &p); err != nil {
		return 0
	}
	return p.Offset
}

func encodeSearchCursor(offset int32) string {
	b, _ := json.Marshal(searchCursorPayload{Offset: offset})
	return base64.RawURLEncoding.EncodeToString(b)
}
