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
	pb.UnimplementedPostServiceServer

	dbClient *DBClient
}

func newController(dbClient *DBClient) *controller {
	return &controller{dbClient: dbClient}
}

func (c *controller) CreatePost(ctx context.Context, req *pb.CreatePostRequest) (*pb.PostIdentifier, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	if req.InReplyToPublicId != nil && req.QuoteOfPublicId != nil {
		return nil, newError(codes.InvalidArgument)
	}

	content := strings.TrimSpace(req.Content)
	if content == "" {
		return nil, newError(codes.InvalidArgument)
	}
	if utf8.RuneCountInString(content) > 255 {
		return nil, newError(codes.InvalidArgument)
	}

	tags := ExtractHashtags(content)

	_, publicID, err := c.dbClient.createPost(ctx, content, tags, userID, req.MediaKey, req.InReplyToPublicId, req.QuoteOfPublicId)
	if err != nil {
		if errors.Is(err, errInvalidReference) {
			return nil, newError(codes.InvalidArgument)
		}
		slog.Warn("creating post failed", "request_id", requestID(ctx), "error", err)
		return nil, newError(codes.Internal)
	}

	return &pb.PostIdentifier{PublicId: publicID}, nil
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

	limit := clampLimit(req.Limit)

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

	limit := clampLimit(req.Limit)

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

func (c *controller) GetUserReplies(ctx context.Context, req *pb.GetPostsRequest) (*pb.Posts, error) {
	userID := optionalUserID(ctx)

	cur, hasCur, err := DecodeCursor(req.Cursor)
	if err != nil {
		return nil, newError(codes.InvalidArgument)
	}

	limit := clampLimit(req.Limit)

	resIter, err := c.dbClient.getUserReplies(ctx, req.UserId, cur, hasCur, limit, userID)
	if err != nil {
		slog.Warn("getting user replies failed", "request_id", requestID(ctx), "error", err)
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

	limit := clampLimit(req.Limit)

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

	limit := clampLimit(req.Limit)

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

func (c *controller) GetPostsByIds(ctx context.Context, req *pb.Ids) (*pb.Posts, error) {
	// Viewer-optional: called internally to resolve quote posts for viewer-optional
	// GetPost/GetPosts, so an anonymous caller must not lose quote embeds here.
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

	res, err := c.dbClient.getPost(ctx, req.PublicId, userID)
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

	limit := clampLimit(req.Limit)

	resIter, err := c.dbClient.getReplies(ctx, req.PublicId, cur, hasCur, limit, userID)
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

func (c *controller) GetPopularPosts(ctx context.Context, req *pb.GetPopularPostsRequest) (*pb.Posts, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	offset, err := DecodeOffsetCursor(req.Cursor)
	if err != nil {
		return nil, newError(codes.InvalidArgument)
	}

	limit := clampLimit(req.Limit)

	resIter, err := c.dbClient.getPopularPosts(ctx, offset, limit, userID)
	if err != nil {
		slog.Warn("getting popular posts failed", "request_id", requestID(ctx), "error", err)
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

	var nextCursor string
	if len(posts) > int(limit) {
		posts = posts[:limit]
		nextCursor = EncodeOffsetCursor(offset + limit)
	}

	return &pb.Posts{Posts: posts, NextCursor: nextCursor}, nil
}

func (c *controller) DeletePost(ctx context.Context, req *pb.PostRequest) (*pb.Empty, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	if err := c.dbClient.deletePost(ctx, req.PublicId, userID); err != nil {
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

	if err = c.dbClient.likePost(ctx, req.PublicId, userID); err != nil {
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

	if err = c.dbClient.unlikePost(ctx, req.PublicId, userID); err != nil {
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

	if err = c.dbClient.repostPost(ctx, req.PublicId, userID); err != nil {
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

	if err = c.dbClient.removeRepost(ctx, req.PublicId, userID); err != nil {
		slog.Warn("removing repost failed", "request_id", requestID(ctx), "error", err)
		return nil, newError(codes.Internal)
	}

	return &pb.Empty{}, nil
}
