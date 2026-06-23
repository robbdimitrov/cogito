package notifications

import "time"

type Notification struct {
	ID         int64
	ExternalID int64
	UserID     int32
	ActorID    int32
	Type       string
	EntityID   string
	Read       bool
	Created    time.Time
}
