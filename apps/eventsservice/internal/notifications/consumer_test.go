package notifications

import (
	"context"
	"errors"
	"reflect"
	"testing"

	"github.com/twmb/franz-go/pkg/kgo"
)

type repoCall struct {
	name       string
	externalID int64
	userID     int32
	actorID    int32
	notifType  string
	entityID   string
	types      []string
}

type fakeRepo struct {
	calls       []repoCall
	panicInsert bool
}

func (f *fakeRepo) List(context.Context, int32, string, int32) ([]Notification, string, error) {
	return nil, "", nil
}

func (f *fakeRepo) Insert(_ context.Context, externalID int64, userID, actorID int32, notifType, entityID string) error {
	if f.panicInsert {
		panic("insert failed hard")
	}
	f.calls = append(f.calls, repoCall{
		name:       "insert",
		externalID: externalID,
		userID:     userID,
		actorID:    actorID,
		notifType:  notifType,
		entityID:   entityID,
	})
	return nil
}

func (f *fakeRepo) MarkRead(context.Context, int64, int32) error {
	return nil
}

func (f *fakeRepo) UnreadCount(context.Context, int32) (int32, error) {
	return 0, nil
}

func (f *fakeRepo) DeleteByEntity(_ context.Context, entityID string, types []string) error {
	f.calls = append(f.calls, repoCall{name: "delete_entity", entityID: entityID, types: types})
	return nil
}

func (f *fakeRepo) DeleteByActorAndType(_ context.Context, actorID, recipientID int32, notifType, entityID string) error {
	f.calls = append(f.calls, repoCall{
		name:      "delete_actor_type",
		actorID:   actorID,
		userID:    recipientID,
		notifType: notifType,
		entityID:  entityID,
	})
	return nil
}

func TestConsumerDispatchActivity(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		payload string
		want    []repoCall
	}{
		{
			name:    "like inserts post notification",
			payload: `{"_outbox_id":101,"op":"like","post_id":55,"actor_id":7,"recipient_id":9}`,
			want: []repoCall{{
				name: "insert", externalID: 101, userID: 9, actorID: 7, notifType: "like", entityID: "55",
			}},
		},
		{
			name:    "unlike deletes matching post notification",
			payload: `{"op":"unlike","post_id":55,"actor_id":7,"recipient_id":9}`,
			want: []repoCall{{
				name: "delete_actor_type", actorID: 7, userID: 9, notifType: "like", entityID: "55",
			}},
		},
		{
			name:    "reply inserts with reply post entity",
			payload: `{"_outbox_id":102,"op":"reply","post_id":55,"reply_post_id":70,"actor_id":7,"recipient_id":9}`,
			want: []repoCall{{
				name: "insert", externalID: 102, userID: 9, actorID: 7, notifType: "reply", entityID: "70",
			}},
		},
		{
			name:    "unreply deletes reply entity",
			payload: `{"op":"unreply","reply_post_id":70,"actor_id":7}`,
			want: []repoCall{{
				name: "delete_entity", entityID: "70", types: []string{"reply"},
			}},
		},
		{
			name:    "follow inserts actor entity",
			payload: `{"_outbox_id":103,"op":"follow","actor_id":7,"recipient_id":9}`,
			want: []repoCall{{
				name: "insert", externalID: 103, userID: 9, actorID: 7, notifType: "follow", entityID: "7",
			}},
		},
		{
			name:    "unfollow deletes actor entity",
			payload: `{"op":"unfollow","actor_id":7,"recipient_id":9}`,
			want: []repoCall{{
				name: "delete_actor_type", actorID: 7, userID: 9, notifType: "follow", entityID: "7",
			}},
		},
		{
			name:    "self like skips insert",
			payload: `{"_outbox_id":104,"op":"like","post_id":55,"actor_id":7,"recipient_id":7}`,
		},
		{
			name:    "unknown op skips",
			payload: `{"op":"mute","actor_id":7,"recipient_id":9}`,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			repo := &fakeRepo{}
			consumer := &Consumer{repo: repo}

			if err := consumer.dispatch(context.Background(), topicActivity, []byte(tt.payload)); err != nil {
				t.Fatalf("dispatch returned error: %v", err)
			}

			if !reflect.DeepEqual(repo.calls, tt.want) {
				t.Fatalf("calls mismatch\nwant: %#v\n got: %#v", tt.want, repo.calls)
			}
		})
	}
}

func TestConsumerDispatchEntityChange(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		payload string
		want    []repoCall
	}{
		{
			name:    "post delete removes post notifications",
			payload: `{"table":"posts","op":"delete","id":55}`,
			want: []repoCall{{
				name: "delete_entity", entityID: "55", types: []string{"like", "repost", "reply"},
			}},
		},
		{
			name:    "hashtag delete skips",
			payload: `{"table":"hashtags","op":"delete","name":"go"}`,
		},
		{
			name:    "post upsert unknown op skips",
			payload: `{"table":"posts","op":"upsert","id":55}`,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			repo := &fakeRepo{}
			consumer := &Consumer{repo: repo}

			if err := consumer.dispatch(context.Background(), topicEntityChanges, []byte(tt.payload)); err != nil {
				t.Fatalf("dispatch returned error: %v", err)
			}

			if !reflect.DeepEqual(repo.calls, tt.want) {
				t.Fatalf("calls mismatch\nwant: %#v\n got: %#v", tt.want, repo.calls)
			}
		})
	}
}

func TestConsumerDispatchMalformedPayload(t *testing.T) {
	t.Parallel()

	repo := &fakeRepo{}
	consumer := &Consumer{repo: repo}

	err := consumer.dispatch(context.Background(), topicActivity, []byte(`{"op":"like","post_id":55,"actor_id":7}`))
	if !errors.Is(err, errMissingField) {
		t.Fatalf("expected missing field error, got %v", err)
	}
	if len(repo.calls) != 0 {
		t.Fatalf("unexpected repository calls: %#v", repo.calls)
	}
}

func TestConsumerProcessRecordRecoversPanic(t *testing.T) {
	t.Parallel()

	repo := &fakeRepo{panicInsert: true}
	consumer := &Consumer{repo: repo}
	record := &kgo.Record{
		Topic: topicActivity,
		Value: []byte(`{"_outbox_id":101,"op":"like","post_id":55,"actor_id":7,"recipient_id":9}`),
	}

	err := consumer.processRecord(context.Background(), record)
	if err == nil {
		t.Fatal("expected panic recovery error")
	}
}
