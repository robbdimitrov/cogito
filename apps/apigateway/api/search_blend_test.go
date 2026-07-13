package api

import "testing"

func TestComputeBlendTargets(t *testing.T) {
	cases := []struct {
		limit                  int
		users, posts, hashtags int
	}{
		{1, 0, 1, 0},
		{2, 1, 1, 0},
		{3, 1, 1, 1},
		{5, 1, 3, 1},
		{20, 4, 12, 4},
		{50, 10, 30, 10},
	}
	for _, c := range cases {
		users, posts, hashtags := computeBlendTargets(c.limit)
		if users != c.users || posts != c.posts || hashtags != c.hashtags {
			t.Errorf("computeBlendTargets(%d) = (%d,%d,%d), want (%d,%d,%d)",
				c.limit, users, posts, hashtags, c.users, c.posts, c.hashtags)
		}
		if users+posts+hashtags != c.limit && c.limit > 0 {
			t.Errorf("computeBlendTargets(%d) targets sum to %d, want %d", c.limit, users+posts+hashtags, c.limit)
		}
	}
}

func TestComputeBlendTargets_NonPositiveLimit(t *testing.T) {
	users, posts, hashtags := computeBlendTargets(0)
	if users != 0 || posts != 0 || hashtags != 0 {
		t.Errorf("computeBlendTargets(0) = (%d,%d,%d), want all zero", users, posts, hashtags)
	}
	users, posts, hashtags = computeBlendTargets(-5)
	if users != 0 || posts != 0 || hashtags != 0 {
		t.Errorf("computeBlendTargets(-5) = (%d,%d,%d), want all zero", users, posts, hashtags)
	}
}

func TestAllCursor_RoundTrip(t *testing.T) {
	c := allCursor{Users: "u-cursor", Posts: "p-cursor", Hashtags: "h-cursor"}
	encoded := encodeAllCursor(c)
	if encoded == "" {
		t.Fatal("expected a non-empty encoded cursor")
	}
	got := decodeAllCursor(encoded)
	if got != c {
		t.Errorf("decodeAllCursor(encodeAllCursor(%+v)) = %+v", c, got)
	}
}

func TestAllCursor_EmptyCursorRoundTrips(t *testing.T) {
	empty := allCursor{}
	if encoded := encodeAllCursor(empty); encoded != "" {
		t.Errorf("expected empty allCursor to encode to \"\", got %q", encoded)
	}
	if got := decodeAllCursor(""); got != empty {
		t.Errorf("decodeAllCursor(\"\") = %+v, want zero value", got)
	}
}

func TestAllCursor_MalformedCursorDecodesToEmpty(t *testing.T) {
	if got := decodeAllCursor("not-valid-base64!!!"); got != (allCursor{}) {
		t.Errorf("decodeAllCursor(malformed) = %+v, want zero value", got)
	}
}

func makeBlendItems(itemType string, n int) []blendedItem {
	items := make([]blendedItem, n)
	for i := range items {
		items[i] = blendedItem{Type: itemType, Item: i}
	}
	return items
}

func TestInterleaveBlended_PreservesTotalAndInternalOrder(t *testing.T) {
	users := makeBlendItems("users", 4)
	posts := makeBlendItems("posts", 12)
	hashtags := makeBlendItems("hashtags", 4)

	got := interleaveBlended(users, posts, hashtags)

	if len(got) != len(users)+len(posts)+len(hashtags) {
		t.Fatalf("expected %d items, got %d", len(users)+len(posts)+len(hashtags), len(got))
	}

	lastSeen := map[string]int{"users": -1, "posts": -1, "hashtags": -1}
	for _, item := range got {
		idx := item.Item.(int)
		if idx <= lastSeen[item.Type] {
			t.Errorf("expected increasing indices within %s, got %d after %d", item.Type, idx, lastSeen[item.Type])
		}
		lastSeen[item.Type] = idx
	}
}

func TestInterleaveBlended_SpreadsRatherThanBlocking(t *testing.T) {
	// At a 4/12/4 ratio (the limit=20 target), the leading run of same-type
	// items should never be as long as it would be if the lists were simply
	// concatenated (a run of 12 consecutive posts).
	users := makeBlendItems("users", 4)
	posts := makeBlendItems("posts", 12)
	hashtags := makeBlendItems("hashtags", 4)

	got := interleaveBlended(users, posts, hashtags)

	longestRun, currentRun := 1, 1
	for i := 1; i < len(got); i++ {
		if got[i].Type == got[i-1].Type {
			currentRun++
			if currentRun > longestRun {
				longestRun = currentRun
			}
		} else {
			currentRun = 1
		}
	}
	if longestRun >= len(posts) {
		t.Errorf("expected interleaving to break up the longest run of a single type, longest run was %d", longestRun)
	}
}

func TestInterleaveBlended_EmptyInputs(t *testing.T) {
	got := interleaveBlended(nil, nil, nil)
	if len(got) != 0 {
		t.Errorf("expected no items, got %d", len(got))
	}
}

func TestInterleaveBlended_OneTypeMissing(t *testing.T) {
	posts := makeBlendItems("posts", 3)
	got := interleaveBlended(nil, posts, nil)
	if len(got) != 3 {
		t.Fatalf("expected 3 items, got %d", len(got))
	}
	for i, item := range got {
		if item.Type != "posts" || item.Item.(int) != i {
			t.Errorf("item %d = %+v, want posts item %d", i, item, i)
		}
	}
}
