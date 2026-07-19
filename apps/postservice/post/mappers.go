package post

import (
	"iter"
	"time"

	pb "cogito/postservice/genproto"
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

	post.Created = created.UTC().Format(time.RFC3339Nano)
	if content != nil {
		post.Content = *content
	}
	if repostOfID != nil {
		post.RepostOfId = repostOfID
	}
	return &post, nil
}

// mapFeedPost maps feed queries that may include repost shells (21 columns), returning
// the raw created timestamp too so callers can use it directly as a cursor.
func mapFeedPost(r row) (*pb.Post, time.Time, error) {
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
		return nil, time.Time{}, err
	}

	post.Created = created.UTC().Format(time.RFC3339Nano)
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
			orig.Created = oCreated.UTC().Format(time.RFC3339Nano)
		}
		if oMediaKey != nil {
			orig.MediaKey = *oMediaKey
		}
		post.RepostOf = orig
	}
	return &post, created, nil
}

// mapMaterializedFeedPost maps materialized feed rows that include f.created (22 columns).
func mapMaterializedFeedPost(r row) (*pb.Post, time.Time, error) {
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
	var fanOutCreated time.Time

	err := r.Scan(&post.Id, &post.UserId, &content,
		&post.Likes, &post.Liked, &post.Reposts, &post.Reposted,
		&created, &repostOfID, &post.MediaKey, &post.Replies,
		&post.InReplyToId, &post.QuoteOfId,
		&oID, &oUserID, &oContent, &oCreated, &oMediaKey,
		&oInReplyToID, &oQuoteOfID, &fanOutCreated)
	if err != nil {
		return nil, time.Time{}, err
	}

	post.Created = created.UTC().Format(time.RFC3339Nano)
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
			orig.Created = oCreated.UTC().Format(time.RFC3339Nano)
		}
		if oMediaKey != nil {
			orig.MediaKey = *oMediaKey
		}
		post.RepostOf = orig
	}
	return &post, fanOutCreated, nil
}

func collectMaterializedFeedPosts(r rows) ([]feedPostItem, error) {
	defer r.Close()
	var out []feedPostItem
	for r.Next() {
		post, fanOutCreated, err := mapMaterializedFeedPost(r)
		if err != nil {
			return nil, err
		}
		out = append(out, feedPostItem{post: post, created: fanOutCreated})
	}
	return out, r.Err()
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

// mapPostCursorRows maps queries built on postWithRepostSelect (21 columns),
// resolving a repost row's original into Post.RepostOf.
func mapPostCursorRows(r rows) iter.Seq2[postCursorRow, error] {
	return func(yield func(postCursorRow, error) bool) {
		defer r.Close()
		for r.Next() {
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
				if !yield(postCursorRow{}, err) {
					return
				}
				continue
			}
			post.Created = created.UTC().Format(time.RFC3339Nano)
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
					orig.Created = oCreated.UTC().Format(time.RFC3339Nano)
				}
				if oMediaKey != nil {
					orig.MediaKey = *oMediaKey
				}
				post.RepostOf = orig
			}
			if !yield(postCursorRow{Post: &post, CursorTS: created}, nil) {
				return
			}
		}
		if err := r.Err(); err != nil {
			yield(postCursorRow{}, err)
		}
	}
}

type postCursorRow struct {
	Post     *pb.Post
	CursorTS time.Time
}

type likedPostRow struct {
	Post     *pb.Post
	CursorTS time.Time
}

func mapLikedPosts(r rows) iter.Seq2[likedPostRow, error] {
	return func(yield func(likedPostRow, error) bool) {
		defer r.Close()
		for r.Next() {
			var cursorTS time.Time
			post := pb.Post{}
			var content *string
			var created time.Time
			var repostOfID *int32

			err := r.Scan(&cursorTS, &post.Id, &post.UserId, &content,
				&post.Likes, &post.Liked, &post.Reposts, &post.Reposted,
				&created, &repostOfID, &post.MediaKey, &post.Replies,
				&post.InReplyToId, &post.QuoteOfId)
			if err != nil {
				if !yield(likedPostRow{}, err) {
					return
				}
				continue
			}
			post.Created = created.UTC().Format(time.RFC3339Nano)
			if content != nil {
				post.Content = *content
			}
			if repostOfID != nil {
				post.RepostOfId = repostOfID
			}
			if !yield(likedPostRow{Post: &post, CursorTS: cursorTS}, nil) {
				return
			}
		}
		if err := r.Err(); err != nil {
			yield(likedPostRow{}, err)
		}
	}
}
