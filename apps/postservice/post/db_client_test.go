package post

import "testing"

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
