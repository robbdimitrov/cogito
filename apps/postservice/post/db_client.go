package post

import (
	"context"
	"encoding/json"
	"errors"
	"iter"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgconn"
	"github.com/jackc/pgtype"
	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"

	pb "cogito/postservice/genproto"
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
	// PostgreSQL 18 tightened type-inference for unspecified parameter OIDs in
	// extended query protocol. Simple protocol avoids this by sending complete SQL
	// text; pgx handles value escaping so there is no injection risk.
	config.ConnConfig.PreferSimpleProtocol = true

	db, err := pgxpool.ConnectConfig(context.Background(), config)
	if err != nil {
		return nil, err
	}

	return &DBClient{db}, nil
}

func (c *DBClient) Close() {
	c.db.Close()
}

func outbox(tx pgx.Tx, ctx context.Context, topic string, payload any) error {
	b, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	j := &pgtype.JSONB{Bytes: b, Status: pgtype.Present}
	_, err = tx.Exec(ctx, "INSERT INTO outbox (topic, payload) VALUES ($1, $2)",
		pgtype.Text{String: topic, Status: pgtype.Present}, j)
	return err
}

func authorFanOutSnapshot(ctx context.Context, tx pgx.Tx, userID int32) (int32, bool, error) {
	var followerCount int32
	var fanOutDisabled bool
	err := tx.QueryRow(ctx, `SELECT
		(SELECT COUNT(*)::int FROM followers WHERE user_id = $1),
		COALESCE((SELECT fan_out_disabled FROM users WHERE id = $1), false)`,
		userID,
	).Scan(&followerCount, &fanOutDisabled)
	return followerCount, fanOutDisabled, err
}

func (c *DBClient) createPost(ctx context.Context, content string, tags []string, userID int32, mediaKey *string, inReplyToID *int32, quoteOfID *int32) (int32, error) {
	var mk string
	if mediaKey != nil {
		mk = *mediaKey
	}

	tx, err := c.db.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var postID int32
	var created time.Time
	var storedQuoteOfID int32

	var replyID pgtype.Int4
	if inReplyToID != nil {
		replyID = pgtype.Int4{Int: *inReplyToID, Status: pgtype.Present}
	} else {
		replyID = pgtype.Int4{Status: pgtype.Null}
	}

	if quoteOfID != nil {
		query := `INSERT INTO posts (user_id, content, media_key, in_reply_to_id, quote_of_id)
			SELECT $1, $2, $3, $4, COALESCE(p.repost_of_id, p.id)
			FROM posts p WHERE p.id = $5
			RETURNING id, created, quote_of_id`
		err = tx.QueryRow(ctx, query, userID, content, mk, replyID, *quoteOfID).Scan(&postID, &created, &storedQuoteOfID)
	} else {
		query := "INSERT INTO posts (user_id, content, media_key, in_reply_to_id, quote_of_id) VALUES ($1, $2, $3, $4, NULL) RETURNING id, created"
		err = tx.QueryRow(ctx, query, userID, content, mk, replyID).Scan(&postID, &created)
	}
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

	for _, tag := range tags {
		_, err = tx.Exec(ctx, "INSERT INTO hashtags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", tag)
		if err != nil {
			return 0, err
		}
		_, err = tx.Exec(ctx, "INSERT INTO post_hashtags (post_id, hashtag_id) SELECT $1, id FROM hashtags WHERE name = $2 ON CONFLICT DO NOTHING", postID, tag)
		if err != nil {
			return 0, err
		}
	}

	followerCount, fanOutDisabled, err := authorFanOutSnapshot(ctx, tx, userID)
	if err != nil {
		return 0, err
	}
	payload := map[string]any{
		"table": "posts", "op": "upsert",
		"id": postID, "author_id": userID,
		"follower_count": followerCount, "fan_out_disabled": fanOutDisabled,
		"content": content, "hashtags": tags, "created": created,
	}
	if inReplyToID != nil {
		payload["in_reply_to_id"] = *inReplyToID
	} else if quoteOfID != nil {
		payload["quote_of_id"] = storedQuoteOfID
	}
	if err = outbox(tx, ctx, "entity-changes", payload); err != nil {
		return 0, err
	}

	if inReplyToID != nil {
		var parentOwner int32
		err = tx.QueryRow(ctx, "SELECT user_id FROM posts WHERE id = $1", *inReplyToID).Scan(&parentOwner)
		if err != nil {
			return 0, err
		}
		err = outbox(tx, ctx, "activity", map[string]any{
			"op": "reply", "reply_post_id": postID, "post_id": *inReplyToID,
			"actor_id": userID, "recipient_id": parentOwner,
		})
		if err != nil {
			return 0, err
		}
	}

	for _, tag := range tags {
		var count int32
		err = tx.QueryRow(ctx, "SELECT COUNT(*)::int FROM post_hashtags WHERE hashtag_id = (SELECT id FROM hashtags WHERE name = $1)", tag).Scan(&count)
		if err != nil {
			return 0, err
		}
		err = outbox(tx, ctx, "entity-changes", map[string]any{
			"table": "hashtags", "op": "upsert", "name": tag, "post_count": count,
		})
		if err != nil {
			return 0, err
		}
	}

	return postID, tx.Commit(ctx)
}

