package post

import (
	"context"
	"log/slog"
	"regexp"
	"strings"

	"google.golang.org/grpc/codes"

	pb "github.com/robbdimitrov/thoughts/apps/postservice/genproto"
)

var hashtagPattern = regexp.MustCompile(`^[A-Za-z0-9_]{1,50}$`)
var extractHashtagsPattern = regexp.MustCompile(`(?:^|[^A-Za-z0-9_])#([A-Za-z0-9_]{1,50})`)

func extractHashtags(content string) []string {
	matches := extractHashtagsPattern.FindAllStringSubmatch(content, -1)
	tagSet := make(map[string]bool)
	var tags []string
	for _, match := range matches {
		if len(match) > 1 {
			tag := strings.ToLower(match[1])
			if !tagSet[tag] {
				tagSet[tag] = true
				tags = append(tags, tag)
			}
		}
	}
	if tags == nil {
		tags = []string{}
	}
	return tags
}

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

	tags := extractHashtags(req.Content)

	res, err := c.dbClient.createPost(req.Content, tags, userID, req.MediaKey, req.InReplyToId, req.QuoteOfId)
	if err != nil {
		if err == errInvalidReference {
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

	resIter, err := c.dbClient.getFeed(req.Page, req.Limit, userID)
	if err != nil {
		slog.Warn("getting posts failed", "request_id", requestID(ctx), "error", err)
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

func (c *controller) GetPosts(ctx context.Context, req *pb.GetPostsRequest) (*pb.Posts, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	resIter, err := c.dbClient.getPosts(req.UserId, req.Page, req.Limit, userID)
	if err != nil {
		slog.Warn("getting posts failed", "request_id", requestID(ctx), "error", err)
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

func (c *controller) GetLikedPosts(ctx context.Context, req *pb.GetPostsRequest) (*pb.Posts, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	resIter, err := c.dbClient.getLikedPosts(req.UserId, req.Page, req.Limit, userID)
	if err != nil {
		slog.Warn("getting liked posts failed", "request_id", requestID(ctx), "error", err)
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

func (c *controller) GetHashtagPosts(ctx context.Context, req *pb.GetHashtagPostsRequest) (*pb.Posts, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}
	if !hashtagPattern.MatchString(req.Tag) {
		return nil, newError(codes.InvalidArgument)
	}

	resIter, err := c.dbClient.getHashtagPosts(req.Tag, req.Page, req.Limit, userID)
	if err != nil {
		slog.Warn("getting hashtag posts failed", "request_id", requestID(ctx), "error", err)
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
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	res, err := c.dbClient.getPost(req.PostId, userID)
	if err != nil {
		slog.Warn("getting post failed", "request_id", requestID(ctx), "error", err)
		return nil, newError(codes.NotFound)
	}

	return res, nil
}

func (c *controller) GetReplies(ctx context.Context, req *pb.GetRepliesRequest) (*pb.Posts, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	resIter, err := c.dbClient.getReplies(req.PostId, req.Page, req.Limit, userID)
	if err != nil {
		slog.Warn("getting replies failed", "request_id", requestID(ctx), "error", err)
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

func (c *controller) DeletePost(ctx context.Context, req *pb.PostRequest) (*pb.Empty, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}

	if err := c.dbClient.deletePost(req.PostId, userID); err != nil {
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

	if err = c.dbClient.likePost(req.PostId, userID); err != nil {
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

	if err = c.dbClient.unlikePost(req.PostId, userID); err != nil {
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

	if err = c.dbClient.repostPost(req.PostId, userID); err != nil {
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

	if err = c.dbClient.removeRepost(req.PostId, userID); err != nil {
		slog.Warn("removing repost failed", "request_id", requestID(ctx), "error", err)
		return nil, newError(codes.Internal)
	}

	return &pb.Empty{}, nil
}
