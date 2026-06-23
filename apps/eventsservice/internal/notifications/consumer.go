package notifications

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strconv"

	"github.com/twmb/franz-go/pkg/kgo"
)

const (
	ConsumerGroup = "notifications-consumer"

	topicEntityChanges = "entity-changes"
	topicActivity      = "activity"
)

var errMissingField = errors.New("missing event field")

type Consumer struct {
	client *kgo.Client
	repo   Repository
}

func NewConsumer(client *kgo.Client, repo Repository) *Consumer {
	client.AddConsumeTopics(topicEntityChanges, topicActivity)
	return &Consumer{client: client, repo: repo}
}

func (c *Consumer) Run(ctx context.Context) {
	for {
		fetches := c.client.PollFetches(ctx)
		if err := fetches.Err0(); err != nil && errors.Is(err, context.Canceled) {
			return
		}
		if fetches.IsClientClosed() {
			return
		}
		fetches.EachError(func(topic string, partition int32, err error) {
			if errors.Is(err, context.Canceled) {
				return
			}
			slog.Warn("notifications consumer fetch failed", "topic", topic, "partition", partition, "error", err)
		})
		for _, record := range fetches.Records() {
			if err := c.processRecord(ctx, record); err != nil {
				slog.Warn("notifications consumer record failed", "topic", record.Topic, "partition", record.Partition, "offset", record.Offset, "error", err)
				break
			}
			if err := c.client.CommitRecords(ctx, record); err != nil {
				slog.Warn("notifications consumer commit failed", "topic", record.Topic, "partition", record.Partition, "offset", record.Offset, "error", err)
				break
			}
		}
	}
}

func (c *Consumer) processRecord(ctx context.Context, record *kgo.Record) (err error) {
	defer func() {
		if recovered := recover(); recovered != nil {
			slog.Error("notifications consumer recovered panic", "topic", record.Topic, "partition", record.Partition, "offset", record.Offset, "panic", recovered)
			err = fmt.Errorf("notifications consumer panic: %v", recovered)
		}
	}()
	return c.dispatch(ctx, record.Topic, record.Value)
}

func (c *Consumer) dispatch(ctx context.Context, topic string, value []byte) error {
	var payload map[string]json.RawMessage
	if err := json.Unmarshal(value, &payload); err != nil {
		return fmt.Errorf("decode event payload: %w", err)
	}

	switch topic {
	case topicEntityChanges:
		return c.dispatchEntityChange(ctx, payload)
	case topicActivity:
		return c.dispatchActivity(ctx, payload)
	default:
		slog.Warn("notifications consumer skipping unknown topic", "topic", topic)
		return nil
	}
}

func (c *Consumer) dispatchEntityChange(ctx context.Context, payload map[string]json.RawMessage) error {
	table, err := stringField(payload, "table")
	if err != nil {
		return err
	}
	if table != "posts" {
		return nil
	}

	op, err := stringField(payload, "op")
	if err != nil {
		return err
	}
	switch op {
	case "delete":
		postID, err := int64Field(payload, "id")
		if err != nil {
			return err
		}
		return c.repo.DeleteByEntity(ctx, strconv.FormatInt(postID, 10), []string{"like", "repost", "reply"})
	default:
		slog.Warn("notifications consumer skipping unknown entity op", "op", op, "table", table)
		return nil
	}
}

func (c *Consumer) dispatchActivity(ctx context.Context, payload map[string]json.RawMessage) error {
	op, err := stringField(payload, "op")
	if err != nil {
		return err
	}

	switch op {
	case "like":
		return c.insertPostNotification(ctx, payload, "like")
	case "unlike":
		return c.deletePostNotification(ctx, payload, "like")
	case "repost":
		return c.insertPostNotification(ctx, payload, "repost")
	case "unrepost":
		return c.deletePostNotification(ctx, payload, "repost")
	case "reply":
		return c.insertReplyNotification(ctx, payload)
	case "unreply":
		replyPostID, err := int64Field(payload, "reply_post_id")
		if err != nil {
			return err
		}
		return c.repo.DeleteByEntity(ctx, strconv.FormatInt(replyPostID, 10), []string{"reply"})
	case "follow":
		return c.insertFollowNotification(ctx, payload)
	case "unfollow":
		actorID, recipientID, err := actorRecipient(payload)
		if err != nil {
			return err
		}
		return c.repo.DeleteByActorAndType(ctx, actorID, recipientID, "follow", strconv.FormatInt(int64(actorID), 10))
	default:
		slog.Warn("notifications consumer skipping unknown activity op", "op", op)
		return nil
	}
}

