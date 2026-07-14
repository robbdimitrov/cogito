package post

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
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

// postCountsAndViewerFlags returns the likes/reposts count-and-viewer-flag
// subqueries shared verbatim by every post-listing query in this file.
// postIDExpr is the SQL expression identifying the post being counted
// against — e.g. "posts.id", "p.id", a bare "id" (only safe where no sibling
// alias shadows it — see callers' comments), or "COALESCE(o.id, p.id)" for
// feed queries that resolve reposts back to their original post. The viewer
// id is always bound as $1 by convention in every query that embeds this
// fragment.
func postCountsAndViewerFlags(postIDExpr string) string {
	return fmt.Sprintf(`(SELECT count(*) FROM likes WHERE post_id = %[1]s) AS likes,
		EXISTS (SELECT 1 FROM likes WHERE post_id = %[1]s AND likes.user_id = $1) AS liked,
		(SELECT count(*) FROM posts AS rp WHERE rp.repost_of_id = %[1]s) AS reposts,
		EXISTS (SELECT 1 FROM posts AS rp WHERE rp.repost_of_id = %[1]s AND rp.user_id = $1) AS reposted`, postIDExpr)
}

// repliesCount returns the replies-count subquery shared verbatim by every
// post-listing query in this file. See postCountsAndViewerFlags for
// postIDExpr.
func repliesCount(postIDExpr string) string {
	return fmt.Sprintf("(SELECT count(*) FROM posts AS r WHERE r.in_reply_to_id = %s) AS replies", postIDExpr)
}

func feedPullQuery(querySelect string) string {
	return querySelect + `
		FROM posts p
		JOIN users u ON u.id = p.user_id
		LEFT JOIN posts o ON o.id = p.repost_of_id
		WHERE (
			p.user_id = $2
			OR p.user_id IN (
				SELECT fol.user_id FROM followers fol
				JOIN users fu ON fu.id = fol.user_id
				WHERE fol.follower_id = $2
				AND fu.fan_out_disabled = true
			)
		)
		AND (p.user_id = $2 OR u.fan_out_disabled = true)
		AND NOT EXISTS (
			SELECT 1 FROM feed f
			WHERE f.user_id = $2 AND f.post_id = p.id
		)
		AND p.in_reply_to_id IS NULL
		AND (o.id IS NULL OR o.in_reply_to_id IS NULL)
		AND ($3::timestamptz IS NULL OR (p.created, p.id) < ($3::timestamptz, $4::int))
		ORDER BY p.created DESC, p.id DESC
		LIMIT $5`
}

var errInvalidReference = errors.New("invalid reference")
var errNotFound = errors.New("not found")

type DBClient struct {
	db *pgxpool.Pool
}

const (
	dbMaxConns              int32 = 5
	dbMaxConnLifetime             = 30 * time.Minute
	dbMaxConnIdleTime             = 5 * time.Minute
	dbPoolHealthCheckPeriod       = time.Minute
)

