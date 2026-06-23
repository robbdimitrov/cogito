package feed

import (
	"context"
	"testing"
	"time"

	"github.com/twmb/franz-go/pkg/kgo"
)

func TestHandleMessageFansOutPostUpsert(t *testing.T) {
	ctx := context.Background()
	created := "2026-06-23T10:11:12Z"
	repo := &fakeRepo{
		count:     2,
		followers: []int32{11, 12},
	}
	cache := &fakeCache{}
	consumer := NewConsumer(nil, repo, cache, 10)

	err := consumer.HandleMessage(ctx, TopicEntityChanges, []byte(`{"table":"posts","op":"upsert","id":42,"author_id":7,"created":"`+created+`"}`))
	if err != nil {
		t.Fatalf("HandleMessage returned error: %v", err)
	}

	if repo.countCalls != 1 {
		t.Fatalf("CountFollowers calls = %d, want 1", repo.countCalls)
	}
	if len(repo.bulkEntries) != 3 {
		t.Fatalf("bulk entries = %d, want 3", len(repo.bulkEntries))
	}
	wantUsers := []int32{11, 12, 7}
	for i, entry := range repo.bulkEntries {
		if entry.UserID != wantUsers[i] || entry.PostID != 42 {
			t.Fatalf("entry[%d] = %+v, want user %d post 42", i, entry, wantUsers[i])
		}
	}
	if cache.setAuthorID != 7 || cache.setCount != 2 || cache.setTTL != cacheTTL {
		t.Fatalf("cache set = author %d count %d ttl %s", cache.setAuthorID, cache.setCount, cache.setTTL)
	}
}

func TestHandleMessageUsesCachedFollowerCount(t *testing.T) {
	ctx := context.Background()
	repo := &fakeRepo{followers: []int32{11}}
	cache := &fakeCache{count: 1, ok: true}
	consumer := NewConsumer(nil, repo, cache, 10)

	err := consumer.HandleMessage(ctx, TopicEntityChanges, []byte(`{"table":"posts","op":"upsert","id":42,"author_id":7,"created":"2026-06-23T10:11:12Z"}`))
	if err != nil {
		t.Fatalf("HandleMessage returned error: %v", err)
	}

	if repo.countCalls != 0 {
		t.Fatalf("CountFollowers calls = %d, want 0", repo.countCalls)
	}
	if len(repo.bulkEntries) != 2 {
		t.Fatalf("bulk entries = %d, want 2", len(repo.bulkEntries))
	}
}

func TestHandleMessageDisablesFanOutAtThreshold(t *testing.T) {
	ctx := context.Background()
	repo := &fakeRepo{count: 10}
	consumer := NewConsumer(nil, repo, &fakeCache{}, 10)

	err := consumer.HandleMessage(ctx, TopicEntityChanges, []byte(`{"table":"posts","op":"upsert","id":42,"author_id":7,"created":"2026-06-23T10:11:12Z"}`))
	if err != nil {
		t.Fatalf("HandleMessage returned error: %v", err)
	}

	if repo.disabledUserID != 7 {
		t.Fatalf("disabled user = %d, want 7", repo.disabledUserID)
	}
	if len(repo.bulkEntries) != 1 {
		t.Fatalf("bulk entries = %d, want 1", len(repo.bulkEntries))
	}
	if repo.bulkEntries[0].UserID != 7 || repo.bulkEntries[0].PostID != 42 {
		t.Fatalf("bulk entry = %+v, want author feed row for post 42", repo.bulkEntries[0])
	}
}

func TestHandleMessageSkipsReplies(t *testing.T) {
	ctx := context.Background()
	repo := &fakeRepo{count: 2, followers: []int32{11}}
	consumer := NewConsumer(nil, repo, &fakeCache{}, 10)

	err := consumer.HandleMessage(ctx, TopicEntityChanges, []byte(`{"table":"posts","op":"upsert","id":42,"author_id":7,"in_reply_to_id":9,"created":"2026-06-23T10:11:12Z"}`))
	if err != nil {
		t.Fatalf("HandleMessage returned error: %v", err)
	}

	if repo.countCalls != 0 || len(repo.bulkEntries) != 0 {
		t.Fatalf("reply event touched repo: countCalls=%d bulk=%d", repo.countCalls, len(repo.bulkEntries))
	}
}