func (c *DBClient) getFeed(ctx context.Context, cursor Cursor, hasCursor bool, limit int32, currentUserID int32) (iter.Seq2[feedPostItem, error], error) {
	querySelect := `SELECT
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
		COALESCE(o.quote_of_id, 0) AS o_quote_of_id`
	materializedQuery := querySelect + `, f.created AS fan_out_created
		FROM feed f
		JOIN posts p ON p.id = f.post_id
		JOIN users u ON u.id = p.user_id
		LEFT JOIN posts o ON o.id = p.repost_of_id
		WHERE f.user_id = $2
		AND u.fan_out_disabled = false
		AND p.in_reply_to_id IS NULL
		AND (o.id IS NULL OR o.in_reply_to_id IS NULL)
		AND ($3::timestamptz IS NULL OR (f.created, f.post_id) < ($3::timestamptz, $4::int))
		ORDER BY f.created DESC, f.post_id DESC
		LIMIT $5`
	pullQuery := querySelect + `
		FROM posts p
		JOIN users u ON u.id = p.user_id
		LEFT JOIN posts o ON o.id = p.repost_of_id
		WHERE p.user_id IN (
			SELECT fol.user_id FROM followers fol
			JOIN users fu ON fu.id = fol.user_id
			WHERE fol.follower_id = $2
			AND fu.fan_out_disabled = true
		)
		AND u.fan_out_disabled = true
		AND p.in_reply_to_id IS NULL
		AND (o.id IS NULL OR o.in_reply_to_id IS NULL)
		AND ($3::timestamptz IS NULL OR (p.created, p.id) < ($3::timestamptz, $4::int))
		ORDER BY p.created DESC, p.id DESC
		LIMIT $5`

	var cursorTS *time.Time
	var cursorID int32
	if hasCursor {
		cursorTS = &cursor.Created
		cursorID = cursor.ID
	}

	if limit < 1 {
		limit = 20
	}
	materializedRows, err := c.db.Query(ctx, materializedQuery, currentUserID, currentUserID, cursorTS, cursorID, limit+1)
	if err != nil {
		return nil, err
	}
	materialized, err := collectMaterializedFeedPosts(materializedRows)
	if err != nil {
		return nil, err
	}

	pullRows, err := c.db.Query(ctx, pullQuery, currentUserID, currentUserID, cursorTS, cursorID, limit+1)
	if err != nil {
		return nil, err
	}
	pulled, err := collectFeedPosts(pullRows)
	if err != nil {
		return nil, err
	}

	merged := append(materialized, pulled...)
	sort.SliceStable(merged, func(i, j int) bool {
		if merged[i].created.Equal(merged[j].created) {
			return merged[i].post.Id > merged[j].post.Id
		}
		return merged[i].created.After(merged[j].created)
	})
	if int32(len(merged)) > limit+1 {
		merged = merged[:limit+1]
	}

	return func(yield func(feedPostItem, error) bool) {
		for _, item := range merged {
			if !yield(item, nil) {
				return
			}
		}
	}, nil
}

