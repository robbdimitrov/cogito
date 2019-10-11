package post

import (
	"errors"
	"fmt"

	pb "github.com/robbdimitrov/thoughts/src/postservice/genproto"
)

// DbClient manages the communication between services and database
type DbClient struct {
	db *Database
}

// NewDbClient creates a new DbClient instance
func NewDbClient(db *Database) *DbClient {
	return &DbClient{db}
}

func (c *DbClient) createPostQuery(where string, order string,
	limit string, userIDPos string) string {
	query := fmt.Sprintf(`SELECT posts.id, posts.content, posts.user_id,
		COUNT(DISTINCT likes.id) AS likes,
		EXISTS(SELECT 1 FROM likes AS likes
		WHERE likes.post_id = posts.id AND likes.user_id = %s) AS liked,
		COUNT(DISTINCT retweets.id) AS retweets,
		EXISTS(SELECT 1 FROM retweets AS retweets
		WHERE retweets.post_id = posts.id AND retweets.user_id = %s) AS retweeted,
		time_format(posts.date_created) AS date_created
		FROM posts AS posts LEFT JOIN likes AS likes
		ON likes.post_id = posts.id LEFT JOIN retweets AS retweets
		ON retweets.post_id = posts.id
		%s
		GROUP BY posts.id
		%s %s`, userIDPos, userIDPos, where, order, limit)
	return query
}

// CreatePost creates a new Post row in the database
func (c *DbClient) CreatePost(content string, userID int32) (pb.Post, error) {
	conn := c.db.GetConn()

	row := conn.QueryRow(`INSERT INTO posts(content, user_id)
		VALUES($1, $2) RETURNING id`,
		content, userID)

	var id int32

	err := row.Scan(&id)
	if err != nil {
		return pb.Post{}, errors.New("Error happened while retrieving post")
	}

	return c.GetPost(id, userID)
}

// GetPost returns a Post row with the passed id from the database
func (c *DbClient) GetPost(id int32, userID int32) (pb.Post, error) {
	conn := c.db.GetConn()

	row := conn.QueryRow(c.createPostQuery("WHERE id = $1", "", "", "$2"), id, userID)

	post, err := rowToPost(row)
	return post, err
}

// GetFeed returns posts and retweets of users followed by the user
func (c *DbClient) GetFeed(userID int32, page int32, limit int32) (pb.Posts, error) {
	conn := c.db.GetConn()

	query := c.createPostQuery(
		`WHERE posts.user_id = $1 OR posts.id IN (SELECT post_id
		FROM retweets WHERE user_id = $1) OR
		posts.user_id IN (SELECT user_id
		FROM followings WHERE follower_id = $1)`,
		"ORDER BY posts.date_created DESC",
		"OFFSET $2 LIMIT $3", "$1")
	rows, err := conn.Query(query, userID, page*limit, limit)
	defer rows.Close()
	if err != nil {
		return pb.Posts{}, errors.New("Error happened while reading from the database")
	}

	posts, err := rowsToPosts(rows)
	return posts, nil
}

// GetPosts returns the posts and retweets of the user with userID
func (c *DbClient) GetPosts(userID int32, page int32, limit int32, currentID int32) (pb.Posts, error) {
	conn := c.db.GetConn()

	query := c.createPostQuery(
		`WHERE posts.user_id = $1 OR posts.id IN (SELECT post_id
		FROM retweets WHERE user_id = $1)`,
		"ORDER BY posts.date_created DESC",
		"OFFSET $2 LIMIT $3", "$4")
	rows, err := conn.Query(query, userID, page*limit, limit, currentID)
	defer rows.Close()
	if err != nil {
		return pb.Posts{}, errors.New("Error happened while reading from the database")
	}

	posts, err := rowsToPosts(rows)
	return posts, nil
}

// GetLikedPosts returns posts liked by the user
func (c *DbClient) GetLikedPosts(userID int32, page int32, limit int32, currentID int32) (pb.Posts, error) {
	conn := c.db.GetConn()

	query := c.createPostQuery(
		"WHERE posts.id IN (SELECT post_id FROM likes WHERE user_id = $1)",
		"ORDER BY posts.date_created DESC",
		"OFFSET $2 LIMIT $3", "$4")
	rows, err := conn.Query(query, userID, page*limit, limit, currentID)
	defer rows.Close()
	if err != nil {
		return pb.Posts{}, errors.New("Error happened while reading from the database")
	}

	posts, err := rowsToPosts(rows)
	return posts, nil
}

// DeletePost deletes a post with the passed postID
func (c *DbClient) DeletePost(postID int32) error {
	conn := c.db.GetConn()

	_, err := conn.Exec("DELETE FROM posts WHERE id = $1", postID)
	if err != nil {
		return errors.New("Error happened while writing to the database")
	}

	return nil
}

// LikePost creates a like relationship between user and post
func (c *DbClient) LikePost(postID int32, userID int32) error {
	conn := c.db.GetConn()

	_, err := conn.Exec(`INSERT INTO likes (post_id, user_id)
	VALUES ($1, $2)`, postID, userID)
	if err != nil {
		return errors.New("Error happened while writing to the database")
	}

	return nil
}

// UnlikePost deletes a like relationship between user and post
func (c *DbClient) UnlikePost(postID int32, userID int32) error {
	conn := c.db.GetConn()

	_, err := conn.Exec(`DELETE FROM likes
	WHERE post_id = $1 AND user_id = $2`, postID, userID)
	if err != nil {
		return errors.New("Error happened while writing to the database")
	}

	return nil
}

// RetweetPost creates a retweet relationship between user and post
func (c *DbClient) RetweetPost(postID int32, userID int32) error {
	conn := c.db.GetConn()

	_, err := conn.Exec(`INSERT INTO retweets (post_id, user_id)
	VALUES ($1, $2)`, postID, userID)
	if err != nil {
		return errors.New("Error happened while writing to the database")
	}

	return nil
}

// RemoveRetweet deletes a retweet relationship between user and post
func (c *DbClient) RemoveRetweet(postID int32, userID int32) error {
	conn := c.db.GetConn()

	_, err := conn.Exec(`DELETE FROM retweets
	WHERE post_id = $1 AND user_id = $2`, postID, userID)
	if err != nil {
		return errors.New("Error happened while writing to the database")
	}

	return nil
}
