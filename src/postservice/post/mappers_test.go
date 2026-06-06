package post

import (
	"errors"
	"testing"
	"time"
)

type mockRow struct {
	err error
}

func (m *mockRow) Scan(dest ...interface{}) error {
	if m.err != nil {
		return m.err
	}
	for i, d := range dest {
		switch v := d.(type) {
		case *int32:
			*v = int32(i)
		case **int32:
			val := int32(i)
			*v = &val
		case *string:
			*v = "test"
		case **string:
			s := "test"
			*v = &s
		case *bool:
			*v = true
		case *time.Time:
			*v = time.Time{}
		case **time.Time:
			t := time.Time{}
			*v = &t
		}
	}
	return nil
}

type mockRows struct {
	next      bool
	scanErr   error
	rowsErr   error
	closed    bool
	nextCalls int
}

func (m *mockRows) Next() bool {
	m.nextCalls++
	if m.next && m.nextCalls == 1 {
		return true
	}
	return false
}

func (m *mockRows) Scan(dest ...interface{}) error {
	return (&mockRow{err: m.scanErr}).Scan(dest...)
}

func (m *mockRows) Close() {
	m.closed = true
}

func (m *mockRows) Err() error {
	return m.rowsErr
}

func TestMapPost(t *testing.T) {
	mr := &mockRow{}
	post, err := mapPost(mr)
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if post.Id != 0 || post.UserId != 1 || post.Content != "test" {
		t.Errorf("mapping failed: %+v", post)
	}

	mr = &mockRow{err: errors.New("scan error")}
	_, err = mapPost(mr)
	if err == nil {
		t.Errorf("expected error")
	}
}

func TestMapFeedPost(t *testing.T) {
	mr := &mockRow{}
	post, err := mapFeedPost(mr)
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if post.Id != 0 || post.UserId != 1 {
		t.Errorf("mapping failed: %+v", post)
	}
	// repost_of_id at position 8 is set by mockRow, so RepostOf should be populated
	if post.RepostOfId == nil {
		t.Errorf("expected repost_of_id to be set")
	}
	if post.RepostOf == nil {
		t.Errorf("expected repost_of to be populated")
	}

	mr = &mockRow{err: errors.New("scan error")}
	_, err = mapFeedPost(mr)
	if err == nil {
		t.Errorf("expected error")
	}
}

func TestMapPostsPropagatesRowsError(t *testing.T) {
	rowsErr := errors.New("rows error")
	rows := &mockRows{rowsErr: rowsErr}

	var gotErr error
	for _, err := range mapPosts(rows) {
		gotErr = err
	}

	if !errors.Is(gotErr, rowsErr) {
		t.Fatalf("expected rows error, got %v", gotErr)
	}
	if !rows.closed {
		t.Fatal("expected rows to be closed")
	}
}

func TestMapPostsClosesRowsAfterMapping(t *testing.T) {
	rows := &mockRows{next: true}
	var posts int

	for post, err := range mapPosts(rows) {
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if post != nil {
			posts++
		}
	}

	if posts != 1 {
		t.Fatalf("expected one post, got %d", posts)
	}
	if !rows.closed {
		t.Fatal("expected rows to be closed")
	}
}
