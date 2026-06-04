package api

type user struct {
	ID              int32  `json:"id"`
	Name            string `json:"name"`
	Username        string `json:"username"`
	Email           string `json:"email"`
	Bio             string `json:"bio"`
	Posts           int32  `json:"posts"`
	Likes           int32  `json:"likes"`
	Following       int32  `json:"following"`
	Followers       int32  `json:"followers"`
	Followed        bool   `json:"followed"`
	Created         string `json:"created"`
	ProfilePhotoKey string `json:"profilePhotoKey,omitempty"`
	CoverPhotoKey   string `json:"coverPhotoKey,omitempty"`
}

type post struct {
	ID                int32  `json:"id"`
	UserID            int32  `json:"userId"`
	Content           string `json:"content"`
	Likes             int32  `json:"likes"`
	Liked             bool   `json:"liked"`
	Reposts           int32  `json:"reposts"`
	Reposted          bool   `json:"reposted"`
	Created           string `json:"created"`
	RepostByUserID int32  `json:"repostByUserId"`
	RepostCreated  string `json:"repostCreated"`
	MediaKey          string `json:"mediaKey,omitempty"`
	Replies           int32  `json:"replies"`
	InReplyToID       int32  `json:"inReplyToId,omitempty"`
	QuoteOfID         int32  `json:"quoteOfId,omitempty"`
	QuotePost         *post  `json:"quotePost,omitempty"`
}

type session struct {
	ID      string `json:"id"`
	UserID  int32  `json:"userId"`
	Created string `json:"created"`
}