func (c *Consumer) insertPostNotification(ctx context.Context, payload map[string]json.RawMessage, notifType string) error {
	outboxID, actorID, recipientID, err := insertFields(payload)
	if err != nil {
		return err
	}
	if actorID == recipientID {
		return nil
	}
	postID, err := int64Field(payload, "post_id")
	if err != nil {
		return err
	}
	return c.repo.Insert(ctx, outboxID, recipientID, actorID, notifType, strconv.FormatInt(postID, 10))
}

func (c *Consumer) deletePostNotification(ctx context.Context, payload map[string]json.RawMessage, notifType string) error {
	actorID, recipientID, err := actorRecipient(payload)
	if err != nil {
		return err
	}
	postID, err := int64Field(payload, "post_id")
	if err != nil {
		return err
	}
	return c.repo.DeleteByActorAndType(ctx, actorID, recipientID, notifType, strconv.FormatInt(postID, 10))
}

func (c *Consumer) insertReplyNotification(ctx context.Context, payload map[string]json.RawMessage) error {
	outboxID, actorID, recipientID, err := insertFields(payload)
	if err != nil {
		return err
	}
	if actorID == recipientID {
		return nil
	}
	replyPostID, err := int64Field(payload, "reply_post_id")
	if err != nil {
		return err
	}
	return c.repo.Insert(ctx, outboxID, recipientID, actorID, "reply", strconv.FormatInt(replyPostID, 10))
}

func (c *Consumer) insertFollowNotification(ctx context.Context, payload map[string]json.RawMessage) error {
	outboxID, actorID, recipientID, err := insertFields(payload)
	if err != nil {
		return err
	}
	if actorID == recipientID {
		return nil
	}
	return c.repo.Insert(ctx, outboxID, recipientID, actorID, "follow", strconv.FormatInt(int64(actorID), 10))
}

func insertFields(payload map[string]json.RawMessage) (int64, int32, int32, error) {
	outboxID, err := int64Field(payload, "_outbox_id")
	if err != nil {
		return 0, 0, 0, err
	}
	actorID, recipientID, err := actorRecipient(payload)
	if err != nil {
		return 0, 0, 0, err
	}
	return outboxID, actorID, recipientID, nil
}

func actorRecipient(payload map[string]json.RawMessage) (int32, int32, error) {
	actorID, err := int32Field(payload, "actor_id")
	if err != nil {
		return 0, 0, err
	}
	recipientID, err := int32Field(payload, "recipient_id")
	if err != nil {
		return 0, 0, err
	}
	return actorID, recipientID, nil
}

func stringField(payload map[string]json.RawMessage, name string) (string, error) {
	raw, ok := payload[name]
	if !ok {
		return "", fmt.Errorf("%w: %s", errMissingField, name)
	}
	var value string
	if err := json.Unmarshal(raw, &value); err != nil {
		return "", fmt.Errorf("decode %s: %w", name, err)
	}
	return value, nil
}

func int32Field(payload map[string]json.RawMessage, name string) (int32, error) {
	value, err := int64Field(payload, name)
	if err != nil {
		return 0, err
	}
	if value < -2147483648 || value > 2147483647 {
		return 0, fmt.Errorf("%s out of int32 range", name)
	}
	return int32(value), nil
}

func int64Field(payload map[string]json.RawMessage, name string) (int64, error) {
	raw, ok := payload[name]
	if !ok {
		return 0, fmt.Errorf("%w: %s", errMissingField, name)
	}
	var value json.Number
	if err := json.Unmarshal(raw, &value); err != nil {
		return 0, fmt.Errorf("decode %s: %w", name, err)
	}
	parsed, err := value.Int64()
	if err != nil {
		return 0, fmt.Errorf("decode %s: %w", name, err)
	}
	return parsed, nil
}
