package post

import (
	"context"
	"errors"
	"log/slog"
	"strings"
	"unicode/utf8"

	"google.golang.org/grpc/codes"

	pb "cogito/postservice/genproto"
)

type controller struct {
	pb.UnsafePostServiceServer

	dbClient *DBClient
}

func newController(dbClient *DBClient) *controller {
	return &controller{dbClient: dbClient}
}

func (c *controller) CreatePost(ctx context.Context, req *pb.CreatePostRequest) (*pb.Identifier, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	if req.InReplyToId != nil && req.QuoteOfId != nil {
		return nil, newError(codes.InvalidArgument)
	}

	if strings.TrimSpace(req.Content) == "" {
		return nil, newError(codes.InvalidArgument)
	}
	if utf8.RuneCountInString(req.Content) > 255 {
		return nil, newError(codes.InvalidArgument)
	}

	tags := ExtractHashtags(req.Content)

	res, err := c.dbClient.createPost(ctx, req.Content, tags, userID, req.MediaKey, req.InReplyToId, req.QuoteOfId)
	if err != nil {
		if errors.Is(err, errInvalidReference) {
			return nil, newError(codes.InvalidArgument)
		}
		slog.Warn("creating post failed", "request_id", requestID(ctx), "error", err)
		return nil, newError(codes.Internal)
	}

	return &pb.Identifier{Id: res}, nil
}

func (c *controller) GetFeed(ctx context.Context, req *pb.GetFeedRequest) (*pb.Posts, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	cur, hasCur, err := DecodeCursor(req.Cursor)
	if err != nil {
		return nil, newError(codes.InvalidArgument)
	}

	limit := req.Limit
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	resIter, err := c.dbClient.getFeed(ctx, cur, hasCur, limit, userID)
	if err != nil {
		slog.Warn("getting posts failed", "request_id", requestID(ctx), "error", err)
		return nil, newError(codes.Internal)
	}

	var items []feedPostItem
	for item, err := range resIter {
		if err != nil {
			slog.Warn("mapping post failed", "request_id", requestID(ctx), "error", err)
			return nil, newError(codes.Internal)
		}
		items = append(items, item)
	}

	var nextCursor string
	if len(items) > int(limit) {
		last := items[limit-1]
		nextCursor = EncodeCursor(last.created, last.post.Id)
		items = items[:limit]
	}

	posts := make([]*pb.Post, len(items))
	for i, item := range items {
		posts[i] = item.post
	}

	return &pb.Posts{Posts: posts, NextCursor: nextCursor}, nil
}

func (c *controller) GetPosts(ctx context.Context, req *pb.GetPostsRequest) (*pb.Posts, error) {
	userID := optionalUserID(ctx)

	cur, hasCur, err := DecodeCursor(req.Cursor)
	if err != nil {
		return nil, newError(codes.InvalidArgument)
	}

	limit := req.Limit
	if limit < 1 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	resIter, err := c.dbClient.getPosts(ctx, req.UserId, cur, hasCur, limit, userID)
	if err != nil {
		slog.Warn("getting posts failed", "request_id", requestID(ctx), "error", err)
		return nil, newError(codes.Internal)
	}

	var rows []postCursorRow
	for row, err := range resIter {
		if err != nil {
			slog.Warn("mapping post failed", "request_id", requestID(ctx), "error", err)
			return nil, newError(codes.Internal)
		}
		rows = append(rows, row)
	}

	var nextCursor string
	if len(rows) > int(limit) {
		last := rows[limit-1]
		nextCursor = EncodeCursor(last.CursorTS, last.Post.Id)
		rows = rows[:limit]
	}

	posts := make([]*pb.Post, len(rows))
	for i, r := range rows {
		posts[i] = r.Post
	}

	return &pb.Posts{Posts: posts, NextCursor: nextCursor}, nil
}

