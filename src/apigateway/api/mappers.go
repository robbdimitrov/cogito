package api

import pb "github.com/robbdimitrov/thoughts/src/apigateway/genproto"

func mapUser(u *pb.User) user {
	return mapUserWithEmail(u, false)
}

func mapCurrentUser(u *pb.User) user {
	return mapUserWithEmail(u, true)
}

func mapUserWithEmail(u *pb.User, includeEmail bool) user {
	email := ""
	if includeEmail {
		email = u.Email
	}
	return user{
		ID:              u.Id,
		Name:            u.Name,
		Username:        u.Username,
		Email:           email,
		Bio:             u.Bio,
		Posts:           u.Posts,
		Likes:           u.Likes,
		Following:       u.Following,
		Followers:       u.Followers,
		Followed:        u.Followed,
		Created:         u.Created,
		ProfilePhotoKey: u.ProfilePhotoKey,
		CoverPhotoKey:   u.CoverPhotoKey,
	}
}

func mapPost(p *pb.Post) post {
	result := post{
		ID:          p.Id,
		UserID:      p.UserId,
		Content:     p.Content,
		Likes:       p.Likes,
		Liked:       p.Liked,
		Reposts:     p.Reposts,
		Reposted:    p.Reposted,
		Created:     p.Created,
		MediaKey:    p.MediaKey,
		Replies:     p.Replies,
		InReplyToID: p.InReplyToId,
		QuoteOfID:   p.QuoteOfId,
	}
	if p.RepostOfId != nil {
		result.RepostOfID = *p.RepostOfId
	}
	if p.RepostOf != nil {
		r := mapPost(p.RepostOf)
		result.RepostOf = &r
	}
	if p.QuotePost != nil {
		q := mapPost(p.QuotePost)
		result.QuotePost = &q
	}
	return result
}
