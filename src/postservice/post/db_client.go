package post

import (
	"context"
	"log"
	"strings"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"

	pb "github.com/robbdimitrov/thoughts/src/postservice/genproto"
)

// DbClient manages the communication between services and database
type DbClient struct {
	db *pgxpool.Pool
}

// NewDbClient creates a new DbClient instance
func NewDbClient(dbURL string) *DbClient {
	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Fatalf("Unable to parse database URL: %v", err)
	}
	config.MaxConns = 10

	db, err := pgxpool.ConnectConfig(context.Background(), config)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}

	return &DbClient{db}
}

// Close closes the existing connection to the database
func (c *DbClient) Close() {
	c.db.Close()
}

func (c *DbClient) createPost(content string, tags []string, userID int32, mediaKey *string) (int32, error) {
	query := "INSERT INTO posts (user_id, content, hashtags, media_key) VALUES ($1, $2, $3, $4) RETURNING id"
	
	var mk string
	if mediaKey != nil {
		mk = *mediaKey
	}
	
	row := c.db.QueryRow(context.Background(), query, userID, content, tags, mk)

	var id int32
	err := row.Scan(&id)

	return id, err
}

func (c *DbClient) getFeed(page int32, limit int32, currentUserID int32) ([]*pb.Post, error) {
	query := `SELECT id, user_id, content, likes, liked, reposts, reposted, created,
		rethought_by_user_id, rethought_created, media_key
		FROM (
			SELECT posts.id, posts.user_id, posts.content,
			(SELECT count(*) FROM likes WHERE post_id = posts.id) AS likes,
			EXISTS (SELECT 1 FROM likes
			WHERE post_id = posts.id AND likes.user_id = $1) AS liked,
			(SELECT count(*) FROM reposts WHERE post_id = posts.id) AS reposts,
			EXISTS (SELECT 1 FROM reposts
			WHERE post_id = posts.id AND reposts.user_id = $1) AS reposted,
			time_format(posts.created) AS created,
			0::integer AS rethought_by_user_id,
			''::text AS rethought_created,
			posts.created AS timeline_created,
			posts.media_key
			FROM posts
			UNION ALL
			SELECT posts.id, posts.user_id, posts.content,
			(SELECT count(*) FROM likes WHERE post_id = posts.id) AS likes,
			EXISTS (SELECT 1 FROM likes
			WHERE post_id = posts.id AND likes.user_id = $1) AS liked,
			(SELECT count(*) FROM reposts WHERE post_id = posts.id) AS reposts,
			EXISTS (SELECT 1 FROM reposts AS current_user_reposts
			WHERE current_user_reposts.post_id = posts.id AND current_user_reposts.user_id = $1) AS reposted,
			time_format(posts.created) AS created,
			reposts.user_id AS rethought_by_user_id,
			time_format(reposts.created) AS rethought_created,
			reposts.created AS timeline_created,
			posts.media_key
			FROM reposts
			INNER JOIN posts ON posts.id = reposts.post_id
		) feed
		ORDER BY timeline_created DESC
		LIMIT $2 OFFSET $3`

	rows, err := c.db.Query(context.Background(), query, currentUserID, limit, page*limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return mapPosts(rows)
}

func (c *DbClient) getPosts(userID int32, page int32, limit int32, currentUserID int32) ([]*pb.Post, error) {
	query := `SELECT id, user_id, content, likes, liked, reposts, reposted, created,
		rethought_by_user_id, rethought_created, media_key
		FROM (
			SELECT posts.id, posts.user_id, posts.content,
			(SELECT count(*) FROM likes WHERE post_id = posts.id) AS likes,
			EXISTS (SELECT 1 FROM likes
			WHERE post_id = posts.id AND likes.user_id = $1) AS liked,
			(SELECT count(*) FROM reposts WHERE post_id = posts.id) AS reposts,
			EXISTS (SELECT 1 FROM reposts
			WHERE post_id = posts.id AND reposts.user_id = $1) AS reposted,
			time_format(posts.created) AS created,
			0::integer AS rethought_by_user_id,
			''::text AS rethought_created,
			posts.created AS timeline_created,
			posts.media_key
			FROM posts
			WHERE posts.user_id = $2
			UNION ALL
			SELECT posts.id, posts.user_id, posts.content,
			(SELECT count(*) FROM likes WHERE post_id = posts.id) AS likes,
			EXISTS (SELECT 1 FROM likes
			WHERE post_id = posts.id AND likes.user_id = $1) AS liked,
			(SELECT count(*) FROM reposts WHERE post_id = posts.id) AS reposts,
			EXISTS (SELECT 1 FROM reposts AS current_user_reposts
			WHERE current_user_reposts.post_id = posts.id AND current_user_reposts.user_id = $1) AS reposted,
			time_format(posts.created) AS created,
			reposts.user_id AS rethought_by_user_id,
			time_format(reposts.created) AS rethought_created,
			reposts.created AS timeline_created,
			posts.media_key
			FROM reposts
			INNER JOIN posts ON posts.id = reposts.post_id
			WHERE reposts.user_id = $2
		) profile_feed
		ORDER BY timeline_created DESC
		LIMIT $3 OFFSET $4`

	rows, err := c.db.Query(context.Background(), query, currentUserID, userID, limit, page*limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return mapPosts(rows)
}

func (c *DbClient) getLikedPosts(userID int32, page int32, limit int32, currentUserID int32) ([]*pb.Post, error) {
	query := `SELECT id, posts.user_id, content,
		(SELECT count(*) FROM likes WHERE post_id = id) AS likes,
		EXISTS (SELECT 1 FROM likes
		WHERE post_id = id AND likes.user_id = $1) AS liked,
		(SELECT count(*) FROM reposts WHERE post_id = id) AS reposts,
		EXISTS (SELECT 1 FROM reposts
		WHERE post_id = id AND reposts.user_id = $1) AS reposted,
		time_format(posts.created) AS created,
		0::integer AS rethought_by_user_id,
		''::text AS rethought_created,
		posts.media_key
		FROM posts
		INNER JOIN likes ON post_id = id
		WHERE likes.user_id = $2
		ORDER BY likes.created DESC
		LIMIT $3 OFFSET $4`

	rows, err := c.db.Query(context.Background(), query, currentUserID, userID, limit, page*limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return mapPosts(rows)
}

func (c *DbClient) getHashtagPosts(tag string, page int32, limit int32, currentUserID int32) ([]*pb.Post, error) {
	query := `SELECT id, user_id, content,
		(SELECT count(*) FROM likes WHERE post_id = id) AS likes,
		EXISTS (SELECT 1 FROM likes
		WHERE post_id = id AND likes.user_id = $1) AS liked,
		(SELECT count(*) FROM reposts WHERE post_id = id) AS reposts,
		EXISTS (SELECT 1 FROM reposts
		WHERE post_id = id AND reposts.user_id = $1) AS reposted,
		time_format(created) AS created,
		0::integer AS rethought_by_user_id,
		''::text AS rethought_created,
		media_key
		FROM posts
		WHERE hashtags @> ARRAY[$2]::varchar[]
		ORDER BY created DESC
		LIMIT $3 OFFSET $4`

	rows, err := c.db.Query(context.Background(), query, currentUserID, strings.ToLower(tag), limit, page*limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return mapPosts(rows)
}

func (c *DbClient) getPost(id int32, currentUserID int32) (*pb.Post, error) {
	query := `SELECT id, user_id, content,
		(SELECT count(*) FROM likes WHERE post_id = id) AS likes,
		EXISTS (SELECT 1 FROM likes
		WHERE post_id = id AND likes.user_id = $1) AS liked,
		(SELECT count(*) FROM reposts WHERE post_id = id) AS reposts,
		EXISTS (SELECT 1 FROM reposts
		WHERE post_id = id AND reposts.user_id = $1) AS reposted,
		time_format(created) AS created,
		0::integer AS rethought_by_user_id,
		''::text AS rethought_created,
		media_key
		FROM posts WHERE id = $2`

	row := c.db.QueryRow(context.Background(), query, currentUserID, id)
	return mapPost(row)
}

func (c *DbClient) deletePost(postID int32, userID int32) error {
	query := "DELETE FROM posts WHERE id = $1 AND user_id = $2"
	tag, err := c.db.Exec(context.Background(), query, postID, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func (c *DbClient) likePost(postID int32, userID int32) error {
	query := "INSERT INTO likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING"
	_, err := c.db.Exec(context.Background(), query, postID, userID)
	return err
}

func (c *DbClient) unlikePost(postID int32, userID int32) error {
	query := "DELETE FROM likes WHERE post_id = $1 AND user_id = $2"
	_, err := c.db.Exec(context.Background(), query, postID, userID)
	return err
}

func (c *DbClient) repostPost(postID int32, userID int32) error {
	query := "INSERT INTO reposts (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING"
	_, err := c.db.Exec(context.Background(), query, postID, userID)
	return err
}

func (c *DbClient) removeRepost(postID int32, userID int32) error {
	query := "DELETE FROM reposts WHERE post_id = $1 AND user_id = $2"
	_, err := c.db.Exec(context.Background(), query, postID, userID)
	return err
}