func (c *controller) GetLikedPosts(ctx context.Context, req *pb.GetPostsRequest) (*pb.Posts, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	cur, hasCur, err := DecodeCursor(req.Cursor)
	if err != nil {
		return nil, newError(codes.InvalidArgument)
	}

	limit := req.Limit
	if limit < 1 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	resIter, err := c.dbClient.getLikedPosts(ctx, req.UserId, cur, hasCur, limit, userID)
	if err != nil {
		slog.Warn("getting liked posts failed", "request_id", requestID(ctx), "error", err)
		return nil, newError(codes.Internal)
	}

	var rows []likedPostRow
	for r, err := range resIter {
		if err != nil {
			slog.Warn("mapping post failed", "request_id", requestID(ctx), "error", err)
			return nil, newError(codes.Internal)
		}
		rows = append(rows, r)
	}

	var nextCursor string
	if len(rows) > int(limit) {
		last := rows[limit-1]
		nextCursor = EncodeCursor(last.CursorTS, last.Post.Id)
		rows = rows[:limit]
	}

	posts := make([]*pb.Post, len(rows))
	for i, r := range rows {
		posts[i] = r.Post
	}

	return &pb.Posts{Posts: posts, NextCursor: nextCursor}, nil
}

func (c *controller) GetHashtagPosts(ctx context.Context, req *pb.GetHashtagPostsRequest) (*pb.Posts, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}
	if !ValidateHashtag(req.Tag) {
		return nil, newError(codes.InvalidArgument)
	}

	cur, hasCur, err := DecodeCursor(req.Cursor)
	if err != nil {
		return nil, newError(codes.InvalidArgument)
	}

	limit := req.Limit
	if limit < 1 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	resIter, err := c.dbClient.getHashtagPosts(ctx, req.Tag, cur, hasCur, limit, userID)
	if err != nil {
		slog.Warn("getting hashtag posts failed", "request_id", requestID(ctx), "error", err)
		return nil, newError(codes.Internal)
	}

	var rows []postCursorRow
	for row, err := range resIter {
		if err != nil {
			slog.Warn("mapping post failed", "request_id", requestID(ctx), "error", err)
			return nil, newError(codes.Internal)
		}
		rows = append(rows, row)
	}

	var nextCursor string
	if len(rows) > int(limit) {
		last := rows[limit-1]
		nextCursor = EncodeCursor(last.CursorTS, last.Post.Id)
		rows = rows[:limit]
	}

	posts := make([]*pb.Post, len(rows))
	for i, r := range rows {
		posts[i] = r.Post
	}

	return &pb.Posts{Posts: posts, NextCursor: nextCursor}, nil
}

func (c *controller) SearchHashtags(ctx context.Context, req *pb.SearchHashtagsRequest) (*pb.Hashtags, error) {
	if req.Query == "" {
		return nil, newError(codes.InvalidArgument)
	}
	limit := req.Limit
	if limit < 1 {
		limit = 8
	}
	if limit > 20 {
		limit = 20
	}
	tags, err := c.dbClient.searchHashtags(ctx, req.Query, limit)
	if err != nil {
		slog.Warn("searching hashtags failed", "request_id", requestID(ctx), "error", err)
		return nil, newError(codes.Internal)
	}
	return &pb.Hashtags{Hashtags: tags}, nil
}

func (c *controller) GetPostsByIds(ctx context.Context, req *pb.Ids) (*pb.Posts, error) {
	// Viewer-optional: this is only called internally by the gateway to
	// resolve embedded quote posts for GetPost/GetPosts, both of which are
	// viewer-optional themselves — an anonymous caller must not lose quote
	// embeds just because this batch lookup required a session.
	userID := optionalUserID(ctx)

	if len(req.Ids) == 0 {
		return &pb.Posts{}, nil
	}
	if len(req.Ids) > 200 {
		return nil, newError(codes.InvalidArgument)
	}

	resIter, err := c.dbClient.getPostsByIds(ctx, req.Ids, userID)
	if err != nil {
		slog.Warn("getting posts by ids failed", "request_id", requestID(ctx), "error", err)
		return nil, newError(codes.Internal)
	}

	var posts []*pb.Post
	for post, err := range resIter {
		if err != nil {
			slog.Warn("mapping post failed", "request_id", requestID(ctx), "error", err)
			return nil, newError(codes.Internal)
		}
		posts = append(posts, post)
	}

	return &pb.Posts{Posts: posts}, nil
}

