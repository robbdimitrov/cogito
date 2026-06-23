package feed

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strconv"
	"time"

	"github.com/twmb/franz-go/pkg/kgo"
	"github.com/valkey-io/valkey-go"
)

const (
	TopicEntityChanges = "entity-changes"
	TopicActivity      = "activity"

	cacheTTL = 5 * time.Minute
)

type FollowerCountCache interface {
	GetFollowerCount(ctx context.Context, authorID int32) (int, bool, error)
	SetFollowerCount(ctx context.Context, authorID int32, count int, ttl time.Duration) error
}

type ValkeyFollowerCountCache struct {
	client valkey.Client
}

func NewValkeyFollowerCountCache(client valkey.Client) *ValkeyFollowerCountCache {
	return &ValkeyFollowerCountCache{client: client}
}

func (c *ValkeyFollowerCountCache) GetFollowerCount(ctx context.Context, authorID int32) (int, bool, error) {
	value, err := c.client.Do(ctx, c.client.B().Get().Key(followerCountKey(authorID)).Build()).ToString()
	if valkey.IsValkeyNil(err) {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	count, err := strconv.Atoi(value)
	if err != nil {
		return 0, false, err
	}
	return count, true, nil
}

func (c *ValkeyFollowerCountCache) SetFollowerCount(ctx context.Context, authorID int32, count int, ttl time.Duration) error {
	return c.client.Do(ctx, c.client.B().Set().Key(followerCountKey(authorID)).Value(strconv.Itoa(count)).Ex(ttl).Build()).Error()
}

type Consumer struct {
	client    *kgo.Client
	repo      Repository
	cache     FollowerCountCache
	threshold int
}

func NewConsumer(client *kgo.Client, repo Repository, cache FollowerCountCache, threshold int) *Consumer {
	return &Consumer{
		client:    client,
		repo:      repo,
		cache:     cache,
		threshold: threshold,
	}
}

func (c *Consumer) Run(ctx context.Context) {
	if c.client == nil {
		slog.Warn("feed consumer not started: kafka client is nil")
		return
	}

	c.client.AddConsumeTopics(TopicEntityChanges, TopicActivity)
	for ctx.Err() == nil {
		fetches := c.client.PollFetches(ctx)
		if ctx.Err() != nil {
			return
		}
		for _, fetchErr := range fetches.Errors() {
			slog.Warn("feed consumer fetch failed", "topic", fetchErr.Topic, "partition", fetchErr.Partition, "error", fetchErr.Err)
		}
		for _, record := range fetches.Records() {
			if err := c.processRecord(ctx, record); err != nil {
				slog.Warn("feed event processing failed", "topic", record.Topic, "partition", record.Partition, "offset", record.Offset, "error", err)
				break
			}
			if err := c.client.CommitRecords(ctx, record); err != nil {
				slog.Warn("feed event offset commit failed", "topic", record.Topic, "partition", record.Partition, "offset", record.Offset, "error", err)
				break
			}
		}
	}
}

func (c *Consumer) processRecord(ctx context.Context, record *kgo.Record) (err error) {
	defer func() {
		if recovered := recover(); recovered != nil {
			err = fmt.Errorf("panic processing feed event: %v", recovered)
		}
	}()
	return c.HandleMessage(ctx, record.Topic, record.Value)
}

func (c *Consumer) HandleMessage(ctx context.Context, topic string, payload []byte) error {
	var event map[string]json.RawMessage
	decoder := json.NewDecoder(bytes.NewReader(payload))
	decoder.UseNumber()
	if err := decoder.Decode(&event); err != nil {
		slog.Warn("feed event has invalid json", "topic", topic, "error", err)
		return nil
	}

	switch topic {
	case TopicEntityChanges:
		return c.handleEntityChange(ctx, event)
	case TopicActivity:
		return c.handleActivity(ctx, event)
	default:
		slog.Warn("feed event on unknown topic", "topic", topic)
		return nil
	}
}

func (c *Consumer) handleEntityChange(ctx context.Context, event map[string]json.RawMessage) error {
	table, ok := stringField(event, "table")
	if !ok || table != "posts" {
		return nil
	}
	op, ok := stringField(event, "op")
	if !ok {
		return nil
	}
	switch op {
	case "upsert":
		if hasNonNullField(event, "in_reply_to_id") {
			return nil
		}
		postID, ok := int32Field(event, "id")
		if !ok {
			return nil
		}
		authorID, ok := int32Field(event, "author_id")
		if !ok {
			return nil
		}
		created, ok := timeField(event, "created")
		if !ok {
			return nil
		}
		return c.fanOutPost(ctx, authorID, postID, created)
	case "delete":
		return nil
	default:
		slog.Warn("feed entity-change event has unknown op", "op", op)
		return nil
	}
}

func (c *Consumer) handleActivity(ctx context.Context, event map[string]json.RawMessage) error {
	op, ok := stringField(event, "op")
	if !ok {
		return nil
	}
	switch op {
	case "follow":
		followerID, ok := int32Field(event, "actor_id")
		if !ok {
			return nil
		}
		followeeID, ok := int32Field(event, "recipient_id")
		if !ok {
			return nil
		}
		return c.backfillFollow(ctx, followerID, followeeID)
	case "unfollow":
		followerID, ok := int32Field(event, "actor_id")
		if !ok {
			return nil
		}
		followeeID, ok := int32Field(event, "recipient_id")
		if !ok {
			return nil
		}
		return c.repo.PruneByFollowee(ctx, followerID, followeeID)
	default:
		return nil
	}
}

func (c *Consumer) fanOutPost(ctx context.Context, authorID, postID int32, created time.Time) error {
	count, err := c.followerCount(ctx, authorID)
	if err != nil {
		return err
	}
	if count >= c.threshold {
		if err := c.repo.BulkInsert(ctx, []Entry{{UserID: authorID, PostID: postID, Created: created}}); err != nil {
			return err
		}
		return c.repo.SetFanOutDisabled(ctx, authorID)
	}

	followers, err := c.repo.GetFollowers(ctx, authorID)
	if err != nil {
		return err
	}
	entries := make([]Entry, 0, len(followers)+1)
	for _, followerID := range followers {
		entries = append(entries, Entry{UserID: followerID, PostID: postID, Created: created})
	}
	entries = append(entries, Entry{UserID: authorID, PostID: postID, Created: created})
	return c.repo.BulkInsert(ctx, entries)
}

func (c *Consumer) backfillFollow(ctx context.Context, followerID, followeeID int32) error {
	disabled, err := c.repo.GetFanOutDisabled(ctx, followeeID)
	if err != nil {
		return err
	}
	if disabled {
		return nil
	}

	posts, err := c.repo.GetLastPosts(ctx, followeeID, 50)
	if err != nil {
		return err
	}
	entries := make([]Entry, 0, len(posts))
	for _, post := range posts {
		entries = append(entries, Entry{UserID: followerID, PostID: post.PostID, Created: post.Created})
	}
	return c.repo.BulkInsert(ctx, entries)
}

func (c *Consumer) followerCount(ctx context.Context, authorID int32) (int, error) {
	if c.cache != nil {
		count, ok, err := c.cache.GetFollowerCount(ctx, authorID)
		if err != nil {
			slog.Warn("feed follower count cache read failed", "author_id", authorID, "error", err)
		} else if ok {
			return count, nil
		}
	}

	count, err := c.repo.CountFollowers(ctx, authorID)
	if err != nil {
		return 0, err
	}
	if c.cache != nil {
		if err := c.cache.SetFollowerCount(ctx, authorID, count, cacheTTL); err != nil {
			slog.Warn("feed follower count cache write failed", "author_id", authorID, "error", err)
		}
	}
	return count, nil
}

func followerCountKey(authorID int32) string {
	return "follower_count:" + strconv.FormatInt(int64(authorID), 10)
}

func stringField(event map[string]json.RawMessage, name string) (string, bool) {
	raw, ok := event[name]
	if !ok {
		return "", false
	}
	var value string
	if err := json.Unmarshal(raw, &value); err != nil {
		return "", false
	}
	return value, true
}

func int32Field(event map[string]json.RawMessage, name string) (int32, bool) {
	raw, ok := event[name]
	if !ok {
		return 0, false
	}
	var value json.Number
	if err := json.Unmarshal(raw, &value); err != nil {
		return 0, false
	}
	parsed, err := value.Int64()
	if err != nil || parsed < 0 || parsed > int64(^uint32(0)>>1) {
		return 0, false
	}
	return int32(parsed), true
}

func timeField(event map[string]json.RawMessage, name string) (time.Time, bool) {
	raw, ok := event[name]
	if !ok {
		return time.Time{}, false
	}
	var value string
	if err := json.Unmarshal(raw, &value); err != nil {
		return time.Time{}, false
	}
	for _, layout := range []string{time.RFC3339Nano, "2006-01-02T15:04:05.999999Z07:00", "2006-01-02 15:04:05.999999-07"} {
		parsed, err := time.Parse(layout, value)
		if err == nil {
			return parsed, true
		}
	}
	return time.Time{}, false
}

func hasNonNullField(event map[string]json.RawMessage, name string) bool {
	raw, ok := event[name]
	if !ok {
		return false
	}
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		return false
	}
	return value != nil
}
