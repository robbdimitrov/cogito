package post

import (
	"errors"
	"testing"
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
		case *string:
			*v = "test"
		case *bool:
			*v = true
		}
	}
	return nil
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
