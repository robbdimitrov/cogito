package post

import (
	"context"
	"errors"
	"iter"
	"strings"

	"github.com/jackc/pgconn"
	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"

	pb "thoughts/postservice/genproto"
)

var errInvalidReference = errors.New("invalid reference")
var errNotFound = errors.New("not found")

type DBClient struct {
	db *pgxpool.Pool
}

func NewDBClient(dbURL string) (*DBClient, error) {
	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		return nil, err
	}
	config.MaxConns = 5

	db, err := pgxpool.ConnectConfig(context.Background(), config)
	if err != nil {
		return nil, err
	}

	return &DBClient{db}, nil
}

func (c *DBClient) Close() {
	c.db.Close()
}

func (c *DBClient) createPost(ctx context.Context, content string, tags []string, userID int32, mediaKey *string, inReplyToID *int32, quoteOfID *int32) (int32, error) {
	var mk string
	if mediaKey != nil {
		mk = *mediaKey
	}

	var row pgx.Row
	if quoteOfID != nil {
		query := `INSERT INTO posts (user_id, content, hashtags, media_key, in_reply_to_id, quote_of_id)
			SELECT $1, $2, $3, $4, $5, COALESCE(p.repost_of_id, p.id)
			FROM posts p WHERE p.id = $6
			RETURNING id`
		row = c.db.QueryRow(ctx, query, userID, content, tags, mk, inReplyToID, *quoteOfID)
	} else {
		query := "INSERT INTO posts (user_id, content, hashtags, media_key, in_reply_to_id, quote_of_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id"
		row = c.db.QueryRow(ctx, query, userID, content, tags, mk, inReplyToID, nil)
	}

	var id int32
	err := row.Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, errInvalidReference
		}
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" {
			return 0, errInvalidReference
		}
		return 0, err
	}
	return id, nil
}

func (c *DBClient) getFeed(ctx context.Context, page int32, limit int32, currentUserID int32) (iter.Seq2[*pb.Post, error], error) {
	query := `SELECT
		p.id, p.user_id, p.content,
		(SELECT count(*) FROM likes WHERE post_id = COALESCE(o.id, p.id)) AS likes,
		EXISTS (SELECT 1 FROM likes WHERE post_id = COALESCE(o.id, p.id) AND likes.user_id = $1) AS liked,
		(SELECT count(*) FROM posts AS rp WHERE rp.repost_of_id = COALESCE(o.id, p.id)) AS reposts,
		EXISTS (SELECT 1 FROM posts AS rp WHERE rp.repost_of_id = COALESCE(o.id, p.id) AND rp.user_id = $1) AS reposted,
		p.created, p.repost_of_id, p.media_key,
		(SELECT count(*) FROM posts AS r WHERE r.in_reply_to_id = COALESCE(o.id, p.id)) AS replies,
		COALESCE(p.in_reply_to_id, 0) AS in_reply_to_id,
		COALESCE(p.quote_of_id, 0) AS quote_of_id,
		o.id AS o_id, o.user_id AS o_user_id, o.content AS o_content,
		o.created AS o_created, o.media_key AS o_media_key,
		COALESCE(o.in_reply_to_id, 0) AS o_in_reply_to_id,
		COALESCE(o.quote_of_id, 0) AS o_quote_of_id
		FROM posts p
		LEFT JOIN posts o ON o.id = p.repost_of_id
		WHERE p.in_reply_to_id IS NULL
		AND (o.id IS NULL OR o.in_reply_to_id IS NULL)
		ORDER BY p.created DESC, p.id DESC
		LIMIT $2 OFFSET $3`

	rows, err := c.db.Query(ctx, query, currentUserID, limit, page*limit)
	if err != nil {
		return nil, err
	}

	return mapFeedPosts(rows), nil
}

