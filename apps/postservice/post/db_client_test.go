package post

import (
	"strings"
	"testing"
)

func TestPostCountsAndViewerFlags(t *testing.T) {
	got := postCountsAndViewerFlags("posts.id")
	want := `(SELECT count(*) FROM likes WHERE post_id = posts.id) AS likes,
		EXISTS (SELECT 1 FROM likes WHERE post_id = posts.id AND likes.user_id = $1) AS liked,
		(SELECT count(*) FROM posts AS rp WHERE rp.repost_of_id = posts.id) AS reposts,
		EXISTS (SELECT 1 FROM posts AS rp WHERE rp.repost_of_id = posts.id AND rp.user_id = $1) AS reposted`
	if got != want {
		t.Errorf("postCountsAndViewerFlags(%q) =\n%s\nwant\n%s", "posts.id", got, want)
	}
}

func TestRepliesCount(t *testing.T) {
	got := repliesCount("COALESCE(o.id, p.id)")
	want := "(SELECT count(*) FROM posts AS r WHERE r.in_reply_to_id = COALESCE(o.id, p.id)) AS replies"
	if got != want {
		t.Errorf("repliesCount(%q) =\n%s\nwant\n%s", "COALESCE(o.id, p.id)", got, want)
	}
}

func TestPopularPostsQueryRanksByEngagementWithinWindow(t *testing.T) {
	got := popularPostsQuery()
	for _, want := range []string{
		"p.repost_of_id IS NULL",
		"p.in_reply_to_id IS NULL",
		"p.created >= $2",
		"WHERE likes + replies > 0",
		"ORDER BY (likes + replies) DESC, created DESC, id DESC",
		"OFFSET $3",
		"LIMIT $4",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("popularPostsQuery missing %q in:\n%s", want, got)
		}
	}
}

func TestFeedPullQueryIncludesOwnPostsAndDedupesMaterializedRows(t *testing.T) {
	got := feedPullQuery("SELECT p.id")
	for _, want := range []string{
		"p.user_id = $2",
		"fu.fan_out_disabled = true",
		"p.user_id = $2 OR u.fan_out_disabled = true",
		"NOT EXISTS (\n\t\t\tSELECT 1 FROM feed f\n\t\t\tWHERE f.user_id = $2 AND f.post_id = p.id\n\t\t)",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("feedPullQuery missing %q in:\n%s", want, got)
		}
	}
}