type feedPostItem struct {
	post    *pb.Post
	created time.Time
}

func collectFeedPosts(r rows) ([]feedPostItem, error) {
	defer r.Close()
	var out []feedPostItem
	for r.Next() {
		post, created, err := mapFeedPost(r)
		if err != nil {
			return nil, err
		}
		out = append(out, feedPostItem{post: post, created: created})
	}
	return out, r.Err()
}

func (c *DBClient) getPosts(ctx context.Context, userID int32, cursor Cursor, hasCursor bool, limit int32, currentUserID int32) (iter.Seq2[postCursorRow, error], error) {
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
		AND ($3::timestamptz IS NULL OR (p.created, p.id) < ($3::timestamptz, $4::int))
		ORDER BY p.created DESC, p.id DESC
		LIMIT $5`

	var cursorTS *time.Time
	var cursorID int32
	if hasCursor {
		cursorTS = &cursor.Created
		cursorID = cursor.ID
	}
	rows, err := c.db.Query(ctx, query, currentUserID, userID, cursorTS, cursorID, limit+1)
	if err != nil {
		return nil, err
	}

	return mapFeedPostCursorRows(rows), nil
}

func (c *DBClient) getLikedPosts(ctx context.Context, userID int32, cursor Cursor, hasCursor bool, limit int32, currentUserID int32) (iter.Seq2[likedPostRow, error], error) {
	query := `SELECT likes.created AS cursor_ts,
		id, posts.user_id, content,
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
		AND ($3::timestamptz IS NULL OR (likes.created, id) < ($3::timestamptz, $4::int))
		ORDER BY likes.created DESC, id DESC
		LIMIT $5`

	var cursorTS *time.Time
	var cursorID int32
	if hasCursor {
		cursorTS = &cursor.Created
		cursorID = cursor.ID
	}
	rows, err := c.db.Query(ctx, query, currentUserID, userID, cursorTS, cursorID, limit+1)
	if err != nil {
		return nil, err
	}

	return mapLikedPosts(rows), nil
}

func (c *DBClient) getHashtagPosts(ctx context.Context, tag string, cursor Cursor, hasCursor bool, limit int32, currentUserID int32) (iter.Seq2[postCursorRow, error], error) {
	query := `SELECT p.id, p.user_id, p.content,
		(SELECT count(*) FROM likes WHERE post_id = p.id) AS likes,
		EXISTS (SELECT 1 FROM likes WHERE post_id = p.id AND likes.user_id = $1) AS liked,
		(SELECT count(*) FROM posts AS rp WHERE rp.repost_of_id = p.id) AS reposts,
		EXISTS (SELECT 1 FROM posts AS rp WHERE rp.repost_of_id = p.id AND rp.user_id = $1) AS reposted,
		p.created, p.repost_of_id, p.media_key,
		(SELECT count(*) FROM posts AS r WHERE r.in_reply_to_id = p.id) AS replies,
		COALESCE(p.in_reply_to_id, 0) AS in_reply_to_id,
		COALESCE(p.quote_of_id, 0) AS quote_of_id
		FROM posts p
		JOIN post_hashtags ph ON ph.post_id = p.id
		JOIN hashtags h ON h.id = ph.hashtag_id
		WHERE h.name = $2
		AND p.in_reply_to_id IS NULL
		AND ($3::timestamptz IS NULL OR (p.created, p.id) < ($3::timestamptz, $4::int))
		ORDER BY p.created DESC, p.id DESC
		LIMIT $5`

	var cursorTS *time.Time
	var cursorID int32
	if hasCursor {
		cursorTS = &cursor.Created
		cursorID = cursor.ID
	}
	rows, err := c.db.Query(ctx, query, currentUserID, strings.ToLower(tag), cursorTS, cursorID, limit+1)
	if err != nil {
		return nil, err
	}

	return mapPostCursorRows(rows), nil
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
	tx, err := c.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var mediaKey string
	var inReplyToID int32
	err = tx.QueryRow(ctx, "SELECT COALESCE(media_key, ''), COALESCE(in_reply_to_id, 0) FROM posts WHERE id = $1 AND user_id = $2", postID, userID).Scan(&mediaKey, &inReplyToID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errNotFound
		}
		return err
	}

	var tagIDs []int32
	rows, err := tx.Query(ctx, "SELECT hashtag_id FROM post_hashtags WHERE post_id = $1", postID)
	if err != nil {
		return err
	}
	for rows.Next() {
		var tagID int32
		if err := rows.Scan(&tagID); err != nil {
			rows.Close()
			return err
		}
		tagIDs = append(tagIDs, tagID)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return err
	}
	rows.Close()

	_, err = tx.Exec(ctx, "DELETE FROM posts WHERE id = $1 AND user_id = $2", postID, userID)
	if err != nil {
		return err
	}

	err = outbox(tx, ctx, "entity-changes", map[string]any{
		"table": "posts", "op": "delete", "id": postID, "author_id": userID, "media_key": mediaKey,
	})
	if err != nil {
		return err
	}

	if inReplyToID != 0 {
		err = outbox(tx, ctx, "activity", map[string]any{
			"op": "unreply", "reply_post_id": postID, "actor_id": userID,
		})
		if err != nil {
			return err
		}
	}

	if len(tagIDs) > 0 {
		rows, err = tx.Query(ctx, `SELECT h.name, COUNT(ph.post_id)::int
			FROM hashtags h
			LEFT JOIN post_hashtags ph ON ph.hashtag_id = h.id
			WHERE h.id = ANY($1)
			GROUP BY h.id, h.name`, tagIDs)
		if err != nil {
			return err
		}
		type hashtagCount struct {
			name  string
			count int32
		}
		var counts []hashtagCount
		for rows.Next() {
			var item hashtagCount
			if err := rows.Scan(&item.name, &item.count); err != nil {
				rows.Close()
				return err
			}
			counts = append(counts, item)
		}
		if err := rows.Err(); err != nil {
			rows.Close()
			return err
		}
		rows.Close()
		for _, item := range counts {
			err = outbox(tx, ctx, "entity-changes", map[string]any{
				"table": "hashtags", "op": "upsert", "name": item.name, "post_count": item.count,
			})
			if err != nil {
				return err
			}
		}
	}

	return tx.Commit(ctx)
}

func (c *DBClient) likePost(ctx context.Context, postID int32, userID int32) error {
	tx, err := c.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	query := "INSERT INTO likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING"
	tag, err := tx.Exec(ctx, query, postID, userID)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23503" {
		return errInvalidReference
	}
	if err != nil {
		return err
	}
	if tag.RowsAffected() > 0 {
		var recipientID int32
		if err := tx.QueryRow(ctx, "SELECT user_id FROM posts WHERE id = $1", postID).Scan(&recipientID); err != nil {
			return err
		}
		err = outbox(tx, ctx, "activity", map[string]any{
			"op": "like", "post_id": postID, "actor_id": userID, "recipient_id": recipientID,
		})
		if err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (c *DBClient) unlikePost(ctx context.Context, postID int32, userID int32) error {
	tx, err := c.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var recipientID int32
	if err := tx.QueryRow(ctx, "SELECT user_id FROM posts WHERE id = $1", postID).Scan(&recipientID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errInvalidReference
		}
		return err
	}
	tag, err := tx.Exec(ctx, "DELETE FROM likes WHERE post_id = $1 AND user_id = $2", postID, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() > 0 {
		err = outbox(tx, ctx, "activity", map[string]any{
			"op": "unlike", "post_id": postID, "actor_id": userID, "recipient_id": recipientID,
		})
		if err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (c *DBClient) repostPost(ctx context.Context, postID int32, userID int32) error {
	tx, err := c.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	query := `INSERT INTO posts (user_id, repost_of_id)
		SELECT $1, COALESCE(p.repost_of_id, p.id)
		FROM posts p WHERE p.id = $2
		AND p.in_reply_to_id IS NULL
		ON CONFLICT (user_id, repost_of_id) DO NOTHING
		RETURNING id, repost_of_id, created`
	var newPostID int32
	var repostOfID int32
	var created time.Time
	err = tx.QueryRow(ctx, query, userID, postID).Scan(&newPostID, &repostOfID, &created)
	if errors.Is(err, pgx.ErrNoRows) {
		return tx.Commit(ctx)
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23503" {
		return errInvalidReference
	}
	if err != nil {
		return err
	}

	var recipientID int32
	if err := tx.QueryRow(ctx, "SELECT user_id FROM posts WHERE id = $1", repostOfID).Scan(&recipientID); err != nil {
		return err
	}
	followerCount, fanOutDisabled, err := authorFanOutSnapshot(ctx, tx, userID)
	if err != nil {
		return err
	}
	err = outbox(tx, ctx, "entity-changes", map[string]any{
		"table": "posts", "op": "upsert",
		"id": newPostID, "author_id": userID,
		"follower_count": followerCount, "fan_out_disabled": fanOutDisabled,
		"repost_of_id": repostOfID, "created": created,
	})
	if err != nil {
		return err
	}
	err = outbox(tx, ctx, "activity", map[string]any{
		"op": "repost", "post_id": repostOfID, "actor_id": userID, "recipient_id": recipientID,
	})
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (c *DBClient) removeRepost(ctx context.Context, postID int32, userID int32) error {
	tx, err := c.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var repostRowID int32
	var repostOfID int32
	err = tx.QueryRow(ctx, "SELECT id, repost_of_id FROM posts WHERE user_id = $1 AND repost_of_id = $2", userID, postID).Scan(&repostRowID, &repostOfID)
	if errors.Is(err, pgx.ErrNoRows) {
		return tx.Commit(ctx)
	}
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, "DELETE FROM posts WHERE id = $1 AND user_id = $2", repostRowID, userID)
	if err != nil {
		return err
	}
	var recipientID int32
	if err := tx.QueryRow(ctx, "SELECT user_id FROM posts WHERE id = $1", repostOfID).Scan(&recipientID); err != nil {
		return err
	}
	err = outbox(tx, ctx, "entity-changes", map[string]any{
		"table": "posts", "op": "delete", "id": repostRowID, "author_id": userID, "media_key": "",
	})
	if err != nil {
		return err
	}
	err = outbox(tx, ctx, "activity", map[string]any{
		"op": "unrepost", "post_id": repostOfID, "actor_id": userID, "recipient_id": recipientID,
	})
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (c *DBClient) getReplies(ctx context.Context, postID int32, cursor Cursor, hasCursor bool, limit int32, currentUserID int32) (iter.Seq2[postCursorRow, error], error) {
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
		AND ($3::timestamptz IS NULL OR (created, id) > ($3::timestamptz, $4::int))
		ORDER BY created ASC, id ASC
		LIMIT $5`

	var cursorTS *time.Time
	var cursorID int32
	if hasCursor {
		cursorTS = &cursor.Created
		cursorID = cursor.ID
	}
	rows, err := c.db.Query(ctx, query, currentUserID, postID, cursorTS, cursorID, limit+1)
	if err != nil {
		return nil, err
	}

	return mapPostCursorRows(rows), nil
}

func (c *DBClient) searchHashtags(ctx context.Context, query string, limit int32) ([]*pb.Hashtag, error) {
	sql := `SELECT h.id, h.name, COUNT(ph.post_id)::int AS post_count
		FROM hashtags h
		LEFT JOIN post_hashtags ph ON ph.hashtag_id = h.id
		WHERE h.name % $1 OR h.name ILIKE $2
		GROUP BY h.id
		ORDER BY similarity(h.name, $1) DESC, post_count DESC
		LIMIT $3`

	q := strings.ToLower(query)
	rows, err := c.db.Query(ctx, sql, q, q+"%", limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []*pb.Hashtag
	for rows.Next() {
		var h pb.Hashtag
		if err := rows.Scan(&h.Id, &h.Name, &h.PostCount); err != nil {
			return nil, err
		}
		tags = append(tags, &h)
	}
	return tags, rows.Err()
}
