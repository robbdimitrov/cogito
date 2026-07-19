package api

type user struct {
	ID              int32  `json:"id"`
	Name            string `json:"name"`
	Username        string `json:"username"`
	Email           string `json:"email"`
	Bio             string `json:"bio"`
	Posts           int32  `json:"posts"`
	Replies         int32  `json:"replies"`
	Likes           int32  `json:"likes"`
	Following       int32  `json:"following"`
	Followers       int32  `json:"followers"`
	Followed        bool   `json:"followed"`
	Created         string `json:"created"`
	ProfilePhotoKey string `json:"profilePhotoKey,omitempty"`
	CoverPhotoKey   string `json:"coverPhotoKey,omitempty"`
}

type post struct {
	PublicID          string `json:"publicId"`
	UserID            int32  `json:"userId"`
	Content           string `json:"content"`
	Likes             int32  `json:"likes"`
	Liked             bool   `json:"liked"`
	Reposts           int32  `json:"reposts"`
	Reposted          bool   `json:"reposted"`
	Created           string `json:"created"`
	RepostOfPublicID  string `json:"repostOfPublicId,omitempty"`
	RepostOf          *post  `json:"repostOf,omitempty"`
	MediaKey          string `json:"mediaKey,omitempty"`
	Replies           int32  `json:"replies"`
	InReplyToPublicID string `json:"inReplyToPublicId,omitempty"`
	// InReplyToUsername is only populated by getUserReplies, for the profile
	// Replies tab's "Replying to @x" affordance.
	InReplyToUsername *string `json:"inReplyToUsername,omitempty"`
	QuoteOfPublicID   string  `json:"quoteOfPublicId,omitempty"`
	QuotePost         *post   `json:"quotePost,omitempty"`
	User              *user   `json:"user,omitempty"`
}

type session struct {
	ID      string `json:"id"`
	UserID  int32  `json:"userId"`
	Created string `json:"created"`
}

type hashtag struct {
	ID        int32  `json:"id"`
	Name      string `json:"name"`
	PostCount int32  `json:"postCount"`
}
