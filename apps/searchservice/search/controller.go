package search

import (
	"context"
	"log/slog"
	"strconv"
	"unicode/utf8"

	"google.golang.org/grpc/codes"

	pb "thoughts/searchservice/genproto"
)

type controller struct {
	pb.UnimplementedSearchServiceServer
	meili *MeiliClient
}

func newController(meili *MeiliClient) *controller {
	return &controller{meili: meili}
}

func (c *controller) SearchUsers(ctx context.Context, req *pb.SearchRequest) (*pb.Users, error) {
	query, limit, offset, err := validateSearchRequest(req)
	if err != nil {
		return nil, err
	}

	hits, err := c.meili.SearchUsers(query, limit, offset)
	if err != nil {
		slog.Warn("meili SearchUsers failed", "request_id", requestID(ctx), "error", err)
		return nil, newError(codes.Internal)
	}

	users := make([]*pb.User, 0, len(hits))
	for _, hit := range hits {
		u := hitToUser(hit)
		if u != nil {
			users = append(users, u)
		}
	}
	return &pb.Users{Users: users}, nil
}

func (c *controller) SearchPosts(ctx context.Context, req *pb.SearchRequest) (*pb.Posts, error) {
	query, limit, offset, err := validateSearchRequest(req)
	if err != nil {
		return nil, err
	}

	hits, err := c.meili.SearchPosts(query, limit, offset)
	if err != nil {
		slog.Warn("meili SearchPosts failed", "request_id", requestID(ctx), "error", err)
		return nil, newError(codes.Internal)
	}

	posts := make([]*pb.Post, 0, len(hits))
	for _, hit := range hits {
		p := hitToPost(hit)
		if p != nil {
			posts = append(posts, p)
		}
	}
	return &pb.Posts{Posts: posts}, nil
}

func (c *controller) SearchHashtags(ctx context.Context, req *pb.SearchRequest) (*pb.Hashtags, error) {
	query, limit, offset, err := validateSearchRequest(req)
	if err != nil {
		return nil, err
	}

	hits, err := c.meili.SearchHashtags(query, limit, offset)
	if err != nil {
		slog.Warn("meili SearchHashtags failed", "request_id", requestID(ctx), "error", err)
		return nil, newError(codes.Internal)
	}

	tags := make([]*pb.Hashtag, 0, len(hits))
	for _, hit := range hits {
		h := hitToHashtag(hit)
		if h != nil {
			tags = append(tags, h)
		}
	}
	return &pb.Hashtags{Hashtags: tags}, nil
}

func validateSearchRequest(req *pb.SearchRequest) (query string, limit, offset int32, err error) {
	if req.Query == "" || utf8.RuneCountInString(req.Query) > 255 {
		return "", 0, 0, newError(codes.InvalidArgument)
	}
	limit = req.Limit
	if limit < 1 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}
	offset = req.Offset
	if offset < 0 {
		offset = 0
	}
	if offset > 1000 {
		offset = 1000
	}
	return req.Query, limit, offset, nil
}

func hitToUser(hit map[string]any) *pb.User {
	id, ok := idFromHit(hit)
	if !ok {
		return nil
	}
	u := &pb.User{Id: id}
	if v, ok := hit["username"].(string); ok {
		u.Username = v
	}
	if v, ok := hit["name"].(string); ok {
		u.Name = v
	}
	return u
}

func hitToPost(hit map[string]any) *pb.Post {
	id, ok := idFromHit(hit)
	if !ok {
		return nil
	}
	p := &pb.Post{Id: id}
	if v, ok := hit["content"].(string); ok {
		p.Content = v
	}
	if v, ok := hit["created_at"].(string); ok {
		p.Created = v
	}
	return p
}

func hitToHashtag(hit map[string]any) *pb.Hashtag {
	id, ok := idFromHit(hit)
	if !ok {
		return nil
	}
	h := &pb.Hashtag{Id: id}
	if v, ok := hit["name"].(string); ok {
		h.Name = v
	}
	if v, ok := hit["post_count"].(float64); ok {
		h.PostCount = int32(v)
	}
	return h
}

// idFromHit extracts the document id as int32.
// Meilisearch returns numeric IDs as float64 in JSON.
func idFromHit(hit map[string]any) (int32, bool) {
	switch v := hit["id"].(type) {
	case float64:
		return int32(v), true
	case string:
		n, err := strconv.ParseInt(v, 10, 32)
		if err != nil {
			return 0, false
		}
		return int32(n), true
	}
	return 0, false
}
