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
	query := "INSERT INTO posts(user_id, content) VALUES($1, $2) RETURNING id"
	row := c.db.QueryRow(context.Background(), query, userID, content)

	var id int32
	if err := row.Scan(&id); err != nil {
		return 0, err
	}

	return id, nil
}

func (c *DbClient) getFeed(page int32, limit int32, currentUserID int32) ([]*pb.Post, error) {
	query := `SELECT posts.id, posts.content, posts.user_id,
		COUNT(DISTINCT likes.id) AS likes,
		EXISTS(SELECT 1 FROM likes AS likes
		WHERE likes.post_id = posts.id AND likes.user_id = %s) AS liked,
		COUNT(DISTINCT reposts.id) AS reposts,
		EXISTS(SELECT 1 FROM reposts AS reposts
		WHERE reposts.post_id = posts.id AND reposts.user_id = %s) AS reposted,
		time_format(posts.date_created) AS date_created
		FROM posts AS posts LEFT JOIN likes AS likes
		ON likes.post_id = posts.id LEFT JOIN reposts AS reposts
		ON reposts.post_id = posts.id
		WHERE posts.user_id = $1 OR posts.id IN (SELECT post_id
			FROM reposts WHERE user_id = $1) OR
			posts.user_id IN (SELECT user_id
			FROM followings WHERE follower_id = $1
		)
		ORDER BY posts.date_created DESC
		GROUP BY posts.id
		OFFSET $2 LIMIT $3`

	rows, err := c.db.Query(context.Background(), query, currentUserID, page*limit, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return mapPosts(rows)
}

func (c *DbClient) getPosts(userID int32, page int32, limit int32, currentUserID int32) ([]*pb.Post, error) {
	query := `SELECT posts.id, posts.content, posts.user_id,
		COUNT(DISTINCT likes.id) AS likes,
		EXISTS(SELECT 1 FROM likes AS likes
		WHERE likes.post_id = posts.id AND likes.user_id = %s) AS liked,
		COUNT(DISTINCT reposts.id) AS reposts,
		EXISTS(SELECT 1 FROM reposts AS reposts
		WHERE reposts.post_id = posts.id AND reposts.user_id = %s) AS reposted,
		time_format(posts.date_created) AS date_created
		FROM posts AS posts LEFT JOIN likes AS likes
		ON likes.post_id = posts.id LEFT JOIN reposts AS reposts
		ON reposts.post_id = posts.id
		WHERE posts.user_id = $1 OR posts.id IN (
			SELECT post_id
			FROM reposts WHERE user_id = $1
		)
		GROUP BY posts.id
		ORDER BY posts.date_created DESC
		OFFSET $2 LIMIT $3`

	rows, err := c.db.Query(context.Background(), query, userID, page*limit, limit, currentUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return mapPosts(rows)
}

func (c *DbClient) getLikedPosts(userID int32, page int32, limit int32, currentUserID int32) ([]*pb.Post, error) {
	query := `SELECT posts.id, posts.content, posts.user_id,
		COUNT(DISTINCT likes.id) AS likes,
		EXISTS(SELECT 1 FROM likes AS likes
		WHERE likes.post_id = posts.id AND likes.user_id = %s) AS liked,
		COUNT(DISTINCT reposts.id) AS reposts,
		EXISTS(SELECT 1 FROM reposts AS reposts
		WHERE reposts.post_id = posts.id AND reposts.user_id = %s) AS reposted,
		time_format(posts.date_created) AS date_created
		FROM posts AS posts LEFT JOIN likes AS likes
		ON likes.post_id = posts.id LEFT JOIN reposts AS reposts
		ON reposts.post_id = posts.id
		WHERE posts.id IN (SELECT post_id FROM likes WHERE user_id = $1)
		GROUP BY posts.id
		ORDER BY posts.date_created DESC
		OFFSET $2 LIMIT $3`

	rows, err := c.db.Query(context.Background(), query, userID, page*limit, limit, currentUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return mapPosts(rows)
}

func (c *DbClient) getPost(id int32, currentUserID int32) (*pb.Post, error) {
	query := `SELECT id, user_id, content,
		(
			SELECT count(*) FROM likes WHERE post_id = id
		) AS likes,
		EXISTS (
			SELECT 1 FROM likes WHERE post_id = id AND likes.user_id = $1
		) AS liked,
		(
			SELECT count(*) FROM reposts WHERE post_id = id
		) AS reposts,
		EXISTS(
			SELECT 1 FROM reposts WHERE post_id = id AND reposts.user_id = $1
		) AS reposted,
		time_format(created) AS created
		FROM posts WHERE id = $2`

	row := c.db.QueryRow(context.Background(), query, currentUserID, id)
	return mapPost(row)
}

func (c *DbClient) deletePost(postID int32, userID int32) error {
	query := "DELETE FROM posts WHERE id = $1"
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
