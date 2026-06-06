package post

import (
	"iter"
	"time"

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
	var created time.Time
	var repostCreated *time.Time

	err := r.Scan(&post.Id, &post.UserId, &post.Content, &post.Likes,
		&post.Liked, &post.Reposts, &post.Reposted, &created,
		&post.RepostByUserId, &repostCreated, &post.MediaKey,
		&post.Replies, &post.InReplyToId, &post.QuoteOfId)
	if err != nil {
		return nil, err
	}

	post.Created = created.UTC().Format(time.RFC3339)
	if repostCreated != nil {
		post.RepostCreated = repostCreated.UTC().Format(time.RFC3339)
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
