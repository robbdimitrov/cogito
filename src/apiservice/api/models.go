package api

type user struct {
	id        int32  `json:"id"`
	name      string `json:"name"`
	username  string `json:"username"`
	email     string `json:"email"`
	avatar    string `json:"avatar"`
	bio       string `json:"bio"`
	posts     int32  `json:"posts"`
	likes     int32  `json:"likes"`
	following int32  `json:"following"`
	followers int32  `json:"followers"`
	followed  bool   `json:"followed"`
	created   string `json:"created"`
}

type post struct {
	id        int32  `json:"id"`
	userID    int32  `json:"userId"`
	content   string `json:"content"`
	likes     int32  `json:"likes"`
	liked     bool   `json:"liked"`
	retweets  int32  `json:"retweets"`
	retweeted bool   `json:"retweeted"`
	created   string `json:"created"`
}

type session struct {
	id      int32  `json:"id"`
	userID  int32  `json:"userId"`
	created string `json:"created"`
}