func (c *controller) GetPost(ctx context.Context, req *pb.PostRequest) (*pb.Post, error) {
	userID := optionalUserID(ctx)

	res, err := c.dbClient.getPost(ctx, req.PostId, userID)
	if err != nil {
		if errors.Is(err, errNotFound) {
			return nil, newError(codes.NotFound)
		}
		slog.Warn("getting post failed", "request_id", requestID(ctx), "error", err)
		return nil, newError(codes.Internal)
	}

	return res, nil
}

func (c *controller) GetReplies(ctx context.Context, req *pb.GetRepliesRequest) (*pb.Posts, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	cur, hasCur, err := DecodeCursor(req.Cursor)
	if err != nil {
		return nil, newError(codes.InvalidArgument)
	}

	limit := req.Limit
	if limit < 1 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	resIter, err := c.dbClient.getReplies(ctx, req.PostId, cur, hasCur, limit, userID)
	if err != nil {
		slog.Warn("getting replies failed", "request_id", requestID(ctx), "error", err)
		return nil, newError(codes.Internal)
	}

	var rows []postCursorRow
	for row, err := range resIter {
		if err != nil {
			slog.Warn("mapping post failed", "request_id", requestID(ctx), "error", err)
			return nil, newError(codes.Internal)
		}
		rows = append(rows, row)
	}

	var nextCursor string
	if len(rows) > int(limit) {
		last := rows[limit-1]
		nextCursor = EncodeCursor(last.CursorTS, last.Post.Id)
		rows = rows[:limit]
	}

	posts := make([]*pb.Post, len(rows))
	for i, r := range rows {
		posts[i] = r.Post
	}

	return &pb.Posts{Posts: posts, NextCursor: nextCursor}, nil
}

func (c *controller) DeletePost(ctx context.Context, req *pb.PostRequest) (*pb.Empty, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	if err := c.dbClient.deletePost(ctx, req.PostId, userID); err != nil {
		if errors.Is(err, errNotFound) {
			return nil, newError(codes.NotFound)
		}
		slog.Warn("deleting post failed", "request_id", requestID(ctx), "error", err)
		return nil, newError(codes.Internal)
	}

	return &pb.Empty{}, nil
}

func (c *controller) LikePost(ctx context.Context, req *pb.PostRequest) (*pb.Empty, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	if err = c.dbClient.likePost(ctx, req.PostId, userID); err != nil {
		if errors.Is(err, errInvalidReference) {
			return nil, newError(codes.NotFound)
		}
		slog.Warn("liking post failed", "request_id", requestID(ctx), "error", err)
		return nil, newError(codes.Internal)
	}

	return &pb.Empty{}, nil
}

func (c *controller) UnlikePost(ctx context.Context, req *pb.PostRequest) (*pb.Empty, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	if err = c.dbClient.unlikePost(ctx, req.PostId, userID); err != nil {
		if errors.Is(err, errInvalidReference) {
			return nil, newError(codes.NotFound)
		}
		slog.Warn("unliking post failed", "request_id", requestID(ctx), "error", err)
		return nil, newError(codes.Internal)
	}

	return &pb.Empty{}, nil
}

func (c *controller) RepostPost(ctx context.Context, req *pb.PostRequest) (*pb.Empty, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	if err = c.dbClient.repostPost(ctx, req.PostId, userID); err != nil {
		if errors.Is(err, errInvalidReference) {
			return nil, newError(codes.NotFound)
		}
		slog.Warn("reposting post failed", "request_id", requestID(ctx), "error", err)
		return nil, newError(codes.Internal)
	}

	return &pb.Empty{}, nil
}

func (c *controller) RemoveRepost(ctx context.Context, req *pb.PostRequest) (*pb.Empty, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	if err = c.dbClient.removeRepost(ctx, req.PostId, userID); err != nil {
		slog.Warn("removing repost failed", "request_id", requestID(ctx), "error", err)
		return nil, newError(codes.Internal)
	}

	return &pb.Empty{}, nil
}
