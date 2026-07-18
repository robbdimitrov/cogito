package post

import (
	"encoding/base64"
	"encoding/json"
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

func TestOffsetCursorRoundTrip(t *testing.T) {
	encoded := EncodeOffsetCursor(40)
	got, err := DecodeOffsetCursor(encoded)
	if err != nil {
		t.Fatalf("DecodeOffsetCursor: %v", err)
	}
	if got != 40 {
		t.Errorf("Offset: got %d, want 40", got)
	}
}

func TestDecodeOffsetCursorEmpty(t *testing.T) {
	got, err := DecodeOffsetCursor("")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != 0 {
		t.Errorf("expected offset 0 for empty cursor, got %d", got)
	}
}

func TestDecodeOffsetCursorInvalid(t *testing.T) {
	_, err := DecodeOffsetCursor("notvalidbase64!!!")
	if err == nil {
		t.Fatal("expected error for invalid cursor")
	}
}

func TestDecodeOffsetCursorClampsNegative(t *testing.T) {
	b, _ := json.Marshal(offsetCursor{Offset: -5})
	got, err := DecodeOffsetCursor(base64.RawURLEncoding.EncodeToString(b))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != 0 {
		t.Errorf("expected negative offset clamped to 0, got %d", got)
	}
}

func TestDecodeOffsetCursorClampsAboveMax(t *testing.T) {
	b, _ := json.Marshal(offsetCursor{Offset: maxPopularOffset + 500})
	got, err := DecodeOffsetCursor(base64.RawURLEncoding.EncodeToString(b))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != maxPopularOffset {
		t.Errorf("expected offset clamped to %d, got %d", maxPopularOffset, got)
	}
}

func TestEncodeOffsetCursorEndOfResults(t *testing.T) {
	if got := EncodeOffsetCursor(maxPopularOffset); got != "" {
		t.Errorf("expected empty cursor at maxPopularOffset, got %q", got)
	}
}