func TestHandleMessageBackfillsFollow(t *testing.T) {
	ctx := context.Background()
	now := time.Date(2026, 6, 23, 10, 11, 12, 0, time.UTC)
	repo := &fakeRepo{
		lastPosts: []Entry{
			{UserID: 7, PostID: 42, Created: now},
			{UserID: 7, PostID: 41, Created: now.Add(-time.Minute)},
		},
	}
	consumer := NewConsumer(nil, repo, nil, 10)

	err := consumer.HandleMessage(ctx, TopicActivity, []byte(`{"op":"follow","actor_id":11,"recipient_id":7}`))
	if err != nil {
		t.Fatalf("HandleMessage returned error: %v", err)
	}

	if repo.getLastLimit != 50 {
		t.Fatalf("GetLastPosts limit = %d, want 50", repo.getLastLimit)
	}
	if len(repo.bulkEntries) != 2 {
		t.Fatalf("bulk entries = %d, want 2", len(repo.bulkEntries))
	}
	for _, entry := range repo.bulkEntries {
		if entry.UserID != 11 {
			t.Fatalf("entry user = %d, want follower 11", entry.UserID)
		}
	}
}

func TestHandleMessageSkipsBackfillForFanOutDisabledFollowee(t *testing.T) {
	ctx := context.Background()
	repo := &fakeRepo{fanOutDisabled: true}
	consumer := NewConsumer(nil, repo, nil, 10)

	err := consumer.HandleMessage(ctx, TopicActivity, []byte(`{"op":"follow","actor_id":11,"recipient_id":7}`))
	if err != nil {
		t.Fatalf("HandleMessage returned error: %v", err)
	}

	if repo.getLastCalls != 0 || len(repo.bulkEntries) != 0 {
		t.Fatalf("disabled followee was backfilled: calls=%d bulk=%d", repo.getLastCalls, len(repo.bulkEntries))
	}
}

func TestHandleMessagePrunesOnUnfollow(t *testing.T) {
	ctx := context.Background()
	repo := &fakeRepo{}
	consumer := NewConsumer(nil, repo, nil, 10)

	err := consumer.HandleMessage(ctx, TopicActivity, []byte(`{"op":"unfollow","actor_id":11,"recipient_id":7}`))
	if err != nil {
		t.Fatalf("HandleMessage returned error: %v", err)
	}

	if repo.pruneFollowerID != 11 || repo.pruneFolloweeID != 7 {
		t.Fatalf("prune = follower %d followee %d, want 11/7", repo.pruneFollowerID, repo.pruneFolloweeID)
	}
}

func TestProcessRecordRecoversPanics(t *testing.T) {
	repo := &fakeRepo{panicBulk: true}
	consumer := NewConsumer(nil, repo, &fakeCache{count: 0, ok: true}, 10)
	record := &kgo.Record{
		Topic: TopicEntityChanges,
		Value: []byte(`{"table":"posts","op":"upsert","id":42,"author_id":7,"created":"2026-06-23T10:11:12Z"}`),
	}

	err := consumer.processRecord(context.Background(), record)
	if err == nil {
		t.Fatal("processRecord returned nil, want panic error")
	}
}

type fakeRepo struct {
	count          int
	countCalls     int
	followers      []int32
	bulkEntries    []Entry
	disabledUserID int32

	fanOutDisabled bool
	lastPosts      []Entry
	getLastCalls   int
	getLastLimit   int

	pruneFollowerID int32
	pruneFolloweeID int32

	panicBulk bool
}

func (r *fakeRepo) BulkInsert(_ context.Context, entries []Entry) error {
	if r.panicBulk {
		panic("bulk insert failed")
	}
	r.bulkEntries = append(r.bulkEntries, entries...)
	return nil
}

func (r *fakeRepo) PruneByFollowee(_ context.Context, followerID, followeeID int32) error {
	r.pruneFollowerID = followerID
	r.pruneFolloweeID = followeeID
	return nil
}

func (r *fakeRepo) CountFollowers(context.Context, int32) (int, error) {
	r.countCalls++
	return r.count, nil
}

func (r *fakeRepo) GetFollowers(context.Context, int32) ([]int32, error) {
	return r.followers, nil
}

func (r *fakeRepo) GetLastPosts(_ context.Context, _ int32, limit int) ([]Entry, error) {
	r.getLastCalls++
	r.getLastLimit = limit
	return r.lastPosts, nil
}

func (r *fakeRepo) GetFanOutDisabled(context.Context, int32) (bool, error) {
	return r.fanOutDisabled, nil
}

func (r *fakeRepo) SetFanOutDisabled(_ context.Context, userID int32) error {
	r.disabledUserID = userID
	return nil
}

type fakeCache struct {
	count int
	ok    bool
	err   error

	setAuthorID int32
	setCount    int
	setTTL      time.Duration
}

func (c *fakeCache) GetFollowerCount(context.Context, int32) (int, bool, error) {
	return c.count, c.ok, c.err
}

func (c *fakeCache) SetFollowerCount(_ context.Context, authorID int32, count int, ttl time.Duration) error {
	if c.err != nil {
		return c.err
	}
	c.setAuthorID = authorID
	c.setCount = count
	c.setTTL = ttl
	return nil
}