func (c *DBClient) getPosts(ctx context.Context, userID int32, page int32, limit int32, currentUserID int32) (iter.Seq2[*pb.Post, error], error) {
	query := `SELECT
		p.id, p.user_id, p.content,
		(SELECT count(*) FROM likes WHERE post_id = COALESCE(o.id, p.id)) AS likes,
		EXISTS (SELECT 1 FROM likes WHERE post_id = COALESCE(o.id, p.id) AND likes.user_id = $1) AS liked,
		(SELECT count(*) FROM posts AS rp WHERE rp.repost_of_id = COALESCE(o.id, p.id)) AS reposts,
		EXISTS (SELECT 1 FROM posts AS rp WHERE rp.repost_of_id = COALESCE(o.id, p.id) AND rp.user_id = $1) AS reposted,
		p.created, p.repost_of_id, p.media_key,
		(SELECT count(*) FROM posts AS r WHERE r.in_reply_to_id = COALESCE(o.id, p.id)) AS replies,
		COALESCE(p.in_reply_to_id, 0) AS in_reply_to_id,
		COALESCE(p.quote_of_id, 0) AS quote_of_id,
		o.id AS o_id, o.user_id AS o_user_id, o.content AS o_content,
		o.created AS o_created, o.media_key AS o_media_key,
		COALESCE(o.in_reply_to_id, 0) AS o_in_reply_to_id,
		COALESCE(o.quote_of_id, 0) AS o_quote_of_id
		FROM posts p
		LEFT JOIN posts o ON o.id = p.repost_of_id
		WHERE p.user_id = $2
		AND p.in_reply_to_id IS NULL
		AND (o.id IS NULL OR o.in_reply_to_id IS NULL)
		ORDER BY p.created DESC, p.id DESC
		LIMIT $3 OFFSET $4`

	rows, err := c.db.Query(ctx, query, currentUserID, userID, limit, page*limit)
	if err != nil {
		return nil, err
	}

	return mapFeedPosts(rows), nil
}

func (c *DBClient) getLikedPosts(ctx context.Context, userID int32, page int32, limit int32, currentUserID int32) (iter.Seq2[*pb.Post, error], error) {
	query := `SELECT id, posts.user_id, content,
		(SELECT count(*) FROM likes WHERE post_id = id) AS likes,
		EXISTS (SELECT 1 FROM likes WHERE post_id = id AND likes.user_id = $1) AS liked,
		(SELECT count(*) FROM posts AS rp WHERE rp.repost_of_id = id) AS reposts,
		EXISTS (SELECT 1 FROM posts AS rp WHERE rp.repost_of_id = id AND rp.user_id = $1) AS reposted,
		posts.created, posts.repost_of_id, posts.media_key,
		(SELECT count(*) FROM posts AS r WHERE r.in_reply_to_id = id) AS replies,
		COALESCE(in_reply_to_id, 0) AS in_reply_to_id,
		COALESCE(quote_of_id, 0) AS quote_of_id
		FROM posts
		INNER JOIN likes ON post_id = id
		WHERE likes.user_id = $2
		ORDER BY likes.created DESC, id DESC
		LIMIT $3 OFFSET $4`

	rows, err := c.db.Query(ctx, query, currentUserID, userID, limit, page*limit)
	if err != nil {
		return nil, err
	}

	return mapPosts(rows), nil
}

func (c *DBClient) getHashtagPosts(ctx context.Context, tag string, page int32, limit int32, currentUserID int32) (iter.Seq2[*pb.Post, error], error) {
	query := `SELECT id, user_id, content,
		(SELECT count(*) FROM likes WHERE post_id = id) AS likes,
		EXISTS (SELECT 1 FROM likes WHERE post_id = id AND likes.user_id = $1) AS liked,
		(SELECT count(*) FROM posts AS rp WHERE rp.repost_of_id = id) AS reposts,
		EXISTS (SELECT 1 FROM posts AS rp WHERE rp.repost_of_id = id AND rp.user_id = $1) AS reposted,
		created, repost_of_id, media_key,
		(SELECT count(*) FROM posts AS r WHERE r.in_reply_to_id = id) AS replies,
		COALESCE(in_reply_to_id, 0) AS in_reply_to_id,
		COALESCE(quote_of_id, 0) AS quote_of_id
		FROM posts
		WHERE hashtags @> ARRAY[$2]::varchar[]
		ORDER BY created DESC, id DESC
		LIMIT $3 OFFSET $4`

	rows, err := c.db.Query(ctx, query, currentUserID, strings.ToLower(tag), limit, page*limit)
	if err != nil {
		return nil, err
	}

	return mapPosts(rows), nil
}

func (c *DBClient) getPost(ctx context.Context, id int32, currentUserID int32) (*pb.Post, error) {
	query := `SELECT id, user_id, content,
		(SELECT count(*) FROM likes WHERE post_id = id) AS likes,
		EXISTS (SELECT 1 FROM likes WHERE post_id = id AND likes.user_id = $1) AS liked,
		(SELECT count(*) FROM posts AS rp WHERE rp.repost_of_id = id) AS reposts,
		EXISTS (SELECT 1 FROM posts AS rp WHERE rp.repost_of_id = id AND rp.user_id = $1) AS reposted,
		created, repost_of_id, media_key,
		(SELECT count(*) FROM posts AS r WHERE r.in_reply_to_id = id) AS replies,
		COALESCE(in_reply_to_id, 0) AS in_reply_to_id,
		COALESCE(quote_of_id, 0) AS quote_of_id
		FROM posts WHERE id = $2`

	row := c.db.QueryRow(ctx, query, currentUserID, id)
	post, err := mapPost(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errNotFound
	}
	return post, err
}

