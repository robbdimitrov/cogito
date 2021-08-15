package post

import (
	"github.com/jackc/pgx/v4"
)

type row interface {
	Scan(dest ...interface{}) error
}

func mapPost(r row) (*Post, error) {
	post := Post{}

	err := r.Scan(&post.Id, &post.UserId, &post.Content, &post.Likes,
		&post.Liked, &post.Reposts, &post.Reposted, &post.Created)
	if err != nil {
		return nil, err
	}

	return &post, nil
}

func mapPosts(r pgx.Rows) ([]*Post, error) {
	posts := []*Post{}
	for r.Next() {
		post, err := mapPost(r)
		if err != nil {
			return nil, err
		}
		posts = append(posts, post)
	}
	return posts, nil
}
