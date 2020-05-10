package post

import (
	"context"
	"log"

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
		log.Fatalf("Unable to create connection pool: %v", err)
	}

	return &DbClient{db}
}

// Close closes the existing connection to the database
func (c *DbClient) Close() {
	c.db.Close()
}

func (c *DbClient) createPost(content string, userID int32) (int32, error) {
	query := "INSERT INTO posts(user_id, content) VALUES ($1, $2) RETURNING id"
	row := c.db.QueryRow(context.Background(), query, userID, content)

	var id int32
	if err := row.Scan(&id); err != nil {
		return 0, err
	}

	return id, nil
}

func (c *DbClient) getFeed(page int32, limit int32, currentUserID int32) ([]*pb.Post, error) {
	query := `SELECT id, posts.user_id, content,
		(SELECT count(*) FROM likes WHERE post_id = id) AS likes,
		EXISTS (SELECT 1 FROM likes
		WHERE post_id = id AND likes.user_id = $1) AS liked,
		(SELECT count(*) FROM reposts WHERE post_id = id) AS reposts,
		EXISTS (SELECT 1 FROM reposts
		WHERE post_id = id AND reposts.user_id = $1) AS reposted,
		time_format(posts.created) AS created
		FROM posts
		LEFT JOIN reposts ON reposts.post_id = id
		LEFT JOIN followers ON followers.user_id = reposts.user_id
		OR followers.user_id = posts.user_id
		WHERE follower_id = $2 OR reposts.user_id = $2 OR posts.user_id = $2
		ORDER BY coalesce(reposts.created, posts.created) DESC
		OFFSET $3 LIMIT $4`

	rows, err := c.db.Query(context.Background(), query, currentUserID, page*limit, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return mapPosts(rows)
}

func (c *DbClient) getPosts(userID int32, page int32, limit int32, currentUserID int32) ([]*pb.Post, error) {
	query := `SELECT id, posts.user_id, content,
		(SELECT count(*) FROM likes WHERE post_id = id) AS likes,
		EXISTS (SELECT 1 FROM likes
		WHERE post_id = id AND likes.user_id = $1) AS liked,
		(SELECT count(*) FROM reposts WHERE post_id = id) AS reposts,
		EXISTS (SELECT 1 FROM reposts
		WHERE post_id = id AND reposts.user_id = $1) AS reposted,
		time_format(posts.created) AS created
		FROM posts
		LEFT JOIN reposts ON reposts.post_id = id
		WHERE reposts.user_id = $2 OR posts.user_id = $2
		ORDER BY coalesce(reposts.created, posts.created) DESC
		OFFSET $3 LIMIT $4`

	rows, err := c.db.Query(context.Background(), query, currentUserID, userID, page*limit, limit)
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
		time_format(posts.created) AS created
		FROM posts
        INNER JOIN likes ON post_id = id
        WHERE likes.user_id = $2
		ORDER BY likes.created DESC
		OFFSET $3 LIMIT $4`

	rows, err := c.db.Query(context.Background(), query, currentUserID, userID, page*limit, limit)
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
		time_format(created) AS created
		FROM posts WHERE id = $2`

	row := c.db.QueryRow(context.Background(), query, currentUserID, id)
	return mapPost(row)
}

func (c *DbClient) deletePost(postID int32, userID int32) error {
	query := "DELETE FROM posts WHERE id = $1 AND user_id = $2"
	_, err := c.db.Exec(context.Background(), query, postID)
	return err
}

func (c *DbClient) likePost(postID int32, userID int32) error {
	query := "INSERT INTO likes (post_id, user_id) VALUES ($1, $2)"
	_, err := c.db.Exec(context.Background(), query, postID, userID)
	return err
}

func (c *DbClient) unlikePost(postID int32, userID int32) error {
	query := "DELETE FROM likes WHERE post_id = $1 AND user_id = $2"
	_, err := c.db.Exec(context.Background(), query, postID, userID)
	return err
}

func (c *DbClient) repostPost(postID int32, userID int32) error {
	query := "INSERT INTO reposts (post_id, user_id) VALUES ($1, $2)"
	_, err := c.db.Exec(context.Background(), query, postID, userID)
	return err
}

func (c *DbClient) removeRepost(postID int32, userID int32) error {
	query := "DELETE FROM reposts WHERE post_id = $1 AND user_id = $2"
	_, err := c.db.Exec(context.Background(), query, postID, userID)
	return err
}
