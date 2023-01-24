package api

type user struct {
	ID        int32  `json:"id"`
	Name      string `json:"name"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	Bio       string `json:"bio"`
	Posts     int32  `json:"posts"`
	Likes     int32  `json:"likes"`
	Following int32  `json:"following"`
	Followers int32  `json:"followers"`
	Followed  bool   `json:"followed"`
	Created   string `json:"created"`
}

type post struct {
	ID       int32  `json:"id"`
	UserID   int32  `json:"userId"`
	Content  string `json:"content"`
	Likes    int32  `json:"likes"`
	Liked    bool   `json:"liked"`
	Reposts  int32  `json:"reposts"`
	Reposted bool   `json:"reposted"`
	Created  string `json:"created"`
}
