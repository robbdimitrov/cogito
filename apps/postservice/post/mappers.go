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

// mapPost maps simple read queries (no repost shells, 13 columns).
func mapPost(r row) (*pb.Post, error) {
	post := pb.Post{}
	var content *string
	var created time.Time
	var repostOfID *int32

	err := r.Scan(&post.Id, &post.UserId, &content,
		&post.Likes, &post.Liked, &post.Reposts, &post.Reposted,
		&created, &repostOfID, &post.MediaKey, &post.Replies,
		&post.InReplyToId, &post.QuoteOfId)
	if err != nil {
		return nil, err
	}

	post.Created = created.UTC().Format(time.RFC3339)
	if content != nil {
		post.Content = *content
	}
	if repostOfID != nil {
		post.RepostOfId = repostOfID
	}
	return &post, nil
}

// mapFeedPost maps feed queries that may include repost shells (21 columns).
func mapFeedPost(r row) (*pb.Post, error) {
	post := pb.Post{}
	var created time.Time
	var content *string
	var repostOfID *int32
	var oID *int32
	var oUserID *int32
	var oContent *string
	var oCreated *time.Time
	var oMediaKey *string
	var oInReplyToID int32
	var oQuoteOfID int32

	err := r.Scan(&post.Id, &post.UserId, &content,
		&post.Likes, &post.Liked, &post.Reposts, &post.Reposted,
		&created, &repostOfID, &post.MediaKey, &post.Replies,
		&post.InReplyToId, &post.QuoteOfId,
		&oID, &oUserID, &oContent, &oCreated, &oMediaKey,
		&oInReplyToID, &oQuoteOfID)
	if err != nil {
		return nil, err
	}

	post.Created = created.UTC().Format(time.RFC3339)
	if content != nil {
		post.Content = *content
	}
	if repostOfID != nil {
		post.RepostOfId = repostOfID
		orig := &pb.Post{
			Id:          *oID,
			UserId:      *oUserID,
			Likes:       post.Likes,
			Liked:       post.Liked,
			Reposts:     post.Reposts,
			Reposted:    post.Reposted,
			Replies:     post.Replies,
			InReplyToId: oInReplyToID,
			QuoteOfId:   oQuoteOfID,
		}
		if oContent != nil {
			orig.Content = *oContent
		}
		if oCreated != nil {
			orig.Created = oCreated.UTC().Format(time.RFC3339)
		}
		if oMediaKey != nil {
			orig.MediaKey = *oMediaKey
		}
		post.RepostOf = orig
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

func mapFeedPosts(r rows) iter.Seq2[*pb.Post, error] {
	return func(yield func(*pb.Post, error) bool) {
		defer r.Close()
		for r.Next() {
			post, err := mapFeedPost(r)
			if !yield(post, err) {
				return
			}
		}
		if err := r.Err(); err != nil {
			yield(nil, err)
		}
	}
}