func (c *DBClient) getPostsByIds(ctx context.Context, ids []int32, currentUserID int32) (iter.Seq2[*pb.Post, error], error) {
	query := `SELECT id, user_id, content,
		(SELECT count(*) FROM likes WHERE post_id = id) AS likes,
		EXISTS (SELECT 1 FROM likes WHERE post_id = id AND likes.user_id = $1) AS liked,
		(SELECT count(*) FROM posts AS rp WHERE rp.repost_of_id = id) AS reposts,
		EXISTS (SELECT 1 FROM posts AS rp WHERE rp.repost_of_id = id AND rp.user_id = $1) AS reposted,
		created, repost_of_id, media_key,
		(SELECT count(*) FROM posts AS r WHERE r.in_reply_to_id = id) AS replies,
		COALESCE(in_reply_to_id, 0) AS in_reply_to_id,
		COALESCE(quote_of_id, 0) AS quote_of_id
		FROM posts WHERE id = ANY($2)`

	rows, err := c.db.Query(ctx, query, currentUserID, ids)
	if err != nil {
		return nil, err
	}

	return mapPosts(rows), nil
}

func (c *DBClient) deletePost(ctx context.Context, postID int32, userID int32) error {
	query := "DELETE FROM posts WHERE id = $1 AND user_id = $2"
	tag, err := c.db.Exec(ctx, query, postID, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errNotFound
	}
	return nil
}

func (c *DBClient) likePost(ctx context.Context, postID int32, userID int32) error {
	query := "INSERT INTO likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING"
	_, err := c.db.Exec(ctx, query, postID, userID)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23503" {
		return errInvalidReference
	}
	return err
}

func (c *DBClient) unlikePost(ctx context.Context, postID int32, userID int32) error {
	query := "DELETE FROM likes WHERE post_id = $1 AND user_id = $2"
	_, err := c.db.Exec(ctx, query, postID, userID)
	return err
}

func (c *DBClient) repostPost(ctx context.Context, postID int32, userID int32) error {
	query := `INSERT INTO posts (user_id, repost_of_id)
		SELECT $1, COALESCE(p.repost_of_id, p.id)
		FROM posts p WHERE p.id = $2
		AND p.in_reply_to_id IS NULL
		ON CONFLICT (user_id, repost_of_id) DO NOTHING`
	_, err := c.db.Exec(ctx, query, userID, postID)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23503" {
		return errInvalidReference
	}
	return err
}

func (c *DBClient) removeRepost(ctx context.Context, postID int32, userID int32) error {
	query := "DELETE FROM posts WHERE user_id = $1 AND repost_of_id = $2"
	_, err := c.db.Exec(ctx, query, userID, postID)
	return err
}

func (c *DBClient) getReplies(ctx context.Context, postID int32, page int32, limit int32, currentUserID int32) (iter.Seq2[*pb.Post, error], error) {
	query := `SELECT id, user_id, content,
		(SELECT count(*) FROM likes WHERE post_id = id) AS likes,
		EXISTS (SELECT 1 FROM likes WHERE post_id = id AND likes.user_id = $1) AS liked,
		(SELECT count(*) FROM posts AS rp WHERE rp.repost_of_id = id) AS reposts,
		EXISTS (SELECT 1 FROM posts AS rp WHERE rp.repost_of_id = id AND rp.user_id = $1) AS reposted,
		created, repost_of_id, media_key,
		(SELECT count(*) FROM posts AS r WHERE r.in_reply_to_id = id) AS replies,
		COALESCE(in_reply_to_id, 0) AS in_reply_to_id,
		COALESCE(quote_of_id, 0) AS quote_of_id
		FROM posts
		WHERE in_reply_to_id = $2
		ORDER BY created ASC, id ASC
		LIMIT $3 OFFSET $4`

	rows, err := c.db.Query(ctx, query, currentUserID, postID, limit, page*limit)
	if err != nil {
		return nil, err
	}

	return mapPosts(rows), nil
}
