package api

import (
	"testing"

	pb "github.com/robbdimitrov/thoughts/src/apigateway/genproto"
)

func TestMapUser(t *testing.T) {
	u := &pb.User{
		Id:        1,
		Name:      "test",
		Username:  "tester",
		Email:     "test@test.com",
		Bio:       "bio",
		Posts:     10,
		Likes:     20,
		Following: 30,
		Followers: 40,
		Followed:  true,
		Created:   "now",
	}

	mapped := mapUser(u)
	if mapped.Email != "" {
		t.Errorf("expected empty email for public mapUser, got %s", mapped.Email)
	}
	if mapped.Username != "tester" {
		t.Errorf("expected username tester, got %s", mapped.Username)
	}

	currentMapped := mapCurrentUser(u)
	if currentMapped.Email != "test@test.com" {
		t.Errorf("expected email for mapCurrentUser, got empty")
	}
}

func TestMapPost(t *testing.T) {
	p := &pb.Post{
		Id:                1,
		UserId:            2,
		Content:           "content",
		Likes:             5,
		Liked:             true,
		Reposts:           2,
		Reposted:          false,
		Created:           "now",
		RethoughtByUserId: 3,
		RethoughtCreated:  "then",
	}

	mapped := mapPost(p)
	if mapped.ID != 1 || mapped.UserID != 2 || mapped.Content != "content" {
		t.Errorf("post mapping failed")
	}
}
