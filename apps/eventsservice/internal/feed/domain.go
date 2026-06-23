package feed

import "time"

type Entry struct {
	UserID  int32
	PostID  int32
	Created time.Time
}