func NewDBClient(dbURL string) (*DBClient, error) {
	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		return nil, err
	}
	config.MaxConns = dbMaxConns
	config.MaxConnLifetime = dbMaxConnLifetime
	config.MaxConnIdleTime = dbMaxConnIdleTime
	config.HealthCheckPeriod = dbPoolHealthCheckPeriod
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
		var databaseErr *pgconn.PgError
		if errors.As(err, &databaseErr) && databaseErr.Code == "23503" {
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
		var hashtagID int32
		var count int32
		err = tx.QueryRow(ctx, `SELECT h.id, COUNT(ph.post_id)::int
			FROM hashtags h
			LEFT JOIN post_hashtags ph ON ph.hashtag_id = h.id
			WHERE h.name = $1
			GROUP BY h.id`, tag).Scan(&hashtagID, &count)
		if err != nil {
			return 0, err
		}
		err = outbox(tx, ctx, "entity-changes", map[string]any{
			"table": "hashtags", "op": "upsert", "id": hashtagID, "name": tag, "post_count": count,
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
		` + postCountsAndViewerFlags("COALESCE(o.id, p.id)") + `,
		p.created, p.repost_of_id, p.media_key,
		` + repliesCount("COALESCE(o.id, p.id)") + `,
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
	pullQuery := feedPullQuery(querySelect)

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

func (c *DBClient) getPosts(ctx context.Context, userID int32, cursor Cursor, hasCursor bool, limit int32, currentUserID *int32) (iter.Seq2[postCursorRow, error], error) {
	query := `SELECT
		p.id, p.user_id, p.content,
		` + postCountsAndViewerFlags("COALESCE(o.id, p.id)") + `,
		p.created, p.repost_of_id, p.media_key,
		` + repliesCount("COALESCE(o.id, p.id)") + `,
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
	// posts.id must stay qualified in postCountsAndViewerFlags/repliesCount:
	// their own FROM posts AS rp/r shadows a bare `id`, binding it to the
	// inner alias instead of the outer row and silently zeroing every count.
	query := `SELECT likes.created AS cursor_ts,
		id, posts.user_id, content,
		` + postCountsAndViewerFlags("posts.id") + `,
		posts.created, posts.repost_of_id, posts.media_key,
		` + repliesCount("posts.id") + `,
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
		` + postCountsAndViewerFlags("p.id") + `,
		p.created, p.repost_of_id, p.media_key,
		` + repliesCount("p.id") + `,
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

func (c *DBClient) getPost(ctx context.Context, id int32, currentUserID *int32) (*pb.Post, error) {
	// posts.id must stay qualified in postCountsAndViewerFlags/repliesCount:
	// their own FROM posts AS rp/r shadows a bare `id`, binding it to the
	// inner alias instead of the outer row and silently zeroing every count.
	query := `SELECT id, user_id, content,
		` + postCountsAndViewerFlags("posts.id") + `,
		created, repost_of_id, media_key,
		` + repliesCount("posts.id") + `,
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

func (c *DBClient) getPostsByIds(ctx context.Context, ids []int32, currentUserID *int32) (iter.Seq2[*pb.Post, error], error) {
	// posts.id must stay qualified — see getPost for why a bare `id` here
	// would silently bind to postCountsAndViewerFlags/repliesCount's own alias.
	query := `SELECT id, user_id, content,
		` + postCountsAndViewerFlags("posts.id") + `,
		created, repost_of_id, media_key,
		` + repliesCount("posts.id") + `,
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

	// Capture reply IDs before the FK SET NULL orphans them, so their reply
	// notifications can still be cleaned up via this delete event.
	var replyPostIDs []int32
	rows, err = tx.Query(ctx, "SELECT id FROM posts WHERE in_reply_to_id = $1", postID)
	if err != nil {
		return err
	}
	for rows.Next() {
		var replyID int32
		if err := rows.Scan(&replyID); err != nil {
			rows.Close()
			return err
		}
		replyPostIDs = append(replyPostIDs, replyID)
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
		"table": "posts", "op": "delete", "id": postID, "author_id": userID, "media_key": mediaKey, "reply_post_ids": replyPostIDs,
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
		rows, err = tx.Query(ctx, `SELECT h.id, h.name, COUNT(ph.post_id)::int
			FROM hashtags h
			LEFT JOIN post_hashtags ph ON ph.hashtag_id = h.id
			WHERE h.id = ANY($1)
			GROUP BY h.id, h.name`, tagIDs)
		if err != nil {
			return err
		}
		type hashtagCount struct {
			id    int32
			name  string
			count int32
		}
		var counts []hashtagCount
		for rows.Next() {
			var item hashtagCount
			if err := rows.Scan(&item.id, &item.name, &item.count); err != nil {
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
				"table": "hashtags", "op": "upsert", "id": item.id, "name": item.name, "post_count": item.count,
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
	var databaseErr *pgconn.PgError
	if errors.As(err, &databaseErr) && databaseErr.Code == "23503" {
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

	var repostOfID int32
	var targetIsReply bool
	err = tx.QueryRow(ctx, "SELECT COALESCE(repost_of_id, id), in_reply_to_id IS NOT NULL FROM posts WHERE id = $1", postID).Scan(&repostOfID, &targetIsReply)
	if errors.Is(err, pgx.ErrNoRows) {
		return errInvalidReference
	}
	if err != nil {
		return err
	}
	if targetIsReply {
		return errInvalidReference
	}

	query := `INSERT INTO posts (user_id, repost_of_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, repost_of_id) DO NOTHING
		RETURNING id, created`
	var newPostID int32
	var created time.Time
	err = tx.QueryRow(ctx, query, userID, repostOfID).Scan(&newPostID, &created)
	if errors.Is(err, pgx.ErrNoRows) {
		return tx.Commit(ctx)
	}
	var databaseErr *pgconn.PgError
	if errors.As(err, &databaseErr) && databaseErr.Code == "23503" {
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
	err = tx.QueryRow(ctx, "SELECT COALESCE(repost_of_id, id) FROM posts WHERE id = $1", postID).Scan(&repostOfID)
	if errors.Is(err, pgx.ErrNoRows) {
		return tx.Commit(ctx)
	}
	if err != nil {
		return err
	}
	err = tx.QueryRow(ctx, "SELECT id FROM posts WHERE user_id = $1 AND repost_of_id = $2", userID, repostOfID).Scan(&repostRowID)
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
	// posts.id must stay qualified — see getPost for why a bare `id` here
	// would silently bind to postCountsAndViewerFlags/repliesCount's own alias.
	query := `SELECT id, user_id, content,
		` + postCountsAndViewerFlags("posts.id") + `,
		created, repost_of_id, media_key,
		` + repliesCount("posts.id") + `,
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
