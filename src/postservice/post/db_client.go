package post

import (
	"errors"
	"fmt"

	pb "postservice/genproto"
)

// DbClient manages the communication between services and database
type DbClient struct {
	db *Database
}

// NewDbClient creates a new DbClient instance
func NewDbClient(db *Database) *DbClient {
	return &DbClient{db}
}

func (c *DbClient) createPostQuery(where string, order string, limit string) string {
	query := fmt.Sprintf(`SELECT posts.id, posts.content, posts.user_id,
		count(distinct likes.id) AS likes,
		count(distinct retweets.id) AS retweets,
		time_format(posts.date_created) AS date_created
		FROM  thoughts.posts AS posts  LEFT JOIN thoughts.likes AS likes
		ON likes.post_id = posts.id LEFT JOIN thoughts.retweets AS retweets
		ON retweets.post_id = posts.id
		%s
		GROUP BY posts.id
		%s %s`, where, order, limit)
	return query
}

// CreatePost creates a new Post row in the database
func (c *DbClient) CreatePost(content string, userID int32) (pb.Post, error) {
	conn := c.db.GetConn()

	row := conn.QueryRow(`INSERT INTO thoughts.posts(content, user_id)
		VALUES($1, $2) RETURNING id`,
		content, userID)

	var id int32

	err := row.Scan(&id)
	if err != nil {
		return pb.Post{}, errors.New("Error happened while retrieving post")
	}

	return c.GetPost(id)
}

// GetPost returns a Post row with the passed id from the database
func (c *DbClient) GetPost(id int32) (pb.Post, error) {
	conn := c.db.GetConn()

	row := conn.QueryRow(c.createPostQuery("WHERE id = $1", "", ""), id)

	post, err := rowToPost(row)
	return post, err
}

// GetFeed returns posts and retweets of users followed by the user
func (c *DbClient) GetFeed(userID int32, page int32, limit int32) (pb.Posts, error) {
	conn := c.db.GetConn()

	rows, err := conn.Query(`(SELECT id, content, user_id, time_format(date_created)
	FROM thoughts.posts  WHERE user_id = $1 ORDER BY date_created DESC)
	UNION
	(SELECT id, content, user_id, time_format(date_created) FROM thoughts.posts
	WHERE id IN (SELECT post_id FROM thoughts.retweets
	WHERE user_id = $1 ORDER BY date_created DESC))
	UNION
	(SELECT id, content, user_id, time_format(date_created) FROM thoughts.posts
	WHERE user_id IN (SELECT user_id FROM thoughts.followings
	WHERE follower_id = $1) ORDER BY date_created DESC)
	OFFSET $2 LIMIT $3`,
		userID, page*limit, limit)
	if err != nil {
		return pb.Posts{}, errors.New("Error happened while reading from the database")
	}
	defer rows.Close()

	posts, err := rowsToPosts(rows)
	return posts, nil
}

// GetPosts returns the posts and retweets of the user with userID
func (c *DbClient) GetPosts(userID int32, page int32, limit int32) (pb.Posts, error) {
	conn := c.db.GetConn()

	query := c.createPostQuery(
		`WHERE posts.user_id = $1 OR posts.id IN (SELECT post_id FROM thoughts.retweets
		WHERE user_id = $1 ORDER BY date_created DESC)`,
		"ORDER BY posts.date_created DESC)",
		"OFFSET $2 LIMIT $3")
	rows, err := conn.Query(query, userID, page*limit, limit)

	if err != nil {
		return pb.Posts{}, errors.New("Error happened while reading from the database")
	}
	defer rows.Close()

	posts, err := rowsToPosts(rows)
	return posts, nil
}

// GetLikedPosts returns posts liked by the user
func (c *DbClient) GetLikedPosts(userID int32, page int32, limit int32) (pb.Posts, error) {
	conn := c.db.GetConn()

	query := c.createPostQuery(
		"WHERE posts.id IN (SELECT post_id FROM thoughts.likes WHERE user_id = $1",
		"ORDER BY posts.date_created DESC)",
		"OFFSET $2 LIMIT $3")
	rows, err := conn.Query(query, userID, page*limit, limit)
	if err != nil {
		return pb.Posts{}, errors.New("Error happened while reading from the database")
	}
	defer rows.Close()

	posts, err := rowsToPosts(rows)
	return posts, nil
}

// DeletePost deletes a post with the passed postID
func (c *DbClient) DeletePost(postID int32) error {
	conn := c.db.GetConn()

	_, err := conn.Exec("DELETE FROM thoughts.posts WHERE id = $1", postID)
	if err != nil {
		return errors.New("Error happened while writing to the database")
	}

	return nil
}

// LikePost creates a like relationship between user and post
func (c *DbClient) LikePost(postID int32, userID int32) error {
	conn := c.db.GetConn()

	_, err := conn.Exec(`INSERT INTO thoughts.likes (post_id, user_id)
	VALUES ($1, $2)`, postID, userID)
	if err != nil {
		return errors.New("Error happened while writing to the database")
	}

	return nil
}

// UnlikePost deletes a like relationship between user and post
func (c *DbClient) UnlikePost(postID int32, userID int32) error {
	conn := c.db.GetConn()

	_, err := conn.Exec(`DELETE FROM thoughts.likes
	WHERE post_id = $1 AND user_id = $2`, postID, userID)
	if err != nil {
		return errors.New("Error happened while writing to the database")
	}

	return nil
}

// RetweetPost creates a retweet relationship between user and post
func (c *DbClient) RetweetPost(postID int32, userID int32) error {
	conn := c.db.GetConn()

	_, err := conn.Exec(`INSERT INTO thoughts.retweets (post_id, user_id)
	VALUES ($1, $2)`, postID, userID)
	if err != nil {
		return errors.New("Error happened while writing to the database")
	}

	return nil
}

// RemoveRetweet deletes a retweet relationship between user and post
func (c *DbClient) RemoveRetweet(postID int32, userID int32) error {
	conn := c.db.GetConn()

	_, err := conn.Exec(`DELETE FROM thoughts.retweets
	WHERE post_id = $1 AND user_id = $2`, postID, userID)
	if err != nil {
		return errors.New("Error happened while writing to the database")
	}

	return nil
}
