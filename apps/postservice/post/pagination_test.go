package post

import (
	"testing"
	"time"
)

func TestCursorRoundTrip(t *testing.T) {
	ts := time.Date(2024, 6, 1, 12, 0, 0, 123456789, time.UTC)
	id := int32(42)

	encoded := EncodeCursor(ts, id)
	got, ok, err := DecodeCursor(encoded)
	if err != nil {
		t.Fatalf("DecodeCursor: %v", err)
	}
	if !ok {
		t.Fatal("expected ok=true")
	}
	if !got.Created.Equal(ts) {
		t.Errorf("Created: got %v, want %v", got.Created, ts)
	}
	if got.ID != id {
		t.Errorf("ID: got %d, want %d", got.ID, id)
	}
}

func TestDecodeCursorEmpty(t *testing.T) {
	_, ok, err := DecodeCursor("")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ok {
		t.Fatal("expected ok=false for empty cursor")
	}
}

func TestDecodeCursorInvalid(t *testing.T) {
	_, _, err := DecodeCursor("notvalidbase64!!!")
	if err == nil {
		t.Fatal("expected error for invalid cursor")
	}
}
