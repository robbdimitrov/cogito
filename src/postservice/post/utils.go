package post

import (
	"database/sql"
	"errors"

	pb "postservice/genproto"
)

type scanner interface {
	Scan(dest ...interface{}) error
}

func rowToPost(row scanner) (pb.Post, error) {
	var (
		id          int32
		content     string
		userID      int32
		likes       int32
		retweets    int32
		dateCreated string
	)

	err := row.Scan(&id, &content, &userID, &likes, &retweets, &dateCreated)
	if err != nil {
		return pb.Post{}, errors.New("Error happened while parsing database response")
	}

	post := pb.Post{
		Id:          id,
		Content:     content,
		UserId:      userID,
		Likes:       likes,
		Retweets:    retweets,
		DateCreated: dateCreated}

	return post, nil
}

func rowsToPosts(rows *sql.Rows) (pb.Posts, error) {
	var posts []*pb.Post
	for rows.Next() {
		post, err := rowToPost(rows)

		if err != nil {
			return pb.Posts{}, err
		}
		posts = append(posts, &post)
	}
	return pb.Posts{Posts: posts}, nil
}
