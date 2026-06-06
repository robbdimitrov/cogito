package post

import (
	"iter"

	pb "github.com/robbdimitrov/thoughts/src/postservice/genproto"
)

type row interface {
	Scan(dest ...interface{}) error
}

type rows interface {
	row
	Close()
	Err() error
	Next() bool
}

func mapPost(r row) (*pb.Post, error) {
	post := pb.Post{}

	err := r.Scan(&post.Id, &post.UserId, &post.Content, &post.Likes,
		&post.Liked, &post.Reposts, &post.Reposted, &post.Created,
		&post.RepostByUserId, &post.RepostCreated, &post.MediaKey,
		&post.Replies, &post.InReplyToId, &post.QuoteOfId)
	if err != nil {
		return nil, err
	}

	return &post, nil
}

func mapPosts(r rows) iter.Seq2[*pb.Post, error] {
	return func(yield func(*pb.Post, error) bool) {
		defer r.Close()
		for r.Next() {
			post, err := mapPost(r)
			if !yield(post, err) {
				return
			}
		}
		if err := r.Err(); err != nil {
			yield(nil, err)
		}
	}
}
