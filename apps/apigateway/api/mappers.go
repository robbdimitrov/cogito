package api

import pb "cogito/apigateway/genproto"

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
		Replies:         u.Replies,
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
		PublicID: p.PublicId,
		UserID:   p.UserId,
		Content:  p.Content,
		Likes:    p.Likes,
		Liked:    p.Liked,
		Reposts:  p.Reposts,
		Reposted: p.Reposted,
		Created:  p.Created,
		MediaKey: p.MediaKey,
		Replies:  p.Replies,
	}
	if p.RepostOfPublicId != nil {
		result.RepostOfPublicID = *p.RepostOfPublicId
	}
	if p.RepostOf != nil {
		r := mapPost(p.RepostOf)
		result.RepostOf = &r
	}
	if p.QuotePost != nil {
		q := mapPost(p.QuotePost)
		result.QuotePost = &q
		result.QuoteOfPublicID = q.PublicID
	}
	return result
}

func mapHashtag(h *pb.Hashtag) hashtag {
	return hashtag{ID: h.Id, Name: h.Name, PostCount: h.PostCount}
}

// attachAuthors embeds the resolved author into a post and its nested
// repost/quote posts, keyed by the post's UserID.
func attachAuthors(p *post, authors map[int32]user) {
	if a, ok := authors[p.UserID]; ok {
		author := a
		p.User = &author
	}
	if p.RepostOf != nil {
		attachAuthors(p.RepostOf, authors)
	}
	if p.QuotePost != nil {
		attachAuthors(p.QuotePost, authors)
	}
}
