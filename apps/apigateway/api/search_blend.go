package api

import (
	"encoding/base64"
	"encoding/json"
)

// computeBlendTargets splits a page limit ~20% users / 60% posts / 20% hashtags,
// favoring posts; small limits round users/hashtags up to at least 1 before giving the remainder to posts.
func computeBlendTargets(limit int) (users, posts, hashtags int) {
	if limit <= 0 {
		return 0, 0, 0
	}
	if limit == 1 {
		return 0, 1, 0
	}
	if limit == 2 {
		return 1, 1, 0
	}
	users = limit / 5
	hashtags = limit / 5
	if users == 0 {
		users = 1
	}
	if hashtags == 0 {
		hashtags = 1
	}
	posts = limit - users - hashtags
	return
}

// allCursor wraps each type's already-opaque cursor verbatim; the gateway
// never decodes or re-encodes a per-type cursor's internal shape.
type allCursor struct {
	Users    string `json:"u"`
	Posts    string `json:"p"`
	Hashtags string `json:"h"`
}

var blendCursorEncoding = base64.URLEncoding.WithPadding(base64.NoPadding)

// decodeAllCursor decodes a combined cursor (matching flowservice's base64url-no-pad
// encoding); an empty or malformed cursor restarts every type from its first page.
func decodeAllCursor(cursor string) allCursor {
	if cursor == "" {
		return allCursor{}
	}
	raw, err := blendCursorEncoding.DecodeString(cursor)
	if err != nil {
		return allCursor{}
	}
	var c allCursor
	if err := json.Unmarshal(raw, &c); err != nil {
		return allCursor{}
	}
	return c
}

// encodeAllCursor encodes the combined cursor, or "" if every per-type
// cursor is empty (i.e. every type is exhausted).
func encodeAllCursor(c allCursor) string {
	if c.Users == "" && c.Posts == "" && c.Hashtags == "" {
		return ""
	}
	raw, err := json.Marshal(c)
	if err != nil {
		return ""
	}
	return blendCursorEncoding.EncodeToString(raw)
}

// blendedItem is one entry in the blended "all" search results list.
type blendedItem struct {
	Type string `json:"type"`
	Item any    `json:"item"`
}

// interleaveBlended merges three relevance-ordered lists, preserving each list's order
// while spreading entries by each list's consumed share rather than emitting three blocks.
func interleaveBlended(users, posts, hashtags []blendedItem) []blendedItem {
	streams := [][]blendedItem{users, posts, hashtags}
	next := [3]int{0, 0, 0}

	total := len(users) + len(posts) + len(hashtags)
	result := make([]blendedItem, 0, total)

	for len(result) < total {
		best := -1
		bestScore := 0.0
		for i, s := range streams {
			if next[i] >= len(s) {
				continue
			}
			score := (float64(next[i]) + 0.5) / float64(len(s))
			if best == -1 || score < bestScore {
				best = i
				bestScore = score
			}
		}
		result = append(result, streams[best][next[best]])
		next[best]++
	}
	return result
}
